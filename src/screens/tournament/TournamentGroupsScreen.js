import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tournamentService from '../../services/tournament.service';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

const GROUPS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

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

export default function TournamentGroupsScreen({ navigation, route }) {
  const { tournamentId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('A');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  };

  const loadGroups = useCallback(async () => {
    try {
      const res = await tournamentService.getGroups(tournamentId);
      setGroups(res.data.data || {});
    } catch (err) {
      console.error('Error cargando grupos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      animateIn();
    }
  }, [tournamentId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  const onRefresh = () => { setRefreshing(true); loadGroups(); };

  const currentTeams = groups[selectedGroup] || [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grupos del Mundial</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={16} color={C.info} />
        <Text style={styles.infoText}>Los grupos son solo informativos — no se predicen posiciones</Text>
      </View>

      {/* Selector de grupo (horizontal) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupTabs}>
        {GROUPS.map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.groupTab, selectedGroup === g && styles.groupTabActive]}
            onPress={() => setSelectedGroup(g)}
          >
            <Text style={[styles.groupTabText, selectedGroup === g && styles.groupTabTextActive]}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          contentContainerStyle={{ padding: 16 }}
        >
          {/* Grupo card */}
          <Animated.View style={[styles.groupCard, { opacity: fadeAnim }]}>
            <View style={styles.groupCardHeader}>
              <Text style={styles.groupCardTitle}>Grupo {selectedGroup}</Text>
              <Text style={styles.groupCardSub}>{currentTeams.length} equipos</Text>
            </View>

            {currentTeams.length === 0 ? (
              <Text style={styles.emptyText}>Sin datos del grupo</Text>
            ) : (
              currentTeams.map((team, idx) => (
                <TouchableOpacity
                  key={team.id}
                  style={[styles.teamRow, idx < currentTeams.length - 1 && styles.teamRowBorder]}
                  onPress={() => navigation.navigate('TeamDetail', { team, tournamentId })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.teamPos}>{idx + 1}</Text>
                  <Text style={styles.teamFlag}>{getFlagEmoji(team.country)}</Text>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{team.name}</Text>
                    <Text style={styles.teamShort}>{team.short_name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.border} />
                </TouchableOpacity>
              ))
            )}
          </Animated.View>

          {/* Vista general de todos los grupos */}
          <Text style={styles.sectionTitle}>Todos los grupos</Text>
          <View style={styles.allGroupsGrid}>
            {GROUPS.map(g => (
              <TouchableOpacity
                key={g}
                style={[styles.miniGroup, selectedGroup === g && styles.miniGroupActive]}
                onPress={() => setSelectedGroup(g)}
              >
                <Text style={[styles.miniGroupTitle, selectedGroup === g && { color: C.primary }]}>
                  Grupo {g}
                </Text>
                {(groups[g] || []).map(team => (
                  <TouchableOpacity
                    key={team.id}
                    style={styles.miniTeamRow}
                    onPress={() => navigation.navigate('TeamDetail', { team, tournamentId })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.miniFlag}>{getFlagEmoji(team.country)}</Text>
                    <Text style={styles.miniName} numberOfLines={1}>{team.short_name || team.name}</Text>
                  </TouchableOpacity>
                ))}
                {(!groups[g] || groups[g].length === 0) && (
                  <Text style={styles.miniEmpty}>Cargando...</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  infoBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, backgroundColor: C.info + '22', padding: 10, borderRadius: 10, marginBottom: 8, gap: 8 },
  infoText: { flex: 1, color: C.info, fontSize: 12 },
  groupTabs: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  groupTab: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardDark, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  groupTabActive: { backgroundColor: C.accent, borderColor: C.accent },
  groupTabText: { color: C.textSecondary, fontWeight: 'bold', fontSize: 15 },
  groupTabTextActive: { color: C.onAccent },
  groupCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 16, marginBottom: 24 },
  groupCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  groupCardTitle: { color: C.text, fontSize: 20, fontWeight: 'bold' },
  groupCardSub: { color: C.textSecondary, fontSize: 13 },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  teamRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  teamPos: { color: C.textSecondary, width: 24, textAlign: 'center', fontWeight: 'bold' },
  teamFlag: { fontSize: 28, marginHorizontal: 12 },
  teamInfo: { flex: 1 },
  teamName: { color: C.text, fontWeight: '600', fontSize: 15 },
  teamShort: { color: C.textSecondary, fontSize: 12, marginTop: 1 },
  emptyText: { color: C.textSecondary, textAlign: 'center', padding: 20 },
  sectionTitle: { color: C.textSecondary, fontSize: 12, letterSpacing: 1, marginBottom: 12 },
  allGroupsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniGroup: { width: '47%', backgroundColor: C.cardDark, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  miniGroupActive: { borderColor: C.primary },
  miniGroupTitle: { color: C.text, fontWeight: 'bold', fontSize: 13, marginBottom: 8 },
  miniTeamRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 6 },
  miniFlag: { fontSize: 16 },
  miniName: { color: C.textSecondary, fontSize: 11, flex: 1 },
  miniEmpty: { color: C.border, fontSize: 11 },
});
