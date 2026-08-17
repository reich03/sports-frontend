import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Modal, StatusBar, TextInput, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tournamentService from '../../services/tournament.service';
import StatusModal from '../../components/StatusModal';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';
import { BASE_URL } from '../../constants/config';

const getTeamLogo = (team) => {
  if (!team?.logo) return null;
  if (team.logo.startsWith('file://') || team.logo.startsWith('http')) {
    return team.logo;
  }
  return `${BASE_URL}${team.logo}`;
};

const POSITIONS_BASE = [
  { key: 'champion',   label: 'Campeón',      icon: '🏆', color: '#ffd700', pointsKey: 'champion_points' },
  { key: 'runnerUp',   label: 'Subcampeón',   icon: '🥈', color: '#c0c0c0', pointsKey: 'runner_up_points' },
  { key: 'thirdPlace', label: 'Tercer Puesto', icon: '🥉', color: '#cd7f32', pointsKey: 'third_place_points' },
];

const getFlagEmoji = (country) => {
  const flags = {
    'México': '🇲🇽', 'Sudáfrica': '🇿🇦', 'Corea del Sur': '🇰🇷', 'República Checa': '🇨🇿',
    'Canadá': '🇨🇦', 'Bosnia Herzegovina': '🇧🇦', 'Qatar': '🇶🇦', 'Suiza': '🇨🇭',
    'Brasil': '🇧🇷', 'Marruecos': '🇲🇦', 'Haití': '🇭🇹', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'Estados Unidos': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turquía': '🇹🇷',
    'Alemania': '🇩🇪', 'Curazao': '🇨🇼', 'Costa de Marfil': '🇨🇮', 'Ecuador': '🇪🇨',
    'Países Bajos': '🇳🇱', 'Japón': '🇯🇵', 'Suecia': '🇸🇪', 'Túnez': '🇹🇳',
    'Bélgica': '🇧🇪', 'Egipto': '🇪🇬', 'Irán': '🇮🇷', 'Nueva Zelanda': '🇳🇿',
    'España': '🇪🇸', 'Cabo Verde': '🇨🇻', 'Arabia Saudita': '🇸🇦', 'Uruguay': '🇺🇾',
    'Francia': '🇫🇷', 'Senegal': '🇸🇳', 'Irak': '🇮🇶', 'Noruega': '🇳🇴',
    'Argentina': '🇦🇷', 'Argelia': '🇩🇿', 'Austria': '🇦🇹', 'Jordania': '🇯🇴',
    'Portugal': '🇵🇹', 'Rep. D. Congo': '🇨🇩', 'Uzbekistán': '🇺🇿', 'Colombia': '🇨🇴',
    'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croacia': '🇭🇷', 'Ghana': '🇬🇭', 'Panamá': '🇵🇦',
  };
  return flags[country] || '🏳️';
};

