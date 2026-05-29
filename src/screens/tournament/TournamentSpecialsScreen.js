import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/theme';
import tournamentService from '../../services/tournament.service';
import StatusModal from '../../components/StatusModal';

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

const TeamPickerModal = ({ visible, teams, onSelect, onClose, selectedId }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={pk.overlay}>
      <View style={pk.card}>
        <View style={pk.header}>
          <Text style={pk.title}>Selecciona un equipo</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={teams}
          keyExtractor={t => t.id}
          numColumns={2}
          style={{ backgroundColor: '#0f1e18' }}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 32 }}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pk.teamItem, selectedId === item.id && pk.teamItemSelected]}
              onPress={() => onSelect(item)}
            >
              <Text style={pk.teamFlag}>{getFlagEmoji(item.country)}</Text>
              <Text style={[pk.teamName, selectedId === item.id && pk.teamNameSelected]} numberOfLines={2}>
                {item.name}
              </Text>
              {selectedId === item.id && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} style={{ position: 'absolute', top: 6, right: 6 }} />}
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  </Modal>
);

export default function TournamentSpecialsScreen({ navigation, route }) {
  const { tournamentId } = route.params;
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [teams, setTeams] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [selections, setSelections] = useState({ champion: null, runnerUp: null, thirdPlace: null });
  const [pickerFor, setPickerFor] = useState(null);
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

      // Obtener equipos desde los grupos
      const groupsRes = await tournamentService.getGroups(tournamentId);
      const groupsData = groupsRes.data.data || {};
      const allTeams = Object.values(groupsData).flat();
      const unique = allTeams.filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);
      setTeams(unique.sort((a, b) => a.name.localeCompare(b.name)));
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Menciones Especiales</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⭐ Predice el podio del Mundial</Text>
          <Text style={styles.infoText}>
            Elige quién será el Campeón, Subcampeón y Tercer Puesto. Gana puntos bonus al finalizar el torneo.
          </Text>
          {locked && (
            <View style={styles.lockedBanner}>
              <Ionicons name="lock-closed" size={16} color={COLORS.warning} />
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
                onPress={() => !locked && setPickerFor(pos.key)}
                disabled={locked}
              >
                {selected ? (
                  <View style={styles.selectedTeam}>
                    <Text style={styles.selectedFlag}>{getFlagEmoji(selected.country)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedName}>{selected.name}</Text>
                      <Text style={styles.selectedShort}>{selected.short_name}</Text>
                    </View>
                    {!locked && <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />}
                  </View>
                ) : (
                  <View style={styles.placeholderRow}>
                    <Text style={[styles.placeholderText, locked && { color: COLORS.border }]}>
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
              <ActivityIndicator color={COLORS.backgroundDark} />
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
              <Text style={[styles.resultsPoints, { color: prediction.champion_points_earned > 0 ? COLORS.primary : COLORS.error }]}>
                {prediction.champion_points_earned} pts
              </Text>
            </View>
            <View style={styles.resultsRow}>
              <Text style={styles.resultsLabel}>Subcampeón</Text>
              <Text style={[styles.resultsPoints, { color: prediction.runner_up_points_earned > 0 ? COLORS.primary : COLORS.error }]}>
                {prediction.runner_up_points_earned} pts
              </Text>
            </View>
            <View style={styles.resultsRow}>
              <Text style={styles.resultsLabel}>Tercer Puesto</Text>
              <Text style={[styles.resultsPoints, { color: prediction.third_place_points_earned > 0 ? COLORS.primary : COLORS.error }]}>
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
        onSelect={(team) => {
          setSelections(prev => ({ ...prev, [pickerFor]: team }));
          setPickerFor(null);
        }}
        onClose={() => setPickerFor(null)}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundDark },
  center: { flex: 1, backgroundColor: COLORS.backgroundDark, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.white },
  infoCard: { backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 16, marginBottom: 16 },
  infoTitle: { color: COLORS.white, fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  infoText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  lockedBanner: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: COLORS.warning + '22', padding: 10, borderRadius: 10 },
  lockedText: { color: COLORS.warning, fontSize: 13, fontWeight: '500' },
  posCard: { backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 16, marginBottom: 12, overflow: 'hidden' },
  posHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  posLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  posIcon: { fontSize: 18 },
  posLabel: { fontSize: 15, fontWeight: 'bold' },
  posPtsBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  posPts: { fontSize: 12, fontWeight: '700' },
  selector: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, borderStyle: 'dashed' },
  selectorSelected: { borderStyle: 'solid', borderColor: COLORS.primary + '66', backgroundColor: COLORS.primary + '11' },
  selectorLocked: { borderColor: COLORS.border, opacity: 0.7 },
  selectedTeam: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedFlag: { fontSize: 32 },
  selectedName: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
  selectedShort: { color: COLORS.textSecondary, fontSize: 12 },
  placeholderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', paddingVertical: 6 },
  placeholderText: { color: COLORS.primary, fontSize: 13 },
  saveBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: COLORS.backgroundDark, fontWeight: 'bold', fontSize: 16 },
  resultsCard: { backgroundColor: COLORS.cardDark, borderRadius: 16, padding: 16, marginTop: 16 },
  resultsTitle: { color: COLORS.white, fontWeight: 'bold', fontSize: 15, marginBottom: 12 },
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  resultsLabel: { color: COLORS.textSecondary, fontSize: 14 },
  resultsPoints: { fontSize: 15, fontWeight: 'bold' },
});

const pk = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  card: { backgroundColor: '#0f1e18', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '82%', borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.primary + '28' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  teamItem: { flex: 1, backgroundColor: COLORS.cardDark, borderRadius: 12, padding: 12, alignItems: 'center', minHeight: 90, justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.border },
  teamItemSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
  teamFlag: { fontSize: 28, marginBottom: 6 },
  teamName: { color: COLORS.textSecondary, fontSize: 12, textAlign: 'center' },
  teamNameSelected: { color: COLORS.white, fontWeight: '600' },
});
