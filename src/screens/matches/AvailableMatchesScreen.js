import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { matchService } from '../../services';
import { BASE_URL } from '../../constants/config';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { arePredictionsClosed } from '../../utils/predictions';

const PAGE_SIZE = 10;

const formatDate = (d) =>
  new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const formatTime = (d) =>
  new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

const getTeamLogo = (team) => {
  if (!team?.logo) return null;
  if (team.logo.startsWith('file://') || team.logo.startsWith('http')) return team.logo;
  return `${BASE_URL}${team.logo}`;
};

const getSportIcon = (name = '') => {
  const lower = name.toLowerCase();
  if (lower.includes('fútbol') || lower.includes('futbol')) return 'football-outline';
  if (lower.includes('fórmula') || lower.includes('formula')) return 'speedometer-outline';
  if (lower.includes('moto')) return 'bicycle-outline';
  return 'trophy-outline';
};

const TeamBadge = ({ team, size = 42, styles }) => {
  const logo = getTeamLogo(team);
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      {logo ? (
        <Image source={{ uri: logo }} style={styles.badgeImg} resizeMode="contain" />
      ) : (
        <Text style={styles.badgeText}>{(team?.short_name || team?.name || '?').substring(0, 3)}</Text>
      )}
    </View>
  );
};

