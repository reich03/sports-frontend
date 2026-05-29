import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/theme';
import SplashScreen from '../components/SplashScreen';

// Import screens (we'll create these)
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

import HomeScreen from '../screens/home/HomeScreen';
import PredictionsScreen from '../screens/predictions/PredictionsScreen';
import CreatePredictionScreen from '../screens/predictions/CreatePredictionScreen';
import CreateRoundPredictionScreen from '../screens/predictions/CreateRoundPredictionScreen';
import PredictionDetailsScreen from '../screens/predictions/PredictionDetailsScreen';
import AvailableMatchesScreen from '../screens/matches/AvailableMatchesScreen';
import RankingsScreen from '../screens/rankings/RankingsScreen';
import GroupsScreen from '../screens/groups/GroupsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Tournament (Mundial) screens
import TournamentHomeScreen from '../screens/tournament/TournamentHomeScreen';
import TournamentMatchesScreen from '../screens/tournament/TournamentMatchesScreen';
import TournamentSpecialsScreen from '../screens/tournament/TournamentSpecialsScreen';
import TournamentLeaderboardScreen from '../screens/tournament/TournamentLeaderboardScreen';
import TournamentGroupsScreen from '../screens/tournament/TournamentGroupsScreen';
import TournamentJoinScreen from '../screens/tournament/TournamentJoinScreen';
import TeamDetailScreen from '../screens/tournament/TeamDetailScreen';

// Admin screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import LeagueManagement from '../screens/admin/LeagueManagement';
import TeamManagement from '../screens/admin/TeamManagement';
import MatchManagement from '../screens/admin/MatchManagement';
import SportManagement from '../screens/admin/SportManagement';
import UserManagement from '../screens/admin/UserManagement';
import RoundManagement from '../screens/admin/RoundManagement';
import ScoringRulesManagement from '../screens/admin/ScoringRulesManagement';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Auth Stack
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: COLORS.backgroundDark },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.cardDark,
          borderTopColor: COLORS.border,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 4,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Predictions" 
        component={PredictionsScreen}
        options={{
          tabBarLabel: 'Predicciones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Rankings" 
        component={RankingsScreen}
        options={{
          tabBarLabel: 'Rankings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="podium" size={size} color={color} />
          ),
        }}
      />
      {/* <Tab.Screen 
        name="Groups" 
        component={GroupsScreen}
        options={{
          tabBarLabel: 'Grupos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      /> */}
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Stack (wraps tabs and adds additional screens)
const MainStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.cardDark,
          borderBottomColor: COLORS.border,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          color: COLORS.white,
          fontWeight: 'bold',
        },
        cardStyle: { backgroundColor: COLORS.backgroundDark },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreatePrediction" 
        component={CreatePredictionScreen}
        options={{ 
          title: 'Hacer Predicción',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="CreateRoundPrediction" 
        component={CreateRoundPredictionScreen}
        options={{ 
          title: 'Predecir Jornada',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="PredictionDetails" 
        component={PredictionDetailsScreen}
        options={{ 
          title: 'Detalles de Predicción',
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="AvailableMatches" 
        component={AvailableMatchesScreen}
        options={{ 
          headerShown: false,
        }}
      />
      
      {/* ─── Mundial 2026 Screens ─── */}
      <Stack.Screen
        name="TournamentHome"
        component={TournamentHomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TournamentMatches"
        component={TournamentMatchesScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TournamentSpecials"
        component={TournamentSpecialsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TournamentLeaderboard"
        component={TournamentLeaderboardScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TournamentGroups"
        component={TournamentGroupsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TournamentJoin"
        component={TournamentJoinScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TeamDetail"
        component={TeamDetailScreen}
        options={{ headerShown: false }}
      />

      {/* Admin Screens */}
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboard}
        options={{ 
          title: 'Admin Dashboard',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="LeagueManagement" 
        component={LeagueManagement}
        options={{ 
          title: 'League Management',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="RoundManagement" 
        component={RoundManagement}
        options={{ 
          title: 'Round Management',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="TeamManagement" 
        component={TeamManagement}
        options={{ 
          title: 'Team Management',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="MatchManagement" 
        component={MatchManagement}
        options={{ 
          title: 'Match Management',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="SportManagement" 
        component={SportManagement}
        options={{ 
          title: 'Sport Management',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="UserManagement" 
        component={UserManagement}
        options={{ 
          title: 'User Management',
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ScoringRules" 
        component={ScoringRulesManagement}
        options={{ 
          title: 'Scoring Rules',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Root Navigator
const RootNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default RootNavigator;
