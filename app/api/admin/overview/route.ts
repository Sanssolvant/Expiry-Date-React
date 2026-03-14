import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminAccess,
  isBanCurrentlyActive,
  isConfiguredAdminIdentity,
} from '@/app/lib/admin-access';
import prisma from '@/app/lib/prisma';

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateLabel(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}`;
}

function parseUsersLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 60;
  }
  return Math.max(20, Math.min(120, Math.trunc(parsed)));
}

export async function GET(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const usersLimit = parseUsersLimit(req.nextUrl.searchParams.get('usersLimit'));

  const now = new Date();
  const nowUnix = Math.floor(now.getTime() / 1000);

  const today = startOfDay(now);
  const soonWindowEnd = endOfDay(addDays(today, 7));
  const expiryTrendEnd = endOfDay(addDays(today, 13));
  const userGrowthStart = startOfDay(addDays(today, -29));

  try {
    const activeBanWhere = {
      banned: true,
      OR: [{ banExpires: null }, { banExpires: { gt: nowUnix } }],
    };

    const [
      totalUsers,
      verifiedUsers,
      premiumUsers,
      activeBans,
      totalProducts,
      expiringSoonProducts,
      expiredProducts,
      remindersEnabledUsers,
      roleDistributionRaw,
      usersRaw,
      soonByUserRaw,
      expiredByUserRaw,
      userGrowthRaw,
      expiryTrendRaw,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { emailVerified: true } }),
      prisma.user.count({ where: { premium: true } }),
      prisma.user.count({ where: activeBanWhere }),
      prisma.produkt.count(),
      prisma.produkt.count({
        where: { ablaufdatum: { gte: today, lte: soonWindowEnd } },
      }),
      prisma.produkt.count({
        where: { ablaufdatum: { lt: today } },
      }),
      prisma.userSettings.count({ where: { emailRemindersEnabled: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: usersLimit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerified: true,
          premium: true,
          banned: true,
          banReason: true,
          banExpires: true,
          createdAt: true,
          updatedAt: true,
          settings: {
            select: {
              emailRemindersEnabled: true,
              emailReminderLastSentAt: true,
              emailReminderTime: true,
              emailReminderTimeZone: true,
            },
          },
          _count: {
            select: {
              produkte: true,
              sessions: true,
              shoppingItems: true,
            },
          },
        },
      }),
      prisma.produkt.groupBy({
        by: ['userId'],
        where: {
          ablaufdatum: { gte: today, lte: soonWindowEnd },
        },
        _count: { _all: true },
      }),
      prisma.produkt.groupBy({
        by: ['userId'],
        where: {
          ablaufdatum: { lt: today },
        },
        _count: { _all: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: userGrowthStart } },
        select: { createdAt: true },
      }),
      prisma.produkt.findMany({
        where: {
          ablaufdatum: { gte: today, lte: expiryTrendEnd },
        },
        select: { ablaufdatum: true },
      }),
    ]);

    const soonByUser = new Map<string, number>(
      soonByUserRaw.map((item) => [item.userId, item._count._all])
    );
    const expiredByUser = new Map<string, number>(
      expiredByUserRaw.map((item) => [item.userId, item._count._all])
    );

    const urgentUserIds = new Set<string>(
      Array.from(soonByUser.keys()).concat(Array.from(expiredByUser.keys()))
    );

    const userGrowthCounts = new Map<string, number>();
    for (const item of userGrowthRaw) {
      const key = dateKey(item.createdAt);
      userGrowthCounts.set(key, (userGrowthCounts.get(key) || 0) + 1);
    }

    const userGrowth30d = Array.from({ length: 30 }, (_, index) => {
      const current = addDays(userGrowthStart, index);
      const key = dateKey(current);
      return {
        date: key,
        label: dateLabel(current),
        users: userGrowthCounts.get(key) || 0,
      };
    });

    const expiryTrendCounts = new Map<string, number>();
    for (const item of expiryTrendRaw) {
      const key = dateKey(item.ablaufdatum);
      expiryTrendCounts.set(key, (expiryTrendCounts.get(key) || 0) + 1);
    }

    const expiryNext14d = Array.from({ length: 14 }, (_, index) => {
      const current = addDays(today, index);
      const key = dateKey(current);
      return {
        date: key,
        label: dateLabel(current),
        products: expiryTrendCounts.get(key) || 0,
      };
    });

    const roleDistribution = roleDistributionRaw.map((item) => {
      const roleName = item.role === 'admin' ? 'Admin' : 'User';
      return {
        name: roleName,
        value: item._count._all,
        color: roleName === 'Admin' ? 'teal.6' : 'blue.6',
      };
    });

    const remindersDisabledUsers = Math.max(0, totalUsers - remindersEnabledUsers);

    const users = usersRaw
      .map((user) => {
        const banActive = isBanCurrentlyActive(user.banned, user.banExpires, nowUnix);
        const soonExpiring = soonByUser.get(user.id) || 0;
        const expired = expiredByUser.get(user.id) || 0;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          premium: user.premium,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          protectedIdentity: isConfiguredAdminIdentity(user.id, user.email),
          ban: {
            active: banActive,
            reason: user.banReason,
            expiresAt: user.banExpires ? new Date(user.banExpires * 1000).toISOString() : null,
          },
          counts: {
            products: user._count.produkte,
            sessions: user._count.sessions,
            shoppingItems: user._count.shoppingItems,
            soonExpiring,
            expired,
          },
          reminders: {
            enabled: Boolean(user.settings?.emailRemindersEnabled),
            lastSentAt: user.settings?.emailReminderLastSentAt?.toISOString() || null,
            time: user.settings?.emailReminderTime || null,
            timeZone: user.settings?.emailReminderTimeZone || null,
          },
        };
      })
      .sort((a, b) => {
        const urgencyA = a.counts.expired + a.counts.soonExpiring;
        const urgencyB = b.counts.expired + b.counts.soonExpiring;
        if (urgencyA !== urgencyB) {
          return urgencyB - urgencyA;
        }
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });

    return NextResponse.json({
      generatedAt: now.toISOString(),
      summary: {
        totalUsers,
        verifiedUsers,
        premiumUsers,
        activeBans,
        totalProducts,
        expiringSoonProducts,
        expiredProducts,
        remindersEnabledUsers,
        usersWithUrgentProducts: urgentUserIds.size,
        usersReturned: users.length,
      },
      charts: {
        userGrowth30d,
        expiryNext14d,
        roleDistribution,
        reminderState: [
          { name: 'Erinnerung aktiv', value: remindersEnabledUsers, color: 'teal.6' },
          { name: 'Erinnerung aus', value: remindersDisabledUsers, color: 'gray.6' },
        ],
      },
      users,
    });
  } catch (error: any) {
    console.error('Admin overview failed:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler beim Laden der Admin-Daten.' }, { status: 500 });
  }
}
