'use client';

import { MainSectionShell } from './General/MainSectionShell';
import { NutritionInsights } from './General/NutritionInsights';
import { useWarnSettings } from './hooks/useWarnSettings';

export function NutritionPage() {
  const {
    warnBaldAb,
    warnAbgelaufenAb,
    calendarUpcomingDays,
    setWarnBaldAb,
    setWarnAbgelaufenAb,
    setCalendarUpcomingDays,
  } = useWarnSettings();

  return (
    <MainSectionShell
      title="Naehrwertblick"
      userMenu={{
        baldAb: warnBaldAb,
        abgelaufenAb: warnAbgelaufenAb,
        calendarUpcomingDays,
        setBaldAb: setWarnBaldAb,
        setAbgelaufenAb: setWarnAbgelaufenAb,
        setCalendarUpcomingDays,
      }}
    >
      <NutritionInsights />
    </MainSectionShell>
  );
}
