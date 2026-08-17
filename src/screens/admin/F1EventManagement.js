import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl,
  Modal, Image, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminCard from '../../components/admin/AdminCard';
import StatusModal from '../../components/StatusModal';
import { f1EventService, driverService, sportService, leagueService } from '../../services';
import { BASE_URL } from '../../constants/config';

const getPhotoUri = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('file://') || photo.startsWith('http')) return photo;
  return `${BASE_URL}${photo}`;
};

const formatDateTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · ${dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
};

const F1EventManagement = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [sports, setSports] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '' });

  const [formData, setFormData] = useState({
    name: '', season: String(new Date().getFullYear()), circuit: '', country: '',
    event_date: new Date().toISOString(), grid_size: '20', league_id: '', tournament_id: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [gridSelection, setGridSelection] = useState(new Set());
  const [resultForm, setResultForm] = useState({
    positions: [], // array de driverIds ordenados
    pole_driver_id: '',
    fastest_lap_driver_id: '',
    driver_of_the_day_id: '',
    retirements_count: '',
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, dr, sp, lg] = await Promise.all([
        f1EventService.getEvents(),
        driverService.getAllDrivers(),
        sportService.getAllSports(),
        leagueService.getAllLeagues(),
      ]);
      if (ev.data?.events) setEvents(ev.data.events);
      if (dr.data?.drivers) setDrivers(dr.data.drivers);
      if (sp.data?.sports) setSports(sp.data.sports);
      if (lg.data?.leagues) setLeagues(lg.data.leagues);
    } catch (err) {
      console.error('Error cargando eventos F1:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const f1Sport = useMemo(() => sports.find((s) => s.code === 'f1'), [sports]);
  const f1Leagues = useMemo(() => leagues.filter((l) => l.sport_id === f1Sport?.id), [leagues, f1Sport]);

  const resetForm = () => {
    setFormData({
      name: '', season: String(new Date().getFullYear()), circuit: '', country: '',
      event_date: new Date().toISOString(), grid_size: '20', league_id: '', tournament_id: '',
    });
  };

  const openCreate = () => { resetForm(); setShowCreateModal(true); };

  const openEdit = (ev) => {
    setSelectedEvent(ev);
    setFormData({
      name: ev.name || '',
      season: ev.season || String(new Date().getFullYear()),
      circuit: ev.circuit || '',
      country: ev.country || '',
      event_date: ev.event_date || new Date().toISOString(),
      grid_size: String(ev.grid_size || 20),
      league_id: ev.league_id || '',
      tournament_id: ev.tournament_id || '',
    });
    setShowEditModal(true);
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    season: formData.season.trim(),
    circuit: formData.circuit.trim() || null,
    country: formData.country.trim() || null,
    event_date: formData.event_date,
    grid_size: parseInt(formData.grid_size, 10) || 20,
    league_id: formData.league_id || null,
    tournament_id: formData.tournament_id || null,
    sport_id: f1Sport?.id,
  });

  const handleCreate = async () => {
    if (!formData.name || !formData.season || !f1Sport?.id) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: 'Completa nombre, temporada y asegura el deporte F1' });
      return;
    }
    try {
      setLoading(true);
      await f1EventService.createEvent(buildPayload());
      setShowCreateModal(false);
      resetForm();
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: '¡Evento creado!', message: 'Ya puedes gestionar la parrilla.' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo crear el evento' });
    } finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);
      await f1EventService.updateEvent(selectedEvent.id, buildPayload());
      setShowEditModal(false);
      setSelectedEvent(null);
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: 'Actualizado', message: 'Evento actualizado' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo actualizar' });
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await f1EventService.deleteEvent(selectedEvent.id);
      setShowDeleteModal(false);
      setSelectedEvent(null);
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: 'Eliminado', message: 'Evento eliminado' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo eliminar' });
    }
  };

  // ── Grid (parrilla) ─────────────────────────────────────────────────────
  const openGrid = async (ev) => {
    setSelectedEvent(ev);
    try {
      const res = await f1EventService.getEventDrivers(ev.id);
      const gridDrivers = res.data?.drivers || [];
      const isFallback = res.data?.fallback;
      // Si viene fallback significa que aún no hay parrilla definida; pre-seleccionamos todos
      if (isFallback) {
        setGridSelection(new Set(gridDrivers.map((d) => d.id)));
      } else {
        setGridSelection(new Set(gridDrivers.map((d) => d.id)));
      }
    } catch {
      setGridSelection(new Set());
    }
    setShowGridModal(true);
  };

  const toggleGridDriver = (driverId) => {
    setGridSelection((prev) => {
      const next = new Set(prev);
      if (next.has(driverId)) next.delete(driverId);
      else next.add(driverId);
      return next;
    });
  };

  const saveGrid = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);
      await f1EventService.setEventDrivers(selectedEvent.id, Array.from(gridSelection));
      setShowGridModal(false);
      setSelectedEvent(null);
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: 'Parrilla guardada', message: `${gridSelection.size} pilotos en la parrilla del evento.` });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo guardar' });
    } finally { setLoading(false); }
  };

  // ── Resultado oficial ───────────────────────────────────────────────────
  const openResult = async (ev) => {
    setSelectedEvent(ev);
    try {
      const gridRes = await f1EventService.getEventDrivers(ev.id);
      const gridDrivers = gridRes.data?.drivers || [];

      let existing = null;
      try {
        const r = await f1EventService.getEventResult(ev.id);
        existing = r.data?.result || null;
      } catch { /* no existe aún */ }

      setResultForm({
        positions: existing?.positions?.length ? existing.positions : gridDrivers.map((d) => d.id).slice(0, ev.grid_size || 20),
        pole_driver_id: existing?.pole_driver_id || '',
        fastest_lap_driver_id: existing?.fastest_lap_driver_id || '',
        driver_of_the_day_id: existing?.driver_of_the_day_id || '',
        retirements_count: existing?.retirements_count != null ? String(existing.retirements_count) : '',
      });
    } catch (err) {
      console.error(err);
    }
    setShowResultModal(true);
  };

  const swapPositions = (i, j) => {
    if (j < 0 || j >= resultForm.positions.length) return;
    setResultForm((prev) => {
      const copy = [...prev.positions];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return { ...prev, positions: copy };
    });
  };

  const saveResult = async () => {
    if (!selectedEvent) return;
    try {
      setLoading(true);
      await f1EventService.upsertEventResult(selectedEvent.id, {
        positions: resultForm.positions,
        pole_driver_id: resultForm.pole_driver_id || null,
        fastest_lap_driver_id: resultForm.fastest_lap_driver_id || null,
        driver_of_the_day_id: resultForm.driver_of_the_day_id || null,
        retirements_count: resultForm.retirements_count ? parseInt(resultForm.retirements_count, 10) : null,
      });
      setShowResultModal(false);
      setSelectedEvent(null);
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: '¡Resultado guardado!', message: 'Se procesaron las predicciones de los usuarios.' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo guardar el resultado' });
    } finally { setLoading(false); }
  };

  const driversById = useMemo(() => {
    const map = {};
    drivers.forEach((d) => { map[d.id] = d; });
    return map;
  }, [drivers]);

  // ── UI ──────────────────────────────────────────────────────────────────

  const renderEventCard = (ev) => {
    const statusColor = ev.status === 'finished' ? COLORS.success : ev.status === 'live' ? COLORS.error : COLORS.primary;
    return (
      <AdminCard key={ev.id} variant="highlight" style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.eventName} numberOfLines={1}>{ev.name}</Text>
            <View style={styles.eventMeta}>
              <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
              <Text style={styles.eventMetaText}>{formatDateTime(ev.event_date)}</Text>
            </View>
            <View style={styles.eventMeta}>
              <Text style={styles.eventBadge}>Temp. {ev.season}</Text>
              {ev.circuit && <Text style={styles.eventMetaText}>{ev.circuit}</Text>}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{ev.status?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(ev)}>
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openGrid(ev)}>
            <Ionicons name="people-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Parrilla</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => openResult(ev)}>
            <Ionicons name="flag-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Resultado</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => { setSelectedEvent(ev); setShowDeleteModal(true); }}>
            <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            <Text style={[styles.actionText, { color: COLORS.error }]}>Borrar</Text>
          </TouchableOpacity>
        </View>
      </AdminCard>
    );
  };

  const onDateChange = (_e, val) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (val) {
      const current = new Date(formData.event_date);
      val.setHours(current.getHours(), current.getMinutes());
      setFormData({ ...formData, event_date: val.toISOString() });
    }
  };

  const onTimeChange = (_e, val) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (val) {
      const current = new Date(formData.event_date);
      current.setHours(val.getHours(), val.getMinutes());
      setFormData({ ...formData, event_date: current.toISOString() });
    }
  };

  const renderEventForm = () => (
    <>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Nombre del evento *</Text>
        <TextInput
          style={styles.input} placeholder="Gran Premio de Mónaco"
          placeholderTextColor={`${COLORS.white}40`}
          value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })}
        />
      </View>
      <View style={styles.formRow}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Temporada *</Text>
          <TextInput style={styles.input} placeholder="2026" placeholderTextColor={`${COLORS.white}40`}
            value={formData.season} onChangeText={(t) => setFormData({ ...formData, season: t.replace(/[^0-9]/g, '') })} keyboardType="number-pad" maxLength={4} />
        </View>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Tamaño parrilla</Text>
          <TextInput style={styles.input} placeholder="20" placeholderTextColor={`${COLORS.white}40`}
            value={formData.grid_size} onChangeText={(t) => setFormData({ ...formData, grid_size: t.replace(/[^0-9]/g, '') })} keyboardType="number-pad" maxLength={2} />
        </View>
      </View>
      <View style={styles.formRow}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Circuito</Text>
          <TextInput style={styles.input} placeholder="Circuit de Monaco" placeholderTextColor={`${COLORS.white}40`}
            value={formData.circuit} onChangeText={(t) => setFormData({ ...formData, circuit: t })} />
        </View>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>País</Text>
          <TextInput style={styles.input} placeholder="Mónaco" placeholderTextColor={`${COLORS.white}40`}
            value={formData.country} onChangeText={(t) => setFormData({ ...formData, country: t })} />
        </View>
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Fecha y hora *</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.input, styles.dateBtn]} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
            <Text style={styles.dateText}>{new Date(formData.event_date).toLocaleDateString('es-ES')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.input, styles.dateBtn]} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
            <Text style={styles.dateText}>{new Date(formData.event_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker mode="date" value={new Date(formData.event_date)} onChange={onDateChange} display={Platform.OS === 'ios' ? 'spinner' : 'default'} />
        )}
        {showTimePicker && (
          <DateTimePicker mode="time" value={new Date(formData.event_date)} onChange={onTimeChange} display={Platform.OS === 'ios' ? 'spinner' : 'default'} is24Hour />
        )}
      </View>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Liga / Temporada (opcional)</Text>
        {f1Leagues.length === 0 ? (
          <Text style={styles.helperText}>No hay ligas F1 registradas. Créalas en "Ligas".</Text>
        ) : (
          <View style={styles.chipsWrap}>
            <TouchableOpacity style={[styles.chip, !formData.league_id && styles.chipActive]} onPress={() => setFormData({ ...formData, league_id: '' })}>
              <Text style={[styles.chipText, !formData.league_id && styles.chipTextActive]}>Ninguna</Text>
            </TouchableOpacity>
            {f1Leagues.map((l) => (
              <TouchableOpacity key={l.id} style={[styles.chip, formData.league_id === l.id && styles.chipActive]} onPress={() => setFormData({ ...formData, league_id: l.id })}>
                <Text style={[styles.chipText, formData.league_id === l.id && styles.chipTextActive]}>{l.name} · {l.season}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );

  const renderGridModal = () => {
    const f1Drivers = drivers.filter((d) => d.sport_id === f1Sport?.id);
    return (
      <Modal visible={showGridModal} transparent animationType="slide" onRequestClose={() => setShowGridModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '92%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Parrilla</Text>
                <Text style={styles.modalSubtitle}>{selectedEvent?.name} · {gridSelection.size} pilotos</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGridModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ padding: 12 }}>
              {f1Drivers.length === 0 ? (
                <Text style={styles.helperText}>No hay pilotos F1. Créalos en "Pilotos F1".</Text>
              ) : f1Drivers.map((d) => {
                const active = gridSelection.has(d.id);
                return (
                  <TouchableOpacity key={d.id} style={[styles.gridItem, active && styles.gridItemActive]} onPress={() => toggleGridDriver(d.id)}>
                    <View style={styles.gridAvatar}>
                      {d.photo ? <Image source={{ uri: getPhotoUri(d.photo) }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={18} color={COLORS.primary} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gridName} numberOfLines={1}>{d.number != null ? `#${d.number} ` : ''}{d.name}</Text>
                      <Text style={styles.gridMeta} numberOfLines={1}>{d.team?.name || 'Sin escudería'}</Text>
                    </View>
                    <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? COLORS.primary : `${COLORS.white}40`} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowGridModal(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={saveGrid} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.backgroundDark} /> : <Text style={styles.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderResultModal = () => {
    // Selector modal state
    return (
      <Modal visible={showResultModal} transparent animationType="slide" onRequestClose={() => setShowResultModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '94%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Cargar resultado</Text>
                <Text style={styles.modalSubtitle}>{selectedEvent?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowResultModal(false)}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 560 }} contentContainerStyle={{ padding: 14 }}>
              <Text style={styles.sectionTitle}>Posiciones finales</Text>
              <Text style={styles.helperText}>Usa las flechas para reordenar. Índice 1 = ganador.</Text>
              <View style={{ marginTop: 8 }}>
                {resultForm.positions.map((driverId, idx) => {
                  const d = driversById[driverId];
                  return (
                    <View key={`${driverId}-${idx}`} style={styles.posItem}>
                      <View style={styles.posBadge}>
                        <Text style={styles.posBadgeText}>P{idx + 1}</Text>
                      </View>
                      <View style={styles.gridAvatar}>
                        {d?.photo ? <Image source={{ uri: getPhotoUri(d.photo) }} style={{ width: '100%', height: '100%' }} /> : <Ionicons name="person" size={16} color={COLORS.primary} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gridName} numberOfLines={1}>{d?.name || 'Piloto desconocido'}</Text>
                        <Text style={styles.gridMeta} numberOfLines={1}>{d?.team?.name || ''}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 4 }}>
                        <TouchableOpacity style={styles.arrowBtn} onPress={() => swapPositions(idx, idx - 1)} disabled={idx === 0}>
                          <Ionicons name="chevron-up" size={16} color={idx === 0 ? `${COLORS.white}30` : COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.arrowBtn} onPress={() => swapPositions(idx, idx + 1)} disabled={idx === resultForm.positions.length - 1}>
                          <Ionicons name="chevron-down" size={16} color={idx === resultForm.positions.length - 1 ? `${COLORS.white}30` : COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Menciones</Text>
              <DriverSelectField label="Pole position" value={resultForm.pole_driver_id} options={resultForm.positions} driversById={driversById} onSelect={(id) => setResultForm({ ...resultForm, pole_driver_id: id })} />
              <DriverSelectField label="Vuelta rápida" value={resultForm.fastest_lap_driver_id} options={resultForm.positions} driversById={driversById} onSelect={(id) => setResultForm({ ...resultForm, fastest_lap_driver_id: id })} />
              <DriverSelectField label="Piloto del día" value={resultForm.driver_of_the_day_id} options={resultForm.positions} driversById={driversById} onSelect={(id) => setResultForm({ ...resultForm, driver_of_the_day_id: id })} />

              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Nº de abandonos</Text>
                <TextInput style={styles.input} placeholder="0" placeholderTextColor={`${COLORS.white}40`}
                  value={resultForm.retirements_count} keyboardType="number-pad" maxLength={2}
                  onChangeText={(t) => setResultForm({ ...resultForm, retirements_count: t.replace(/[^0-9]/g, '') })} />
              </View>

              <View style={styles.warningCard}>
                <Ionicons name="alert-circle" size={18} color={COLORS.error} />
                <Text style={styles.warningText}>Al guardar se calcularán los puntos de todas las predicciones y el evento pasará a "finished".</Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setShowResultModal(false)}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={saveResult} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.backgroundDark} /> : <Text style={styles.btnPrimaryText}>Guardar y procesar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Eventos F1" subtitle="Grandes Premios" onBack={() => navigation.goBack()} rightIcon="add" onRightPress={openCreate} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={COLORS.primary} />}
      >
        {loading && events.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : events.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 32 }}>
            <Ionicons name="flag-outline" size={48} color={COLORS.textSecondary} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>No hay eventos F1</Text>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 16 }} onPress={openCreate}>
              <Ionicons name="add" size={18} color={COLORS.backgroundDark} />
              <Text style={{ color: COLORS.backgroundDark, fontWeight: '700' }}>Crear primer evento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map(renderEventCard)
        )}
      </ScrollView>

      {/* FAB - Create Event */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color={COLORS.backgroundDark} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '92%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo evento F1</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}><Ionicons name="close" size={22} color={COLORS.white} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 16 }}>{renderEventForm()}</ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowCreateModal(false); resetForm(); }}><Text style={styles.btnCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.backgroundDark} /> : <Text style={styles.btnPrimaryText}>Crear</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '92%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar evento</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); resetForm(); }}><Ionicons name="close" size={22} color={COLORS.white} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 16 }}>{renderEventForm()}</ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowEditModal(false); resetForm(); }}><Text style={styles.btnCancelText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleUpdate} disabled={loading}>
                {loading ? <ActivityIndicator color={COLORS.backgroundDark} /> : <Text style={styles.btnPrimaryText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: 340 }]}>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <View style={styles.warnIcon}><Ionicons name="warning" size={30} color={COLORS.error} /></View>
              <Text style={styles.modalTitle}>Eliminar evento</Text>
              <Text style={styles.deleteMessage}>¿Seguro que quieres eliminar {selectedEvent?.name}? Se borrarán también las predicciones y el resultado.</Text>
              <View style={[styles.modalActions, { marginTop: 16, width: '100%' }]}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowDeleteModal(false)}><Text style={styles.btnCancelText}>Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={handleDelete}><Text style={styles.btnDangerText}>Eliminar</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {renderGridModal()}
      {renderResultModal()}

      <StatusModal
        visible={statusModal.visible} type={statusModal.type} title={statusModal.title} message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
        onPrimaryPress={() => setStatusModal({ ...statusModal, visible: false })}
        primaryButtonText="Aceptar"
      />
    </View>
  );
};

