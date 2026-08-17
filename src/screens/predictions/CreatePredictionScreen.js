import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import { predictionService, matchService } from '../../services';
import StatusModal from '../../components/StatusModal';
import { BASE_URL } from '../../constants/config';
import { formatScoringRules } from '../../constants/scoring';
import { arePredictionsClosed, PREDICTIONS_CLOSED_MESSAGE } from '../../utils/predictions';

const CreatePredictionScreen = ({ route, navigation }) => {
  const { matchId } = route.params;
  const insets = useSafeAreaInsets();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userPrediction, setUserPrediction] = useState(null);

  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [polePosition, setPolePosition] = useState('');
  const [podiumFirst, setPodiumFirst] = useState('');
  const [podiumSecond, setPodiumSecond] = useState('');
  const [podiumThird, setPodiumThird] = useState('');

  useEffect(() => {
    loadMatch();
  }, [matchId]);

  const loadMatch = async () => {
    try {
      setLoading(true);
      const response = await matchService.getMatchById(matchId);
      const matchData = response.data.match;
      const existingPred = response.data.user_prediction;
      setMatch(matchData);

      if (existingPred) {
        setUserPrediction(existingPred);
        const predType = matchData.sport?.prediction_type;
        const data = existingPred.prediction_data || {};
        if (predType === 'score') {
          setHomeScore(data.home_score?.toString() ?? '');
          setAwayScore(data.away_score?.toString() ?? '');
        } else if (predType === 'positions') {
          setPolePosition(data.pole_position || '');
          setPodiumFirst(data.podium?.[0] || data.position_1 || '');
          setPodiumSecond(data.podium?.[1] || data.position_2 || '');
          setPodiumThird(data.podium?.[2] || data.position_3 || '');
        }
      } else {
        setUserPrediction(null);
        setHomeScore('');
        setAwayScore('');
        setPolePosition('');
        setPodiumFirst('');
        setPodiumSecond('');
        setPodiumThird('');
      }
    } catch (error) {
      console.error('Error loading match:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'No se pudo cargar el partido',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!match) return;
    if (arePredictionsClosed(match)) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Predicciones cerradas',
        message: PREDICTIONS_CLOSED_MESSAGE,
      });
      return;
    }
    const sport = match.sport;

    if (sport.prediction_type === 'score') {
      if (homeScore === '' || awayScore === '') {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Campos requeridos',
          message: 'Ingresa el marcador de ambos equipos',
        });
        return;
      }
      if (parseInt(homeScore, 10) < 0 || parseInt(awayScore, 10) < 0) {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Error',
          message: 'Los marcadores no pueden ser negativos',
        });
        return;
      }
    } else if (sport.prediction_type === 'positions') {
      if (!polePosition || !podiumFirst || !podiumSecond || !podiumThird) {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Campos requeridos',
          message: 'Completa todas las posiciones',
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload =
        sport.prediction_type === 'score'
          ? {
              prediction_data: {
                home_score: parseInt(homeScore, 10),
                away_score: parseInt(awayScore, 10),
              },
            }
          : {
              prediction_data: {
                pole_position: polePosition,
                podium: [podiumFirst, podiumSecond, podiumThird],
              },
            };

      if (userPrediction?.id) {
        await predictionService.updatePrediction(userPrediction.id, payload);
      } else {
        await predictionService.createPrediction({
          match_id: matchId,
          ...payload,
        });
      }

      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Predicción guardada',
        message: userPrediction
          ? 'Tu predicción se actualizó correctamente'
          : 'Tu predicción se registró correctamente',
      });
      await loadMatch();
    } catch (error) {
      console.error('Error creating prediction:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo guardar la predicción',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatMatchDate = (dateString) =>
    new Date(dateString).toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const formatMatchTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getTeamLogo = (team) => {
    if (!team?.logo) return null;
    if (team.logo.startsWith('file://') || team.logo.startsWith('http')) return team.logo;
    return `${BASE_URL}${team.logo}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No se pudo cargar el partido</Text>
      </View>
    );
  }

  const sport = match.sport;
  const isLocked = arePredictionsClosed(match);
  const rules = formatScoringRules(sport?.scoring_rules);
  const isScore = sport?.prediction_type === 'score';

  const renderScoreForm = () => (
    <View style={styles.scoreForm}>
      <View style={styles.scoreInputGroup}>
        <Text style={styles.inputLabel} numberOfLines={1}>
          {match.home_team?.short_name || match.home_team?.name || 'Local'}
        </Text>
        <TextInput
          style={styles.scoreInput}
          value={homeScore}
          onChangeText={(v) => setHomeScore(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.25)"
          maxLength={2}
          selectTextOnFocus
        />
      </View>
      <Text style={styles.scoreSeparator}>-</Text>
      <View style={styles.scoreInputGroup}>
        <Text style={styles.inputLabel} numberOfLines={1}>
          {match.away_team?.short_name || match.away_team?.name || 'Visitante'}
        </Text>
        <TextInput
          style={styles.scoreInput}
          value={awayScore}
          onChangeText={(v) => setAwayScore(v.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor="rgba(255,255,255,0.25)"
          maxLength={2}
          selectTextOnFocus
        />
      </View>
    </View>
  );

  const renderPositionsForm = () => (
    <View style={styles.positionsForm}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Pole position</Text>
        <TextInput
          style={styles.textInput}
          value={polePosition}
          onChangeText={setPolePosition}
          placeholder="Piloto"
          placeholderTextColor="rgba(255,255,255,0.3)"
        />
      </View>
      <Text style={styles.formSectionTitle}>Podio</Text>
      {[
        { label: '1.er lugar', value: podiumFirst, set: setPodiumFirst },
        { label: '2.º lugar', value: podiumSecond, set: setPodiumSecond },
        { label: '3.er lugar', value: podiumThird, set: setPodiumThird },
      ].map((field) => (
        <View key={field.label} style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{field.label}</Text>
          <TextInput
            style={styles.textInput}
            value={field.value}
            onChangeText={field.set}
            placeholder="Piloto"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />
        </View>
      ))}
    </View>
  );

  const renderRules = () =>
    isScore ? (
      <View style={styles.rulesList}>
        <Text style={styles.ruleRow}>Resultado exacto: {rules.exact_score} pts</Text>
        <Text style={styles.ruleRow}>Ganador / empate: {rules.correct_winner} pts</Text>
        <Text style={styles.ruleRow}>Goles local exactos: +{rules.home_goal_bonus} pts</Text>
        <Text style={styles.ruleRow}>Goles visitante exactos: +{rules.away_goal_bonus} pts</Text>
      </View>
    ) : (
      <View style={styles.rulesList}>
        <Text style={styles.ruleRow}>Podio exacto: {sport.scoring_rules?.exact_podium || 0} pts</Text>
        <Text style={styles.ruleRow}>Posición correcta: {sport.scoring_rules?.correct_position || 0} pts</Text>
        <Text style={styles.ruleRow}>Pole position: {sport.scoring_rules?.pole_position || 0} pts</Text>
      </View>
    );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLeague} numberOfLines={1}>
            {match.league?.name || sport?.name}
          </Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {isScore
              ? `${match.home_team?.short_name || 'Local'} vs ${match.away_team?.short_name || 'Visitante'}`
              : match.location || 'Evento'}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.matchCard}>
          {isScore ? (
            <View style={styles.teamsRow}>
              <View style={styles.teamSection}>
                <View style={styles.teamLogo}>
                  {getTeamLogo(match.home_team) ? (
                    <Image source={{ uri: getTeamLogo(match.home_team) }} style={styles.logoImage} />
                  ) : (
                    <Text style={styles.teamLogoText}>{match.home_team?.short_name || 'LOC'}</Text>
                  )}
                </View>
                <Text style={styles.teamNameCard} numberOfLines={2}>
                  {match.home_team?.name || 'Local'}
                </Text>
              </View>
              <View style={styles.vsSection}>
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{formatMatchTime(match.match_date)}</Text>
                </View>
              </View>
              <View style={styles.teamSection}>
                <View style={styles.teamLogo}>
                  {getTeamLogo(match.away_team) ? (
                    <Image source={{ uri: getTeamLogo(match.away_team) }} style={styles.logoImage} />
                  ) : (
                    <Text style={styles.teamLogoText}>{match.away_team?.short_name || 'VIS'}</Text>
                  )}
                </View>
                <Text style={styles.teamNameCard} numberOfLines={2}>
                  {match.away_team?.name || 'Visitante'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.eventInfo}>
              <Text style={styles.eventTitle}>{match.location || 'Gran Premio'}</Text>
              {match.roundInfo?.name ? (
                <Text style={styles.eventSubtitle}>{match.roundInfo.name}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.matchDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{formatMatchDate(match.match_date)}</Text>
            </View>
            {match.roundInfo?.name ? (
              <View style={styles.detailRow}>
                <Ionicons name="flag-outline" size={14} color={COLORS.primary} />
                <Text style={[styles.detailText, styles.detailHighlight]}>{match.roundInfo.name}</Text>
              </View>
            ) : null}
            {match.location && isScore ? (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{match.location}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {isLocked ? (
          <View style={styles.lockedCard}>
            <Ionicons name="lock-closed" size={20} color={COLORS.warning} />
            <Text style={styles.lockedText}>Las predicciones están cerradas para este partido</Text>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {userPrediction ? 'Actualizar predicción' : 'Hacer predicción'}
            </Text>
            <Text style={styles.formSubtitle}>
              Ingresa tu pronóstico antes de que cierre el partido
            </Text>

            {isScore ? renderScoreForm() : renderPositionsForm()}

            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>Sistema de puntos</Text>
              {renderRules()}
            </View>
          </View>
        )}

        {userPrediction ? (
          <View style={styles.existingCard}>
            <Text style={styles.existingTitle}>Tu predicción actual</Text>
            {isScore ? (
              <View style={styles.existingScoreRow}>
                <Text style={styles.existingScore}>
                  {userPrediction.prediction_data?.home_score ?? '—'}
                </Text>
                <Text style={styles.existingSep}>-</Text>
                <Text style={styles.existingScore}>
                  {userPrediction.prediction_data?.away_score ?? '—'}
                </Text>
              </View>
            ) : (
              <Text style={styles.existingMeta}>
                Pole: {userPrediction.prediction_data?.pole_position || '—'}
              </Text>
            )}
            {userPrediction.is_processed ? (
              <View style={styles.pointsRow}>
                <Text
                  style={[
                    styles.pointsText,
                    (userPrediction.points_earned || 0) > 0
                      ? styles.pointsPositive
                      : styles.pointsNegative,
                  ]}
                >
                  {(userPrediction.points_earned || 0) > 0 ? '+' : ''}
                  {userPrediction.points_earned || 0} pts
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {match.status === 'finished' && isScore && match.home_score != null ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Resultado final</Text>
            <View style={styles.existingScoreRow}>
              <Text style={styles.existingScore}>{match.home_score}</Text>
              <Text style={styles.existingSep}>-</Text>
              <Text style={styles.existingScore}>{match.away_score}</Text>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {!isLocked ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.primary, '#00b85a']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.backgroundDark} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {userPrediction ? 'Actualizar predicción' : 'Guardar predicción'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : null}

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
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}15`,
  },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerLeague: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 2,
  },
  scrollContent: { padding: 16 },
  matchCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  teamSection: { flex: 1, alignItems: 'center', gap: 8 },
  teamLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1a1f28',
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamLogoText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  logoImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  teamNameCard: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  vsSection: { alignItems: 'center', paddingHorizontal: 10, gap: 6 },
  vsText: { fontSize: 18, fontWeight: '900', color: COLORS.primary },
  timeBadge: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  eventInfo: { alignItems: 'center', marginBottom: 12 },
  eventTitle: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  eventSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  matchDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
    gap: 8,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: COLORS.textSecondary },
  detailHighlight: { color: COLORS.primary, fontWeight: '600' },
  lockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(234,179,8,0.12)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(234,179,8,0.3)',
    marginBottom: 14,
  },
  lockedText: { flex: 1, fontSize: 14, color: COLORS.warning, fontWeight: '600' },
  formCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}18`,
  },
  formTitle: { fontSize: 17, fontWeight: '800', color: COLORS.white, marginBottom: 4 },
  formSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 20 },
  scoreForm: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  scoreInputGroup: { alignItems: 'center', gap: 10, flex: 1 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  scoreInput: {
    backgroundColor: '#1a1f28',
    color: COLORS.primary,
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    width: '100%',
    maxWidth: 88,
    height: 80,
    padding: 0,
    ...(Platform.OS === 'android' ? { includeFontPadding: false, textAlignVertical: 'center' } : {}),
  },
  scoreSeparator: { fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.25)' },
  positionsForm: { marginBottom: 16, gap: 4 },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 8,
  },
  inputGroup: { marginBottom: 12 },
  textInput: {
    backgroundColor: '#1a1f28',
    color: COLORS.white,
    fontSize: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 6,
  },
  rulesCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}15`,
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  rulesList: { gap: 4 },
  ruleRow: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  existingCard: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  existingTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 10 },
  existingScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  existingScore: { fontSize: 32, fontWeight: '900', color: COLORS.white },
  existingSep: { fontSize: 24, color: COLORS.textSecondary },
  existingMeta: { fontSize: 14, color: COLORS.white },
  pointsRow: { marginTop: 10, alignItems: 'center' },
  pointsText: { fontSize: 16, fontWeight: '800' },
  pointsPositive: { color: COLORS.primary },
  pointsNegative: { color: '#ef4444' },
  resultCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: 10,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.backgroundDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  submitButton: { borderRadius: 14, overflow: 'hidden' },
  submitButtonDisabled: { opacity: 0.6 },
  submitGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.backgroundDark,
  },
  errorText: { fontSize: 15, color: '#ef4444' },
});

export default CreatePredictionScreen;