const MatchCard = ({ match, navigation, styles, C }) => {
  const home = match.home_team;
  const away = match.away_team;
  const league = match.league;
  const sport = match.sport;
  const round = match.roundInfo;
  const closed = arePredictionsClosed(match);

  return (
    <View style={styles.matchCard}>
      <View style={styles.matchMeta}>
        <View style={styles.metaLeft}>
          <Ionicons name={getSportIcon(sport?.name)} size={12} color={C.primary} />
          <Text style={styles.metaSport} numberOfLines={1}>{sport?.name || 'Deporte'}</Text>
          {league?.name ? (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.metaLeague} numberOfLines={1}>{league.name}</Text>
            </>
          ) : null}
        </View>
        <View style={styles.timePill}>
          <Text style={styles.timePillText}>{formatTime(match.match_date)}</Text>
        </View>
      </View>

      {round?.name ? (
        <Text style={styles.roundLabel} numberOfLines={1}>{round.name}</Text>
      ) : null}

      <Text style={styles.dateText}>{formatDate(match.match_date)}</Text>

      <View style={styles.matchTeams}>
        <View style={styles.teamSide}>
          <TeamBadge team={home} styles={styles} />
          <Text style={styles.teamName} numberOfLines={2}>
            {home?.short_name || home?.name || 'Local'}
          </Text>
        </View>
        <View style={styles.vsBubble}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <View style={[styles.teamSide, styles.teamSideRight]}>
          <TeamBadge team={away} styles={styles} />
          <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={2}>
            {away?.short_name || away?.name || 'Visitante'}
          </Text>
        </View>
      </View>

      {closed ? (
        <View style={styles.closedRow}>
          <Ionicons name="lock-closed" size={14} color={C.textSecondary} />
          <Text style={styles.closedText}>Predicciones cerradas</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.predictBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('CreatePrediction', { matchId: match.id })}
        >
          <LinearGradient
            colors={[C.accent, C.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.predictGradient}
          >
            <Text style={styles.predictBtnText}>Predecir</Text>
            <Ionicons name="chevron-forward" size={16} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

const AvailableMatchesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSportId, setSelectedSportId] = useState('');
  const [selectedLeagueId, setSelectedLeagueId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [])
  );

  const loadMatches = async () => {
    try {
      setLoading(true);
      const res = await matchService.getUpcomingMatches({ limit: 100, exclude_predicted: 'true' });
      setMatches(res.data.matches || []);
    } catch (e) {
      console.error(e);
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMatches();
  };

  const sports = useMemo(() => {
    const map = new Map();
    matches.forEach((m) => {
      if (m.sport?.id) map.set(m.sport.id, m.sport);
    });
    return Array.from(map.values());
  }, [matches]);

  const leagues = useMemo(() => {
    const map = new Map();
    matches.forEach((m) => {
      if (!m.league?.id) return;
      if (selectedSportId && m.sport_id !== selectedSportId && m.sport?.id !== selectedSportId) return;
      map.set(m.league.id, m.league);
    });
    return Array.from(map.values());
  }, [matches, selectedSportId]);

  const filteredMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return matches
      .filter((m) => {
        if (selectedSportId && m.sport_id !== selectedSportId && m.sport?.id !== selectedSportId) {
          return false;
        }
        if (selectedLeagueId && m.league_id !== selectedLeagueId && m.league?.id !== selectedLeagueId) {
          return false;
        }
        if (!q) return true;
        const home = (m.home_team?.name || '').toLowerCase();
        const away = (m.away_team?.name || '').toLowerCase();
        const league = (m.league?.name || '').toLowerCase();
        const round = (m.roundInfo?.name || '').toLowerCase();
        return home.includes(q) || away.includes(q) || league.includes(q) || round.includes(q);
      })
      .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  }, [matches, selectedSportId, selectedLeagueId, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedMatches = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredMatches.slice(start, start + PAGE_SIZE);
  }, [filteredMatches, safePage]);

  const roundBatch = useMemo(() => {
    if (filteredMatches.length < 2) return null;
    const roundId = filteredMatches[0]?.round_id || filteredMatches[0]?.roundInfo?.id;
    if (!roundId) return null;
    const sameRound = filteredMatches.filter(
      (m) => (m.round_id || m.roundInfo?.id) === roundId
    );
    if (sameRound.length < 2) return null;
    return {
      matches: sameRound,
      roundName: sameRound[0]?.roundInfo?.name || 'Jornada',
      leagueName: sameRound[0]?.league?.name,
    };
  }, [filteredMatches]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedSportId('');
    setSelectedLeagueId('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedSportId || selectedLeagueId;

  const renderFilterChip = (id, label, active, onPress, icon) => (
    <TouchableOpacity
      key={id}
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={active ? C.onAccent : C.primary}
        />
      ) : null}
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderListHeader = () => (
    <View style={styles.headerBlock}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={22} color={C.text} />
      </TouchableOpacity>

      <LinearGradient
        colors={C.gradientHero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <Text
            style={styles.heroTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            Predicciones disponibles
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeNum}>{filteredMatches.length}</Text>
            <Text style={styles.countBadgeLabel}>partidos</Text>
          </View>
        </View>

        <View style={styles.statsDivider} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{matches.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statVal, { color: C.primary }]}>{sports.length}</Text>
            <Text style={styles.statLabel}>Deportes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statVal}>{leagues.length}</Text>
            <Text style={styles.statLabel}>Ligas</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.toolbarCard}>
        <Text style={styles.toolbarLabel}>Buscar partido</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={C.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Equipo, liga o jornada..."
            placeholderTextColor={C.textSecondary}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setCurrentPage(1);
            }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setCurrentPage(1); }}>
              <Ionicons name="close-circle" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {sports.length > 0 ? (
          <View style={styles.filterBlock}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Deporte</Text>
              {hasActiveFilters ? (
                <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={14} color={C.error} />
                  <Text style={styles.clearBtnText}>Limpiar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {renderFilterChip('all-sport', 'Todos', !selectedSportId, () => {
                setSelectedSportId('');
                setSelectedLeagueId('');
                setCurrentPage(1);
              }, 'apps-outline')}
              {sports.map((sport) =>
                renderFilterChip(
                  sport.id,
                  sport.name,
                  selectedSportId === sport.id,
                  () => {
                    setSelectedSportId(sport.id);
                    setSelectedLeagueId('');
                    setCurrentPage(1);
                  },
                  getSportIcon(sport.name)
                )
              )}
            </ScrollView>
          </View>
        ) : null}

        {leagues.length > 0 ? (
          <View style={styles.filterBlock}>
            <Text style={styles.filterTitle}>Liga</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {renderFilterChip('all-league', 'Todas', !selectedLeagueId, () => {
                setSelectedLeagueId('');
                setCurrentPage(1);
              }, 'ribbon-outline')}
              {leagues.map((league) =>
                renderFilterChip(
                  league.id,
                  league.name,
                  selectedLeagueId === league.id,
                  () => {
                    setSelectedLeagueId(league.id);
                    setCurrentPage(1);
                  },
                  'ribbon-outline'
                )
              )}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {roundBatch ? (
        <TouchableOpacity
          style={styles.roundBatchCard}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('CreateRoundPrediction', {
              matches: roundBatch.matches,
              roundName: roundBatch.roundName,
              leagueName: roundBatch.leagueName,
            })
          }
        >
          <View style={styles.roundBatchLeft}>
            <Ionicons name="layers" size={18} color={C.primary} />
            <View style={styles.roundBatchText}>
              <Text style={styles.roundBatchTitle} numberOfLines={1}>
                Predecir jornada completa
              </Text>
              <Text style={styles.roundBatchSub} numberOfLines={1}>
                {roundBatch.roundName} · {roundBatch.matches.length} partidos
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>
      ) : null}

      {loading && !refreshing ? (
        <View style={styles.inlineLoader}>
          <ActivityIndicator size="small" color={C.accent} />
          <Text style={styles.inlineLoaderText}>Cargando partidos...</Text>
        </View>
      ) : null}
    </View>
  );

  const renderPagination = () => {
    const bottomPad = insets.bottom + 20;
    if (filteredMatches.length <= PAGE_SIZE) {
      return <View style={{ height: bottomPad }} />;
    }
    return (
      <View style={[styles.paginationWrap, { paddingBottom: bottomPad }]}>
        <View style={styles.paginationBar}>
        <TouchableOpacity
          style={[styles.pageBtn, safePage === 1 && styles.pageBtnDisabled]}
          onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={safePage === 1}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={safePage === 1 ? C.textSecondary : C.text}
          />
          <Text style={[styles.pageBtnText, safePage === 1 && styles.pageBtnTextDisabled]}>
            Anterior
          </Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>{safePage}</Text>
          <Text style={styles.pageIndicatorSub}>de {totalPages}</Text>
        </View>

        <TouchableOpacity
          style={[styles.pageBtn, safePage === totalPages && styles.pageBtnDisabled]}
          onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={safePage === totalPages}
        >
          <Text
            style={[
              styles.pageBtnText,
              safePage === totalPages && styles.pageBtnTextDisabled,
            ]}
          >
            Siguiente
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={safePage === totalPages ? C.textSecondary : C.text}
          />
        </TouchableOpacity>
      </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading && !refreshing) return null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconWrap}>
          <Ionicons name="checkmark-done-circle" size={40} color={`${C.primary}80`} />
        </View>
        <Text style={styles.emptyTitle}>
          {hasActiveFilters ? 'Sin resultados' : '¡Todo al día!'}
        </Text>
        <Text style={styles.emptyText}>
          {hasActiveFilters
            ? 'Prueba otro filtro o limpia la búsqueda'
            : 'No hay partidos disponibles para predecir'}
        </Text>
        {hasActiveFilters ? (
          <TouchableOpacity style={styles.emptyActionBtn} onPress={clearFilters}>
            <Text style={styles.emptyActionText}>Quitar filtros</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />

      <FlatList
        data={loading && !refreshing ? [] : paginatedMatches}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => <MatchCard match={item} navigation={navigation} styles={styles} C={C} />}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderPagination}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 16 },
          (paginatedMatches.length === 0 || (loading && !refreshing)) && styles.listContentEmpty,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  listContent: { paddingHorizontal: 16 },
  listContentEmpty: { flexGrow: 1 },

  headerBlock: { paddingTop: 4, marginBottom: 4 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.cardBackground,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
    backgroundColor: C.cardBackground,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
    minWidth: 0,
  },
  countBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: `${C.primary}18`,
    borderWidth: 1,
    borderColor: `${C.primary}35`,
    flexShrink: 0,
  },
  countBadgeNum: { fontSize: 16, fontWeight: '800', color: C.primary },
  countBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: `${C.primary}90`,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 14,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 10, color: C.textSecondary, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 34, backgroundColor: 'rgba(255, 255, 255, 0.08)' },

  toolbarCard: {
    backgroundColor: C.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${C.primary}18`,
    gap: 12,
  },
  toolbarLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1f28',
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 15,
    padding: 0,
    minHeight: 22,
  },
  filterBlock: { gap: 8 },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterTitle: { fontSize: 12, fontWeight: '600', color: C.text },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: `${C.error}12`,
  },
  clearBtnText: { fontSize: 11, fontWeight: '600', color: C.error },
  chipsRow: { gap: 8, paddingRight: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}28`,
    maxWidth: 160,
  },
  filterChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterChipText: { fontSize: 13, fontWeight: '600', color: C.primary, flexShrink: 1 },
  filterChipTextActive: { color: C.onAccent },

  roundBatchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${C.primary}12`,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${C.primary}35`,
  },
  roundBatchLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  roundBatchText: { flex: 1, minWidth: 0 },
  roundBatchTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  roundBatchSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },

  inlineLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  inlineLoaderText: { fontSize: 13, color: C.textSecondary, fontWeight: '500' },

  matchCard: {
    backgroundColor: C.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: `${C.primary}15`,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  metaLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  metaSport: { fontSize: 11, fontWeight: '600', color: C.primary, flexShrink: 1 },
  metaDot: { color: C.textSecondary, fontSize: 11 },
  metaLeague: { fontSize: 11, color: C.textSecondary, flex: 1 },
  timePill: {
    backgroundColor: `${C.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timePillText: { color: C.primary, fontSize: 11, fontWeight: '700' },
  roundLabel: { fontSize: 12, fontWeight: '600', color: C.text, marginBottom: 2 },
  dateText: { fontSize: 11, color: C.textSecondary, marginBottom: 12 },
  matchTeams: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  teamSide: { flex: 1, alignItems: 'flex-start', gap: 6 },
  teamSideRight: { alignItems: 'flex-end' },
  badge: {
    backgroundColor: '#1a1f28',
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  badgeImg: { width: '88%', height: '88%' },
  badgeText: { color: C.primary, fontSize: 11, fontWeight: '700' },
  teamName: { color: C.text, fontSize: 12, fontWeight: '600', maxWidth: 110 },
  teamNameRight: { textAlign: 'right' },
  vsBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: `${C.primary}12`,
    borderWidth: 1,
    borderColor: `${C.primary}25`,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  vsText: { color: C.primary, fontWeight: '900', fontSize: 10 },
  predictBtn: { borderRadius: 12, overflow: 'hidden' },
  predictGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  predictBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: `${C.primary}15`,
  },
  closedText: { color: C.textSecondary, fontSize: 13, fontWeight: '600' },

  paginationWrap: {
    marginTop: 8,
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${C.primary}15`,
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${C.primary}15`,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
    minWidth: 100,
    justifyContent: 'center',
  },
  pageBtnDisabled: {
    opacity: 0.45,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pageBtnText: { fontSize: 13, fontWeight: '600', color: C.text },
  pageBtnTextDisabled: { color: C.textSecondary },
  pageIndicator: { alignItems: 'center' },
  pageIndicatorText: { fontSize: 18, fontWeight: '800', color: C.primary },
  pageIndicatorSub: { fontSize: 11, color: C.textSecondary, fontWeight: '500' },

  empty: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${C.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: C.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyText: { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyActionBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: `${C.primary}18`,
    borderWidth: 1,
    borderColor: `${C.primary}35`,
  },
  emptyActionText: { color: C.primary, fontWeight: '600', fontSize: 14 },
});

export default AvailableMatchesScreen;
