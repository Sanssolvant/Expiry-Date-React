import { PrismaClient } from '@prisma/client';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { openAPI } from 'better-auth/plugins';
import { sendEmail } from './send-email';

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'mysql',
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, token }) => {
      const verificationUrl = `${process.env.BETTER_AUTH_URL}/reset-password?token=${token}`;
      await sendEmail({
        to: user.email,
        subject: 'Änderung Ihres Passworts',
        text: `Hallo ${user.name || ''},\n\nKlicke auf diesen Link, um dein Passwort zu ändern.:\n${verificationUrl}\n\nDanke!`,
      });
    },
  },
  plugins: [openAPI(), nextCookies()],
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, token }) => {
      const verificationUrl = `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=${token}&callbackURL=${process.env.EMAIL_VERIFICATION_CALLBACK_URL}`;
      await sendEmail({
        to: user.email,
        subject: 'Bestätige deine E-Mail-Adresse',
        text: `Hallo ${user.name || ''},\n\nKlicke auf diesen Link, um deine E-Mail zu verifizieren:\n${verificationUrl}\n\nDanke!`,
      });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: false,
    },
  },
});
