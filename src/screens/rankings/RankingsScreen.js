import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rankingService, sportService, leagueService, roundService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../constants/config';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

const RANKING_TABS = [
  { key: 'global', label: 'Global', icon: 'globe-outline' },
  { key: 'sport', label: 'Deporte', icon: 'football-outline' },
  { key: 'league', label: 'Liga', icon: 'ribbon-outline' },
];

const POSITION_COLORS = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };
const POSITION_BG = {
  1: 'rgba(255, 215, 0, 0.1)',
  2: 'rgba(192, 192, 192, 0.08)',
  3: 'rgba(205, 127, 50, 0.08)',
};

const getSportIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('fútbol') || lower.includes('futbol')) return 'football-outline';
  if (lower.includes('fórmula') || lower.includes('formula')) return 'speedometer-outline';
  if (lower.includes('moto')) return 'bicycle-outline';
  return 'trophy-outline';
};

const RankingsScreen = () => {
  const { user } = useAuth();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const insets = useSafeAreaInsets();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankingType, setRankingType] = useState('global');
  const [sports, setSports] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedSportId, setSelectedSportId] = useState(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [selectedRoundId, setSelectedRoundId] = useState(null);

  useEffect(() => {
    loadSports();
  }, []);

  useEffect(() => {
    if (selectedSportId && (rankingType === 'league' || rankingType === 'round')) {
      loadLeagues(selectedSportId);
    } else {
      setLeagues([]);
    }
  }, [selectedSportId, rankingType]);

  useEffect(() => {
    if (selectedLeagueId && rankingType === 'round') {
      loadRounds(selectedLeagueId);
    } else {
      setRounds([]);
    }
  }, [selectedLeagueId, rankingType]);

  useEffect(() => {
    if (rankingType === 'sport' || rankingType === 'league' || rankingType === 'round') {
      if (!selectedSportId && sports.length > 0) {
        setSelectedSportId(sports[0].id);
      }
    }
  }, [rankingType, sports, selectedSportId]);

  useEffect(() => {
    if (rankingType === 'league' && selectedSportId && leagues.length > 0 && !selectedLeagueId) {
      setSelectedLeagueId(leagues[0].id);
    }
  }, [rankingType, selectedSportId, leagues, selectedLeagueId]);

  useEffect(() => {
    loadRankings();
  }, [rankingType, selectedSportId, selectedLeagueId, selectedRoundId]);

  const loadSports = async () => {
    try {
      const response = await sportService.getAllSports();
      setSports(response.data.sports || []);
    } catch (error) {
      console.error('Error loading sports:', error);
    }
  };

  const loadLeagues = async (sportId) => {
    try {
      const response = await leagueService.getLeagues({ sport_id: sportId });
      setLeagues(response.data.leagues || []);
    } catch (error) {
      console.error('Error loading leagues:', error);
      setLeagues([]);
    }
  };

  const loadRounds = async (leagueId) => {
    try {
      const response = await roundService.getRounds({ league_id: leagueId });
      setRounds(response.data.rounds || []);
    } catch (error) {
      console.error('Error loading rounds:', error);
      setRounds([]);
    }
  };

  const loadRankings = async () => {
    try {
      setLoading(true);
      let response;

      if (rankingType === 'global') {
        response = await rankingService.getGlobalRanking({ limit: 100 });
      } else if (rankingType === 'sport' && selectedSportId) {
        response = await rankingService.getRankingBySport({ sport_id: selectedSportId, limit: 100 });
      } else if (rankingType === 'league' && selectedLeagueId) {
        response = await rankingService.getRankingByLeague({ league_id: selectedLeagueId, limit: 100 });
      } else if (rankingType === 'round' && selectedRoundId) {
        response = await rankingService.getRankingByRound({ round_id: selectedRoundId, limit: 100 });
      } else {
        setRankings([]);
        setLoading(false);
        return;
      }

      setRankings(response.data.rankings || []);
    } catch (error) {
      console.error('Error loading rankings:', error);
      setRankings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRankings();
    setRefreshing(false);
  }, [rankingType, selectedSportId, selectedLeagueId, selectedRoundId]);

  const handleTypeChange = (type) => {
    setRankingType(type);
    setSelectedSportId(null);
    setSelectedLeagueId(null);
    setSelectedRoundId(null);
    setLeagues([]);
    setRounds([]);
  };

  const clearFilters = () => {
    if (rankingType === 'league') {
      setSelectedLeagueId(null);
    } else if (rankingType === 'sport') {
      setSelectedSportId(null);
    }
  };

  const selectedSport = sports.find((s) => s.id === selectedSportId);
  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId);

  const currentUserEntry = useMemo(
    () => rankings.find((item) => item.User?.id === user?.id),
    [rankings, user?.id]
  );

  const contextLabel = useMemo(() => {
    if (rankingType === 'global') return 'Clasificación general';
    if (rankingType === 'sport') return selectedSport ? selectedSport.name : 'Elige un deporte';
    if (rankingType === 'league') {
      if (selectedLeague) return selectedLeague.name;
      if (selectedSport) return `${selectedSport.name} · elige liga`;
      return 'Elige deporte y liga';
    }
    return 'Clasificación';
  }, [rankingType, selectedSport, selectedLeague]);

  const needsSelection =
    (rankingType === 'sport' && !selectedSportId) ||
    (rankingType === 'league' && !selectedLeagueId) ||
    (rankingType === 'round' && !selectedRoundId);

  const emptyHint = useMemo(() => {
    if (rankingType === 'sport' && !selectedSportId) return 'Selecciona un deporte para ver el ranking';
    if (rankingType === 'league' && !selectedSportId) return 'Selecciona un deporte';
    if (rankingType === 'league' && !selectedLeagueId) return 'Selecciona una liga';
    if (rankingType === 'round' && !selectedRoundId) return 'Selecciona una jornada';
    if (rankingType === 'global') return 'Haz predicciones y comienza a sumar puntos';
    return 'No hay datos para este filtro';
  }, [rankingType, selectedSportId, selectedLeagueId, selectedRoundId]);

  const renderFilterChip = (id, label, active, onPress, icon) => (
    <TouchableOpacity
      key={id}
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? C.onAccent : C.primary}
        />
      ) : null}
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderListHeader = () => (
    <View style={styles.headerBlock}>
      <LinearGradient
        colors={C.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <Ionicons name="podium" size={22} color={C.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>Rankings</Text>
            <Text style={styles.heroSubtitle} numberOfLines={1}>{contextLabel}</Text>
          </View>
          {!loading && rankings.length > 0 ? (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeNum}>{rankings.length}</Text>
              <Text style={styles.countBadgeLabel}>jugadores</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      <View style={styles.toolbarCard}>
        <Text style={styles.toolbarLabel}>Vista</Text>
        <View style={styles.typeTabs}>
          {RANKING_TABS.map((tab) => {
            const active = rankingType === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.typeTab, active && styles.typeTabActive]}
                onPress={() => handleTypeChange(tab.key)}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={active ? C.onAccent : C.primary}
                />
                <Text style={[styles.typeTabText, active && styles.typeTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {(rankingType === 'sport' || rankingType === 'league') && sports.length > 0 ? (
          <View style={styles.filterBlock}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Deporte</Text>
              {rankingType === 'sport' && selectedSportId ? (
                <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={14} color={C.error} />
                  <Text style={styles.clearBtnText}>Limpiar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {sports.map((sport) =>
                renderFilterChip(
                  sport.id,
                  sport.name,
                  selectedSportId === sport.id,
                  () => {
                    setSelectedSportId(sport.id);
                    setSelectedLeagueId(null);
                    setSelectedRoundId(null);
                  },
                  getSportIcon(sport.name)
                )
              )}
            </ScrollView>
          </View>
        ) : null}

        {rankingType === 'league' && selectedSportId ? (
          <View style={styles.filterBlock}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Liga</Text>
              {selectedLeagueId ? (
                <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={14} color={C.error} />
                  <Text style={styles.clearBtnText}>Limpiar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {leagues.length === 0 ? (
              <Text style={styles.filterEmpty}>No hay ligas para este deporte</Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {leagues.map((league) =>
                  renderFilterChip(
                    league.id,
                    league.name,
                    selectedLeagueId === league.id,
                    () => {
                      setSelectedLeagueId(league.id);
                      setSelectedRoundId(null);
                    },
                    'ribbon-outline'
                  )
                )}
              </ScrollView>
            )}
          </View>
        ) : null}
      </View>

      {currentUserEntry ? (
        <View style={styles.myPositionCard}>
          <View style={styles.myPosLeft}>
            <Text style={styles.myPosNum}>#{currentUserEntry.position}</Text>
            <Text style={styles.myPosLabel}>Tu posición</Text>
          </View>
          <View style={styles.myPosDivider} />
          <View style={styles.myPosStats}>
            <View style={styles.myPosStat}>
              <Text style={styles.myPosStatVal}>{currentUserEntry.total_points}</Text>
              <Text style={styles.myPosStatLabel}>Puntos</Text>
            </View>
            <View style={styles.myPosStat}>
              <Text style={styles.myPosStatVal}>{currentUserEntry.total_predictions}</Text>
              <Text style={styles.myPosStatLabel}>Predicciones</Text>
            </View>
            <View style={styles.myPosStat}>
              <Text style={styles.myPosStatVal}>{currentUserEntry.effectiveness}%</Text>
              <Text style={styles.myPosStatLabel}>Efectividad</Text>
            </View>
          </View>
        </View>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.inlineLoader}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={styles.inlineLoaderText}>Cargando clasificación...</Text>
        </View>
      ) : null}
    </View>
  );

  const renderRankingItem = ({ item, index }) => {
    const isCurrentUser = item.User?.id === user?.id;
    const position = item.position || index + 1;
    const isTopThree = position <= 3;
    const posColor = POSITION_COLORS[position] || C.textSecondary;

    return (
      <View
        style={[
          styles.rankingCard,
          isCurrentUser && styles.rankingCardCurrentUser,
          isTopThree && {
            backgroundColor: POSITION_BG[position],
            borderColor: `${posColor}44`,
            borderWidth: 1,
          },
        ]}
      >
        <View style={[styles.positionBlock, isTopThree && { backgroundColor: `${posColor}22` }]}>
          <Text style={[styles.rankingPosition, isTopThree && { color: posColor, fontSize: 18 }]}>
            {position}
          </Text>
        </View>

        <View style={styles.avatarWrapper}>
          <View
            style={[
              styles.avatar,
              isTopThree && { borderWidth: 2, borderColor: posColor },
              isCurrentUser && !isTopThree && { borderWidth: 2, borderColor: C.primary },
            ]}
          >
            {item.User?.avatar ? (
              <Image
                source={{ uri: `${BASE_URL}${item.User.avatar}` }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={[styles.avatarText, isTopThree && { color: posColor }]}>
                {item.User?.username?.charAt(0).toUpperCase() || '?'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.userDetails}>
          <Text
            style={[
              styles.username,
              isTopThree && { color: posColor },
              isCurrentUser && { color: C.primary },
            ]}
            numberOfLines={1}
          >
            {isCurrentUser ? `${item.User?.username} (Tú)` : item.User?.username || 'Usuario'}
          </Text>
          <Text style={styles.userMeta} numberOfLines={1}>
            {item.total_predictions} predicciones · {item.effectiveness}% efectividad
          </Text>
        </View>

        <View style={styles.pointsBlock}>
          <Text style={[styles.points, { color: isTopThree ? posColor : C.white }]}>
            {item.total_points}
          </Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && !refreshing) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="podium-outline" size={40} color={`${C.primary}60`} />
        </View>
        <Text style={styles.emptyText}>
          {needsSelection ? 'Selecciona un filtro' : 'No hay rankings disponibles'}
        </Text>
        <Text style={styles.emptySubtext}>{emptyHint}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />

      <FlatList
        data={loading && !refreshing ? [] : rankings}
        renderItem={renderRankingItem}
        keyExtractor={(item, index) => `${item.User?.id}-${index}`}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          (rankings.length === 0 || (loading && !refreshing)) && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
          />
        }
      />
    </View>
  );
};

const createStyles = (C) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
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
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${C.primary}15`,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  countBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: `${C.primary}18`,
    borderWidth: 1,
    borderColor: `${C.primary}35`,
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
  toolbarCard: {
    backgroundColor: C.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${C.primary}18`,
    gap: 14,
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
  filterBlock: {
    gap: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: C.white,
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${C.error}12`,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.error,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}28`,
    maxWidth: 180,
  },
  filterChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    flexShrink: 1,
  },
  filterChipTextActive: {
    color: C.onAccent,
  },
  filterEmpty: {
    fontSize: 12,
    color: C.textSecondary,
    fontStyle: 'italic',
  },
  myPositionCard: {
    marginBottom: 12,
    backgroundColor: `${C.primary}14`,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${C.primary}40`,
  },
  myPosLeft: {
    alignItems: 'center',
    marginRight: 12,
    minWidth: 52,
  },
  myPosNum: {
    fontSize: 28,
    fontWeight: '800',
    color: C.primary,
  },
  myPosLabel: {
    fontSize: 10,
    color: `${C.primary}AA`,
    marginTop: 2,
    fontWeight: '600',
  },
  myPosDivider: {
    width: 1,
    height: 44,
    backgroundColor: `${C.primary}33`,
    marginRight: 12,
  },
  myPosStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  myPosStat: {
    alignItems: 'center',
  },
  myPosStatVal: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
  },
  myPosStatLabel: {
    fontSize: 10,
    color: C.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  inlineLoaderText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  rankingCard: {
    backgroundColor: C.cardBackground,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankingCardCurrentUser: {
    borderWidth: 1.5,
    borderColor: `${C.primary}55`,
    backgroundColor: `${C.primary}0D`,
  },
  positionBlock: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingPosition: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textSecondary,
  },
  avatarWrapper: {
    marginRight: 4,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: `${C.primary}25`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  userMeta: {
    color: C.textSecondary,
    fontSize: 11,
  },
  pointsBlock: {
    alignItems: 'flex-end',
    minWidth: 48,
  },
  points: {
    fontSize: 18,
    fontWeight: '800',
  },
  pointsLabel: {
    fontSize: 10,
    color: C.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
  emptyContainer: {
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
  emptyText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtext: {
    color: C.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default RankingsScreen;
