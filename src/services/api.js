import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CONFIG from '../constants/config';

const api = axios.create({
  baseURL: CONFIG.apiUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('🔧 API configurada con baseURL:', CONFIG.apiUrl);

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    console.log('📡 Request:', config.method.toUpperCase(), config.url);
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Token agregado al request');
    }
    console.log('📤 Request data:', config.data);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.status, response.config.url);
    console.log('📥 Response data:', response.data);
    
    return response;
  },
  async (error) => {
    if (error.response) {
      console.error('❌ Response error:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ No response received:', error.message);
      console.error('🔍 Request:', error.request);
    } else {
      console.error('❌ Error:', error.message);
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      // Here you would navigate to login
    }
    return Promise.reject(error);
  }
);

export default api;
