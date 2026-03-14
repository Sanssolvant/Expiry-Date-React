import { NextRequest, NextResponse } from 'next/server';
import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

const handler = toNextJsHandler(auth);
const SIGN_IN_EMAIL_PATH = '/api/auth/sign-in/email';
const SIGN_IN_USERNAME_PATH = '/api/auth/sign-in/username';

type BanSnapshot = {
  banned: boolean;
  banReason: string | null;
  banExpires: number | null;
};

function isBanActive(banned: boolean, banExpires: number | null, nowUnix = Math.floor(Date.now() / 1000)) {
  if (!banned) {
    return false;
  }

  if (banExpires == null) {
    return true;
  }

  return banExpires > nowUnix;
}

function formatBanUntil(unixTimestamp: number) {
  const parts = new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(unixTimestamp * 1000));

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || '';

  const day = getPart('day');
  const month = getPart('month');
  const year = getPart('year');
  const hour = getPart('hour');
  const minute = getPart('minute');

  return `${day}.${month}.${year}, ${hour}:${minute} Uhr`;
}

function buildBanMessage(snapshot: BanSnapshot) {
  const reason = snapshot.banReason?.trim() || 'Kein Grund angegeben.';
  const untilText = snapshot.banExpires
    ? `Gesperrt bis: ${formatBanUntil(snapshot.banExpires)} (Europe/Zurich).`
    : 'Die Sperre ist unbefristet.';

  return `Dein Account ist gesperrt. Grund: ${reason} ${untilText}`;
}

async function readSignInIdentifier(req: NextRequest) {
  const normalizedPath = req.nextUrl.pathname.replace(/\/+$/, '');

  if (normalizedPath !== SIGN_IN_EMAIL_PATH && normalizedPath !== SIGN_IN_USERNAME_PATH) {
    return null;
  }

  const body = await req
    .clone()
    .json()
    .catch(() => null);

  if (!body || typeof body !== 'object') {
    return null;
  }

  if (normalizedPath === SIGN_IN_EMAIL_PATH) {
    const email = typeof (body as any).email === 'string' ? (body as any).email.trim() : '';
    return email ? { type: 'email' as const, value: email } : null;
  }

  const username =
    typeof (body as any).username === 'string' ? (body as any).username.trim() : '';
  return username ? { type: 'username' as const, value: username } : null;
}

async function getActiveBanMessageForSignIn(req: NextRequest) {
  const identifier = await readSignInIdentifier(req);
  if (!identifier) {
    return null;
  }

  const user =
    identifier.type === 'email'
      ? await prisma.user.findUnique({
          where: { email: identifier.value },
          select: { banned: true, banReason: true, banExpires: true },
        })
      : await prisma.user.findUnique({
          where: { username: identifier.value },
          select: { banned: true, banReason: true, banExpires: true },
        });

  if (!user || !isBanActive(user.banned, user.banExpires)) {
    return null;
  }

  return buildBanMessage(user);
}

export async function POST(req: NextRequest) {
  const banMessage = await getActiveBanMessageForSignIn(req).catch((error) => {
    console.error('Sign-in ban precheck failed:', error);
    return null;
  });

  if (banMessage) {
    return NextResponse.json({ code: 'USER_BANNED', message: banMessage }, { status: 403 });
  }

  return handler.POST(req);
}

export const GET = handler.GET;
