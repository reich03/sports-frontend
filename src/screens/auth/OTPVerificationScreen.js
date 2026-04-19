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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { COLORS } from '../../constants/theme';
import StatusModal from '../../components/StatusModal';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { verifyOTP } = useAuth();
  const { email, username } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
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

  const handleVerify = async () => {
    console.log('📝 OTPVerificationScreen - handleVerify llamado');
    
    if (otp.length !== 6) {
      console.warn('⚠️ Código inválido:', otp.length);
      setErrorModal({
        visible: true,
        title: 'Código Incompleto',
        message: 'El código debe tener exactamente 6 dígitos.',
      });
      return;
    }

    console.log('⏳ Verificando OTP...');
    setLoading(true);
    const result = await verifyOTP(email, otp);
    setLoading(false);
    
    console.log('📊 Resultado de OTP:', result);

    if (!result.success) {
      console.error('❌ Verificación fallida:', result.message);
      setErrorModal({
        visible: true,
        title: 'Código Inválido',
        message: result.message || 'El código ingresado no es válido o ha expirado.',
      });
    } else {
      console.log('✅ Email verificado exitosamente');
    }
  };

  const handleResend = async () => {
    console.log('📧 Reenviando OTP a:', email);
    setResending(true);
    try {
      await authService.resendOTP(email);
      console.log('✅ OTP reenviado');
      setSuccessModal({
        visible: true,
        title: 'Código Reenviado',
        message: 'Hemos enviado un nuevo código a tu correo electrónico.',
      });
    } catch (error) {
      console.error('❌ Error al reenviar:', error);
      setErrorModal({
        visible: true,
        title: 'Error al Reenviar',
        message: 'No pudimos reenviar el código. Por favor intenta de nuevo en unos momentos.',
      });
    }
    setResending(false);
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
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <MaterialIcons name="mail-outline" size={36} color={COLORS.backgroundDark} />
            </View>
            <Text style={styles.appName}>Verificación</Text>
            <Text style={styles.tagline}>Código de verificación enviado</Text>
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Revisa tu correo</Text>
            <Text style={styles.infoSubtitle}>
              Hemos enviado un código de 6 dígitos a
            </Text>
            <Text style={styles.email}>{email}</Text>
            <Text style={styles.expiryNote}>El código expira en 10 minutos</Text>
          </View>

          {/* OTP Form */}
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

            {/* Verify Button */}
            <TouchableOpacity
              style={[styles.verifyButton, otp.length !== 6 && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={loading || otp.length !== 6}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.backgroundDark} />
              ) : (
                <Text style={styles.verifyButtonText}>Verificar Código</Text>
              )}
            </TouchableOpacity>

            {/* Resend Section */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>¿No recibiste el código?</Text>
              <TouchableOpacity onPress={handleResend} disabled={resending}>
                <Text style={[styles.resendLink, resending && styles.resendLinkDisabled]}>
                  {resending ? 'Reenviando...' : 'Reenviar código'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Back to Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Email incorrecto?{' '}
              <Text
                style={styles.backLink}
                onPress={() => navigation.goBack()}
              >
                Volver al registro
              </Text>
            </Text>
          </View>
        </View>
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
        primaryButtonText="Aceptar"
        onPrimaryPress={() => setSuccessModal({ ...successModal, visible: false })}
        onClose={() => setSuccessModal({ ...successModal, visible: false })}
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
  content: {
    flex: 1,
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
    paddingRight: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 20,
    height: '100%',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: 'bold',
  },
  checkIcon: {
    marginLeft: 8,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: COLORS.backgroundDark,
    fontSize: 15,
    fontWeight: 'bold',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  resendText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  resendLink: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  resendLinkDisabled: {
    opacity: 0.5,
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

export default OTPVerificationScreen;
