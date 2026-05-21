import Constants from 'expo-constants';

const ENV = {
  dev: {
    apiUrl: 'https://api.mastersports25.com/api',
  },
  staging: {
    apiUrl: 'https://api.mastersports25.com/api',
  },
  prod: {
    apiUrl: 'https://api.mastersports25.com/api',
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
export const BASE_URL = config.apiUrl.replace(/\/api$/, ''); 
