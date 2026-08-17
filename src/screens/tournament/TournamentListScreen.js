import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../../constants/config';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import tournamentService from '../../services/tournament.service';

const WC_IMAGE = require('../../../assets/Todo-listo-para-el-sorteo-de-la-Copa-Mundial-de-la-FIFA.webp');

const getStatusConfig = (C) => ({
  upcoming: { label: 'Próximamente', color: '#ffaa00', bg: 'rgba(255,170,0,0.15)', icon: 'time-outline' },
  active: { label: 'En curso', color: C.primary, bg: `${C.accent}26`, icon: 'flash-outline' },
  finished: { label: 'Finalizado', color: C.textSecondary, bg: 'rgba(160,160,160,0.12)', icon: 'flag-outline' },
});

const FILTER_TABS = [
  { key: 'all', label: 'Todos', icon: 'grid-outline' },
  { key: 'joined', label: 'Mis torneos', icon: 'checkmark-circle-outline' },
  { key: 'public', label: 'Públicas', icon: 'earth-outline' },
  { key: 'private', label: 'Privadas', icon: 'lock-closed-outline' },
];

const formatDate = (d) =>
  new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

const formatDateRange = (start, end) => {
  if (!start || !end) return 'Fechas por confirmar';
  return `${formatDate(start)} — ${formatDate(end)}`;
};

const isWorldCupTournament = (name = '') => {
  const lower = name.toLowerCase();
  return lower.includes('mundial') || lower.includes('copa') || lower.includes('world cup');
};

const getTournamentBannerUri = (tournament) => {
  if (tournament?.image) {
    if (tournament.image.startsWith('http') || tournament.image.startsWith('file://')) {
      return tournament.image;
    }
    return `${BASE_URL}${tournament.image}`;
  }
  if (isWorldCupTournament(tournament?.name)) {
    return WC_IMAGE;
  }
  return null;
};

