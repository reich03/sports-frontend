import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tournamentService from '../../services/tournament.service';
import { SCORE_RULES_DISPLAY } from '../../constants/scoring';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

// Cuenta regresiva hasta el inicio del torneo
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
        seconds: Math.floor((diff % 60000) / 1000),
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
    <Text style={styles.countValue}>{String(value ?? 0).padStart(2, '0')}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

/**
 * Pantalla de solo lectura con la información de la polla/torneo.
 * A diferencia de TournamentHomeScreen, no auto-redirige a partidos
 * cuando el usuario ya está unido, ni muestra formularios para unirse.
 */
export default function TournamentInfoScreen({ navigation, route }) {
  const { tournamentId } = route.params || {};
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const timeLeft = useCountdown(tournament?.start_date || new Date().toISOString());

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const load = useCallback(async () => {
    try {
      if (tournamentId) {
        const res = await tournamentService.getTournament(tournamentId);
        setTournament(res.data.data);
      }
    } catch (err) {
      console.error('Error cargando info de la polla:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

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
        <Ionicons name="alert-circle-outline" size={40} color={C.textSecondary} />
        <Text style={{ color: C.textSecondary, marginTop: 12 }}>No se pudo cargar la información.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={{ color: C.primary, fontWeight: '700' }}>Volver</Text>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
      >
        {/* Header con gradiente */}
        <LinearGradient
          colors={C.isDark ? ['#0f3320', '#0a1a0f', 'transparent'] : [C.gradientHero?.[0] || C.primary, C.cardHighlight || C.cardDark, 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="arrow-back" size={22} color={C.text} />
            </TouchableOpacity>
            <View style={styles.infoPill}>
              <Ionicons name="information-circle" size={14} color={C.primary} />
              <Text style={styles.infoPillText}>INFORMACIÓN</Text>
            </View>
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

        {/* Datos generales */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Detalles de la polla</Text>

          <View style={styles.infoRow}>
            <Ionicons name="people" size={18} color={C.primary} />
            <Text style={styles.infoLabel}>Participantes</Text>
            <Text style={styles.infoValue}>{tournament.total_participants || 0}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name={tournament.type === 'private' ? 'lock-closed' : 'globe'} size={18} color={C.primary} />
            <Text style={styles.infoLabel}>Tipo</Text>
            <View style={[styles.typeBadge, { backgroundColor: tournament.type === 'private' ? '#ff990022' : `${C.primary}22` }]}>
              <Text style={[styles.typeText, { color: tournament.type === 'private' ? '#ff9900' : C.primary }]}>
                {tournament.type === 'private' ? 'Privada' : 'Pública'}
              </Text>
            </View>
          </View>

          {tournament.league?.name && (
            <View style={styles.infoRow}>
              <Ionicons name="trophy" size={18} color={C.primary} />
              <Text style={styles.infoLabel}>Liga</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{tournament.league.name}</Text>
            </View>
          )}

          {startDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color={C.primary} />
              <Text style={styles.infoLabel}>Inicio</Text>
              <Text style={styles.infoValue}>{startDate.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
          )}

          {endDate && (
            <View style={styles.infoRow}>
              <Ionicons name="flag-outline" size={18} color={C.primary} />
              <Text style={styles.infoLabel}>Fin</Text>
              <Text style={styles.infoValue}>{endDate.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </View>
          )}

          {tournament.user_joined && (
            <View style={styles.joinedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={C.primary} />
              <Text style={styles.joinedText}>Ya estás participando</Text>
            </View>
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

        {/* Sistema de puntos */}
        <View style={styles.rulesCard}>
          <Text style={styles.cardTitle}>Sistema de Puntos</Text>
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

        {/* CTA volver a partidos si ya está unido */}
        {tournament.user_joined && (
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => navigation.navigate('TournamentMatches', { tournamentId: tournament.id, filter: 'upcoming' })}
            activeOpacity={0.9}
          >
            <Ionicons name="football" size={18} color="#ffffff" />
            <Text style={styles.primaryCtaText}>Ir a los partidos</Text>
          </TouchableOpacity>
        )}
      </Animated.ScrollView>
    </>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },

  headerGradient: { paddingBottom: 4 },
  header: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  backBtn: { position: 'absolute', left: 16, top: 24, padding: 4, zIndex: 1 },
  infoPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.primary + '22',
    borderWidth: 1, borderColor: C.primary + '44',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    marginBottom: 12,
  },
  infoPillText: { color: C.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  trophy: { fontSize: 60, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: 'bold', color: C.text, letterSpacing: 2, textAlign: 'center' },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 6, textAlign: 'center' },
  badge: { marginTop: 10, backgroundColor: C.primary + '28', paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: C.primary + '44' },
  badgeText: { color: C.primary, fontSize: 13, fontWeight: '700' },

  countdownCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 18, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: C.primary + '33', overflow: 'hidden' },
  countdownAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, backgroundColor: C.primary },
  countdownTitle: { color: C.primary, fontSize: 11, marginBottom: 14, letterSpacing: 2, fontWeight: '700' },
  countdownRow: { flexDirection: 'row', alignItems: 'center' },
  countUnit: { alignItems: 'center', minWidth: 60, backgroundColor: C.cardDark, borderRadius: 12, paddingVertical: 8 },
  countValue: { fontSize: 30, fontWeight: 'bold', color: C.primary },
  countLabel: { fontSize: 9, color: C.textSecondary, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 },
  countSep: { fontSize: 24, color: C.primary, fontWeight: 'bold', marginBottom: 14, marginHorizontal: 5 },

  cardTitle: { color: C.text, fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  infoCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.cardDark, borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border + '55' },
  infoLabel: { color: C.textSecondary, fontSize: 13, flex: 1 },
  infoValue: { color: C.text, fontSize: 13, fontWeight: '700', maxWidth: '55%', textAlign: 'right' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  typeText: { fontSize: 11, fontWeight: '800' },

  joinedBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary + '22', padding: 10, borderRadius: 10, marginTop: 14 },
  joinedText: { color: C.primary, fontWeight: '700', fontSize: 13 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border + '55' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: 'bold', color: C.primary },
  statLabel: { fontSize: 11, color: C.textSecondary, marginTop: 2 },

  rulesCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: C.cardDark, borderRadius: 16, padding: 16 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  ruleDot: { width: 6, height: 6, borderRadius: 3 },
  ruleLabel: { flex: 1, color: C.textSecondary, fontSize: 13 },
  rulePts: { fontWeight: 'bold', fontSize: 13 },
  ruleSeparator: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 10, marginTop: 4 },

  primaryCta: {
    marginHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.accent,
    paddingVertical: 14, borderRadius: 14,
  },
  primaryCtaText: { color: '#ffffff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
});
