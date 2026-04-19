import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusModal from '../../components/StatusModal';
import { sportService, leagueService } from '../../services';
import { useAuth } from '../../context/AuthContext';

const LeagueManagement = ({ navigation }) => {
  const { token } = useAuth();
  const [leagues, setLeagues] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState(null);

  // Status Modal
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    country: '',
    season: '',
    sport_id: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sportsData, leaguesData] = await Promise.all([
        sportService.getAllSports(),
        leagueService.getAllLeagues(),
      ]);

      if (sportsData.data?.sports) setSports(sportsData.data.sports);
      if (leaguesData.data?.leagues) setLeagues(leaguesData.data.leagues);
    } catch (error) {
      console.error('Error fetching data:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los datos',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateLeague = async () => {
    if (!formData.name || !formData.sport_id || !formData.season) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Campos Requeridos',
        message: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await leagueService.createLeague(formData);
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Éxito!',
        message: data.message || 'Liga creada correctamente',
      });
      resetForm();
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating league:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo crear la liga',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLeague = async () => {
    if (!formData.name || !formData.sport_id || !formData.season) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Campos Requeridos',
        message: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    setLoading(true);
    try {
      const data = await leagueService.updateLeague(selectedLeague.id, formData);
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Actualizado!',
        message: data.message || 'Liga actualizada correctamente',
      });
      resetForm();
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating league:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo actualizar la liga',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLeague = async () => {
    setLoading(true);
    try {
      const data = await leagueService.deleteLeague(selectedLeague.id);
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Eliminado!',
        message: data.message || 'Liga eliminada correctamente',
      });
      setShowDeleteModal(false);
      setSelectedLeague(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting league:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo eliminar la liga',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (league) => {
    setSelectedLeague(league);
    setFormData({
      name: league.name,
      country: league.country || '',
      season: league.season,
      sport_id: league.sport_id,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (league) => {
    setSelectedLeague(league);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      country: '',
      season: '',
      sport_id: '',
    });
    setSelectedLeague(null);
  };

  const filteredLeagues = leagues.filter(league => 
    league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    league.country?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    league.season.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <AdminHeader 
        title="Gestión de Ligas"
        subtitle="Administrar torneos y competiciones"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons 
            name="search" 
            size={18} 
            color={`${COLORS.primary}60`} 
            style={styles.searchIcon} 
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar liga, país o temporada..."
            placeholderTextColor={`${COLORS.white}40`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{leagues.length}</Text>
            <Text style={styles.statLabel}>LIGAS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{sports.length}</Text>
            <Text style={styles.statLabel}>DEPORTES</Text>
          </View>
        </View>

        {/* Leagues List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIGAS REGISTRADAS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filteredLeagues.length}</Text>
            </View>
          </View>

          {filteredLeagues.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={60} color={`${COLORS.primary}40`} />
              <Text style={styles.emptyStateText}>No hay ligas registradas</Text>
            </View>
          ) : (
            filteredLeagues.map((league) => (
              <View key={league.id} style={styles.leagueCard}>
                <View style={styles.leagueContent}>
                  <View style={styles.leagueLeft}>
                    <View style={styles.leagueIcon}>
                      <Ionicons name="trophy" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.leagueInfo}>
                      <Text style={styles.leagueName}>{league.name}</Text>
                      <View style={styles.leagueMeta}>
                        <Text style={styles.leagueSeason}>{league.season}</Text>
                        {league.country && (
                          <>
                            <Text style={styles.separator}>•</Text>
                            <Text style={styles.leagueCountry}>{league.country}</Text>
                          </>
                        )}
                        {league.sport && (
                          <>
                            <Text style={styles.separator}>•</Text>
                            <Text style={styles.sportName}>{league.sport.name}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.leagueActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => openEditModal(league)}
                    >
                      <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => openDeleteModal(league)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.errorLight} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={openCreateModal}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={COLORS.backgroundDark} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NUEVA LIGA</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>INFORMACIÓN BÁSICA</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre de la Liga *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej: UEFA Champions League"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Temporada *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej: 2024-2025"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.season}
                    onChangeText={(text) => setFormData({ ...formData, season: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>País (opcional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej: Europa"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.country}
                    onChangeText={(text) => setFormData({ ...formData, country: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Deporte *</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.sportScroll}
                  >
                    {sports.map((sport) => (
                      <TouchableOpacity
                        key={sport.id}
                        style={[
                          styles.sportOption,
                          formData.sport_id === sport.id && styles.sportOptionActive
                        ]}
                        onPress={() => setFormData({ ...formData, sport_id: sport.id })}
                      >
                        <Ionicons 
                          name={sport.icon || 'trophy'} 
                          size={18} 
                          color={formData.sport_id === sport.id ? COLORS.backgroundDark : COLORS.primary} 
                        />
                        <Text style={[
                          styles.sportOptionText,
                          formData.sport_id === sport.id && styles.sportOptionTextActive
                        ]}>
                          {sport.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleCreateLeague}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'CREANDO...' : 'CREAR LIGA'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDITAR LIGA</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>INFORMACIÓN BÁSICA</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre de la Liga *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej: UEFA Champions League"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Temporada *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej: 2024-2025"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.season}
                    onChangeText={(text) => setFormData({ ...formData, season: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>País (opcional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej: Europa"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.country}
                    onChangeText={(text) => setFormData({ ...formData, country: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Deporte *</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.sportScroll}
                  >
                    {sports.map((sport) => (
                      <TouchableOpacity
                        key={sport.id}
                        style={[
                          styles.sportOption,
                          formData.sport_id === sport.id && styles.sportOptionActive
                        ]}
                        onPress={() => setFormData({ ...formData, sport_id: sport.id })}
                      >
                        <Ionicons 
                          name={sport.icon || 'trophy'} 
                          size={18} 
                          color={formData.sport_id === sport.id ? COLORS.backgroundDark : COLORS.primary} 
                        />
                        <Text style={[
                          styles.sportOptionText,
                          formData.sport_id === sport.id && styles.sportOptionTextActive
                        ]}>
                          {sport.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleUpdateLeague}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowDeleteModal(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={40} color={COLORS.errorLight} />
            </View>

            <Text style={styles.deleteTitle}>¿Eliminar Liga?</Text>
            <Text style={styles.deleteMessage}>
              Esta acción no se puede deshacer. Todos los datos asociados a esta liga se perderán permanentemente.
            </Text>

            {selectedLeague && (
              <View style={styles.deleteLeagueCard}>
                <View style={styles.deleteLeagueIcon}>
                  <Ionicons name="trophy" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.deleteLeagueInfo}>
                  <Text style={styles.deleteLeagueName}>{selectedLeague.name}</Text>
                  <Text style={styles.deleteLeagueSeason}>{selectedLeague.season}</Text>
                </View>
              </View>
            )}

            <View style={styles.deleteActions}>
              <TouchableOpacity 
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.deleteConfirmButton}
                onPress={handleDeleteLeague}
                disabled={loading}
              >
                <Text style={styles.deleteConfirmText}>
                  {loading ? 'ELIMINANDO...' : 'ELIMINAR'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  searchContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  searchInput: {
    backgroundColor: `${COLORS.primary}08`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 12,
    paddingLeft: 48,
    paddingRight: 16,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statBox: {
    flex: 1,
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: `${COLORS.primary}80`,
    letterSpacing: 1.2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: `${COLORS.primary}80`,
    letterSpacing: 1.5,
  },
  countBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  leagueCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  leagueContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leagueLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  leagueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueInfo: {
    flex: 1,
  },
  leagueName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  leagueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  leagueSeason: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  separator: {
    fontSize: 12,
    color: `${COLORS.white}40`,
  },
  leagueCountry: {
    fontSize: 12,
    color: `${COLORS.white}70`,
  },
  sportName: {
    fontSize: 12,
    color: `${COLORS.white}70`,
  },
  leagueActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  modalBody: {
    padding: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
    gap: 8,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    marginLeft: 2,
  },
  formInput: {
    backgroundColor: '#1a1f28',
    borderWidth: 1,
    borderColor: 'rgba(168, 171, 179, 0.2)',
    borderRadius: 12,
    padding: 14,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  sportScroll: {
    marginHorizontal: -4,
  },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    marginHorizontal: 4,
  },
  sportOptionActive: {
    backgroundColor: COLORS.primary,
  },
  sportOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sportOptionTextActive: {
    color: COLORS.backgroundDark,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1.2,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 1.2,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 32,
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(215, 56, 59, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  deleteTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteMessage: {
    fontSize: 15,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteLeagueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  deleteLeagueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLeagueInfo: {
    flex: 1,
  },
  deleteLeagueName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  deleteLeagueSeason: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(32, 38, 47, 0.8)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  deleteCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  deleteConfirmButton: {
    flex: 1,
    backgroundColor: COLORS.errorLight,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  deleteConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default LeagueManagement;
