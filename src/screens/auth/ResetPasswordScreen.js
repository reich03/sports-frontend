import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../services';
import StatusModal from '../../components/StatusModal';
import AuthScreenLayout from '../../components/auth/AuthScreenLayout';
import { authStyles } from '../../components/auth/authStyles';

const ResetPasswordScreen = ({ route, navigation }) => {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });

  const handleResetPassword = async () => {
    if (!otp || !password || !confirmPassword) {
      setErrorModal({
        visible: true,
        title: 'Campos Incompletos',
        message: 'Por favor completa todos los campos para continuar.',
      });
      return;
    }

    if (otp.length !== 6) {
      setErrorModal({
        visible: true,
        title: 'Código Incompleto',
        message: 'El código debe tener exactamente 6 dígitos.',
      });
      return;
    }

    if (password !== confirmPassword) {
      setErrorModal({
        visible: true,
        title: 'Error de Validación',
        message: 'Las contraseñas no coinciden. Por favor verifica e intenta de nuevo.',
      });
      return;
    }

    if (password.length < 8) {
      setErrorModal({
        visible: true,
        title: 'Contraseña Débil',
        message: 'La contraseña debe tener al menos 8 caracteres para mayor seguridad.',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(email, otp, password);
      setSuccessModal({
        visible: true,
        title: 'Contraseña Actualizada',
        message: 'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
      });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        'No pudimos restablecer tu contraseña. Verifica el código e intenta de nuevo.';
      setErrorModal({
        visible: true,
        title: 'Error al Restablecer',
        message: errorMessage,
      });
    }
    setLoading(false);
  };

  return (
    <>
      <AuthScreenLayout>
        <View style={authStyles.infoContainer}>
          <Text style={authStyles.infoTitle}>Restablecer contraseña</Text>
          <Text style={authStyles.infoSubtitle}>
            Hemos enviado un código de 6 dígitos a:
          </Text>
          <Text style={authStyles.emailHighlight}>{email}</Text>
          <Text style={authStyles.expiryNote}>El código expira en 15 minutos</Text>
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
              {otp.length === 6 ? (
                <MaterialIcons name="check-circle" size={20} color="#3fff8c" style={authStyles.checkIcon} />
              ) : (
                <View style={authStyles.checkIconPlaceholder} />
              )}
            </View>
          </View>

          <View style={authStyles.inputGroup}>
            <Text style={authStyles.label}>Nueva contraseña</Text>
            <View style={authStyles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#94a3b8" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={authStyles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={authStyles.inputGroup}>
            <Text style={authStyles.label}>Confirmar contraseña</Text>
            <View style={authStyles.inputContainer}>
              <MaterialIcons name="lock" size={20} color="#94a3b8" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={authStyles.eyeIcon}
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

          <TouchableOpacity
            style={[authStyles.primaryButton, loading && authStyles.primaryButtonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#0a0e14" />
            ) : (
              <Text style={authStyles.primaryButtonText}>Restablecer Contraseña</Text>
            )}
          </TouchableOpacity>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>
              ¿No recibiste el código?{' '}
              <Text style={authStyles.footerLink} onPress={() => navigation.goBack()}>
                Volver
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
    </>
  );
};

export default ResetPasswordScreen;
