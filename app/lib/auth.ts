import { betterAuth } from 'better-auth';
import { nextCookies } from 'better-auth/next-js';
import { openAPI } from 'better-auth/plugins';
import { db } from './db';

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    // requireEmailVerification: true,
  },
  plugins: [openAPI(), nextCookies()],
  // emailVerification: {
  //   sendOnSignUp: true,
  //   sendVerificationEmail: async ({ user, url, token }, request) => {
  //     await sendEmail({
  //       to: user.email,
  //       subject: 'Verify your email address',
  //       text: `Click the link to verify your email: ${url}`,
  //     });
  //   },
  // },
});