const TeamPickerModal = ({ visible, teams, onSelect, onClose, selectedId, pk, C, searchQuery, onSearchChange }) => {
  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? teams.filter((t) =>
        [t.name, t.short_name, t.country].filter(Boolean).some((v) => v.toLowerCase().includes(q))
      )
    : teams;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={pk.overlay}>
        <View style={pk.card}>
          <View style={pk.header}>
            <View style={{ flex: 1 }}>
              <Text style={pk.title}>Selecciona un equipo</Text>
              <Text style={pk.subtitle}>{teams.length} equipos del torneo</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <View style={pk.searchBox}>
            <Ionicons name="search" size={18} color={C.textSecondary} />
            <TextInput
              style={pk.searchInput}
              value={searchQuery}
              onChangeText={onSearchChange}
              placeholder="Buscar por nombre o país..."
              placeholderTextColor={C.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => onSearchChange('')}>
                <Ionicons name="close-circle" size={18} color={C.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(t) => String(t.id)}
            numColumns={2}
            style={{ backgroundColor: C.cardDark }}
            contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32, flexGrow: 1 }}
            columnWrapperStyle={{ gap: 10 }}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={pk.emptyPicker}>
                <Ionicons name="football-outline" size={32} color={C.textSecondary} />
                <Text style={pk.emptyPickerTitle}>
                  {teams.length === 0 ? 'Sin equipos en el torneo' : 'Sin resultados'}
                </Text>
                <Text style={pk.emptyPickerText}>
                  {teams.length === 0
                    ? 'Agrega partidos con equipos en la liga del torneo para poder elegir el podio.'
                    : 'Prueba con otro nombre o país.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const logo = getTeamLogo(item);
              return (
              <TouchableOpacity
                style={[pk.teamItem, selectedId === item.id && pk.teamItemSelected]}
                onPress={() => onSelect(item)}
              >
                {logo ? (
                  <Image source={{ uri: logo }} style={pk.teamLogo} resizeMode="contain" />
                ) : (
                  <Text style={pk.teamFlag}>{getFlagEmoji(item.country)}</Text>
                )}
                <Text style={[pk.teamName, selectedId === item.id && pk.teamNameSelected]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.short_name ? (
                  <Text style={pk.teamShort} numberOfLines={1}>{item.short_name}</Text>
                ) : null}
                {selectedId === item.id ? (
                  <Ionicons name="checkmark-circle" size={16} color={C.primary} style={{ position: 'absolute', top: 6, right: 6 }} />
                ) : null}
              </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
};

export default function TournamentSpecialsScreen({ navigation, route }) {
  const { tournamentId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const pk = useMemo(() => createPk(C), [C]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [teams, setTeams] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [selections, setSelections] = useState({ champion: null, runnerUp: null, thirdPlace: null });
  const [pickerFor, setPickerFor] = useState(null);
  const [teamSearch, setTeamSearch] = useState('');
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentPoints, setTournamentPoints] = useState({ champion_points: 45, runner_up_points: 35, third_place_points: 25 });
  const [statusModal, setStatusModal] = useState({ visible: false, type: 'success', title: '', message: '' });

  const closeStatus = () => setStatusModal(prev => ({ ...prev, visible: false }));

  const load = useCallback(async () => {
    try {
      const [specRes, tRes] = await Promise.all([
        tournamentService.getSpecialPrediction(tournamentId),
        tournamentService.getTournament(tournamentId)
      ]);
      const sp = specRes.data.data;
      const t = tRes.data.data;

      setLocked(t.special_predictions_locked);
      setTournamentName(t.name || 'Torneo');
      setTournamentPoints({
        champion_points: t.champion_points ?? 45,
        runner_up_points: t.runner_up_points ?? 35,
        third_place_points: t.third_place_points ?? 25,
      });

      if (sp) {
        setPrediction(sp);
        setSelections({
          champion: sp.champion_team || null,
          runnerUp: sp.runner_up_team || null,
          thirdPlace: sp.third_place_team || null,
        });
      }

      // Equipos que participan en los partidos del torneo
      const teamsRes = await tournamentService.getTeams(tournamentId);
      const tournamentTeams = teamsRes.data?.data || [];
      setTeams(tournamentTeams);
    } catch (err) {
      console.error('Error cargando menciones:', err);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const getAvailableTeams = (forKey) => {
    const usedIds = Object.entries(selections)
      .filter(([k, v]) => k !== forKey && v)
      .map(([, v]) => v.id);
    return teams.filter(t => !usedIds.includes(t.id));
  };

  const handleSave = async () => {
    const { champion, runnerUp, thirdPlace } = selections;
    if (!champion || !runnerUp || !thirdPlace) {
      setStatusModal({
        visible: true,
        type: 'warning',
        title: 'Selección incompleta',
        message: 'Debes elegir los tres equipos (Campeón, Subcampeón y Tercer puesto) para guardar tus menciones.',
      });
      return;
    }
    setSaving(true);
    try {
      await tournamentService.saveSpecialPrediction(tournamentId, {
        championTeamId: champion.id,
        runnerUpTeamId: runnerUp.id,
        thirdPlaceTeamId: thirdPlace.id,
      });
      setStatusModal({
        visible: true,
        type: 'success',
        title: '¡Menciones guardadas!',
        message: 'Tus predicciones del podio han sido registradas. ¡Buena suerte!',
      });
      load();
    } catch (err) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error al guardar',
        message: err.response?.data?.message || 'No se pudieron guardar las menciones. Intenta de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menciones Especiales</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}> Predice el podio — {tournamentName}</Text>
          <Text style={styles.infoText}>
            Elige Campeón, Subcampeón y Tercer Puesto entre los equipos que juegan en este torneo. Gana puntos bonus al finalizar.
          </Text>
          {teams.length > 0 ? (
            <Text style={styles.infoTeamsCount}>{teams.length} equipos disponibles</Text>
          ) : (
            <Text style={styles.infoTeamsWarning}>Aún no hay equipos cargados en los partidos del torneo.</Text>
          )}
          {locked && (
            <View style={styles.lockedBanner}>
              <Ionicons name="lock-closed" size={16} color={C.warning} />
              <Text style={styles.lockedText}> Menciones bloqueadas — el torneo ya inició</Text>
            </View>
          )}
        </View>

        {/* Selecciones */}
        {POSITIONS_BASE.map(pos => {
          const selected = selections[pos.key];
          const pts = tournamentPoints[pos.pointsKey] ?? '—';
          return (
            <View key={pos.key} style={[styles.posCard, { borderLeftWidth: 3, borderLeftColor: pos.color }]}>
              <View style={styles.posHeader}>
                <View style={styles.posLabelRow}>
                  <Text style={styles.posIcon}>{pos.icon}</Text>
                  <Text style={[styles.posLabel, { color: pos.color }]}>{pos.label}</Text>
                </View>
                <View style={[styles.posPtsBadge, { backgroundColor: pos.color + '22' }]}>
                  <Text style={[styles.posPts, { color: pos.color }]}>{pts} pts</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.selector, selected && styles.selectorSelected, locked && styles.selectorLocked]}
                onPress={() => {
                  if (teams.length === 0) {
                    setStatusModal({
                      visible: true,
                      type: 'warning',
                      title: 'Sin equipos',
                      message: 'Este torneo aún no tiene equipos en sus partidos. El administrador debe crear partidos con equipos en la liga del torneo.',
                    });
                    return;
                  }
                  setTeamSearch('');
                  setPickerFor(pos.key);
                }}
                disabled={locked}
              >
                {selected ? (
                  <View style={styles.selectedTeam}>
                    {getTeamLogo(selected) ? (
                      <Image source={{ uri: getTeamLogo(selected) }} style={styles.selectedLogo} resizeMode="contain" />
                    ) : (
                      <Text style={styles.selectedFlag}>{getFlagEmoji(selected.country)}</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedName}>{selected.name}</Text>
                      <Text style={styles.selectedShort}>{selected.short_name}</Text>
                    </View>
                    {!locked && <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />}
                  </View>
                ) : (
                  <View style={styles.placeholderRow}>
                    <Text style={[styles.placeholderText, locked && { color: C.border }]}>
                      {locked ? 'Sin selección' : 'Toca para elegir equipo'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Botón guardar */}
        {!locked && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {prediction ? 'Actualizar Menciones' : 'Guardar Menciones'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Puntos conseguidos (si ya está procesado) */}
        {prediction?.is_processed && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsTitle}>Puntos obtenidos</Text>
            <View style={styles.resultsRow}>
              <Text style={styles.resultsLabel}>Campeón</Text>
              <Text style={[styles.resultsPoints, { color: prediction.champion_points_earned > 0 ? C.primary : C.error }]}>
                {prediction.champion_points_earned} pts
              </Text>
            </View>
            <View style={styles.resultsRow}>
              <Text style={styles.resultsLabel}>Subcampeón</Text>
              <Text style={[styles.resultsPoints, { color: prediction.runner_up_points_earned > 0 ? C.primary : C.error }]}>
                {prediction.runner_up_points_earned} pts
              </Text>
            </View>
            <View style={styles.resultsRow}>
              <Text style={styles.resultsLabel}>Tercer Puesto</Text>
              <Text style={[styles.resultsPoints, { color: prediction.third_place_points_earned > 0 ? C.primary : C.error }]}>
                {prediction.third_place_points_earned} pts
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal selector de equipo */}
      <TeamPickerModal
        visible={!!pickerFor}
        teams={pickerFor ? getAvailableTeams(pickerFor) : []}
        selectedId={pickerFor ? selections[pickerFor]?.id : null}
        pk={pk}
        C={C}
        searchQuery={teamSearch}
        onSearchChange={setTeamSearch}
        onSelect={(team) => {
          setSelections(prev => ({ ...prev, [pickerFor]: team }));
          setPickerFor(null);
          setTeamSearch('');
        }}
        onClose={() => {
          setPickerFor(null);
          setTeamSearch('');
        }}
      />

      {/* Feedback modal — mismo diseño que el panel admin */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        primaryButtonText="Aceptar"
        onPrimaryPress={closeStatus}
        onClose={closeStatus}
      />
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  infoCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 16, marginBottom: 16 },
  infoTitle: { color: C.text, fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  infoText: { color: C.textSecondary, fontSize: 13, lineHeight: 20 },
  infoTeamsCount: { color: C.primary, fontSize: 12, fontWeight: '600', marginTop: 10 },
  infoTeamsWarning: { color: C.warning, fontSize: 12, fontWeight: '600', marginTop: 10 },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: C.warning + '22', padding: 10, borderRadius: 10 },
  lockedText: { color: C.warning, fontSize: 13, fontWeight: '500' },
  posCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 16, marginBottom: 12, overflow: 'hidden' },
  posHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  posLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  posIcon: { fontSize: 18 },
  posLabel: { fontSize: 15, fontWeight: 'bold' },
  posPtsBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  posPts: { fontSize: 12, fontWeight: '700' },
  selector: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, borderStyle: 'dashed' },
  selectorSelected: { borderStyle: 'solid', borderColor: C.primary + '66', backgroundColor: C.primary + '11' },
  selectorLocked: { borderColor: C.border, opacity: 0.7 },
  selectedTeam: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedFlag: { fontSize: 32 },
  selectedLogo: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surfaceMuted },
  selectedName: { color: C.text, fontWeight: '600', fontSize: 15 },
  selectedShort: { color: C.textSecondary, fontSize: 12 },
  placeholderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 6 },
  placeholderText: { color: C.primary, fontSize: 13 },
  saveBtn: { backgroundColor: C.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
  resultsCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 16, marginTop: 16 },
  resultsTitle: { color: C.text, fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  resultsLabel: { color: C.textSecondary, fontSize: 14 },
  resultsPoints: { fontSize: 15, fontWeight: 'bold' },
});

const createPk = (C) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  card: { backgroundColor: C.cardDark, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.primary + '28' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: C.border },
  title: { color: C.text, fontSize: 17, fontWeight: 'bold' },
  subtitle: { color: C.textSecondary, fontSize: 12, marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surfaceMuted,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 14, padding: 0 },
  emptyPicker: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  emptyPickerTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginTop: 12 },
  emptyPickerText: { color: C.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  teamItem: { flex: 1, backgroundColor: C.cardDark, borderRadius: 12, padding: 12, alignItems: 'center', minHeight: 96, justifyContent: 'center', borderWidth: 1.5, borderColor: C.border },
  teamItemSelected: { borderColor: C.primary, backgroundColor: C.primary + '18' },
  teamFlag: { fontSize: 28, marginBottom: 6 },
  teamLogo: { width: 40, height: 40, marginBottom: 6, borderRadius: 20, backgroundColor: C.surfaceMuted },
  teamName: { color: C.textSecondary, fontSize: 12, textAlign: 'center' },
  teamShort: { color: C.textHint, fontSize: 10, marginTop: 2 },
  teamNameSelected: { color: C.text, fontWeight: '600' },
});
