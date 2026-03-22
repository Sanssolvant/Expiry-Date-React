'use client';

import ShoppingList from './General/ShoppingList';
import { MainSectionShell } from './General/MainSectionShell';
import { useWarnSettings } from './hooks/useWarnSettings';

export function ShoppingListPage() {
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
      title="Einkaufszettel"
      userMenu={{
        baldAb: warnBaldAb,
        abgelaufenAb: warnAbgelaufenAb,
        calendarUpcomingDays,
        setBaldAb: setWarnBaldAb,
        setAbgelaufenAb: setWarnAbgelaufenAb,
        setCalendarUpcomingDays,
      }}
    >
      <ShoppingList />
    </MainSectionShell>
  );
}
