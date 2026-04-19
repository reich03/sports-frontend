import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { predictionService } from '../../services';

const PredictionsScreen = ({ navigation }) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, processed

  useEffect(() => {
    loadPredictions();
  }, [filter]);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const response = await predictionService.getMyPredictions({ 
        status: filter === 'all' ? undefined : filter,
        limit: 50 
      });
      setPredictions(response.data.predictions || []);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPredictions();
    setRefreshing(false);
  }, [filter]);

  const renderFilterTab = (label, value) => (
    <TouchableOpacity
      style={[styles.filterTab, filter === value && styles.filterTabActive]}
      onPress={() => setFilter(value)}
    >
      <Text style={[
        styles.filterTabText,
        filter === value && styles.filterTabTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPredictionCard = ({ item }) => {
    const match = item.match || item.Match;
    const sport = match?.sport || match?.Sport;
    const league = match?.roundInfo?.league || match?.Round?.League;
    const round = match?.roundInfo || match?.Round;
    const isProcessed = item.is_processed;
    const pointsEarned = item.points_earned || 0;
    const isCorrect = item.is_correct;

    return (
      <View style={styles.predictionCard}>
        {/* Header: Sport, League, Round */}
        <View style={styles.cardHeader}>
          <View style={styles.sportBadge}>
            <Ionicons 
              name={sport?.name === 'Fútbol' ? 'football' : sport?.name === 'Fórmula 1' ? 'speedometer' : 'trophy'} 
              size={14} 
              color={COLORS.primary} 
            />
            <Text style={styles.sportText}>{sport?.name || 'N/A'}</Text>
          </View>
          {isProcessed && (
            <View style={[
              styles.statusBadge,
              isCorrect ? styles.statusBadgeCorrect : styles.statusBadgeIncorrect
            ]}>
              <Ionicons 
                name={isCorrect ? 'checkmark-circle' : 'close-circle'} 
                size={14} 
                color={isCorrect ? '#22c55e' : '#ef4444'} 
              />
              <Text style={[
                styles.statusText,
                isCorrect ? styles.statusTextCorrect : styles.statusTextIncorrect
              ]}>
                {isCorrect ? 'Acertada' : 'Fallada'}
              </Text>
            </View>
          )}
        </View>

        {/* League and Round Info */}
        <View style={styles.leagueInfo}>
          <Text style={styles.leagueName}>{league?.name || 'Liga'}</Text>
          <Text style={styles.roundName}> • {round?.name || 'Jornada'}</Text>
        </View>

        {/* Match Date */}
        <Text style={styles.matchDate}>
          {new Date(match?.match_date).toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>

        {/* Teams or Event Name */}
        {sport?.prediction_type === 'score' ? (
          <View style={styles.teamsContainer}>
            <View style={styles.teamRow}>
              <Text style={styles.teamName} numberOfLines={1}>
                {match?.home_team?.name || match?.HomeTeam?.name || 'Local'}
              </Text>
              <View style={styles.scoresRow}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Tu predicción</Text>
                  <Text style={styles.scoreText}>{item.prediction_data?.home_score ?? '-'}</Text>
                </View>
                {isProcessed && match?.home_score !== null && (
                  <View style={[styles.scoreBox, styles.finalScoreBox]}>
                    <Text style={styles.scoreLabel}>Final</Text>
                    <Text style={[styles.scoreText, styles.finalScoreText]}>
                      {match?.home_score ?? '-'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.teamRow}>
              <Text style={styles.teamName} numberOfLines={1}>
                {match?.away_team?.name || match?.AwayTeam?.name || 'Visitante'}
              </Text>
              <View style={styles.scoresRow}>
                <View style={styles.scoreBox}>
                  <Text style={styles.scoreLabel}>Tu predicción</Text>
                  <Text style={styles.scoreText}>{item.prediction_data?.away_score ?? '-'}</Text>
                </View>
                {isProcessed && match?.away_score !== null && (
                  <View style={[styles.scoreBox, styles.finalScoreBox]}>
                    <Text style={styles.scoreLabel}>Final</Text>
                    <Text style={[styles.scoreText, styles.finalScoreText]}>
                      {match?.away_score ?? '-'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.eventContainer}>
            <Text style={styles.eventName}>
              {match?.location || 'Gran Premio'}
            </Text>
            <Text style={styles.eventRound}>{match?.round || 'Carrera F1'}</Text>
            
            {/* F1 Podium Prediction */}
            <View style={styles.podiumContainer}>
              <View style={styles.podiumSection}>
                <Text style={styles.podiumTitle}>Tu Podio Predicho:</Text>
                <View style={styles.podiumList}>
                  <Text style={styles.podiumItem}>🥇 {item.prediction_data?.position_1 || 'N/A'}</Text>
                  <Text style={styles.podiumItem}>🥈 {item.prediction_data?.position_2 || 'N/A'}</Text>
                  <Text style={styles.podiumItem}>🥉 {item.prediction_data?.position_3 || 'N/A'}</Text>
                </View>
              </View>
              
              {isProcessed && (match?.position_1 || match?.position_2 || match?.position_3) && (
                <View style={styles.podiumSection}>
                  <Text style={styles.podiumTitle}>Podio Real:</Text>
                  <View style={styles.podiumList}>
                    <Text style={[styles.podiumItem, styles.finalPodiumItem]}>
                      🥇 {match?.position_1 || 'N/A'}
                    </Text>
                    <Text style={[styles.podiumItem, styles.finalPodiumItem]}>
                      🥈 {match?.position_2 || 'N/A'}
                    </Text>
                    <Text style={[styles.podiumItem, styles.finalPodiumItem]}>
                      🥉 {match?.position_3 || 'N/A'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Result Status */}
        <View style={styles.resultContainer}>
          {isProcessed ? (
            <View style={styles.resultRow}>
              <View style={styles.pointsInfo}>
                <Text style={styles.pointsLabel}>Puntos ganados</Text>
                <View style={styles.pointsValueContainer}>
                  <Ionicons name="trophy" size={20} color={pointsEarned > 0 ? COLORS.primary : COLORS.textGray} />
                  <Text style={[
                    styles.pointsValue,
                    pointsEarned > 0 ? styles.pointsPositive : styles.pointsZero
                  ]}>
                    {pointsEarned}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Ionicons name="time-outline" size={16} color={COLORS.warning} />
              <Text style={styles.pendingText}>Pendiente de resultado</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(10, 14, 20, 0.95)" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="football" size={24} color={COLORS.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Mis Predicciones</Text>
            <Text style={styles.headerSubtitle}>Historial completo</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {renderFilterTab('Todas', 'all')}
        {renderFilterTab('Pendientes', 'pending')}
        {renderFilterTab('Finalizadas', 'processed')}
      </View>

      {/* Predictions List */}
      {predictions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes predicciones</Text>
          <Text style={styles.emptySubtext}>
            Ve a la pestaña Inicio para hacer tu primera predicción
          </Text>
        </View>
      ) : (
        <FlatList
          data={predictions}
          renderItem={renderPredictionCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 16 : 60,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 255, 140, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151a21',
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#a8abb3',
    fontWeight: '600',
    marginTop: 2,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: SIZES.padding,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SIZES.padding * 0.6,
    alignItems: 'center',
    borderRadius: SIZES.radius,
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    color: COLORS.textGray,
    ...FONTS.body3,
  },
  filterTabTextActive: {
    color: COLORS.black,
    fontWeight: 'bold',
  },
  listContainer: {
    padding: SIZES.padding,
  },
  predictionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.padding * 0.5,
  },
  sportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sportText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeCorrect: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusBadgeIncorrect: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusTextCorrect: {
    color: '#22c55e',
  },
  statusTextIncorrect: {
    color: '#ef4444',
  },
  leagueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  leagueName: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  roundName: {
    color: COLORS.textGray,
    fontSize: 13,
    fontWeight: '600',
  },
  matchDate: {
    color: COLORS.textGray,
    fontSize: 12,
    marginBottom: SIZES.padding * 0.8,
  },
  teamsContainer: {
    marginBottom: SIZES.padding * 0.8,
    gap: 12,
  },
  teamRow: {
    gap: 8,
  },
  teamName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 8,
  },
  scoreBox: {
    backgroundColor: COLORS.backgroundDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    minWidth: 70,
    alignItems: 'center',
  },
  scoreLabel: {
    color: COLORS.textGray,
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 2,
  },
  scoreText: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  finalScoreBox: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  finalScoreText: {
    color: '#22c55e',
  },
  eventContainer: {
    marginBottom: SIZES.padding * 0.8,
  },
  eventName: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  eventRound: {
    color: COLORS.textGray,
    fontSize: 12,
    marginBottom: 12,
  },
  podiumContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  podiumSection: {
    flex: 1,
  },
  podiumTitle: {
    color: COLORS.textGray,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  podiumList: {
    gap: 6,
  },
  podiumItem: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  finalPodiumItem: {
    color: '#22c55e',
  },
  resultContainer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.padding * 0.8,
    marginTop: SIZES.padding * 0.4,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    color: COLORS.textGray,
    fontSize: 12,
    marginBottom: 4,
  },
  pointsValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pointsPositive: {
    color: COLORS.primary,
  },
  pointsZero: {
    color: COLORS.textGray,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pendingText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.padding * 2,
  },
  emptyText: {
    color: COLORS.white,
    ...FONTS.h3,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: COLORS.textGray,
    ...FONTS.body3,
    textAlign: 'center',
  },
});

export default PredictionsScreen;
