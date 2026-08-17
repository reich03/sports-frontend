import React, { useRef, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

const FLAGS = {
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

const CONFEDERATIONS = {
  'México': 'CONCACAF', 'Canadá': 'CONCACAF', 'Estados Unidos': 'CONCACAF',
  'Haití': 'CONCACAF', 'Panamá': 'CONCACAF', 'Curazao': 'CONCACAF',
  'Brasil': 'CONMEBOL', 'Argentina': 'CONMEBOL', 'Uruguay': 'CONMEBOL',
  'Colombia': 'CONMEBOL', 'Ecuador': 'CONMEBOL', 'Paraguay': 'CONMEBOL',
  'España': 'UEFA', 'Francia': 'UEFA', 'Alemania': 'UEFA', 'Portugal': 'UEFA',
  'Inglaterra': 'UEFA', 'Países Bajos': 'UEFA', 'Bélgica': 'UEFA', 'Croacia': 'UEFA',
  'Suiza': 'UEFA', 'Escocia': 'UEFA', 'Turquía': 'UEFA', 'Austria': 'UEFA',
  'Suecia': 'UEFA', 'Noruega': 'UEFA', 'Bosnia Herzegovina': 'UEFA', 'República Checa': 'UEFA',
  'Marruecos': 'CAF', 'Senegal': 'CAF', 'Costa de Marfil': 'CAF', 'Ghana': 'CAF',
  'Egipto': 'CAF', 'Sudáfrica': 'CAF', 'Argelia': 'CAF', 'Rep. D. Congo': 'CAF', 'Cabo Verde': 'CAF',
  'Japón': 'AFC', 'Corea del Sur': 'AFC', 'Australia': 'AFC', 'Irán': 'AFC',
  'Arabia Saudita': 'AFC', 'Qatar': 'AFC', 'Iraq': 'AFC', 'Uzbekistán': 'AFC', 'Jordania': 'AFC',
  'Nueva Zelanda': 'OFC',
};

export default function TeamDetailScreen({ navigation, route }) {
  const { team } = route.params;
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const flag = FLAGS[team.country] || '🏳️';
  const confederation = CONFEDERATIONS[team.country] || 'FIFA';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle={palette.statusBar} backgroundColor={C.background} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{team.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Hero */}
        <Animated.View style={[styles.heroCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.heroFlag}>{flag}</Text>
          <Text style={styles.heroName}>{team.name}</Text>
          {team.short_name && team.short_name !== team.name && (
            <Text style={styles.heroShort}>{team.short_name}</Text>
          )}
          <View style={styles.heroRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="globe-outline" size={13} color={C.primary} />
              <Text style={styles.heroBadgeText}>{team.country}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Ionicons name="football-outline" size={13} color={C.primary} />
              <Text style={styles.heroBadgeText}>{confederation}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Jugadores — próximamente */}
        <Animated.View style={[styles.playersCard, { opacity: fadeAnim }]}>
          <View style={styles.playersHeader}>
            <Text style={styles.playersTitle}>Plantilla</Text>
            <View style={styles.soonBadge}>
              <Text style={styles.soonText}>Próximamente</Text>
            </View>
          </View>
          <Text style={styles.playersHint}>
            Los jugadores de cada equipo se mostrarán aquí cuando estén disponibles.
          </Text>

          {/* Placeholder jugadores */}
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.playerRow}>
              <View style={styles.playerNumBg}>
                <Text style={styles.playerNum}>—</Text>
              </View>
              <View style={styles.playerInfo}>
                <View style={[styles.playerSkeleton, { width: 120 + i * 20 }]} />
                <View style={[styles.playerSkeleton, { width: 70, marginTop: 5, height: 9 }]} />
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: C.text, flex: 1, textAlign: 'center' },
  heroCard: {
    backgroundColor: C.cardDark,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.primary + '22',
  },
  heroFlag: { fontSize: 72, marginBottom: 12 },
  heroName: { color: C.text, fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  heroShort: { color: C.textSecondary, fontSize: 14, marginBottom: 16 },
  heroRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.primary + '18', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  heroBadgeText: { color: C.primary, fontSize: 12, fontWeight: '600' },
  playersCard: { backgroundColor: C.cardDark, borderRadius: 16, padding: 16 },
  playersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  playersTitle: { color: C.text, fontWeight: 'bold', fontSize: 15 },
  soonBadge: { backgroundColor: C.border, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  soonText: { color: C.textSecondary, fontSize: 11 },
  playersHint: { color: C.textSecondary, fontSize: 12, marginBottom: 16, lineHeight: 18 },
  playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 12 },
  playerNumBg: { width: 34, height: 34, borderRadius: 8, backgroundColor: C.background, justifyContent: 'center', alignItems: 'center' },
  playerNum: { color: C.textSecondary, fontSize: 13, fontWeight: 'bold' },
  playerInfo: { flex: 1 },
  playerSkeleton: { height: 12, backgroundColor: C.border, borderRadius: 6 },
});
