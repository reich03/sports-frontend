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
  Image,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminButton from '../../components/admin/AdminButton';
import AdminCard from '../../components/admin/AdminCard';
import StatusModal from '../../components/StatusModal';
import { teamService, sportService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import CONFIG, { BASE_URL } from '../../constants/config';

const TeamManagement = ({ navigation }) => {
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Status Modal
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Image upload
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    short_name: '',
    sport_id: '',
    country: '',
  });

  useEffect(() => {
    fetchSports();
    fetchTeams();
  }, []);

  const fetchSports = async () => {
    try {
      const data = await sportService.getAllSports();
      if (data.data?.sports) {
        setSports(data.data.sports);
      }
    } catch (error) {
      console.error('Error fetching sports:', error);
    }
  };

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const data = await teamService.getAllTeams();
      if (data.data?.teams) {
        setTeams(data.data.teams);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar los equipos',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Permiso Denegado',
          message: 'Se requiere permiso para acceder a las fotos',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo seleccionar la imagen',
      });
    }
  };

  const handleCreateTeam = async () => {
    if (!formData.name || !formData.short_name || !formData.sport_id) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Completa el nombre, código y deporte del equipo',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Crear equipo sin logo primero
      const teamData = {
        name: formData.name,
        short_name: formData.short_name.toUpperCase(),
        sport_id: formData.sport_id,
        country: formData.country || null,
      };

      const data = await teamService.createTeam(teamData);
      const createdTeam = data.data.team;

      // Si hay imagen seleccionada, subirla
      if (selectedImage && selectedImage.startsWith('file://')) {
        try {
          await teamService.uploadTeamLogo(createdTeam.id, selectedImage);
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
          // No fallar la creación si el logo falla, solo informar
        }
      }

      setShowCreateModal(false);
      resetForm();
      fetchTeams();
      
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Equipo Creado!',
        message: data.message || 'El equipo se ha creado correctamente',
      });
    } catch (error) {
      console.error('Error creating team:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al Crear',
        message: error.response?.data?.error?.message || 'No se pudo crear el equipo',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!formData.name || !formData.short_name || !formData.sport_id) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Completa el nombre, código y deporte del equipo',
      });
      return;
    }

    try {
      setLoading(true);
      
      const teamData = {
        name: formData.name,
        short_name: formData.short_name.toUpperCase(),
        sport_id: formData.sport_id,
        country: formData.country || null,
      };

      const data = await teamService.updateTeam(selectedTeam.id, teamData);

      // Si hay nueva imagen seleccionada, subirla
      if (selectedImage && selectedImage.startsWith('file://')) {
        try {
          await teamService.uploadTeamLogo(selectedTeam.id, selectedImage);
        } catch (uploadError) {
          console.error('Error uploading logo:', uploadError);
        }
      }

      setShowEditModal(false);
      setSelectedTeam(null);
      resetForm();
      fetchTeams();
      
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Equipo Actualizado!',
        message: data.message || 'El equipo se ha actualizado correctamente',
      });
    } catch (error) {
      console.error('Error updating team:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al Actualizar',
        message: error.response?.data?.error?.message || 'No se pudo actualizar el equipo',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async () => {
    try {
      if (!selectedTeam) return;

      await teamService.deleteTeam(selectedTeam.id);
      setShowDeleteModal(false);
      setSelectedTeam(null);
      fetchTeams();
      
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Equipo Eliminado!',
        message: 'El equipo ha sido eliminado correctamente del sistema.',
      });
    } catch (error) {
      console.error('Error deleting team:', error);
      setShowDeleteModal(false);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al Eliminar',
        message: error.response?.data?.error?.message || 'No se pudo eliminar el equipo',
      });
    }
  };

  const openEditModal = (team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name || '',
      short_name: team.short_name || '',
      sport_id: team.sport_id || '',
      country: team.country || '',
    });
    // Si el equipo tiene logo, construir la URL completa solo si no empieza con file:// o http
    if (team.logo) {
      if (team.logo.startsWith('file://') || team.logo.startsWith('http')) {
        setSelectedImage(team.logo);
      } else {
        setSelectedImage(`${BASE_URL}${team.logo}`);
      }
    } else {
      setSelectedImage(null);
    }
    setShowEditModal(true);
  };

  const openDeleteModal = (team) => {
    setSelectedTeam(team);
    setShowDeleteModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      short_name: '',
      sport_id: '',
      country: '',
    });
    setSelectedImage(null);
  };

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.short_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <AdminHeader 
        title="Gestión de Equipos"
        subtitle="Organizaciones Deportivas"
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
            fetchTeams();
          }} />
        }
      >
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={`${COLORS.primary}99`} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar equipos por nombre o código..."
            placeholderTextColor={`${COLORS.primary}60`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{teams.length}</Text>
            <Text style={styles.statLabel}>EQUIPOS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{sports.length}</Text>
            <Text style={styles.statLabel}>DEPORTES</Text>
          </View>
        </View>

        {/* Teams List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>EQUIPOS REGISTRADOS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filteredTeams.length} Total</Text>
            </View>
          </View>

          {filteredTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No se encontraron equipos' : 'No hay equipos registrados'}
              </Text>
            </View>
          ) : (
            filteredTeams.map((team) => (
              <AdminCard key={team.id} variant="highlight" style={styles.teamCard}>
                <View style={styles.teamContent}>
                  <View style={styles.teamLeft}>
                    <View style={styles.teamLogo}>
                      {team.logo ? (
                        <Image 
                          source={{ 
                            uri: team.logo.startsWith('file://') || team.logo.startsWith('http') 
                              ? team.logo 
                              : `${BASE_URL}${team.logo}` 
                          }} 
                          style={styles.logoImage} 
                        />
                      ) : (
                        <Ionicons name="shield" size={28} color={COLORS.primary} />
                      )}
                    </View>
                    <View>
                      <Text style={styles.teamName}>{team.name}</Text>
                      <View style={styles.teamMeta}>
                        <Text style={styles.teamCode}>{team.short_name}</Text>
                        {team.sport && (
                          <>
                            <Text style={styles.separator}>•</Text>
                            <Text style={styles.sportName}>{team.sport.name}</Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.teamActions}>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => openEditModal(team)}
                    >
                      <Ionicons name="create-outline" size={20} color={`${COLORS.primary}99`} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => openDeleteModal(team)}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </AdminCard>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB - Create Team */}
      <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={32} color={COLORS.backgroundDark} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Team Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Nuevo Equipo</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <TouchableOpacity 
                  style={styles.logoPlaceholder}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  ) : selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.logoPreview} />
                  ) : (
                    <>
                      <Ionicons name="shield-outline" size={48} color={COLORS.textSecondary} />
                      <Text style={styles.logoText}>Logo del Equipo</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.uploadButtonText}>Subir Logo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Información Básica</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre del Equipo</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="ej. Real Madrid"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Código / Abreviatura</Text>
                  <TextInput
                    style={[styles.formInput, styles.inputUppercase]}
                    placeholder="ej. RMA"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.short_name}
                    onChangeText={(text) => setFormData({ ...formData, short_name: text.toUpperCase() })}
                    autoCapitalize="characters"
                    maxLength={5}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Deporte</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
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
                          name={sport.icon || 'football-outline'} 
                          size={20} 
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

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>País (opcional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="ej. España"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.country}
                    onChangeText={(text) => setFormData({ ...formData, country: text })}
                  />
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
                onPress={handleCreateTeam}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>CREAR EQUIPO</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Team Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Equipo</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Logo Section */}
              <View style={styles.logoSection}>
                <TouchableOpacity 
                  style={styles.logoPlaceholder}
                  onPress={pickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  ) : selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.logoPreview} />
                  ) : (
                    <>
                      <Ionicons name="shield-outline" size={48} color={COLORS.textSecondary} />
                      <Text style={styles.logoText}>Logo del Equipo</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                  <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.uploadButtonText}>Cambiar Logo</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>Información Básica</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Nombre del Equipo</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="ej. Real Madrid"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Código / Abreviatura</Text>
                  <TextInput
                    style={[styles.formInput, styles.inputUppercase]}
                    placeholder="ej. RMA"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.short_name}
                    onChangeText={(text) => setFormData({ ...formData, short_name: text.toUpperCase() })}
                    autoCapitalize="characters"
                    maxLength={5}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Deporte</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
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
                          name={sport.icon || 'football-outline'} 
                          size={20} 
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

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>País (opcional)</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="ej. España"
                    placeholderTextColor={`${COLORS.white}40`}
                    value={formData.country}
                    onChangeText={(text) => setFormData({ ...formData, country: text })}
                  />
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
                onPress={handleUpdateTeam}
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
              ¿Estás seguro de que deseas eliminar este equipo? Esta acción es irreversible y eliminará todos los datos asociados.
            </Text>

            {selectedTeam && (
              <View style={styles.deleteTeamCard}>
                <View style={styles.deleteTeamLogo}>
                  {selectedTeam.logo ? (
                    <Image 
                      source={{ 
                        uri: selectedTeam.logo.startsWith('file://') || selectedTeam.logo.startsWith('http') 
                          ? selectedTeam.logo 
                          : `${BASE_URL}${selectedTeam.logo}` 
                      }} 
                      style={styles.deleteTeamImage} 
                    />
                  ) : (
                    <Ionicons name="shield" size={32} color={COLORS.primary} />
                  )}
                </View>
                <View style={styles.deleteTeamInfo}>
                  <Text style={styles.deleteTeamName}>
                    {selectedTeam.name || 'Sin nombre'}
                  </Text>
                  <Text style={styles.deleteTeamCode}>{selectedTeam.short_name}</Text>
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
                onPress={handleDeleteTeam}
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
  teamCard: {
    marginBottom: 12,
  },
  teamContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  teamLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  teamName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  teamMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  teamCode: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  separator: {
    fontSize: 12,
    color: `${COLORS.white}40`,
  },
  sportName: {
    fontSize: 12,
    color: `${COLORS.white}70`,
  },
  teamActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
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
  logoSection: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: `${COLORS.primary}40`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
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
  inputUppercase: {
    textTransform: 'uppercase',
    letterSpacing: 2,
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
  deleteTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  deleteTeamLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  deleteTeamImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  deleteTeamInfo: {
    flex: 1,
  },
  deleteTeamName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  deleteTeamCode: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 1,
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

export default TeamManagement;
