import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../services';
import { COLORS } from '../../constants/theme';
import StatusModal from '../../components/StatusModal';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estados para modales
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: '',
    message: '',
  });
  const [successModal, setSuccessModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  const handleResetPassword = async () => {
    console.log('🔐 ResetPasswordScreen - handleResetPassword llamado');
    
    if (!otp || !password || !confirmPassword) {
      console.warn('⚠️ Campos vacíos');
      setErrorModal({
        visible: true,
        title: 'Campos Incompletos',
        message: 'Por favor completa todos los campos para continuar.',
      });
      return;
    }

    if (otp.length !== 6) {
      console.warn('⚠️ Código inválido');
      setErrorModal({
        visible: true,
        title: 'Código Incompleto',
        message: 'El código debe tener exactamente 6 dígitos.',
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

    console.log('⏳ Restableciendo contraseña...');
    setLoading(true);
    try {
      await authService.resetPassword(email, otp, password);
      console.log('✅ Contraseña restablecida exitosamente');
      setSuccessModal({
        visible: true,
        title: 'Contraseña Actualizada',
        message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.',
      });
    } catch (error) {
      console.error('❌ Error al restablecer contraseña:', error);
      const errorMessage = error.response?.data?.error?.message || 'No pudimos restablecer tu contraseña. Verifica el código e intenta de nuevo.';
      setErrorModal({
        visible: true,
        title: 'Error al Restablecer',
        message: errorMessage,
      });
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <View style={styles.blurCircleTop} />
        <View style={styles.blurCircleBottom} />
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <MaterialIcons name="lock-reset" size={36} color={COLORS.backgroundDark} />
            </View>
            <Text style={styles.appName}>Restablecer Contraseña</Text>
            <Text style={styles.tagline}>Crea una nueva contraseña segura</Text>
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Revisa tu correo</Text>
            <Text style={styles.infoSubtitle}>
              Hemos enviado un código de 6 dígitos a
            </Text>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.expiryNote}>El código expira en 15 minutos</Text>
          </View>

          {/* Form */}
          <View style={styles.formContainer}>
            {/* OTP Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Código de verificación</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="pin" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="123456"
                  placeholderTextColor="#64748b"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
                {otp.length === 6 && (
                  <MaterialIcons name="check-circle" size={20} color={COLORS.primary} style={styles.checkIcon} />
                )}
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nueva contraseña</Text>
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

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.backgroundDark} />
              ) : (
                <Text style={styles.submitButtonText}>Restablecer Contraseña</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Back Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿No recibiste el código?{' '}
              <Text
                style={styles.backLink}
                onPress={() => navigation.goBack()}
              >
                Volver
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
        primaryButtonText="Entendido"
        onPrimaryPress={() => setErrorModal({ ...errorModal, visible: false })}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />

      {/* Success Modal */}
      <StatusModal
        visible={successModal.visible}
        type="success"
        title={successModal.title}
        message={successModal.message}
        primaryButtonText="Ir al Login"
        onPrimaryPress={() => {
          setSuccessModal({ ...successModal, visible: false });
          navigation.navigate('Login');
        }}
        onClose={() => {
          setSuccessModal({ ...successModal, visible: false });
          navigation.navigate('Login');
        }}
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f1f5f9',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f1f5f9',
    marginBottom: 12,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 8,
  },
  email: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  expiryNote: {
    fontSize: 11,
    color: '#64748b',
    fontStyle: 'italic',
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
  checkIcon: {
    marginLeft: 8,
  },
  submitButton: {
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
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: COLORS.backgroundDark,
    fontSize: 15,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  backLink: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default ResetPasswordScreen;
