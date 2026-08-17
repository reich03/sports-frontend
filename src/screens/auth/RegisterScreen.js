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
import StatusModal from '../../components/StatusModal';
import AuthScreenLayout from '../../components/auth/AuthScreenLayout';
import { authStyles } from '../../components/auth/authStyles';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });

  const handleRegister = async () => {
    if (!email || !username || !password || !confirmPassword) {
      setErrorModal({
        visible: true,
        title: 'Campos Incompletos',
        message: 'Por favor completa todos los campos para continuar.',
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
    const result = await register(email, username, password);
    setLoading(false);

    if (result.success) {
      navigation.navigate('OTPVerification', { email, username });
    } else {
      setErrorModal({
        visible: true,
        title: 'Error en el Registro',
        message: result.message || 'No pudimos crear tu cuenta. Verifica los datos e intenta de nuevo.',
      });
    }
  };

  return (
    <>
      <AuthScreenLayout>
        <View style={authStyles.infoContainer}>
          <Text style={authStyles.infoTitle}>Crea tu cuenta</Text>
          <Text style={authStyles.infoSubtitle}>
            Completa el formulario para unirte a Master Sport y empezar a predecir.
          </Text>
        </View>

        <View style={authStyles.formContainer}>
          <View style={authStyles.inputGroup}>
            <Text style={authStyles.label}>Nombre de usuario</Text>
            <View style={authStyles.inputContainer}>
              <MaterialIcons name="person" size={20} color="#94a3b8" style={authStyles.inputIcon} />
              <TextInput
                style={authStyles.input}
                placeholder="usuario123"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

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
            <Text style={authStyles.label}>Contraseña</Text>
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
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#0a0e14" />
            ) : (
              <Text style={authStyles.primaryButtonText}>Crear Cuenta</Text>
            )}
          </TouchableOpacity>

          <View style={authStyles.footer}>
            <Text style={authStyles.footerText}>
              ¿Ya tienes cuenta?{' '}
              <Text style={authStyles.footerLink} onPress={() => navigation.navigate('Login')}>
                Inicia sesión
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

export default RegisterScreen;
