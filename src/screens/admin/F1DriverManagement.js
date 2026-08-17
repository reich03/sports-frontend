import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, RefreshControl,
  Modal, Image, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminCard from '../../components/admin/AdminCard';
import StatusModal from '../../components/StatusModal';
import { driverService, teamService, sportService } from '../../services';
import { BASE_URL } from '../../constants/config';

const PAGE_SIZE = 15;

const getPhotoUri = (photo) => {
  if (!photo) return null;
  if (photo.startsWith('file://') || photo.startsWith('http')) return photo;
  return `${BASE_URL}${photo}`;
};

const F1DriverManagement = ({ navigation }) => {
  const { width: screenWidth } = useWindowDimensions();
  const dialogWidth = Math.min(screenWidth - 32, 460);

  const [drivers, setDrivers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '' });
  const [selectedImage, setSelectedImage] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    nationality: '',
    number: '',
    team_id: '',
    sport_id: '',
  });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [d, t, s] = await Promise.all([
        driverService.getAllDrivers(),
        teamService.getAllTeams(),
        sportService.getAllSports(),
      ]);
      if (d.data?.drivers) setDrivers(d.data.drivers);
      if (t.data?.teams) setTeams(t.data.teams);
      if (s.data?.sports) setSports(s.data.sports);
    } catch (err) {
      console.error('Error cargando pilotos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const f1Sport = useMemo(() => sports.find((s) => s.code === 'f1'), [sports]);

  const teamsForSport = useMemo(() => {
    const sportId = formData.sport_id || f1Sport?.id;
    if (!sportId) return teams;
    return teams.filter((t) => t.sport_id === sportId);
  }, [teams, formData.sport_id, f1Sport]);

  const filteredDrivers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return drivers.filter((d) => {
      if (!q) return true;
      return (
        d.name?.toLowerCase().includes(q) ||
        d.short_name?.toLowerCase().includes(q) ||
        d.nationality?.toLowerCase().includes(q) ||
        (d.number && String(d.number).includes(q)) ||
        d.team?.name?.toLowerCase().includes(q)
      );
    });
  }, [drivers, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredDrivers.length / PAGE_SIZE));
  const paginatedDrivers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredDrivers.slice(start, start + PAGE_SIZE);
  }, [filteredDrivers, currentPage]);

  useEffect(() => setCurrentPage(1), [searchQuery]);

  const resetForm = () => {
    setFormData({
      name: '',
      short_name: '',
      nationality: '',
      number: '',
      team_id: '',
      sport_id: f1Sport?.id || '',
    });
    setSelectedImage(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEdit = (driver) => {
    setSelectedDriver(driver);
    setFormData({
      name: driver.name || '',
      short_name: driver.short_name || '',
      nationality: driver.nationality || '',
      number: driver.number != null ? String(driver.number) : '',
      team_id: driver.team_id || '',
      sport_id: driver.sport_id || '',
    });
    setSelectedImage(getPhotoUri(driver.photo));
    setShowEditModal(true);
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    short_name: formData.short_name.trim().toUpperCase() || null,
    nationality: formData.nationality.trim() || null,
    number: formData.number ? parseInt(formData.number, 10) : null,
    team_id: formData.team_id || null,
    sport_id: formData.sport_id || f1Sport?.id,
  });

  const handleCreate = async () => {
    if (!formData.name || !(formData.sport_id || f1Sport?.id)) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: 'Nombre y deporte son obligatorios' });
      return;
    }
    try {
      setLoading(true);
      const res = await driverService.createDriver(buildPayload());
      const created = res.data.driver;
      if (selectedImage && selectedImage.startsWith('file://')) {
        try { await driverService.uploadDriverPhoto(created.id, selectedImage); } catch (e) { console.error(e); }
      }
      setShowCreateModal(false);
      resetForm();
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: '¡Piloto creado!', message: 'El piloto se ha creado correctamente' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo crear el piloto' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedDriver) return;
    if (!formData.name) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: 'El nombre es obligatorio' });
      return;
    }
    try {
      setLoading(true);
      await driverService.updateDriver(selectedDriver.id, buildPayload());
      if (selectedImage && selectedImage.startsWith('file://')) {
        try { await driverService.uploadDriverPhoto(selectedDriver.id, selectedImage); } catch (e) { console.error(e); }
      }
      setShowEditModal(false);
      setSelectedDriver(null);
      resetForm();
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: '¡Actualizado!', message: 'Piloto actualizado' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo actualizar' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDriver) return;
    try {
      await driverService.deleteDriver(selectedDriver.id);
      setShowDeleteModal(false);
      setSelectedDriver(null);
      fetchAll();
      setStatusModal({ visible: true, type: 'success', title: 'Eliminado', message: 'Piloto eliminado' });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: 'Error', message: err.response?.data?.error?.message || 'No se pudo eliminar' });
    }
  };

  const renderFormFields = () => (
    <>
      <View style={styles.photoSection}>
        <TouchableOpacity style={styles.photoBox} onPress={pickImage}>
          {selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.photoPreview} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={30} color={COLORS.primary} />
              <Text style={styles.photoText}>Toca para subir foto</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
          <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primary} />
          <Text style={styles.uploadBtnText}>{selectedImage ? 'Cambiar foto' : 'Seleccionar foto'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nombre completo *</Text>
        <TextInput
          style={styles.input}
          placeholder="Max Verstappen"
          placeholderTextColor={`${COLORS.white}40`}
          value={formData.name}
          onChangeText={(t) => setFormData({ ...formData, name: t })}
        />
      </View>

      <View style={styles.formRow}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Código</Text>
          <TextInput
            style={[styles.input, styles.uppercase]}
            placeholder="VER"
            placeholderTextColor={`${COLORS.white}40`}
            value={formData.short_name}
            onChangeText={(t) => setFormData({ ...formData, short_name: t.toUpperCase() })}
            maxLength={5}
          />
        </View>
        <View style={styles.formGroupHalf}>
          <Text style={styles.label}>Dorsal</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor={`${COLORS.white}40`}
            value={formData.number}
            onChangeText={(t) => setFormData({ ...formData, number: t.replace(/[^0-9]/g, '') })}
            keyboardType="number-pad"
            maxLength={3}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Nacionalidad</Text>
        <TextInput
          style={styles.input}
          placeholder="Países Bajos"
          placeholderTextColor={`${COLORS.white}40`}
          value={formData.nationality}
          onChangeText={(t) => setFormData({ ...formData, nationality: t })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Escudería</Text>
        {teamsForSport.length === 0 ? (
          <Text style={styles.helperText}>No hay escuderías cargadas para F1. Créalas en "Equipos" primero.</Text>
        ) : (
          <View style={styles.chipsWrap}>
            <TouchableOpacity
              style={[styles.chip, !formData.team_id && styles.chipActive]}
              onPress={() => setFormData({ ...formData, team_id: '' })}
            >
              <Text style={[styles.chipText, !formData.team_id && styles.chipTextActive]}>Sin escudería</Text>
            </TouchableOpacity>
            {teamsForSport.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.chip, formData.team_id === t.id && styles.chipActive]}
                onPress={() => setFormData({ ...formData, team_id: t.id })}
              >
                <Ionicons name="shield" size={12} color={formData.team_id === t.id ? COLORS.backgroundDark : COLORS.primary} />
                <Text style={[styles.chipText, formData.team_id === t.id && styles.chipTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );

  const renderDriverCard = (driver) => (
    <AdminCard key={driver.id} variant="highlight" style={styles.driverCard}>
      <View style={styles.driverRow}>
        <View style={styles.driverLeft}>
          <View style={styles.avatar}>
            {driver.photo ? (
              <Image source={{ uri: getPhotoUri(driver.photo) }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={26} color={COLORS.primary} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              {driver.number != null && (
                <Text style={styles.driverNumber}>#{driver.number}</Text>
              )}
              <Text style={styles.driverName} numberOfLines={1}>{driver.name}</Text>
            </View>
            <View style={styles.metaRow}>
              {driver.short_name && <Text style={styles.driverCode}>{driver.short_name}</Text>}
              {driver.team?.name && (
                <>
                  <Text style={styles.sep}>•</Text>
                  <Text style={styles.metaText} numberOfLines={1}>{driver.team.name}</Text>
                </>
              )}
              {driver.nationality && (
                <>
                  <Text style={styles.sep}>•</Text>
                  <Text style={styles.metaText} numberOfLines={1}>{driver.nationality}</Text>
                </>
              )}
            </View>
          </View>
        </View>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(driver)}>
            <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => { setSelectedDriver(driver); setShowDeleteModal(true); }}>
            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </AdminCard>
  );

  return (
    <View style={styles.container}>
      <AdminHeader title="Pilotos F1" subtitle="Gestión de pilotos" onBack={() => navigation.goBack()} rightIcon="add" onRightPress={openCreate} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAll(); }} tintColor={COLORS.primary} />}
      >
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nombre, código, dorsal, escudería..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {loading && drivers.length === 0 ? (
          <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
        ) : paginatedDrivers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-sport-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No hay pilotos</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openCreate}>
              <Ionicons name="add" size={18} color={COLORS.backgroundDark} />
              <Text style={styles.emptyBtnText}>Añadir primer piloto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {paginatedDrivers.map(renderDriverCard)}
            {totalPages > 1 && (
              <View style={styles.pagination}>
                <TouchableOpacity disabled={currentPage === 1} style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]} onPress={() => setCurrentPage((p) => p - 1)}>
                  <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? COLORS.textSecondary : COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.pageText}>{currentPage} / {totalPages}</Text>
                <TouchableOpacity disabled={currentPage === totalPages} style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]} onPress={() => setCurrentPage((p) => p + 1)}>
                  <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? COLORS.textSecondary : COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB - Create Driver */}
      <TouchableOpacity style={styles.fab} onPress={openCreate} activeOpacity={0.85}>
        <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.fabGradient}>
          <Ionicons name="add" size={32} color={COLORS.backgroundDark} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: dialogWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo piloto</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 16 }}>
              {renderFormFields()}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
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
          <View style={[styles.modalCard, { width: dialogWidth }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar piloto</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); resetForm(); }}>
                <Ionicons name="close" size={22} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ padding: 16 }}>
              {renderFormFields()}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => { setShowEditModal(false); resetForm(); }}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
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
          <View style={[styles.modalCard, { width: Math.min(dialogWidth, 360) }]}>
            <View style={{ padding: 20, alignItems: 'center' }}>
              <View style={styles.warnIcon}>
                <Ionicons name="warning" size={30} color={COLORS.error} />
              </View>
              <Text style={styles.modalTitle}>Eliminar piloto</Text>
              <Text style={styles.deleteMessage}>
                ¿Seguro que quieres eliminar a {selectedDriver?.name}? Esta acción no se puede deshacer.
              </Text>
              <View style={[styles.modalActions, { marginTop: 16, width: '100%' }]}>
                <TouchableOpacity style={styles.btnCancel} onPress={() => setShowDeleteModal(false)}>
                  <Text style={styles.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnDanger} onPress={handleDelete}>
                  <Text style={styles.btnDangerText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
        onPrimaryPress={() => setStatusModal({ ...statusModal, visible: false })}
        primaryButtonText="Aceptar"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  scroll: { flex: 1 },
  center: { alignItems: 'center', padding: 40 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: `${COLORS.white}0d`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 14, borderWidth: 1, borderColor: `${COLORS.primary}22`,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14, padding: 0 },
  emptyState: { alignItems: 'center', padding: 32 },
  emptyText: { color: COLORS.textSecondary, fontSize: 15, marginTop: 12 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 16 },
  emptyBtnText: { color: COLORS.backgroundDark, fontWeight: '700', fontSize: 14 },
  driverCard: { marginBottom: 10, padding: 12 },
  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: `${COLORS.primary}22`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  driverNumber: { color: COLORS.primary, fontWeight: '900', fontSize: 15 },
  driverName: { color: COLORS.white, fontWeight: '700', fontSize: 15, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap' },
  driverCode: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  sep: { color: COLORS.textSecondary, marginHorizontal: 6, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: `${COLORS.white}0d`, alignItems: 'center', justifyContent: 'center' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 },
  pageBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: `${COLORS.primary}18`, alignItems: 'center', justifyContent: 'center' },
  pageBtnDisabled: { opacity: 0.4 },
  pageText: { color: COLORS.white, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#1a2f26', borderRadius: 20, overflow: 'hidden', maxHeight: '90%', borderWidth: 1, borderColor: `${COLORS.primary}33` },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,230,119,0.06)' },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  modalActions: { flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: `${COLORS.white}15` },
  btnCancel: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: `${COLORS.white}0d`, borderWidth: 1, borderColor: `${COLORS.white}20` },
  btnCancelText: { color: COLORS.white, fontWeight: '600' },
  btnPrimary: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.primary },
  btnPrimaryText: { color: COLORS.backgroundDark, fontWeight: '700' },
  btnDanger: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: COLORS.error },
  btnDangerText: { color: COLORS.white, fontWeight: '700' },
  photoSection: { alignItems: 'center', marginBottom: 20 },
  photoBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: `${COLORS.primary}18`, borderWidth: 1, borderColor: `${COLORS.primary}44`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderStyle: 'dashed' },
  photoPreview: { width: '100%', height: '100%' },
  photoText: { color: COLORS.primary, fontSize: 11, marginTop: 6, textAlign: 'center' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8 },
  uploadBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  formGroup: { marginBottom: 16 },
  formGroupHalf: { flex: 1 },
  formRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  label: { color: '#ffffff', fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#ffffff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  fab: { position: 'absolute', bottom: 32, right: 20, width: 60, height: 60, borderRadius: 30, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  fabGradient: { width: '100%', height: '100%', borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  uppercase: { letterSpacing: 1 },
  helperText: { color: COLORS.textSecondary, fontSize: 12, fontStyle: 'italic' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: `${COLORS.primary}12`, borderWidth: 1, borderColor: `${COLORS.primary}30` },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.backgroundDark },
  warnIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: `${COLORS.error}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  deleteMessage: { color: COLORS.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});

export default F1DriverManagement;
