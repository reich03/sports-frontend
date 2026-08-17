import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { matchService, sportService, userService } from '../../services';
import { SIZES, SHADOWS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BASE_URL } from '../../constants/config';
import { arePredictionsClosed } from '../../utils/predictions';

const HomeScreen = ({ navigation }) => {
  const { user } = useAuth();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const [matches, setMatches] = useState([]);
  const [sports, setSports] = useState([]);
  const [selectedSport, setSelectedSport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Entry animations — each section slides up + fades in with stagger
  const sections = useRef(
    Array.from({ length: 6 }, () => ({
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

  const sectionStyle = (i) => {
    // Guarda de seguridad: si el índice cae fuera del array o es fraccional,
    // usa el último slot disponible para no reventar la app.
    const idx = Math.min(Math.max(0, Math.floor(i)), sections.length - 1);
    const s = sections[idx];
    return {
      opacity: s.opacity,
      transform: [{ translateY: s.translateY }],
    };
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedSport, user?.id])
  );

  useEffect(() => {
    // Pulse animation for live indicator
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchesRes, sportsRes] = await Promise.all([
        matchService.getUpcomingMatches({
          sport_id: selectedSport || undefined,
          limit: 20,
          exclude_predicted: 'true',
        }),
        sportService.getAllSports(),
      ]);

      setMatches(matchesRes.data.matches || []);
      setSports(sportsRes.data.sports || []);
    } catch (error) {
      console.error('Error loading home data:', error);
    }

    if (user?.id) {
      try {
        const statsRes = await userService.getUserStats(user.id);
        setUserStats(statsRes.data?.stats || null);
      } catch (error) {
        console.error('Error loading user stats:', error);
        setUserStats(null);
      }
    } else {
      setUserStats(null);
    }

    setLoading(false);
    setRefreshing(false);
    runEntryAnimations();
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
    const closed = arePredictionsClosed(item);
    
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

        {closed ? (
          <View style={styles.predictMatchButtonDisabled}>
            <Ionicons name="lock-closed" size={14} color={C.textSecondary} />
            <Text style={styles.predictMatchButtonDisabledText}>Predicciones cerradas</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.predictMatchButton}
            onPress={() => navigation.navigate('CreatePrediction', { matchId: item.id })}
          >
            <Text style={styles.predictMatchButtonText}>Hacer Predicción</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
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
                  <Ionicons name="person" size={28} color={C.primary} />
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
            <Ionicons name="trophy" size={18} color={C.primary} />
            <Text style={styles.pointsText}>
              {userStats?.total_points ?? user?.total_points ?? 0}{' '}
              <Text style={styles.pointsLabel}>PTS</Text>
            </Text>
          </View>
        </View>
        </Animated.View>

        {/* ─── Banner Mundial 2026 ─── */}
        <Animated.View style={sectionStyle(1)}>
        <TouchableOpacity
          style={styles.mundialBanner}
          onPress={() => navigation.navigate('TournamentList')}
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
                  <Text style={styles.mundialTitle}>Torneos / Pollas</Text>
                  <Text style={styles.mundialSub}>Predice marcadores y compite</Text>
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

        {/* ─── Banner Fórmula 1 ─── */}
        <Animated.View style={sectionStyle(2)}>
        <TouchableOpacity
          style={styles.f1Banner}
          onPress={() => navigation.navigate('F1EventsList')}
          activeOpacity={0.88}
        >
          <ImageBackground
            source={require('../../../assets/fondo-formula1.jpg')}
            style={styles.f1ImageBg}
            imageStyle={{ borderRadius: 16 }}
            resizeMode="cover"
          >
            <View style={styles.f1Overlay}>
              <View style={styles.f1Content}>
                <View style={styles.f1Text}>
                  <Text style={styles.f1Title}>Fórmula 1</Text>
                  <Text style={styles.f1Sub}>Predice el podio y gana puntos</Text>
                </View>
                <View style={styles.f1Badge}>
                  <Text style={styles.f1BadgeText}>¡NUEVO!</Text>
                </View>
              </View>
              <View style={styles.f1Flags}>
                <Ionicons name="flag" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.f1FlagText}>Grandes Premios · Predicciones</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>
        </Animated.View>

        {/* Main Dashboard Card — oculto por ahora (posición global / ranking)
        <Animated.View style={sectionStyle(2)}>
        <View style={styles.dashboardCardContainer}>
          ...
        </View>
        </Animated.View>
        */}

        {/* Predicciones Disponibles Section — oculto por solicitud del cliente
        <Animated.View style={sectionStyle(2)}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Partidos Disponibles</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AvailableMatches')}>
              <Text style={styles.seeAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {loading && matches.length === 0 ? (
            <View style={styles.emptyMatches}>
              <Text style={styles.emptyMatchesText}>Cargando partidos...</Text>
            </View>
          ) : matches.length > 0 ? (
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
              <Ionicons name="football-outline" size={48} color={C.textSecondary} />
              <Text style={styles.emptyMatchesText}>No hay partidos disponibles</Text>
              <Text style={styles.emptyMatchesSubtext}>
                {user?.id
                  ? 'Ya has hecho predicción en todos los partidos próximos'
                  : 'No hay partidos programados por ahora'}
              </Text>
            </View>
          )}
        </View>
        </Animated.View>
        */}

        {/* Tu Actividad Section */}
        <Animated.View style={sectionStyle(3)}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Actividad</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>EFECTIVIDAD</Text>
              <Text style={styles.statValue}>
                {userStats?.processed_predictions > 0
                  ? Math.round(userStats.accuracy || 0)
                  : 0}%
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ACIERTOS</Text>
              <Text style={styles.statValueSecondary}>
                {userStats?.correct_predictions || 0}/{userStats?.total_predictions || 0}
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
        <Ionicons name="football" size={28} color={C.onAccent} />
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (C) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  mundialBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  mundialImageBg: { borderRadius: 16, minHeight: 110 },
  mundialOverlay: { backgroundColor: 'rgba(0,0,0,0.55)', padding: 16, borderRadius: 16 },
  mundialContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  mundialText: { flex: 1 },
  mundialTitle: { color: '#ffffff', fontWeight: 'bold', fontSize: 16, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  mundialSub: { color: C.accent, fontSize: 12, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  mundialBadge: { backgroundColor: C.accent, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  mundialBadgeText: { color: C.onAccent, fontSize: 10, fontWeight: 'bold' },
  f1Banner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  f1ImageBg: { borderRadius: 16, minHeight: 120 },
  f1Overlay: { backgroundColor: 'rgba(0,0,0,0.45)', padding: 16, borderRadius: 16 },
  f1Content: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  f1Text: { flex: 1 },
  f1Title: { color: '#ffffff', fontWeight: 'bold', fontSize: 17, letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  f1Sub: { color: '#ffdcdc', fontSize: 12, marginTop: 2, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  f1Badge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  f1BadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  f1Flags: { flexDirection: 'row', alignItems: 'center' },
  f1FlagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
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
    backgroundColor: C.cardHighlight,
    borderWidth: 2,
    borderColor: C.cardBorder,
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
    backgroundColor: C.accent,
    borderWidth: 2,
    borderColor: C.background,
  },
  welcomeText: {
    fontSize: 10,
    color: C.textFaint,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  greetingText: {
    fontSize: 18,
    color: C.text,
    fontWeight: '700',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.cardHighlight,
    flexShrink: 0,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
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
    backgroundColor: C.accent,
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
  rankingStatValue: { color: C.primary, fontWeight: '700' },
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
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  rankingBtnText: {
    color: C.onAccent,
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
  miniStatVal: { fontSize: 18, fontWeight: 'bold', color: C.white },
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
    color: C.text,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    color: C.primary,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.primary + '18',
    borderRadius: 20,
    overflow: 'hidden',
  },
  matchesList: {
    paddingRight: 24,
  },
  matchCard: {
    width: 270,
    backgroundColor: C.cardDark,
    borderWidth: 1,
    borderColor: C.primary + '22',
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
    color: C.textSubtle,
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
    backgroundColor: C.accent,
  },
  liveText: {
    fontSize: 10,
    color: C.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  matchDateText: {
    fontSize: 10,
    color: C.textFaint,
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
    backgroundColor: C.surfaceMuted,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    fontSize: 16,
    color: C.primary,
    fontWeight: '700',
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  teamNameText: {
    fontSize: 12,
    color: C.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  vsContainer: {
    paddingHorizontal: 12,
  },
  vsText: {
    fontSize: 20,
    color: C.textFaint,
    fontWeight: '900',
  },
  predictMatchButton: {
    backgroundColor: C.accent,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  predictMatchButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
  },
  predictMatchButtonDisabledText: {
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  predictMatchButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyMatches: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyMatchesText: {
    color: C.textFaint,
    fontSize: 14,
    marginTop: 12,
  },
  emptyMatchesSubtext: {
    color: C.textHint,
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
    backgroundColor: C.surfaceMuted,
    borderWidth: 1,
    borderColor: C.surfaceBorder,
    padding: 16,
    borderRadius: 16,
  },
  statLabel: {
    fontSize: 10,
    color: C.textSubtle,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    color: C.text,
    fontWeight: '700',
  },
  statValueSecondary: {
    fontSize: 24,
    color: C.text,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
});

export default HomeScreen;
