import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import tournamentService from '../../services/tournament.service';
import { useTheme } from '../../context/ThemeContext';
import { useThemeColors } from '../../hooks/useThemeColors';

const positionColors = { 1: '#ffd700', 2: '#c0c0c0', 3: '#cd7f32' };
const positionBg = { 1: 'rgba(255,215,0,0.1)', 2: 'rgba(192,192,192,0.08)', 3: 'rgba(205,127,50,0.08)' };

const LeaderboardItem = ({ item, isUser, index, styles, C }) => {
  const { position, user, total_points, correct_predictions } = item;
  const posColor = positionColors[position] || C.textSecondary;
  const isTop3 = position <= 3;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 40, 600),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <View style={[
        styles.itemCard,
        isUser && styles.itemCardUser,
        isTop3 && { backgroundColor: positionBg[position] || C.cardDark, borderColor: posColor + '44', borderWidth: 1 },
      ]}>
        <View style={[styles.positionBlock, isTop3 && { backgroundColor: posColor + '22', borderRadius: 10 }]}>
          {isTop3 ? (
            <Text style={[styles.posNumber, { color: posColor, fontSize: 18 }]}>{position}</Text>
          ) : (
            <Text style={[styles.posNumber, { color: C.textSecondary }]}>{position}</Text>
          )}
        </View>

        <View style={[styles.avatar, isUser && styles.avatarUser, isTop3 && { borderWidth: 2, borderColor: posColor }]}>
          <Text style={[styles.avatarText, isTop3 && { color: posColor }]}>
            {user?.username?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <Text style={[styles.username, isUser && { color: C.primary }, isTop3 && { color: posColor }]} numberOfLines={1}>
            {user?.username || 'Usuario'}{isUser ? '  (Tú)' : ''}
          </Text>
          <Text style={styles.subInfo}>{correct_predictions} aciertos</Text>
        </View>

        <View style={styles.pointsBlock}>
          <Text style={[styles.points, { color: isTop3 ? posColor : C.text }]}>
            {total_points}
          </Text>
          <Text style={styles.pointsLabel}>pts</Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function TournamentLeaderboardScreen({ navigation, route }) {
  const { tournamentId } = route.params;
  const insets = useSafeAreaInsets();
  const C = useThemeColors();
  const { palette } = useTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  const [leaderboard, setLeaderboard] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 30;

  const loadLeaderboard = useCallback(async (reset = true) => {
    try {
      const currentOffset = reset ? 0 : offset;
      const res = await tournamentService.getLeaderboard(tournamentId, LIMIT, currentOffset);
      const data = res.data.data || [];
      const userPos = res.data.user_position;

      if (reset) {
        setLeaderboard(data);
        setOffset(LIMIT);
      } else {
        setLeaderboard(prev => [...prev, ...data]);
        setOffset(currentOffset + LIMIT);
      }

      setHasMore(data.length === LIMIT);
      if (userPos) setUserPosition(userPos);
    } catch (err) {
      console.error('Error cargando leaderboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [tournamentId, offset]);

  useEffect(() => { loadLeaderboard(true); }, [tournamentId]);

  const onRefresh = () => { setRefreshing(true); loadLeaderboard(true); };

  const loadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    loadLeaderboard(false);
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
        <Text style={styles.headerTitle}>Tabla de Posiciones</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tu posición */}
      {userPosition && (
        <View style={styles.myPositionCard}>
          <View style={styles.myPosLeft}>
            <Text style={styles.myPosNum}>#{userPosition.position}</Text>
            <Text style={styles.myPosLabel}>Tu posición</Text>
          </View>
          <View style={styles.myPosDivider} />
          <View style={styles.myPosStats}>
            <View style={styles.myPosStat}>
              <Text style={styles.myPosStatVal}>{userPosition.total_points}</Text>
              <Text style={styles.myPosStatLabel}>Puntos</Text>
            </View>
            <View style={styles.myPosStat}>
              <Text style={styles.myPosStatVal}>{userPosition.correct_predictions}</Text>
              <Text style={styles.myPosStatLabel}>Aciertos</Text>
            </View>
            <View style={styles.myPosStat}>
              <Text style={styles.myPosStatVal}>{userPosition.special_points}</Text>
              <Text style={styles.myPosStatLabel}>Bonus</Text>
            </View>
          </View>
        </View>
      )}

      {/* Lista */}
      {leaderboard.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Aún no hay participantes con puntos</Text>
        </View>
      ) : (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => `${item.position}-${item.user?.id}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={C.accent} style={{ margin: 16 }} /> : null}
          renderItem={({ item, index }) => (
            <LeaderboardItem item={item} isUser={item.user?.id === userPosition?.user_id} index={index} styles={styles} C={C} />
          )}
        />
      )}
    </View>
  );
}

const createStyles = (C) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.text },
  emptyText: { color: C.textSecondary, fontSize: 15 },
  myPositionCard: { marginHorizontal: 12, marginBottom: 12, backgroundColor: C.primary + '18', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.primary + '44' },
  myPosLeft: { alignItems: 'center', marginRight: 12, minWidth: 52 },
  myPosNum: { fontSize: 30, fontWeight: 'bold', color: C.primary },
  myPosLabel: { fontSize: 10, color: C.primary + 'AA', marginTop: 2 },
  myPosDivider: { width: 1, height: 44, backgroundColor: C.primary + '33', marginRight: 12 },
  myPosStats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  myPosStat: { alignItems: 'center' },
  myPosStatVal: { fontSize: 20, fontWeight: 'bold', color: C.text },
  myPosStatLabel: { fontSize: 10, color: C.textSecondary, marginTop: 2 },
  itemCard: { backgroundColor: C.cardDark, borderRadius: 14, padding: 12, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  itemCardUser: { borderWidth: 1.5, borderColor: C.primary + '55', backgroundColor: C.primary + '0D' },
  positionBlock: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  posNumber: { fontSize: 15, fontWeight: 'bold' },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarUser: { backgroundColor: C.primary + '33' },
  avatarText: { color: C.text, fontWeight: 'bold', fontSize: 15 },
  userInfo: { flex: 1 },
  username: { color: C.text, fontWeight: '600', fontSize: 14 },
  subInfo: { color: C.textSecondary, fontSize: 11, marginTop: 2 },
  pointsBlock: { alignItems: 'flex-end' },
  points: { fontSize: 20, fontWeight: 'bold' },
  pointsLabel: { fontSize: 10, color: C.textSecondary },
});
