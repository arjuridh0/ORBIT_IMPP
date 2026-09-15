// Opsi pengingat untuk form event
export const REMINDER_OPTIONS = [
  { label: 'Tanpa Pengingat',   value: null  },
  { label: '15 Menit Sebelum', value: 15    },
  { label: '30 Menit Sebelum', value: 30    },
  { label: '1 Jam Sebelum',    value: 60    },
  { label: '2 Jam Sebelum',    value: 120   },
  { label: '3 Jam Sebelum',    value: 180   },
  { label: '6 Jam Sebelum',    value: 360   },
  { label: '1 Hari Sebelum',   value: 1440  },
  { label: '2 Hari Sebelum',   value: 2880  },
  { label: '3 Hari Sebelum',   value: 4320  },
  { label: '1 Minggu Sebelum', value: 10080 },
] as const
