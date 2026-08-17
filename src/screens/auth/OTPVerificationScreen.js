import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import StatusModal from '../../components/StatusModal';
import AuthScreenLayout from '../../components/auth/AuthScreenLayout';
import { authStyles } from '../../components/auth/authStyles';

const OTPVerificationScreen = ({ route, navigation }) => {
  const { verifyOTP } = useAuth();
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setErrorModal({
        visible: true,
        title: 'Código Incompleto',
        message: 'El código debe tener exactamente 6 dígitos.',
      });
      return;
    }

    setLoading(true);
    const result = await verifyOTP(email, otp);
    setLoading(false);

    if (!result.success) {
      setErrorModal({
        visible: true,
        title: 'Código Inválido',
        message: result.message || 'El código ingresado no es válido o ha expirado.',
      });
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await authService.resendOTP(email);
      setSuccessModal({
        visible: true,
        title: 'Código Reenviado',
        message: 'Hemos enviado un nuevo código a tu correo electrónico.',
      });
    } catch (error) {
      setErrorModal({
        visible: true,
        title: 'Error al Reenviar',
        message: 'No pudimos reenviar el código. Intenta de nuevo en unos momentos.',
      });
    }
    setResending(false);
  };

  return (
    <>
      <AuthScreenLayout>
        <View style={authStyles.infoContainer}>
          <Text style={authStyles.infoTitle}>Verifica tu correo</Text>
          <Text style={authStyles.infoSubtitle}>
            Hemos enviado un código de 6 dígitos a:
          </Text>
          <Text style={authStyles.emailHighlight}>{email}</Text>
          <Text style={authStyles.expiryNote}>El código expira en 10 minutos</Text>
        </View>

        <View style={authStyles.formContainer}>
          <View style={authStyles.inputGroup}>
            <Text style={authStyles.label}>Código de verificación</Text>
            <View style={authStyles.inputContainer}>
              <MaterialIcons name="pin" size={20} color="#94a3b8" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.otpInput}
                placeholder="123456"
                placeholderTextColor="#64748b"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              {otp.length === 6 && (
                <MaterialIcons name="check-circle" size={20} color="#3fff8c" style={authStyles.checkIcon} />
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[
              authStyles.primaryButton,
              (loading || otp.length !== 6) && authStyles.primaryButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={loading || otp.length !== 6}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#0a0e14" />
            ) : (
              <Text style={authStyles.primaryButtonText}>Verificar Código</Text>
            )}
          </TouchableOpacity>

          <View style={authStyles.resendContainer}>
            <Text style={authStyles.resendText}>¿No recibiste el código?</Text>
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              <Text style={[authStyles.resendLink, resending && authStyles.resendLinkDisabled]}>
                {resending ? 'Reenviando...' : 'Reenviar código'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>
              ¿Email incorrecto?{' '}
              <Text style={authStyles.footerLink} onPress={() => navigation.goBack()}>
                Volver al registro
              </Text>
            </Text>
          </View>
        </View>
      </AuthScreenLayout>

      <StatusModal
        visible={errorModal.visible}
        type="error"
        title={errorModal.title}
        message={errorModal.message}
        primaryButtonText="Entendido"
        onPrimaryPress={() => setErrorModal({ ...errorModal, visible: false })}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />

      <StatusModal
        visible={successModal.visible}
        type="success"
        title={successModal.title}
        message={successModal.message}
        primaryButtonText="Aceptar"
        onPrimaryPress={() => setSuccessModal({ ...successModal, visible: false })}
        onClose={() => setSuccessModal({ ...successModal, visible: false })}
      />
    </>
  );
};

export default OTPVerificationScreen;
