import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  StatusBar, Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { predictionService } from '../../services';
import { BASE_URL } from '../../constants/config';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { arePredictionsClosed } from '../../utils/predictions';

const FILTERS = [
  { key: 'all', label: 'Todas', icon: 'list' },
  { key: 'pending', label: 'Pendientes', icon: 'time-outline' },
  { key: 'processed', label: 'Finalizadas', icon: 'checkmark-done' },
];

const formatDate = (d) =>
  new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

const getTeamLogo = (team) => {
  if (!team?.logo) return null;
  if (team.logo.startsWith('file://') || team.logo.startsWith('http')) return team.logo;
  return `${BASE_URL}${team.logo}`;
};

const TeamAvatar = ({ team, styles, C }) => {
  const logo = getTeamLogo(team);
  const initials = (team?.short_name || team?.name || '?').substring(0, 3).toUpperCase();
  return (
    <View style={styles.teamAvatar}>
      {logo ? (
        <Image source={{ uri: logo }} style={styles.teamAvatarImg} resizeMode="contain" />
      ) : (
        <Text style={styles.teamAvatarText}>{initials}</Text>
      )}
    </View>
  );
};

const PredictionCard = ({ item, styles, C, navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  const match = item.match || item.Match;
  const sport = match?.sport || match?.Sport;
  const league = match?.roundInfo?.league || match?.Round?.League;
  const round = match?.roundInfo || match?.Round;
  const tournamentInfo = item.tournament;
  const isScore = sport?.prediction_type === 'score';
  const isProcessed = item.is_processed;
  const pts = item.points_earned || 0;
  const isCorrect = item.is_correct;

  const homeScore = item.prediction_data?.home_score;
  const awayScore = item.prediction_data?.away_score;
  const finalHome = match?.home_score;
  const finalAway = match?.away_score;

  const homeTeam = match?.home_team || match?.HomeTeam;
  const awayTeam = match?.away_team || match?.AwayTeam;
  const homeName = homeTeam?.name || 'Local';
  const awayName = awayTeam?.name || 'Visitante';
  const canEdit = !isProcessed && match && !arePredictionsClosed(match);
  const isClosedPending = !isProcessed && match && arePredictionsClosed(match);

  const statusColor = isProcessed
    ? (isCorrect ? '#22c55e' : '#ef4444')
    : C.warning;

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Colored left accent */}
      <View style={[styles.accent, { backgroundColor: statusColor }]} />

      {/* Card header */}
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.sportRow}>
            <Ionicons
              name={sport?.name === 'Fútbol' ? 'football' : sport?.name === 'Fórmula 1' ? 'speedometer' : 'trophy'}
              size={12}
              color={C.primary}
            />
            <Text style={styles.sportText}>{sport?.name || 'Deporte'}</Text>
            {(league?.name || round?.name) ? (
              <>
                <Text style={styles.dotSep}>·</Text>
                <Text style={styles.leagueText} numberOfLines={1}>{league?.name || round?.name}</Text>
              </>
            ) : null}
            {tournamentInfo && (
              <View style={[
                styles.tournamentBadge,
                tournamentInfo.type === 'private' ? styles.tournamentBadgePrivate : styles.tournamentBadgePublic
              ]}>
                <Ionicons
                  name={tournamentInfo.type === 'private' ? 'lock-closed' : 'globe-outline'}
                  size={9}
                  color={tournamentInfo.type === 'private' ? '#f59e0b' : '#60a5fa'}
                />
                <Text style={[
                  styles.tournamentBadgeText,
                  { color: tournamentInfo.type === 'private' ? '#f59e0b' : '#60a5fa' }
                ]}>
                  {tournamentInfo.type === 'private' ? 'Privado' : 'Público'}
                </Text>
              </View>
            )}
          </View>
          {isProcessed ? (
            <View style={[styles.statusPill, isCorrect ? styles.pillCorrect : styles.pillError]}>
              <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={12} color={statusColor} />
              <Text style={[styles.statusPillText, { color: statusColor }]}>
                {isCorrect ? 'Acertada' : 'Fallada'}
              </Text>
            </View>
          ) : (
            <View style={styles.pendingPill}>
              <Ionicons name="time-outline" size={12} color={C.warning} />
              <Text style={styles.pendingPillText}>Pendiente</Text>
            </View>
          )}
        </View>

        <Text style={styles.dateText}>{formatDate(match?.match_date)}</Text>

        {isScore ? (
          <View style={styles.matchBlock}>
            {/* Home */}
            <View style={styles.teamCol}>
              <TeamAvatar team={homeTeam} styles={styles} C={C} />
              <Text style={styles.teamName} numberOfLines={2}>{homeName}</Text>
            </View>
            {/* Scores */}
            <View style={styles.scoreBlock}>
              <View style={styles.scoreRow}>
                <View style={styles.scoreCell}>
                  <Text style={styles.scoreCellLabel}>Pred.</Text>
                  <Text style={styles.scoreCellValue}>{homeScore ?? '—'}</Text>
                </View>
                <Text style={styles.scoreSep}>-</Text>
                <View style={styles.scoreCell}>
                  <Text style={styles.scoreCellLabel}>Pred.</Text>
                  <Text style={styles.scoreCellValue}>{awayScore ?? '—'}</Text>
                </View>
              </View>
              {isProcessed && finalHome !== null && finalHome !== undefined && (
                <View style={[styles.scoreRow, { marginTop: 6 }]}>
                  <View style={[styles.scoreCell, styles.scoreCellFinal]}>
                    <Text style={styles.scoreCellLabel}>Final</Text>
                    <Text style={[styles.scoreCellValue, styles.scoreCellValueFinal]}>{finalHome}</Text>
                  </View>
                  <Text style={styles.scoreSep}>-</Text>
                  <View style={[styles.scoreCell, styles.scoreCellFinal]}>
                    <Text style={styles.scoreCellLabel}>Final</Text>
                    <Text style={[styles.scoreCellValue, styles.scoreCellValueFinal]}>{finalAway}</Text>
                  </View>
                </View>
              )}
            </View>
            {/* Away */}
            <View style={[styles.teamCol, { alignItems: 'flex-end' }]}>
              <TeamAvatar team={awayTeam} styles={styles} C={C} />
              <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={2}>{awayName}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.f1Block}>
            <Text style={styles.f1Name}>{match?.location || 'Gran Premio'}</Text>
            <View style={styles.podiumRow}>
              <Text style={styles.podiumItem}>🥇 {item.prediction_data?.position_1 || '—'}</Text>
              <Text style={styles.podiumItem}>🥈 {item.prediction_data?.position_2 || '—'}</Text>
              <Text style={styles.podiumItem}>🥉 {item.prediction_data?.position_3 || '—'}</Text>
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          {isProcessed ? (
            <View style={styles.ptsRow}>
              <Text style={styles.ptsLabel}>Puntos ganados</Text>
              <Text style={[styles.ptsValue, pts > 0 ? styles.ptsPositive : styles.ptsZero]}>
                {pts > 0 ? `+${pts}` : pts} pts
              </Text>
            </View>
          ) : (
            <View style={styles.awaitingRow}>
              <Ionicons name="hourglass-outline" size={12} color={C.warning} />
              <Text style={styles.awaitingText}>Esperando resultado</Text>
            </View>
          )}
          {canEdit ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('CreatePrediction', { matchId: match.id })}
            >
              <Ionicons name="create-outline" size={14} color={C.warning} />
              <Text style={styles.editBtnText}>Editar predicción</Text>
            </TouchableOpacity>
          ) : isClosedPending ? (
            <View style={styles.closedRow}>
              <Ionicons name="lock-closed" size={12} color={C.textSecondary} />
              <Text style={styles.closedRowText}>Ya no puedes editar</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const PredictionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadPredictions(); }, [filter]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const response = await predictionService.getMyPredictions({
        status: filter === 'all' ? undefined : filter,
        limit: 50,
      });
      setPredictions(response.data.predictions || []);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPredictions();
    setRefreshing(false);
  }, [filter]);

  const total = predictions.length;
  const processed = predictions.filter(p => p.is_processed);
  const acertadas = processed.filter(p => p.is_correct).length;
  const falladas = processed.filter(p => !p.is_correct).length;
  const pts = predictions.reduce((s, p) => s + (p.points_earned || 0), 0);
  const efectividad = processed.length > 0 ? Math.round((acertadas / processed.length) * 100) : 0;

  const renderListHeader = () => (
    <View style={styles.headerBlock}>
      <LinearGradient
        colors={C.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <Text
            style={styles.heroTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Mis Predicciones
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeNum}>{efectividad}%</Text>
            <Text style={styles.countBadgeLabel}>efect.</Text>
          </View>
        </View>

        <View style={styles.statsDivider} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#22c55e' }]}>{acertadas}</Text>
            <Text style={styles.statLabel}>Aciertos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: C.primary }]}>{pts}</Text>
            <Text style={styles.statLabel}>Puntos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: '#ef4444' }]}>{falladas}</Text>
            <Text style={styles.statLabel}>Falladas</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.toolbarCard}>
        <Text style={styles.toolbarLabel}>Filtrar</Text>
        <View style={styles.typeTabs}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.typeTab, active && styles.typeTabActive]}
                onPress={() => setFilter(f.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={f.icon}
                  size={15}
                  color={active ? C.onAccent : C.primary}
                />
                <Text
                  style={[styles.typeTabText, active && styles.typeTabTextActive]}
                  numberOfLines={1}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.inlineLoader}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={styles.inlineLoaderText}>Cargando predicciones...</Text>
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => {
    if (loading && !refreshing) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="football-outline" size={40} color={`${C.primary}60`} />
        </View>
        <Text style={styles.emptyTitle}>Sin predicciones</Text>
        <Text style={styles.emptyText}>Ve al inicio para hacer tu primera predicción</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />

      <FlatList
        data={loading && !refreshing ? [] : predictions}
        keyExtractor={(item) => item.id?.toString()}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          (predictions.length === 0 || (loading && !refreshing)) && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => <PredictionCard item={item} styles={styles} C={C} navigation={navigation} />}
      />
    </View>
  );
};

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    paddingTop: 8,
    marginBottom: 4,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
    backgroundColor: C.cardBackground,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.5,
    minWidth: 0,
  },
  countBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: `${C.primary}18`,
    borderWidth: 1,
    borderColor: `${C.primary}35`,
    flexShrink: 0,
  },
  countBadgeNum: {
    fontSize: 16,
    fontWeight: '800',
    color: C.primary,
  },
  countBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: `${C.primary}90`,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: C.white },
  statLabel: { fontSize: 10, color: C.textSecondary, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 34, backgroundColor: C.surfaceBorder },
  toolbarCard: {
    backgroundColor: C.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${C.primary}18`,
    gap: 10,
  },
  toolbarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}25`,
  },
  typeTabActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  typeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },
  typeTabTextActive: {
    color: C.onAccent,
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  inlineLoaderText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: C.white, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  card: {
    flexDirection: 'row',
    backgroundColor: C.cardDark,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.surfaceBorder,
  },
  accent: { width: 4 },
  cardContent: { flex: 1 },

  cardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 2,
  },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  sportText: { color: C.primary, fontSize: 11, fontWeight: '600' },
  dotSep: { color: C.border, fontSize: 11 },
  leagueText: { color: C.textSecondary, fontSize: 11, flex: 1 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
  },
  pillCorrect: { backgroundColor: 'rgba(34,197,94,0.15)' },
  pillError: { backgroundColor: 'rgba(239,68,68,0.15)' },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  pendingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    backgroundColor: 'rgba(234,179,8,0.15)',
  },
  pendingPillText: { color: C.warning, fontSize: 11, fontWeight: '600' },

  dateText: { color: C.textSecondary, fontSize: 11, paddingHorizontal: 12, marginBottom: 10 },

  matchBlock: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10, gap: 6 },
  teamCol: { flex: 1, alignItems: 'flex-start', gap: 6 },
  teamAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: C.surfaceMuted,
    borderWidth: 1, borderColor: C.primary + '33',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  teamAvatarImg: { width: '88%', height: '88%' },
  teamAvatarText: { color: C.primary, fontSize: 11, fontWeight: '700' },
  teamName: { color: C.white, fontSize: 12, fontWeight: '600' },

  scoreBlock: { alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreCell: {
    backgroundColor: C.surfaceMuted, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 38,
    borderWidth: 1, borderColor: C.border,
  },
  scoreCellFinal: { borderColor: '#22c55e44', backgroundColor: 'rgba(34,197,94,0.08)' },
  scoreCellLabel: { color: C.textSecondary, fontSize: 8, letterSpacing: 0.5 },
  scoreCellValue: { color: C.primary, fontSize: 16, fontWeight: 'bold' },
  scoreCellValueFinal: { color: '#22c55e' },
  scoreSep: { color: C.textSecondary, fontWeight: 'bold', fontSize: 14 },

  f1Block: { paddingHorizontal: 12, marginBottom: 10 },
  f1Name: { color: C.white, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  podiumRow: { gap: 4 },
  podiumItem: { color: C.primary, fontSize: 13 },

  cardFooter: {
    borderTopWidth: 1, borderTopColor: C.surfaceBorder,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  ptsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ptsLabel: { color: C.textSecondary, fontSize: 12 },
  ptsValue: { fontSize: 18, fontWeight: 'bold' },
  ptsPositive: { color: C.primary },
  ptsZero: { color: C.textSecondary },
  awaitingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  awaitingText: { color: C.textSecondary, fontSize: 12 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${C.warning}44`,
  },
  editBtnText: { color: C.warning, fontSize: 12, fontWeight: '600' },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  closedRowText: { color: C.textSecondary, fontSize: 11 },

  tournamentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  tournamentBadgePublic: { backgroundColor: 'rgba(96,165,250,0.15)' },
  tournamentBadgePrivate: { backgroundColor: 'rgba(245,158,11,0.15)' },
  tournamentBadgeText: { fontSize: 9, fontWeight: '700' },
});

export default PredictionsScreen;
