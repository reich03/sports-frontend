import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { predictionService } from '../../services';
import { COLORS } from '../../constants/theme';
import { BASE_URL } from '../../constants/config';
import StatusModal from '../../components/StatusModal';
import { arePredictionsClosed, PREDICTIONS_CLOSED_MESSAGE } from '../../utils/predictions';

const CreateRoundPredictionScreen = ({ route, navigation }) => {
  const { matches, roundName, leagueName } = route.params;
  const [predictions, setPredictions] = useState(
    matches.reduce((acc, match) => ({
      ...acc,
      [match.id]: { homeScore: '', awayScore: '' }
    }), {})
  );
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const [successModal, setSuccessModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const updateScore = (matchId, team, value) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value
      }
    }));
  };

  const getTeamLogo = (team) => {
    if (!team?.logo) return null;
    if (team.logo.startsWith('file://') || team.logo.startsWith('http')) {
      return team.logo;
    }
    return `${BASE_URL}${team.logo}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openMatches = matches.filter((m) => !arePredictionsClosed(m));

  const validatePredictions = () => {
    for (const match of openMatches) {
      const { homeScore, awayScore } = predictions[match.id] || {};
      if (homeScore === '' || awayScore === '') {
        return false;
      }
      if (isNaN(homeScore) || isNaN(awayScore)) {
        return false;
      }
      if (homeScore < 0 || awayScore < 0) {
        return false;
      }
    }
    return openMatches.length > 0;
  };

  const handleSubmit = async () => {
    if (openMatches.length === 0) {
      setErrorModal({
        visible: true,
        title: 'Predicciones cerradas',
        message: PREDICTIONS_CLOSED_MESSAGE,
      });
      return;
    }
    if (!validatePredictions()) {
      setErrorModal({
        visible: true,
        title: 'Predicciones Incompletas',
        message: 'Debes completar los marcadores de todos los partidos de la jornada.',
      });
      return;
    }

    setLoading(true);
    try {
      // Create all predictions
      const predictionPromises = openMatches.map((match) => {
        const scores = predictions[match.id];
        return predictionService.createPrediction({
          match_id: match.id,
          prediction_data: {
            home_score: parseInt(scores.homeScore, 10),
            away_score: parseInt(scores.awayScore, 10),
          },
        });
      });

      await Promise.all(predictionPromises);

      setSuccessModal({
        visible: true,
        title: '¡Jornada Completa!',
        message: `Has registrado exitosamente las predicciones de todos los partidos de ${roundName}.`,
      });
    } catch (error) {
      console.error('Error creating predictions:', error);
      const errorMessage = error.response?.data?.error?.message || 'No pudimos guardar tus predicciones. Intenta de nuevo.';
      setErrorModal({
        visible: true,
        title: 'Error al Guardar',
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompletedCount = () =>
    openMatches.filter((m) => {
      const p = predictions[m.id];
      return p?.homeScore !== '' && p?.awayScore !== '';
    }).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(10, 14, 20, 0.95)" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{roundName}</Text>
          <Text style={styles.headerSubtitle}>{leagueName}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoBoxHeader}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.infoBoxTitle}>Predicción de Jornada Completa</Text>
            </View>
            <Text style={styles.infoBoxText}>
              Completa los marcadores de los {openMatches.length} partidos disponibles de esta jornada.
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${openMatches.length ? (getCompletedCount() / openMatches.length) * 100 : 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {getCompletedCount()} de {openMatches.length} completados
            </Text>
          </View>

          {/* Matches */}
          {matches.map((match, index) => {
            const matchClosed = arePredictionsClosed(match);
            return (
            <View key={match.id} style={[styles.matchCard, matchClosed && styles.matchCardClosed]}>
              {/* Match Number */}
              <View style={styles.matchNumber}>
                <Text style={styles.matchNumberText}>Partido {index + 1}</Text>
                <Text style={styles.matchDate}>{formatDate(match.match_date)}</Text>
              </View>

              {/* Teams */}
              <View style={styles.teamsRow}>
                {/* Home Team */}
                <View style={styles.teamSection}>
                  <View style={styles.teamLogo}>
                    {getTeamLogo(match.home_team) ? (
                      <Image 
                        source={{ uri: getTeamLogo(match.home_team) }} 
                        style={styles.logoImage} 
                      />
                    ) : (
                      <Text style={styles.teamLogoText}>
                        {match.home_team?.short_name || 'HOM'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.teamName} numberOfLines={2}>
                    {match.home_team?.name || 'Home Team'}
                  </Text>
                </View>

                {/* Score Inputs */}
                <View style={styles.scoreSection}>
                  <TextInput
                    style={[styles.scoreInput, matchClosed && styles.scoreInputDisabled]}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    value={predictions[match.id]?.homeScore}
                    onChangeText={(value) => updateScore(match.id, 'homeScore', value)}
                    editable={!matchClosed}
                  />
                  <Text style={styles.scoreSeparator}>-</Text>
                  <TextInput
                    style={[styles.scoreInput, matchClosed && styles.scoreInputDisabled]}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    value={predictions[match.id]?.awayScore}
                    onChangeText={(value) => updateScore(match.id, 'awayScore', value)}
                    editable={!matchClosed}
                  />
                </View>

                {/* Away Team */}
                <View style={styles.teamSection}>
                  <View style={styles.teamLogo}>
                    {getTeamLogo(match.away_team) ? (
                      <Image 
                        source={{ uri: getTeamLogo(match.away_team) }} 
                        style={styles.logoImage} 
                      />
                    ) : (
                      <Text style={styles.teamLogoText}>
                        {match.away_team?.short_name || 'AWA'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.teamName} numberOfLines={2}>
                    {match.away_team?.name || 'Away Team'}
                  </Text>
                </View>
              </View>

              {matchClosed ? (
                <View style={styles.closedBadge}>
                  <Ionicons name="lock-closed" size={14} color={COLORS.warning} />
                  <Text style={styles.closedText}>Predicciones cerradas</Text>
                </View>
              ) : predictions[match.id]?.homeScore !== '' && predictions[match.id]?.awayScore !== '' ? (
                <View style={styles.completedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.completedText}>Completado</Text>
                </View>
              ) : null}
            </View>
            );
          })}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.backgroundDark} />
            ) : (
              <>
                <Ionicons name="flash" size={20} color={COLORS.backgroundDark} />
                <Text style={styles.submitButtonText}>
                  ENVIAR {openMatches.length} PREDICCIONES
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Modal */}
      <StatusModal
        visible={errorModal.visible}
        type="error"
        title={errorModal.title}
        message={errorModal.message}
        primaryButtonText="Entendido"
        onPrimaryPress={() => setErrorModal({ ...errorModal, visible: false })}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />

      {/* Success Modal */}
      <StatusModal
        visible={successModal.visible}
        type="success"
        title={successModal.title}
        message={successModal.message}
        primaryButtonText="Ver Mis Predicciones"
        secondaryButtonText="Volver"
        onPrimaryPress={() => {
          setSuccessModal({ ...successModal, visible: false });
          navigation.navigate('Predictions');
        }}
        onSecondaryPress={() => {
          setSuccessModal({ ...successModal, visible: false });
          navigation.goBack();
        }}
        onClose={() => {
          setSuccessModal({ ...successModal, visible: false });
          navigation.goBack();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  infoBox: {
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoBoxTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  infoBoxText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0, 230, 119, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  matchCardClosed: {
    opacity: 0.65,
    borderColor: 'rgba(234, 179, 8, 0.25)',
  },
  matchNumber: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.1)',
  },
  matchNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  matchDate: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  teamLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  teamName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreInput: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    textAlign: 'center',
  },
  scoreInputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  scoreSeparator: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 230, 119, 0.1)',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.success,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(234, 179, 8, 0.2)',
  },
  closedText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 18,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.backgroundDark,
    letterSpacing: 0.5,
  },
});

export default CreateRoundPredictionScreen;
