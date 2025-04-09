export type WarnLevel = 'ok' | 'bald' | 'abgelaufen';

/**
 * Berechnet das Warnlevel basierend auf dem Ablaufdatum (im Format DD.MM.YYYY)
 */
export function calculateWarnLevel(
  ablaufdatum: string,
  baldAb: number = 3,
  abgelaufenAb: number = 0
): 'ok' | 'bald' | 'abgelaufen' {
  const [day, month, year] = ablaufdatum.split('.');
  const expiryDate = new Date(`${year}-${month}-${day}T12:00:00`);
  const today = new Date();
  const diffInDays = Math.floor(
    (expiryDate.getTime() - today.setHours(12, 0, 0, 0)) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays <= abgelaufenAb) {
    return 'abgelaufen';
  }

  if (diffInDays <= baldAb) {
    return 'bald';
  }

  return 'ok';
}
