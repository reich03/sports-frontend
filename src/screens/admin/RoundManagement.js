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
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusModal from '../../components/StatusModal';
import { sportService, leagueService, roundService } from '../../services';
import { useAuth } from '../../context/AuthContext';

const RoundManagement = ({ navigation }) => {
  const { token } = useAuth();
  const [rounds, setRounds] = useState([]);
  const [sports, setSports] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [filteredLeagues, setFilteredLeagues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseRoundModal, setShowCloseRoundModal] = useState(false);
  const [showPredictionsModal, setShowPredictionsModal] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [predictionsStats, setPredictionsStats] = useState(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selectedRound, setSelectedRound] = useState(null);

  // DatePicker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
    sport_id: '',
    league_id: '',
    round_type: 'regular',
    round_number: '',
    start_date: new Date(),
    end_date: new Date(),
  });

  const roundTypes = [
    { value: 'regular', label: 'Jornada Regular' },
    { value: 'group_stage', label: 'Fase de Grupos' },
    { value: 'round_of_32', label: 'Dieciseisavos' },
    { value: 'round_of_16', label: 'Octavos de Final' },
    { value: 'quarterfinal', label: 'Cuartos de Final' },
    { value: 'semifinal', label: 'Semifinal' },
    { value: 'final', label: 'Final' },
    { value: 'friendly', label: 'Amistoso' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Filter leagues by selected sport
    if (formData.sport_id) {
      const filtered = leagues.filter(league => league.sport_id === formData.sport_id);
      setFilteredLeagues(filtered);
    } else {
      setFilteredLeagues([]);
    }
  }, [formData.sport_id, leagues]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sportsData, leaguesData, roundsData] = await Promise.all([
        sportService.getAllSports(),
        leagueService.getAllLeagues(),
        roundService.getAllRounds(),
      ]);

      if (sportsData.data?.sports) setSports(sportsData.data.sports);
      if (leaguesData.data?.leagues) setLeagues(leaguesData.data.leagues);
      if (roundsData.data) setRounds(roundsData.data);
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

  const handleCreateRound = async () => {
    if (!formData.name || !formData.sport_id) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Campos Requeridos',
        message: 'Nombre y Deporte son obligatorios',
      });
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: formData.name,
        sport_id: formData.sport_id,
        league_id: formData.league_id || null,
        round_type: formData.round_type,
        round_number: formData.round_number ? parseInt(formData.round_number) : null,
        start_date: formData.start_date?.toISOString(),
        end_date: formData.end_date?.toISOString(),
      };

      const response = await roundService.createRound(data);

      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Éxito!',
        message: response.message || 'Jornada creada correctamente',
      });
      resetForm();
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating round:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Error al crear la jornada',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRound = async () => {
    if (!formData.name || !formData.sport_id) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Campos Requeridos',
        message: 'Nombre y Deporte son obligatorios',
      });
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: formData.name,
        round_type: formData.round_type,
        round_number: formData.round_number ? parseInt(formData.round_number) : null,
        start_date: formData.start_date?.toISOString(),
        end_date: formData.end_date?.toISOString(),
      };

      const response = await roundService.updateRound(selectedRound.id, data);

      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Éxito!',
        message: response.message || 'Jornada actualizada correctamente',
      });
      resetForm();
      setShowEditModal(false);
      setSelectedRound(null);
      fetchData();
    } catch (error) {
      console.error('Error updating round:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Error al actualizar la jornada',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRound = async () => {
    setLoading(true);
    try {
      const response = await roundService.deleteRound(selectedRound.id);

      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Éxito!',
        message: response.message || 'Jornada eliminada correctamente',
      });
      setShowDeleteModal(false);
      setSelectedRound(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting round:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Error al eliminar la jornada',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseRound = async () => {
    if (!selectedRound) return;

    setLoading(true);
    try {
      const response = await roundService.closeRound(selectedRound.id);

      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Jornada Cerrada',
        message: `${response.data.processing_results.processed_matches} partidos procesados exitosamente`,
      });

      setShowCloseRoundModal(false);
      setSelectedRound(null);
      fetchData();
    } catch (error) {
      console.error('Error closing round:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.message || 'Error al cerrar jornada. Verifica que todos los partidos tengan marcador.',
      });
    } finally {
      setLoading(false);
    }
  };

  const openPredictionsModal = async (round) => {
    setSelectedRound(round);
    setShowPredictionsModal(true);
    setLoadingPredictions(true);
    
    try {
      const response = await roundService.getRoundPredictions(round.id);
      setPredictions(response.data.predictions || []);
      setPredictionsStats(response.data.stats || null);
    } catch (error) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Error al cargar las predicciones',
      });
      setPredictions([]);
      setPredictionsStats(null);
    } finally {
      setLoadingPredictions(false);
    }
  };

  const openEditModal = (round) => {
    setSelectedRound(round);
    setFormData({
      name: round.name,
      sport_id: round.sport_id,
      league_id: round.league_id || '',
      round_type: round.round_type,
      round_number: round.round_number?.toString() || '',
      start_date: round.start_date ? new Date(round.start_date) : new Date(),
      end_date: round.end_date ? new Date(round.end_date) : new Date(),
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (round) => {
    setSelectedRound(round);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sport_id: '',
      league_id: '',
      round_type: 'regular',
      round_number: '',
      start_date: new Date(),
      end_date: new Date(),
    });
  };

  const filteredRounds = rounds.filter(round =>
    round.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    round.sport?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    round.league?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoundTypeLabel = (type) => {
    const found = roundTypes.find(rt => rt.value === type);
    return found ? found.label : type;
  };

  const getRoundIcon = (type) => {
    switch (type) {
      case 'final': return 'trophy';
      case 'semifinal': return 'medal';
      case 'quarterfinal': return 'ribbon';
      case 'round_of_16': return 'stats-chart';
      case 'round_of_32': return 'git-network';
      case 'group_stage': return 'grid';
      case 'friendly': return 'hand-left';
      default: return 'calendar';
    }
  };

  const getStatusBadge = (round) => {
    const now = new Date();
    const startDate = round.start_date ? new Date(round.start_date) : null;
    const endDate = round.end_date ? new Date(round.end_date) : null;
    
    // Si no tiene fechas definidas, es un borrador real
    if (!startDate || !endDate) {
      return { label: 'BORRADOR', color: '#94a3b8', bg: '#94a3b820' };
    }
    
    // Si ya terminó
    if (endDate < now) {
      return { label: 'FINALIZADA', color: '#6b7280', bg: '#374151' };
    } 
    
    // Si está en curso (activa)
    if (startDate <= now && endDate >= now) {
      return { label: 'ACTIVA', color: COLORS.primary, bg: 'rgba(0, 230, 119, 0.12)' };
    } 
    
    // Si está programada para el futuro
    if (startDate > now) {
      return { label: 'PRÓXIMA', color: '#00dcfe', bg: '#00dcfe20' };
    }
    
    // Fallback (no debería llegar aquí)
    return { label: 'BORRADOR', color: '#94a3b8', bg: '#94a3b820' };
  };

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const renderRoundCard = (round) => {
    const status = getStatusBadge(round);
    const typeColor = getTypeBadgeColor(round.round_type);
    
    return (
      <View key={round.id} style={styles.roundCard}>
        <View style={styles.roundCardContent}>
          {/* Left Icon */}
          <View style={[styles.roundIconContainer, { backgroundColor: `${typeColor}15` }]}>
            <Ionicons name={getRoundIcon(round.round_type)} size={32} color={typeColor} />
          </View>

          {/* Main Content */}
          <View style={styles.roundMainContent}>
            <View style={styles.roundTitleRow}>
              <Text style={styles.roundTitle} numberOfLines={1}>
                {round.name}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: status.bg, borderColor: `${status.color}40` }]}>
                <Text style={[styles.statusBadgeText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>

            {/* Info Row */}
            <View style={styles.roundInfoRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.roundInfoText}>
                {round.start_date 
                  ? `${new Date(round.start_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}${round.end_date ? ` - ${new Date(round.end_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}`
                  : 'Sin fecha'
                }
              </Text>
            </View>

            {/* League and Sport Info */}
            <View style={styles.roundMetaRow}>
              {round.league && (
                <View style={styles.roundMetaChip}>
                  <Ionicons name="trophy" size={12} color={COLORS.primary} />
                  <Text style={styles.roundMetaText} numberOfLines={1}>{round.league.name}</Text>
                </View>
              )}
              {round.sport && (
                <View style={styles.roundMetaChip}>
                  <Ionicons name="football" size={12} color={COLORS.secondary} />
                  <Text style={styles.roundMetaText} numberOfLines={1}>{round.sport.name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.roundActionsContainer}>
          {/* Primera fila - Acciones principales */}
          <View style={styles.roundActionsRow}>
            <TouchableOpacity
              style={styles.roundActionButton}
              onPress={() => openEditModal(round)}
            >
              <Ionicons name="create-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.roundActionText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roundActionButton, styles.roundActionPrimary]}
              onPress={() => {
                navigation.navigate('MatchManagement', { roundId: round.id, roundName: round.name });
              }}
            >
              <Ionicons name="football-outline" size={18} color={COLORS.primary} />
              <Text style={[styles.roundActionText, styles.roundActionTextPrimary]}>
                {round.matches?.length > 0 
                  ? `Partidos (${round.matches.length})` 
                  : 'Crear Partidos'
                }
              </Text>
            </TouchableOpacity>
          </View>

          {/* Segunda fila - Acciones secundarias */}
          <View style={styles.roundActionsRow}>
            <TouchableOpacity
              style={[styles.roundActionButton, styles.roundActionSecondary]}
              onPress={() => openPredictionsModal(round)}
            >
              <Ionicons name="people" size={18} color={COLORS.secondary} />
              <Text style={[styles.roundActionText, styles.roundActionTextSecondary]}>
                Predicciones
              </Text>
            </TouchableOpacity>

            {round.matches?.length > 0 && (
              <TouchableOpacity
                style={[styles.roundActionButton, styles.roundActionSuccess]}
                onPress={() => {
                  setSelectedRound(round);
                  setShowCloseRoundModal(true);
                }}
              >
                <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={[styles.roundActionText, styles.roundActionTextSuccess]}>
                  Cerrar Jornada
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.roundActionButtonIcon}
              onPress={() => openDeleteModal(round)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'final': return '#fbbf24';
      case 'semifinal': return '#fb923c';
      case 'quarterfinal': return '#f87171';
      case 'round_of_16': return '#a78bfa';
      case 'round_of_32': return '#818cf8';
      case 'group_stage': return '#60a5fa';
      case 'friendly': return '#94a3b8';
      default: return COLORS.primary;
    }
  };

  const renderForm = () => (
    <ScrollView style={styles.modalContent}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Nombre de la Jornada *</Text>
        <TextInput
          style={styles.input}
          placeholder="ej: Jornada 1, Octavos de Final"
          placeholderTextColor="rgba(255, 255, 255, 0.25)"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Deporte *</Text>
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
              onPress={() => {
                setFormData({ ...formData, sport_id: sport.id, league_id: '' });
              }}
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

      <View style={styles.formGroup}>
        <Text style={styles.label}>Liga (Opcional)</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sportScroll}
        >
          <TouchableOpacity
            style={[
              styles.sportOption,
              !formData.league_id && styles.sportOptionActive
            ]}
            onPress={() => setFormData({ ...formData, league_id: '' })}
          >
            <Ionicons 
              name="close-circle" 
              size={18} 
              color={!formData.league_id ? COLORS.backgroundDark : COLORS.textSecondary} 
            />
            <Text style={[
              styles.sportOptionText,
              !formData.league_id && styles.sportOptionTextActive
            ]}>
              Sin Liga
            </Text>
          </TouchableOpacity>
          {filteredLeagues.map((league) => (
            <TouchableOpacity
              key={league.id}
              style={[
                styles.sportOption,
                formData.league_id === league.id && styles.sportOptionActive
              ]}
              onPress={() => setFormData({ ...formData, league_id: league.id })}
            >
              <Ionicons 
                name="trophy" 
                size={18} 
                color={formData.league_id === league.id ? COLORS.backgroundDark : COLORS.primary} 
              />
              <Text style={[
                styles.sportOptionText,
                formData.league_id === league.id && styles.sportOptionTextActive
              ]}>
                {league.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {!formData.sport_id && (
          <Text style={styles.helperText}>Selecciona un deporte primero</Text>
        )}
        {formData.sport_id && filteredLeagues.length === 0 && (
          <Text style={styles.helperText}>No hay ligas disponibles para este deporte</Text>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Tipo de Jornada</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.sportScroll}
        >
          {roundTypes.map((type) => (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.sportOption,
                formData.round_type === type.value && styles.sportOptionActive
              ]}
              onPress={() => setFormData({ ...formData, round_type: type.value })}
            >
              <Ionicons 
                name={getRoundIcon(type.value)} 
                size={18} 
                color={formData.round_type === type.value ? COLORS.backgroundDark : getTypeBadgeColor(type.value)} 
              />
              <Text style={[
                styles.sportOptionText,
                formData.round_type === type.value && styles.sportOptionTextActive
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Número de Jornada (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="ej: 1, 2, 3..."
          placeholderTextColor="rgba(255, 255, 255, 0.25)"
          value={formData.round_number}
          onChangeText={(text) => setFormData({ ...formData, round_number: text })}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Fecha de Inicio</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
          <Text style={styles.dateText}>
            {formData.start_date.toLocaleDateString('es-ES')}
          </Text>
        </TouchableOpacity>

        {showStartDatePicker && (
          <DateTimePicker
            value={formData.start_date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setFormData({ ...formData, start_date: selectedDate });
              }
            }}
          />
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Fecha de Fin</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
          <Text style={styles.dateText}>
            {formData.end_date.toLocaleDateString('es-ES')}
          </Text>
        </TouchableOpacity>

        {showEndDatePicker && (
          <DateTimePicker
            value={formData.end_date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setFormData({ ...formData, end_date: selectedDate });
              }
            }}
          />
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <AdminHeader 
        title="Gestión de Jornadas"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar jornadas..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          resetForm();
          setShowCreateModal(true);
        }}
      >
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Crear Jornada</Text>
        </LinearGradient>
      </TouchableOpacity>

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
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{rounds.length}</Text>
            <Text style={styles.statLabel}>Total Jornadas</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {rounds.filter(r => r.round_type === 'regular').length}
            </Text>
            <Text style={styles.statLabel}>Regulares</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {rounds.filter(r => ['quarterfinal', 'semifinal', 'final'].includes(r.round_type)).length}
            </Text>
            <Text style={styles.statLabel}>Eliminatorias</Text>
          </View>
        </View>

        {loading && !refreshing ? (
          <Text style={styles.loadingText}>Cargando...</Text>
        ) : filteredRounds.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No hay jornadas disponibles</Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {filteredRounds.map(renderRoundCard)}
          </View>
        )}
      </ScrollView>

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Crear Jornada</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {renderForm()}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateRound}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Creando...' : 'Crear'}
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
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Jornada</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {renderForm()}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleEditRound}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Actualizando...' : 'Actualizar'}
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
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Ionicons name="warning-outline" size={64} color="#ef4444" />
            <Text style={styles.deleteModalTitle}>¿Eliminar Jornada?</Text>
            <Text style={styles.deleteModalText}>
              Esta acción no se puede deshacer. Se eliminará la jornada "{selectedRound?.name}".
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteRound}
                disabled={loading}
              >
                <Text style={styles.deleteButtonText}>
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Close Round Modal */}
      <Modal
        visible={showCloseRoundModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCloseRoundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalContainer}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
            <Text style={styles.deleteModalTitle}>Cerrar Jornada</Text>
            <Text style={styles.deleteModalText}>
              Se procesarán todos los partidos de "{selectedRound?.name}" y se calcularán los puntos de las predicciones.
            </Text>
            <Text style={[styles.deleteModalText, { color: COLORS.primary, fontWeight: '600', marginTop: 12 }]}>
              Asegúrate de que todos los partidos tengan marcador final.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCloseRoundModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: COLORS.success }]}
                onPress={handleCloseRound}
                disabled={loading}
              >
                <Text style={styles.deleteButtonText}>
                  {loading ? 'Procesando...' : 'Cerrar Jornada'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Predictions Modal */}
      <Modal
        visible={showPredictionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPredictionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.predictionsModalContent]}>
            <View style={styles.predictionsModalHeader}>
              <View style={styles.predictionsHeaderTop}>
                <View style={styles.predictionsIconContainer}>
                  <Ionicons name="trophy" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.predictionsModalTitle}>Predicciones</Text>
                <TouchableOpacity 
                  onPress={() => setShowPredictionsModal(false)}
                  style={styles.predictionsCloseButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {selectedRound && (
                <View style={styles.predictionsRoundInfo}>
                  <Text style={styles.predictionsRoundName}>{selectedRound.name}</Text>
                  <View style={styles.predictionsRoundMeta}>
                    <Ionicons name="football-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.predictionsRoundLeague}>
                      {selectedRound.league?.name || 'Sin liga'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {predictionsStats && (
              <View style={styles.predictionStatsContainer}>
                <View style={styles.predictionStatsRow}>
                  <View style={styles.predictionStatBox}>
                    <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.predictionStatNumber}>{predictionsStats.total_matches}</Text>
                      <Text style={styles.predictionStatLabel}>Partidos</Text>
                    </View>
                  </View>
                  <View style={styles.predictionStatBox}>
                    <Ionicons name="people-outline" size={18} color={COLORS.primary} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.predictionStatNumber}>{predictionsStats.total_predictions}</Text>
                      <Text style={styles.predictionStatLabel}>Predicciones</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.predictionStatsRow}>
                  <View style={[styles.predictionStatBox, styles.statBoxSuccess]}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <View style={styles.statTextContainer}>
                      <Text style={[styles.predictionStatNumber, { color: COLORS.success }]}>
                        {predictionsStats.correct}
                      </Text>
                      <Text style={styles.predictionStatLabel}>Acertadas</Text>
                    </View>
                  </View>
                  <View style={[styles.predictionStatBox, styles.statBoxPrimary]}>
                    <Ionicons name="trophy" size={18} color={COLORS.primary} />
                    <View style={styles.statTextContainer}>
                      <Text style={[styles.predictionStatNumber, { color: COLORS.primary }]}>
                        {predictionsStats.total_points_awarded}
                      </Text>
                      <Text style={styles.predictionStatLabel}>Puntos</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={true}
            >
              {loadingPredictions ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Cargando predicciones...</Text>
                </View>
              ) : predictions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={60} color="rgba(0, 230, 119, 0.25)" />
                  <Text style={styles.emptyStateText}>No hay predicciones aún</Text>
                </View>
              ) : (
                <View style={styles.predictionsList}>
                  {predictions.map((prediction) => (
                    <View key={prediction.id} style={styles.predictionCard}>
                      <View style={styles.predictionCardInner}>
                        {/* Match Header */}
                        <View style={styles.predictionMatchHeader}>
                          <View style={styles.predictionMatchTeamsRow}>
                            <Text style={styles.predictionMatchTeamName}>
                              {prediction.match?.home_team?.short_name || 'TBD'}
                            </Text>
                            <View style={styles.predictionMatchVsContainer}>
                              <Text style={styles.predictionMatchVs}>VS</Text>
                            </View>
                            <Text style={styles.predictionMatchTeamName}>
                              {prediction.match?.away_team?.short_name || 'TBD'}
                            </Text>
                          </View>
                          <View style={styles.predictionMatchMetaRow}>
                            <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.predictionMatchMetaText}>
                              {formatDateTime(prediction.match?.match_date)}
                            </Text>
                            <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.predictionMatchMetaText}>
                              {formatTime(prediction.match?.match_date)}
                            </Text>
                          </View>
                          {prediction.match?.status === 'finished' && (
                            <View style={styles.predictionMatchFinalScore}>
                              <Ionicons name="trophy" size={14} color={COLORS.success} />
                              <Text style={styles.predictionMatchFinalScoreText}>
                                {prediction.match.home_score} - {prediction.match.away_score}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* User Info */}
                        <View style={styles.predictionUserSection}>
                          <View style={styles.predictionUserInfo}>
                            <View style={styles.userAvatarContainer}>
                              {prediction.user?.avatar ? (
                                <Image 
                                  source={{ uri: prediction.user.avatar }} 
                                  style={styles.userAvatar}
                                />
                              ) : (
                                <View style={styles.userAvatarPlaceholder}>
                                  <Text style={styles.userAvatarText}>
                                    {(prediction.user?.username || 'U').charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.userInfoText}>
                              <Text style={styles.predictionUsername}>
                                {prediction.user?.username || 'Usuario'}
                              </Text>
                              <View style={styles.userPointsRow}>
                                <Ionicons name="star" size={11} color={COLORS.primary} />
                                <Text style={styles.predictionUserPoints}>
                                  {prediction.user?.total_points || 0} pts
                                </Text>
                              </View>
                            </View>
                          </View>
                          {prediction.is_processed && (
                            <View style={[
                              styles.predictionBadge,
                              prediction.is_correct ? styles.predictionBadgeCorrect : styles.predictionBadgeIncorrect
                            ]}>
                              <Ionicons 
                                name={prediction.is_correct ? "checkmark-circle" : "close-circle"} 
                                size={13} 
                                color={prediction.is_correct ? COLORS.success : COLORS.error} 
                              />
                              <Text style={[
                                styles.predictionBadgeText,
                                { color: prediction.is_correct ? COLORS.success : COLORS.error }
                              ]}>
                                {prediction.is_correct ? 'Correcta' : 'Incorrecta'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Score Prediction */}
                        <View style={styles.predictionScoreContainer}>
                          <View style={styles.predictionScoreBox}>
                            <Text style={styles.predictionScoreLabel}>Predicción</Text>
                            <View style={styles.predictionScoreValue}>
                              <Text style={styles.predictionScoreNumber}>
                                {prediction.prediction_data?.home_score}
                              </Text>
                              <Text style={styles.predictionScoreSeparator}>-</Text>
                              <Text style={styles.predictionScoreNumber}>
                                {prediction.prediction_data?.away_score}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Points Earned */}
                        {prediction.is_processed && (
                          <View style={styles.predictionPointsContainer}>
                            <View style={styles.predictionPointsBox}>
                              <Ionicons name="trophy" size={16} color={COLORS.primary} />
                              <Text style={styles.predictionPoints}>
                                +{prediction.points_earned} puntos ganados
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  createButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  cardsContainer: {
    paddingHorizontal: 20,
  },
  // NUEVOS ESTILOS DE CARDS (Mejorados)
  roundCard: {
    backgroundColor: '#0f141a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  roundCardContent: {
    flexDirection: 'row',
    padding: 20,
  },
  roundIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  roundMainContent: {
    flex: 1,
  },
  roundTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  roundInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roundInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  roundMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roundMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    maxWidth: 150,
  },
  roundMetaText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  roundActionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 10,
  },
  roundActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  roundActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b2028',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  roundActionPrimary: {
    backgroundColor: 'rgba(63, 255, 140, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.1)',
  },
  roundActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roundActionTextPrimary: {
    color: COLORS.primary,
  },
  roundActionSecondary: {
    backgroundColor: 'rgba(68, 128, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(68, 128, 255, 0.18)',
  },
  roundActionTextSecondary: {
    color: COLORS.secondary,
  },
  roundActionSuccess: {
    backgroundColor: 'rgba(0, 230, 119, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.18)',
  },
  roundActionTextSuccess: {
    color: COLORS.success,
  },
  roundActionButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  // ESTILOS ANTIGUOS DE CARD (deprecated pero mantenidos por compatibilidad)
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  roundNumber: {
    fontSize: 14,
    color: COLORS.secondary,
    marginLeft: 8,
    marginBottom: 8,
  },
  cardActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  cardContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalContent: {
    padding: 20,
    maxHeight: 500,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    marginBottom: 8,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#1a1f28',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(168, 171, 179, 0.2)',
    fontWeight: '500',
  },
  pickerContainer: {
    gap: 8,
  },
  optionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
  },
  optionButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
  },
  optionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f28',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(168, 171, 179, 0.2)',
  },
  dateText: {
    fontSize: 15,
    color: COLORS.white,
    marginLeft: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 230, 119, 0.1)',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  saveButton: {
    overflow: 'hidden',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalContainer: {
    width: '85%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  deleteModalText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
  },
  // Sport/League horizontal scroll styles
  sportScroll: {
    marginTop: 4,
  },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    gap: 8,
  },
  sportOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sportOptionText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  sportOptionTextActive: {
    color: COLORS.backgroundDark,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Predictions Modal Styles
  predictionsModalContent: {
    width: '96%',
    maxWidth: 900,
    height: '92%',
    backgroundColor: COLORS.cardBackground,
    display: 'flex',
    flexDirection: 'column',
  },
  predictionsModalHeader: {
    backgroundColor: 'rgba(0, 230, 119, 0.03)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 230, 119, 0.1)',
  },
  predictionsHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  predictionsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionsModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
    flex: 1,
    textAlign: 'center',
  },
  predictionsRoundInfo: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    alignItems: 'center',
  },
  predictionsRoundName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 6,
  },
  predictionsRoundMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  predictionsRoundLeague: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  predictionStatsContainer: {
    padding: 14,
    gap: 10,
    backgroundColor: COLORS.backgroundDark,
  },
  predictionStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  predictionStatBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 119, 0.06)',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.12)',
  },
  statTextContainer: {
    flex: 1,
  },
  statBoxSuccess: {
    backgroundColor: 'rgba(0, 230, 119, 0.06)',
    borderColor: 'rgba(0, 230, 119, 0.18)',
  },
  statBoxPrimary: {
    backgroundColor: 'rgba(0, 230, 119, 0.06)',
    borderColor: 'rgba(0, 230, 119, 0.18)',
  },
  predictionStatNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.white,
  },
  predictionStatLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  modalBody: {
    flex: 1,
    minHeight: 0,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  predictionsList: {
    padding: 12,
    paddingBottom: 16,
    gap: 12,
  },
  predictionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(32, 38, 47, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  predictionCardInner: {
    padding: 16,
  },
  predictionMatchHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  predictionMatchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  predictionMatchTeamName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  predictionMatchVsContainer: {
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  predictionMatchVs: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  predictionMatchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  predictionMatchMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  predictionMatchFinalScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  predictionMatchFinalScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
  },
  predictionUserSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  userAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 230, 119, 0.25)',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  userInfoText: {
    flex: 1,
  },
  predictionUsername: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 3,
  },
  userPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  predictionUserPoints: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  predictionBadgeCorrect: {
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
  },
  predictionBadgeIncorrect: {
    backgroundColor: 'rgba(255, 113, 108, 0.12)',
  },
  predictionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  predictionScoreContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  predictionScoreBox: {
    alignItems: 'center',
  },
  predictionScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  predictionScoreValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  predictionScoreNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.white,
  },
  predictionScoreSeparator: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
  },
  predictionPointsContainer: {
    alignItems: 'center',
  },
  predictionPointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  predictionPoints: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    paddingVertical: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});

export default RoundManagement;
