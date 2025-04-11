// app/types/index.ts

export const WarnLevel = {
  OK: 'ok',
  BALD: 'bald',
  ABGELAUFEN: 'abgelaufen',
} as const;

export const kategorien = [
  'Obst',
  'Gemüse',
  'Fleisch',
  'Milchprodukt',
  'Tiefkühl',
  'Konserve',
  'Getreide',
] as const;

export const einheiten = ['Stk', 'g', 'kg', 'ml', 'L', 'Packung'] as const;

export type WarnLevel = (typeof WarnLevel)[keyof typeof WarnLevel];