const TournamentCard = ({ tournament: t, onPress, styles, C }) => {
  const status = getStatusConfig(C)[t.status] || getStatusConfig(C).upcoming;
  const bannerUri = getTournamentBannerUri(t);
  const isPrivate = t.type === 'private';
  const participantLabel = t.max_participants
    ? `${t.total_participants || 0}/${t.max_participants}`
    : `${t.total_participants || 0}`;

  const cardBody = (
    <>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {isPrivate ? (
            <View style={[styles.typePill, styles.typePillPrivate]}>
              <Ionicons name="lock-closed" size={11} color="#ffb347" />
              <Text style={[styles.typePillText, { color: '#ffb347' }]}>Privada</Text>
            </View>
          ) : (
            <View style={[styles.typePill, styles.typePillPublic]}>
              <Ionicons name="earth" size={11} color={C.secondary} />
              <Text style={[styles.typePillText, { color: C.secondary }]}>Pública</Text>
            </View>
          )}
          <View style={[styles.statusPill, { backgroundColor: status.bg, borderColor: `${status.color}40` }]}>
            <Ionicons name={status.icon} size={11} color={status.color} />
            <Text style={[styles.statusPillText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        {t.is_joined ? (
          <View style={styles.joinedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={C.primary} />
            <Text style={styles.joinedBadgeText}>Unido</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{t.name}</Text>
      <Text style={styles.cardDesc} numberOfLines={2}>
        {t.description || 'Compite prediciendo marcadores y escala en la tabla del torneo.'}
      </Text>

      <View style={styles.cardMetaRow}>
        <View style={styles.metaChip}>
          <Ionicons name="people-outline" size={13} color={C.primary} />
          <Text style={styles.metaChipText}>{participantLabel} jugadores</Text>
        </View>
        {t.special_predictions_enabled ? (
          <View style={styles.metaChip}>
            <Ionicons name="star-outline" size={13} color="#ffd700" />
            <Text style={[styles.metaChipText, { color: '#ffd70090' }]}>Menciones</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={13} color={C.textSecondary} />
        <Text style={styles.dateText}>{formatDateRange(t.start_date, t.end_date)}</Text>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterHint}>
          {t.is_joined ? 'Ver partidos y tabla' : 'Toca para ver detalles y unirte'}
        </Text>
        <LinearGradient
          colors={t.is_joined ? [C.accent, C.primaryDark] : [`${C.accent}40`, `${C.accent}14`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.cardCta}
        >
          <Text style={[styles.cardCtaText, !t.is_joined && styles.cardCtaTextOutline]}>
            {t.is_joined ? 'Entrar' : 'Explorar'}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={t.is_joined ? '#ffffff' : C.primary}
          />
        </LinearGradient>
      </View>
    </>
  );

  if (bannerUri) {
    const isLocalAsset = typeof bannerUri === 'number';
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.cardWrap}>
        <ImageBackground
          source={isLocalAsset ? bannerUri : { uri: bannerUri }}
          style={styles.cardImageBg}
          imageStyle={styles.cardImageStyle}
        >
          <LinearGradient
            colors={['rgba(10,14,20,0.45)', 'rgba(15,35,25,0.88)', 'rgba(15,35,25,0.98)']}
            style={styles.cardImageOverlay}
          >
            {isWorldCupTournament(t.name) && !t.image ? (
              <View style={styles.worldCupRibbon}>
                <Text style={styles.worldCupRibbonText}>🇲🇽 🇺🇸 🇨🇦 Copa Mundial</Text>
              </View>
            ) : null}
            {cardBody}
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.cardWrap}>
      <LinearGradient
        colors={[C.gradientHero[0], C.cardDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardAccent} />
        <View style={styles.cardGlow} />
        {cardBody}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function TournamentListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await tournamentService.listTournaments();
      setTournaments(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const stats = useMemo(() => ({
    total: tournaments.length,
    joined: tournaments.filter((t) => t.is_joined).length,
    active: tournaments.filter((t) => t.status === 'active').length,
    public: tournaments.filter((t) => t.type === 'public').length,
  }), [tournaments]);

  const filteredTournaments = useMemo(() => {
    switch (activeFilter) {
      case 'joined':
        return tournaments.filter((t) => t.is_joined);
      case 'public':
        return tournaments.filter((t) => t.type === 'public');
      case 'private':
        return tournaments.filter((t) => t.type === 'private');
      default:
        return tournaments;
    }
  }, [tournaments, activeFilter]);

  const openTournament = (t) => {
    if (t.is_joined) {
      navigation.navigate('TournamentMatches', { tournamentId: t.id, filter: 'upcoming' });
    } else {
      navigation.navigate('TournamentHome', { tournamentId: t.id });
    }
  };

  const renderFilterChip = (tab) => {
    const active = activeFilter === tab.key;
    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={() => setActiveFilter(tab.key)}
        activeOpacity={0.8}
      >
        <Ionicons
          name={tab.icon}
          size={14}
          color={active ? C.onAccent : C.primary}
        />
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={C.accent}
          />
        }
      >
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
            <View style={styles.heroIconWrap}>
              <Ionicons name="trophy" size={26} color={C.primary} />
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
                Torneos / Pollas
              </Text>
              <Text style={styles.heroSub}>
                Compite en grupos privados o públicos
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeNum}>{stats.total}</Text>
              <Text style={styles.countBadgeLabel}>activos</Text>
            </View>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statVal, { color: C.primary }]}>{stats.joined}</Text>
              <Text style={styles.statLabel}>Mis torneos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{stats.active}</Text>
              <Text style={styles.statLabel}>En curso</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statVal}>{stats.public}</Text>
              <Text style={styles.statLabel}>Públicas</Text>
            </View>
          </View>
        </LinearGradient>

        <TouchableOpacity
          style={styles.joinBanner}
          onPress={() => navigation.navigate('TournamentJoin')}
          activeOpacity={0.88}
        >
          <LinearGradient
            colors={[C.accent, C.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.joinBannerGradient}
          >
            <View style={styles.joinBannerLeft}>
              <View style={styles.joinBannerIcon}>
                <Ionicons name="key-outline" size={20} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.joinBannerTitle}>Unirse a torneo</Text>
                <Text style={styles.joinBannerSub}>Ingresa un código de polla privada</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ffffff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.toolbarCard}>
          <Text style={styles.toolbarLabel}>Filtrar torneos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {FILTER_TABS.map(renderFilterChip)}
          </ScrollView>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loader}>
            <ActivityIndicator color={C.accent} size="small" />
            <Text style={styles.loaderText}>Cargando torneos...</Text>
          </View>
        ) : filteredTournaments.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="trophy-outline" size={36} color={`${C.primary}70`} />
            </View>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'joined' ? 'Aún no te has unido' : 'No hay torneos'}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'joined'
                ? 'Explora los torneos disponibles o únete con un código'
                : 'Vuelve más tarde o únete a una polla privada'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('TournamentJoin')}
            >
              <Text style={styles.emptyBtnText}>Unirse con código</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {filteredTournaments.length} torneo{filteredTournaments.length !== 1 ? 's' : ''}
            </Text>
            {filteredTournaments.map((t) => (
              <TournamentCard
                key={t.id}
                tournament={t}
                onPress={() => openTournament(t)}
                styles={styles}
                C={C}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.cardBackground,
    borderWidth: 1,
    borderColor: `${C.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },

  heroCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${C.primary}25`,
    backgroundColor: C.cardBackground,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: `${C.primary}18`,
    borderWidth: 1,
    borderColor: `${C.primary}35`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextBlock: { flex: 1, minWidth: 0 },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },
  heroSub: { fontSize: 12, color: C.textSecondary, marginTop: 3 },
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
  countBadgeNum: { fontSize: 18, fontWeight: '800', color: C.primary },
  countBadgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: `${C.primary}90`,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 14,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: C.text },
  statLabel: { fontSize: 10, color: C.textSecondary, marginTop: 2, fontWeight: '500' },
  statDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.08)' },

  joinBanner: { marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  joinBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  joinBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  joinBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBannerTitle: { fontSize: 15, fontWeight: '800', color: '#ffffff' },
  joinBannerSub: { fontSize: 11, color: 'rgba(10,14,20,0.65)', marginTop: 2 },

  toolbarCard: {
    backgroundColor: C.cardBackground,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: `${C.primary}18`,
    gap: 10,
  },
  toolbarLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
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
  },
  filterChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  filterChipText: { fontSize: 13, fontWeight: '600', color: C.primary },
  filterChipTextActive: { color: C.onAccent },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 2,
  },

  cardWrap: { marginBottom: 14, borderRadius: 18, overflow: 'hidden' },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: `${C.primary}22`,
    overflow: 'hidden',
    position: 'relative',
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: C.accent,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  cardGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${C.primary}08`,
  },
  cardImageBg: { borderRadius: 18, overflow: 'hidden' },
  cardImageStyle: { borderRadius: 18 },
  cardImageOverlay: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${C.primary}30`,
  },
  worldCupRibbon: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,230,119,0.2)',
    borderWidth: 1,
    borderColor: `${C.primary}50`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  worldCupRibbonText: { fontSize: 11, fontWeight: '700', color: C.primary },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  typePillPublic: { backgroundColor: 'rgba(68,128,255,0.12)', borderColor: 'rgba(68,128,255,0.3)' },
  typePillPrivate: { backgroundColor: 'rgba(255,179,71,0.12)', borderColor: 'rgba(255,179,71,0.3)' },
  typePillText: { fontSize: 10, fontWeight: '700' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${C.primary}22`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${C.primary}40`,
  },
  joinedBadgeText: { color: C.primary, fontSize: 11, fontWeight: '700' },

  cardTitle: { color: C.text, fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginBottom: 6 },
  cardDesc: { color: C.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  cardMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  metaChipText: { color: C.textSecondary, fontSize: 11, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  dateText: { color: C.textSecondary, fontSize: 11, fontWeight: '500' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cardFooterHint: { flex: 1, fontSize: 11, color: C.textSecondary, marginRight: 10 },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardCtaText: { fontSize: 12, fontWeight: '800', color: '#ffffff' },
  cardCtaTextOutline: { color: C.primary },

  loader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 40 },
  loaderText: { color: C.textSecondary, fontSize: 13 },

  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${C.primary}10`,
    borderWidth: 1,
    borderColor: `${C.primary}25`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: '700' },
  emptyText: { color: C.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: C.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
