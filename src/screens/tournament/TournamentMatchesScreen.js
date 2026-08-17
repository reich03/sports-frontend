import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Animated, ScrollView, StatusBar, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tournamentService from '../../services/tournament.service';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BASE_URL } from '../../constants/config';
import { arePredictionsClosed, PREDICTIONS_CLOSED_MESSAGE } from '../../utils/predictions';

const getTeamLogo = (team) => {
  if (!team?.logo) return null;
  if (team.logo.startsWith('file://') || team.logo.startsWith('http')) {
    return team.logo;
  }
  return `${BASE_URL}${team.logo}`;
};

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const getGroupFromRound = (match) => match.roundInfo?.metadata?.group || null;

// Componente de predicción inline
const PredictionModal = ({ visible, match, onClose, onSave, pred, C }) => {
  const [home, setHome] = useState('');
  const [away, setAway] = useState('');

  useEffect(() => {
    if (visible && match?.user_prediction) {
      const pd = match.user_prediction.prediction_data;
      setHome(String(pd?.home_score ?? ''));
      setAway(String(pd?.away_score ?? ''));
    } else if (visible) {
      setHome(''); setAway('');
    }
  }, [visible, match]);

  const handleSave = () => {
    const h = parseInt(home);
    const a = parseInt(away);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      Alert.alert('Error', 'Ingresa marcadores válidos (0 o más)');
      return;
    }
    onSave(h, a);
  };

  if (!match) return null;

  const homeLogo = getTeamLogo(match.home_team);
  const awayLogo = getTeamLogo(match.away_team);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pred.overlay}>
        <View style={pred.card}>
          <View style={pred.handle} />
          <Text style={pred.title}>Tu Predicción</Text>
          <Text style={pred.subtitle}>Predice el marcador final</Text>

          <View style={pred.teamsRow}>
            <View style={pred.teamCol}>
              <View style={pred.teamLogoWrap}>
                {homeLogo ? (
                  <Image source={{ uri: homeLogo }} style={pred.teamLogo} resizeMode="contain" />
                ) : (
                  <Text style={pred.teamLogoFallback}>
                    {match.home_team?.short_name || match.home_team?.name?.substring(0, 3).toUpperCase() || 'HOM'}
                  </Text>
                )}
              </View>
              <Text style={pred.teamName} numberOfLines={2}>{match.home_team?.name}</Text>
            </View>

            <View style={pred.scoresRow}>
              <TextInput
                style={pred.scoreInput}
                value={home}
                onChangeText={setHome}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={C.textSecondary}
              />
              <Text style={pred.dash}>-</Text>
              <TextInput
                style={pred.scoreInput}
                value={away}
                onChangeText={setAway}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={C.textSecondary}
              />
            </View>

            <View style={pred.teamCol}>
              <View style={pred.teamLogoWrap}>
                {awayLogo ? (
                  <Image source={{ uri: awayLogo }} style={pred.teamLogo} resizeMode="contain" />
                ) : (
                  <Text style={pred.teamLogoFallback}>
                    {match.away_team?.short_name || match.away_team?.name?.substring(0, 3).toUpperCase() || 'AWA'}
                  </Text>
                )}
              </View>
              <Text style={pred.teamName} numberOfLines={2}>{match.away_team?.name}</Text>
            </View>
          </View>
          <View style={pred.btnRow}>
            <TouchableOpacity style={pred.cancelBtn} onPress={onClose}>
              <Text style={pred.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pred.saveBtn} onPress={handleSave}>
              <Text style={pred.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const MatchCard = ({ match, onPredict, isPast, styles, C }) => {
  const hasPredict = !!match.user_prediction;
  const pd = match.user_prediction?.prediction_data;
  const pts = match.user_prediction?.points_earned;
  const group = getGroupFromRound(match);
  const isLocked = arePredictionsClosed(match);

  return (
    <View style={styles.matchCard}>
      {group && <Text style={styles.groupBadge}>Grupo {group}</Text>}
      <Text style={styles.matchDate}>{formatDate(match.match_date)} · {formatTime(match.match_date)}</Text>

      <View style={styles.matchRow}>
        <View style={styles.teamSide}>
          {getTeamLogo(match.home_team) ? (
            <Image
              source={{ uri: getTeamLogo(match.home_team) }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.teamFlag}>{getFlagEmoji(match.home_team?.country)}</Text>
          )}
          <Text style={styles.teamName} numberOfLines={2}>{match.home_team?.name}</Text>
          <Text style={styles.shortName} numberOfLines={1}>
            {match.home_team?.country || match.home_team?.short_name}
          </Text>
        </View>

        <View style={styles.centerBlock}>
          {match.status === 'finished' ? (
            <View style={styles.resultBlock}>
              <Text style={styles.resultScore}>{match.home_score} - {match.away_score}</Text>
              <Text style={styles.resultLabel}>FT</Text>
            </View>
          ) : (
            <Text style={styles.vs}>VS</Text>
          )}

          {/* Predicción del usuario */}
          {hasPredict && (
            <View style={[styles.predBadge, match.status === 'finished' && pts !== undefined && styles.predBadgeProcessed]}>
              <Text style={styles.predText}>{pd?.home_score} - {pd?.away_score}</Text>
              {match.status === 'finished' && pts !== undefined && (
                <Text style={[styles.predPts, { color: pts > 0 ? C.primary : C.error }]}>
                  {pts > 0 ? `+${pts}pts` : '0pts'}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={[styles.teamSide, { alignItems: 'center' }]}>
          {getTeamLogo(match.away_team) ? (
            <Image
              source={{ uri: getTeamLogo(match.away_team) }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.teamFlag}>{getFlagEmoji(match.away_team?.country)}</Text>
          )}
          <Text style={[styles.teamName, { textAlign: 'center' }]} numberOfLines={2}>{match.away_team?.name}</Text>
          <Text style={styles.shortName} numberOfLines={1}>
            {match.away_team?.country || match.away_team?.short_name}
          </Text>
        </View>
      </View>

      {!isPast && !isLocked && (
        <TouchableOpacity
          style={[styles.predictBtn, hasPredict && styles.predictBtnEdit]}
          onPress={() => onPredict(match)}
        >
          <Text style={[styles.predictBtnText, hasPredict && { color: C.warning }]}>
            {hasPredict ? 'Editar predicción' : 'Predecir'}
          </Text>
        </TouchableOpacity>
      )}
      {isLocked && !isPast && (
        <View style={styles.lockedRow}>
          <Ionicons name="lock-closed" size={14} color={C.textSecondary} />
          <Text style={styles.lockedText}>
            {hasPredict ? 'Ya no puedes editar tu predicción' : 'Cerrado para predicciones'}
          </Text>
        </View>
      )}
    </View>
  );
};

const getFlagEmoji = (country) => {
  const flags = {
    'México': '🇲🇽', 'Sudáfrica': '🇿🇦', 'Corea del Sur': '🇰🇷', 'República Checa': '🇨🇿',
    'Canadá': '🇨🇦', 'Bosnia Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Suiza': '🇨🇭',
    'Brasil': '🇧🇷', 'Marruecos': '🇲🇦', 'Haití': '🇭🇹', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Estados Unidos': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turquía': '🇹🇷',
    'Alemania': '🇩🇪', 'Curazao': '🇨🇼', 'Costa de Marfil': '🇨🇮', 'Ecuador': '🇪🇨',
    'Países Bajos': '🇳🇱', 'Japón': '🇯🇵', 'Suecia': '🇸🇪', 'Túnez': '🇹🇳',
    'Bélgica': '🇧🇪', 'Egipto': '🇪🇬', 'Irán': '🇮🇷', 'Nueva Zelanda': '🇳🇿',
    'España': '🇪🇸', 'Cabo Verde': '🇨🇻', 'Arabia Saudita': '🇸🇦', 'Uruguay': '🇺🇾',
    'Francia': '🇫🇷', 'Senegal': '🇸🇳', 'Irak': '🇮🇶', 'Noruega': '🇳🇴',
    'Argentina': '🇦🇷', 'Argelia': '🇩🇿', 'Austria': '🇦🇹', 'Jordania': '🇯🇴',
    'Portugal': '🇵🇹', 'Rep. D. Congo': '🇨🇩', 'Uzbekistán': '🇺🇿', 'Colombia': '🇨🇴',
    'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croacia': '🇭🇷', 'Ghana': '🇬🇭', 'Panamá': '🇵🇦',
  };
  return flags[country] || '🏳️';
};

export default function TournamentMatchesScreen({ navigation, route }) {
  const { tournamentId, filter = 'upcoming' } = route.params;
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const pred = useMemo(() => createPred(C), [C]);

  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [modalMatch, setModalMatch] = useState(null);
  const [saving, setSaving] = useState(false);

  const isPast = filter === 'finished';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    tournamentService.getTournament(tournamentId)
      .then(res => setTournament(res.data?.data || null))
      .catch(() => {});
  }, [tournamentId]);

  const quickTabs = useMemo(() => {
    if (!tournament) return [];
    const isWorldCup = tournament.league?.name?.toLowerCase().includes('world cup')
      || tournament.name?.toLowerCase().includes('mundial');
    return [
      { key: 'matches', label: 'Por jugar', icon: 'football', active: !isPast },
      { key: 'results', label: 'Resultados', icon: 'checkmark-circle', active: isPast },
      ...(isWorldCup ? [{ key: 'groups', label: 'Grupos', icon: 'grid' }] : []),
      { key: 'table', label: 'Tabla', icon: 'podium' },
      ...(tournament.special_predictions_enabled !== false
        ? [{ key: 'specials', label: 'Menciones', icon: 'star' }]
        : []),
    ];
  }, [tournament, isPast]);

  const navigateQuickTab = (tabKey) => {
    if (tabKey === 'matches') {
      if (isPast) navigation.replace('TournamentMatches', { tournamentId, filter: 'upcoming' });
      return;
    }
    if (tabKey === 'results') {
      if (!isPast) navigation.replace('TournamentMatches', { tournamentId, filter: 'finished' });
      return;
    }
    const routes = {
      groups: 'TournamentGroups',
      table: 'TournamentLeaderboard',
      specials: 'TournamentSpecials',
    };
    if (routes[tabKey]) navigation.navigate(routes[tabKey], { tournamentId });
  };

  const loadMatches = useCallback(async () => {
    try {
      const res = await tournamentService.getMatches(tournamentId, {
        group: selectedGroup || undefined,
      });
      let data = res.data.data || [];
      if (filter === 'upcoming') {
        data = data.filter(m => m.status === 'scheduled' || m.status === 'live');
      } else if (filter === 'finished') {
        data = data.filter(m => m.status === 'finished');
      }
      setMatches(data);
    } catch (err) {
      console.error('Error cargando partidos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  }, [tournamentId, filter, selectedGroup]);

  const hasGroupMatches = useMemo(
    () => matches.some(m => m.roundInfo?.metadata?.group),
    [matches]
  );

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const onRefresh = () => { setRefreshing(true); loadMatches(); };

  const handlePredict = (match) => {
    if (arePredictionsClosed(match)) {
      Alert.alert('Predicciones cerradas', PREDICTIONS_CLOSED_MESSAGE);
      return;
    }
    setModalMatch(match);
  };

  const handleSavePrediction = async (homeScore, awayScore) => {
    if (!modalMatch) return;
    if (arePredictionsClosed(modalMatch)) {
      Alert.alert('Predicciones cerradas', PREDICTIONS_CLOSED_MESSAGE);
      setModalMatch(null);
      return;
    }
    setSaving(true);
    try {
      await tournamentService.predictMatch(tournamentId, modalMatch.id, homeScore, awayScore);
      setModalMatch(null);
      loadMatches();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo guardar la predicción');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {tournament?.name || (isPast ? 'Resultados' : 'Por Jugar')}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('TournamentInfo', { tournamentId })}
          style={styles.infoBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Información de la polla"
        >
          <Ionicons name="information-circle-outline" size={24} color={C.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbarCard}>
        <View style={styles.typeTabs}>
          <TouchableOpacity
            style={[styles.typeTab, !isPast && styles.typeTabActive]}
            onPress={() => navigateQuickTab('matches')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="football-outline"
              size={15}
              color={!isPast ? C.onAccent : C.primary}
            />
            <Text style={[styles.typeTabText, !isPast && styles.typeTabTextActive]} numberOfLines={1}>
              Por jugar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeTab, isPast && styles.typeTabActive]}
            onPress={() => navigateQuickTab('results')}
            activeOpacity={0.85}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={15}
              color={isPast ? C.onAccent : C.primary}
            />
            <Text style={[styles.typeTabText, isPast && styles.typeTabTextActive]} numberOfLines={1}>
              Resultados
            </Text>
          </TouchableOpacity>
        </View>

        {quickTabs.filter((t) => !['matches', 'results'].includes(t.key)).length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.secondaryRow}
          >
            {quickTabs
              .filter((t) => !['matches', 'results'].includes(t.key))
              .map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.secondaryChip}
                  onPress={() => navigateQuickTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab.icon} size={14} color={C.primary} />
                  <Text style={styles.secondaryChipText} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
        ) : null}
      </View>

      {/* Filtro por grupo (solo torneos con fase de grupos) */}
      {hasGroupMatches && (
      <FlatList
        horizontal
        data={['Todos', ...GROUPS]}
        keyExtractor={g => g}
        showsHorizontalScrollIndicator={false}
        style={styles.groupFilterList}
        contentContainerStyle={styles.groupFilterRow}
        renderItem={({ item }) => {
          const isSelected = item === 'Todos' ? !selectedGroup : selectedGroup === item;
          return (
            <TouchableOpacity
              style={[styles.groupChip, isSelected && styles.groupChipActive]}
              onPress={() => setSelectedGroup(item === 'Todos' ? null : item)}
            >
              <Text style={[styles.groupChipText, isSelected && styles.groupChipTextActive]}>
                {item === 'Todos' ? 'Todos' : `Grupo ${item}`}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay partidos para mostrar</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={m => m.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}
          renderItem={({ item }) => (
            <MatchCard match={item} onPredict={handlePredict} isPast={isPast} styles={styles} C={C} />
          )}
        />
      )}

      <PredictionModal
        visible={!!modalMatch}
        match={modalMatch}
        onClose={() => setModalMatch(null)}
        onSave={handleSavePrediction}
        pred={pred}
        C={C}
      />
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: 'bold', color: C.text, textAlign: 'center', marginHorizontal: 8 },
  infoBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  toolbarCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: C.cardBackground,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: `${C.primary}18`,
    gap: 10,
    flexGrow: 0,
    flexShrink: 0,
  },
  typeTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  typeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}25`,
    minHeight: 44,
  },
  typeTabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  typeTabText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  typeTabTextActive: {
    color: C.onAccent,
  },
  secondaryRow: {
    gap: 8,
    paddingRight: 4,
  },
  secondaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}28`,
  },
  secondaryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
  },
  groupFilterList: { flexGrow: 0, flexShrink: 0 },
  groupFilterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  groupChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: C.cardDark, borderWidth: 1, borderColor: C.border },
  groupChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  groupChipText: { color: C.textSecondary, fontSize: 13, fontWeight: '500' },
  groupChipTextActive: { color: C.onAccent, fontWeight: 'bold' },
  emptyText: { color: C.textSecondary, fontSize: 15 },
  matchCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 14, marginBottom: 10 },
  groupBadge: { color: C.primary, fontSize: 11, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5 },
  matchDate: { color: C.textSecondary, fontSize: 11, marginBottom: 10, textAlign: 'center' },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamSide: { flex: 1, alignItems: 'center' },
  teamFlag: { fontSize: 32, marginBottom: 6 },
  teamLogo: { width: 44, height: 44, marginBottom: 6, borderRadius: 22, backgroundColor: C.cardBackground },
  teamName: { color: C.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  shortName: { color: C.textSecondary, fontSize: 10, marginTop: 2 },
  centerBlock: { alignItems: 'center', minWidth: 80 },
  vs: { fontSize: 18, fontWeight: 'bold', color: C.textSecondary },
  resultBlock: { alignItems: 'center' },
  resultScore: { fontSize: 22, fontWeight: 'bold', color: C.text },
  resultLabel: { fontSize: 10, color: C.textSecondary, marginTop: 2 },
  predBadge: { marginTop: 6, backgroundColor: C.border, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignItems: 'center' },
  predBadgeProcessed: { backgroundColor: C.primary + '22' },
  predText: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  predPts: { fontSize: 11, fontWeight: 'bold', marginTop: 1 },
  predictBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: C.primary + '44', gap: 6 },
  predictBtnEdit: { borderColor: C.warning + '44' },
  predictBtnText: { color: C.primary, fontSize: 13, fontWeight: '600' },
  lockedRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  lockedText: { color: C.textSecondary, fontSize: 12 },
});

const createPred = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  card: { backgroundColor: C.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12 },
  handle: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 12 },
  title: { color: C.text, fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: C.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 22 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  teamCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  teamLogoWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: `${C.primary}22`,
    overflow: 'hidden',
  },
  teamLogo: { width: 52, height: 52, borderRadius: 26 },
  teamLogoFallback: { color: C.primary, fontSize: 14, fontWeight: '700' },
  teamName: { color: C.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  scoresRow: { flexDirection: 'row', alignItems: 'center' },
  scoreInput: { width: 52, height: 52, backgroundColor: C.surfaceMuted, borderRadius: 12, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: C.text, borderWidth: 1, borderColor: C.primary },
  dash: { color: C.text, fontSize: 22, marginHorizontal: 8 },
  hintRow: { marginBottom: 20 },
  hint: { color: C.textSecondary, fontSize: 11, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  cancelText: { color: C.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: C.accent, alignItems: 'center' },
  saveText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
