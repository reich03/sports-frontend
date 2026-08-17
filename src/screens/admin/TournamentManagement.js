import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, RefreshControl, Modal, ActivityIndicator, Switch, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import { BASE_URL } from '../../constants/config';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusModal from '../../components/StatusModal';
import tournamentService from '../../services/tournament.service';
import { leagueService } from '../../services';
import { MASTER_SPORTS_SCORE_RULES } from '../../constants/scoring';

const STATUS_COLORS = {
  upcoming: '#7be6ff',
  active: COLORS.primary,
  finished: COLORS.textSecondary,
};

const TournamentManagement = ({ navigation }) => {
  const [tournaments, setTournaments] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [detailBanner, setDetailBanner] = useState(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '' });

  const [form, setForm] = useState({
    name: '',
    description: '',
    league_id: '',
    type: 'public',
    access_code: '',
    start_date: '',
    end_date: '',
    max_participants: '',
    special_predictions_enabled: true,
    champion_points: '45',
    runner_up_points: '35',
    third_place_points: '25',
  });

  const loadData = useCallback(async () => {
    try {
      const [tRes, lRes] = await Promise.all([
        tournamentService.listTournamentsAdmin(),
        leagueService.getAllLeagues(),
      ]);
      setTournaments(tRes.data?.data || []);
      setLeagues(lRes.data?.leagues || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({
      name: '', description: '', league_id: '', type: 'public', access_code: '',
      start_date: '', end_date: '', max_participants: '',
      special_predictions_enabled: true,
      champion_points: '45', runner_up_points: '35', third_place_points: '25',
    });
    setSelectedBanner(null);
  };

  const getBannerUri = (image) => {
    if (!image) return null;
    if (image.startsWith('file://') || image.startsWith('http')) return image;
    return `${BASE_URL}${image}`;
  };

  const pickBannerImage = async (target = 'create') => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setStatusModal({
          visible: true, type: 'error', title: 'Permiso requerido',
          message: 'Necesitamos acceso a tu galería para seleccionar el banner.',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.85,
      });

      if (!result.canceled && result.assets[0]) {
        if (target === 'detail') {
          setDetailBanner(result.assets[0].uri);
        } else {
          setSelectedBanner(result.assets[0].uri);
        }
      }
    } catch (error) {
      setStatusModal({
        visible: true, type: 'error', title: 'Error',
        message: 'No se pudo seleccionar la imagen',
      });
    }
  };

  const uploadBannerForTournament = async (tournamentId, imageUri) => {
    if (!imageUri || !imageUri.startsWith('file://')) return null;
    return tournamentService.uploadTournamentBanner(tournamentId, imageUri);
  };

  const handleCreate = async () => {
    if (!form.name || !form.league_id || !form.start_date || !form.end_date) {
      setStatusModal({ visible: true, type: 'error', title: 'Campos requeridos', message: 'Nombre, liga, fecha inicio y fin son obligatorios.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        league_id: form.league_id,
        type: form.type,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        max_participants: form.max_participants ? parseInt(form.max_participants) : null,
        special_predictions_enabled: form.special_predictions_enabled,
        scoring_rules: MASTER_SPORTS_SCORE_RULES,
      };
      if (form.type === 'private' && form.access_code) payload.access_code = form.access_code;
      if (form.special_predictions_enabled) {
        payload.champion_points = parseInt(form.champion_points) || 0;
        payload.runner_up_points = parseInt(form.runner_up_points) || 0;
        payload.third_place_points = parseInt(form.third_place_points) || 0;
      }
      const res = await tournamentService.createTournament(payload);
      const created = res.data?.data;

      if (selectedBanner && created?.id) {
        try {
          await uploadBannerForTournament(created.id, selectedBanner);
        } catch (uploadError) {
          console.error('Error uploading banner:', uploadError);
        }
      }

      setShowCreate(false);
      resetForm();
      await loadData();
      setStatusModal({
        visible: true, type: 'success', title: 'Torneo creado',
        message: created?.type === 'private'
          ? `Código de acceso: ${created.access_code}`
          : 'Torneo público creado correctamente.',
      });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.message || 'No se pudo crear el torneo' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (tournament, newStatus) => {
    try {
      await tournamentService.updateStatus(tournament.id, { status: newStatus });
      await loadData();
      if (selected?.id === tournament.id) {
        setSelected(prev => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: 'No se pudo actualizar el estado' });
    }
  };

  const openTournamentDetail = (t) => {
    setSelected(t);
    setDetailBanner(null);
  };

  const handleSaveDetailBanner = async () => {
    if (!selected?.id || !detailBanner) return;
    setUploadingBanner(true);
    try {
      const res = await uploadBannerForTournament(selected.id, detailBanner);
      const image = res?.data?.image || res?.data?.tournament?.image;
      await loadData();
      if (image) {
        setSelected((prev) => ({ ...prev, image }));
      }
      setDetailBanner(null);
      setStatusModal({ visible: true, type: 'success', title: 'Banner actualizado', message: 'El banner del torneo se guardó correctamente.' });
    } catch (err) {
      const message = err.message || 'No se pudo subir el banner';
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: message.includes('Route not found') || message.includes('404')
          ? 'El servidor no tiene la ruta de banner activa. Reinicia el backend (docker compose restart backend).'
          : message,
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    if (!selected?.id) return;
    setUploadingBanner(true);
    try {
      await tournamentService.deleteTournamentBanner(selected.id);
      await loadData();
      setSelected((prev) => ({ ...prev, image: null }));
      setDetailBanner(null);
      setStatusModal({ visible: true, type: 'success', title: 'Banner eliminado', message: 'El torneo ya no tiene banner.' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: 'No se pudo eliminar el banner' });
    } finally {
      setUploadingBanner(false);
    }
  };

  const renderBannerPicker = (imageUri, onPick, onClear, label = 'Banner del torneo') => (
    <View style={styles.bannerSection}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.bannerHint}>Imagen horizontal recomendada 16:9. Se mostrará en la lista de torneos.</Text>
      <TouchableOpacity style={styles.bannerPicker} onPress={onPick} activeOpacity={0.85}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.bannerPreview} resizeMode="cover" />
        ) : (
          <View style={styles.bannerPlaceholder}>
            <Ionicons name="image-outline" size={28} color={COLORS.primary} />
            <Text style={styles.bannerPlaceholderText}>Toca para elegir banner</Text>
          </View>
        )}
      </TouchableOpacity>
      {imageUri ? (
        <TouchableOpacity style={styles.bannerClearBtn} onPress={onClear}>
          <Ionicons name="trash-outline" size={14} color={COLORS.error} />
          <Text style={styles.bannerClearText}>Quitar imagen</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const renderTournamentCard = (t) => (
    <TouchableOpacity key={t.id} style={styles.card} onPress={() => openTournamentDetail(t)} activeOpacity={0.8}>
      {t.image ? (
        <Image source={{ uri: getBannerUri(t.image) }} style={styles.cardBannerThumb} resizeMode="cover" />
      ) : null}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{t.name}</Text>
          <Text style={styles.cardSub}>{t.league?.name || 'Sin liga'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[t.status] || COLORS.primary) + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[t.status] || COLORS.primary }]}>{t.status}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name={t.type === 'private' ? 'lock-closed' : 'earth'} size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{t.type === 'private' ? 'Privada' : 'Pública'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="people" size={14} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{t.total_participants || 0}</Text>
        </View>
        {t.type === 'private' && t.access_code && (
          <View style={styles.codeChip}>
            <Text style={styles.codeChipText}>{t.access_code}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <AdminHeader title="Torneos / Pollas" subtitle="Gestión de competiciones" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.primary} />}
      >
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Ionicons name="add-circle" size={22} color="#005d2c" />
          <Text style={styles.createBtnText}>Crear Torneo</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : tournaments.length === 0 ? (
          <Text style={styles.empty}>No hay torneos creados</Text>
        ) : (
          tournaments.map(renderTournamentCard)
        )}
      </ScrollView>

      {/* Detalle torneo */}
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selected?.name}</Text>
                <TouchableOpacity onPress={() => { setSelected(null); setDetailBanner(null); }}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {renderBannerPicker(
                detailBanner || getBannerUri(selected?.image),
                () => pickBannerImage('detail'),
                () => (detailBanner ? setDetailBanner(null) : handleRemoveBanner()),
                'Banner del torneo'
              )}

              {detailBanner ? (
                <TouchableOpacity
                  style={styles.saveBannerBtn}
                  onPress={handleSaveDetailBanner}
                  disabled={uploadingBanner}
                >
                  {uploadingBanner ? (
                    <ActivityIndicator color="#005d2c" />
                  ) : (
                    <Text style={styles.saveBannerBtnText}>Guardar banner</Text>
                  )}
                </TouchableOpacity>
              ) : null}

              {selected?.type === 'private' && (
                <LinearGradient colors={['#ff990022', '#ff990008']} style={styles.codeBox}>
                  <Text style={styles.codeLabel}>CÓDIGO DE ACCESO</Text>
                  <Text style={styles.codeValue}>{selected.access_code}</Text>
                  <Text style={styles.codeHint}>Comparte este código con los participantes</Text>
                </LinearGradient>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Estado</Text>
                <View style={styles.statusRow}>
                  {['upcoming', 'active', 'finished'].map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusBtn, selected?.status === s && styles.statusBtnActive]}
                      onPress={() => handleStatusChange(selected, s)}
                    >
                      <Text style={[styles.statusBtnText, selected?.status === s && styles.statusBtnTextActive]}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.detailGrid}>
                <Text style={styles.detailItem}>Tipo: {selected?.type}</Text>
                <Text style={styles.detailItem}>Participantes: {selected?.total_participants}</Text>
                <Text style={styles.detailItem}>Liga: {selected?.league?.name}</Text>
                <Text style={styles.detailItem}>Menciones: {selected?.special_predictions_enabled ? 'Sí' : 'No'}</Text>
                {selected?.special_predictions_enabled && (
                  <Text style={styles.detailItem}>
                    Puntos podio: {selected.champion_points}/{selected.runner_up_points}/{selected.third_place_points}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { setSelected(null); navigation.navigate('TournamentParticipants', { tournamentId: selected.id, tournamentName: selected.name }); }}
              >
                <Ionicons name="people" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Ver participantes</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { setSelected(null); navigation.navigate('TournamentHome', { tournamentId: selected.id }); }}
              >
                <Ionicons name="eye" size={18} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Vista jugador</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Crear torneo */}
      <Modal visible={showCreate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Nuevo Torneo</Text>
                <TouchableOpacity onPress={() => { setShowCreate(false); resetForm(); }}>
                  <Ionicons name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              {[
                { key: 'name', label: 'Nombre *', placeholder: 'Ej: Polla La Liga' },
                { key: 'description', label: 'Descripción', placeholder: 'Opcional' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              ))}

              <Text style={styles.fieldLabel}>Liga *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {leagues.map(l => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.chip, form.league_id === l.id && styles.chipActive]}
                    onPress={() => setForm(p => ({ ...p, league_id: l.id }))}
                  >
                    <Text style={[styles.chipText, form.league_id === l.id && styles.chipTextActive]}>{l.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Tipo</Text>
              <View style={styles.typeRow}>
                {['public', 'private'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, form.type === t && styles.typeBtnActive]}
                    onPress={() => setForm(p => ({ ...p, type: t }))}
                  >
                    <Ionicons name={t === 'private' ? 'lock-closed' : 'earth'} size={16} color={form.type === t ? '#005d2c' : COLORS.white} />
                    <Text style={[styles.typeBtnText, form.type === t && styles.typeBtnTextActive]}>{t === 'public' ? 'Pública' : 'Privada'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {form.type === 'private' && (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Código (opcional, se genera si vacío)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.access_code}
                    onChangeText={v => setForm(p => ({ ...p, access_code: v.toUpperCase() }))}
                    placeholder="ABC123"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {renderBannerPicker(
                selectedBanner,
                () => pickBannerImage('create'),
                () => setSelectedBanner(null)
              )}

              {[
                { key: 'start_date', label: 'Inicio (YYYY-MM-DD) *' },
                { key: 'end_date', label: 'Fin (YYYY-MM-DD) *' },
                { key: 'max_participants', label: 'Máx. participantes (vacío = sin límite)' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholderTextColor={COLORS.textSecondary}
                  />
                </View>
              ))}

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Menciones especiales (podio)</Text>
                <Switch
                  value={form.special_predictions_enabled}
                  onValueChange={v => setForm(p => ({ ...p, special_predictions_enabled: v }))}
                  trackColor={{ true: COLORS.primary }}
                />
              </View>

              {form.special_predictions_enabled && (
                <View style={styles.pointsRow}>
                  {[
                    { key: 'champion_points', label: 'Campeón' },
                    { key: 'runner_up_points', label: 'Sub' },
                    { key: 'third_place_points', label: '3ro' },
                  ].map(f => (
                    <View key={f.key} style={styles.pointField}>
                      <Text style={styles.pointLabel}>{f.label}</Text>
                      <TextInput
                        style={styles.pointInput}
                        value={form[f.key]}
                        onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreate} disabled={saving}>
                {saving ? <ActivityIndicator color="#005d2c" /> : <Text style={styles.saveBtnText}>Crear Torneo</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal(p => ({ ...p, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e14' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, marginBottom: 16,
  },
  createBtnText: { color: '#005d2c', fontWeight: '700', fontSize: 15 },
  empty: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 40 },
  card: { backgroundColor: '#0f141a', borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  cardBannerThumb: { width: '100%', height: 90 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, padding: 16, paddingBottom: 0 },
  cardTitle: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  cardSub: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: 16, paddingTop: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  codeChip: { backgroundColor: '#ff990022', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  codeChipText: { color: '#ff9900', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0f141a', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: COLORS.white, fontSize: 18, fontWeight: '700', flex: 1 },
  codeBox: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ff990044' },
  codeLabel: { color: '#ff9900', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  codeValue: { color: COLORS.white, fontSize: 28, fontWeight: 'bold', letterSpacing: 4, marginVertical: 4 },
  codeHint: { color: COLORS.textSecondary, fontSize: 11 },
  detailSection: { marginBottom: 16 },
  detailLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#1b2028' },
  statusBtnActive: { backgroundColor: COLORS.primary },
  statusBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  statusBtnTextActive: { color: '#005d2c' },
  detailGrid: { gap: 6, marginBottom: 16 },
  detailItem: { color: COLORS.textSecondary, fontSize: 13 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1b2028', padding: 14, borderRadius: 12, marginBottom: 8,
  },
  actionBtnText: { color: COLORS.white, fontWeight: '600' },
  field: { marginBottom: 12 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#1b2028', borderRadius: 10, padding: 12,
    color: COLORS.white, fontSize: 14,
  },
  chipScroll: { marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1b2028', marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { color: COLORS.textSecondary, fontSize: 13 },
  chipTextActive: { color: '#005d2c', fontWeight: '700' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderRadius: 10, backgroundColor: '#1b2028',
  },
  typeBtnActive: { backgroundColor: COLORS.primary },
  typeBtnText: { color: COLORS.white, fontWeight: '600' },
  typeBtnTextActive: { color: '#005d2c' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pointsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pointField: { flex: 1 },
  pointLabel: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 4 },
  pointInput: { backgroundColor: '#1b2028', borderRadius: 8, padding: 10, color: COLORS.white, textAlign: 'center' },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#005d2c', fontWeight: '700', fontSize: 15 },
  bannerSection: { marginBottom: 14 },
  bannerHint: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 8, lineHeight: 16 },
  bannerPicker: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    backgroundColor: '#1b2028',
  },
  bannerPreview: { width: '100%', height: 140 },
  bannerPlaceholder: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bannerPlaceholderText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  bannerClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${COLORS.error}12`,
  },
  bannerClearText: { color: COLORS.error, fontSize: 12, fontWeight: '600' },
  saveBannerBtn: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  saveBannerBtnText: { color: '#005d2c', fontWeight: '700', fontSize: 14 },
});

export default TournamentManagement;
