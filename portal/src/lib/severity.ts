export const severityConfig = {
  critical: { label: 'Critical', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  major: { label: 'Major', color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  minor: { label: 'Minor', color: '#EAB308', bg: '#FEFCE8', border: '#FDE68A' },
  informational: { label: 'Info', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
} as const;

export type Severity = keyof typeof severityConfig;
