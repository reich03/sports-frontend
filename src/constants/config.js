import Constants from 'expo-constants';

const ENV = {
  dev: {
    apiUrl: 'http://192.168.1.10:3000/api',
  },
  staging: {
    apiUrl: 'https://staging-api.progana.app/api',
  },
  prod: {
    apiUrl: 'https://api.progana.app/api',
  },
};

const getEnvVars = (env = Constants.manifest?.releaseChannel) => {
  if (__DEV__) return ENV.dev;
  if (env === 'staging') return ENV.staging;
  return ENV.prod;
};

const config = getEnvVars();

export default config;
export const API_BASE_URL = config.apiUrl;
export const BASE_URL = config.apiUrl.replace('/api', ''); 
