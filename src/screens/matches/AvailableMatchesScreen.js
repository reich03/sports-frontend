import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { matchService } from '../../services';
import { COLORS } from '../../constants/theme';
import { BASE_URL } from '../../constants/config';

const AvailableMatchesScreen = ({ navigation }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLeagues, setExpandedLeagues] = useState(new Set());
  const [expandedRounds, setExpandedRounds] = useState(new Set());

  // Reload matches when screen is focused (after creating predictions)
  useFocusEffect(
    React.useCallback(() => {
      loadMatches();
    }, [])
  );

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const response = await matchService.getUpcomingMatches({ 
        limit: 100,
        exclude_predicted: true // Solo mostrar partidos sin predicción
      });
      setMatches(response.data.matches || []);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches();
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

  const toggleRound = (roundKey) => {
    setExpandedRounds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roundKey)) {
        newSet.delete(roundKey);
      } else {
        newSet.add(roundKey);
      }
      return newSet;
    });
  };

  const groupMatchesByLeague = () => {
    const grouped = {};
    matches.forEach(match => {
      const leagueId = match.league_id || 'no-league';
      if (!grouped[leagueId]) {
        grouped[leagueId] = {
          league: match.league,
          sport: match.sport,
          rounds: {}
        };
      }
      
      // Group by round within each league
      const roundId = match.round_id || 'friendly';
      if (!grouped[leagueId].rounds[roundId]) {
        grouped[leagueId].rounds[roundId] = {
          roundInfo: match.roundInfo,
          matches: []
        };
      }
      grouped[leagueId].rounds[roundId].matches.push(match);
    });
    return grouped;
  };

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
          <Text style={styles.headerTitle}>Predicciones Disponibles</Text>
          <Text style={styles.headerSubtitle}>{matches.length} partidos</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{matches.length}</Text>
            <Text style={styles.statLabel}>PARTIDOS</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{Object.keys(groupMatchesByLeague()).length}</Text>
            <Text style={styles.statLabel}>LIGAS</Text>
          </View>
        </View>

        {/* Matches grouped by league */}
        {matches.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle" size={64} color={COLORS.primary} />
            <Text style={styles.emptyStateTitle}>¡Todo al día!</Text>
            <Text style={styles.emptyStateText}>
              No hay partidos disponibles para predecir en este momento.
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Ya has predicho todos los partidos disponibles o no hay partidos próximos.
            </Text>
          </View>
        ) : (
          Object.entries(groupMatchesByLeague()).map(([leagueId, { league, sport, rounds }]) => {
            const isLeagueExpanded = expandedLeagues.has(leagueId);
            const totalMatches = Object.values(rounds).reduce((sum, round) => sum + round.matches.length, 0);
            
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
                      <Text style={styles.leagueGroupName}>
                        {league?.name || 'Sin Liga'}
                      </Text>
                      {league?.season && (
                        <Text style={styles.leagueGroupSeason}>{league.season}</Text>
                      )}
                      {sport && (
                        <Text style={styles.leagueGroupSport}>• {sport.name}</Text>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.leagueGroupRight}>
                    <View style={styles.leagueMatchCount}>
                      <Text style={styles.leagueMatchCountText}>{totalMatches}</Text>
                    </View>
                    <Ionicons 
                      name={isLeagueExpanded ? "chevron-up" : "chevron-down"} 
                      size={20} 
                      color={COLORS.primary} 
                    />
                  </View>
                </TouchableOpacity>

                {/* Rounds - Collapsible */}
                {isLeagueExpanded && (
                  <View style={styles.leagueRounds}>
                    {Object.entries(rounds).map(([roundId, { roundInfo, matches }]) => {
                      const roundKey = `${leagueId}-${roundId}`;
                      const isRoundExpanded = expandedRounds.has(roundKey);
                      const isFriendly = roundId === 'friendly';
                      
                      return (
                        <View key={roundKey} style={styles.roundGroup}>
                          {/* Round Header */}
                          <TouchableOpacity 
                            style={styles.roundHeader}
                            onPress={() => toggleRound(roundKey)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.roundHeaderLeft}>
                              <Ionicons 
                                name={isFriendly ? "football-outline" : "flag"} 
                                size={18} 
                                color={isFriendly ? "#94a3b8" : COLORS.primary} 
                              />
                              <View>
                                <Text style={styles.roundName}>
                                  {isFriendly ? 'Amistosos' : roundInfo?.name || `Jornada ${roundId}`}
                                </Text>
                                <Text style={styles.roundMatchCount}>
                                  {matches.length} {matches.length === 1 ? 'partido' : 'partidos'}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={styles.roundHeaderRight}>
                              {!isFriendly && matches.length > 1 && (
                                <TouchableOpacity
                                  style={styles.batchPredictButton}
                                  onPress={() => navigation.navigate('CreateRoundPrediction', { 
                                    matches: matches,
                                    roundName: roundInfo?.name || `Jornada ${roundId}`,
                                    leagueName: league?.name
                                  })}
                                >
                                  <Ionicons name="flash" size={14} color={COLORS.backgroundDark} />
                                  <Text style={styles.batchPredictText}>JORNADA</Text>
                                </TouchableOpacity>
                              )}
                              <Ionicons 
                                name={isRoundExpanded ? "chevron-up-circle" : "chevron-down-circle"} 
                                size={20} 
                                color={COLORS.primary} 
                              />
                            </View>
                          </TouchableOpacity>

                          {/* Matches in Round */}
                          {isRoundExpanded && (
                            <View style={styles.roundMatches}>
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
                                          <Text style={styles.teamLogoText}>
                                            {match.home_team?.short_name || 'HOM'}
                                          </Text>
                                        )}
                                      </View>
                                      <Text style={styles.teamName}>
                                        {match.home_team?.short_name || 'Home'}
                                      </Text>
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
                                          <Text style={styles.teamLogoText}>
                                            {match.away_team?.short_name || 'AWA'}
                                          </Text>
                                        )}
                                      </View>
                                      <Text style={styles.teamName}>
                                        {match.away_team?.short_name || 'Away'}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Match Info */}
                                  <View style={styles.matchInfo}>
                                    <View style={styles.infoRow}>
                                      <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                                      <Text style={styles.infoText}>{formatDate(match.match_date)}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                      <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                                      <Text style={styles.infoText}>{formatTime(match.match_date)}</Text>
                                    </View>
                                  </View>

                                  {/* Predict Button */}
                                  <TouchableOpacity
                                    style={styles.predictButton}
                                    onPress={() => navigation.navigate('CreatePrediction', { matchId: match.id })}
                                  >
                                    <Ionicons name="flash" size={16} color={COLORS.backgroundDark} />
                                    <Text style={styles.predictButtonText}>PREDECIR</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 20,
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
  leagueGroupSport: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
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
    color: '#0a0e14',
  },
  leagueRounds: {
    marginTop: 8,
    gap: 8,
  },
  roundGroup: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  roundHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 119, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  roundHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  roundHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roundName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
  roundMatchCount: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  batchPredictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  batchPredictText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.backgroundDark,
    letterSpacing: 0.5,
  },
  roundMatches: {
    marginTop: 8,
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  matchCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
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
    gap: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: `${COLORS.primary}15`,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}15`,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  predictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  predictButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0a0e14',
    letterSpacing: 0.5,
  },
});

export default AvailableMatchesScreen;
