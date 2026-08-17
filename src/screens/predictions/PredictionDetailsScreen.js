import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { predictionService } from '../../services';
import { arePredictionsClosed } from '../../utils/predictions';

const PredictionDetailsScreen = ({ route, navigation }) => {
  const { predictionId } = route.params;
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrediction();
  }, [predictionId]);

  const loadPrediction = async () => {
    try {
      setLoading(true);
      const response = await predictionService.getPredictionById(predictionId);
      setPrediction(response.data.prediction);
    } catch (error) {
      console.error('Error loading prediction:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!prediction) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No se pudo cargar la predicción</Text>
      </View>
    );
  }

  const match = prediction.Match;
  const sport = match.Sport;
  const isProcessed = prediction.is_processed;
  const pointsEarned = prediction.points_earned || 0;

  const renderScoreComparison = () => (
    <View style={styles.comparisonCard}>
      <Text style={styles.comparisonTitle}>Comparación</Text>
      
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonColumn}>
          <Text style={styles.columnHeader}>Tu Predicción</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.teamName}>{match.HomeTeam.short_name}</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>{prediction.home_score}</Text>
            </View>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.teamName}>{match.AwayTeam.short_name}</Text>
            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>{prediction.away_score}</Text>
            </View>
          </View>
        </View>

        {isProcessed && (
          <View style={styles.comparisonColumn}>
            <Text style={[styles.columnHeader, styles.resultHeader]}>Resultado Real</Text>
            <View style={styles.scoreRow}>
              <Text style={styles.teamName}>{match.HomeTeam.short_name}</Text>
              <View style={[styles.scoreBox, styles.resultBox]}>
                <Text style={[styles.scoreText, styles.resultText]}>
                  {match.home_score}
                </Text>
              </View>
            </View>
            <View style={styles.scoreRow}>
              <Text style={styles.teamName}>{match.AwayTeam.short_name}</Text>
              <View style={[styles.scoreBox, styles.resultBox]}>
                <Text style={[styles.scoreText, styles.resultText]}>
                  {match.away_score}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  const renderPositionsComparison = () => {
    const predData = prediction.prediction_data || {};
    const resultData = match.result_data || {};

    return (
      <View style={styles.comparisonCard}>
        <Text style={styles.comparisonTitle}>Comparación</Text>
        
        {/* Pole Position */}
        <View style={styles.positionSection}>
          <Text style={styles.positionLabel}>🏁 Pole Position</Text>
          <View style={styles.positionRow}>
            <View style={styles.positionItem}>
              <Text style={styles.positionHeader}>Tu Predicción</Text>
              <Text style={styles.positionValue}>{predData.pole_position}</Text>
            </View>
            {isProcessed && (
              <View style={styles.positionItem}>
                <Text style={[styles.positionHeader, styles.resultHeader]}>Resultado</Text>
                <Text style={[styles.positionValue, styles.resultText]}>
                  {resultData.pole_position}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Podium */}
        <View style={styles.positionSection}>
          <Text style={styles.positionLabel}>🏆 Podio</Text>
          
          {[0, 1, 2].map((index) => {
            const medals = ['🥇', '🥈', '🥉'];
            const positions = ['1er', '2do', '3er'];
            return (
              <View key={index} style={styles.podiumRow}>
                <Text style={styles.medalIcon}>{medals[index]}</Text>
                <View style={styles.podiumComparison}>
                  <View style={styles.podiumItem}>
                    <Text style={styles.podiumPosition}>{positions[index]} Lugar</Text>
                    <Text style={styles.podiumDriver}>
                      {predData.podium?.[index] || 'N/A'}
                    </Text>
                  </View>
                  {isProcessed && (
                    <>
                      <Text style={styles.podiumArrow}>→</Text>
                      <View style={styles.podiumItem}>
                        <Text style={[styles.podiumDriver, styles.resultText]}>
                          {resultData.positions?.[index] || 'N/A'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Match Header */}
        <View style={styles.matchCard}>
          <View style={styles.sportBadge}>
            <Text style={styles.sportText}>{sport.name}</Text>
          </View>
          
          {sport.prediction_type === 'score' ? (
            <View style={styles.teamsContainer}>
              <Text style={styles.matchTeam}>{match.HomeTeam.name}</Text>
              <Text style={styles.vs}>vs</Text>
              <Text style={styles.matchTeam}>{match.AwayTeam.name}</Text>
            </View>
          ) : (
            <View style={styles.eventContainer}>
              <Text style={styles.eventName}>{match.location}</Text>
              <Text style={styles.eventRound}>{match.round}</Text>
            </View>
          )}

          <Text style={styles.matchDate}>
            {new Date(match.match_date).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>

        {/* Points Card */}
        <View style={[
          styles.pointsCard,
          isProcessed ? styles.pointsCardProcessed : styles.pointsCardPending
        ]}>
          {isProcessed ? (
            <>
              <Text style={styles.pointsCardTitle}>Puntos Ganados</Text>
              <Text style={[
                styles.pointsCardValue,
                pointsEarned > 0 ? styles.pointsPositive : styles.pointsZero
              ]}>
                {pointsEarned}
              </Text>
              {pointsEarned > 0 && (
                <Text style={styles.pointsCardSubtext}>¡Felicidades! 🎉</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.pointsCardTitle}>⏳ Esperando Resultado</Text>
              <Text style={styles.pointsCardSubtext}>
                Los puntos se calcularán cuando termine el partido
              </Text>
            </>
          )}
        </View>

        {/* Comparison */}
        {sport.prediction_type === 'score' 
          ? renderScoreComparison() 
          : renderPositionsComparison()
        }

        {/* Scoring Summary */}
        {isProcessed && pointsEarned > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>📊 Desglose de Puntos</Text>
            {sport.prediction_type === 'score' ? (
              <View>
                {prediction.home_score === match.home_score &&
                 prediction.away_score === match.away_score ? (
                  <Text style={styles.summaryText}>
                    ✅ Resultado exacto ({sport.scoring_rules.exact_score} pts)
                  </Text>
                ) : (
                  <>
                    {(() => {
                      const predR = prediction.home_score > prediction.away_score ? 'home' : (prediction.home_score < prediction.away_score ? 'away' : 'draw');
                      const actR = match.home_score > match.away_score ? 'home' : (match.home_score < match.away_score ? 'away' : 'draw');
                      return predR === actR ? (
                        <Text style={styles.summaryText}>
                          ✅ Ganador / empate ({sport.scoring_rules.correct_winner || sport.scoring_rules.correct_draw} pts)
                        </Text>
                      ) : null;
                    })()}
                    {prediction.home_score === match.home_score && (
                      <Text style={styles.summaryText}>
                        ✅ Goles local (+{sport.scoring_rules.home_goal_bonus || 2} pts)
                      </Text>
                    )}
                    {prediction.away_score === match.away_score && (
                      <Text style={styles.summaryText}>
                        ✅ Goles visitante (+{sport.scoring_rules.away_goal_bonus || 2} pts)
                      </Text>
                    )}
                  </>
                )}
              </View>
            ) : (
              <Text style={styles.summaryText}>
                Puntos obtenidos por predicciones correctas en el podio
              </Text>
            )}
          </View>
        )}

        {/* Edit Button (only if not processed and before match time) */}
        {!isProcessed && !arePredictionsClosed(match) && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('CreatePrediction', { matchId: match.id })}
          >
            <Text style={styles.editButtonText}>✏️ Editar Predicción</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SIZES.padding,
  },
  matchCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sportBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: SIZES.padding,
  },
  sportText: {
    color: COLORS.primary,
    ...FONTS.body3,
    fontWeight: 'bold',
  },
  teamsContainer: {
    alignItems: 'center',
    marginBottom: SIZES.padding * 0.8,
  },
  matchTeam: {
    color: COLORS.white,
    ...FONTS.h4,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vs: {
    color: COLORS.textGray,
    ...FONTS.body3,
    marginVertical: 4,
  },
  eventContainer: {
    alignItems: 'center',
    marginBottom: SIZES.padding * 0.8,
  },
  eventName: {
    color: COLORS.white,
    ...FONTS.h4,
    fontWeight: 'bold',
  },
  eventRound: {
    color: COLORS.textGray,
    ...FONTS.body4,
    marginTop: 4,
  },
  matchDate: {
    color: COLORS.textGray,
    ...FONTS.body3,
    textAlign: 'center',
  },
  pointsCard: {
    borderRadius: SIZES.radius,
    padding: SIZES.padding * 1.5,
    marginBottom: SIZES.padding,
    alignItems: 'center',
  },
  pointsCardProcessed: {
    backgroundColor: COLORS.primary + '15',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  pointsCardPending: {
    backgroundColor: COLORS.warning + '15',
    borderWidth: 2,
    borderColor: COLORS.warning,
  },
  pointsCardTitle: {
    color: COLORS.white,
    ...FONTS.body2,
    marginBottom: 8,
  },
  pointsCardValue: {
    ...FONTS.largeTitle,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pointsPositive: {
    color: COLORS.primary,
  },
  pointsZero: {
    color: COLORS.textGray,
  },
  pointsCardSubtext: {
    color: COLORS.textGray,
    ...FONTS.body4,
    textAlign: 'center',
  },
  comparisonCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  comparisonTitle: {
    color: COLORS.white,
    ...FONTS.h4,
    fontWeight: 'bold',
    marginBottom: SIZES.padding,
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonColumn: {
    flex: 1,
    marginHorizontal: 4,
  },
  columnHeader: {
    color: COLORS.textGray,
    ...FONTS.body4,
    marginBottom: 12,
    textAlign: 'center',
  },
  resultHeader: {
    color: COLORS.primary,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  teamName: {
    color: COLORS.white,
    ...FONTS.body4,
    flex: 1,
  },
  scoreBox: {
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 40,
    alignItems: 'center',
  },
  resultBox: {
    borderColor: COLORS.primary,
  },
  scoreText: {
    color: COLORS.white,
    ...FONTS.h4,
    fontWeight: 'bold',
  },
  resultText: {
    color: COLORS.primary,
  },
  positionSection: {
    marginBottom: SIZES.padding * 1.5,
  },
  positionLabel: {
    color: COLORS.primary,
    ...FONTS.body2,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  positionItem: {
    flex: 1,
    alignItems: 'center',
  },
  positionHeader: {
    color: COLORS.textGray,
    ...FONTS.body4,
    marginBottom: 8,
  },
  positionValue: {
    color: COLORS.white,
    ...FONTS.body3,
    fontWeight: 'bold',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 8,
    padding: 12,
  },
  medalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  podiumComparison: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  podiumItem: {
    flex: 1,
  },
  podiumPosition: {
    color: COLORS.textGray,
    ...FONTS.body4,
    marginBottom: 4,
  },
  podiumDriver: {
    color: COLORS.white,
    ...FONTS.body3,
    fontWeight: 'bold',
  },
  podiumArrow: {
    color: COLORS.textGray,
    ...FONTS.body2,
    marginHorizontal: 8,
  },
  summaryCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  summaryTitle: {
    color: COLORS.primary,
    ...FONTS.body2,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryText: {
    color: COLORS.white,
    ...FONTS.body3,
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.black,
    ...FONTS.h4,
    fontWeight: 'bold',
  },
  errorText: {
    color: COLORS.error,
    ...FONTS.body2,
  },
});

export default PredictionDetailsScreen;
