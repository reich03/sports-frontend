import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { f1EventService } from '../../services';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

const formatDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};
const formatTime = (d) => {
  const dt = new Date(d);
  return dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};

const isEventClosed = (event) => {
  if (!event) return true;
  if (event.status && event.status !== 'scheduled') return true;
  return Date.now() >= new Date(event.event_date).getTime();
};

export default function F1EventsListScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('upcoming'); // upcoming | finished | all

  const load = useCallback(async () => {
    try {
      const res = await f1EventService.getEvents();
      setEvents(res.data?.events || []);
    } catch (err) {
      console.error('Error cargando eventos F1:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'finished') return events.filter((e) => e.status === 'finished');
    return events.filter((e) => e.status === 'scheduled' || e.status === 'live');
  }, [events, filter]);

  const renderCard = ({ item }) => {
    const closed = isEventClosed(item);
    const finished = item.status === 'finished';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => {
          if (finished) {
            navigation.navigate('F1Results', { eventId: item.id });
          } else {
            navigation.navigate('F1Prediction', { eventId: item.id });
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.seasonBadge}>
            <Ionicons name="flag" size={11} color={C.primary} />
            <Text style={styles.seasonBadgeText}>F1 · Temp. {item.season}</Text>
          </View>
          {finished ? (
            <View style={[styles.statusPill, { backgroundColor: `${C.success || '#22c55e'}22`, borderColor: C.success || '#22c55e' }]}>
              <Text style={[styles.statusText, { color: C.success || '#22c55e' }]}>FINALIZADO</Text>
            </View>
          ) : item.status === 'live' ? (
            <View style={[styles.statusPill, { backgroundColor: `${C.error}22`, borderColor: C.error }]}>
              <Text style={[styles.statusText, { color: C.error }]}>EN VIVO</Text>
            </View>
          ) : closed ? (
            <View style={[styles.statusPill, { backgroundColor: `${C.warning}22`, borderColor: C.warning }]}>
              <Text style={[styles.statusText, { color: C.warning }]}>CERRADO</Text>
            </View>
          ) : (
            <View style={[styles.statusPill, { backgroundColor: `${C.primary}22`, borderColor: C.primary }]}>
              <Text style={[styles.statusText, { color: C.primary }]}>ABIERTO</Text>
            </View>
          )}
        </View>

        <Text style={styles.eventName} numberOfLines={2}>{item.name}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
          <Text style={styles.metaText}>{formatDate(item.event_date)} · {formatTime(item.event_date)}</Text>
        </View>
        {item.circuit ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={C.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{item.circuit}{item.country ? ` · ${item.country}` : ''}</Text>
          </View>
        ) : null}

        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {finished ? 'Ver resultados y puntos' : closed ? 'Predicciones cerradas' : 'Hacer predicción'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fórmula 1</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        {[
          { key: 'upcoming', label: 'Próximos', icon: 'flash' },
          { key: 'finished', label: 'Finalizados', icon: 'checkmark-circle' },
          { key: 'all', label: 'Todos', icon: 'list' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, filter === t.key && styles.tabActive]}
            onPress={() => setFilter(t.key)}
            activeOpacity={0.85}
          >
            <Ionicons name={t.icon} size={14} color={filter === t.key ? C.onAccent : C.primary} />
            <Text style={[styles.tabText, filter === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.accent} /></View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="car-sport-outline" size={64} color={C.textSecondary} />
          <Text style={styles.emptyTitle}>No hay eventos F1</Text>
          <Text style={styles.emptySub}>Vuelve pronto para ver los próximos Grandes Premios</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={renderCard}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={C.accent} />}
        />
      )}
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: C.text, fontSize: 18, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 4, gap: 8 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, backgroundColor: `${C.primary}10`,
    borderWidth: 1, borderColor: `${C.primary}25`, minHeight: 42,
  },
  tabActive: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { color: C.primary, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: C.onAccent },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginTop: 16 },
  emptySub: { color: C.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6 },
  card: {
    backgroundColor: C.cardDark, borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: `${C.primary}18`,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  seasonBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${C.primary}18`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  seasonBadgeText: { color: C.primary, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5 },
  eventName: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  metaText: { color: C.textSecondary, fontSize: 12 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${C.primary}18` },
  ctaText: { color: C.primary, fontWeight: '700', fontSize: 13 },
});
