import api from './api';

const tournamentService = {
  // Listar todos los torneos disponibles
  listTournaments: () => api.get('/tournaments'),

  // Obtener detalle de un torneo
  getTournament: (id) => api.get(`/tournaments/${id}`),

  // Unirse a un torneo público
  joinTournament: (id, accessCode = null) =>
    api.post(`/tournaments/${id}/join`, accessCode ? { access_code: accessCode } : {}),

  // Unirse a torneo privado por código
  joinByCode: (code) => api.post('/tournaments/join-by-code', { code }),

  // Partidos del torneo (con predicción del usuario)
  getMatches: (id, { phase, group } = {}) => {
    const params = {};
    if (phase) params.phase = phase;
    if (group) params.group = group;
    return api.get(`/tournaments/${id}/matches`, { params });
  },

  // Guardar predicción de partido
  predictMatch: (tournamentId, matchId, homeScore, awayScore) =>
    api.post(`/tournaments/${tournamentId}/predict/${matchId}`, {
      home_score: homeScore,
      away_score: awayScore
    }),

  // Menciones especiales (Campeón / Sub / 3ro)
  getSpecialPrediction: (id) => api.get(`/tournaments/${id}/special-prediction`),
  saveSpecialPrediction: (id, { championTeamId, runnerUpTeamId, thirdPlaceTeamId }) =>
    api.post(`/tournaments/${id}/special-prediction`, {
      champion_team_id: championTeamId,
      runner_up_team_id: runnerUpTeamId,
      third_place_team_id: thirdPlaceTeamId
    }),

  // Tabla de posiciones
  getLeaderboard: (id, limit = 50, offset = 0) =>
    api.get(`/tournaments/${id}/leaderboard`, { params: { limit, offset } }),

  // Grupos (informativo)
  getGroups: (id) => api.get(`/tournaments/${id}/groups`),

  // Mis predicciones
  getMyPredictions: (id) => api.get(`/tournaments/${id}/my-predictions`),

  // Participantes
  getParticipants: (id) => api.get(`/tournaments/${id}/participants`),

  // ADMIN
  createTournament: (data) => api.post('/tournaments', data),
  updateStatus: (id, data) => api.put(`/tournaments/${id}/status`, data),
  submitMatchResult: (tournamentId, matchId, homeScore, awayScore) =>
    api.post(`/tournaments/${tournamentId}/matches/${matchId}/result`, {
      home_score: homeScore,
      away_score: awayScore
    }),
  removeParticipant: (tournamentId, userId) =>
    api.delete(`/tournaments/${tournamentId}/participants/${userId}`),
  processSpecials: (id, { championTeamId, runnerUpTeamId, thirdPlaceTeamId }) =>
    api.post(`/tournaments/${id}/process-specials`, {
      champion_team_id: championTeamId,
      runner_up_team_id: runnerUpTeamId,
      third_place_team_id: thirdPlaceTeamId
    })
};

export default tournamentService;
