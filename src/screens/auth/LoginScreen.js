import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import StatusModal from '../../components/StatusModal';
import AuthScreenLayout from '../../components/auth/AuthScreenLayout';
import { authStyles } from '../../components/auth/authStyles';

const LOGO_HORIZONTAL = require('../../../assets/logo_horizontal_blanco.png');

const LoginScreen = ({ navigation }) => {  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorModal({
        visible: true,
        title: 'Campos Incompletos',
        message: 'Por favor completa todos los campos para continuar.',
      });
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setErrorModal({
        visible: true,
        title: 'Ha Ocurrido un Problema',
        message: result.message || 'No pudimos iniciar sesión. Verifica tus credenciales e intenta de nuevo.',
      });
    }
  };

  return (
    <>
      <AuthScreenLayout
        scrollable={false}
        header={
          <View style={authStyles.brandHeader}>
            <Image
              source={LOGO_HORIZONTAL}
              style={authStyles.brandLogoHorizontal}
              resizeMode="contain"
            />
            <Text style={authStyles.brandTagline}>Domina tus predicciones deportivas</Text>
          </View>
        }
      >
        <View style={authStyles.infoContainer}>
          <Text style={authStyles.infoTitle}>Bienvenido de nuevo</Text>
          <Text style={authStyles.infoSubtitle}>Ingresa tus credenciales para continuar.</Text>
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

          <View style={authStyles.inputGroup}>
            <View style={authStyles.labelRow}>
              <Text style={authStyles.label}>Contraseña</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                <Text style={authStyles.linkText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            </View>
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

          <TouchableOpacity
            style={[authStyles.primaryButton, loading && authStyles.primaryButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#0a0e14" />
            ) : (
              <Text style={authStyles.primaryButtonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>
              ¿No tienes cuenta?{' '}
              <Text style={authStyles.footerLink} onPress={() => navigation.navigate('Register')}>
                Regístrate
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
        primaryButtonText="Reintentar"
        onPrimaryPress={() => setErrorModal({ ...errorModal, visible: false })}
        secondaryButtonText="Cancelar"
        onSecondaryPress={() => setErrorModal({ ...errorModal, visible: false })}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />
    </>
  );
};

export default LoginScreen;