// Componente auxiliar: campo con dropdown para seleccionar un piloto dentro de las posiciones actuales
const DriverSelectField = ({ label, value, options, driversById, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selected = driversById[value];
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.input} onPress={() => setOpen((s) => !s)}>
        <Text style={{ color: selected ? COLORS.white : `${COLORS.white}55`, fontSize: 14 }}>
          {selected ? `${selected.number != null ? `#${selected.number} ` : ''}${selected.name}` : 'Selecciona un piloto'}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { onSelect(''); setOpen(false); }}>
              <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>— Ninguno —</Text>
            </TouchableOpacity>
            {options.map((id) => {
              const d = driversById[id];
              if (!d) return null;
              return (
                <TouchableOpacity key={id} style={styles.dropdownItem} onPress={() => { onSelect(id); setOpen(false); }}>
                  <Text style={{ color: COLORS.white, fontSize: 13 }}>{d.number != null ? `#${d.number} ` : ''}{d.name}</Text>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 11 }}>{d.team?.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  eventCard: { marginBottom: 12, padding: 14 },
  eventHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  eventName: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  eventMetaText: { color: COLORS.textSecondary, fontSize: 12 },
  eventBadge: { color: COLORS.primary, fontSize: 11, fontWeight: '700', backgroundColor: `${COLORS.primary}22`, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: `${COLORS.primary}12`, borderWidth: 1, borderColor: `${COLORS.primary}22` },
  actionBtnDanger: { backgroundColor: `${COLORS.error}12`, borderColor: `${COLORS.error}30` },
  actionText: { color: COLORS.primary, fontWeight: '600', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 12 },
  modalCard: { backgroundColor: '#1a2f26', borderRadius: 20, overflow: 'hidden', maxHeight: '92%', borderWidth: 1, borderColor: `${COLORS.primary}33` },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,230,119,0.06)' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  fab: { position: 'absolute', bottom: 32, right: 20, width: 60, height: 60, borderRadius: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  modalSubtitle: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  modalActions: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: `${COLORS.white}15` },
  btnCancel: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: `${COLORS.white}0d`, borderWidth: 1, borderColor: `${COLORS.white}20` },
  btnCancelText: { color: COLORS.white, fontWeight: '600' },
  btnPrimary: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
  btnPrimaryText: { color: COLORS.backgroundDark, fontWeight: '700' },
  btnDanger: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.error },
  btnDangerText: { color: COLORS.white, fontWeight: '700' },
  formGroup: { marginBottom: 16 },
  formGroupHalf: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  label: { color: '#ffffff', fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#ffffff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { color: COLORS.white, fontSize: 13 },
  helperText: { color: COLORS.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: `${COLORS.primary}12`, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.backgroundDark },
  gridItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.white}15`, marginBottom: 6, backgroundColor: `${COLORS.white}05` },
  gridItemActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}14` },
  gridAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${COLORS.primary}22`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gridName: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
  gridMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 1 },
  posItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.white}15`, marginBottom: 6, backgroundColor: `${COLORS.white}05` },
  posBadge: { width: 36, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, backgroundColor: `${COLORS.primary}22` },
  posBadgeText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  arrowBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: `${COLORS.primary}15`, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  warningCard: { flexDirection: 'row', gap: 8, backgroundColor: `${COLORS.error}12`, borderColor: `${COLORS.error}30`, borderWidth: 1, borderRadius: 12, padding: 10, marginTop: 16, alignItems: 'flex-start' },
  warningText: { color: COLORS.textSecondary, fontSize: 12, flex: 1, lineHeight: 18 },
  dropdown: { marginTop: 4, backgroundColor: COLORS.cardDark, borderRadius: 10, borderWidth: 1, borderColor: `${COLORS.primary}22` },
  dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: `${COLORS.white}0d` },
  warnIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: `${COLORS.error}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  deleteMessage: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});

export default F1EventManagement;
