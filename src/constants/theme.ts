// Design system tokens from docs/planning/04_UI_Design_System.md

export const colors = {
  // Brand palette
  teal: {
    50: '#F0FDFA',
    600: '#0D9488',
    700: '#0F766E',
  },

  // Neutral palette (Slate)
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    900: '#0F172A',
  },

  white: '#FFFFFF',

  // Semantic severity colors
  severity: {
    critical: '#DC2626',
    criticalBg: '#FEF2F2',
    major: '#EA580C',
    majorBg: '#FFF7ED',
    minor: '#CA8A04',
    minorBg: '#FEFCE8',
    info: '#2563EB',
    infoBg: '#EFF6FF',
  },

  // Status colors
  success: '#16A34A',
  successBg: '#F0FDF4',
  error: '#DC2626',
  errorBg: '#FEF2F2',
} as const;

export const typography = {
  fontFamily: {
    body: 'Inter',
    mono: 'monospace',
  },

  headingXl: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  headingLg: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  headingMd: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  captionMedium: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const layout = {
  screenPaddingH: 16,
  cardPadding: 16,
  sectionSpacing: 24,
  listItemPaddingV: 12,
  borderRadius: 8,
  pillRadius: 12,
} as const;

export const touchTargets = {
  minimum: 48,
  primaryButton: 56,
  listItem: 56,
  checklistRow: 64,
  shutter: 72,
  bottomActionBar: 72,
  tapSpacing: 8,
} as const;

// Pre-selected brand colors for firm branding
export const brandColorOptions = [
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Royal Blue', hex: '#2563EB' },
  { name: 'Forest', hex: '#166534' },
  { name: 'Teal', hex: '#0D9488' },
  { name: 'Burgundy', hex: '#881337' },
  { name: 'Crimson', hex: '#B91C1C' },
  { name: 'Charcoal', hex: '#374151' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Purple', hex: '#7C3AED' },
  { name: 'Bronze', hex: '#92400E' },
  { name: 'Steel Blue', hex: '#3B82F6' },
  { name: 'Emerald', hex: '#059669' },
] as const;

// Severity display mapping
export const severityConfig = {
  critical: {
    label: 'CRITICAL',
    color: colors.severity.critical,
    bg: colors.severity.criticalBg,
  },
  major: {
    label: 'MAJOR',
    color: colors.severity.major,
    bg: colors.severity.majorBg,
  },
  minor: {
    label: 'MINOR',
    color: colors.severity.minor,
    bg: colors.severity.minorBg,
  },
  informational: {
    label: 'INFO',
    color: colors.severity.info,
    bg: colors.severity.infoBg,
  },
} as const;

// Annotation defaults
export const annotationDefaults = {
  color: '#EF4444',
  strokeWidth: 3,
  colorOptions: ['#EF4444', '#EAB308', '#3B82F6', '#FFFFFF', '#000000'],
  maxTextLength: 50,
  maxUndoStack: 20,
} as const;
