// app/types/index.ts

export const WarnLevel = {
  OK: 'ok',
  BALD: 'bald',
  ABGELAUFEN: 'abgelaufen',
} as const;

export const warnPriority: Record<string, number> = {
  [WarnLevel.ABGELAUFEN]: 0,
  [WarnLevel.BALD]: 1,
  [WarnLevel.OK]: 2,
};

export const parseAblauf = (ddmmyyyy: string) =>
  new Date(ddmmyyyy.split('.').reverse().join('-')).getTime();

export const kategorien = [
  'Obst',
  'Gemüse',
  'Fleisch',
  'Milchprodukt',
  'Tiefkühl',
  'Konserve',
  'Getreide',
  'Flüssigkeit',
] as const;

export const einheiten = ['Stk', 'g', 'kg', 'ml', 'L', 'Packung'] as const;

export type WarnLevel = (typeof WarnLevel)[keyof typeof WarnLevel];
