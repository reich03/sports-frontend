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
  Modal,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../../constants/theme';
import { predictionService, matchService } from '../../services';
import StatusModal from '../../components/StatusModal';
import { BASE_URL } from '../../constants/config';

const CreatePredictionScreen = ({ route, navigation }) => {
  const { matchId } = route.params;
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('stats'); 
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [userPrediction, setUserPrediction] = useState(null);

  // Status Modal
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
      setMatch(response.data.match);
      
      // Check if user already has a prediction
      if (response.data.match.userPrediction) {
        const pred = response.data.match.userPrediction;
        setUserPrediction(pred);
        
        if (response.data.match.sport.prediction_type === 'score') {
          const data = pred.prediction_data || {};
          setHomeScore(data.home_score?.toString() || '');
          setAwayScore(data.away_score?.toString() || '');
        } else if (response.data.match.sport.prediction_type === 'positions') {
          const data = pred.prediction_data || {};
          setPolePosition(data.pole_position || '');
          setPodiumFirst(data.podium?.[0] || '');
          setPodiumSecond(data.podium?.[1] || '');
          setPodiumThird(data.podium?.[2] || '');
        }
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

    const sport = match.sport;
    
    // Validate inputs
    if (sport.prediction_type === 'score') {
      if (homeScore === '' || awayScore === '') {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Campos Requeridos',
          message: 'Por favor ingresa ambos marcadores',
        });
        return;
      }
      if (parseInt(homeScore) < 0 || parseInt(awayScore) < 0) {
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
          title: 'Campos Requeridos',
          message: 'Por favor completa todas las posiciones',
        });
        return;
      }
    }

    try {
      setSubmitting(true);

      const predictionData = sport.prediction_type === 'score' 
        ? {
            match_id: matchId,
            prediction_data: {
              home_score: parseInt(homeScore),
              away_score: parseInt(awayScore),
            },
          }
        : {
            match_id: matchId,
            prediction_data: {
              pole_position: polePosition,
              podium: [podiumFirst, podiumSecond, podiumThird],
            },
          };

      await predictionService.createPrediction(predictionData);
      
      setShowPredictionModal(false);
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Predicción Guardada!',
        message: userPrediction ? 'Tu predicción ha sido actualizada correctamente' : 'Tu predicción ha sido registrada correctamente',
      });
      
      // Reload match data to get updated prediction
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

  const formatMatchDate = (dateString) => {
    const date = new Date(dateString);
    const options = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    };
    return date.toLocaleDateString('es-ES', options);
  };

  const formatMatchTime = (dateString) => {
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
  const isLocked = match.predictions_locked || new Date(match.lock_date) < new Date();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(10, 14, 20, 0.95)" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerLeague}>{match.league?.name || sport.name}</Text>
          <Text style={styles.headerTitle}>
            {sport.prediction_type === 'score' 
              ? `${match.home_team?.name || 'TBD'} vs ${match.away_team?.name || 'TBD'}`
              : match.location || 'Evento'}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Match Card */}
        <View style={styles.matchCardContainer}>
          <LinearGradient
            colors={['rgba(0, 230, 119, 0.2)', 'rgba(15, 35, 25, 0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.matchCard}
          >
            {sport.prediction_type === 'score' ? (
              <View style={styles.teamsRow}>
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
                  <Text style={styles.teamNameCard}>{match.home_team?.name || 'Home'}</Text>
                </View>

                <View style={styles.vsSection}>
                  <Text style={styles.vsTextLarge}>VS</Text>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>{formatMatchTime(match.match_date)}</Text>
                  </View>
                </View>

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
                  <Text style={styles.teamNameCard}>{match.away_team?.name || 'Away'}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{match.location}</Text>
                <Text style={styles.eventSubtitle}>{match.round}</Text>
              </View>
            )}

            <View style={styles.matchDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                <Text style={styles.detailText}>{formatMatchDate(match.match_date)}</Text>
              </View>
              {match.roundInfo?.name && (
                <View style={styles.detailRow}>
                  <Ionicons name="flag-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.detailText, { color: COLORS.primary, fontWeight: '600' }]}>
                    {match.roundInfo.name}
                  </Text>
                </View>
              )}
              {match.location && sport.prediction_type === 'score' && (
                <View style={styles.detailRow}>
                  <Ionicons name="location-outline" size={16} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={styles.detailText}>{match.location}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'stats' && styles.tabActive]}
            onPress={() => setActiveTab('stats')}
          >
            <Text style={[styles.tabText, activeTab === 'stats' && styles.tabTextActive]}>
              Estadísticas
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'h2h' && styles.tabActive]}
            onPress={() => setActiveTab('h2h')}
          >
            <Text style={[styles.tabText, activeTab === 'h2h' && styles.tabTextActive]}>
              H2H
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'lineups' && styles.tabActive]}
            onPress={() => setActiveTab('lineups')}
          >
            <Text style={[styles.tabText, activeTab === 'lineups' && styles.tabTextActive]}>
              Alineaciones
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'predictions' && styles.tabActive]}
            onPress={() => setActiveTab('predictions')}
          >
            <Text style={[styles.tabText, activeTab === 'predictions' && styles.tabTextActive]}>
              Predicciones
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Sections */}
        <View style={styles.content}>
          {activeTab === 'stats' && (
            <>
              {/* Win Probability */}
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="analytics" size={22} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Probabilidad de Victoria</Text>
                </View>
                
                <View style={styles.probabilityCard}>
                  <View style={styles.probabilityBar}>
                    <View style={[styles.probabilitySegment, { width: '45%', backgroundColor: COLORS.primary }]} />
                    <View style={[styles.probabilitySegment, { width: '20%', backgroundColor: '#64748b' }]} />
                    <View style={[styles.probabilitySegment, { width: '35%', backgroundColor: 'rgba(0, 230, 119, 0.4)' }]} />
                  </View>
                  
                  <View style={styles.probabilityLabels}>
                    <View style={styles.probabilityItem}>
                      <Text style={styles.probabilityTeam}>
                        {match.home_team?.name || 'Local'}
                      </Text>
                      <Text style={styles.probabilityValue}>45%</Text>
                    </View>
                    <View style={styles.probabilityItemCenter}>
                      <Text style={styles.probabilityTeamDraw}>Empate</Text>
                      <Text style={styles.probabilityValue}>20%</Text>
                    </View>
                    <View style={styles.probabilityItemRight}>
                      <Text style={styles.probabilityTeam}>
                        {match.away_team?.name || 'Visitante'}
                      </Text>
                      <Text style={styles.probabilityValue}>35%</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Key Statistics */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Estadísticas Clave (Promedio)</Text>
                
                {/* Possession */}
                <View style={styles.statRow}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statValue}>48%</Text>
                    <Text style={styles.statLabel}>POSESIÓN</Text>
                    <Text style={styles.statValue}>52%</Text>
                  </View>
                  <View style={styles.statBar}>
                    <View style={[styles.statBarSegment, { width: '48%', backgroundColor: COLORS.primary }]} />
                    <View style={[styles.statBarSegment, { width: '52%', backgroundColor: 'rgba(0, 230, 119, 0.3)' }]} />
                  </View>
                </View>

                {/* Shots on Goal */}
                <View style={styles.statRow}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statValue}>6.2</Text>
                    <Text style={styles.statLabel}>REMATES A PUERTA</Text>
                    <Text style={styles.statValue}>5.8</Text>
                  </View>
                  <View style={styles.statBar}>
                    <View style={[styles.statBarSegment, { width: '55%', backgroundColor: COLORS.primary }]} />
                    <View style={[styles.statBarSegment, { width: '45%', backgroundColor: 'rgba(0, 230, 119, 0.3)' }]} />
                  </View>
                </View>

                {/* Corners */}
                <View style={styles.statRow}>
                  <View style={styles.statHeader}>
                    <Text style={styles.statValue}>5</Text>
                    <Text style={styles.statLabel}>CÓRNERS</Text>
                    <Text style={styles.statValue}>7</Text>
                  </View>
                  <View style={styles.statBar}>
                    <View style={[styles.statBarSegment, { width: '40%', backgroundColor: COLORS.primary }]} />
                    <View style={[styles.statBarSegment, { width: '60%', backgroundColor: 'rgba(0, 230, 119, 0.3)' }]} />
                  </View>
                </View>
              </View>

              {/* H2H Preview */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Cara a Cara (H2H)</Text>
                
                <View style={styles.h2hCard}>
                  <View style={styles.h2hRow}>
                    <Text style={styles.h2hDate}>14/01/24</Text>
                    <Text style={styles.h2hResult}>RMA 4 - 1 BAR</Text>
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultBadgeText}>G</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.h2hCard}>
                  <View style={styles.h2hRow}>
                    <Text style={styles.h2hDate}>28/10/23</Text>
                    <Text style={styles.h2hResult}>BAR 1 - 2 RMA</Text>
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultBadgeText}>G</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.h2hCard}>
                  <View style={styles.h2hRow}>
                    <Text style={styles.h2hDate}>05/04/23</Text>
                    <Text style={styles.h2hResult}>BAR 0 - 4 RMA</Text>
                    <View style={styles.resultBadge}>
                      <Text style={styles.resultBadgeText}>G</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

          {activeTab === 'h2h' && (
            <View style={styles.section}>
              <Text style={styles.centerText}>Historial completo próximamente</Text>
            </View>
          )}

          {activeTab === 'lineups' && (
            <View style={styles.section}>
              <Text style={styles.centerText}>Alineaciones próximamente</Text>
            </View>
          )}

          {activeTab === 'predictions' && (
            <View style={styles.section}>
              <Text style={styles.centerText}>Predicciones de otros usuarios próximamente</Text>
            </View>
          )}
        </View>

        {/* User Prediction & Result Section */}
        {userPrediction && (
          <View style={styles.content}>
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Tu Predicción</Text>
              </View>

              <View style={styles.predictionCard}>
                {sport.prediction_type === 'score' ? (
                  <View style={styles.predictionScoreRow}>
                    <View style={styles.predictionTeam}>
                      <Text style={styles.predictionTeamName}>{match.home_team?.short_name}</Text>
                      <View style={styles.predictionScoreBox}>
                        <Text style={styles.predictionScoreText}>{userPrediction.prediction_data?.home_score}</Text>
                      </View>
                    </View>
                    <Text style={styles.predictionVs}>-</Text>
                    <View style={styles.predictionTeam}>
                      <Text style={styles.predictionTeamName}>{match.away_team?.short_name}</Text>
                      <View style={styles.predictionScoreBox}>
                        <Text style={styles.predictionScoreText}>{userPrediction.prediction_data?.away_score}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.predictionPositions}>
                    <Text style={styles.predictionLabel}>Pole Position: {userPrediction.prediction_data?.pole_position}</Text>
                    <Text style={styles.predictionLabel}>Podio:</Text>
                    <Text style={styles.predictionValue}>1. {userPrediction.prediction_data?.podium?.[0]}</Text>
                    <Text style={styles.predictionValue}>2. {userPrediction.prediction_data?.podium?.[1]}</Text>
                    <Text style={styles.predictionValue}>3. {userPrediction.prediction_data?.podium?.[2]}</Text>
                  </View>
                )}

                <View style={styles.predictionMeta}>
                  <Text style={styles.predictionDate}>
                    Predicción realizada el {new Date(userPrediction.createdAt).toLocaleDateString('es-ES')}
                  </Text>
                  {userPrediction.is_processed && (
                    <View style={styles.pointsBadge}>
                      <Ionicons 
                        name={userPrediction.points_earned > 0 ? "trophy" : "close-circle"} 
                        size={18} 
                        color={userPrediction.points_earned > 0 ? COLORS.primary : '#ef4444'} 
                      />
                      <Text style={[
                        styles.pointsText,
                        userPrediction.points_earned > 0 ? styles.pointsPositive : styles.pointsNegative
                      ]}>
                        {userPrediction.points_earned > 0 ? '+' : ''}{userPrediction.points_earned} puntos
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Show Actual Result if match is finished */}
              {match.status === 'finished' && (match.home_score !== null || match.away_score !== null) && sport.prediction_type === 'score' && (
                <View style={styles.actualResultCard}>
                  <Text style={styles.actualResultTitle}>Resultado Final</Text>
                  <View style={styles.predictionScoreRow}>
                    <View style={styles.predictionTeam}>
                      <Text style={styles.predictionTeamName}>{match.home_team?.short_name}</Text>
                      <View style={[styles.predictionScoreBox, styles.actualScoreBox]}>
                        <Text style={styles.predictionScoreText}>{match.home_score}</Text>
                      </View>
                    </View>
                    <Text style={styles.predictionVs}>-</Text>
                    <View style={styles.predictionTeam}>
                      <Text style={styles.predictionTeamName}>{match.away_team?.short_name}</Text>
                      <View style={[styles.predictionScoreBox, styles.actualScoreBox]}>
                        <Text style={styles.predictionScoreText}>{match.away_score}</Text>
                      </View>
                    </View>
                  </View>
                  {userPrediction.is_processed && (
                    <Text style={styles.resultMessage}>
                      {userPrediction.points_earned > 0 
                        ? '🎉 ¡Felicitaciones! Acertaste la predicción' 
                        : '😔 No acertaste esta vez. ¡Suerte en la próxima!'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA Button */}
      {!isLocked && (
        <LinearGradient
          colors={['transparent', '#0a0e14', '#0a0e14']}
          style={styles.bottomGradient}
        >
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => setShowPredictionModal(true)}
          >
            <Ionicons name="football" size={24} color="#0a0e14" />
            <Text style={styles.ctaButtonText}>HACER PREDICCIÓN</Text>
          </TouchableOpacity>
        </LinearGradient>
      )}

      {/* Prediction Modal */}
      <Modal
        visible={showPredictionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPredictionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tu Predicción</Text>
              <TouchableOpacity onPress={() => setShowPredictionModal(false)}>
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {sport.prediction_type === 'score' ? (
                <View style={styles.scoreForm}>
                  <View style={styles.scoreInputGroup}>
                    <Text style={styles.inputLabel}>
                      {match.home_team?.short_name || match.home_team?.name || 'Local'}
                    </Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={homeScore}
                      onChangeText={setHomeScore}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      maxLength={2}
                    />
                  </View>

                  <Text style={styles.scoreSeparator}>-</Text>

                  <View style={styles.scoreInputGroup}>
                    <Text style={styles.inputLabel}>
                      {match.away_team?.short_name || match.away_team?.name || 'Visitante'}
                    </Text>
                    <TextInput
                      style={styles.scoreInput}
                      value={awayScore}
                      onChangeText={setAwayScore}
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                      maxLength={2}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.positionsForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>🏁 Pole Position</Text>
                    <TextInput
                      style={styles.textInput}
                      value={polePosition}
                      onChangeText={setPolePosition}
                      placeholder="Nombre del piloto"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    />
                  </View>

                  <Text style={styles.sectionSubtitle}>🏆 Podio</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>🥇 1er Lugar</Text>
                    <TextInput
                      style={styles.textInput}
                      value={podiumFirst}
                      onChangeText={setPodiumFirst}
                      placeholder="Nombre del piloto"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>🥈 2do Lugar</Text>
                    <TextInput
                      style={styles.textInput}
                      value={podiumSecond}
                      onChangeText={setPodiumSecond}
                      placeholder="Nombre del piloto"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>🥉 3er Lugar</Text>
                    <TextInput
                      style={styles.textInput}
                      value={podiumThird}
                      onChangeText={setPodiumThird}
                      placeholder="Nombre del piloto"
                      placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    />
                  </View>
                </View>
              )}

              {/* Scoring Rules */}
              <View style={styles.rulesCard}>
                <Text style={styles.rulesTitle}>Sistema de Puntos</Text>
                {sport.prediction_type === 'score' ? (
                  <View>
                    <Text style={styles.ruleText}>• Resultado exacto: {sport.scoring_rules?.exact_score || 0} pts</Text>
                    <Text style={styles.ruleText}>• Ganador correcto: {sport.scoring_rules?.correct_winner || 0} pts</Text>
                    <Text style={styles.ruleText}>• Diferencia exacta: +{sport.scoring_rules?.exact_difference || 0} pts</Text>
                  </View>
                ) : (
                  <View>
                    <Text style={styles.ruleText}>• Podio exacto: {sport.scoring_rules?.exact_podium || 0} pts</Text>
                    <Text style={styles.ruleText}>• Posición correcta: {sport.scoring_rules?.correct_position || 0} pts c/u</Text>
                    <Text style={styles.ruleText}>• Pole position: {sport.scoring_rules?.pole_position || 0} pts</Text>
                    <Text style={styles.ruleText}>• En podio (pos. incorrecta): {sport.scoring_rules?.in_podium || 0} pt</Text>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#0a0e14" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar Predicción</Text>
                )}
              </TouchableOpacity>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0a0e14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 40,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.1)',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerLeague: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  matchCardContainer: {
    padding: 16,
  },
  matchCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    overflow: 'hidden',
  },
  teamsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  teamLogo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamLogoText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  teamNameCard: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  vsSection: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  vsTextLarge: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    fontStyle: 'italic',
  },
  timeBadge: {
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
  },
  timeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  eventInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  eventSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 4,
  },
  matchDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 230, 119, 0.1)',
    paddingTop: 16,
    gap: 8,
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0a0e14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  probabilityCard: {
    backgroundColor: 'rgba(0, 230, 119, 0.05)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.1)',
  },
  probabilityBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  probabilitySegment: {
    height: '100%',
  },
  probabilityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  probabilityItem: {
    flex: 1,
  },
  probabilityItemCenter: {
    flex: 1,
    alignItems: 'center',
  },
  probabilityItemRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  probabilityTeam: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  probabilityTeamDraw: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 4,
  },
  probabilityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  statRow: {
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1e293b',
    overflow: 'hidden',
  },
  statBarSegment: {
    height: '100%',
  },
  h2hCard: {
    backgroundColor: 'rgba(0, 230, 119, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.1)',
  },
  h2hRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h2hDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    width: 60,
  },
  h2hResult: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginLeft: 12,
  },
  resultBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0a0e14',
  },
  centerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingVertical: 40,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  ctaButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0a0e14',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  scoreForm: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreInputGroup: {
    alignItems: 'center',
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  scoreInput: {
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    color: COLORS.primary,
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(0, 230, 119, 0.3)',
    width: 100,
    height: 100,
  },
  scoreSeparator: {
    fontSize: 36,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  positionsForm: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontSize: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 14,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
    marginBottom: 16,
  },
  rulesCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.1)',
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 12,
  },
  ruleText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 6,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0a0e14',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
  },
  predictionCard: {
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    marginBottom: 16,
  },
  predictionScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionTeam: {
    alignItems: 'center',
    gap: 8,
  },
  predictionTeamName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  predictionScoreBox: {
    backgroundColor: 'rgba(0, 230, 119, 0.2)',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 12,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionScoreText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.primary,
  },
  predictionVs: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.3)',
  },
  predictionPositions: {
    gap: 8,
  },
  predictionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
  },
  predictionValue: {
    fontSize: 14,
    color: '#ffffff',
    marginLeft: 16,
  },
  predictionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  predictionDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pointsPositive: {
    color: COLORS.primary,
  },
  pointsNegative: {
    color: '#ef4444',
  },
  actualResultCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actualResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  actualScoreBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resultMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});

export default CreatePredictionScreen;
