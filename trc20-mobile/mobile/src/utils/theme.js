import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const COLORS = {
  // Primary blues
  primary: '#1D4ED8',
  primaryDark: '#1E3A8A',
  primaryDeep: '#1B3A8C',
  primaryLight: '#DBEAFE',
  
  // Backgrounds
  bg: '#EEF2FF',
  bgCard: '#FFFFFF',
  bgBlue: '#1E40AF',
  
  // Text
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  textWhite: '#FFFFFF',
  textBlue: '#1D4ED8',
  
  // Status colors
  success: '#10B981',
  successBg: '#D1FAE5',
  warning: '#F59E0B',
  warningBg: '#FEF3C7',
  danger: '#EF4444',
  dangerBg: '#FEE2E2',
  
  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // Gradients (used with LinearGradient)
  gradientBlue: ['#1E3A8A', '#1D4ED8', '#3B82F6'],
  gradientGreen: ['#059669', '#10B981'],
  gradientCard: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'],
};

export const FONTS = {
  // Font weights
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 100,
};

export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  blue: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};
