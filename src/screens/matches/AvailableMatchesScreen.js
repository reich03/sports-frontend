import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, StatusBar, Animated, LayoutAnimation, UIManager,
  Platform, InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { matchService } from '../../services';
import { COLORS } from '../../constants/theme';
import { BASE_URL } from '../../constants/config';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EXPAND_ANIM = {
  duration: 240,
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  update: { type: LayoutAnimation.Types.easeInEaseOut },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const formatTime = (d) =>
  new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

const getTeamLogo = (team) => {
  if (!team?.logo) return null;
  if (team.logo.startsWith('file://') || team.logo.startsWith('http')) return team.logo;
  return `${BASE_URL}${team.logo}`;
};

/* ─── TeamBadge ─── */
const TeamBadge = ({ team, size = 46 }) => {
  const logo = getTeamLogo(team);
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      {logo
        ? <Image source={{ uri: logo }} style={styles.badgeImg} resizeMode="contain" />
        : <Text style={styles.badgeText}>{(team?.short_name || '?').substring(0, 3)}</Text>}
    </View>
  );
};

/* ─── Skeleton rows while expanding ─── */
const SkeletonRows = () => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{ opacity: pulse }}>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.skeletonRow}>
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonLines}>
            <View style={[styles.skeletonLine, { width: i % 2 === 0 ? '65%' : '50%' }]} />
            <View style={[styles.skeletonLine, { width: '35%', marginTop: 6 }]} />
          </View>
          <View style={styles.skeletonCircle} />
          <View style={styles.skeletonBtn} />
        </View>
      ))}
    </Animated.View>
  );
};

/* ─── Mini match preview shown in collapsed card ─── */
const CollapsedPreview = ({ firstMatch }) => {
  if (!firstMatch) return null;
  const home = firstMatch.home_team;
  const away = firstMatch.away_team;
  return (
    <View style={styles.previewRow}>
      <TeamBadge team={home} size={28} />
      <Text style={styles.previewName} numberOfLines={1}>{home?.short_name || 'Local'}</Text>
      <View style={styles.previewVs}><Text style={styles.previewVsText}>vs</Text></View>
      <Text style={[styles.previewName, { textAlign: 'right' }]} numberOfLines={1}>{away?.short_name || 'Visit.'}</Text>
      <TeamBadge team={away} size={28} />
      <View style={styles.previewTime}>
        <Text style={styles.previewTimeText}>{formatTime(firstMatch.match_date)}</Text>
      </View>
    </View>
  );
};

/* ─── MatchRow ─── */
const MatchRow = ({ match, navigation }) => (
  <View style={styles.matchRow}>
    <View style={styles.matchDateRow}>
      <Ionicons name="calendar-outline" size={11} color={COLORS.textSecondary} />
      <Text style={styles.matchDate}>{formatDate(match.match_date)}</Text>
      <View style={styles.timePill}>
        <Text style={styles.timePillText}>{formatTime(match.match_date)}</Text>
      </View>
    </View>
    <View style={styles.matchTeams}>
      <View style={styles.teamSide}>
        <TeamBadge team={match.home_team} />
        <Text style={styles.teamName} numberOfLines={2}>{match.home_team?.short_name || 'Local'}</Text>
      </View>
      <View style={styles.vsBubble}>
        <Text style={styles.vsText}>VS</Text>
      </View>
      <View style={[styles.teamSide, { alignItems: 'flex-end' }]}>
        <TeamBadge team={match.away_team} />
        <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={2}>
          {match.away_team?.short_name || 'Visitante'}
        </Text>
      </View>
    </View>
    <TouchableOpacity
      style={styles.predictBtn}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('CreatePrediction', { matchId: match.id })}
    >
      <LinearGradient
        colors={[COLORS.primary, '#00b85a']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.predictGradient}
      >
        <Ionicons name="flash" size={14} color={COLORS.backgroundDark} />
        <Text style={styles.predictBtnText}>Predecir</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

