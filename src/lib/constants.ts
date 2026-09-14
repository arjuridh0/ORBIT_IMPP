export const DIVISI_COLORS = {
  bph:        '#2563eb',
  kaderisasi: '#7c3aed',
  sosma:      '#059669',
  bakmi:      '#d97706',
  dpw:        '#dc2626',
  inforsi:    '#0891b2',
  deplu:      '#db2777',
} as const

export const DIVISI_LABELS = {
  bph:        'BPH',
  kaderisasi: 'Kaderisasi',
  sosma:      'Sosma',
  bakmi:      'Bakmi',
  dpw:        'DPW',
  inforsi:    'Inforsi',
  deplu:      'Deplu',
} as const

export type Divisi = keyof typeof DIVISI_COLORS

export const COLOR_TO_DIVISI = Object.fromEntries(
  (Object.keys(DIVISI_COLORS) as Divisi[]).map((k) => [DIVISI_COLORS[k], k] as const)
) as Record<string, Divisi>

export const DEFAULT_COLOR = DIVISI_COLORS.bph

export const REMINDER_OPTIONS = [
  { label: 'Tanpa Pengingat', value: null },
  { label: '30 Menit Sebelum', value: 30 },
  { label: '1 Jam Sebelum', value: 60 },
  { label: '3 Jam Sebelum', value: 180 },
  { label: '1 Hari Sebelum', value: 1440 },
  { label: '3 Hari Sebelum', value: 4320 },
] as const
