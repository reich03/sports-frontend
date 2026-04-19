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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusModal from '../../components/StatusModal';
import { matchService, teamService, leagueService, roundService } from '../../services';
import { useAuth } from '../../context/AuthContext';
import CONFIG, { BASE_URL } from '../../constants/config';

const MatchManagement = ({ navigation, route }) => {
  const { token } = useAuth();
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [filteredRounds, setFilteredRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCloseMatchModal, setShowCloseMatchModal] = useState(false);
  const [closeMatchData, setCloseMatchData] = useState({
    home_score: '',
    away_score: '',
  });
  const [showPredictionsModal, setShowPredictionsModal] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const [predictionsStats, setPredictionsStats] = useState(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);

  // Status Modal
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [formData, setFormData] = useState({
    league_id: '',
    round_id: '',
    home_team_id: '',
    away_team_id: '',
    match_date: '',
    match_time: '20:00',
    status: 'scheduled',
  });

  // Team Info Modal
  const [teamInfoModal, setTeamInfoModal] = useState({
    visible: false,
    team: null,
  });

  // Date Time Pickers
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [tempTime, setTempTime] = useState(new Date());

  // Expanded leagues for accordion
  const [expandedLeagues, setExpandedLeagues] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  // Handle navigation params (from RoundManagement)
  useEffect(() => {
    if (route?.params?.roundId && rounds.length > 0) {
      const round = rounds.find(r => r.id === route.params.roundId);
      if (round) {
        // Pre-select the round and league
        setFormData(prev => ({
          ...prev,
          round_id: round.id,
          league_id: round.league_id || ''
        }));
        // Expand the league automatically
        if (round.league_id) {
          setExpandedLeagues(new Set([round.league_id]));
        }
      }
    }
  }, [route?.params, rounds]);

  // Filter rounds when league changes
  useEffect(() => {
    if (formData.league_id) {
      const filtered = rounds.filter(round => round.league_id === formData.league_id);
      setFilteredRounds(filtered);
    } else {
      setFilteredRounds([]);
    }
  }, [formData.league_id, rounds]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [matchesData, teamsData, leaguesData, roundsData] = await Promise.all([
        matchService.getMatches(),
        teamService.getAllTeams(),
        leagueService.getAllLeagues(),
        roundService.getAllRounds(),
      ]);

      if (matchesData.data?.matches) setMatches(matchesData.data.matches);
      if (teamsData.data?.teams) setTeams(teamsData.data.teams);
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

  // Obtener el sport_id de la liga seleccionada
  const getSelectedLeagueSportId = () => {
    if (!formData.league_id) return null;
    const selectedLeague = leagues.find(l => l.id === formData.league_id);
    return selectedLeague?.sport_id || null;
  };

  // Filtrar equipos por el deporte de la liga seleccionada
  const getFilteredTeams = () => {
    const sportId = getSelectedLeagueSportId();
    if (!sportId) return teams;
    return teams.filter(team => team.sport_id === sportId);
  };

  const handleCreateMatch = async () => {
    if (!formData.league_id || !formData.home_team_id || !formData.away_team_id || !formData.match_date) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Campos Requeridos',
        message: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    if (formData.home_team_id === formData.away_team_id) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Los equipos local y visitante deben ser diferentes',
      });
      return;
    }

    setLoading(true);
    try {
      // Crear fecha en timezone local y convertir a ISO (mantiene hora local)
      const [year, month, day] = formData.match_date.split('-');
      const [hours, minutes] = formData.match_time.split(':');
      const localDate = new Date(year, month - 1, day, hours, minutes);
      const matchDateTime = localDate.toISOString();
      
      const sportId = getSelectedLeagueSportId();
      
      const data = await matchService.createMatch({
        ...formData,
        sport_id: sportId,
        round_id: formData.round_id || null,
        match_date: matchDateTime
      });

      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Éxito!',
        message: data.message || 'Partido creado correctamente',
      });
      resetForm();
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating match:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo crear el partido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMatch = async () => {
    if (!formData.league_id || !formData.home_team_id || !formData.away_team_id || !formData.match_date) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Campos Requeridos',
        message: 'Por favor completa todos los campos obligatorios',
      });
      return;
    }

    if (formData.home_team_id === formData.away_team_id) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Los equipos local y visitante deben ser diferentes',
      });
      return;
    }

    setLoading(true);
    try {
      // Crear fecha en timezone local y convertir a ISO (mantiene hora local)
      const [year, month, day] = formData.match_date.split('-');
      const [hours, minutes] = formData.match_time.split(':');
      const localDate = new Date(year, month - 1, day, hours, minutes);
      const matchDateTime = localDate.toISOString();
      
      const sportId = getSelectedLeagueSportId();
      
      const data = await matchService.updateMatch(selectedMatch.id, {
        ...formData,
        sport_id: sportId,
        match_date: matchDateTime
      });

      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Actualizado!',
        message: data.message || 'Partido actualizado correctamente',
      });
      resetForm();
      setShowEditModal(false);
      fetchData();
    } catch (error) {
      console.error('Error updating match:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo actualizar el partido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async () => {
    setLoading(true);
    try {
      const data = await matchService.deleteMatch(selectedMatch.id);
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Eliminado!',
        message: data.message || 'Partido eliminado correctamente',
      });
      setShowDeleteModal(false);
      setSelectedMatch(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting match:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo eliminar el partido',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (match) => {
    setSelectedMatch(match);
    const matchDate = new Date(match.match_date);
    
    // Extraer fecha y hora en timezone local (no UTC)
    const year = matchDate.getFullYear();
    const month = String(matchDate.getMonth() + 1).padStart(2, '0');
    const day = String(matchDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const hours = String(matchDate.getHours()).padStart(2, '0');
    const minutes = String(matchDate.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    
    setFormData({
      league_id: match.league_id,
      round_id: match.round_id || '',
      home_team_id: match.home_team_id,
      away_team_id: match.away_team_id,
      match_date: dateStr,
      match_time: timeStr,
      status: match.status,
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (match) => {
    setSelectedMatch(match);
    setShowDeleteModal(true);
  };

  const openCloseMatchModal = (match) => {
    setSelectedMatch(match);
    setCloseMatchData({
      home_score: match.home_score || '',
      away_score: match.away_score || '',
    });
    setShowCloseMatchModal(true);
  };

  const handleCloseMatch = async () => {
    if (!selectedMatch) return;
    
    // Validaciones
    if (closeMatchData.home_score === '' || closeMatchData.away_score === '') {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Debes ingresar ambos marcadores',
      });
      return;
    }

    const homeScore = parseInt(closeMatchData.home_score);
    const awayScore = parseInt(closeMatchData.away_score);

    if (homeScore < 0 || awayScore < 0) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Los marcadores no pueden ser negativos',
      });
      return;
    }

    setLoading(true);
    try {
      await matchService.submitMatchResult(selectedMatch.id, {
        home_score: homeScore,
        away_score: awayScore,
      });

      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Partido Cerrado',
        message: 'El marcador ha sido registrado y las predicciones han sido procesadas',
      });

      setShowCloseMatchModal(false);
      setCloseMatchData({ home_score: '', away_score: '' });
      setSelectedMatch(null);
      fetchData();
    } catch (error) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'Error al cerrar el partido',
      });
    } finally {
      setLoading(false);
    }
  };

  const openPredictionsModal = async (match) => {
    setSelectedMatch(match);
    setShowPredictionsModal(true);
    setLoadingPredictions(true);
    
    try {
      const response = await matchService.getMatchPredictions(match.id);
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

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      league_id: '',
      round_id: '',
      home_team_id: '',
      away_team_id: '',
      match_date: '',
      match_time: '20:00',
      status: 'scheduled',
    });
    setSelectedMatch(null);
  };

  const filteredMatches = matches.filter(match => {
    // Filter by search query
    let matchesSearch = true;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matchesSearch = (
        match.home_team?.name.toLowerCase().includes(query) ||
        match.away_team?.name.toLowerCase().includes(query) ||
        match.league?.name.toLowerCase().includes(query) ||
        match.roundInfo?.name?.toLowerCase().includes(query)
      );
    }
    
    // Filter by round if coming from RoundManagement
    const matchesRound = route?.params?.roundId 
      ? match.round_id === route.params.roundId 
      : true;
    
    return matchesSearch && matchesRound;
  });


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getTeamLogo = (team) => {
    if (!team?.logo) return null;
    if (team.logo.startsWith('file://') || team.logo.startsWith('http')) {
      return team.logo;
    }
    return `${BASE_URL}${team.logo}`;
  };

  const showTeamInfo = (team) => {
    setTeamInfoModal({
      visible: true,
      team: team,
    });
  };

  const closeTeamInfo = () => {
    setTeamInfoModal({
      visible: false,
      team: null,
    });
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      setTempDate(selectedDate);
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData({ ...formData, match_date: dateStr });
      
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    
    if (selectedTime) {
      setTempTime(selectedTime);
      const timeStr = selectedTime.toTimeString().slice(0, 5);
      setFormData({ ...formData, match_time: timeStr });
      
      if (Platform.OS === 'ios') {
        setShowTimePicker(false);
      }
    }
  };

  const openDatePicker = () => {
    if (formData.match_date) {
      setTempDate(new Date(formData.match_date + 'T12:00:00'));
    }
    setShowDatePicker(true);
  };

  const openTimePicker = () => {
    if (formData.match_time) {
      const [hours, minutes] = formData.match_time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      setTempTime(date);
    }
    setShowTimePicker(true);
  };

  const toggleLeague = (leagueId) => {
    setExpandedLeagues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leagueId)) {
        newSet.delete(leagueId);
      } else {
        newSet.add(leagueId);
      }
      return newSet;
    });
  };

  const groupMatchesByLeagueAndRound = () => {
    const grouped = {
      withLeague: {},
      withoutLeague: []
    };

    filteredMatches.forEach(match => {
      if (match.league_id) {
        // Partidos con liga
        const leagueId = match.league_id;
        if (!grouped.withLeague[leagueId]) {
          grouped.withLeague[leagueId] = {
            league: match.league,
            rounds: {}
          };
        }

        // Agrupar por jornada dentro de la liga
        const roundId = match.round_id || 'no-round';
        if (!grouped.withLeague[leagueId].rounds[roundId]) {
          grouped.withLeague[leagueId].rounds[roundId] = {
            round: match.roundInfo,
            matches: []
          };
        }
        grouped.withLeague[leagueId].rounds[roundId].matches.push(match);
      } else {
        // Partidos sin liga (amistosos)
        grouped.withoutLeague.push(match);
      }
    });

    return grouped;
  };

  const filteredTeams = getFilteredTeams();

  return (
    <View style={styles.container}>
      <AdminHeader 
        title={route?.params?.roundName 
          ? `Partidos - ${route.params.roundName}` 
          : "Gestión de Partidos"
        }
        subtitle={route?.params?.roundName 
          ? "Partidos de esta jornada" 
          : "Administrar encuentros deportivos"
        }
        onBack={() => navigation.goBack()}
      />

      {route?.params?.roundId && (
        <View style={styles.roundFilterBanner}>
          <View style={styles.roundFilterInfo}>
            <Ionicons name="filter" size={16} color={COLORS.primary} />
            <Text style={styles.roundFilterText}>
              Mostrando solo: {route.params.roundName}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              navigation.setParams({ roundId: undefined, roundName: undefined });
              setFormData(prev => ({ ...prev, round_id: '', league_id: '' }));
            }}
            style={styles.clearFilterButton}
          >
            <Ionicons name="close-circle" size={18} color={COLORS.error} />
            <Text style={styles.clearFilterText}>Limpiar filtro</Text>
          </TouchableOpacity>
        </View>
      )}

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
            placeholder="Buscar partido, equipo o liga..."
            placeholderTextColor={`${COLORS.white}40`}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{matches.length}</Text>
            <Text style={styles.statLabel}>PARTIDOS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{leagues.length}</Text>
            <Text style={styles.statLabel}>LIGAS</Text>
          </View>
        </View>

        {/* Matches List - Grouped by League */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>PARTIDOS PROGRAMADOS</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{filteredMatches.length}</Text>
            </View>
          </View>

          {filteredMatches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="football-outline" size={60} color={`${COLORS.primary}40`} />
              <Text style={styles.emptyStateText}>No hay partidos registrados</Text>
            </View>
          ) : (
            <>
              {/* Partidos con Liga */}
              {Object.entries(groupMatchesByLeagueAndRound().withLeague).map(([leagueId, { league, rounds }]) => {
                const isExpanded = expandedLeagues.has(leagueId);
                const totalMatches = Object.values(rounds).reduce((sum, r) => sum + r.matches.length, 0);
                
                return (
                  <View key={leagueId} style={styles.leagueGroup}>
                    {/* League Header - Clickable */}
                    <TouchableOpacity 
                      style={styles.leagueGroupHeader}
                      onPress={() => toggleLeague(leagueId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.leagueGroupInfo}>
                        <Ionicons 
                          name="trophy" 
                          size={20} 
                          color={COLORS.primary} 
                        />
                        <View style={styles.leagueGroupText}>
                          <Text style={styles.leagueGroupName}>{league?.name || 'Sin Liga'}</Text>
                          {league?.season && (
                            <Text style={styles.leagueGroupSeason}>{league.season}</Text>
                          )}
                        </View>
                      </View>
                      
                      <View style={styles.leagueGroupRight}>
                        <View style={styles.leagueMatchCount}>
                          <Text style={styles.leagueMatchCountText}>{totalMatches}</Text>
                        </View>
                        <Ionicons 
                          name={isExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color={COLORS.primary} 
                        />
                      </View>
                    </TouchableOpacity>

                    {/* Rounds and Matches - Collapsible */}
                    {isExpanded && (
                      <View style={styles.leagueMatches}>
                        {Object.entries(rounds).map(([roundId, { round, matches }]) => (
                          <View key={roundId} style={styles.roundSection}>
                            {/* Round Header */}
                            {roundId !== 'no-round' && round && (
                              <View style={styles.roundHeader}>
                                <Ionicons name="flag" size={14} color={COLORS.primary} />
                                <Text style={styles.roundName}>{round.name}</Text>
                                <View style={styles.roundMatchCount}>
                                  <Text style={styles.roundMatchCountText}>{matches.length}</Text>
                                </View>
                              </View>
                            )}
                            {roundId === 'no-round' && (
                              <View style={styles.roundHeader}>
                                <Ionicons name="disc-outline" size={14} color={COLORS.textSecondary} />
                                <Text style={[styles.roundName, { color: COLORS.textSecondary }]}>
                                  Sin Jornada
                                </Text>
                                <View style={styles.roundMatchCount}>
                                  <Text style={styles.roundMatchCountText}>{matches.length}</Text>
                                </View>
                              </View>
                            )}

                            {/* Matches in this Round */}
                            {matches.map((match) => (
                              <View key={match.id} style={styles.matchCard}>
                                {/* Teams Display */}
                                <View style={styles.teamsDisplay}>
                                  <View style={styles.team}>
                                    <View style={styles.teamLogo}>
                                      {getTeamLogo(match.home_team) ? (
                                        <Image 
                                          source={{ uri: getTeamLogo(match.home_team) }} 
                                          style={styles.logoImage} 
                                        />
                                      ) : (
                                        <Ionicons name="shield" size={28} color={COLORS.primary} />
                                      )}
                                    </View>
                                    <Text style={styles.teamName}>{match.home_team?.short_name || 'TBD'}</Text>
                                  </View>

                                  <View style={styles.vsContainer}>
                                    <Text style={styles.vsText}>VS</Text>
                                  </View>

                                  <View style={styles.team}>
                                    <View style={styles.teamLogo}>
                                      {getTeamLogo(match.away_team) ? (
                                        <Image 
                                          source={{ uri: getTeamLogo(match.away_team) }} 
                                          style={styles.logoImage} 
                                        />
                                      ) : (
                                        <Ionicons name="shield" size={28} color={COLORS.primary} />
                                      )}
                                    </View>
                                    <Text style={styles.teamName}>{match.away_team?.short_name || 'TBD'}</Text>
                                  </View>
                                </View>

                                {/* Match Info */}
                                <View style={styles.matchInfo}>
                                  <View style={styles.infoRow}>
                                    <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.infoText}>{formatDate(match.match_date)}</Text>
                                  </View>
                                  <View style={styles.infoRow}>
                                    <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                                    <Text style={styles.infoText}>{formatTime(match.match_date)}</Text>
                                  </View>
                                  {match.status === 'finished' && match.home_score !== null && (
                                    <View style={styles.infoRow}>
                                      <Ionicons name="trophy" size={16} color={COLORS.success} />
                                      <Text style={[styles.infoText, { color: COLORS.success, fontWeight: '700' }]}>
                                        {match.home_score} - {match.away_score}
                                      </Text>
                                    </View>
                                  )}
                                </View>

                                {/* Status Badge */}
                                {match.status === 'finished' && (
                                  <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>FINALIZADO</Text>
                                  </View>
                                )}

                                {/* Actions */}
                                <View style={styles.matchActions}>
                                  <TouchableOpacity 
                                    style={[styles.actionButton, styles.predictionsButton]}
                                    onPress={() => openPredictionsModal(match)}
                                  >
                                    <Ionicons name="people" size={20} color={COLORS.secondary} />
                                  </TouchableOpacity>
                                  {match.status !== 'finished' && (
                                    <TouchableOpacity 
                                      style={[styles.actionButton, styles.closeButton]}
                                      onPress={() => openCloseMatchModal(match)}
                                    >
                                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity 
                                    style={styles.actionButton}
                                    onPress={() => openEditModal(match)}
                                  >
                                    <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                                  </TouchableOpacity>
                                  <TouchableOpacity 
                                    style={styles.actionButton}
                                    onPress={() => openDeleteModal(match)}
                                  >
                                    <Ionicons name="trash-outline" size={20} color={COLORS.errorLight} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Partidos sin Liga (Amistosos) */}
              {groupMatchesByLeagueAndRound().withoutLeague.length > 0 && (
                <View style={styles.leagueGroup}>
                  <View style={styles.leagueGroupHeader}>
                    <View style={styles.leagueGroupInfo}>
                      <Ionicons 
                        name="hand-left-outline" 
                        size={20} 
                        color={COLORS.secondary} 
                      />
                      <View style={styles.leagueGroupText}>
                        <Text style={styles.leagueGroupName}>Partidos Amistosos</Text>
                        <Text style={styles.leagueGroupSeason}>Sin liga asociada</Text>
                      </View>
                    </View>
                    <View style={styles.leagueMatchCount}>
                      <Text style={styles.leagueMatchCountText}>
                        {groupMatchesByLeagueAndRound().withoutLeague.length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.leagueMatches}>
                    {groupMatchesByLeagueAndRound().withoutLeague.map((match) => (
                      <View key={match.id} style={styles.matchCard}>
                        {/* Teams Display */}
                        <View style={styles.teamsDisplay}>
                          <View style={styles.team}>
                            <View style={styles.teamLogo}>
                              {getTeamLogo(match.home_team) ? (
                                <Image 
                                  source={{ uri: getTeamLogo(match.home_team) }} 
                                  style={styles.logoImage} 
                                />
                              ) : (
                                <Ionicons name="shield" size={28} color={COLORS.primary} />
                              )}
                            </View>
                            <Text style={styles.teamName}>{match.home_team?.short_name || 'TBD'}</Text>
                          </View>

                          <View style={styles.vsContainer}>
                            <Text style={styles.vsText}>VS</Text>
                          </View>

                          <View style={styles.team}>
                            <View style={styles.teamLogo}>
                              {getTeamLogo(match.away_team) ? (
                                <Image 
                                  source={{ uri: getTeamLogo(match.away_team) }} 
                                  style={styles.logoImage} 
                                />
                              ) : (
                                <Ionicons name="shield" size={28} color={COLORS.primary} />
                              )}
                            </View>
                            <Text style={styles.teamName}>{match.away_team?.short_name || 'TBD'}</Text>
                          </View>
                        </View>

                        {/* Match Info */}
                        <View style={styles.matchInfo}>
                          <View style={styles.infoRow}>
                            <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.infoText}>{formatDate(match.match_date)}</Text>
                          </View>
                          <View style={styles.infoRow}>
                            <Ionicons name="time-outline" size={16} color={COLORS.primary} />
                            <Text style={styles.infoText}>{formatTime(match.match_date)}</Text>
                          </View>
                          {match.status === 'finished' && match.home_score !== null && (
                            <View style={styles.infoRow}>
                              <Ionicons name="trophy" size={16} color={COLORS.success} />
                              <Text style={[styles.infoText, { color: COLORS.success, fontWeight: '700' }]}>
                                {match.home_score} - {match.away_score}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Status Badge */}
                        {match.status === 'finished' && (
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>FINALIZADO</Text>
                          </View>
                        )}

                        {/* Actions */}
                        <View style={styles.matchActions}>
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.predictionsButton]}
                            onPress={() => openPredictionsModal(match)}
                          >
                            <Ionicons name="people" size={20} color={COLORS.secondary} />
                          </TouchableOpacity>
                          {match.status !== 'finished' && (
                            <TouchableOpacity 
                              style={[styles.actionButton, styles.closeButton]}
                              onPress={() => openCloseMatchModal(match)}
                            >
                              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => openEditModal(match)}
                          >
                            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={() => openDeleteModal(match)}
                          >
                            <Ionicons name="trash-outline" size={20} color={COLORS.errorLight} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
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

      {/* Create Match Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NUEVO PARTIDO</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>INFORMACIÓN DEL PARTIDO</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Liga *</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionScroll}
                  >
                    {leagues.map((league) => (
                      <TouchableOpacity
                        key={league.id}
                        style={[
                          styles.optionChip,
                          formData.league_id === league.id && styles.optionChipActive
                        ]}
                        onPress={() => setFormData({ 
                          ...formData, 
                          league_id: league.id,
                          round_id: '', // Reset round when league changes
                          home_team_id: '', // Reset teams when league changes
                          away_team_id: ''
                        })}
                      >
                        <Ionicons 
                          name="trophy" 
                          size={16} 
                          color={formData.league_id === league.id ? COLORS.backgroundDark : COLORS.primary} 
                        />
                        <Text style={[
                          styles.optionText,
                          formData.league_id === league.id && styles.optionTextActive
                        ]}>
                          {league.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {formData.league_id && filteredRounds.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Jornada (Opcional)</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.optionScroll}
                    >
                      <TouchableOpacity
                        style={[
                          styles.optionChip,
                          !formData.round_id && styles.optionChipActive
                        ]}
                        onPress={() => setFormData({ ...formData, round_id: '' })}
                      >
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={!formData.round_id ? COLORS.backgroundDark : COLORS.primary} 
                        />
                        <Text style={[
                          styles.optionText,
                          !formData.round_id && styles.optionTextActive
                        ]}>
                          Sin Jornada
                        </Text>
                      </TouchableOpacity>
                      {filteredRounds.map((round) => (
                        <TouchableOpacity
                          key={round.id}
                          style={[
                            styles.optionChip,
                            formData.round_id === round.id && styles.optionChipActive
                          ]}
                          onPress={() => setFormData({ ...formData, round_id: round.id })}
                        >
                          <Ionicons 
                            name="calendar" 
                            size={16} 
                            color={formData.round_id === round.id ? COLORS.backgroundDark : COLORS.primary} 
                          />
                          <Text style={[
                            styles.optionText,
                            formData.round_id === round.id && styles.optionTextActive
                          ]}>
                            {round.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {formData.league_id && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Equipo Local *</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.optionScroll}
                      >
                        {filteredTeams.map((team) => (
                          <TouchableOpacity
                            key={team.id}
                            style={[
                              styles.optionChip,
                              formData.home_team_id === team.id && styles.optionChipActive
                            ]}
                            onPress={() => setFormData({ ...formData, home_team_id: team.id })}
                            onLongPress={() => showTeamInfo(team)}
                          >
                            <Ionicons 
                              name="shield" 
                              size={16} 
                              color={formData.home_team_id === team.id ? COLORS.backgroundDark : COLORS.primary} 
                            />
                            <Text style={[
                              styles.optionText,
                              formData.home_team_id === team.id && styles.optionTextActive
                            ]}>
                              {team.short_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Equipo Visitante *</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.optionScroll}
                      >
                        {filteredTeams.map((team) => (
                          <TouchableOpacity
                            key={team.id}
                            style={[
                              styles.optionChip,
                              formData.away_team_id === team.id && styles.optionChipActive,
                              formData.home_team_id === team.id && styles.optionChipDisabled
                            ]}
                            onPress={() => setFormData({ ...formData, away_team_id: team.id })}
                            onLongPress={() => showTeamInfo(team)}
                            disabled={formData.home_team_id === team.id}
                          >
                            <Ionicons 
                              name="shield" 
                              size={16} 
                              color={
                                formData.home_team_id === team.id ? `${COLORS.white}30` :
                                formData.away_team_id === team.id ? COLORS.backgroundDark : 
                                COLORS.primary
                              } 
                            />
                            <Text style={[
                              styles.optionText,
                              formData.away_team_id === team.id && styles.optionTextActive,
                              formData.home_team_id === team.id && styles.optionTextDisabled
                            ]}>
                              {team.short_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </>
                )}

                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Fecha *</Text>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={openDatePicker}
                    >
                      <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.dateTimeButtonText}>
                        {formData.match_date || 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Hora *</Text>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={openTimePicker}
                    >
                      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.dateTimeButtonText}>
                        {formData.match_time || 'Seleccionar hora'}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                onPress={handleCreateMatch}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'CREANDO...' : 'CREAR PARTIDO'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Match Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDITAR PARTIDO</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formSection}>
                <Text style={styles.sectionTitle}>INFORMACIÓN DEL PARTIDO</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Liga *</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionScroll}
                  >
                    {leagues.map((league) => (
                      <TouchableOpacity
                        key={league.id}
                        style={[
                          styles.optionChip,
                          formData.league_id === league.id && styles.optionChipActive
                        ]}
                        onPress={() => setFormData({ 
                          ...formData, 
                          league_id: league.id,
                          round_id: '',
                          home_team_id: '',
                          away_team_id: ''
                        })}
                      >
                        <Ionicons 
                          name="trophy" 
                          size={16} 
                          color={formData.league_id === league.id ? COLORS.backgroundDark : COLORS.primary} 
                        />
                        <Text style={[
                          styles.optionText,
                          formData.league_id === league.id && styles.optionTextActive
                        ]}>
                          {league.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {formData.league_id && filteredRounds.length > 0 && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Jornada (Opcional)</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.optionScroll}
                    >
                      <TouchableOpacity
                        style={[
                          styles.optionChip,
                          !formData.round_id && styles.optionChipActive
                        ]}
                        onPress={() => setFormData({ ...formData, round_id: '' })}
                      >
                        <Ionicons 
                          name="close-circle" 
                          size={16} 
                          color={!formData.round_id ? COLORS.backgroundDark : COLORS.primary} 
                        />
                        <Text style={[
                          styles.optionText,
                          !formData.round_id && styles.optionTextActive
                        ]}>
                          Sin Jornada
                        </Text>
                      </TouchableOpacity>
                      {filteredRounds.map((round) => (
                        <TouchableOpacity
                          key={round.id}
                          style={[
                            styles.optionChip,
                            formData.round_id === round.id && styles.optionChipActive
                          ]}
                          onPress={() => setFormData({ ...formData, round_id: round.id })}
                        >
                          <Ionicons 
                            name="calendar" 
                            size={16} 
                            color={formData.round_id === round.id ? COLORS.backgroundDark : COLORS.primary} 
                          />
                          <Text style={[
                            styles.optionText,
                            formData.round_id === round.id && styles.optionTextActive
                          ]}>
                            {round.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {formData.league_id && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Equipo Local *</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.optionScroll}
                      >
                        {filteredTeams.map((team) => (
                          <TouchableOpacity
                            key={team.id}
                            style={[
                              styles.optionChip,
                              formData.home_team_id === team.id && styles.optionChipActive
                            ]}
                            onPress={() => setFormData({ ...formData, home_team_id: team.id })}
                            onLongPress={() => showTeamInfo(team)}
                          >
                            <Ionicons 
                              name="shield" 
                              size={16} 
                              color={formData.home_team_id === team.id ? COLORS.backgroundDark : COLORS.primary} 
                            />
                            <Text style={[
                              styles.optionText,
                              formData.home_team_id === team.id && styles.optionTextActive
                            ]}>
                              {team.short_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel}>Equipo Visitante *</Text>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        style={styles.optionScroll}
                      >
                        {filteredTeams.map((team) => (
                          <TouchableOpacity
                            key={team.id}
                            style={[
                              styles.optionChip,
                              formData.away_team_id === team.id && styles.optionChipActive,
                              formData.home_team_id === team.id && styles.optionChipDisabled
                            ]}
                            onPress={() => setFormData({ ...formData, away_team_id: team.id })}
                            onLongPress={() => showTeamInfo(team)}
                            disabled={formData.home_team_id === team.id}
                          >
                            <Ionicons 
                              name="shield" 
                              size={16} 
                              color={
                                formData.home_team_id === team.id ? `${COLORS.white}30` :
                                formData.away_team_id === team.id ? COLORS.backgroundDark : 
                                COLORS.primary
                              } 
                            />
                            <Text style={[
                              styles.optionText,
                              formData.away_team_id === team.id && styles.optionTextActive,
                              formData.home_team_id === team.id && styles.optionTextDisabled
                            ]}>
                              {team.short_name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </>
                )}

                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Fecha *</Text>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={openDatePicker}
                    >
                      <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.dateTimeButtonText}>
                        {formData.match_date || 'Seleccionar fecha'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Hora *</Text>
                    <TouchableOpacity
                      style={styles.dateTimeButton}
                      onPress={openTimePicker}
                    >
                      <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.dateTimeButtonText}>
                        {formData.match_time || 'Seleccionar hora'}
                      </Text>
                    </TouchableOpacity>
                  </View>
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
                onPress={handleUpdateMatch}
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

            <Text style={styles.deleteTitle}>¿Eliminar Partido?</Text>
            <Text style={styles.deleteMessage}>
              Esta acción no se puede deshacer. Todas las predicciones asociadas también serán eliminadas.
            </Text>

            {selectedMatch && (
              <View style={styles.deleteMatchCard}>
                <View style={styles.deleteMatchTeams}>
                  <Text style={styles.deleteMatchTeam}>
                    {selectedMatch.home_team?.short_name}
                  </Text>
                  <Text style={styles.deleteMatchVs}>VS</Text>
                  <Text style={styles.deleteMatchTeam}>
                    {selectedMatch.away_team?.short_name}
                  </Text>
                </View>
                <Text style={styles.deleteMatchDate}>
                  {formatDate(selectedMatch.match_date)} • {formatTime(selectedMatch.match_date)}
                </Text>
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
                onPress={handleDeleteMatch}
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

      {/* Team Info Modal */}
      <Modal
        visible={teamInfoModal.visible}
        animationType="fade"
        transparent={true}
        onRequestClose={closeTeamInfo}
      >
        <View style={styles.teamInfoOverlay}>
          <View style={styles.teamInfoModal}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeTeamInfo}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {teamInfoModal.team && (
              <>
                <View style={styles.teamInfoLogo}>
                  {getTeamLogo(teamInfoModal.team) ? (
                    <Image 
                      source={{ uri: getTeamLogo(teamInfoModal.team) }} 
                      style={styles.teamInfoLogoImage} 
                    />
                  ) : (
                    <Ionicons name="shield" size={60} color={COLORS.primary} />
                  )}
                </View>

                <Text style={styles.teamInfoName}>{teamInfoModal.team.name}</Text>
                
                <View style={styles.teamInfoDetails}>
                  <View style={styles.teamInfoRow}>
                    <Text style={styles.teamInfoLabel}>Código:</Text>
                    <Text style={styles.teamInfoValue}>{teamInfoModal.team.short_name}</Text>
                  </View>
                  
                  {teamInfoModal.team.country && (
                    <View style={styles.teamInfoRow}>
                      <Text style={styles.teamInfoLabel}>País:</Text>
                      <Text style={styles.teamInfoValue}>{teamInfoModal.team.country}</Text>
                    </View>
                  )}
                  
                  {teamInfoModal.team.sport && (
                    <View style={styles.teamInfoRow}>
                      <Text style={styles.teamInfoLabel}>Deporte:</Text>
                      <Text style={styles.teamInfoValue}>{teamInfoModal.team.sport.name}</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.teamInfoHint}>
                  <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                  {' '}Mantén presionado sobre un equipo para ver su información
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Close Match Modal */}
      <Modal
        visible={showCloseMatchModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCloseMatchModal(false)}
      >
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteModal}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowCloseMatchModal(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.deleteIconContainer}>
              <Ionicons name="checkmark-circle" size={40} color={COLORS.success} />
            </View>

            <Text style={styles.deleteTitle}>Cerrar Partido</Text>
            <Text style={styles.deleteMessage}>
              Ingresa el marcador final. Esto procesará automáticamente las predicciones de los usuarios.
            </Text>

            {selectedMatch && (
              <View style={styles.deleteMatchCard}>
                <View style={styles.deleteMatchTeams}>
                  <Text style={styles.deleteMatchTeam}>
                    {selectedMatch.home_team?.short_name}
                  </Text>
                  <Text style={styles.deleteMatchVs}>VS</Text>
                  <Text style={styles.deleteMatchTeam}>
                    {selectedMatch.away_team?.short_name}
                  </Text>
                </View>
                <Text style={styles.deleteMatchDate}>
                  {formatDate(selectedMatch.match_date)} • {formatTime(selectedMatch.match_date)}
                </Text>
              </View>
            )}

            <View style={styles.scoreInputRow}>
              <View style={styles.scoreInputGroup}>
                <Text style={styles.scoreInputLabel}>
                  {selectedMatch?.home_team?.short_name || 'Local'}
                </Text>
                <TextInput
                  style={styles.scoreInput}
                  value={closeMatchData.home_score.toString()}
                  onChangeText={(text) => setCloseMatchData({ ...closeMatchData, home_score: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={`${COLORS.white}40`}
                />
              </View>

              <Text style={styles.scoreSeparator}>-</Text>

              <View style={styles.scoreInputGroup}>
                <Text style={styles.scoreInputLabel}>
                  {selectedMatch?.away_team?.short_name || 'Visitante'}
                </Text>
                <TextInput
                  style={styles.scoreInput}
                  value={closeMatchData.away_score.toString()}
                  onChangeText={(text) => setCloseMatchData({ ...closeMatchData, away_score: text })}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={`${COLORS.white}40`}
                />
              </View>
            </View>

            <View style={styles.deleteActions}>
              <TouchableOpacity 
                style={styles.deleteCancelButton}
                onPress={() => setShowCloseMatchModal(false)}
              >
                <Text style={styles.deleteCancelText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteConfirmButton, { backgroundColor: COLORS.success }]}
                onPress={handleCloseMatch}
                disabled={loading}
              >
                <Text style={styles.deleteConfirmText}>
                  {loading ? 'PROCESANDO...' : 'CERRAR PARTIDO'}
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
                  <Ionicons name="people" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.predictionsModalTitle}>Predicciones</Text>
                <TouchableOpacity 
                  onPress={() => setShowPredictionsModal(false)}
                  style={styles.predictionsCloseButton}
                >
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {selectedMatch && (
                <View style={styles.predictionsMatchInfo}>
                  <View style={styles.predictionsTeamsRow}>
                    <Text style={styles.predictionsTeamName}>
                      {selectedMatch.home_team?.short_name}
                    </Text>
                    <View style={styles.predictionsVsContainer}>
                      <Text style={styles.predictionsVs}>VS</Text>
                    </View>
                    <Text style={styles.predictionsTeamName}>
                      {selectedMatch.away_team?.short_name}
                    </Text>
                  </View>
                  <View style={styles.predictionsMatchMeta}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.predictionsMatchDate}>
                      {formatDate(selectedMatch.match_date)}
                    </Text>
                    <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.predictionsMatchDate}>
                      {formatTime(selectedMatch.match_date)}
                    </Text>
                  </View>
                  {selectedMatch.status === 'finished' && (
                    <View style={styles.predictionsFinalScoreContainer}>
                      <Ionicons name="trophy" size={16} color={COLORS.success} />
                      <Text style={styles.predictionsFinalScore}>
                        Resultado Final: {selectedMatch.home_score} - {selectedMatch.away_score}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {predictionsStats && (
              <View style={styles.predictionStatsContainer}>
                <View style={styles.predictionStatsRow}>
                  <View style={styles.predictionStatBox}>
                    <Ionicons name="people-outline" size={18} color={COLORS.primary} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.predictionStatNumber}>{predictionsStats.total_predictions}</Text>
                      <Text style={styles.predictionStatLabel}>Total</Text>
                    </View>
                  </View>
                  <View style={[styles.predictionStatBox, styles.statBoxSuccess]}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                    <View style={styles.statTextContainer}>
                      <Text style={[styles.predictionStatNumber, { color: COLORS.success }]}>
                        {predictionsStats.correct}
                      </Text>
                      <Text style={styles.predictionStatLabel}>Acertadas</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.predictionStatsRow}>
                  <View style={[styles.predictionStatBox, styles.statBoxPrimary]}>
                    <Ionicons name="trophy" size={18} color={COLORS.primary} />
                    <View style={styles.statTextContainer}>
                      <Text style={[styles.predictionStatNumber, { color: COLORS.primary }]}>
                        {predictionsStats.total_points_awarded}
                      </Text>
                      <Text style={styles.predictionStatLabel}>Puntos</Text>
                    </View>
                  </View>
                  <View style={styles.predictionStatBox}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.predictionStatNumber}>{predictionsStats.pending || 0}</Text>
                      <Text style={styles.predictionStatLabel}>Pendientes</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            <ScrollView 
              style={styles.predictionsModalBody}
              contentContainerStyle={styles.scrollViewContent}
              showsVerticalScrollIndicator={true}
            >
              {loadingPredictions ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Cargando predicciones...</Text>
                </View>
              ) : predictions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={60} color={`${COLORS.primary}40`} />
                  <Text style={styles.emptyStateText}>No hay predicciones aún</Text>
                </View>
              ) : (
                <View style={styles.predictionsList}>
                  {predictions.map((prediction, index) => (
                    <View key={prediction.id} style={styles.predictionCard}>
                      <View style={styles.predictionCardInner}>
                        <View style={styles.predictionHeader}>
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
                                <Ionicons name="star" size={12} color={COLORS.primary} />
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
                                size={14} 
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

                        {prediction.is_processed && (
                          <View style={styles.predictionPointsContainer}>
                            <View style={styles.predictionPointsBox}>
                              <Ionicons name="trophy" size={18} color={COLORS.primary} />
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

      {/* Status Modal */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
      />

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
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
  matchCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 12,
    padding: 14,
  },
  leagueGroup: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  leagueGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 16,
    padding: 16,
  },
  leagueGroupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  leagueGroupText: {
    flex: 1,
  },
  leagueGroupName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  leagueGroupSeason: {
    fontSize: 12,
    color: `${COLORS.white}60`,
    fontWeight: '500',
  },
  leagueGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leagueMatchCount: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  leagueMatchCountText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.backgroundDark,
  },
  leagueMatches: {
    marginTop: 8,
    gap: 8,
  },
  leagueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}20`,
  },
  leagueName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  season: {
    fontSize: 11,
    color: `${COLORS.white}60`,
  },
  teamsDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
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
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  vsContainer: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  matchInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.primary}20`,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}20`,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  matchActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
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
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroup: {
    flex: 1,
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
  optionChipDisabled: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  optionTextActive: {
    color: COLORS.backgroundDark,
  },
  optionTextDisabled: {
    color: `${COLORS.white}30`,
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
    color: COLORS.backgroundDark,
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
  deleteMatchCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  deleteMatchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  deleteMatchTeam: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  deleteMatchVs: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  deleteMatchDate: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
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
  teamInfoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  teamInfoModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  teamInfoLogo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  teamInfoLogoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  teamInfoName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 24,
  },
  teamInfoDetails: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  teamInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  teamInfoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  teamInfoValue: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '700',
  },
  teamInfoHint: {
    fontSize: 12,
    color: `${COLORS.primary}80`,
    textAlign: 'center',
    lineHeight: 18,
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1f28',
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  dateTimeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
  // Round Section Styles
  roundSection: {
    marginBottom: 12,
  },
  roundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  roundName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  roundMatchCount: {
    backgroundColor: `${COLORS.primary}20`,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  roundMatchCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },
  // Round Filter Banner
  roundFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${COLORS.primary}10`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  roundFilterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  roundFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  clearFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: `${COLORS.error}15`,
    borderRadius: 8,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.error,
  },
  // Close Match Modal Styles
  statusBadge: {
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
    letterSpacing: 1,
  },
  closeButton: {
    backgroundColor: `${COLORS.success}15`,
  },
  scoreInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 24,
  },
  scoreInputGroup: {
    flex: 1,
    gap: 8,
  },
  scoreInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  scoreInput: {
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 2,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 12,
    padding: 16,
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreSeparator: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    marginTop: 24,
  },
  // Predictions Modal Styles
  predictionsButton: {
    backgroundColor: 'rgba(68, 128, 255, 0.09)',
  },
  predictionsModalContent: {
    width: '96%',
    maxWidth: 900,
    height: '92%',
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
  predictionsMatchInfo: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  predictionsTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  predictionsTeamName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  predictionsVsContainer: {
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  predictionsVs: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  predictionsMatchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  predictionsMatchDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  predictionsFinalScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(0, 230, 119, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  predictionsFinalScore: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.success,
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
  predictionsModalBody: {
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
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  predictionUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  userInfoText: {
    flex: 1,
  },
  predictionUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  userPointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  predictionUserPoints: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  predictionBadgeCorrect: {
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
  },
  predictionBadgeIncorrect: {
    backgroundColor: 'rgba(255, 113, 108, 0.12)',
  },
  predictionBadgeText: {
    fontSize: 12,
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
    gap: 16,
  },
  predictionScoreNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.white,
  },
  predictionScoreSeparator: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  predictionPointsContainer: {
    alignItems: 'center',
  },
  predictionPointsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  predictionPoints: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  loadingContainer: {
    paddingVertical: 40,
    paddingBottom: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

export default MatchManagement;
