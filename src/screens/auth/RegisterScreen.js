import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants/theme';
import GoogleLogo from '../../components/GoogleLogo';
import StatusModal from '../../components/StatusModal';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estado para modales
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const handleRegister = async () => {
    console.log('📝 RegisterScreen - handleRegister llamado');
    
    if (!email || !username || !password || !confirmPassword) {
      console.warn('⚠️ Campos vacíos');
      setErrorModal({
        visible: true,
        title: 'Campos Incompletos',
        message: 'Por favor completa todos los campos para continuar.',
      });
      return;
    }

    if (password !== confirmPassword) {
      console.warn('⚠️ Contraseñas no coinciden');
      setErrorModal({
        visible: true,
        title: 'Error de Validación',
        message: 'Las contraseñas no coinciden. Por favor verifica e intenta de nuevo.',
      });
      return;
    }

    if (password.length < 8) {
      console.warn('⚠️ Contraseña muy corta');
      setErrorModal({
        visible: true,
        title: 'Contraseña Débil',
        message: 'La contraseña debe tener al menos 8 caracteres para mayor seguridad.',
      });
      return;
    }

    console.log('⏳ Iniciando registro...');
    setLoading(true);
    const result = await register(email, username, password);
    setLoading(false);
    
    console.log('📊 Resultado del registro:', result);

    if (result.success) {
      console.log('✅ Registro exitoso, navegando a OTP');
      navigation.navigate('OTPVerification', { email, username });
    } else {
      console.error('❌ Registro fallido:', result.message);
      setErrorModal({
        visible: true,
        title: 'Error en el Registro',
        message: result.message || 'No pudimos crear tu cuenta. Por favor verifica los datos e intenta de nuevo.',
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={styles.blurCircleTop} />
        <View style={styles.blurCircleBottom} />
        {/* Diagonal Grid Pattern */}
        <View style={styles.gridPattern}>
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
          <View style={styles.gridLine} />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <MaterialIcons name="query-stats" size={36} color={COLORS.backgroundDark} />
            </View>
            <Text style={styles.appName}>Master Sport</Text>
            <Text style={styles.tagline}>Domina tus predicciones deportivas</Text>
          </View>

          {/* Welcome Text */}
          <View style={styles.welcomeContainer}>
            <Text style={styles.welcomeTitle}>Crea tu cuenta</Text>
            <Text style={styles.welcomeSubtitle}>Completa el formulario para comenzar</Text>
          </View>

          {/* Register Form */}
          <View style={styles.formContainer}>
            {/* Username Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de usuario</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="person" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="usuario123"
                  placeholderTextColor="#64748b"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo electrónico</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="mail" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#64748b"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <MaterialIcons 
                    name={showPassword ? 'visibility' : 'visibility-off'} 
                    size={20} 
                    color="#94a3b8" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#64748b"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <MaterialIcons 
                    name={showConfirmPassword ? 'visibility' : 'visibility-off'} 
                    size={20} 
                    color="#94a3b8" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Register Button */}
            <TouchableOpacity
              style={styles.registerButton}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.backgroundDark} />
              ) : (
                <Text style={styles.registerButtonText}>Crear Cuenta</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>O CONTINÚA CON</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Button */}
            <TouchableOpacity style={styles.socialButton}>
              <GoogleLogo width={20} height={20} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Ya tienes cuenta?{' '}
              <Text
                style={styles.loginLink}
                onPress={() => navigation.navigate('Login')}
              >
                Inicia sesión
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Modal */}
      <StatusModal
        visible={errorModal.visible}
        type="error"
        title={errorModal.title}
        message={errorModal.message}
        primaryButtonText="Reintentar"
        onPrimaryPress={() => setErrorModal({ ...errorModal, visible: false })}
        secondaryButtonText="Cancelar"
        onSecondaryPress={() => setErrorModal({ ...errorModal, visible: false })}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  blurCircleTop: {
    position: 'absolute',
    top: '-10%',
    left: '-10%',
    width: '40%',
    height: '40%',
    borderRadius: 9999,
    backgroundColor: COLORS.primary,
    opacity: 0.3,
  },
  blurCircleBottom: {
    position: 'absolute',
    bottom: '-10%',
    right: '-10%',
    width: '50%',
    height: '50%',
    borderRadius: 9999,
    backgroundColor: COLORS.primary,
    opacity: 0.2,
  },
  gridPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    transform: [{ rotate: '12deg' }, { scale: 1.5 }],
  },
  gridLine: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.primary,
    opacity: 0.2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  appName: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#f1f5f9',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  welcomeContainer: {
    marginBottom: 32,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#cbd5e1',
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 1)',
    paddingLeft: 16,
    paddingRight: 12,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 15,
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 4,
  },
  registerButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  registerButtonText: {
    color: COLORS.backgroundDark,
    fontSize: 15,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(51, 65, 85, 1)',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    letterSpacing: 1.2,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 1)',
    height: 56,
    gap: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  loginLink: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default RegisterScreen;
