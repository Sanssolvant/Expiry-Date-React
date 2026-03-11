import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminAccess,
  isBanCurrentlyActive,
  isConfiguredAdminIdentity,
} from '@/app/lib/admin-access';
import prisma from '@/app/lib/prisma';

const MAX_BAN_HOURS = 24 * 365;

type ModerationAction = 'ban' | 'unban';

function sanitizeReason(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/g, ' ');
  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, 200);
}

function parseDurationHours(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const intValue = Math.trunc(parsed);
  if (intValue < 0 || intValue > MAX_BAN_HOURS) {
    return null;
  }

  return intValue;
}

function mapUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  banned: boolean;
  banReason: string | null;
  banExpires: number | null;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ban: {
      active: isBanCurrentlyActive(user.banned, user.banExpires),
      reason: user.banReason,
      expiresAt: user.banExpires ? new Date(user.banExpires * 1000).toISOString() : null,
    },
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function PATCH(req: NextRequest) {
  const access = await getAdminAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltiges JSON.' }, { status: 400 });
  }

  const action = body?.action as ModerationAction | undefined;
  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';

  if (!userId) {
    return NextResponse.json({ error: 'userId fehlt.' }, { status: 400 });
  }

  if (action !== 'ban' && action !== 'unban') {
    return NextResponse.json({ error: 'action muss ban oder unban sein.' }, { status: 400 });
  }

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        updatedAt: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'User nicht gefunden.' }, { status: 404 });
    }

    if (action === 'ban') {
      if (target.id === access.user.id) {
        return NextResponse.json({ error: 'Du kannst dich nicht selbst bannen.' }, { status: 400 });
      }

      if (isConfiguredAdminIdentity(target.id, target.email)) {
        return NextResponse.json(
          { error: 'Der konfigurierte Admin-Account ist geschuetzt.' },
          { status: 400 }
        );
      }

      const durationHours = parseDurationHours(body?.durationHours);
      if (durationHours === null) {
        return NextResponse.json(
          { error: `durationHours muss zwischen 0 und ${MAX_BAN_HOURS} liegen.` },
          { status: 400 }
        );
      }

      const reason = sanitizeReason(body?.reason) || 'Durch Admin gesperrt.';
      const nowUnix = Math.floor(Date.now() / 1000);

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          banned: true,
          banReason: reason,
          banExpires: durationHours > 0 ? nowUnix + durationHours * 3600 : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          banned: true,
          banReason: true,
          banExpires: true,
          updatedAt: true,
        },
      });

      return NextResponse.json({
        ok: true,
        message: 'User wurde gesperrt.',
        user: mapUser(updated),
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        banned: false,
        banReason: null,
        banExpires: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'User wurde entsperrt.',
      user: mapUser(updated),
    });
  } catch (error: any) {
    console.error('Admin moderation failed:', error?.message || error);
    return NextResponse.json({ error: 'Serverfehler bei der Moderation.' }, { status: 500 });
  }
}
