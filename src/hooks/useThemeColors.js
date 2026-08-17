import { useMemo } from 'react';
import { COLORS } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';

export function useThemeColors() {
  const { palette, isDark } = useTheme();

  return useMemo(
    () => ({
      ...COLORS,
      primary: palette.primary,
      primaryDark: palette.primaryDark,
      primaryLight: palette.primaryLight,
      accent: palette.accent,
      onAccent: palette.onAccent,
      background: palette.background,
      backgroundDark: palette.background,
      surface: palette.background,
      cardBackground: palette.card,
      cardDark: palette.card,
      cardBorder: palette.cardBorder,
      cardHighlight: palette.cardHighlight,
      white: palette.text,
      text: palette.text,
      textPrimary: palette.text,
      textSecondary: palette.textMuted,
      border: palette.border,
      success: palette.primary,
      textSubtle: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,47,38,0.65)',
      textFaint: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(26,47,38,0.5)',
      textHint: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(26,47,38,0.4)',
      surfaceMuted: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      surfaceBorder: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
      gradientHero: palette.gradientHero,
      statusBar: palette.statusBar,
      isDark,
    }),
    [palette, isDark]
  );
}
