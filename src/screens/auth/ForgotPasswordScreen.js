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

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });

  const handleSubmit = async () => {
    if (!email) {
      setErrorModal({
        visible: true,
        title: 'Campo Requerido',
        message: 'Por favor ingresa tu correo electrónico para continuar.',
      });
      return;
    }

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      navigation.navigate('ResetPassword', { email });
    } catch (error) {
      setErrorModal({
        visible: true,
        title: 'Error al Enviar',
        message: 'Hubo un problema al procesar tu solicitud. Por favor intenta de nuevo.',
      });
    }
    setLoading(false);
  };

  return (
    <>
      <AuthScreenLayout>
        <View style={authStyles.infoContainer}>
          <Text style={authStyles.infoTitle}>¿Olvidaste tu contraseña?</Text>
          <Text style={authStyles.infoSubtitle}>
            Ingresa tu correo y te enviaremos un código para restablecer tu contraseña.
          </Text>
        </View>

        <View style={authStyles.formContainer}>
          <View style={authStyles.inputGroup}>
            <Text style={authStyles.label}>Correo electrónico</Text>
            <View style={authStyles.inputContainer}>
              <MaterialIcons name="mail" size={20} color="#94a3b8" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[authStyles.primaryButton, loading && authStyles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#0a0e14" />
            ) : (
              <Text style={authStyles.primaryButtonText}>Enviar Instrucciones</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={authStyles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={20} color="#3fff8c" />
            <Text style={authStyles.backButtonText}>Volver al inicio de sesión</Text>
          </TouchableOpacity>
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
    </>
  );
};

export default ForgotPasswordScreen;
