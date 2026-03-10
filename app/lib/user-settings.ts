export const ALLOWED_INTERVAL_UNITS = ['day', 'week', 'month'] as const;
export const ALLOWED_INVENTORY_LAYOUT_MODES = ['cards', 'list', 'compact'] as const;
export const ALLOWED_INVENTORY_SORT_MODES = ['manual', 'expiry_asc', 'expiry_desc'] as const;

export type IntervalUnit = (typeof ALLOWED_INTERVAL_UNITS)[number];
export type InventoryLayoutMode = (typeof ALLOWED_INVENTORY_LAYOUT_MODES)[number];
export type InventorySortMode = (typeof ALLOWED_INVENTORY_SORT_MODES)[number];

export const USER_SETTINGS_DEFAULTS = {
  warnLevelBald: 3,
  warnLevelExpired: 0,
  inventoryLayoutMode: 'cards' as InventoryLayoutMode,
  inventorySortMode: 'manual' as InventorySortMode,
  emailRemindersEnabled: false,
  emailReminderFrequencyDays: 1, // legacy
  emailReminderHour: 8, // legacy
  emailReminderTime: '08:00',
  emailReminderIntervalValue: 1,
  emailReminderIntervalUnit: 'day' as IntervalUnit,
  emailReminderTimeZone: 'Europe/Zurich',
};