/* ─── Screen ─── */
const AvailableMatchesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [matches, setMatches]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [expandedLeagues, setExpanded]  = useState(new Set());
  const [loadingLeagues, setLoadingL]   = useState(new Set()); // skeleton guard
  const togglingRef = useRef(new Set());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { loadMatches(); }, []));

  const loadMatches = async () => {
    try {
      setLoading(true);
      const res = await matchService.getUpcomingMatches({ limit: 100, exclude_predicted: true });
      const data = res.data.matches || [];
      setMatches(data);
      const grouped = groupByLeague(data);
      const firstKey = Object.keys(grouped)[0];
      if (firstKey) setExpanded(new Set([firstKey]));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  };

  const onRefresh = () => { setRefreshing(true); loadMatches(); };

  const groupByLeague = (list) => {
    const map = {};
    list.forEach(m => {
      const id = m.league_id || 'sin-liga';
      if (!map[id]) map[id] = { league: m.league, sport: m.sport, rounds: {}, total: 0, firstMatch: m };
      const rid = m.round_id || 'sin-jornada';
      if (!map[id].rounds[rid]) map[id].rounds[rid] = { info: m.roundInfo, matches: [] };
      map[id].rounds[rid].matches.push(m);
      map[id].total++;
    });
    return map;
  };

  const toggleLeague = (id) => {
    if (togglingRef.current.has(id)) return;
    togglingRef.current.add(id);

    const isExpanding = !expandedLeagues.has(id);

    if (isExpanding) {
      // 1 — expand immediately (shows skeleton)
      LayoutAnimation.configureNext(EXPAND_ANIM);
      setExpanded(prev => new Set([...prev, id]));
      setLoadingL(prev => new Set([...prev, id]));

      // 2 — after interactions finish rendering, remove skeleton
      InteractionManager.runAfterInteractions(() => {
        setLoadingL(prev => { const s = new Set(prev); s.delete(id); return s; });
        togglingRef.current.delete(id);
      });
    } else {
      LayoutAnimation.configureNext(EXPAND_ANIM);
      setExpanded(prev => { const s = new Set(prev); s.delete(id); return s; });
      setTimeout(() => togglingRef.current.delete(id), 300);
    }
  };

  const grouped = groupByLeague(matches);
  const leagueCount = Object.keys(grouped).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['rgba(0,230,119,0.08)', 'transparent']}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Predicciones disponibles</Text>
          <View style={styles.headerMeta}>
            <View style={styles.metaPill}>
              <Ionicons name="football" size={10} color={COLORS.primary} />
              <Text style={styles.metaText}>{matches.length} partidos</Text>
            </View>
            <View style={styles.metaPill}>
              <Ionicons name="trophy" size={10} color={COLORS.primary} />
              <Text style={styles.metaText}>{leagueCount} ligas</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={{ padding: 14, paddingBottom: 48 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {matches.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-circle" size={56} color={COLORS.primary} />
            <Text style={styles.emptyTitle}>¡Todo al día!</Text>
            <Text style={styles.emptyText}>No hay partidos disponibles para predecir.</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([leagueId, { league, sport, rounds, total, firstMatch }]) => {
            const expanded  = expandedLeagues.has(leagueId);
            const isLoading = loadingLeagues.has(leagueId);

            return (
              <View key={leagueId} style={[styles.leagueBlock, expanded && styles.leagueBlockExpanded]}>

                {/* League header */}
                <TouchableOpacity
                  style={styles.leagueHeader}
                  onPress={() => toggleLeague(leagueId)}
                  activeOpacity={0.78}
                >
                  {/* Left: icon + info */}
                  <View style={styles.leagueIcon}>
                    <Ionicons name="trophy" size={16} color={COLORS.primary} />
                  </View>
                  <View style={styles.leagueInfo}>
                    <Text style={styles.leagueName} numberOfLines={1}>{league?.name || 'Sin liga'}</Text>
                    {sport && <Text style={styles.leagueSport}>{sport.name}</Text>}
                  </View>
                  {/* Right: count + chevron */}
                  <View style={styles.leagueRight}>
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>{total}</Text>
                    </View>
                    <Ionicons
                      name={expanded ? 'chevron-up' : 'chevron-down'}
                      size={18} color={COLORS.textSecondary}
                    />
                  </View>
                </TouchableOpacity>

                {/* Collapsed preview: show next match */}
                {!expanded && (
                  <View style={styles.previewContainer}>
                    <CollapsedPreview firstMatch={firstMatch} />
                    <Text style={styles.previewMore}>
                      {total > 1 ? `+${total - 1} más` : ''}
                    </Text>
                  </View>
                )}

                {/* Expanded: skeleton or real content */}
                {expanded && (
                  <View style={styles.roundsContainer}>
                    {isLoading ? (
                      <View style={{ padding: 12 }}>
                        <SkeletonRows />
                      </View>
                    ) : (
                      Object.entries(rounds).map(([roundId, { info, matches: rMatches }]) => (
                        <View key={roundId} style={styles.roundSection}>
                          <View style={styles.roundLabel}>
                            <View style={styles.roundDot} />
                            <Text style={styles.roundName} numberOfLines={1}>{info?.name || 'Jornada'}</Text>
                            <Text style={styles.roundCount}>{rMatches.length} partidos</Text>
                            {rMatches.length > 1 && (
                              <TouchableOpacity
                                style={styles.jornBtn}
                                onPress={() => navigation.navigate('CreateRoundPrediction', {
                                  matches: rMatches,
                                  roundName: info?.name || 'Jornada',
                                  leagueName: league?.name,
                                })}
                              >
                                <Ionicons name="flash" size={11} color={COLORS.backgroundDark} />
                                <Text style={styles.jornBtnText}>Predecir jornada</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                          {rMatches.map(m => (
                            <MatchRow key={m.id} match={m} navigation={navigation} />
                          ))}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </Animated.ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.cardDark, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  headerMeta: { flexDirection: 'row', gap: 6, marginTop: 5 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  metaText: { color: COLORS.primary, fontSize: 11, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700' },
  emptyText: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center' },

  leagueBlock: {
    marginBottom: 14, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.cardDark,
  },
  leagueBlockExpanded: {
    borderColor: 'rgba(0,230,119,0.25)',
  },
  leagueHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  leagueIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  leagueInfo: { flex: 1 },
  leagueName: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  leagueSport: { color: COLORS.primary, fontSize: 11, marginTop: 1 },
  leagueRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { color: COLORS.backgroundDark, fontSize: 12, fontWeight: '800' },

  /* Collapsed preview */
  previewContainer: {
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  previewRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewName: { flex: 1, color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  previewVs: { paddingHorizontal: 6 },
  previewVsText: { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '700' },
  previewTime: { backgroundColor: 'rgba(0,230,119,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  previewTimeText: { color: COLORS.primary, fontSize: 10, fontWeight: '700' },
  previewMore: { color: COLORS.textSecondary, fontSize: 11 },

  /* Skeleton */
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginBottom: 10, paddingVertical: 4,
  },
  skeletonCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)' },
  skeletonLines: { flex: 1 },
  skeletonLine: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.08)', width: '80%' },
  skeletonBtn: { width: 70, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,230,119,0.12)' },

  roundsContainer: { borderTopWidth: 1, borderTopColor: COLORS.border },
  roundSection: { padding: 12, paddingTop: 10 },
  roundLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  roundDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },
  roundName: { color: COLORS.white, fontWeight: '600', fontSize: 13, flex: 1 },
  roundCount: { color: COLORS.textSecondary, fontSize: 11 },
  jornBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  jornBtnText: { fontSize: 11, fontWeight: '800', color: COLORS.backgroundDark },

  /* Match card */
  matchRow: {
    backgroundColor: '#0d1f15',
    borderRadius: 14, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(0,230,119,0.12)', overflow: 'hidden',
  },
  matchDateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4,
  },
  matchDate: { color: COLORS.textSecondary, fontSize: 11, flex: 1 },
  timePill: { backgroundColor: 'rgba(0,230,119,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  timePillText: { color: COLORS.primary, fontSize: 11, fontWeight: '700' },

  matchTeams: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  teamSide: { flex: 1, alignItems: 'flex-start', gap: 6 },
  badge: { backgroundColor: COLORS.cardDark, borderWidth: 1, borderColor: COLORS.primary + '30', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  badgeImg: { width: '88%', height: '88%' },
  badgeText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  teamName: { color: COLORS.white, fontSize: 12, fontWeight: '600', maxWidth: 100 },

  vsBubble: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,230,119,0.1)',
    borderWidth: 1, borderColor: 'rgba(0,230,119,0.25)',
    justifyContent: 'center', alignItems: 'center', marginHorizontal: 6,
  },
  vsText: { color: COLORS.primary, fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },

  predictBtn: { marginHorizontal: 12, marginBottom: 12, borderRadius: 10, overflow: 'hidden' },
  predictGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10,
  },
  predictBtnText: { color: COLORS.backgroundDark, fontWeight: '800', fontSize: 13 },
});

export default AvailableMatchesScreen;
