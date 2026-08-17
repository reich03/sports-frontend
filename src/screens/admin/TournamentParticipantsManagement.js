import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import StatusModal from '../../components/StatusModal';
import tournamentService from '../../services/tournament.service';

const TAB_PUBLIC = 'public';
const TAB_PRIVATE = 'private';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TournamentParticipantsManagement = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_PRIVATE);
  const [searchQuery, setSearchQuery] = useState('');
  const [tournaments, setTournaments] = useState({ public: null, private: null });
  const [participants, setParticipants] = useState([]);
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null);
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const currentTournament = activeTab === TAB_PUBLIC ? tournaments.public : tournaments.private;

  const loadTournaments = useCallback(async () => {
    const res = await tournamentService.listTournaments();
    const list = res.data?.data || [];
    const publicT = list.find((t) => t.type === 'public') || null;
    const privateT = list.find((t) => t.type === 'private') || null;
    setTournaments({ public: publicT, private: privateT });
    return { public: publicT, private: privateT };
  }, []);

  const loadParticipants = useCallback(async (tournamentId) => {
    if (!tournamentId) {
      setParticipants([]);
      return;
    }
    const res = await tournamentService.getParticipants(tournamentId, { active: true });
    const data = res.data?.data || [];
    setParticipants(data);
  }, []);

  const fetchAll = useCallback(async (tab = activeTab, showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const { public: publicT, private: privateT } = await loadTournaments();
      const tournament = tab === TAB_PUBLIC ? publicT : privateT;
      await loadParticipants(tournament?.id);
    } catch (error) {
      console.error('Error cargando participantes:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al cargar',
        message: error.response?.data?.message || 'No se pudieron cargar los participantes.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, loadTournaments, loadParticipants]);

  useEffect(() => {
    fetchAll(activeTab);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll(activeTab, false);
  };

  const handleTabChange = (tab) => {
    setSearchQuery('');
    setActiveTab(tab);
  };

  const filteredParticipants = useMemo(() => {
    if (!searchQuery.trim()) return participants;
    const q = searchQuery.toLowerCase();
    return participants.filter((p) => {
      const user = p.user || {};
      return (
        user.username?.toLowerCase().includes(q) ||
        user.email?.toLowerCase().includes(q)
      );
    });
  }, [participants, searchQuery]);

  const handleRemove = async () => {
    if (!confirmRemove || !currentTournament) return;

    const { userId, username } = confirmRemove;
    setRemovingId(userId);
    setConfirmRemove(null);

    try {
      await tournamentService.removeParticipant(currentTournament.id, userId);
      setParticipants((prev) => prev.filter((p) => p.user_id !== userId));
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Participante removido',
        message: `${username} fue sacado de la polla privada. Ya no podrá participar hasta que se vuelva a unir con el código.`,
      });
    } catch (error) {
      console.error('Error removiendo participante:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al remover',
        message: error.response?.data?.message || 'No se pudo remover al participante.',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const renderParticipant = (participant) => {
    const user = participant.user || {};
    const isRemoving = removingId === user.id;

    return (
      <View key={participant.id} style={styles.participantCard}>
        <View style={styles.participantAvatar}>
          <Ionicons name="person" size={22} color={COLORS.primary} />
        </View>

        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>{user.username || 'Sin nombre'}</Text>
          <Text style={styles.participantEmail}>{user.email || '—'}</Text>
          <Text style={styles.participantMeta}>
            Unido: {formatDate(participant.joined_at)} · {participant.total_points || 0} pts
          </Text>
        </View>

        {activeTab === TAB_PRIVATE && (
          <TouchableOpacity
            style={[styles.removeButton, isRemoving && styles.removeButtonDisabled]}
            onPress={() =>
              setConfirmRemove({ userId: user.id, username: user.username || user.email })
            }
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color="#ff716c" />
            ) : (
              <>
                <Ionicons name="person-remove" size={16} color="#ff716c" />
                <Text style={styles.removeButtonText}>Sacar</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Pollas Mundial"
        subtitle="Participantes públicos y privados"
        onBack={() => navigation.goBack()}
      />

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_PUBLIC && styles.tabActive]}
          onPress={() => handleTabChange(TAB_PUBLIC)}
        >
          <Ionicons
            name="globe-outline"
            size={18}
            color={activeTab === TAB_PUBLIC ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === TAB_PUBLIC && styles.tabTextActive]}>
            Pública
          </Text>
          {tournaments.public && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{tournaments.public.total_participants || 0}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === TAB_PRIVATE && styles.tabActive]}
          onPress={() => handleTabChange(TAB_PRIVATE)}
        >
          <Ionicons
            name="lock-closed-outline"
            size={18}
            color={activeTab === TAB_PRIVATE ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === TAB_PRIVATE && styles.tabTextActive]}>
            Privada
          </Text>
          {tournaments.private && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{tournaments.private.total_participants || 0}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
        <Text style={styles.infoBannerText}>
          {activeTab === TAB_PRIVATE
            ? 'La privada usa el código MUNDIAL26 (WhatsApp). Puedes sacar a quien no debería estar.'
            : 'Polla pública: cualquier usuario puede unirse sin código.'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o email..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando participantes...</Text>
        </View>
      ) : !currentTournament ? (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyStateTitle}>Torneo no encontrado</Text>
          <Text style={styles.emptyStateText}>
            No hay una polla {activeTab === TAB_PUBLIC ? 'pública' : 'privada'} del Mundial configurada.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
        >
          <LinearGradient
            colors={['rgba(63, 255, 140, 0.08)', 'rgba(63, 255, 140, 0.02)']}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryTitle}>{currentTournament.name}</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryStatValue}>{filteredParticipants.length}</Text>
                <Text style={styles.summaryStatLabel}>Activos</Text>
              </View>
              {activeTab === TAB_PRIVATE && (
                <View style={styles.codeChip}>
                  <Ionicons name="key-outline" size={14} color={COLORS.primary} />
                  <Text style={styles.codeChipText}>{currentTournament.access_code || 'MUNDIAL26'}</Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {filteredParticipants.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'Sin resultados' : 'Sin participantes'}
              </Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Prueba con otro nombre o email.'
                  : 'Aún nadie se ha unido a esta polla.'}
              </Text>
            </View>
          ) : (
            filteredParticipants.map(renderParticipant)
          )}
        </ScrollView>
      )}

      {/* Confirm remove modal */}
      <StatusModal
        visible={!!confirmRemove}
        type="warning"
        title="¿Sacar de la polla privada?"
        message={
          confirmRemove
            ? `¿Confirmas que quieres remover a ${confirmRemove.username} de la Polla Privada? Perderá acceso y tendrá que volver a ingresar el código MUNDIAL26.`
            : ''
        }
        primaryButtonText="Sí, sacar"
        onPrimaryPress={handleRemove}
        secondaryButtonText="Cancelar"
        onSecondaryPress={() => setConfirmRemove(null)}
        onClose={() => setConfirmRemove(null)}
      />

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal((s) => ({ ...s, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0f141a',
    borderWidth: 1,
    borderColor: '#20262f',
  },
  tabActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(63, 255, 140, 0.08)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  tabBadge: {
    backgroundColor: '#20262f',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(63, 255, 140, 0.06)',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#a8abb3',
    lineHeight: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0f141a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#20262f',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(63, 255, 140, 0.15)',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryStat: {
    alignItems: 'flex-start',
  },
  summaryStatValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: '#a8abb3',
    fontWeight: '600',
    letterSpacing: 1,
  },
  codeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#20262f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  codeChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  participantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f141a',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#20262f',
  },
  participantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#20262f',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
  participantEmail: {
    fontSize: 12,
    color: '#a8abb3',
    marginTop: 2,
  },
  participantMeta: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 113, 108, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 113, 108, 0.3)',
  },
  removeButtonDisabled: {
    opacity: 0.6,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ff716c',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: 8,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default TournamentParticipantsManagement;
