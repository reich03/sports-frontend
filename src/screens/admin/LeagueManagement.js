import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusModal from '../../components/StatusModal';
import { sportService, leagueService } from '../../services';

const PAGE_SIZE = 12;

const LeagueManagement = ({ navigation }) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const dialogWidth = Math.min(screenWidth - 32, 420);
  const [leagues, setLeagues] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSportFilter, setSelectedSportFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
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

  const filteredLeagues = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leagues.filter(league => {
      const matchesSearch = !q
        || league.name?.toLowerCase().includes(q)
        || league.country?.toLowerCase().includes(q)
        || league.season?.toLowerCase().includes(q);
      const matchesSport = !selectedSportFilter || league.sport_id === selectedSportFilter;
      return matchesSearch && matchesSport;
    });
  }, [leagues, searchQuery, selectedSportFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeagues.length / PAGE_SIZE));
  const paginatedLeagues = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLeagues.slice(start, start + PAGE_SIZE);
  }, [filteredLeagues, currentPage]);

  const pageStart = filteredLeagues.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredLeagues.length);

  const sportCounts = useMemo(() => {
    const counts = {};
    leagues.forEach(l => {
      if (l.sport_id) counts[l.sport_id] = (counts[l.sport_id] || 0) + 1;
    });
    return counts;
  }, [leagues]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSportFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSportFilter('');
    setCurrentPage(1);
  };

  const renderLeagueFormFields = () => (
    <View style={styles.formSection}>
      <Text style={styles.formSectionTitle}>Información básica</Text>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Nombre de la liga *</Text>
        <TextInput
          style={styles.formInput}
          placeholder="UEFA Champions League"
          placeholderTextColor={`${COLORS.white}40`}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>

      <View style={styles.formRow}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.formLabel}>Temporada *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="2024-2025"
            placeholderTextColor={`${COLORS.white}40`}
            value={formData.season}
            onChangeText={(text) => setFormData({ ...formData, season: text })}
          />
        </View>
        <View style={styles.formGroupHalf}>
          <Text style={styles.formLabel}>País</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Europa"
            placeholderTextColor={`${COLORS.white}40`}
            value={formData.country}
            onChangeText={(text) => setFormData({ ...formData, country: text })}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Deporte *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
          {sports.map((sport) => (
            <TouchableOpacity
              key={sport.id}
              style={[styles.optionChip, formData.sport_id === sport.id && styles.optionChipActive]}
              onPress={() => setFormData({ ...formData, sport_id: sport.id })}
            >
              <Ionicons
                name={sport.icon || 'trophy'}
                size={16}
                color={formData.sport_id === sport.id ? COLORS.backgroundDark : COLORS.primary}
              />
              <Text style={[styles.optionText, formData.sport_id === sport.id && styles.optionTextActive]}>
                {sport.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderLeagueCard = (league) => (
    <View key={league.id} style={styles.leagueCard}>
      <View style={styles.leagueContent}>
        <View style={styles.leagueLeft}>
          <View style={styles.leagueIcon}>
            <Ionicons name="trophy" size={22} color={COLORS.primary} />
          </View>
          <View style={styles.leagueInfo}>
            <Text style={styles.leagueName} numberOfLines={1}>{league.name}</Text>
            <View style={styles.leagueMeta}>
              <Text style={styles.leagueSeason}>{league.season}</Text>
              {league.country ? (
                <>
                  <Text style={styles.separator}>•</Text>
                  <Text style={styles.leagueCountry} numberOfLines={1}>{league.country}</Text>
                </>
              ) : null}
              {league.sport ? (
                <>
                  <Text style={styles.separator}>•</Text>
                  <Text style={styles.sportName} numberOfLines={1}>{league.sport.name}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.leagueActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(league)}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteActionBtn]} onPress={() => openDeleteModal(league)}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
        <View style={styles.toolbarCard}>
          <Text style={styles.toolbarLabel}>Buscar ligas</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre, país o temporada..."
              placeholderTextColor={COLORS.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterHeader}>
            <Text style={styles.filterLabel}>Filtrar por deporte</Text>
            {(searchQuery || selectedSportFilter) ? (
              <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersBtn}>
                <Ionicons name="filter-outline" size={14} color={COLORS.error} />
                <Text style={styles.clearFiltersText}>Limpiar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsRow}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedSportFilter && styles.filterChipActive]}
              onPress={() => setSelectedSportFilter('')}
            >
              <Text style={[styles.filterChipText, !selectedSportFilter && styles.filterChipTextActive]}>
                Todas ({leagues.length})
              </Text>
            </TouchableOpacity>
            {sports.map(sport => (
              <TouchableOpacity
                key={sport.id}
                style={[styles.filterChip, selectedSportFilter === sport.id && styles.filterChipActive]}
                onPress={() => setSelectedSportFilter(sport.id)}
              >
                <Ionicons
                  name={sport.icon || 'trophy'}
                  size={14}
                  color={selectedSportFilter === sport.id ? COLORS.backgroundDark : COLORS.primary}
                />
                <Text style={[styles.filterChipText, selectedSportFilter === sport.id && styles.filterChipTextActive]}>
                  {sport.name} ({sportCounts[sport.id] || 0})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{filteredLeagues.length}</Text>
            <Text style={styles.statLabel}>FILTRADAS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{leagues.length}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{sports.length}</Text>
            <Text style={styles.statLabel}>DEPORTES</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>LIGAS REGISTRADAS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>
                {filteredLeagues.length === 0 ? '0' : `${pageStart}-${pageEnd}`} de {filteredLeagues.length}
              </Text>
            </View>
          </View>

          {loading && leagues.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.emptyStateText}>Cargando ligas...</Text>
            </View>
          ) : filteredLeagues.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={60} color={`${COLORS.primary}40`} />
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedSportFilter ? 'No hay ligas con estos filtros' : 'No hay ligas registradas'}
              </Text>
              {(searchQuery || selectedSportFilter) && (
                <TouchableOpacity style={styles.emptyActionBtn} onPress={clearFilters}>
                  <Text style={styles.emptyActionText}>Quitar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {paginatedLeagues.map(renderLeagueCard)}
              {totalPages > 1 && (
                <View style={styles.paginationBar}>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? COLORS.textSecondary : COLORS.white} />
                    <Text style={[styles.pageBtnText, currentPage === 1 && styles.pageBtnTextDisabled]}>Anterior</Text>
                  </TouchableOpacity>
                  <View style={styles.pageIndicator}>
                    <Text style={styles.pageIndicatorText}>{currentPage}</Text>
                    <Text style={styles.pageIndicatorSub}>de {totalPages}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                    onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <Text style={[styles.pageBtnText, currentPage === totalPages && styles.pageBtnTextDisabled]}>Siguiente</Text>
                    <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? COLORS.textSecondary : COLORS.white} />
                  </TouchableOpacity>
                </View>
              )}
            </>
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
        statusBarTranslucent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: screenHeight * 0.88 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva liga</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {renderLeagueFormFields()}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowCreateModal(false); resetForm(); }}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateLeague} disabled={loading}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>{loading ? 'Creando...' : 'Crear liga'}</Text>
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
        statusBarTranslucent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: screenHeight * 0.88 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar liga</Text>
              <TouchableOpacity onPress={() => { setShowEditModal(false); resetForm(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBodyScroll} contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
              {renderLeagueFormFields()}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowEditModal(false); resetForm(); }}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateLeague} disabled={loading}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.saveButtonGradient}>
                  <Text style={styles.saveButtonText}>{loading ? 'Guardando...' : 'Guardar cambios'}</Text>
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
        statusBarTranslucent
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogCard, { width: dialogWidth }]}>
            <View style={styles.dialogHeader}>
              <View style={styles.dialogHeaderLeft}>
                <View style={[styles.dialogIconWrap, { backgroundColor: `${COLORS.error}18` }]}>
                  <Ionicons name="warning" size={26} color={COLORS.errorLight} />
                </View>
                <Text style={styles.dialogTitle}>Eliminar liga</Text>
              </View>
              <TouchableOpacity style={styles.dialogCloseBtn} onPress={() => setShowDeleteModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.dialogMessage}>
              Esta acción no se puede deshacer. Se perderán jornadas y partidos asociados.
            </Text>
            {selectedLeague && (
              <View style={styles.dialogMatchCard}>
                <View style={styles.dialogLeagueIcon}>
                  <Ionicons name="trophy" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.dialogLeagueInfo}>
                  <Text style={styles.dialogLeagueName} numberOfLines={2}>{selectedLeague.name}</Text>
                  <Text style={styles.dialogLeagueSeason}>{selectedLeague.season}</Text>
                  {selectedLeague.sport?.name ? (
                    <Text style={styles.dialogLeagueSport}>{selectedLeague.sport.name}</Text>
                  ) : null}
                </View>
              </View>
            )}
            <View style={styles.dialogActions}>
              <TouchableOpacity style={styles.dialogBtnSecondary} onPress={() => setShowDeleteModal(false)}>
                <Text style={styles.dialogBtnSecondaryText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtnPrimary, { backgroundColor: COLORS.errorLight }]}
                onPress={handleDeleteLeague}
                disabled={loading}
              >
                <Text style={styles.dialogBtnPrimaryText}>{loading ? 'Eliminando...' : 'Eliminar'}</Text>
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
  toolbarCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  toolbarLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1f28',
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: COLORS.white,
    fontSize: 15,
    padding: 0,
    minHeight: 22,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${COLORS.error}12`,
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  filterChipsRow: { gap: 8, paddingRight: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  filterChipTextActive: {
    color: COLORS.backgroundDark,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: `${COLORS.primary}12`,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: `${COLORS.primary}80`,
    letterSpacing: 0.8,
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
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyActionBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}35`,
  },
  emptyActionText: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.primary}15`,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    minWidth: 100,
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.45,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  pageBtnTextDisabled: {
    color: COLORS.textSecondary,
  },
  pageIndicator: { alignItems: 'center' },
  pageIndicatorText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  pageIndicatorSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
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
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  leagueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leagueInfo: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 1,
  },
  leagueActions: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}12`,
  },
  deleteActionBtn: {
    backgroundColor: `${COLORS.error}12`,
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
    width: '100%',
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modalSheet: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  modalBodyScroll: { flexGrow: 0, flexShrink: 1 },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  formSection: { marginBottom: 8 },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 14,
  },
  formGroup: { marginBottom: 16, gap: 8 },
  formGroupHalf: { flex: 1, marginBottom: 0, gap: 8, minWidth: 0 },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '500',
  },
  optionScroll: { marginHorizontal: -4 },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    marginHorizontal: 4,
  },
  optionChipActive: { backgroundColor: COLORS.primary },
  optionText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  optionTextActive: { color: COLORS.backgroundDark },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 171, 179, 0.25)',
    backgroundColor: 'rgba(32, 38, 47, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.backgroundDark,
    textAlign: 'center',
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 20, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialogCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dialogHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  dialogIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    flex: 1,
  },
  dialogCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  dialogMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  dialogMatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  dialogLeagueIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogLeagueInfo: { flex: 1, minWidth: 0 },
  dialogLeagueName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  dialogLeagueSeason: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
  },
  dialogLeagueSport: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dialogBtnSecondary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 171, 179, 0.25)',
    backgroundColor: 'rgba(32, 38, 47, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dialogBtnPrimary: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
});

export default LeagueManagement;
