export const MASTER_SPORTS_SCORE_RULES = {
  exact_score: 10,
  correct_winner: 5,
  correct_draw: 5,
  home_goal_bonus: 2,
  away_goal_bonus: 2,
};

export const SCORE_RULES_DISPLAY = [
  { label: 'Resultado exacto completo', pts: '10 pts', accent: 'primary' },
  { label: 'Ganador + goles local', pts: '7 pts', accent: 'primary' },
  { label: 'Ganador + goles visitante', pts: '7 pts', accent: 'primary' },
  { label: 'Solo ganador / empate', pts: '5 pts', accent: 'primary' },
  { label: 'Solo goles local o visitante', pts: '2 pts', accent: 'primary' },
  { label: 'Sin acierto', pts: '0 pts', accent: 'error' },
];

export const getDefaultScoreRules = () => ({ ...MASTER_SPORTS_SCORE_RULES });

export const formatScoringRules = (rules = {}) => ({
  ...MASTER_SPORTS_SCORE_RULES,
  ...rules,
});
