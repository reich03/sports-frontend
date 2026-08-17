import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../constants/config';

export const authService = {
  register: async (email, username, password) => {
    const response = await api.post('/auth/register', { email, username, password });
    return response.data;
  },
  
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  verifyOTP: async (email, otp) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },
  
  resendOTP: async (email) => {
    const response = await api.post('/auth/resend-otp', { email });
    return response.data;
  },
  
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  
  resetPassword: async (email, otp, password) => {
    const response = await api.post('/auth/reset-password', { email, otp, password });
    return response.data;
  },
  
  changePassword: async (currentPassword, newPassword) => {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const predictionService = {
  createPrediction: async (predictionData) => {
    const response = await api.post('/predictions', predictionData);
    return response.data;
  },
  
  getMyPredictions: async (params) => {
    const response = await api.get('/predictions/my-predictions', { params });
    return response.data;
  },
  
  getPredictionById: async (predictionId) => {
    const response = await api.get(`/predictions/${predictionId}`);
    return response.data;
  },
  
  updatePrediction: async (predictionId, predictionData) => {
    const response = await api.put(`/predictions/${predictionId}`, predictionData);
    return response.data;
  },
  
  getPredictionsByMatch: async (matchId) => {
    const response = await api.get(`/predictions/match/${matchId}`);
    return response.data;
  },
};

export const groupService = {
  createGroup: async (groupData) => {
    const response = await api.post('/groups', groupData);
    return response.data;
  },
  
  getMyGroups: async () => {
    const response = await api.get('/groups/my-groups');
    return response.data;
  },
  
  getGroupById: async (groupId) => {
    const response = await api.get(`/groups/${groupId}`);
    return response.data;
  },
  
  joinGroup: async (code) => {
    const response = await api.post(`/groups/${code}/join`, { code });
    return response.data;
  },
  
  leaveGroup: async (groupId) => {
    const response = await api.post(`/groups/${groupId}/leave`);
    return response.data;
  },
  
  getGroupRanking: async (groupId) => {
    const response = await api.get(`/groups/${groupId}/ranking`);
    return response.data;
  },
};

export const rankingService = {
  getGlobalRanking: async (params) => {
    const response = await api.get('/rankings/global', { params });
    return response.data;
  },
  
  getRankingBySport: async (params) => {
    const response = await api.get('/rankings/sport', { params });
    return response.data;
  },
  
  getRankingByLeague: async (params) => {
    const response = await api.get('/rankings/league', { params });
    return response.data;
  },
  
  getRankingByRound: async (params) => {
    const response = await api.get('/rankings/round', { params });
    return response.data;
  },
};

export const notificationService = {
  getNotifications: async (params) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  
  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },
};

export const sportService = {
  getAllSports: async () => {
    const response = await api.get('/sports');
    return response.data;
  },
  
  getSports: async () => {
    const response = await api.get('/sports');
    return response.data;
  },
  
  getSportById: async (sportId) => {
    const response = await api.get(`/sports/${sportId}`);
    return response.data;
  },
  
  createSport: async (sportData) => {
    const response = await api.post('/sports', sportData);
    return response.data;
  },
  
  updateSport: async (sportId, sportData) => {
    const response = await api.put(`/sports/${sportId}`, sportData);
    return response.data;
  },
  
  deleteSport: async (sportId) => {
    const response = await api.delete(`/sports/${sportId}`);
    return response.data;
  },
};

export const leagueService = {
  getAllLeagues: async () => {
    const response = await api.get('/leagues');
    return response.data;
  },
  
  getLeagues: async (params) => {
    const response = await api.get('/leagues', { params });
    return response.data;
  },
  
  getLeagueById: async (leagueId) => {
    const response = await api.get(`/leagues/${leagueId}`);
    return response.data;
  },
  
  getLeaguesBySport: async (sportId) => {
    const response = await api.get(`/leagues/sport/${sportId}`);
    return response.data;
  },
  
  createLeague: async (leagueData) => {
    const response = await api.post('/leagues', leagueData);
    return response.data;
  },
  
  updateLeague: async (leagueId, leagueData) => {
    const response = await api.put(`/leagues/${leagueId}`, leagueData);
    return response.data;
  },
  
  deleteLeague: async (leagueId) => {
    const response = await api.delete(`/leagues/${leagueId}`);
    return response.data;
  },
};

