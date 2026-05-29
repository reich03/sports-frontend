import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import tournamentService from '../../services/tournament.service';

export default function TournamentJoinScreen({ navigation, route }) {
  const { tab: initialTab = 'public' } = route.params || {};
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(initialTab);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

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
      navigation.replace('TournamentHome', { tournamentId: tournament.id });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'No se pudo unir');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinByCode = async () => {
    if (!code.trim()) return Alert.alert('Error', 'Ingresa un código');
    setLoading(true);
    try {
      const res = await tournamentService.joinByCode(code.trim().toUpperCase());
      const tournamentId = res.data.data?.participant?.tournament_id;
      if (tournamentId) {
        navigation.replace('TournamentHome', { tournamentId });
      } else {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Código inválido', err.response?.data?.message || 'El código no existe o es incorrecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Unirse al Mundial</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'public' && styles.tabBtnActive]}
          onPress={() => setTab('public')}
        >
          <Ionicons name="globe" size={18} color={tab === 'public' ? COLORS.backgroundDark : COLORS.textSecondary} />
          <Text style={[styles.tabText, tab === 'public' && styles.tabTextActive]}>Pública</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'private' && styles.tabBtnActive]}
          onPress={() => setTab('private')}
        >
          <Ionicons name="lock-closed" size={18} color={tab === 'private' ? COLORS.backgroundDark : COLORS.textSecondary} />
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
              <ActivityIndicator color={COLORS.primary} style={{ marginTop: 32 }} />
            ) : publicTournaments.length === 0 ? (
              <Text style={styles.emptyText}>No hay pollas públicas disponibles</Text>
            ) : (
              publicTournaments.map(t => (
                <View key={t.id} style={styles.tournamentCard}>
                  <View style={styles.tournamentInfo}>
                    <Text style={styles.tournamentName}>{t.name}</Text>
                    <Text style={styles.tournamentDesc} numberOfLines={2}>{t.description}</Text>
                    <View style={styles.tournamentMeta}>
                      <Ionicons name="people" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.tournamentMetaText}>{t.total_participants || 0} participantes</Text>
                      <View style={[styles.statusBadge, { backgroundColor: (t.status === 'active' ? COLORS.primary : COLORS.warning) + '22' }]}>
                        <Text style={[styles.statusText, { color: t.status === 'active' ? COLORS.primary : COLORS.warning }]}>
                          {t.status === 'upcoming' ? 'Por empezar' : t.status === 'active' ? 'Activo' : 'Finalizado'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {t.is_joined ? (
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => navigation.navigate('TournamentHome', { tournamentId: t.id })}
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
                        <Ionicons name="people" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.tournamentMetaText}>{t.total_participants || 0} participantes</Text>
                        <View style={[styles.statusBadge, { backgroundColor: COLORS.primary + '22' }]}>
                          <Text style={[styles.statusText, { color: COLORS.primary }]}>Ya participas</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => navigation.navigate('TournamentHome', { tournamentId: t.id })}
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
                placeholder="Ej: MUNDIAL26"
                placeholderTextColor={COLORS.textSecondary}
                maxLength={10}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.codeBtn, loading && { opacity: 0.6 }]}
                onPress={handleJoinByCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.backgroundDark} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.cardDark, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  tabBtnActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: COLORS.backgroundDark },
  sectionDesc: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 20 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 32 },
  tournamentCard: { backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  tournamentInfo: { flex: 1, marginRight: 12 },
  tournamentName: { color: COLORS.white, fontWeight: 'bold', fontSize: 15, marginBottom: 4 },
  tournamentDesc: { color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 },
  tournamentMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tournamentMetaText: { color: COLORS.textSecondary, fontSize: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },
  joinBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  joinBtnText: { color: COLORS.backgroundDark, fontWeight: 'bold', fontSize: 14 },
  viewBtn: { backgroundColor: COLORS.border, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  viewBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 14 },
  codeCard: { backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 20, marginBottom: 16 },
  codeLabel: { color: COLORS.textSecondary, fontSize: 13, marginBottom: 10 },
  codeInput: { backgroundColor: COLORS.backgroundDark, borderRadius: 12, padding: 16, fontSize: 22, fontWeight: 'bold', color: COLORS.white, textAlign: 'center', letterSpacing: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  codeBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 12, alignItems: 'center' },
  codeBtnText: { color: COLORS.backgroundDark, fontWeight: 'bold', fontSize: 16 },
  privateInfoCard: { flexDirection: 'row', backgroundColor: COLORS.info + '22', borderRadius: 12, padding: 14, gap: 10 },
  privateInfoText: { flex: 1, color: COLORS.info, fontSize: 13, lineHeight: 18 },
  whatsappBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#25D366', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  whatsappBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionTitle: { color: COLORS.white, fontWeight: 'bold', fontSize: 15, marginBottom: 8, marginTop: 4 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
});
