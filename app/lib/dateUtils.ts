import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const DISPLAY_DATE_FORMAT = 'DD.MM.YYYY';
const STORAGE_DATE_FORMAT = 'YYYY-MM-DD';

function parseSupportedDateString(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const displayDate = dayjs(trimmed, DISPLAY_DATE_FORMAT, true);
  if (displayDate.isValid()) {
    return displayDate;
  }

  const storageDate = dayjs(trimmed, STORAGE_DATE_FORMAT, true);
  if (storageDate.isValid()) {
    return storageDate;
  }

  const fallback = dayjs(trimmed);
  return fallback.isValid() ? fallback : null;
}

function parseDateLike(value: Date | string) {
  if (value instanceof Date) {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }

  return parseSupportedDateString(value);
}

export const parseDateFromString = (str: string): Date => {
  const parsed = parseSupportedDateString(str);
  if (!parsed) {
    throw new Error(`Ungültiges Datum: ${str}`);
  }
  return parsed.toDate();
};

export const formatDateToDisplay = (date: Date | string): string => {
  const parsed = parseDateLike(date);
  if (!parsed) {
    throw new Error(`Ungültiges Datum: ${String(date)}`);
  }
  return parsed.format(DISPLAY_DATE_FORMAT);
};

export const formatDateToStorage = (date: Date | string): string => {
  const parsed = parseDateLike(date);
  if (!parsed) {
    throw new Error(`Ungültiges Datum: ${String(date)}`);
  }
  return parsed.format(STORAGE_DATE_FORMAT);
};

export const formatDateToDb = (dateString: string): Date => {
  const parsed = parseSupportedDateString(dateString);
  if (!parsed) {
    throw new Error(`Ungültiges Datum: ${dateString}`);
  }
  return new Date(parsed.format(`${STORAGE_DATE_FORMAT}T12:00:00`));
};
