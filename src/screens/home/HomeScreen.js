import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { matchService, sportService, rankingService } from '../../services';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../constants/config';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRanking, setUserRanking] = useState(null);
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    loadData();
    
    // Pulse animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [selectedSport]);

  const loadData = async () => {
    try {
      const [matchesRes, sportsRes, rankingRes] = await Promise.all([
        matchService.getUpcomingMatches({ 
          sport_id: selectedSport,
          limit: 20,
          exclude_predicted: true
        }),
        sportService.getAllSports(),
        rankingService.getGlobalRanking({ limit: 100 })
      ]);
      
      setMatches(matchesRes.data.matches || []);
      setSports(sportsRes.data.sports || []);
      
      // Encontrar la posición del usuario actual
      const rankings = rankingRes.data.rankings || [];
      const currentUserRank = rankings.find(rank => rank.User?.id === user?.id);
      setUserRanking(currentUserRank);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getTeamLogo = (team) => {
    if (!team?.logo) return null;
    if (team.logo.startsWith('file://') || team.logo.startsWith('http')) {
      return team.logo;
    }
    return `${BASE_URL}${team.logo}`;
  };

  const formatMatchDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `HOY, ${time}`;
    if (isTomorrow) return `MAÑANA, ${time}`;
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dayNames[date.getDay()]}, ${time}`;
  };

  const renderMatchCard = ({ item }) => {
    const isToday = new Date(item.match_date).toDateString() === new Date().toDateString();
    
    return (
      <View style={styles.matchCard}>
        <View style={styles.matchCardHeader}>
          <Text style={styles.matchLeague}>
            {item.league?.name || 'Liga'} • {item.sport?.name || 'Deporte'}
          </Text>
          {isToday && (
            <View style={styles.liveIndicator}>
              <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.liveText}>{formatMatchDate(item.match_date)}</Text>
            </View>
          )}
          {!isToday && (
            <Text style={styles.matchDateText}>{formatMatchDate(item.match_date)}</Text>
          )}
        </View>

        <View style={styles.matchTeams}>
          <View style={styles.teamContainer}>
            <View style={styles.teamLogoCard}>
              {getTeamLogo(item.home_team) ? (
                <Image 
                  source={{ uri: getTeamLogo(item.home_team) }} 
                  style={styles.teamLogo}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.teamLogoText}>
                  {item.home_team?.short_name || item.home_team?.name?.substring(0, 3).toUpperCase() || 'HOM'}
                </Text>
              )}
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>
              {item.home_team?.name || 'Home Team'}
            </Text>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.teamContainer}>
            <View style={styles.teamLogoCard}>
              {getTeamLogo(item.away_team) ? (
                <Image 
                  source={{ uri: getTeamLogo(item.away_team) }} 
                  style={styles.teamLogo}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.teamLogoText}>
                  {item.away_team?.short_name || item.away_team?.name?.substring(0, 3).toUpperCase() || 'AWA'}
                </Text>
              )}
            </View>
            <Text style={styles.teamNameText} numberOfLines={1}>
              {item.away_team?.name || 'Away Team'}
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.predictMatchButton}
          onPress={() => navigation.navigate('CreatePrediction', { matchId: item.id })}
        >
          <Text style={styles.predictMatchButtonText}>Hacer Predicción</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(10, 14, 20, 0.95)" />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {user?.avatar ? (
                  <Image 
                    source={{ uri: `${BASE_URL}${user.avatar}` }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={28} color={COLORS.primary} />
                )}
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.welcomeText}>BIENVENIDO</Text>
              <Text style={styles.greetingText} numberOfLines={1} ellipsizeMode="tail">
                Hola, {user?.username || 'Usuario'}
              </Text>
            </View>
          </View>
          <View style={styles.pointsBadge}>
            <Ionicons name="trophy" size={18} color={COLORS.primary} />
            <Text style={styles.pointsText}>
              {user?.total_points || 0} <Text style={styles.pointsLabel}>PTS</Text>
            </Text>
          </View>
        </View>

        {/* Main Dashboard Card */}
        <View style={styles.dashboardCardContainer}>
          <LinearGradient
            colors={['rgba(0, 230, 119, 0.15)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dashboardCard}
          >
            <View style={styles.abstractBlur1} />
            <View style={styles.abstractBlur2} />
            
            <View style={styles.dashboardContent}>
              <View style={styles.rankingSection}>
                <View style={styles.rankingLeft}>
                  <Text style={styles.rankingLabel}>Tu Posición Actual</Text>
                  <View style={styles.rankingRow}>
                    <Text style={styles.rankingNumber}>
                      {userRanking ? `#${userRanking.position}` : '-'}
                    </Text>
                    {userRanking && userRanking.position <= 3 && (
                      <View style={styles.rankingChange}>
                        <Ionicons name="trophy" size={14} color={COLORS.primary} />
                        <Text style={styles.rankingChangeText}>
                          {userRanking.position === 1 ? '🥇 Top 1' : 
                           userRanking.position === 2 ? '🥈 Top 2' : 
                           '🥉 Top 3'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.rankingSubtitle}>
                    {userRanking 
                      ? `${userRanking.total_predictions} predicciones • ${userRanking.effectiveness}% efectividad`
                      : 'Haz predicciones para aparecer en el ranking'}
                  </Text>
                </View>
                <View style={styles.trophyBadge}>
                  <Ionicons name="trophy" size={32} color={COLORS.primary} />
                </View>
              </View>

              <View style={styles.dashboardActions}>
                <TouchableOpacity 
                  style={styles.primaryActionButton}
                  onPress={() => navigation.navigate('Rankings')}
                >
                  <Text style={styles.primaryActionText}>Ver Ranking</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Predicciones Disponibles Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Partidos Disponibles</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AvailableMatches')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {matches.length > 0 ? (
            <FlatList
              horizontal
              data={matches.slice(0, 10)}
              renderItem={renderMatchCard}
              keyExtractor={(item) => item.id?.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchesList}
              snapToInterval={296}
              decelerationRate="fast"
            />
          ) : (
            <View style={styles.emptyMatches}>
              <Ionicons name="football-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyMatchesText}>No hay partidos disponibles</Text>
              <Text style={styles.emptyMatchesSubtext}>Ya has hecho predicción en todos los partidos próximos</Text>
            </View>
          )}
        </View>

        {/* Tu Actividad Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Actividad</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>EFECTIVIDAD</Text>
              <Text style={styles.statValue}>
                {user?.total_predictions > 0 
                  ? Math.round((user?.correct_predictions / user?.total_predictions) * 100) 
                  : 0}%
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ACIERTOS</Text>
              <Text style={styles.statValueSecondary}>
                {user?.correct_predictions || 0}/{user?.total_predictions || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing for FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Predictions')}
      >
        <Ionicons name="football" size={28} color="#0a0e14" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 40,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(0, 230, 119, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#0a0e14',
  },
  welcomeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  greetingText: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    flexShrink: 0,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  pointsLabel: {
    fontSize: 10,
    opacity: 0.8,
    letterSpacing: 0.5,
  },
  dashboardCardContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  dashboardCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
  },
  abstractBlur1: {
    position: 'absolute',
    right: -32,
    top: -32,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    opacity: 0.3,
  },
  abstractBlur2: {
    position: 'absolute',
    left: -32,
    bottom: -32,
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(0, 230, 119, 0.05)',
    opacity: 0.3,
  },
  dashboardContent: {
    position: 'relative',
    zIndex: 10,
  },
  rankingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  rankingLeft: {
    flex: 1,
  },
  rankingLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    marginBottom: 8,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  rankingNumber: {
    fontSize: 36,
    color: '#ffffff',
    fontWeight: '900',
  },
  rankingChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  rankingChangeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  rankingSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
  trophyBadge: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 119, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#0a0e14',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  secondaryActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  matchesList: {
    paddingRight: 24,
  },
  matchCard: {
    width: 280,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginRight: 16,
    gap: 16,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matchLeague: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
  },
  liveText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchDateText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  matchTeams: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  teamContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamLogoCard: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamNameText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.4)',
    fontWeight: '900',
  },
  predictMatchButton: {
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  predictMatchButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyMatches: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMatchesText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginTop: 12,
  },
  emptyMatchesSubtext: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: '700',
  },
  statValueSecondary: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
});

export default HomeScreen;