export const teamService = {
  getAllTeams: async () => {
    const response = await api.get('/teams');
    return response.data;
  },
  
  getTeamById: async (teamId) => {
    const response = await api.get(`/teams/${teamId}`);
    return response.data;
  },
  
  getTeamsBySport: async (sportId) => {
    const response = await api.get(`/teams/sport/${sportId}`);
    return response.data;
  },

  getTeamsByLeague: async (leagueId) => {
    const response = await api.get(`/teams/league/${leagueId}`);
    return response.data;
  },
  
  createTeam: async (teamData) => {
    const response = await api.post('/teams', teamData);
    return response.data;
  },
  
  updateTeam: async (teamId, teamData) => {
    const response = await api.put(`/teams/${teamId}`, teamData);
    return response.data;
  },
  
  deleteTeam: async (teamId) => {
    const response = await api.delete(`/teams/${teamId}`);
    return response.data;
  },

  uploadTeamLogo: async (teamId, imageUri) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const formData = new FormData();
      
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('logo', {
        uri: imageUri,
        name: `${Date.now()}-${filename}`,
        type: type,
      });

      const response = await fetch(`${CONFIG.apiUrl}/teams/${teamId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Error al subir el logo');
      }

      return data;
    } catch (error) {
      console.error('Error uploading team logo:', error);
      throw error;
    }
  },

  deleteTeamLogo: async (teamId) => {
    const response = await api.delete(`/teams/${teamId}/logo`);
    return response.data;
  },
};

export const matchService = {
  getMatches: async (params) => {
    const response = await api.get('/matches', { params });
    return response.data;
  },
  
  getMatchById: async (matchId) => {
    const response = await api.get(`/matches/${matchId}`);
    return response.data;
  },
  
  getUpcomingMatches: async (params) => {
    const response = await api.get('/matches/upcoming', { params });
    return response.data;
  },
  
  createMatch: async (matchData) => {
    const response = await api.post('/matches', matchData);
    return response.data;
  },
  
  updateMatch: async (matchId, matchData) => {
    const response = await api.put(`/matches/${matchId}`, matchData);
    return response.data;
  },
  
  deleteMatch: async (matchId) => {
    const response = await api.delete(`/matches/${matchId}`);
    return response.data;
  },
  
  submitMatchResult: async (matchId, resultData) => {
    const response = await api.post(`/matches/${matchId}/result`, resultData);
    return response.data;
  },
  
  getMatchPredictions: async (matchId, params) => {
    const response = await api.get(`/matches/${matchId}/predictions`, { params });
    return response.data;
  },
};
export const userService = {
  getAllUsers: async (params) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  
  getUserProfile: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
  
  updateUserProfile: async (userId, userData) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },
  
  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },
  
  getUserStats: async (userId) => {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },
  
  updateUserRole: async (userId, role) => {
    const response = await api.put(`/users/${userId}/role`, { role });
    return response.data;
  },
  
  uploadAvatar: async (userId, imageUri) => {
    try {
      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No se encontró el token de autenticación');
      }

      // Validar que la URI existe y es válida
      if (!imageUri || !imageUri.startsWith('file://')) {
        throw new Error('URI de imagen inválida');
      }

      const formData = new FormData();
      
      // Crear el objeto de archivo compatible con React Native
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      // Generar nombre único para evitar conflictos de caché
      const uniqueFilename = `${Date.now()}-${filename}`;
      
      formData.append('avatar', {
        uri: imageUri,
        name: uniqueFilename,
        type: type,
      });
      
      console.log('📸 Subiendo avatar:', { userId, filename: uniqueFilename, type, uri: imageUri.substring(0, 50) });
      
      // Usar fetch nativo que funciona mejor con FormData en React Native
      const response = await fetch(`${CONFIG.apiUrl}/users/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // NO establecer Content-Type, fetch lo hará automáticamente con boundary correcto
        },
        body: formData,
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || `Error del servidor: ${response.status}`);
        } else {
          const errorText = await response.text();
          throw new Error(`Error del servidor: ${response.status} - ${errorText.substring(0, 100)}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Avatar subido exitosamente');
      return data;
    } catch (error) {
      console.error('❌ Error en uploadAvatar:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  },
  
  deleteAvatar: async (userId) => {
    const response = await api.delete(`/users/${userId}/avatar`);
    return response.data;
  },
};

export const roundService = {
  getAllRounds: async () => {
    const response = await api.get('/rounds');
    return response.data;
  },
  
  getRounds: async (params) => {
    const response = await api.get('/rounds', { params });
    return response.data;
  },
  
  getRoundById: async (roundId) => {
    const response = await api.get(`/rounds/${roundId}`);
    return response.data;
  },
  
  getRoundsByLeague: async (leagueId) => {
    const response = await api.get(`/rounds/league/${leagueId}`);
    return response.data;
  },
  
  createRound: async (roundData) => {
    const response = await api.post('/rounds', roundData);
    return response.data;
  },
  
  updateRound: async (roundId, roundData) => {
    const response = await api.put(`/rounds/${roundId}`, roundData);
    return response.data;
  },
  
  deleteRound: async (roundId) => {
    const response = await api.delete(`/rounds/${roundId}`);
    return response.data;
  },
  
  closeRound: async (roundId) => {
    const response = await api.post(`/rounds/${roundId}/close`);
    return response.data;
  },
  
  getRoundPredictions: async (roundId, params) => {
    const response = await api.get(`/rounds/${roundId}/predictions`, { params });
    return response.data;
  },
};

// ── F1: Pilotos ───────────────────────────────────────────────────────────
export const driverService = {
  getAllDrivers: async (params) => {
    const response = await api.get('/drivers', { params });
    return response.data;
  },

  getDriverById: async (driverId) => {
    const response = await api.get(`/drivers/${driverId}`);
    return response.data;
  },

  createDriver: async (driverData) => {
    const response = await api.post('/drivers', driverData);
    return response.data;
  },

  updateDriver: async (driverId, driverData) => {
    const response = await api.put(`/drivers/${driverId}`, driverData);
    return response.data;
  },

  deleteDriver: async (driverId) => {
    const response = await api.delete(`/drivers/${driverId}`);
    return response.data;
  },

  uploadDriverPhoto: async (driverId, imageUri) => {
    const token = await AsyncStorage.getItem('userToken');
    const formData = new FormData();
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('photo', {
      uri: imageUri,
      name: `${Date.now()}-${filename}`,
      type,
    });
    const response = await fetch(`${CONFIG.apiUrl}/drivers/${driverId}/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Error al subir la foto');
    return data;
  },

  deleteDriverPhoto: async (driverId) => {
    const response = await api.delete(`/drivers/${driverId}/photo`);
    return response.data;
  },
};

