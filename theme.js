// Source: design/Design System Board.png.
// Values follow the board's printed labels, rather than raster pixel colors.
// Dimensions are logical dp (font sizes use scalable logical units), not bitmap px.
const palette = {
  ivory: '#FBF8F3',
  white: '#FFFFFF',
  navy: '#0B2540',
  textDark: '#0F172A',
  textSecondary: '#64748B',
  borderGray: '#E5E7EB',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  teal: '#14B8A6',
  purple: '#8B5CF6',
  darkSurface: '#1F2937',
  darkBackground: '#0B1220',
};

const theme = {
  palette,
  colors: {
    background: palette.ivory,
    surface: palette.white,
    textPrimary: palette.textDark,
    textSecondary: palette.textSecondary,
    primaryAccent: palette.navy, // Primary actions, including Take Medication.
    onPrimary: palette.white,
    secondaryAccent: palette.teal,
    border: palette.borderGray,
    success: palette.success,
    warning: palette.warning,
    error: palette.error,
    info: palette.info,
  },
  typography: {
    // Font family and line heights are not specified on the board; left unset.
    screenTitle: { fontSize: 32, fontWeight: '600' },
    sectionHeading: { fontSize: 20, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    secondary: { fontSize: 14, fontWeight: '400' },
    button: { fontSize: 16, fontWeight: '500' },
    caption: { fontSize: 12, fontWeight: '400' },
    data: { fontSize: 24, fontWeight: '600' },
  },
  radii: {
    small: 8,
    medium: 12,
    large: 16,
    card: 20,
    pill: 999,
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },
  components: {
    // Inferred assignments from the examples, not explicit measurements.
    card: { borderRadius: 20 },
    button: { borderRadius: 12 },
    compactAction: { borderRadius: 999 },
  },
};

export { palette, theme };
export default theme;
