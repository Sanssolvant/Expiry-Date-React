import { NextRequest, NextResponse } from 'next/server';
import { formatDateToDisplay } from '@/app/lib/dateUtils';
import prisma from '@/app/lib/prisma';
import { sendEmail } from '@/app/lib/send-email';
import { ALLOWED_INTERVAL_UNITS, USER_SETTINGS_DEFAULTS } from '@/app/lib/user-settings';

export const runtime = 'nodejs';

type IntervalUnit = 'day' | 'week' | 'month';

type ReminderSetting = {
  userId: string;
  warnLevelBald: number;
  emailRemindersEnabled: boolean;
  emailReminderFrequencyDays: number;
  emailReminderHour: number;
  emailReminderTimeZone: string;
  emailReminderLastSentAt: Date | null;
  emailReminderTime?: string | null;
  emailReminderIntervalValue?: number | null;
  emailReminderIntervalUnit?: string | null;
  user: {
    email: string;
    name: string;
  };
};

function parseTimeToMinutes(time: string) {
  const safe = /^([01]\d|2[0-3]):([0-5]\d)$/.test(time) ? time : USER_SETTINGS_DEFAULTS.emailReminderTime;
  const [h, m] = safe.split(':').map(Number);
  return h * 60 + m;
}

function getPartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value ?? '1970');
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? '1');
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '1');
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  return { year, month, day, hour, minute };
}

function getYmdInTimeZone(date: Date, timeZone: string) {
  const p = getPartsInTimeZone(date, timeZone);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function dayDiffInTimeZone(fromDate: Date, toDate: Date, timeZone: string) {
  const from = new Date(`${getYmdInTimeZone(fromDate, timeZone)}T00:00:00Z`);
  const to = new Date(`${getYmdInTimeZone(toDate, timeZone)}T00:00:00Z`);
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function hasTimePassedToday(now: Date, timeZone: string, reminderTime: string) {
  const nowParts = getPartsInTimeZone(now, timeZone);
  const nowMinutes = nowParts.hour * 60 + nowParts.minute;
  return nowMinutes >= parseTimeToMinutes(reminderTime);
}

function monthDiff(fromDate: Date, toDate: Date, timeZone: string) {
  const from = getPartsInTimeZone(fromDate, timeZone);
  const to = getPartsInTimeZone(toDate, timeZone);
  return (to.year - from.year) * 12 + (to.month - from.month);
}

function lastDayOfMonth(year: number, month1Based: number) {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

function hasIntervalElapsed(
  lastSentAt: Date,
  now: Date,
  timeZone: string,
  intervalValue: number,
  intervalUnit: IntervalUnit
) {
  if (intervalUnit === 'day') {
    return dayDiffInTimeZone(lastSentAt, now, timeZone) >= intervalValue;
  }

  if (intervalUnit === 'week') {
    return dayDiffInTimeZone(lastSentAt, now, timeZone) >= intervalValue * 7;
  }

  const mDiff = monthDiff(lastSentAt, now, timeZone);
  if (mDiff > intervalValue) {
    return true;
  }
  if (mDiff < intervalValue) {
    return false;
  }

  const last = getPartsInTimeZone(lastSentAt, timeZone);
  const cur = getPartsInTimeZone(now, timeZone);
  const maxCurDay = lastDayOfMonth(cur.year, cur.month);
  const targetDay = Math.min(last.day, maxCurDay);

  if (cur.day > targetDay) {
    return true;
  }
  if (cur.day < targetDay) {
    return false;
  }

  return true;
}

function shouldSendReminder(settings: ReminderSetting, now: Date) {
  if (!settings.emailRemindersEnabled) {
    return false;
  }

  const timeZone = settings.emailReminderTimeZone || USER_SETTINGS_DEFAULTS.emailReminderTimeZone;
  const reminderTime =
    typeof settings.emailReminderTime === 'string' && settings.emailReminderTime
      ? settings.emailReminderTime
      : `${String(settings.emailReminderHour ?? USER_SETTINGS_DEFAULTS.emailReminderHour).padStart(2, '0')}:00`;

  if (!hasTimePassedToday(now, timeZone, reminderTime)) {
    return false;
  }

  if (!settings.emailReminderLastSentAt) {
    return true;
  }

  const intervalValue = Math.max(
    1,
    Number(
      settings.emailReminderIntervalValue ??
      settings.emailReminderFrequencyDays ??
      1
    )
  );
  const intervalUnit = ALLOWED_INTERVAL_UNITS.includes((settings.emailReminderIntervalUnit || '') as IntervalUnit)
    ? (settings.emailReminderIntervalUnit as IntervalUnit)
    : USER_SETTINGS_DEFAULTS.emailReminderIntervalUnit;

  return hasIntervalElapsed(
    settings.emailReminderLastSentAt,
    now,
    timeZone,
    intervalValue,
    intervalUnit
  );
}

function buildReminderText(name: string, products: Array<{ name: string; ablaufdatum: Date }>) {
  const lines = products.map((p) => `- ${p.name} (Ablauf: ${formatDateToDisplay(p.ablaufdatum)})`);
  return (
    `Hallo ${name || 'bei TrackShelf'},\n\n` +
    `diese Produkte laufen bald ab oder sind bereits abgelaufen:\n\n` +
    `${lines.join('\n')}\n\n` +
    `Bitte prüfe deinen Vorrat in TrackShelf.\n`
  );
}

export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.REMINDER_CRON_SECRET;
    const bearer = req.headers.get('authorization')?.replace('Bearer ', '');
    const headerSecret = req.headers.get('x-reminder-secret');
    const providedSecret = headerSecret || bearer;

    if (!configuredSecret) {
      return NextResponse.json(
        { error: 'REMINDER_CRON_SECRET ist nicht gesetzt.' },
        { status: 500 }
      );
    }

    if (!providedSecret || providedSecret !== configuredSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const settings = (await prisma.userSettings.findMany({
      where: { emailRemindersEnabled: true },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })) as unknown as ReminderSetting[];

    let checkedUsers = 0;
    let dueUsers = 0;
    let sentEmails = 0;
    let skippedNoProducts = 0;
    let failedEmails = 0;

    for (const setting of settings) {
      checkedUsers += 1;
      if (!shouldSendReminder(setting, now)) {
        continue;
      }
      dueUsers += 1;

      const horizon = new Date();
      horizon.setHours(23, 59, 59, 999);
      horizon.setDate(horizon.getDate() + setting.warnLevelBald);

      const products = await prisma.produkt.findMany({
        where: {
          userId: setting.userId,
          ablaufdatum: { lte: horizon },
        },
        orderBy: { ablaufdatum: 'asc' },
        select: { name: true, ablaufdatum: true },
        take: 40,
      });

      if (products.length === 0) {
        skippedNoProducts += 1;
        continue;
      }

      try {
        await sendEmail({
          to: setting.user.email,
          subject: 'TrackShelf Erinnerung: Produkte laufen bald ab',
          text: buildReminderText(setting.user.name, products),
        });

        await prisma.userSettings.update({
          where: { userId: setting.userId },
          data: { emailReminderLastSentAt: now },
        });

        sentEmails += 1;
      } catch (err) {
        failedEmails += 1;
        console.error('Reminder-Mail Fehler:', err);
      }
    }

    return NextResponse.json({
      ok: true,
      checkedUsers,
      dueUsers,
      sentEmails,
      skippedNoProducts,
      failedEmails,
    });
  } catch (error: any) {
    console.error('Fehler beim Reminder-Run:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Reminder-Run' }, { status: 500 });
  }
}
