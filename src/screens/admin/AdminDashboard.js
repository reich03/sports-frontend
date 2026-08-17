import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  RefreshControl,
  Animated,
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import AdminHeader from '../../components/admin/AdminHeader';
import { sportService, leagueService, teamService, matchService, userService } from '../../services';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = ({ navigation }) => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalLeagues: 0,
    totalTeams: 0,
    activeSports: 0,
    totalMatches: 0,
    liveMatches: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    fetchStats();
    
    // Animación de pulso
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const fetchStats = async () => {
    try {
      console.log('🔍 AdminDashboard - Fetching stats...');
      
      const [sports, leagues, teams, matches, users] = await Promise.all([
        sportService.getAllSports(),
        leagueService.getAllLeagues(),
        teamService.getAllTeams(),
        matchService.getMatches(),
        userService.getAllUsers().catch(() => ({ data: { users: [] } })),
      ]);

      const usersList = users.data?.users || [];
      const activeUsers = usersList.filter((u) => u.is_active !== false && u.status !== 'inactive' && u.status !== 'banned').length;
      const liveMatches = (matches.data?.matches || []).filter((m) => m.status === 'live' || m.status === 'in_progress').length;

      setStats(prev => ({
        ...prev,
        activeSports: sports.data?.sports?.length || 0,
        totalLeagues: leagues.data?.leagues?.length || 0,
        totalTeams: teams.data?.teams?.length || 0,
        totalMatches: matches.data?.matches?.length || 0,
        totalUsers: usersList.length,
        activeUsers,
        liveMatches,
      }));
      
      console.log('✅ Stats updated successfully');
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const managementModules = [
    {
      title: 'Deportes',
      icon: 'basketball',
      route: 'SportManagement',
    },
    {
      title: 'Ligas',
      icon: 'trophy',
      route: 'LeagueManagement',
    },
    {
      title: 'Jornadas',
      icon: 'calendar',
      route: 'RoundManagement',
      color: COLORS.primary,
    },
    {
      title: 'Equipos',
      icon: 'shield',
      route: 'TeamManagement',
    },
    {
      title: 'Partidos',
      icon: 'football',
      route: 'MatchManagement',
    },
    {
      title: 'Usuarios',
      icon: 'people',
      route: 'UserManagement',
    },
    {
      title: 'Torneos',
      icon: 'trophy',
      route: 'TournamentManagement',
      color: '#7be6ff',
    },
    {
      title: 'Pollas WC',
      icon: 'earth',
      route: 'TournamentParticipants',
      color: '#a78bfa',
    },
    {
      title: 'Equipos F1',
      icon: 'car-sport',
      route: 'F1TeamManagement',
      color: '#ef4444',
    },
    {
      title: 'Pilotos F1',
      icon: 'person',
      route: 'F1DriverManagement',
      color: '#ef4444',
    },
    {
      title: 'Eventos F1',
      icon: 'flag',
      route: 'F1EventManagement',
      color: '#ef4444',
    },
    {
      title: 'Puntos',
      icon: 'medal',
      route: 'ScoringRules',
      color: '#fbbf24',
    },
    {
      title: 'Analíticas',
      icon: 'stats-chart',
      route: null,
    },
  ];

  return (
    <View style={styles.container}>
      <AdminHeader 
        title="MasterSports"
        subtitle="Admin Console"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchStats();
          }} />
        }
      >
      

        {/* Estadísticas Globales */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Estadísticas Globales</Text>
          </View>

          {/* Mini stats: cuadrícula 2×2 · icono a la izquierda, valor + label a la derecha */}
          <View style={styles.miniStatsGrid}>
            <View style={[styles.miniStat, { borderLeftColor: COLORS.primary }]}>
              <View style={[styles.miniStatIcon, { backgroundColor: `${COLORS.primary}22` }]}>
                <Ionicons name="trophy" size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniStatValue}>{stats.totalLeagues}</Text>
                <Text style={styles.miniStatLabel}>Ligas</Text>
              </View>
            </View>
            <View style={[styles.miniStat, { borderLeftColor: '#7be6ff' }]}>
              <View style={[styles.miniStatIcon, { backgroundColor: '#7be6ff22' }]}>
                <Ionicons name="shield" size={20} color="#7be6ff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniStatValue}>{stats.totalTeams}</Text>
                <Text style={styles.miniStatLabel}>Equipos</Text>
              </View>
            </View>
            <View style={[styles.miniStat, { borderLeftColor: '#fbbf24' }]}>
              <View style={[styles.miniStatIcon, { backgroundColor: '#fbbf2422' }]}>
                <Ionicons name="football" size={20} color="#fbbf24" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniStatValue}>{stats.totalMatches}</Text>
                <Text style={styles.miniStatLabel}>Partidos</Text>
              </View>
            </View>
            <View style={[styles.miniStat, { borderLeftColor: '#a78bfa' }]}>
              <View style={[styles.miniStatIcon, { backgroundColor: '#a78bfa22' }]}>
                <Ionicons name="basketball" size={20} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.miniStatValue}>{stats.activeSports}</Text>
                <Text style={styles.miniStatLabel}>Deportes</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {/* Usuarios */}
            <View style={styles.statCard}>
              <View style={styles.statBackground}>
                <Ionicons name="people" size={60} color={COLORS.white} style={styles.statBackgroundIcon} />
              </View>
              <Text style={styles.statCategory}>USUARIOS REGISTRADOS</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stats.totalUsers.toLocaleString()}</Text>
                <View style={styles.statBadge}>
                  <Text style={styles.statBadgeText}>{stats.activeUsers} activos</Text>
                </View>
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${stats.totalUsers > 0 ? Math.min(100, (stats.activeUsers / stats.totalUsers) * 100) : 0}%` }]} />
              </View>
              <Text style={styles.statFootnote}>
                {stats.totalUsers > 0
                  ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% de usuarios activos`
                  : 'Aún no hay usuarios registrados'}
              </Text>
            </View>

            {/* Apuestas Totales */}
            {/* <View style={styles.statCard}>
              <View style={styles.statBackground}>
                <Ionicons name="wallet" size={60} color={COLORS.white} style={styles.statBackgroundIcon} />
              </View>
              <Text style={styles.statCategory}>APUESTAS TOTALES</Text>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>${(stats.totalBets / 1000).toFixed(1)}k</Text>
                <Text style={styles.statUpdated}>Actualizado</Text>
              </View>
              <View style={styles.chartBars}>
                <View style={[styles.chartBar, { height: 24, opacity: 0.3 }]} />
                <View style={[styles.chartBar, { height: 32, opacity: 0.5 }]} />
                <View style={[styles.chartBar, { height: 20, opacity: 0.3 }]} />
                <View style={[styles.chartBar, { height: 40, opacity: 0.7 }]} />
                <View style={[styles.chartBar, { height: 48, opacity: 1 }]} />
              </View>
            </View> */}

            {/* Pendiente de Pago */}
            {/* <View style={styles.statCard}>
              <View style={styles.statBackground}>
                <Ionicons name="cash" size={60} color={COLORS.white} style={styles.statBackgroundIcon} />
              </View>
              <Text style={styles.statCategory}>PENDIENTE DE PAGO</Text>
              <View style={styles.statValueRow}>
                <Text style={[styles.statValue, { color: '#ff716c' }]}>${(stats.pendingPayouts / 1000).toFixed(1)}k</Text>
              </View>
              <Text style={styles.statNote}>7 liquidaciones pendientes por procesar</Text>
            </View> */}
          </View>
        </View>

        {/* Acciones Rápidas 
        <View style={[styles.section, { marginBottom: 48 }]}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionPrimary}
              onPress={() => navigation.navigate('MatchManagement')}
            >
              <Ionicons name="add-circle" size={24} color="#005d2c" />
              <Text style={styles.quickActionPrimaryText}>Crear Partido</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionSecondary}
              onPress={() => navigation.navigate('SportManagement')}
            >
              <Ionicons name="football" size={24} color={COLORS.white} />
              <Text style={styles.quickActionSecondaryText}>Añadir Deporte</Text>
            </TouchableOpacity>
          </View>
        </View>*/}

        {/* Módulos de Gestión */}
        <View style={[styles.section, { marginBottom: 32 }]}>
          <Text style={styles.sectionTitle}>Módulos de Gestión</Text>
          
          <View style={styles.modulesGrid}>
            {managementModules.map((module, index) => (
              <TouchableOpacity
                key={index}
                style={styles.moduleCard}
                onPress={() => {
                  if (module.route) {
                    navigation.navigate(module.route);
                  } else {
                    Alert.alert(
                      'Módulo en desarrollo',
                      `La sección de ${module.title} estará disponible próximamente.`,
                      [{ text: 'Entendido', style: 'default' }]
                    );
                  }
                }}
              >
                <View style={styles.moduleIcon}>
                  <Ionicons name={module.icon} size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.moduleTitle}>{module.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f141a',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    marginRight: 12,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseOuter: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    opacity: 0.4,
  },
  pulseInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f3fc',
    letterSpacing: 0.5,
  },
  statusHighlight: {
    color: COLORS.primary,
  },

  // Section
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#f1f3fc',
    letterSpacing: -0.5,
    flex: 1,
    flexShrink: 1,
    marginBottom: 10,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // Mini stats (grid 2×2)
  miniStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  miniStat: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0f141a',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
  },
  miniStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStatValue: {
    color: '#f1f3fc',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  miniStatLabel: {
    color: '#a8abb3',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statFootnote: {
    color: '#a8abb3',
    fontSize: 11,
    marginTop: 10,
    fontWeight: '500',
  },

  // Stats Grid
  statsGrid: {
    gap: 16,
  },
  statCard: {
    backgroundColor: '#0f141a',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  statBackground: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  statBackgroundIcon: {
    opacity: 0.1,
  },
  statCategory: {
    fontSize: 10,
    fontWeight: '600',
    color: '#a8abb3',
    letterSpacing: 2,
    marginBottom: 8,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 20,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f1f3fc',
    letterSpacing: -1,
  },
  statBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statUpdated: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7be6ff',
  },
  statNote: {
    fontSize: 11,
    color: '#a8abb3',
    fontStyle: 'italic',
    marginTop: 16,
  },
  
  // Progress Bar
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#20262f',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },

  // Chart Bars
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
    marginTop: 20,
  },
  chartBar: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  // Quick Actions
  quickActionsGrid: {
    gap: 12,
  },
  quickActionPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  quickActionPrimaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#005d2c',
    letterSpacing: -0.3,
  },
  quickActionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b2028',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  quickActionSecondaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f3fc',
    letterSpacing: -0.3,
  },

  // Modules Grid
  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduleCard: {
    width: '30%',
    backgroundColor: '#0f141a',
    paddingVertical: 20,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  moduleIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#20262f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f1f3fc',
    textAlign: 'center',
  },
});

export default AdminDashboard;
