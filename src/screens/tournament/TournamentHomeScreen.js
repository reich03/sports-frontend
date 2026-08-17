import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, TextInput, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tournamentService from '../../services/tournament.service';
import { SCORE_RULES_DISPLAY } from '../../constants/scoring';
import StatusModal from '../../components/StatusModal';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

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

const CountdownUnit = ({ value, label, styles }) => (
  <View style={styles.countUnit}>
    <Text style={styles.countValue}>{String(value).padStart(2, '0')}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

export default function TournamentHomeScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('matches');
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const timeLeft = useCountdown(tournament?.start_date || new Date().toISOString());

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

  useEffect(() => {
    if (tournament?.user_joined && tournamentId) {
      navigation.replace('TournamentMatches', { tournamentId, filter: 'upcoming' });
    }
  }, [tournament?.user_joined, tournamentId, navigation]);

  const onRefresh = () => { setRefreshing(true); loadTournament(); };

  const showModal = (type, title, message) => {
    setStatusModal({ visible: true, type, title, message });
  };

  const handleJoinPublic = async () => {
    if (!tournament) return;
    setJoining(true);
    try {
      await tournamentService.joinTournament(tournament.id);
      navigation.replace('TournamentMatches', { tournamentId: tournament.id, filter: 'upcoming' });
    } catch (err) {
      showModal('error', 'Error', err.response?.data?.message || 'No se pudo unir al torneo.');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinPrivate = async () => {
    if (!joinCode.trim()) {
      showModal('warning', 'Código requerido', 'Ingresa el código que te compartió el organizador.');
      return;
    }
    setJoining(true);
    try {
      const res = await tournamentService.joinByCode(joinCode.trim().toUpperCase());
      const joinedId = res.data.data?.participant?.tournament_id || tournament?.id;
      if (joinedId) {
        navigation.replace('TournamentMatches', { tournamentId: joinedId, filter: 'upcoming' });
      } else {
        await loadTournament();
      }
    } catch (err) {
      showModal(
        'error',
        'Código inválido',
        err.response?.data?.message || 'El código no es correcto. Verifica e intenta de nuevo.'
      );
    } finally {
      setJoining(false);
    }
  };

  const tabs = [
    { key: 'matches', label: 'Partidos', icon: 'football' },
    { key: 'results', label: 'Resultados', icon: 'checkmark-circle' },
    ...(tournament?.league?.name?.toLowerCase().includes('world cup') || tournament?.name?.toLowerCase().includes('mundial')
      ? [{ key: 'groups', label: 'Grupos', icon: 'grid' }]
      : []),
    { key: 'table', label: 'Tabla', icon: 'podium' },
    ...(tournament?.special_predictions_enabled !== false
      ? [{ key: 'specials', label: 'Menciones', icon: 'star' }]
      : []),
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
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!tournament) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={{ color: C.textSecondary, marginBottom: 16 }}>Torneo no encontrado</Text>
        <TouchableOpacity onPress={() => navigation.navigate('TournamentList')}>
          <Text style={{ color: C.primary, fontWeight: '700' }}>Ver torneos disponibles</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isStarted = tournament.status !== 'upcoming';
  const startDate = tournament.start_date ? new Date(tournament.start_date) : null;
  const endDate = tournament.end_date ? new Date(tournament.end_date) : null;
  const dateRange = startDate && endDate
    ? `${startDate.toLocaleDateString('es', { day: 'numeric', month: 'short' })} – ${endDate.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null;

  return (
    <>
    <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
    <Animated.ScrollView
      style={[styles.container, { paddingTop: insets.top, opacity: fadeAnim }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
    >
      {/* Header con gradiente */}
      <LinearGradient
        colors={C.isDark ? ['#0f3320', '#0a1a0f', 'transparent'] : [C.gradientHero[0], C.cardHighlight, 'transparent']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <Text style={styles.trophy}>🏆</Text>
          </Animated.View>
          <Text style={styles.title}>{tournament.name?.toUpperCase()}</Text>
          {tournament.description ? (
            <Text style={styles.subtitle}>{tournament.description}</Text>
          ) : tournament.league?.name ? (
            <Text style={styles.subtitle}>{tournament.league.name}</Text>
          ) : null}
          {dateRange && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{dateRange}</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      {/* Cuenta regresiva */}
      {!isStarted && (
        <LinearGradient
          colors={[C.primary + '22', C.primary + '08']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.countdownCard}
        >
          <View style={styles.countdownAccent} />
          <Text style={styles.countdownTitle}>⏱  COMIENZA EN</Text>
          <View style={styles.countdownRow}>
            <CountdownUnit value={timeLeft.days} label="días" styles={styles} />
            <Text style={styles.countSep}>:</Text>
            <CountdownUnit value={timeLeft.hours} label="horas" styles={styles} />
            <Text style={styles.countSep}>:</Text>
            <CountdownUnit value={timeLeft.minutes} label="min" styles={styles} />
            <Text style={styles.countSep}>:</Text>
            <CountdownUnit value={timeLeft.seconds} label="seg" styles={styles} />
          </View>
        </LinearGradient>
      )}

      {/* Info del torneo */}
      {tournament && (
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="people" size={20} color={C.primary} />
            <Text style={styles.infoText}>{tournament.total_participants || 0} participantes</Text>
            {tournament.type === 'private' && (
              <View style={[styles.typeBadge, { backgroundColor: '#ff990022' }]}>
                <Text style={[styles.typeText, { color: '#ff9900' }]}>Privada</Text>
              </View>
            )}
          </View>
          {tournament.user_joined ? (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={C.primary} />
              <Text style={styles.joinedText}>Ya estás participando</Text>
            </View>
          ) : tournament.type === 'private' ? (
            <View style={styles.privateJoinBlock}>
              <Text style={styles.privateJoinHint}>
                Polla privada. Pide el código al organizador para unirte.
              </Text>
              <TextInput
                style={styles.codeInput}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="Ej: MASTERSPORT2026"
                placeholderTextColor={C.textSecondary}
                maxLength={16}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.joinBtn, joining && { opacity: 0.6 }]}
                onPress={handleJoinPrivate}
                disabled={joining}
              >
                {joining ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.joinBtnText}>Unirme con código</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.joinBtn, joining && { opacity: 0.6 }]}
              onPress={handleJoinPublic}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.joinBtnText}>Unirme al torneo</Text>
              )}
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
        {SCORE_RULES_DISPLAY.map((r, i) => (
          <View key={i} style={styles.ruleRow}>
            <View style={[styles.ruleDot, { backgroundColor: r.accent === 'error' ? C.error : C.primary }]} />
            <Text style={styles.ruleLabel}>{r.label}</Text>
            <Text style={[styles.rulePts, { color: r.accent === 'error' ? C.error : C.primary }]}>{r.pts}</Text>
          </View>
        ))}
        {tournament.special_predictions_enabled !== false && (
          <View style={[styles.ruleRow, styles.ruleSeparator]}>
            <View style={[styles.ruleDot, { backgroundColor: '#ff9900' }]} />
            <Text style={styles.ruleLabel}>Menciones especiales (podio)</Text>
            <Text style={[styles.rulePts, { color: '#ff9900' }]}>
              {tournament.champion_points}/{tournament.runner_up_points}/{tournament.third_place_points} pts
            </Text>
          </View>
        )}
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
              colors={[C.primary + '28', C.primary + '0a']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.tabPill}
            >
              <View style={styles.tabPillIcon}>
                <Ionicons name={tab.icon} size={18} color={C.primary} />
              </View>
              <Text style={styles.tabPillLabel} numberOfLines={1}>{tab.label}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.ScrollView>

    <StatusModal
      visible={statusModal.visible}
      type={statusModal.type}
      title={statusModal.title}
      message={statusModal.message}
      primaryButtonText="Entendido"
      onPrimaryPress={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
      onClose={() => setStatusModal((prev) => ({ ...prev, visible: false }))}
    />
    </>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  headerGradient: { paddingBottom: 4 },
  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  backBtn: { position: 'absolute', left: 16, top: 24, padding: 4, zIndex: 1 },
  trophy: { fontSize: 72, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: C.text, letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 6 },
  badge: { marginTop: 10, backgroundColor: C.primary + '28', paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.primary + '44' },
  badgeText: { color: C.primary, fontSize: 13, fontWeight: '700' },

  countdownCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.primary + '33', overflow: 'hidden' },
  countdownAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: C.primary },
  countdownTitle: { color: C.primary, fontSize: 11, marginBottom: 14, letterSpacing: 2, fontWeight: '700' },
  countdownRow: { flexDirection: 'row', alignItems: 'center' },
  countUnit: { alignItems: 'center', minWidth: 60, backgroundColor: C.cardDark, borderRadius: 12, paddingVertical: 8 },
  countValue: { fontSize: 34, fontWeight: 'bold', color: C.primary },
  countLabel: { fontSize: 9, color: C.textSecondary, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 },
  countSep: { fontSize: 28, color: C.primary, fontWeight: 'bold', marginBottom: 16, marginHorizontal: 6 },

  infoCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.cardDark, borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { color: C.textSecondary, marginLeft: 8, fontSize: 14, flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  typeText: { fontSize: 11, fontWeight: '700' },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary + '22', padding: 10, borderRadius: 10 },
  joinedText: { color: C.primary, marginLeft: 8, fontWeight: '600', fontSize: 14 },
  joinBtn: { backgroundColor: C.accent, padding: 12, borderRadius: 10, alignItems: 'center' },
  joinBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  privateJoinBlock: { gap: 10 },
  privateJoinHint: { fontSize: 13, color: C.textSecondary, lineHeight: 18 },
  codeInput: {
    backgroundColor: C.background,
    borderRadius: 12,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: C.primary },
  statLabel: { fontSize: 11, color: C.textSecondary, marginTop: 2 },

  rulesCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.cardDark, borderRadius: 16, padding: 16 },
  rulesTitle: { color: C.text, fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  ruleDot: { width: 6, height: 6, borderRadius: 3 },
  ruleLabel: { flex: 1, color: C.textSecondary, fontSize: 13 },
  rulePts: { fontWeight: 'bold', fontSize: 13 },
  ruleSeparator: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 4 },

  sectionTitle: { color: C.textSecondary, fontSize: 11, letterSpacing: 1.5, marginHorizontal: 16, marginBottom: 10, fontWeight: '700' },
  tabRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 10, flexDirection: 'row', alignItems: 'center' },
  tabPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1, borderColor: C.primary + '28',
  },
  tabPillIcon: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.primary + '20',
    justifyContent: 'center', alignItems: 'center',
  },
  tabPillLabel: { color: C.text, fontSize: 13, fontWeight: '700' },
});
