import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../../constants/theme';
import tournamentService from '../../services/tournament.service';

const WC_FLAG = '🏆';

// Cuenta regresiva hasta el inicio del Mundial
const useCountdown = (targetDate) => {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate) - new Date();
      if (diff <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000)
      });
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
};

const CountdownUnit = ({ value, label }) => (
  <View style={styles.countUnit}>
    <Text style={styles.countValue}>{String(value).padStart(2, '0')}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

export default function TournamentHomeScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const insets = useSafeAreaInsets();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const timeLeft = useCountdown('2026-06-11T19:00:00-05:00');

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const loadTournament = useCallback(async () => {
    try {
      if (tournamentId) {
        const res = await tournamentService.getTournament(tournamentId);
        setTournament(res.data.data);
      } else {
        // Si no hay ID, cargar el torneo público del Mundial
        const res = await tournamentService.listTournaments();
        const publicOne = res.data.data?.find(t => t.type === 'public') || res.data.data?.[0];
        setTournament(publicOne || null);
      }
    } catch (err) {
      console.error('Error cargando torneo:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [tournamentId]);

  useEffect(() => { loadTournament(); }, [loadTournament]);

  const onRefresh = () => { setRefreshing(true); loadTournament(); };

  const tabs = [
    { key: 'matches', label: 'Partidos', icon: 'football' },
    { key: 'results', label: 'Resultados', icon: 'checkmark-circle' },
    { key: 'groups', label: 'Grupos', icon: 'grid' },
    { key: 'table', label: 'Tabla', icon: 'podium' },
    { key: 'specials', label: 'Menciones', icon: 'star' },
  ];

  const navigateToTab = (tabKey) => {
    if (!tournament) return;
    const id = tournament.id;
    switch (tabKey) {
      case 'matches':
        navigation.navigate('TournamentMatches', { tournamentId: id, filter: 'upcoming' });
        break;
      case 'results':
        navigation.navigate('TournamentMatches', { tournamentId: id, filter: 'finished' });
        break;
      case 'groups':
        navigation.navigate('TournamentGroups', { tournamentId: id });
        break;
      case 'table':
        navigation.navigate('TournamentLeaderboard', { tournamentId: id });
        break;
      case 'specials':
        navigation.navigate('TournamentSpecials', { tournamentId: id });
        break;
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isStarted = tournament?.status !== 'upcoming';

  return (
    <Animated.ScrollView
      style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header con gradiente */}
      <LinearGradient
        colors={['#0f3320', '#0a1a0f', 'transparent']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={styles.trophy}>{WC_FLAG}</Text>
          </Animated.View>
          <Text style={styles.title}>FIFA WORLD CUP 2026</Text>
          <Text style={styles.subtitle}>🇲🇽 México  •  🇺🇸 EE.UU.  •  🇨🇦 Canadá</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>11 Jun – 19 Jul 2026</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Cuenta regresiva */}
      {!isStarted && (
        <LinearGradient
          colors={[COLORS.primary + '22', COLORS.primary + '08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.countdownCard}
        >
          <View style={styles.countdownAccent} />
          <Text style={styles.countdownTitle}>⏱  COMIENZA EN</Text>
          <View style={styles.countdownRow}>
            <CountdownUnit value={timeLeft.days} label="días" />
            <Text style={styles.countSep}>:</Text>
            <CountdownUnit value={timeLeft.hours} label="horas" />
            <Text style={styles.countSep}>:</Text>
            <CountdownUnit value={timeLeft.minutes} label="min" />
            <Text style={styles.countSep}>:</Text>
            <CountdownUnit value={timeLeft.seconds} label="seg" />
          </View>
        </LinearGradient>
      )}

      {/* Banner código privado */}
      {tournament?.type === 'private' && tournament?.access_code && (
        <View style={styles.privateCodeBanner}>
          <Ionicons name="lock-closed" size={18} color="#ff9900" />
          <View style={{ flex: 1 }}>
            <Text style={styles.privateCodeLabel}>Polla privada · Código de acceso</Text>
            <Text style={styles.privateCodeValue}>{tournament.access_code}</Text>
            <Text style={styles.privateCodeHint}>Comparte este código por WhatsApp para invitar participantes</Text>
          </View>
        </View>
      )}

      {/* Info del torneo */}
      {tournament && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color={COLORS.primary} />
            <Text style={styles.infoText}>{tournament.total_participants || 0} participantes</Text>
            {tournament.type === 'private' && (
              <View style={[styles.typeBadge, { backgroundColor: '#ff990022' }]}>
                <Text style={[styles.typeText, { color: '#ff9900' }]}>Privada</Text>
              </View>
            )}
          </View>
          {tournament.user_joined ? (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
              <Text style={styles.joinedText}>Ya estás participando</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.joinBtn}
              onPress={() => navigation.navigate('TournamentJoin', { tournaments: [] })}
            >
              <Text style={styles.joinBtnText}>¡Unirme al Mundial!</Text>
            </TouchableOpacity>
          )}
          {tournament.user_stats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tournament.user_stats.total_points}</Text>
                <Text style={styles.statLabel}>Puntos</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tournament.user_stats.correct_predictions}</Text>
                <Text style={styles.statLabel}>Acertadas</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{tournament.user_stats.special_points}</Text>
                <Text style={styles.statLabel}>Menciones</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Sistema de puntos */}
      <View style={styles.rulesCard}>
        <Text style={styles.rulesTitle}>Sistema de Puntos</Text>
        {[
          { label: 'Resultado exacto', pts: '10 pts', accent: COLORS.primary },
          { label: 'Ganador + goles local', pts: '7 pts', accent: COLORS.primary },
          { label: 'Ganador + goles visitante', pts: '7 pts', accent: COLORS.primary },
          { label: 'Solo ganador / empate', pts: '5 pts', accent: COLORS.primary },
          { label: 'Sin acierto', pts: '0 pts', accent: COLORS.error },
        ].map((r, i) => (
          <View key={i} style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: r.accent }]} />
            <Text style={styles.ruleLabel}>{r.label}</Text>
            <Text style={[styles.rulePts, { color: r.accent }]}>{r.pts}</Text>
          </View>
        ))}
        <View style={[styles.ruleRow, styles.ruleSeparator]}>
          <View style={[styles.ruleDot, { backgroundColor: '#ff9900' }]} />
          <Text style={styles.ruleLabel}>Menciones especiales (podio)</Text>
          <Text style={[styles.rulePts, { color: '#ff9900' }]}>Bonus</Text>
        </View>
      </View>

      {/* Accesos rápidos */}
      <Text style={styles.sectionTitle}>ACCESO RÁPIDO</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => navigateToTab(tab.key)}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={[COLORS.primary + '28', COLORS.primary + '0a']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.tabPill}
            >
              <View style={styles.tabPillIcon}>
                <Ionicons name={tab.icon} size={18} color={COLORS.primary} />
              </View>
              <Text style={styles.tabPillLabel} numberOfLines={1}>{tab.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Polla privada */}
      <TouchableOpacity
        style={styles.privateCard}
        onPress={() => navigation.navigate('TournamentJoin', { tab: 'private' })}
      >
        <Ionicons name="lock-closed" size={22} color={COLORS.warning} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.privateTitle}>Polla Privada</Text>
          <Text style={styles.privateSubtitle}>Ingresa un código de acceso para unirte</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  center: { flex: 1, backgroundColor: COLORS.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  headerGradient: { paddingBottom: 4 },
  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  trophy: { fontSize: 72, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: COLORS.white, letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6 },
  badge: { marginTop: 10, backgroundColor: COLORS.primary + '28', paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary + '44' },
  badgeText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },

  countdownCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: COLORS.primary + '33', overflow: 'hidden' },
  countdownAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: COLORS.primary },
  countdownTitle: { color: COLORS.primary, fontSize: 11, marginBottom: 14, letterSpacing: 2, fontWeight: '700' },
  countdownRow: { flexDirection: 'row', alignItems: 'center' },
  countUnit: { alignItems: 'center', minWidth: 60, backgroundColor: COLORS.cardDark, borderRadius: 12, paddingVertical: 8 },
  countValue: { fontSize: 34, fontWeight: 'bold', color: COLORS.primary },
  countLabel: { fontSize: 9, color: COLORS.textSecondary, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 },
  countSep: { fontSize: 28, color: COLORS.primary, fontWeight: 'bold', marginBottom: 16, marginHorizontal: 6 },

  privateCodeBanner: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#ff990015', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: '#ff990044' },
  privateCodeLabel: { color: '#ff9900', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  privateCodeValue: { color: COLORS.white, fontSize: 26, fontWeight: 'bold', letterSpacing: 4, marginVertical: 2 },
  privateCodeHint: { color: COLORS.textSecondary, fontSize: 11, lineHeight: 16 },

  infoCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { color: COLORS.textSecondary, marginLeft: 8, fontSize: 14, flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '700' },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary + '22', padding: 10, borderRadius: 10 },
  joinedText: { color: COLORS.primary, marginLeft: 8, fontWeight: '600', fontSize: 14 },
  joinBtn: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
  joinBtnText: { color: COLORS.backgroundDark, fontWeight: 'bold', fontSize: 15 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  rulesCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 16 },
  rulesTitle: { color: COLORS.white, fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  ruleDot: { width: 6, height: 6, borderRadius: 3 },
  ruleLabel: { flex: 1, color: COLORS.textSecondary, fontSize: 13 },
  rulePts: { fontWeight: 'bold', fontSize: 13 },
  ruleSeparator: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, marginTop: 4 },

  sectionTitle: { color: COLORS.textSecondary, fontSize: 11, letterSpacing: 1.5, marginHorizontal: 16, marginBottom: 10, fontWeight: '700' },
  tabRow: { paddingHorizontal: 16, paddingBottom: 16, gap: 10, flexDirection: 'row', alignItems: 'center' },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.primary + '28',
  },
  tabPillIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  tabPillLabel: { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  privateCard: {
    marginHorizontal: 16, backgroundColor: COLORS.cardDark, borderRadius: 16,
    padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 16
  },
  privateTitle: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  privateSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
