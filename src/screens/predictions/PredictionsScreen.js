import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  StatusBar, Animated, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { predictionService } from '../../services';
import { BASE_URL } from '../../constants/config';

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

const TeamAvatar = ({ team }) => {
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

const PredictionCard = ({ item }) => {
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

  const statusColor = isProcessed
    ? (isCorrect ? '#22c55e' : '#ef4444')
    : COLORS.warning;

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
              color={COLORS.primary}
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
              <Ionicons name="time-outline" size={12} color={COLORS.warning} />
              <Text style={styles.pendingPillText}>Pendiente</Text>
            </View>
          )}
        </View>

        <Text style={styles.dateText}>{formatDate(match?.match_date)}</Text>

        {isScore ? (
          <View style={styles.matchBlock}>
            {/* Home */}
            <View style={styles.teamCol}>
              <TeamAvatar team={homeTeam} />
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
              <TeamAvatar team={awayTeam} />
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
              <Ionicons name="hourglass-outline" size={12} color={COLORS.warning} />
              <Text style={styles.awaitingText}>Esperando resultado</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const PredictionsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
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

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Gradient glow at top */}
      <LinearGradient
        colors={['rgba(0,230,119,0.08)', 'transparent']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      {/* Header */}
      <LinearGradient
        colors={['rgba(0,230,119,0.1)', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View>
          <Text style={styles.headerTitle}>Mis Predicciones</Text>
          <Text style={styles.headerSub}>Historial completo</Text>
        </View>
        <View style={styles.effBadge}>
          <Text style={styles.effValue}>{efectividad}%</Text>
          <Text style={styles.effLabel}>efectividad</Text>
        </View>
      </LinearGradient>

      {/* Stats row */}
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
          <Text style={[styles.statVal, { color: COLORS.primary }]}>{pts}</Text>
          <Text style={styles.statLabel}>Puntos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: '#ef4444' }]}>{falladas}</Text>
          <Text style={styles.statLabel}>Falladas</Text>
        </View>
      </View>

      {/* Filter chips — horizontal scroll so they never get cut */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScrollView}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Ionicons
              name={f.icon}
              size={13}
              color={filter === f.key ? COLORS.backgroundDark : COLORS.textSecondary}
            />
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {predictions.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="football-outline" size={52} color={COLORS.border} />
          <Text style={styles.emptyTitle}>Sin predicciones</Text>
          <Text style={styles.emptyText}>Ve al inicio para hacer tu primera predicción</Text>
        </View>
      ) : (
        <FlatList
          data={predictions}
          keyExtractor={item => item.id?.toString()}
          contentContainerStyle={{ padding: 14, paddingTop: 6, paddingBottom: 42 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <PredictionCard item={item} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07120d' },
  center: { flex: 1, backgroundColor: '#07120d', justifyContent: 'center', alignItems: 'center' },

  topGlow: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 220,
    pointerEvents: 'none',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,230,119,0.12)',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  effBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,230,119,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,230,119,0.2)',
  },
  effValue: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  effLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: COLORS.cardDark,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: 'bold', color: COLORS.white },
  statLabel: { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: COLORS.border },

  chipScrollView: { flexGrow: 0, flexShrink: 0 },
  filterRow: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,paddingBottom: 2,
    borderRadius: 20,
    backgroundColor: COLORS.cardDark,
    borderWidth: 1, borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.backgroundDark, fontWeight: '700' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: 'bold' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardDark,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  accent: { width: 4 },
  cardContent: { flex: 1 },

  cardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 2,
  },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  sportText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },
  dotSep: { color: COLORS.border, fontSize: 11 },
  leagueText: { color: COLORS.textSecondary, fontSize: 11, flex: 1 },
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
  pendingPillText: { color: COLORS.warning, fontSize: 11, fontWeight: '600' },

  dateText: { color: COLORS.textSecondary, fontSize: 11, paddingHorizontal: 12, marginBottom: 10 },

  matchBlock: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginBottom: 10, gap: 6 },
  teamCol: { flex: 1, alignItems: 'flex-start', gap: 6 },
  teamAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1, borderColor: COLORS.primary + '33',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  teamAvatarImg: { width: '88%', height: '88%' },
  teamAvatarText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },
  teamName: { color: COLORS.white, fontSize: 12, fontWeight: '600' },

  scoreBlock: { alignItems: 'center' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreCell: {
    backgroundColor: COLORS.backgroundDark, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 38,
    borderWidth: 1, borderColor: COLORS.border,
  },
  scoreCellFinal: { borderColor: '#22c55e44', backgroundColor: 'rgba(34,197,94,0.08)' },
  scoreCellLabel: { color: COLORS.textSecondary, fontSize: 8, letterSpacing: 0.5 },
  scoreCellValue: { color: COLORS.primary, fontSize: 16, fontWeight: 'bold' },
  scoreCellValueFinal: { color: '#22c55e' },
  scoreSep: { color: COLORS.textSecondary, fontWeight: 'bold', fontSize: 14 },

  f1Block: { paddingHorizontal: 12, marginBottom: 10 },
  f1Name: { color: COLORS.white, fontWeight: '700', fontSize: 14, marginBottom: 6 },
  podiumRow: { gap: 4 },
  podiumItem: { color: COLORS.primary, fontSize: 13 },

  cardFooter: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  ptsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ptsLabel: { color: COLORS.textSecondary, fontSize: 12 },
  ptsValue: { fontSize: 18, fontWeight: 'bold' },
  ptsPositive: { color: COLORS.primary },
  ptsZero: { color: COLORS.textSecondary },
  awaitingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  awaitingText: { color: COLORS.textSecondary, fontSize: 12 },

  tournamentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10,
  },
  tournamentBadgePublic: { backgroundColor: 'rgba(96,165,250,0.15)' },
  tournamentBadgePrivate: { backgroundColor: 'rgba(245,158,11,0.15)' },
  tournamentBadgeText: { fontSize: 9, fontWeight: '700' },
});

export default PredictionsScreen;
