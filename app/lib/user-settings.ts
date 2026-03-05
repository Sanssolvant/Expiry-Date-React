export const ALLOWED_INTERVAL_UNITS = ['day', 'week', 'month'] as const;

export type IntervalUnit = (typeof ALLOWED_INTERVAL_UNITS)[number];

export const USER_SETTINGS_DEFAULTS = {
  warnLevelBald: 3,
  warnLevelExpired: 0,
  emailRemindersEnabled: false,
  emailReminderFrequencyDays: 1, // legacy
  emailReminderHour: 8, // legacy
  emailReminderTime: '08:00',
  emailReminderIntervalValue: 1,
  emailReminderIntervalUnit: 'day' as IntervalUnit,
  emailReminderTimeZone: 'Europe/Zurich',
};
