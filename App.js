import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import RootNavigator from './src/navigation/RootNavigator';
import StatusModal from './src/components/StatusModal';

function AppContent() {
  const { isDark } = useTheme();
  const { sessionExpired, dismissSessionExpired } = useAuth();
  return (
    <>
      <RootNavigator />

      {/* Modal global de sesión expirada por token vencido / inactividad */}
      <StatusModal
        visible={sessionExpired}
        type="warning"
        icon="time-outline"
        title="Sesión expirada"
        message="Tu sesión se cerró por inactividad. Por seguridad, vuelve a iniciar sesión para continuar."
        primaryButtonText="Iniciar sesión"
        onPrimaryPress={dismissSessionExpired}
        onClose={dismissSessionExpired}
      />

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
