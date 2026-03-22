'use client';

import { ExpiryCalendar } from './General/ExpiryCalendar';
import { MainSectionShell } from './General/MainSectionShell';
import { useWarnSettings } from './hooks/useWarnSettings';

export function ExpiryCalendarPage() {
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
      title="Kalender"
      userMenu={{
        baldAb: warnBaldAb,
        abgelaufenAb: warnAbgelaufenAb,
        calendarUpcomingDays,
        setBaldAb: setWarnBaldAb,
        setAbgelaufenAb: setWarnAbgelaufenAb,
        setCalendarUpcomingDays,
      }}
    >
      <ExpiryCalendar
        warnBaldAb={warnBaldAb}
        warnAbgelaufenAb={warnAbgelaufenAb}
        calendarUpcomingDays={calendarUpcomingDays}
      />
    </MainSectionShell>
  );
}
