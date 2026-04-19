import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { rankingService, sportService, leagueService, roundService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../constants/config';

const RankingsScreen = () => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rankingType, setRankingType] = useState('global'); // global, sport, league, round
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
    if (selectedSportId && rankingType === 'league') {
      loadLeagues(selectedSportId);
    }
  }, [selectedSportId, rankingType]);

  useEffect(() => {
    if (selectedLeagueId && rankingType === 'round') {
      loadRounds(selectedLeagueId);
    }
  }, [selectedLeagueId, rankingType]);

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

  const renderTab = (label, value) => (
    <TouchableOpacity
      style={[styles.tab, rankingType === value && styles.tabActive]}
      onPress={() => {
        setRankingType(value);
        setSelectedSportId(null);
        setSelectedLeagueId(null);
        setSelectedRoundId(null);
      }}
    >
      <Text style={[
        styles.tabText,
        rankingType === value && styles.tabTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSportFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedSportId === item.id && styles.filterChipActive
      ]}
      onPress={() => {
        setSelectedSportId(selectedSportId === item.id ? null : item.id);
        setSelectedLeagueId(null);
        setSelectedRoundId(null);
      }}
    >
      <Text style={[
        styles.filterChipText,
        selectedSportId === item.id && styles.filterChipTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderLeagueFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedLeagueId === item.id && styles.filterChipActive
      ]}
      onPress={() => {
        setSelectedLeagueId(selectedLeagueId === item.id ? null : item.id);
        setSelectedRoundId(null);
      }}
    >
      <Text style={[
        styles.filterChipText,
        selectedLeagueId === item.id && styles.filterChipTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderRoundFilter = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        selectedRoundId === item.id && styles.filterChipActive
      ]}
      onPress={() => setSelectedRoundId(selectedRoundId === item.id ? null : item.id)}
    >
      <Text style={[
        styles.filterChipText,
        selectedRoundId === item.id && styles.filterChipTextActive
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const getMedalEmoji = (position) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  const getBorderColor = (position) => {
    if (position === 1) return '#FFD700'; // Gold
    if (position === 2) return '#C0C0C0'; // Silver
    if (position === 3) return '#CD7F32'; // Bronze
    return 'transparent';
  };

  const getPositionColor = (position) => {
    if (position === 1) return '#FFD700';
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return COLORS.textGray;
  };

  const renderRankingItem = ({ item, index }) => {
    const isCurrentUser = item.User?.id === user?.id;
    const position = item.position || index + 1;
    const isTopThree = position <= 3;
    
    return (
      <View style={[
        styles.rankingCard,
        isCurrentUser && styles.rankingCardCurrentUser
      ]}>
        {isCurrentUser && <View style={styles.currentUserIndicator} />}
        
        <View style={styles.rankingLeft}>
          {/* Position Number */}
          <View style={styles.positionContainer}>
            <Text style={[
              styles.rankingPosition,
              isTopThree && styles.rankingPositionTop,
              { color: getPositionColor(position) }
            ]}>
              {position}
            </Text>
          </View>
          
          {/* Avatar with Medal */}
          <View style={styles.avatarWrapper}>
            <View style={[
              isTopThree ? styles.avatarLarge : styles.avatar,
              isTopThree && { borderColor: getBorderColor(position), borderWidth: 2 },
              isCurrentUser && !isTopThree && { borderColor: COLORS.primary, borderWidth: 2 }
            ]}>
              {item.User?.avatar ? (
                <Image 
                  source={{ uri: `${BASE_URL}${item.User.avatar}` }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={[
                  styles.avatarText,
                  isTopThree && styles.avatarTextLarge
                ]}>
                  {item.User?.username?.charAt(0).toUpperCase() || '?'}
                </Text>
              )}
            </View>
            {isTopThree && (
              <View style={[styles.medalBadge, { backgroundColor: getBorderColor(position) }]}>
                <Ionicons name="trophy" size={12} color="#fff" />
              </View>
            )}
          </View>
          
          {/* User Info */}
          <View style={styles.userDetails}>
            <Text style={[
              styles.username,
              isTopThree && styles.usernameTop,
              isCurrentUser && styles.usernameCurrentUser
            ]}>
              {isCurrentUser ? `Tú (${item.User?.username})` : item.User?.username || 'Usuario'}
            </Text>
            <Text style={[
              styles.userLevel,
              isCurrentUser && styles.userLevelCurrentUser
            ]}>
              {isCurrentUser && !isTopThree
                ? `Sube en ${Math.abs(item.total_points - (rankings[position - 2]?.total_points || 0))} pts`
                : `${item.total_predictions} predicciones · ${item.effectiveness}%`}
            </Text>
          </View>
        </View>
        
        {/* Points */}
        <View style={styles.rankingRight}>
          <Text style={[
            styles.points,
            isTopThree && styles.pointsTop,
            isCurrentUser && styles.pointsCurrentUser
          ]}>
            {item.total_points}
          </Text>
          {isTopThree && (
            <Text style={styles.pointsLabelTop}>Puntos</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(10, 14, 20, 0.95)" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Rankings</Text>
            <Text style={styles.headerSubtitle}>
              {rankingType === 'global' && 'Clasificación general'}
              {rankingType === 'sport' && 'Por deporte'}
              {rankingType === 'league' && 'Por liga'}
              {rankingType === 'round' && 'Por jornada'}
            </Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTab('Global', 'global')}
        {renderTab('Deporte', 'sport')}
        {renderTab('Liga', 'league')}
        {/* {renderTab('Jornada', 'round')} */}
      </View>

      {/* Sport Filters */}
      {(rankingType === 'sport' || rankingType === 'league' || rankingType === 'round') && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>Seleccionar Deporte:</Text>
          <FlatList
            horizontal
            data={sports}
            renderItem={renderSportFilter}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filtersList}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* League Filters */}
      {(rankingType === 'league' || rankingType === 'round') && selectedSportId && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>Seleccionar Liga:</Text>
          <FlatList
            horizontal
            data={leagues}
            renderItem={renderLeagueFilter}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filtersList}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Round Filters */}
      {rankingType === 'round' && selectedLeagueId && (
        <View style={styles.filtersSection}>
          <Text style={styles.filterLabel}>Seleccionar Jornada:</Text>
          <FlatList
            horizontal
            data={rounds}
            renderItem={renderRoundFilter}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filtersList}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}

      {/* Rankings List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : rankings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={60} color={`${COLORS.primary}40`} />
          <Text style={styles.emptyText}>No hay rankings disponibles</Text>
          <Text style={styles.emptySubtext}>
            {rankingType === 'sport' && !selectedSportId && 'Selecciona un deporte'}
            {rankingType === 'league' && !selectedLeagueId && 'Selecciona una liga'}
            {rankingType === 'round' && !selectedRoundId && 'Selecciona una jornada'}
            {rankingType === 'global' && 'Haz predicciones y comienza a ganar puntos'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={rankings}
          renderItem={renderRankingItem}
          keyExtractor={(item, index) => `${item.User?.id}-${index}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 255, 140, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151a21',
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#a8abb3',
    fontWeight: '600',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: SIZES.padding * 0.6,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 6,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.padding * 0.5,
    alignItems: 'center',
    borderRadius: SIZES.radius,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.black,
    fontWeight: '700',
  },
  filtersSection: {
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  filterLabel: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SIZES.padding,
    marginBottom: 8,
  },
  filtersList: {
    paddingHorizontal: SIZES.padding,
  },
  filterChip: {
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    color: COLORS.textGray,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: COLORS.black,
    fontWeight: '700',
  },
  listContainer: {
    padding: SIZES.padding,
  },
  rankingCard: {
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.05)',
    position: 'relative',
  },
  rankingCardCurrentUser: {
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: 'rgba(0, 230, 119, 0.3)',
    borderBottomColor: 'rgba(0, 230, 119, 0.3)',
  },
  currentUserIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: COLORS.primary,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  positionContainer: {
    width: 32,
    alignItems: 'center',
  },
  rankingPosition: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textGray,
  },
  rankingPositionTop: {
    fontSize: 20,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary + '30',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarTextLarge: {
    fontSize: 22,
  },
  medalBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.backgroundDark,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  usernameTop: {
    fontSize: 16,
    fontWeight: '600',
  },
  usernameCurrentUser: {
    fontWeight: '700',
  },
  userLevel: {
    color: COLORS.textGray,
    fontSize: 12,
  },
  userLevelCurrentUser: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  rankingRight: {
    alignItems: 'flex-end',
  },
  points: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  pointsTop: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  pointsCurrentUser: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  pointsLabelTop: {
    color: COLORS.textGray,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textGray,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default RankingsScreen;
