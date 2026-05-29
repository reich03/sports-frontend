import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import tournamentService from '../../services/tournament.service';

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
const PredictionModal = ({ visible, match, onClose, onSave }) => {
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pred.overlay}>
        <View style={pred.card}>
          <Text style={pred.title}>Tu Predicción</Text>
          <View style={pred.teamsRow}>
            <Text style={pred.teamName}>{match.home_team?.name}</Text>
            <View style={pred.scoresRow}>
              <TextInput
                style={pred.scoreInput}
                value={home}
                onChangeText={setHome}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
              />
              <Text style={pred.dash}>-</Text>
              <TextInput
                style={pred.scoreInput}
                value={away}
                onChangeText={setAway}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>
            <Text style={pred.teamName}>{match.away_team?.name}</Text>
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

const MatchCard = ({ match, onPredict, isPast }) => {
  const hasPredict = !!match.user_prediction;
  const pd = match.user_prediction?.prediction_data;
  const pts = match.user_prediction?.points_earned;
  const group = getGroupFromRound(match);
  const isLocked = match.predictions_locked || match.status !== 'scheduled';

  return (
    <View style={styles.matchCard}>
      {group && <Text style={styles.groupBadge}>Grupo {group}</Text>}
      <Text style={styles.matchDate}>{formatDate(match.match_date)} · {formatTime(match.match_date)}</Text>

      <View style={styles.matchRow}>
        <View style={styles.teamSide}>
          <Text style={styles.teamFlag}>{getFlagEmoji(match.home_team?.country)}</Text>
          <Text style={styles.teamName} numberOfLines={2}>{match.home_team?.name}</Text>
          <Text style={styles.shortName}>{match.home_team?.short_name}</Text>
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
                <Text style={[styles.predPts, { color: pts > 0 ? COLORS.primary : COLORS.error }]}>
                  {pts > 0 ? `+${pts}pts` : '0pts'}
                </Text>
              )}
            </View>
          )}
        </View>

        <View style={[styles.teamSide, { alignItems: 'center' }]}>
          <Text style={styles.teamFlag}>{getFlagEmoji(match.away_team?.country)}</Text>
          <Text style={[styles.teamName, { textAlign: 'center' }]} numberOfLines={2}>{match.away_team?.name}</Text>
          <Text style={styles.shortName}>{match.away_team?.short_name}</Text>
        </View>
      </View>

      {!isPast && !isLocked && (
        <TouchableOpacity
          style={[styles.predictBtn, hasPredict && styles.predictBtnEdit]}
          onPress={() => onPredict(match)}
        >
          <Text style={[styles.predictBtnText, hasPredict && { color: COLORS.warning }]}>
            {hasPredict ? 'Editar predicción' : 'Predecir'}
          </Text>
        </TouchableOpacity>
      )}
      {isLocked && !hasPredict && !isPast && (
        <View style={styles.lockedRow}>
          <Ionicons name="lock-closed" size={14} color={COLORS.textSecondary} />
          <Text style={styles.lockedText}>Cerrado para predicciones</Text>
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
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [modalMatch, setModalMatch] = useState(null);
  const [saving, setSaving] = useState(false);

  const isPast = filter === 'finished';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadMatches = useCallback(async () => {
    try {
      const phase = filter === 'upcoming' ? 'group_stage' : undefined;
      const res = await tournamentService.getMatches(tournamentId, {
        group: selectedGroup,
        phase
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

  useEffect(() => { loadMatches(); }, [loadMatches]);

  const onRefresh = () => { setRefreshing(true); loadMatches(); };

  const handlePredict = (match) => setModalMatch(match);

  const handleSavePrediction = async (homeScore, awayScore) => {
    if (!modalMatch) return;
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isPast ? 'Resultados' : 'Por Jugar'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filtro por grupo */}
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No hay partidos para mostrar</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={m => m.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          renderItem={({ item }) => (
            <MatchCard match={item} onPredict={handlePredict} isPast={isPast} />
          )}
        />
      )}

      <PredictionModal
        visible={!!modalMatch}
        match={modalMatch}
        onClose={() => setModalMatch(null)}
        onSave={handleSavePrediction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  groupFilterList: { flexGrow: 0, flexShrink: 0 },
  groupFilterRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  groupChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.border },
  groupChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  groupChipText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  groupChipTextActive: { color: COLORS.backgroundDark, fontWeight: 'bold' },
  emptyText: { color: COLORS.textSecondary, fontSize: 15 },
  matchCard: { backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 14, marginBottom: 10 },
  groupBadge: { color: COLORS.primary, fontSize: 11, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5 },
  matchDate: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 10, textAlign: 'center' },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamSide: { flex: 1, alignItems: 'center' },
  teamFlag: { fontSize: 32, marginBottom: 6 },
  teamName: { color: COLORS.white, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  shortName: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2 },
  centerBlock: { alignItems: 'center', minWidth: 80 },
  vs: { fontSize: 18, fontWeight: 'bold', color: COLORS.textSecondary },
  resultBlock: { alignItems: 'center' },
  resultScore: { fontSize: 22, fontWeight: 'bold', color: COLORS.white },
  resultLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  predBadge: { marginTop: 6, backgroundColor: COLORS.border, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignItems: 'center' },
  predBadgeProcessed: { backgroundColor: COLORS.primary + '22' },
  predText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  predPts: { fontSize: 11, fontWeight: 'bold', marginTop: 1 },
  predictBtn: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.primary + '44', gap: 6 },
  predictBtnEdit: { borderColor: COLORS.warning + '44' },
  predictBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  lockedRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  lockedText: { color: COLORS.textSecondary, fontSize: 12 },
});

const pred = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  card: { backgroundColor: COLORS.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  title: { color: COLORS.white, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  teamName: { flex: 1, color: COLORS.white, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scoresRow: { flexDirection: 'row', alignItems: 'center' },
  scoreInput: { width: 52, height: 52, backgroundColor: COLORS.backgroundDark, borderRadius: 12, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: COLORS.white, borderWidth: 1, borderColor: COLORS.primary },
  dash: { color: COLORS.white, fontSize: 22, marginHorizontal: 8 },
  hintRow: { marginBottom: 20 },
  hint: { color: COLORS.textSecondary, fontSize: 11, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  cancelText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText: { color: COLORS.backgroundDark, fontWeight: 'bold', fontSize: 15 },
});
