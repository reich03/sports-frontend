import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Linking, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import StatusModal from '../../components/StatusModal';
import tournamentService from '../../services/tournament.service';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

export default function TournamentJoinScreen({ navigation, route }) {
  const { tab: initialTab = 'public' } = route.params || {};
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [tab, setTab] = useState(initialTab);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const showModal = (type, title, message) => {
    setStatusModal({ visible: true, type, title, message });
  };

  const closeModal = () => {
    setStatusModal((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    tournamentService.listTournaments()
      .then(res => setTournaments(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  const publicTournaments = tournaments.filter(t => t.type === 'public');
  const privateTournaments = tournaments.filter(t => t.type === 'private');
  const joinedPrivate = privateTournaments.filter(t => t.is_joined);

  const handleJoinPublic = async (tournament) => {
    setLoading(true);
    try {
      await tournamentService.joinTournament(tournament.id);
      navigation.replace('TournamentMatches', { tournamentId: tournament.id, filter: 'upcoming' });
    } catch (err) {
      showModal('error', 'Error', err.response?.data?.message || 'No se pudo unir al torneo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!code.trim()) {
      showModal('warning', 'Código requerido', 'Ingresa el código de acceso que te compartieron por WhatsApp.');
      return;
    }
    setLoading(true);
    try {
      const res = await tournamentService.joinByCode(code.trim().toUpperCase());
      const tournamentId = res.data.data?.participant?.tournament_id;
      if (tournamentId) {
        navigation.replace('TournamentMatches', { tournamentId, filter: 'upcoming' });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      showModal(
        'error',
        'Código inválido',
        err.response?.data?.message || 'El código no existe o es incorrecto. Verifica e intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unirse a torneo</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'public' && styles.tabBtnActive]}
          onPress={() => setTab('public')}
        >
          <Ionicons name="globe" size={18} color={tab === 'public' ? C.onAccent : C.textSecondary} />
          <Text style={[styles.tabText, tab === 'public' && styles.tabTextActive]}>Pública</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'private' && styles.tabBtnActive]}
          onPress={() => setTab('private')}
        >
          <Ionicons name="lock-closed" size={18} color={tab === 'private' ? C.onAccent : C.textSecondary} />
          <Text style={[styles.tabText, tab === 'private' && styles.tabTextActive]}>Privada</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {tab === 'public' ? (
          <>
            <Text style={styles.sectionDesc}>
              Las pollas públicas son gratuitas y abiertas a todos. ¡Únete y compite!
            </Text>
            {loadingList ? (
              <ActivityIndicator color={C.accent} style={{ marginTop: 32 }} />
            ) : publicTournaments.length === 0 ? (
              <Text style={styles.emptyText}>No hay pollas públicas disponibles</Text>
            ) : (
              publicTournaments.map(t => (
                <View key={t.id} style={styles.tournamentCard}>
                  <View style={styles.tournamentInfo}>
                    <Text style={styles.tournamentName}>{t.name}</Text>
                    <Text style={styles.tournamentDesc} numberOfLines={2}>{t.description}</Text>
                    <View style={styles.tournamentMeta}>
                      <Ionicons name="people" size={14} color={C.textSecondary} />
                      <Text style={styles.tournamentMetaText}>{t.total_participants || 0} participantes</Text>
                      <View style={[styles.statusBadge, { backgroundColor: (t.status === 'active' ? C.primary : C.warning) + '22' }]}>
                        <Text style={[styles.statusText, { color: t.status === 'active' ? C.primary : C.warning }]}>
                          {t.status === 'upcoming' ? 'Por empezar' : t.status === 'active' ? 'Activo' : 'Finalizado'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {t.is_joined ? (
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => navigation.navigate('TournamentMatches', { tournamentId: t.id, filter: 'upcoming' })}
                    >
                      <Text style={styles.viewBtnText}>Ver</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.joinBtn}
                      onPress={() => handleJoinPublic(t)}
                      disabled={loading}
                    >
                      <Text style={styles.joinBtnText}>Unirse</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          <>
            {/* Torneos privados en los que ya participas */}
            {joinedPrivate.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Tus pollas privadas</Text>
                {joinedPrivate.map(t => (
                  <View key={t.id} style={styles.tournamentCard}>
                    <View style={styles.tournamentInfo}>
                      <Text style={styles.tournamentName}>{t.name}</Text>
                      <Text style={styles.tournamentDesc} numberOfLines={2}>{t.description}</Text>
                      <View style={styles.tournamentMeta}>
                        <Ionicons name="people" size={14} color={C.textSecondary} />
                        <Text style={styles.tournamentMetaText}>{t.total_participants || 0} participantes</Text>
                        <View style={[styles.statusBadge, { backgroundColor: C.primary + '22' }]}>
                          <Text style={[styles.statusText, { color: C.primary }]}>Ya participas</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => navigation.navigate('TournamentMatches', { tournamentId: t.id, filter: 'upcoming' })}
                    >
                      <Text style={styles.viewBtnText}>Ver</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.divider} />
              </>
            )}

            <Text style={styles.sectionTitle}>Unirse con código</Text>
            <Text style={styles.sectionDesc}>
              Ingresa el código que te compartió el administrador de la polla.
            </Text>
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Código de acceso</Text>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={t => setCode(t.toUpperCase())}
                placeholder="Ej: MASTERSPORT2026"
                placeholderTextColor={C.textSecondary}
                maxLength={16}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.codeBtn, loading && { opacity: 0.6 }]}
                onPress={handleJoinByCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.codeBtnText}>Entrar con código</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={() => {
                const phone = '573186406304';
                const msg = encodeURIComponent('Hola, me quiero unir a una polla privada');
                Linking.openURL(`https://wa.me/${phone}?text=${msg}`);
              }}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#fff" />
              <Text style={styles.whatsappBtnText}>Solicitar código por WhatsApp</Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        primaryButtonText="Entendido"
        onPrimaryPress={closeModal}
        onClose={closeModal}
      />
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: C.cardDark, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabBtnActive: { backgroundColor: C.accent },
  tabText: { color: C.textSecondary, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: C.onAccent },
  sectionDesc: { color: C.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 20 },
  emptyText: { color: C.textSecondary, textAlign: 'center', marginTop: 32 },
  tournamentCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  tournamentInfo: { flex: 1, marginRight: 12 },
  tournamentName: { color: C.text, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  tournamentDesc: { color: C.textSecondary, fontSize: 12, marginBottom: 8 },
  tournamentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tournamentMetaText: { color: C.textSecondary, fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  joinBtn: { backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  joinBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  viewBtn: { backgroundColor: C.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  viewBtnText: { color: C.text, fontWeight: '600', fontSize: 14 },
  codeCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 20, marginBottom: 16 },
  codeLabel: { color: C.textSecondary, fontSize: 13, marginBottom: 10 },
  codeInput: { backgroundColor: C.background, borderRadius: 12, padding: 16, fontSize: 22, fontWeight: 'bold', color: C.text, textAlign: 'center', letterSpacing: 4, borderWidth: 1, borderColor: C.border, marginBottom: 16 },
  codeBtn: { backgroundColor: C.accent, padding: 14, borderRadius: 12, alignItems: 'center' },
  codeBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  privateInfoCard: { flexDirection: 'row', backgroundColor: C.info + '22', borderRadius: 12, padding: 14, gap: 10 },
  privateInfoText: { flex: 1, color: C.info, fontSize: 13, lineHeight: 18 },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#25D366', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  whatsappBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { color: C.text, fontWeight: 'bold', fontSize: 15, marginBottom: 8, marginTop: 4 },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 20 },
});
