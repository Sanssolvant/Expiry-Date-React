'use client';

import { MainSectionShell } from './General/MainSectionShell';
import { RecipeExplorer } from './General/RecipeExplorer';
import { useWarnSettings } from './hooks/useWarnSettings';

export function RecipesPage() {
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
      title="Rezepte"
      userMenu={{
        baldAb: warnBaldAb,
        abgelaufenAb: warnAbgelaufenAb,
        calendarUpcomingDays,
        setBaldAb: setWarnBaldAb,
        setAbgelaufenAb: setWarnAbgelaufenAb,
        setCalendarUpcomingDays,
      }}
    >
      <RecipeExplorer />
    </MainSectionShell>
  );
}
