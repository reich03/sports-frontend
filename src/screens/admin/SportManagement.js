import React, { useState, useEffect } from 'react';
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
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminButton from '../../components/admin/AdminButton';
import AdminCard from '../../components/admin/AdminCard';
import StatusModal from '../../components/StatusModal';
import { sportService } from '../../services';
import { useAuth } from '../../context/AuthContext';

const SportManagement = ({ navigation }) => {
  const { token } = useAuth();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, rulesets

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSport, setSelectedSport] = useState(null);

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
    description: '',
    icon: 'football',
    scoring_type: 'score-based', // score-based, position-based
  });

  const sportIcons = [
    { name: 'football', icon: 'football-outline' },
    { name: 'basketball', icon: 'basketball-outline' },
    { name: 'tennis', icon: 'tennisball-outline' },
    { name: 'racing', icon: 'car-sport-outline' },
    { name: 'baseball', icon: 'baseball-outline' },
  ];

  useEffect(() => {
    fetchSports();
  }, []);

  const fetchSports = async () => {
    setLoading(true);
    try {
      const data = await sportService.getAllSports();
      if (data.data?.sports) {
        setSports(data.data.sports);
      }
    } catch (error) {
      console.error('Error fetching sports:', error);
      Alert.alert('Error', 'No se pudieron cargar los deportes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateSport = async () => {
    if (!formData.name) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Ingresa el nombre del deporte',
      });
      return;
    }

    try {
      // Generar código automáticamente desde el nombre
      const code = formData.name.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Mapear scoring_type a prediction_type del backend
      const prediction_type = formData.scoring_type === 'score-based' ? 'score' : formData.scoring_type === 'position-based' ? 'positions' : 'winner';
      
      // Preparar datos para backend según modelo Sport
      const sportData = {
        name: formData.name,
        code: code,
        icon: formData.icon,
        prediction_type: prediction_type,
        scoring_rules: {
          exact_score: 10,
          correct_winner: 5,
          correct_draw: 5,
          home_goal_bonus: 2,
          away_goal_bonus: 2
        }
      };

      const data = await sportService.createSport(sportData);
      setShowCreateModal(false);
      resetForm();
      fetchSports();
      
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Deporte Creado!',
        message: data.message || 'El deporte se ha creado correctamente',
      });
    } catch (error) {
      console.error('Error creating sport:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al Crear',
        message: error.response?.data?.error?.message || 'No se pudo crear el deporte',
      });
    }
  };

  const handleUpdateSport = async () => {
    if (!formData.name) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Ingresa el nombre del deporte',
      });
      return;
    }

    try {
      const code = formData.name.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const prediction_type = formData.scoring_type === 'score-based' ? 'score' : formData.scoring_type === 'position-based' ? 'positions' : 'winner';
      
      const sportData = {
        name: formData.name,
        code: code,
        icon: formData.icon,
        prediction_type: prediction_type,
        scoring_rules: {
          exact_score: 10,
          correct_winner: 5,
          correct_draw: 5,
          home_goal_bonus: 2,
          away_goal_bonus: 2
        }
      };

      const data = await sportService.updateSport(selectedSport.id, sportData);
      setShowEditModal(false);
      setSelectedSport(null);
      resetForm();
      fetchSports();
      
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Deporte Actualizado!',
        message: data.message || 'El deporte se ha actualizado correctamente',
      });
    } catch (error) {
      console.error('Error updating sport:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al Actualizar',
        message: error.response?.data?.error?.message || 'No se pudo actualizar el deporte',
      });
    }
  };

  const handleDeleteSport = async () => {
    try {
      if (!selectedSport) return;

      await sportService.deleteSport(selectedSport.id);
      setShowDeleteModal(false);
      setSelectedSport(null);
      fetchSports();
      
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Deporte Eliminado!',
        message: 'El deporte ha sido eliminado correctamente del sistema.',
      });
    } catch (error) {
      console.error('Error deleting sport:', error);
      setShowDeleteModal(false);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al Eliminar',
        message: error.response?.data?.error?.message || 'No se pudo eliminar el deporte',
      });
    }
  };

  const openEditModal = (sport) => {
    setSelectedSport(sport);
    const scoring_type = sport.prediction_type === 'score' ? 'score-based' : sport.prediction_type === 'positions' ? 'position-based' : 'score-based';
    setFormData({
      name: sport.name || '',
      description: '',
      icon: sport.icon || 'football',
      scoring_type: scoring_type,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (sport) => {
    setSelectedSport(sport);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'football',
      scoring_type: 'score-based',
    });
  };

  const filteredSports = sports.filter(sport => {
    if (!searchQuery) return filter === 'all';
    return sport.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <View style={styles.container}>
      <AdminHeader 
        title="Gestión de Deportes"
        subtitle="Disciplinas Activas"
        onBack={() => navigation.goBack()}
        rightIcon="add"
        onRightPress={openCreateModal}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchSports();
          }} />
        }
      >
        {/* Search & Filter */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={`${COLORS.primary}99`} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar deportes o categorías..."
            placeholderTextColor={`${COLORS.primary}60`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.filterTabs}>
          {['all', 'active', 'rulesets'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.filterTab,
                filter === tab && styles.filterTabActive
              ]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[
                styles.filterTabText,
                filter === tab && styles.filterTabTextActive
              ]}>
                {tab === 'all' ? 'Todos' : tab === 'active' ? 'Activos' : 'Reglas'} los Deportes
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sports List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>DISCIPLINAS ACTIVAS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{sports.length} Total</Text>
            </View>
          </View>

          {filteredSports.map((sport) => (
            <AdminCard key={sport.id} variant="highlight" style={styles.sportCard}>
              <View style={styles.sportContent}>
                <View style={styles.sportLeft}>
                  <View style={styles.sportIcon}>
                    <Ionicons name={sport.icon || 'football-outline'} size={28} color={COLORS.primary} />
                  </View>
                  <View>
                    <Text style={styles.sportName}>{sport.name}</Text>
                    <View style={styles.sportMeta}>
                      <View style={[
                        styles.typeBadge,
                        sport.prediction_type === 'positions' ? styles.typeBadgePosition : styles.typeBadgeScore
                      ]}>
                        <Text style={[
                          styles.typeBadgeText,
                          sport.prediction_type === 'positions' && styles.typeBadgeTextPosition
                        ]}>
                          {sport.prediction_type === 'positions' ? 'Por Posición' : 'Por Puntuación'}
                        </Text>
                      </View>
                      <Text style={styles.sportSubtext}>
                        {sport.prediction_type === 'positions' ? 'Podio/Ranking' : 'Goles/Puntos'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sportActions}>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => openEditModal(sport)}
                  >
                    <Ionicons name="create-outline" size={20} color={`${COLORS.primary}99`} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.iconButton}
                    onPress={() => openDeleteModal(sport)}
                  >
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </AdminCard>
          ))}
        </View>

        {/* Scoring Config */}
        <AdminCard variant="primary" style={styles.configCard}>
          <View style={styles.configHeader}>
            <View>
              <Text style={styles.configTitle}>Lógica de Puntuación Global</Text>
              <Text style={styles.configSubtitle}>
                Define cómo se calculan los puntos en la plataforma. Por defecto: Reglas Mixtas.
              </Text>
            </View>
            <Ionicons name="settings-outline" size={48} color={`${COLORS.primary}20`} style={styles.configIcon} />
          </View>

          <View style={styles.configChips}>
            <View style={styles.configChip}>
              <View style={styles.configCheck}>
                <Ionicons name="checkmark" size={12} color={COLORS.backgroundDark} />
              </View>
              <Text style={styles.configChipText}>Ponderado por Puntuación</Text>
            </View>
            <View style={styles.configChip}>
              <View style={styles.configCheck}>
                <Ionicons name="checkmark" size={12} color={COLORS.backgroundDark} />
              </View>
              <Text style={styles.configChipText}>Reducción por Posición</Text>
            </View>
          </View>

          <AdminButton
            title="Configurar Motor de Puntuación"
            variant="outline"
            onPress={() => {
              setStatusModal({
                visible: true,
                type: 'info',
                title: 'Próximamente',
                message: 'Configuración de puntuación disponible próximamente',
              });
            }}
            style={{ marginTop: 16 }}
          />
        </AdminCard>
      </ScrollView>

      {/* FAB - Create Sport */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color={COLORS.backgroundDark} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Sport Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Nuevo Deporte</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Información Básica</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre del Deporte</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="ej. Fútbol, Baloncesto"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Descripción (opcional)</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Descripción breve..."
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Icono</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                    {sportIcons.map((item) => (
                      <TouchableOpacity
                        key={item.name}
                        style={[
                          styles.iconOption,
                          formData.icon === item.name && styles.iconOptionActive
                        ]}
                        onPress={() => setFormData({ ...formData, icon: item.name })}
                      >
                        <Ionicons 
                          name={item.icon} 
                          size={24} 
                          color={formData.icon === item.name ? COLORS.backgroundDark : COLORS.primary} 
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tipo de Puntuación</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        formData.scoring_type === 'score-based' && styles.radioOptionActive
                      ]}
                      onPress={() => setFormData({ ...formData, scoring_type: 'score-based' })}
                    >
                      <Text style={[
                        styles.radioText,
                        formData.scoring_type === 'score-based' && styles.radioTextActive
                      ]}>
                        Por Puntuación
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        formData.scoring_type === 'position-based' && styles.radioOptionActive
                      ]}
                      onPress={() => setFormData({ ...formData, scoring_type: 'position-based' })}
                    >
                      <Text style={[
                        styles.radioText,
                        formData.scoring_type === 'position-based' && styles.radioTextActive
                      ]}>
                        Por Posición
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateSport}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>CREAR DEPORTE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Sport Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Deporte</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Información Básica</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre del Deporte</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="ej. Fútbol, Baloncesto"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Descripción (opcional)</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Descripción breve..."
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Icono</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
                    {sportIcons.map((item) => (
                      <TouchableOpacity
                        key={item.name}
                        style={[
                          styles.iconOption,
                          formData.icon === item.name && styles.iconOptionActive
                        ]}
                        onPress={() => setFormData({ ...formData, icon: item.name })}
                      >
                        <Ionicons 
                          name={item.icon} 
                          size={24} 
                          color={formData.icon === item.name ? COLORS.backgroundDark : COLORS.primary} 
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Tipo de Puntuación</Text>
                  <View style={styles.radioGroup}>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        formData.scoring_type === 'score-based' && styles.radioOptionActive
                      ]}
                      onPress={() => setFormData({ ...formData, scoring_type: 'score-based' })}
                    >
                      <Text style={[
                        styles.radioText,
                        formData.scoring_type === 'score-based' && styles.radioTextActive
                      ]}>
                        Por Puntuación
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.radioOption,
                        formData.scoring_type === 'position-based' && styles.radioOptionActive
                      ]}
                      onPress={() => setFormData({ ...formData, scoring_type: 'position-based' })}
                    >
                      <Text style={[
                        styles.radioText,
                        formData.scoring_type === 'position-based' && styles.radioTextActive
                      ]}>
                        Por Posición
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>CANCELAR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateSport}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>GUARDAR CAMBIOS</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
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
              <Ionicons name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.deleteIconContainer}>
              <Ionicons name="warning" size={48} color={COLORS.error} />
            </View>

            <Text style={styles.deleteTitle}>Confirmar Eliminación</Text>
            <Text style={styles.deleteMessage}>
              ¿Estás seguro de que deseas eliminar este deporte? Esta acción es irreversible y eliminará todas las configuraciones asociadas.
            </Text>

            {selectedSport && (
              <View style={styles.deleteSportCard}>
                <View style={styles.deleteSportIcon}>
                  <Ionicons 
                    name={selectedSport.icon || 'football-outline'} 
                    size={32} 
                    color={COLORS.primary} 
                  />
                </View>
                <View style={styles.deleteSportInfo}>
                  <Text style={styles.deleteSportName}>
                    {selectedSport.name || 'Sin nombre'}
                  </Text>
                  <Text style={styles.deleteSportType}>
                    {selectedSport.prediction_type === 'positions' ? 'Por Posición' : 'Por Puntuación'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.deleteCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={handleDeleteSport}
              >
                <Text style={styles.deleteConfirmText}>Eliminar</Text>
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
  filterTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}20`,
    marginBottom: 16,
    gap: 24,
  },
  filterTab: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: `${COLORS.white}60`,
  },
  filterTabTextActive: {
    color: COLORS.primary,
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
  sportCard: {
    marginBottom: 12,
  },
  sportContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  sportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sportName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  sportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeScore: {
    backgroundColor: `${COLORS.primary}20`,
  },
  typeBadgePosition: {
    backgroundColor: '#3b82f620',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  typeBadgeTextPosition: {
    color: '#3b82f6',
  },
  sportSubtext: {
    fontSize: 11,
    color: `${COLORS.white}60`,
  },
  sportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 8,
  },
  configCard: {
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  configIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  configSubtitle: {
    fontSize: 13,
    color: `${COLORS.white}80`,
    marginTop: 4,
    maxWidth: '80%',
  },
  configChips: {
    flexDirection: 'row',
    gap: 8,
  },
  configChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: `${COLORS.backgroundDark}80`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  configCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconOptionActive: {
    backgroundColor: COLORS.primary,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  radioOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    alignItems: 'center',
  },
  radioOptionActive: {
    backgroundColor: COLORS.primary,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: `${COLORS.primary}99`,
  },
  radioTextActive: {
    color: COLORS.backgroundDark,
  },
  // FAB
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
  // Modal Styles
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    letterSpacing: 0.5,
    marginBottom: 16,
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
  iconScroll: {
    marginHorizontal: -4,
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
  // Delete Modal Styles
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
  deleteSportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  deleteSportIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSportInfo: {
    flex: 1,
  },
  deleteSportName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  deleteSportType: {
    fontSize: 13,
    color: COLORS.primary,
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

export default SportManagement;
