import { Platform } from 'react-native';

// Unified theme system - single source of truth
export const themeColors = {
  light: {
    background: '#F7F7F7',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8F9FA',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    borderLight: '#F3F4F6',
    primary: '#00A896',
    primaryLight: '#F0FDF4',
    error: '#EF4444',
    errorLight: '#FEF2F2',
    success: '#10B981',
    warning: '#F59E0B',
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    background: '#111827',
    surface: '#1F2937',
    surfaceSecondary: '#374151',
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    border: '#374151',
    borderLight: '#4B5563',
    primary: '#00A896',
    primaryLight: '#065F46',
    error: '#F87171',
    errorLight: '#7F1D1D',
    success: '#34D399',
    warning: '#FBBF24',
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

// Platform-aware spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Platform-aware typography scale
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: Platform.select({ native: 16, web: 16 }),
    lg: Platform.select({ native: 18, web: 18 }),
    xl: Platform.select({ native: 20, web: 20 }),
    xxl: Platform.select({ native: 24, web: 24 }),
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Platform-aware border radius
export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Platform-aware shadows/elevation
export const createShadow = (elevation: number = 1) => {
  if (Platform.OS === 'web') {
    const webShadows = {
      1: { boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)' },
      2: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
      3: { boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' },
      4: { boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
    };
    return webShadows[elevation as keyof typeof webShadows] || webShadows[1];
  }

  if (Platform.OS === 'android') {
    const androidElevations = {
      1: { elevation: 1 },
      2: { elevation: 2 },
      3: { elevation: 4 },
      4: { elevation: 8 },
    };
    return androidElevations[elevation as keyof typeof androidElevations] || androidElevations[1];
  }

  // iOS
  const iosShadows = {
    1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    3: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    4: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
  };

  return iosShadows[elevation as keyof typeof iosShadows] || iosShadows[1];
};

// Common component styles
export const componentStyles = {
  card: {
    backgroundColor: themeColors.light.surface,
    borderRadius: borderRadius.xl,
    ...createShadow(2),
  },
  button: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...createShadow(1),
  },
  input: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
  },
};

export type ThemeColors = typeof themeColors.light;
export type ThemeMode = keyof typeof themeColors;
