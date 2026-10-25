// Single source of DoseTracker design tokens. Tailwind (tailwind.config.js) and the runtime
// theme (src/features/theme/ThemeContext.tsx) both read this file; do not add a second one.
// Brand origin: design/Design System Board.png (ivory, navy, teal). Semantic light/dark roles
// below refine those values for WCAG AA contrast; see docs/DESIGN_SYSTEM.md.
const palette = {
  ivory: '#FBF8F3',
  white: '#FFFFFF',
  navy: '#0B2540',
  ink: '#0E1A2B',
  textDark: '#0E1A2B',
  textSecondary: '#5A6475',
  borderGray: '#E3DFD8',
  teal: '#0A9EA3',
  tealBright: '#2CC4C9',
  success: '#1E9E5A',
  warning: '#D97706',
  error: '#D92D20',
  info: '#2563EB',
  darkSurface: '#151E2C',
  darkBackground: '#0A111D',
};

// Semantic color roles. Text roles ("*Text", labels) meet 4.5:1 on background, surface and
// their matching "*Soft" fill; non-text fills (accent, success) meet 3:1 on surface.
const lightColors = {
  background: palette.ivory,
  surface: palette.white,
  surfaceSecondary: '#F3F0EB',
  surfaceElevated: palette.white,
  fill: '#EFECE6',
  label: palette.ink,
  secondaryLabel: palette.textSecondary,
  tertiaryLabel: '#868F9D',
  separator: palette.borderGray,
  primary: palette.navy,
  onPrimary: palette.white,
  accent: palette.teal,
  accentText: '#08747A',
  accentSoft: '#E2F4F3',
  success: palette.success,
  successText: '#157A45',
  successSoft: '#E5F4EA',
  warning: palette.warning,
  warningText: '#94480A',
  warningSoft: '#FDF1DC',
  danger: palette.error,
  dangerText: '#B91C1C',
  dangerSoft: '#FCEBEB',
  info: palette.info,
  infoText: '#1D4ED8',
  infoSoft: '#E8EFFD',
  inverseSurface: palette.ink,
  inverseLabel: palette.white,
  inverseAccent: '#5EE5DC',
  overlay: 'rgba(10, 17, 29, 0.4)',
  tabBar: palette.white,
};

const darkColors = {
  background: palette.darkBackground,
  surface: palette.darkSurface,
  surfaceSecondary: '#1C2636',
  surfaceElevated: '#1A2433',
  fill: '#233044',
  label: '#F2F4F7',
  secondaryLabel: '#A2ACBB',
  tertiaryLabel: '#717B8C',
  separator: '#263246',
  // Bright teal carries dark ink: white on teal fails contrast (2.4:1).
  primary: palette.tealBright,
  onPrimary: '#04252A',
  accent: palette.tealBright,
  accentText: '#4FD2D6',
  accentSoft: '#0E3135',
  success: '#34C77B',
  successText: '#4ADE80',
  successSoft: '#0F2E1C',
  warning: '#F59E0B',
  warningText: '#FBBF5A',
  warningSoft: '#33250B',
  danger: palette.error,
  dangerText: '#FC8E8E',
  dangerSoft: '#3A1618',
  info: '#60A5FA',
  infoText: '#8CBCFB',
  infoSoft: '#13243F',
  inverseSurface: '#E9EEF3',
  inverseLabel: palette.ink,
  inverseAccent: '#006B6B',
  overlay: 'rgba(0, 0, 0, 0.55)',
  tabBar: '#111A28',
};

// Apple text-style ramp (points). The system font applies its own optical tracking, so no
// letterSpacing is set. Sizes scale with Dynamic Type through allowFontScaling.
const typography = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700' },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
};

const radii = {
  chip: 10,
  control: 14,
  card: 20,
  sheet: 28,
  pill: 999,
};

// 4-point grid. Tailwind's default spacing scale already matches (p-1 = 4 … p-8 = 32).
const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screen: 16,
};

// Durations in ms; easing curves live in src/features/ui/motion.ts (Reanimated objects).
const motion = {
  press: 120,
  fast: 150,
  base: 220,
  slow: 400,
};

const theme = {
  palette,
  light: lightColors,
  dark: darkColors,
  // Static (light) aliases kept for Tailwind classes and onboarding styles.
  colors: {
    background: lightColors.background,
    surface: lightColors.surface,
    textPrimary: lightColors.label,
    textSecondary: lightColors.secondaryLabel,
    primaryAccent: lightColors.primary,
    onPrimary: lightColors.onPrimary,
    secondaryAccent: lightColors.accent,
    border: lightColors.separator,
    success: lightColors.success,
    warning: lightColors.warning,
    error: lightColors.danger,
    info: lightColors.info,
  },
  typography,
  radii,
  spacing,
  motion,
};

export { palette, lightColors, darkColors, typography, radii, spacing, motion, theme };
export default theme;
