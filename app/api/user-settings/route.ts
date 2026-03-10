import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';
import {
  ALLOWED_INVENTORY_LAYOUT_MODES,
  ALLOWED_INVENTORY_SORT_MODES,
  ALLOWED_INTERVAL_UNITS,
  type InventoryLayoutMode,
  type InventorySortMode,
  type IntervalUnit,
  USER_SETTINGS_DEFAULTS,
} from '@/app/lib/user-settings';

function toInt(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') {
    return undefined;
  }

  const num = Number(val);
  if (!Number.isFinite(num)) {
    return undefined;
  }

  return Math.trunc(num);
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

function intervalToLegacyDays(value: number, unit: IntervalUnit) {
  if (unit === 'day') {
    return value;
  }
  if (unit === 'week') {
    return value * 7;
  }
  return value * 30;
}

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      return NextResponse.json(USER_SETTINGS_DEFAULTS);
    }

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error('Fehler beim Abholen der Settings:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Abholen der Settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const body = await req.json();
    const warnLevelBald = toInt(body?.warnLevelBald);
    const warnLevelExpired = toInt(body?.warnLevelExpired);
    const emailRemindersEnabled =
      typeof body?.emailRemindersEnabled === 'boolean' ? body.emailRemindersEnabled : undefined;

    const emailReminderTime =
      typeof body?.emailReminderTime === 'string' ? body.emailReminderTime.trim() : undefined;
    const emailReminderIntervalValue = toInt(body?.emailReminderIntervalValue);
    const rawIntervalUnit =
      typeof body?.emailReminderIntervalUnit === 'string' ? body.emailReminderIntervalUnit : undefined;
    const emailReminderIntervalUnit: IntervalUnit | undefined =
      rawIntervalUnit && ALLOWED_INTERVAL_UNITS.includes(rawIntervalUnit as IntervalUnit)
        ? (rawIntervalUnit as IntervalUnit)
        : undefined;
    const rawInventoryLayoutMode =
      typeof body?.inventoryLayoutMode === 'string' ? body.inventoryLayoutMode : undefined;
    const inventoryLayoutMode: InventoryLayoutMode | undefined =
      rawInventoryLayoutMode &&
      ALLOWED_INVENTORY_LAYOUT_MODES.includes(rawInventoryLayoutMode as InventoryLayoutMode)
        ? (rawInventoryLayoutMode as InventoryLayoutMode)
        : undefined;
    const rawInventorySortMode =
      typeof body?.inventorySortMode === 'string' ? body.inventorySortMode : undefined;
    const inventorySortMode: InventorySortMode | undefined =
      rawInventorySortMode &&
      ALLOWED_INVENTORY_SORT_MODES.includes(rawInventorySortMode as InventorySortMode)
        ? (rawInventorySortMode as InventorySortMode)
        : undefined;

    const emailReminderTimeZone =
      typeof body?.emailReminderTimeZone === 'string' && body.emailReminderTimeZone.trim()
        ? body.emailReminderTimeZone.trim()
        : undefined;

    if (warnLevelBald !== undefined && (warnLevelBald < 1 || warnLevelBald > 30)) {
      return NextResponse.json(
        { error: 'warnLevelBald muss zwischen 1 und 30 liegen.' },
        { status: 400 }
      );
    }

    if (warnLevelExpired !== undefined) {
      const maxExpired = (warnLevelBald ?? USER_SETTINGS_DEFAULTS.warnLevelBald) - 1;
      if (warnLevelExpired < 0 || warnLevelExpired > maxExpired) {
        return NextResponse.json(
          { error: `warnLevelExpired muss zwischen 0 und ${maxExpired} liegen.` },
          { status: 400 }
        );
      }
    }

    if (emailReminderTime !== undefined && !isValidTime(emailReminderTime)) {
      return NextResponse.json(
        { error: 'emailReminderTime muss im Format HH:mm sein (z.B. 22:13).' },
        { status: 400 }
      );
    }

    if (
      emailReminderIntervalValue !== undefined &&
      (emailReminderIntervalValue < 1 || emailReminderIntervalValue > 365)
    ) {
      return NextResponse.json(
        { error: 'emailReminderIntervalValue muss zwischen 1 und 365 liegen.' },
        { status: 400 }
      );
    }

    if (rawIntervalUnit !== undefined && emailReminderIntervalUnit === undefined) {
      return NextResponse.json(
        { error: 'emailReminderIntervalUnit muss day, week oder month sein.' },
        { status: 400 }
      );
    }
    if (rawInventoryLayoutMode !== undefined && inventoryLayoutMode === undefined) {
      return NextResponse.json(
        { error: 'inventoryLayoutMode muss cards, list oder compact sein.' },
        { status: 400 }
      );
    }
    if (rawInventorySortMode !== undefined && inventorySortMode === undefined) {
      return NextResponse.json(
        { error: 'inventorySortMode muss manual, expiry_asc oder expiry_desc sein.' },
        { status: 400 }
      );
    }

    const finalIntervalValue = emailReminderIntervalValue ?? USER_SETTINGS_DEFAULTS.emailReminderIntervalValue;
    const finalIntervalUnit = emailReminderIntervalUnit ?? USER_SETTINGS_DEFAULTS.emailReminderIntervalUnit;
    const finalTime = emailReminderTime ?? USER_SETTINGS_DEFAULTS.emailReminderTime;

    const updateData: Record<string, unknown> = {};
    if (warnLevelBald !== undefined) {
      updateData.warnLevelBald = warnLevelBald;
    }
    if (warnLevelExpired !== undefined) {
      updateData.warnLevelExpired = warnLevelExpired;
    }
    if (emailRemindersEnabled !== undefined) {
      updateData.emailRemindersEnabled = emailRemindersEnabled;
    }
    if (emailReminderTime !== undefined) {
      updateData.emailReminderTime = emailReminderTime;
      updateData.emailReminderHour = Number(emailReminderTime.split(':')[0]); // legacy mirror
    }
    if (emailReminderIntervalValue !== undefined) {
      updateData.emailReminderIntervalValue = emailReminderIntervalValue;
    }
    if (emailReminderIntervalUnit !== undefined) {
      updateData.emailReminderIntervalUnit = emailReminderIntervalUnit;
    }
    if (emailReminderTimeZone !== undefined) {
      updateData.emailReminderTimeZone = emailReminderTimeZone;
    }
    if (inventoryLayoutMode !== undefined) {
      updateData.inventoryLayoutMode = inventoryLayoutMode;
    }
    if (inventorySortMode !== undefined) {
      updateData.inventorySortMode = inventorySortMode;
    }

    updateData.emailReminderFrequencyDays = intervalToLegacyDays(finalIntervalValue, finalIntervalUnit);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Keine gueltigen Felder zum Speichern.' }, { status: 400 });
    }

    const createData: any = {
      userId: session.user.id,
      warnLevelBald: warnLevelBald ?? USER_SETTINGS_DEFAULTS.warnLevelBald,
      warnLevelExpired: warnLevelExpired ?? USER_SETTINGS_DEFAULTS.warnLevelExpired,
      emailRemindersEnabled: emailRemindersEnabled ?? USER_SETTINGS_DEFAULTS.emailRemindersEnabled,
      emailReminderTime: finalTime,
      emailReminderIntervalValue: finalIntervalValue,
      emailReminderIntervalUnit: finalIntervalUnit,
      emailReminderFrequencyDays: intervalToLegacyDays(finalIntervalValue, finalIntervalUnit),
      emailReminderHour: Number(finalTime.split(':')[0]),
      emailReminderTimeZone: emailReminderTimeZone ?? USER_SETTINGS_DEFAULTS.emailReminderTimeZone,
      inventoryLayoutMode: inventoryLayoutMode ?? USER_SETTINGS_DEFAULTS.inventoryLayoutMode,
      inventorySortMode: inventorySortMode ?? USER_SETTINGS_DEFAULTS.inventorySortMode,
    };

    const updated = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: updateData as any,
      create: createData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Fehler beim Speichern der Settings:', error?.message || error);
    return NextResponse.json(
      { error: 'Serverfehler beim Speichern der Settings' },
      { status: 500 }
    );
  }
}
