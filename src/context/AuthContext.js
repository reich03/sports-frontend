import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Mostrar splash screen por al menos 3.5 segundos para apreciar la animación
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 3500));
      
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
        
        // Optionally refresh user data from server
        try {
          const response = await authService.getCurrentUser();
          setUser(response.data.user);
          await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        } catch (error) {
          console.log('Error refreshing user data:', error);
        }
      }
      
      // Asegurar que el splash se muestre el tiempo mínimo
      await minLoadTime;
    } catch (error) {
      console.log('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      setUser(response.data.user);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
      return response.data.user;
    } catch (error) {
      console.log('Error refreshing user:', error);
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      console.log('🔐 Intentando login con email:', email);
      const response = await authService.login(email, password);
      console.log('✅ Login response:', response.data);
      
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      console.log('💾 Token y usuario guardados en AsyncStorage');
      
      setUser(user);
      setIsAuthenticated(true);
      console.log('✅ Login exitoso, usuario autenticado');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error en login:', error);
      console.error('❌ Error response:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.error?.message || error.message || 'Error al iniciar sesión'
      };
    }
  };

  const register = async (email, username, password) => {
    try {
      const response = await authService.register(email, username, password);
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Error al registrar'
      };
    }
  };

  const verifyOTP = async (email, otp) => {
    try {
      const response = await authService.verifyOTP(email, otp);
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      setUser(user);
      setIsAuthenticated(true);
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.error?.message || 'Código OTP inválido'
      };
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.log('Error calling logout API:', error);
    } finally {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const updateUser = async (userData) => {
    setUser({ ...user, ...userData });
    await AsyncStorage.setItem('userData', JSON.stringify({ ...user, ...userData }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        login,
        register,
        verifyOTP,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
