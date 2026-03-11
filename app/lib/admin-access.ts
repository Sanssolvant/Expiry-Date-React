import { headers } from 'next/headers';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: number | null;
};

type AdminAllowlist = {
  userIds: string[];
  emails: string[];
  configured: boolean;
};

export type AdminAccessSuccess = {
  ok: true;
  user: SessionUser;
};

export type AdminAccessFailure = {
  ok: false;
  status: 401 | 403 | 500;
  error: string;
};

export type AdminAccessResult = AdminAccessSuccess | AdminAccessFailure;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseCsvEnv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    )
  );
}

function getAdminAllowlist(): AdminAllowlist {
  const userIds = parseCsvEnv(process.env.ADMIN_USER_IDS);
  const emailsRaw = parseCsvEnv(process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL);
  const emails = Array.from(new Set(emailsRaw.map(normalizeEmail)));

  return {
    userIds,
    emails,
    configured: userIds.length > 0 || emails.length > 0,
  };
}

export function isConfiguredAdminIdentity(userId: string, email: string | null | undefined) {
  const allowlist = getAdminAllowlist();
  if (!allowlist.configured) {
    return false;
  }

  const userMatch = allowlist.userIds.includes(userId);
  const emailMatch = Boolean(email && allowlist.emails.includes(normalizeEmail(email)));
  return userMatch || emailMatch;
}

export function isBanCurrentlyActive(
  banned: boolean,
  banExpires: number | null | undefined,
  nowUnix = Math.floor(Date.now() / 1000)
) {
  if (!banned) {
    return false;
  }

  if (banExpires == null) {
    return true;
  }

  return banExpires > nowUnix;
}

export async function getAdminAccess(): Promise<AdminAccessResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
      query: {
        disableCookieCache: true,
      },
    });

    if (!session?.user?.id) {
      return {
        ok: false,
        status: 401,
        error: 'Nicht eingeloggt.',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
      },
    });

    if (!user) {
      return {
        ok: false,
        status: 401,
        error: 'User nicht gefunden.',
      };
    }

    const allowlist = getAdminAllowlist();
    if (!allowlist.configured) {
      return {
        ok: false,
        status: 403,
        error: 'Admin-Allowlist nicht konfiguriert. Setze ADMIN_EMAILS oder ADMIN_USER_IDS.',
      };
    }

    if (isBanCurrentlyActive(user.banned, user.banExpires)) {
      return {
        ok: false,
        status: 403,
        error: 'Gesperrte Accounts haben keinen Admin-Zugriff.',
      };
    }

    if (user.role !== 'admin') {
      return {
        ok: false,
        status: 403,
        error: 'Nur Admins haben Zugriff.',
      };
    }

    if (!isConfiguredAdminIdentity(user.id, user.email)) {
      return {
        ok: false,
        status: 403,
        error: 'Dein Account ist nicht in der Admin-Allowlist.',
      };
    }

    return {
      ok: true,
      user,
    };
  } catch (error: any) {
    console.error('Admin access check failed:', error?.message || error);
    return {
      ok: false,
      status: 500,
      error: 'Serverfehler bei der Admin-Prüfung.',
    };
  }
}