// ── F1: Eventos y predicciones ────────────────────────────────────────────
export const f1EventService = {
  getEvents: async (params) => {
    const response = await api.get('/f1-events', { params });
    return response.data;
  },

  getEventById: async (eventId) => {
    const response = await api.get(`/f1-events/${eventId}`);
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await api.post('/f1-events', eventData);
    return response.data;
  },

  updateEvent: async (eventId, eventData) => {
    const response = await api.put(`/f1-events/${eventId}`, eventData);
    return response.data;
  },

  deleteEvent: async (eventId) => {
    const response = await api.delete(`/f1-events/${eventId}`);
    return response.data;
  },

  getEventDrivers: async (eventId) => {
    const response = await api.get(`/f1-events/${eventId}/drivers`);
    return response.data;
  },

  setEventDrivers: async (eventId, driversIds) => {
    const response = await api.put(`/f1-events/${eventId}/drivers`, { drivers_ids: driversIds });
    return response.data;
  },

  getEventResult: async (eventId) => {
    const response = await api.get(`/f1-events/${eventId}/result`);
    return response.data;
  },

  upsertEventResult: async (eventId, resultData) => {
    const response = await api.put(`/f1-events/${eventId}/result`, resultData);
    return response.data;
  },

  getMyPrediction: async (eventId) => {
    const response = await api.get(`/f1-events/${eventId}/my-prediction`);
    return response.data;
  },

  upsertMyPrediction: async (eventId, predictionData) => {
    const response = await api.put(`/f1-events/${eventId}/my-prediction`, predictionData);
    return response.data;
  },

  getEventLeaderboard: async (eventId) => {
    const response = await api.get(`/f1-events/${eventId}/leaderboard`);
    return response.data;
  },
};