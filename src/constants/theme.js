export const COLORS = {
  primary: '#00e677',
  primaryDark: '#00b35d',
  primaryLight: '#33ff99',
  
  backgroundDark: '#0f2319',
  backgroundLight: '#f5f8f7',
  background: '#0a0e14', // Surface background
  
  cardDark: '#1a2f26',
  cardLight: '#ffffff',
  cardBackground: '#1a2f26', // Alias for cardDark
  
  // Surface colors (Material Design 3)
  surface: '#0a0e14',
  surfaceDim: '#0a0e14',
  surfaceBright: '#262c36',
  surfaceContainerLowest: '#000000',
  surfaceContainerLow: '#0f141a',
  surfaceContainer: '#151a21',
  surfaceContainerHigh: '#1b2028',
  surfaceContainerHighest: '#20262f',
  surfaceVariant: '#20262f',
  
  textPrimary: '#ffffff',
  textSecondary: '#a0a0a0',
  textLight: '#333333',
  textGray: '#a0a0a0', // Alias for textSecondary
  
  // On-surface colors
  onSurface: '#f1f3fc',
  onSurfaceVariant: '#a8abb3',
  onBackground: '#f1f3fc',
  
  white: '#ffffff',
  black: '#000000',
  
  secondary: '#4480ff',
  success: '#00e677',
  error: '#ff716c',
  errorLight: '#d7383b',
  errorDim: '#d7383b',
  errorContainer: '#9f0519',
  onErrorContainer: '#ffa8a3',
  warning: '#ffaa00',
  info: '#4480ff',
  
  border: '#2a3f36',
  borderLight: '#e0e0e0',
  outline: '#72757d',
  outlineVariant: '#44484f',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  light: 'System',
  
  // Font styles
  largeTitle: { fontSize: 34, fontWeight: 'bold' },
  h1: { fontSize: 32, fontWeight: 'bold' },
  h2: { fontSize: 24, fontWeight: 'bold' },
  h3: { fontSize: 20, fontWeight: '600' },
  h4: { fontSize: 18, fontWeight: '600' },
  body1: { fontSize: 16 },
  body2: { fontSize: 14 },
  body3: { fontSize: 12 },
  body4: { fontSize: 11 },
  caption: { fontSize: 10 },
};

export const SIZES = {
  // Font sizes
  h1: 32,
  h2: 24,
  h3: 20,
  h4: 18,
  body1: 16,
  body2: 14,
  body3: 12,
  caption: 10,
  
  // Spacing
  padding: 16,
  margin: 16,
  radius: 12,
  
  // Component sizes
  buttonHeight: 48,
  inputHeight: 48,
  iconSize: 24,
  avatarSize: 40,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
