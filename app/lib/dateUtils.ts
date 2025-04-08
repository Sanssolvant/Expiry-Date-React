// lib/utils/dateUtils.ts
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export const parseDateFromString = (str: string): Date => {
  const parsed = dayjs(str, 'DD.MM.YYYY', true);
  if (!parsed.isValid()) {
    throw new Error(`Ungültiges Datum: ${str}`);
  }
  return parsed.toDate();
};

export const formatDateToDisplay = (date: Date | string): string => {
  return dayjs(date).format('DD.MM.YYYY');
};

// 📦 Neue Karten vorbereiten (mit 12:00 Uhr)
export const formatDateToDb = (dateString: string): Date => {
  const parsed = dayjs(dateString, 'DD.MM.YYYY', true);
  if (!parsed.isValid()) {
    throw new Error(`Ungültiges Datum: ${dateString}`);
  }
  return new Date(parsed.format('YYYY-MM-DDT12:00:00'));
};
