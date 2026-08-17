import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';

const STORAGE_KEY = 'mastersport_theme_dark';

const darkPalette = {
  background: '#0a0e14',
  card: '#1a2f26',
  cardBg: 'rgba(0, 230, 119, 0.05)',
  cardBorder: 'rgba(0, 230, 119, 0.1)',
  cardHighlight: 'rgba(0, 230, 119, 0.12)',
  text: '#ffffff',
  textMuted: '#a0a0a0',
  border: '#2a3f36',
  rowBorder: 'rgba(0, 230, 119, 0.05)',
  iconBg: 'rgba(0, 230, 119, 0.15)',
  switchTrackOff: '#374151',
  statusBar: 'light-content',
  primary: '#00e677',
  primaryDark: '#00b35d',
  primaryLight: '#33ff99',
  accent: '#00e677',
  onAccent: '#0a0e14',
  gradientHero: ['rgba(0,230,119,0.1)', 'transparent'],
};

const lightPalette = {
  background: '#f2f6f4',
  card: '#ffffff',
  cardBg: '#ffffff',
  cardBorder: '#d4e8dc',
  cardHighlight: '#e8f8ef',
  text: '#1a2f26',
  textMuted: '#5a6b63',
  border: '#c5d9ce',
  rowBorder: '#e8f0ec',
  iconBg: 'rgba(0, 93, 44, 0.1)',
  switchTrackOff: '#c5d9ce',
  statusBar: 'dark-content',
  primary: '#005d2c',
  primaryDark: '#004822',
  primaryLight: '#007a40',
  accent: '#00b35d',
  onAccent: '#ffffff',
  gradientHero: ['rgba(0,122,64,0.12)', 'transparent'],
};

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value !== null) {
          setIsDark(value === 'true');
        }
      })
      .finally(() => setReady(true));
  }, []);

  const setDarkMode = useCallback(async (value) => {
    setIsDark(value);
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
  }, []);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDark);
  }, [isDark, setDarkMode]);

  const palette = isDark ? darkPalette : lightPalette;

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: palette.accent,
        background: palette.background,
        card: palette.card,
        text: palette.text,
        border: palette.border,
        notification: palette.accent,
      },
    };
  }, [isDark, palette]);

  const value = useMemo(
    () => ({
      isDark,
      ready,
      palette,
      navigationTheme,
      setDarkMode,
      toggleDarkMode,
    }),
    [isDark, ready, palette, navigationTheme, setDarkMode, toggleDarkMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de ThemeProvider');
  }
  return ctx;
};
