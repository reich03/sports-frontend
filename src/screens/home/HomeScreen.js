import React, { useState, useEffect, useRef } from 'react';
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
  ImageBackground,
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
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Entry animations — each section slides up + fades in with stagger
  const sections = useRef(
    Array.from({ length: 5 }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(24),
    }))
  ).current;

  const runEntryAnimations = () => {
    sections.forEach((s, i) => {
      Animated.parallel([
        Animated.timing(s.opacity, {
          toValue: 1,
          duration: 400,
          delay: i * 90,
          useNativeDriver: true,
        }),
        Animated.timing(s.translateY, {
          toValue: 0,
          duration: 400,
          delay: i * 90,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const sectionStyle = (i) => ({
    opacity: sections[i].opacity,
    transform: [{ translateY: sections[i].translateY }],
  });

  useEffect(() => {
    loadData();

    // Pulse animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
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
      runEntryAnimations();
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
        <Animated.View style={sectionStyle(0)}>
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
        </Animated.View>

        {/* ─── Banner Mundial 2026 ─── */}
        <Animated.View style={sectionStyle(1)}>
        <TouchableOpacity
          style={styles.mundialBanner}
          onPress={() => navigation.navigate('TournamentHome')}
          activeOpacity={0.88}
        >
          <ImageBackground
            source={require('../../../assets/Todo-listo-para-el-sorteo-de-la-Copa-Mundial-de-la-FIFA.webp')}
            style={styles.mundialImageBg}
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          >
            <View style={styles.mundialOverlay}>
              <View style={styles.mundialContent}>
                <View style={styles.mundialText}>
                  <Text style={styles.mundialTitle}>FIFA World Cup 2026</Text>
                  <Text style={styles.mundialSub}>¡Predice y gana! Jun 11 – Jul 19</Text>
                </View>
                <View style={styles.mundialBadge}>
                  <Text style={styles.mundialBadgeText}>¡NUEVO!</Text>
                </View>
              </View>
              <View style={styles.mundialFlags}>
                <Text style={styles.mundialFlag}>🇲🇽</Text>
                <Text style={styles.mundialFlag}>🇺🇸</Text>
                <Text style={styles.mundialFlag}>🇨🇦</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
        </Animated.View>

        {/* Main Dashboard Card */}
        <Animated.View style={sectionStyle(2)}>
        <View style={styles.dashboardCardContainer}>
          <LinearGradient
            colors={['rgba(0,230,119,0.12)', 'rgba(0,230,119,0.03)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dashboardCard}
          >
            {/* accent strip */}
            <View style={styles.dashAccent} />

            <View style={styles.dashboardContent}>
              <View style={styles.rankingSection}>
                <View style={styles.rankingLeft}>
                  <Text style={styles.rankingLabel}>Tu Posición Global</Text>
                  <View style={styles.rankingRow}>
                    <Text style={styles.rankingNumber}>
                      {userRanking ? `#${userRanking.position}` : '—'}
                    </Text>
                    {userRanking?.position <= 3 && (
                      <Text style={styles.topBadge}>
                        {userRanking.position === 1 ? '🥇' : userRanking.position === 2 ? '🥈' : '🥉'}
                      </Text>
                    )}
                  </View>
                  {userRanking ? (
                    <View style={styles.rankingStats}>
                      <Text style={styles.rankingStatItem}>
                        <Text style={styles.rankingStatValue}>{userRanking.total_predictions}</Text>
                        {' '}pred.
                      </Text>
                      <Text style={styles.rankingStatDot}>·</Text>
                      <Text style={styles.rankingStatItem}>
                        <Text style={styles.rankingStatValue}>{userRanking.effectiveness || 0}%</Text>
                        {' '}efectividad
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.rankingSubtitle}>Haz predicciones para subir en el ranking</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.rankingBtn}
                  onPress={() => navigation.navigate('Rankings')}
                >
                  <Ionicons name="podium" size={18} color={COLORS.backgroundDark} />
                  <Text style={styles.rankingBtnText}>Ranking</Text>
                </TouchableOpacity>
              </View>

              {userRanking && (
                <View style={styles.miniStatsRow}>
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatVal}>{userRanking.correct_predictions || 0}</Text>
                    <Text style={styles.miniStatLabel}>Aciertos</Text>
                  </View>
                  <View style={styles.miniStatDiv} />
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatVal}>{user?.total_points || 0}</Text>
                    <Text style={styles.miniStatLabel}>Puntos</Text>
                  </View>
                  <View style={styles.miniStatDiv} />
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatVal}>{userRanking.total_predictions || 0}</Text>
                    <Text style={styles.miniStatLabel}>Predicciones</Text>
                  </View>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>
        </Animated.View>

        {/* Predicciones Disponibles Section */}
        <Animated.View style={sectionStyle(3)}>
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
        </Animated.View>

        {/* Tu Actividad Section */}
        <Animated.View style={sectionStyle(4)}>
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
        </Animated.View>

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
  mundialBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  mundialImageBg: { borderRadius: 16, minHeight: 110 },
  mundialOverlay: { backgroundColor: 'rgba(0,0,0,0.55)', padding: 16, borderRadius: 16 },
  mundialContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mundialText: { flex: 1 },
  mundialTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  mundialSub: { color: COLORS.primary, fontSize: 12, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  mundialBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  mundialBadgeText: { color: COLORS.backgroundDark, fontSize: 10, fontWeight: 'bold' },
  mundialFlags: { flexDirection: 'row', alignItems: 'center' },
  mundialFlag: { fontSize: 22, marginRight: 6 },
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
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,230,119,0.18)',
    overflow: 'hidden',
  },
  dashAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
  },
  dashboardContent: {},
  rankingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rankingLeft: { flex: 1 },
  rankingLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  rankingNumber: {
    fontSize: 40,
    color: '#ffffff',
    fontWeight: '900',
    lineHeight: 44,
  },
  topBadge: { fontSize: 22 },
  rankingStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  rankingStatItem: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  rankingStatValue: { color: COLORS.primary, fontWeight: '700' },
  rankingStatDot: { color: 'rgba(255,255,255,0.25)', fontSize: 12 },
  rankingSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
    lineHeight: 16,
  },
  rankingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rankingBtnText: {
    color: COLORS.backgroundDark,
    fontWeight: '700',
    fontSize: 13,
  },
  miniStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
  },
  miniStat: { flex: 1, alignItems: 'center' },
  miniStatVal: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  miniStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  miniStatDiv: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4 },
  section: {
    marginTop: 28,
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.primary + '18',
    borderRadius: 20,
    overflow: 'hidden',
  },
  matchesList: {
    paddingRight: 24,
  },
  matchCard: {
    width: 270,
    backgroundColor: COLORS.cardDark,
    borderWidth: 1,
    borderColor: COLORS.primary + '22',
    borderRadius: 18,
    padding: 16,
    marginRight: 14,
    gap: 14,
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
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  predictMatchButtonText: {
    color: COLORS.backgroundDark,
    fontSize: 13,
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
