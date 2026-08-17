import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminCard from '../../components/admin/AdminCard';
import StatusModal from '../../components/StatusModal';
import { teamService, sportService, leagueService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../constants/config';

const PAGE_SIZE = 15;

const TeamManagement = ({ navigation, route }) => {
  const lockedSportCode = route?.params?.lockedSportCode || null;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const dialogWidth = Math.min(screenWidth - 32, 420);
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [sports, setSports] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSportFilter, setSelectedSportFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
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
    league_ids: [],
  });

  useEffect(() => {
    fetchSports();
    fetchLeagues();
    fetchTeams();
  }, []);

  const lockedSport = useMemo(() => {
    if (!lockedSportCode) return null;
    return sports.find((s) => s.code === lockedSportCode) || null;
  }, [sports, lockedSportCode]);

  useEffect(() => {
    if (lockedSport?.id) {
      setSelectedSportFilter(lockedSport.id);
    }
  }, [lockedSport]);

  const fetchLeagues = async () => {
    try {
      const data = await leagueService.getAllLeagues();
      if (data.data?.leagues) setLeagues(data.data.leagues);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    }
  };

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
        league_ids: formData.league_ids || [],
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
        league_ids: formData.league_ids || [],
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
      league_ids: Array.isArray(team.leagues) ? team.leagues.map((l) => l.id) : [],
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
      sport_id: lockedSport?.id || '',
      country: '',
      league_ids: [],
    });
    setSelectedImage(null);
  };

  const toggleLeague = (leagueId) => {
    setFormData((prev) => {
      const current = prev.league_ids || [];
      const exists = current.includes(leagueId);
      return {
        ...prev,
        league_ids: exists ? current.filter((id) => id !== leagueId) : [...current, leagueId],
      };
    });
  };

  // Ligas filtradas por deporte seleccionado (si hay), para no abrumar al admin
  const leaguesForForm = useMemo(() => {
    if (!formData.sport_id) return leagues;
    return leagues.filter((l) => l.sport_id === formData.sport_id);
  }, [leagues, formData.sport_id]);

  const filteredTeams = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return teams.filter(team => {
      const matchesSearch = !q
        || team.name?.toLowerCase().includes(q)
        || team.short_name?.toLowerCase().includes(q)
        || team.country?.toLowerCase().includes(q);
      const matchesSport = !selectedSportFilter || team.sport_id === selectedSportFilter;
      return matchesSearch && matchesSport;
    });
  }, [teams, searchQuery, selectedSportFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / PAGE_SIZE));

  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredTeams.slice(start, start + PAGE_SIZE);
  }, [filteredTeams, currentPage]);

  const pageStart = filteredTeams.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(currentPage * PAGE_SIZE, filteredTeams.length);

  const sportCounts = useMemo(() => {
    const counts = {};
    teams.forEach(t => {
      if (t.sport_id) counts[t.sport_id] = (counts[t.sport_id] || 0) + 1;
    });
    return counts;
  }, [teams]);

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

  const getTeamLogoUri = useCallback((logo) => {
    if (!logo) return null;
    if (logo.startsWith('file://') || logo.startsWith('http')) return logo;
    return `${BASE_URL}${logo}`;
  }, []);

  const renderTeamFormFields = () => (
    <>
      <View style={styles.logoSection}>
        <TouchableOpacity
          style={styles.logoPlaceholder}
          onPress={pickImage}
          disabled={uploadingImage}
          activeOpacity={0.8}
        >
          {uploadingImage ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : selectedImage ? (
            <Image source={{ uri: selectedImage }} style={styles.logoPreview} />
          ) : (
            <>
              <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
              <Text style={styles.logoText}>Toca para subir logo</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primary} />
          <Text style={styles.uploadButtonText}>
            {selectedImage ? 'Cambiar imagen' : 'Seleccionar imagen'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formSectionTitle}>Información básica</Text>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Nombre del equipo *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="ej. Real Madrid"
            placeholderTextColor={`${COLORS.white}40`}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.formRow}>
          <View style={styles.formGroupHalf}>
            <Text style={styles.formLabel}>Código *</Text>
            <TextInput
              style={[styles.formInput, styles.inputUppercase]}
              placeholder="RMA"
              placeholderTextColor={`${COLORS.white}40`}
              value={formData.short_name}
              onChangeText={(text) => setFormData({ ...formData, short_name: text.toUpperCase() })}
              autoCapitalize="characters"
              maxLength={5}
            />
          </View>
          <View style={styles.formGroupHalf}>
            <Text style={styles.formLabel}>País</Text>
            <TextInput
              style={styles.formInput}
              placeholder="España"
              placeholderTextColor={`${COLORS.white}40`}
              value={formData.country}
              onChangeText={(text) => setFormData({ ...formData, country: text })}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Deporte *</Text>
          {lockedSport ? (
            <View style={styles.lockedSportRow}>
              <View style={[styles.sportIconWrap, styles.sportIconWrapActive]}>
                <Ionicons name={lockedSport.icon || 'car-sport'} size={20} color={COLORS.backgroundDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lockedSportName}>{lockedSport.name}</Text>
                <Text style={styles.lockedSportHint}>Deporte fijado para esta sección</Text>
              </View>
              <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.sportGrid}>
              {sports.map((sport) => {
                const active = formData.sport_id === sport.id;
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={[styles.sportCard, active && styles.sportCardActive]}
                    onPress={() => setFormData({ ...formData, sport_id: sport.id })}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.sportIconWrap, active && styles.sportIconWrapActive]}>
                      <Ionicons
                        name={sport.icon || 'football-outline'}
                        size={22}
                        color={active ? COLORS.backgroundDark : COLORS.primary}
                      />
                    </View>
                    <Text style={[styles.sportCardText, active && styles.sportCardTextActive]} numberOfLines={1}>
                      {sport.name}
                    </Text>
                    {active && (
                      <View style={styles.sportCheckBadge}>
                        <Ionicons name="checkmark" size={12} color={COLORS.backgroundDark} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>
            Ligas asociadas <Text style={{ color: `${COLORS.white}70`, fontSize: 11 }}>(opcional · puedes elegir varias)</Text>
          </Text>
          <Text style={{ color: `${COLORS.white}55`, fontSize: 11, marginBottom: 8 }}>
            Al crear un partido, solo aparecerán los equipos de la liga seleccionada.
            Si no eliges ninguna, el equipo aparecerá en todos los partidos de su deporte.
          </Text>
          {leaguesForForm.length === 0 ? (
            <Text style={{ color: `${COLORS.white}55`, fontSize: 12, fontStyle: 'italic' }}>
              {formData.sport_id ? 'No hay ligas para el deporte seleccionado' : 'Selecciona primero un deporte'}
            </Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {leaguesForForm.map((lg) => {
                const active = (formData.league_ids || []).includes(lg.id);
                return (
                  <TouchableOpacity
                    key={lg.id}
                    style={[styles.optionChip, active && styles.optionChipActive]}
                    onPress={() => toggleLeague(lg.id)}
                  >
                    <Ionicons
                      name={active ? 'checkmark-circle' : 'trophy-outline'}
                      size={14}
                      color={active ? COLORS.backgroundDark : COLORS.primary}
                    />
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {lg.name}{lg.season ? ` · ${lg.season}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </>
  );

  const renderTeamCard = (team) => (
    <AdminCard key={team.id} variant="highlight" style={styles.teamCard}>
      <View style={styles.teamContent}>
        <View style={styles.teamLeft}>
          <View style={styles.teamLogo}>
            {team.logo ? (
              <Image source={{ uri: getTeamLogoUri(team.logo) }} style={styles.logoImage} />
            ) : (
              <Ionicons name="shield" size={28} color={COLORS.primary} />
            )}
          </View>
          <View style={styles.teamInfo}>
            <Text style={styles.teamName} numberOfLines={1}>{team.name}</Text>
            <View style={styles.teamMeta}>
              <Text style={styles.teamCode}>{team.short_name}</Text>
              {team.sport && (
                <>
                  <Text style={styles.separator}>•</Text>
                  <Text style={styles.sportName} numberOfLines={1}>{team.sport.name}</Text>
                </>
              )}
              {team.country ? (
                <>
                  <Text style={styles.separator}>•</Text>
                  <Text style={styles.countryName} numberOfLines={1}>{team.country}</Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.teamActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => openEditModal(team)}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteActionBtn]} onPress={() => openDeleteModal(team)}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>
    </AdminCard>
  );

  return (
    <View style={styles.container}>
      <AdminHeader 
        title={lockedSport ? `Equipos ${lockedSport.name}` : 'Gestión de Equipos'}
        subtitle={lockedSport ? `Escuderías / Equipos de ${lockedSport.name}` : 'Organizaciones Deportivas'}
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
        {/* Toolbar: búsqueda y filtros */}
        <View style={styles.toolbarCard}>
          <Text style={styles.toolbarLabel}>Buscar equipos</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color={COLORS.primary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Nombre, código o país..."
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

          {!lockedSport && (
            <>
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
                    Todos ({teams.length})
                  </Text>
                </TouchableOpacity>
                {sports.map(sport => (
                  <TouchableOpacity
                    key={sport.id}
                    style={[styles.filterChip, selectedSportFilter === sport.id && styles.filterChipActive]}
                    onPress={() => setSelectedSportFilter(sport.id)}
                  >
                    <Ionicons
                      name={sport.icon || 'football-outline'}
                      size={14}
                      color={selectedSportFilter === sport.id ? COLORS.backgroundDark : COLORS.primary}
                    />
                    <Text style={[styles.filterChipText, selectedSportFilter === sport.id && styles.filterChipTextActive]}>
                      {sport.name} ({sportCounts[sport.id] || 0})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
          {lockedSport && (
            <View style={styles.lockedSportBadge}>
              <Ionicons name={lockedSport.icon || 'car-sport'} size={16} color={COLORS.primary} />
              <Text style={styles.lockedSportText}>Mostrando solo {lockedSport.name}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{filteredTeams.length}</Text>
            <Text style={styles.statLabel}>FILTRADOS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{teams.length}</Text>
            <Text style={styles.statLabel}>TOTAL</Text>
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
              <Text style={styles.countText}>
                {filteredTeams.length === 0 ? '0' : `${pageStart}-${pageEnd}`} de {filteredTeams.length}
              </Text>
            </View>
          </View>

          {loading && teams.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.emptyStateText}>Cargando equipos...</Text>
            </View>
          ) : filteredTeams.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateText}>
                {searchQuery || selectedSportFilter ? 'No hay equipos con estos filtros' : 'No hay equipos registrados'}
              </Text>
              {(searchQuery || selectedSportFilter) && (
                <TouchableOpacity style={styles.emptyActionBtn} onPress={clearFilters}>
                  <Text style={styles.emptyActionText}>Quitar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <>
              {paginatedTeams.map(renderTeamCard)}

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
        statusBarTranslucent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: screenHeight * 0.92 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo equipo</Text>
              <TouchableOpacity
                onPress={() => { setShowCreateModal(false); resetForm(); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderTeamFormFields()}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowCreateModal(false); resetForm(); }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleCreateTeam} disabled={loading}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Creando...' : 'Crear equipo'}
                  </Text>
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
        statusBarTranslucent
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { maxHeight: screenHeight * 0.92 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar equipo</Text>
              <TouchableOpacity
                onPress={() => { setShowEditModal(false); resetForm(); }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBodyScroll}
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {renderTeamFormFields()}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { setShowEditModal(false); resetForm(); }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdateTeam} disabled={loading}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                  </Text>
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
                <Text style={styles.dialogTitle}>Eliminar equipo</Text>
              </View>
              <TouchableOpacity
                style={styles.dialogCloseBtn}
                onPress={() => setShowDeleteModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.dialogMessage}>
              Esta acción no se puede deshacer. Se eliminarán los datos asociados al equipo.
            </Text>

            {selectedTeam && (
              <View style={styles.deleteTeamCard}>
                <View style={styles.deleteTeamLogo}>
                  {selectedTeam.logo ? (
                    <Image source={{ uri: getTeamLogoUri(selectedTeam.logo) }} style={styles.deleteTeamImage} />
                  ) : (
                    <Ionicons name="shield" size={32} color={COLORS.primary} />
                  )}
                </View>
                <View style={styles.deleteTeamInfo}>
                  <Text style={styles.deleteTeamName} numberOfLines={2}>
                    {selectedTeam.name || 'Sin nombre'}
                  </Text>
                  <Text style={styles.deleteTeamCode}>{selectedTeam.short_name}</Text>
                  {selectedTeam.sport?.name ? (
                    <Text style={styles.deleteTeamSport}>{selectedTeam.sport.name}</Text>
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
                onPress={handleDeleteTeam}
              >
                <Text style={styles.dialogBtnPrimaryText}>Eliminar</Text>
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
  filterChipsRow: {
    gap: 8,
    paddingRight: 4,
  },
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
    paddingHorizontal: 4,
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
  pageIndicator: {
    alignItems: 'center',
  },
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
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  teamInfo: {
    flex: 1,
    minWidth: 0,
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
    flexShrink: 1,
  },
  countryName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  teamActions: {
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
    width: '100%',
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  modalSheet: {
    width: '100%',
    alignSelf: 'stretch',
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
  modalBodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  formSection: {
    marginBottom: 8,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 14,
  },
  formGroup: {
    marginBottom: 16,
    gap: 8,
  },
  formGroupHalf: {
    flex: 1,
    marginBottom: 0,
    gap: 8,
    minWidth: 0,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 2,
    letterSpacing: 0.3,
  },
  formInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  lockedSportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${COLORS.primary}18`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}44`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  lockedSportText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  lockedSportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${COLORS.primary}12`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}44`,
    borderRadius: 14,
    padding: 12,
  },
  lockedSportName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  lockedSportHint: {
    color: `${COLORS.white}88`,
    fontSize: 11,
    marginTop: 2,
  },
  sportCard: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  sportCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}18`,
  },
  sportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${COLORS.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sportIconWrapActive: { backgroundColor: COLORS.primary },
  sportCardText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sportCardTextActive: { color: COLORS.primary, fontWeight: '800' },
  sportCheckBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputUppercase: {
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  optionScroll: {
    marginHorizontal: -4,
  },
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
  optionChipActive: {
    backgroundColor: COLORS.primary,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  optionTextActive: {
    color: COLORS.backgroundDark,
  },
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
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
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
  deleteTeamCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  deleteTeamLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    minWidth: 0,
  },
  deleteTeamName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  deleteTeamCode: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  deleteTeamSport: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default TeamManagement;
