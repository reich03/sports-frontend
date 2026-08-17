import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { f1EventService } from '../../services';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BASE_URL } from '../../constants/config';

const getPhotoUri = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('file://') || photo.startsWith('http')) return photo;
  return `${BASE_URL}${photo}`;
};

const formatDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function F1ResultsScreen({ navigation, route }) {
  const { eventId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [event, setEvent] = useState(null);
  const [result, setResult] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [myPred, setMyPred] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [tab, setTab] = useState('mine'); // 'mine' | 'leaderboard'
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ev, gridRes, myPredRes, lb] = await Promise.all([
        f1EventService.getEventById(eventId),
        f1EventService.getEventDrivers(eventId),
        f1EventService.getMyPrediction(eventId).catch(() => ({ data: { prediction: null } })),
        f1EventService.getEventLeaderboard(eventId).catch(() => ({ data: { leaderboard: [] } })),
      ]);
      setEvent(ev.data?.event || null);
      setResult(ev.data?.event?.result || null);
      setDrivers(gridRes.data?.drivers || []);
      setMyPred(myPredRes.data?.prediction || null);
      setLeaderboard(lb.data?.leaderboard || []);
    } catch (err) {
      console.error('Error cargando resultados F1:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const driversById = useMemo(() => {
    const map = {};
    drivers.forEach((d) => { map[d.id] = d; });
    return map;
  }, [drivers]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: C.text }}>Evento no encontrado</Text>
      </View>
    );
  }

  const totalPoints = myPred?.points_earned || 0;
  const bd = myPred?.points_breakdown || {};

  const renderResultRow = (driverId, idx) => {
    const d = driversById[driverId];
    if (!d) return null;
    const predIdx = (myPred?.positions || []).indexOf(driverId);
    const predictedHere = predIdx === idx;
    const inTop10Pred = predIdx >= 0 && predIdx < 10;
    const inPodiumPred = predIdx >= 0 && predIdx < 3;
    const isPodium = idx < 3;

    // Badges
    const badges = [];
    if (predictedHere) badges.push({ label: `Exact Pos (${bd.exact_position ? '5' : ''})`, color: C.primary });
    if (idx < 10 && inTop10Pred && !predictedHere) badges.push({ label: 'Top 10', color: '#22c55e' });
    if (isPodium && inPodiumPred && !predictedHere) badges.push({ label: 'Podium', color: '#eab308' });

    return (
      <View key={`res-${driverId}`} style={[styles.resRow, isPodium && styles.resRowPodium]}>
        <Text style={[styles.resPos, isPodium && { color: C.primary }]}>{idx + 1}°</Text>
        <View style={styles.resAvatar}>
          {d.photo ? <Image source={{ uri: getPhotoUri(d.photo) }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={18} color={C.primary} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.resName} numberOfLines={1}>{d.short_name || d.name}</Text>
          <Text style={styles.resTeam} numberOfLines={1}>{d.team?.name || ''}</Text>
          {badges.length > 0 && (
            <View style={styles.badgesRow}>
              {badges.map((b, i) => (
                <View key={i} style={[styles.badge, { backgroundColor: `${b.color}22`, borderColor: b.color }]}>
                  <Text style={[styles.badgeText, { color: b.color }]}>{b.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>Resultados F1</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{event.name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.dateBar}>
        <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
        <Text style={styles.dateText}>{formatDate(event.event_date)}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tab, tab === 'mine' && styles.tabActive]} onPress={() => setTab('mine')}>
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Mis Puntos</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'leaderboard' && styles.tabActive]} onPress={() => setTab('leaderboard')}>
          <Text style={[styles.tabText, tab === 'leaderboard' && styles.tabTextActive]}>Clasificación General</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: insets.bottom + 32 }}>
        {!result ? (
          <View style={styles.emptyCard}>
            <Ionicons name="hourglass-outline" size={40} color={C.textSecondary} />
            <Text style={styles.emptyTitle}>Resultados pendientes</Text>
            <Text style={styles.emptySub}>El admin aún no ha cargado el resultado oficial de este evento.</Text>
          </View>
        ) : tab === 'mine' ? (
          <>
            {/* Tarjeta de puntos totales */}
            <View style={styles.totalCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.totalLabel}>Tu puntaje en este GP</Text>
                <Text style={styles.totalPoints}>{totalPoints} <Text style={styles.totalPointsSm}>pts</Text></Text>
              </View>
              <View style={styles.totalIcon}>
                <Ionicons name="trophy" size={32} color={C.primary} />
              </View>
            </View>

            {/* Desglose por categoría */}
            <View style={styles.breakdownGrid}>
              <BdItem C={C} styles={styles} label="Exact Pos" value={bd.exact_position || 0} icon="checkmark-circle" />
              <BdItem C={C} styles={styles} label="Top 10" value={bd.top10_hit || 0} icon="podium" color="#22c55e" />
              <BdItem C={C} styles={styles} label="Podio" value={bd.podium_hit || 0} icon="trophy" color="#eab308" />
              <BdItem C={C} styles={styles} label="Pole" value={bd.pole || 0} icon="flash" />
              <BdItem C={C} styles={styles} label="Vuelta Rápida" value={bd.fastest_lap || 0} icon="stopwatch" />
              <BdItem C={C} styles={styles} label="Piloto del Día" value={bd.driver_of_the_day || 0} icon="star" />
              <BdItem C={C} styles={styles} label="Abandonos" value={bd.retirements || 0} icon="warning" color={C.error} />
            </View>

            {/* Resultados por posición */}
            <Text style={styles.sectionTitle}>Resultados oficiales</Text>
            <View>
              {(result.positions || []).map((driverId, idx) => renderResultRow(driverId, idx))}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Ranking del evento</Text>
            {leaderboard.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={36} color={C.textSecondary} />
                <Text style={styles.emptyTitle}>Sin predicciones</Text>
                <Text style={styles.emptySub}>Nadie ha hecho predicción para este evento aún.</Text>
              </View>
            ) : (
              leaderboard.map((p, idx) => (
                <View key={p.id} style={styles.lbRow}>
                  <Text style={styles.lbPos}>{idx + 1}</Text>
                  <View style={styles.lbAvatar}>
                    {p.user?.avatar ? <Image source={{ uri: getPhotoUri(p.user.avatar) }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={18} color={C.primary} />}
                  </View>
                  <Text style={styles.lbName} numberOfLines={1}>{p.user?.name || 'Usuario'}</Text>
                  <Text style={styles.lbPoints}>{p.points_earned} pts</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const BdItem = ({ C, styles, label, value, icon, color }) => (
  <View style={styles.bdItem}>
    <View style={[styles.bdIcon, { backgroundColor: `${color || C.primary}22` }]}>
      <Ionicons name={icon} size={16} color={color || C.primary} />
    </View>
    <Text style={styles.bdLabel}>{label}</Text>
    <Text style={[styles.bdValue, { color: color || C.primary }]}>{value} pts</Text>
  </View>
);

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { color: C.text, fontSize: 17, fontWeight: 'bold', textAlign: 'center' },
  headerSub: { color: C.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 1 },
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  dateText: { color: C.textSecondary, fontSize: 12 },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: `${C.primary}44` },
  tabActive: { backgroundColor: `${C.primary}18`, borderColor: C.primary },
  tabText: { color: C.textSecondary, fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: C.primary },

  emptyCard: { alignItems: 'center', backgroundColor: C.cardDark, padding: 30, borderRadius: 16, borderWidth: 1, borderColor: `${C.primary}18`, marginTop: 12 },
  emptyTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 10 },
  emptySub: { color: C.textSecondary, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  totalCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardDark, borderRadius: 20,
    padding: 16, borderWidth: 1, borderColor: `${C.primary}44`, marginTop: 8,
  },
  totalLabel: { color: C.textSecondary, fontSize: 12, fontWeight: '600' },
  totalPoints: { color: C.primary, fontSize: 34, fontWeight: '900', marginTop: 4 },
  totalPointsSm: { fontSize: 16, fontWeight: '700' },
  totalIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: `${C.primary}18`, alignItems: 'center', justifyContent: 'center' },

  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  bdItem: { width: '31.5%', backgroundColor: C.cardDark, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: `${C.primary}18`, alignItems: 'flex-start', gap: 4 },
  bdIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  bdLabel: { color: C.textSecondary, fontSize: 10 },
  bdValue: { fontWeight: '900', fontSize: 15 },

  sectionTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  resRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: C.cardDark, marginBottom: 6, borderWidth: 1, borderColor: `${C.primary}14` },
  resRowPodium: { borderColor: `${C.primary}55` },
  resPos: { color: C.textSecondary, fontWeight: '900', width: 30, fontSize: 13 },
  resAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${C.primary}22`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  resName: { color: C.text, fontWeight: '700', fontSize: 13 },
  resTeam: { color: C.textSecondary, fontSize: 11, marginTop: 1 },
  badgesRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: C.cardDark, marginBottom: 6, borderWidth: 1, borderColor: `${C.primary}14` },
  lbPos: { color: C.primary, fontWeight: '900', fontSize: 14, width: 26, textAlign: 'center' },
  lbAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: `${C.primary}22`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  lbName: { color: C.text, fontWeight: '600', fontSize: 13, flex: 1 },
  lbPoints: { color: C.primary, fontWeight: '900', fontSize: 14 },
});
