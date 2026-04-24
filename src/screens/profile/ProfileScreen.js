import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
  Image,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/theme';
import { BASE_URL } from '../../constants/config';
import StatusModal from '../../components/StatusModal';
import { userService, authService } from '../../services';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, refreshUser } = useAuth();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoutModal, setLogoutModal] = useState(false);
  
  // Edit Profile Modal
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Change Password Modal
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  
  // Status Modal
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Refresh user data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      await refreshUser();
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    setLogoutModal(true);
  };

  const confirmLogout = () => {
    setLogoutModal(false);
    logout();
  };
  
  // Edit Profile Functions
  const openEditProfile = () => {
    setEditUsername(user?.username || '');
    setEditEmail(user?.email || '');
    setEditProfileModal(true);
  };
  
  const handleSaveProfile = async () => {
    if (!editUsername.trim() || !editEmail.trim()) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Por favor completa todos los campos',
      });
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Por favor ingresa un email válido',
      });
      return;
    }
    
    setSavingProfile(true);
    try {
      await userService.updateUserProfile(user.id, {
        username: editUsername,
        email: editEmail,
      });
      
      await refreshUser();
      setEditProfileModal(false);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Éxito',
        message: 'Perfil actualizado correctamente',
      });
    } catch (error) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo actualizar el perfil',
      });
    } finally {
      setSavingProfile(false);
    }
  };
  
  // Change Password Functions
  const openChangePassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setChangePasswordModal(true);
  };
  
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Por favor completa todos los campos',
      });
      return;
    }
    
    if (newPassword.length < 8) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'La nueva contraseña debe tener al menos 8 caracteres',
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Las contraseñas no coinciden',
      });
      return;
    }
    
    setSavingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      
      setChangePasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Éxito',
        message: 'Contraseña actualizada correctamente',
      });
    } catch (error) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error?.message || 'No se pudo cambiar la contraseña',
      });
    } finally {
      setSavingPassword(false);
    }
  };
  
  // Avatar Upload Function
  const handleAvatarPress = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a la galería');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        try {
          await userService.uploadAvatar(user.id, imageUri);
          await refreshUser();
          
          setStatusModal({
            visible: true,
            type: 'success',
            title: 'Éxito',
            message: 'Foto de perfil actualizada',
          });
        } catch (error) {
          setStatusModal({
            visible: true,
            type: 'error',
            title: 'Error',
            message: error.message || 'No se pudo subir la imagen',
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: 'Ocurrió un error al seleccionar la imagen',
      });
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const memberSince = new Date(user?.createdAt || '2023-03-01').toLocaleDateString('es-ES', { 
    month: 'long', 
    year: 'numeric' 
  });

  const SettingRow = ({ icon, title, subtitle, onPress, rightElement, showBorder = true }) => (
    <TouchableOpacity 
      style={[styles.settingRow, !showBorder && styles.settingRowNoBorder]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color="#6b7280" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0e14" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* User Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarContainer}>
              {user?.avatar ? (
                <Image 
                  source={{ uri: `${BASE_URL}${user.avatar}` }} 
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={handleAvatarPress}
            >
              <Ionicons name="create" size={16} color="#0a0e14" />
            </TouchableOpacity>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.memberBadge}>Miembro de MasterSport</Text>
          <Text style={styles.memberSince}>Miembro desde {memberSince}</Text>
        </View>

        {/* Admin Panel - Solo para super_admin */}
        {isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>ADMINISTRACIÓN</Text>
            <View style={styles.card}>
              <TouchableOpacity 
                style={[styles.settingRow, styles.settingRowNoBorder]}
                onPress={() => navigation.navigate('AdminDashboard')}
              >
                <View style={styles.settingIcon}>
                  <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Panel de Administración</Text>
                  <Text style={styles.settingSubtitle}>Gestionar plataforma</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>MIS ESTADÍSTICAS</Text>
          <View style={styles.statsContainer}>
            <View style={[styles.statCard, styles.statCardHighlight]}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trophy" size={28} color={COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{user?.total_points || 0}</Text>
              <Text style={styles.statLabel}>Puntos Totales</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="analytics" size={24} color={COLORS.success} />
              </View>
              <Text style={[styles.statValue, { color: COLORS.success }]}>
                {user?.correct_predictions || 0}
              </Text>
              <Text style={styles.statLabel}>Aciertos</Text>
            </View>
          </View>
          <View style={styles.statsSecondRow}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="football" size={24} color="#6b7280" />
              </View>
              <Text style={styles.statValue}>{user?.total_predictions || 0}</Text>
              <Text style={styles.statLabel}>Predicciones</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Ionicons name="trending-up" size={24} color="#6b7280" />
              </View>
              <Text style={styles.statValue}>
                {user?.total_predictions > 0 
                  ? Math.round((user?.correct_predictions / user?.total_predictions) * 100) 
                  : 0}%
              </Text>
              <Text style={styles.statLabel}>Efectividad</Text>
            </View>
          </View>
        </View>

        {/* Profile Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PERFIL</Text>
          <View style={styles.card}>
            <SettingRow
              icon="person"
              title="Editar Perfil"
              subtitle="Nombre y correo electrónico"
              onPress={openEditProfile}
              showBorder={false}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>NOTIFICACIONES</Text>
          <View style={styles.card}>
            <SettingRow
              icon="notifications"
              title="Notificaciones Push"
              subtitle="Alertas de partidos y resultados"
              rightElement={
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: '#374151', true: COLORS.primary }}
                  thumbColor="#ffffff"
                />
              }
            />
            <SettingRow
              icon="at"
              title="Actualizaciones por Email"
              subtitle="Resumen semanal de predicciones"
              rightElement={
                <Switch
                  value={emailUpdates}
                  onValueChange={setEmailUpdates}
                  trackColor={{ false: '#374151', true: COLORS.primary }}
                  thumbColor="#ffffff"
                />
              }
              showBorder={false}
            />
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SEGURIDAD</Text>
          <View style={styles.card}>
            <SettingRow
              icon="lock-closed"
              title="Cambiar Contraseña"
              subtitle="Actualiza tu contraseña"
              onPress={openChangePassword}
              showBorder={false}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PREFERENCIAS</Text>
          <View style={styles.card}>
            <SettingRow
              icon="language"
              title="Idioma"
              subtitle="Español (ES)"
              // onPress={() => Alert.alert('En desarrollo', 'Función disponible próximamente')}
            />
            <SettingRow
              icon="moon"
              title="Modo Oscuro"
              subtitle="Activado"
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#374151', true: COLORS.primary }}
                  thumbColor="#ffffff"
                />
              }
              showBorder={false}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
          <Text style={styles.signOutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.appVersion}>MASTERSPORT v1.0.0</Text>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <StatusModal
        visible={logoutModal}
        type="warning"
        title="Cerrar Sesión"
        message="¿Estás seguro de que deseas salir de tu cuenta?"
        primaryButtonText="Salir"
        secondaryButtonText="Cancelar"
        onPrimaryPress={confirmLogout}
        onSecondaryPress={() => setLogoutModal(false)}
        onClose={() => setLogoutModal(false)}
      />

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Perfil</Text>
              <TouchableOpacity
                onPress={() => setEditProfileModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nombre de Usuario</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu nombre de usuario"
                  placeholderTextColor="#6b7280"
                  value={editUsername}
                  onChangeText={setEditUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo Electrónico</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
                  placeholderTextColor="#6b7280"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setEditProfileModal(false)}
                disabled={savingProfile}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator size="small" color="#0a0e14" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setChangePasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
              <TouchableOpacity
                onPress={() => setChangePasswordModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contraseña Actual</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Tu contraseña actual"
                  placeholderTextColor="#6b7280"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nueva Contraseña</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nueva contraseña (mín. 8 caracteres)"
                  placeholderTextColor="#6b7280"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirmar Contraseña</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Repite la nueva contraseña"
                  placeholderTextColor="#6b7280"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setChangePasswordModal(false)}
                disabled={savingPassword}
              >
                <Text style={styles.modalButtonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleChangePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator size="small" color="#0a0e14" />
                ) : (
                  <Text style={styles.modalButtonTextPrimary}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        onClose={() => setStatusModal({ ...statusModal, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e14',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 16,
    backgroundColor: 'rgba(10, 14, 20, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#0a0e14',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#0a0e14',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  memberBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginTop: 4,
  },
  memberSince: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },

  // Section
  section: {
    marginTop: 0,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 2,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },

  // Card
  card: {
    backgroundColor: 'rgba(0, 230, 119, 0.05)',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.1)',
    overflow: 'hidden',
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 230, 119, 0.05)',
  },
  settingRowNoBorder: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 230, 119, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  statsSecondRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0, 230, 119, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.1)',
    padding: 16,
    alignItems: 'center',
  },
  statCardHighlight: {
    backgroundColor: 'rgba(0, 230, 119, 0.12)',
    borderColor: 'rgba(0, 230, 119, 0.25)',
    borderWidth: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 230, 119, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Sign Out Button
  signOutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },

  // App Version
  appVersion: {
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
    letterSpacing: 2,
    marginTop: 24,
    marginBottom: 16,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1a1f2e',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 119, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.2)',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.white,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.primary,
  },
  modalButtonSecondary: {
    backgroundColor: 'rgba(0, 230, 119, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 119, 0.3)',
  },
  modalButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0a0e14',
  },
  modalButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});

export default ProfileScreen;
