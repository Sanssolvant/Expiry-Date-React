import { WarnLevel } from '@/app/types';

/**
 * Berechnet das Warnlevel basierend auf dem Ablaufdatum (im Format DD.MM.YYYY)
 */
export function calculateWarnLevel(
  ablaufdatum: string,
  baldAb: number = 3,
  abgelaufenSeit: number = 0
): WarnLevel {
  const [day, month, year] = ablaufdatum.split('.');
  const expiryDate = new Date(`${year}-${month}-${day}T00:00:00`);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffInDays = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffInDays < -abgelaufenSeit) {
    return WarnLevel.ABGELAUFEN; // Schon länger abgelaufen
  }

  if (diffInDays >= 0 && diffInDays <= baldAb) {
    return WarnLevel.BALD; // Bald abgelaufen
  }

  return WarnLevel.OK;
}
