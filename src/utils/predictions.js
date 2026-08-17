/**
 * Indica si ya llegó la hora del partido (no se puede crear ni editar predicción).
 */
export const isMatchTimeReached = (matchDate) => {
  if (!matchDate) return false;
  return Date.now() >= new Date(matchDate).getTime();
};

/**
 * Indica si las predicciones están cerradas para un partido.
 * Solo se cierran al llegar la hora del partido (no por lock_date del backend).
 */
export const arePredictionsClosed = (match) => {
  if (!match) return true;
  if (match.predictions_locked) return true;
  if (isMatchTimeReached(match.match_date)) return true;
  if (match.status && match.status !== 'scheduled') return true;
  return false;
};

export const PREDICTIONS_CLOSED_MESSAGE =
  'Ya no puedes crear ni editar predicciones: el partido ya empezó o está por empezar.';
