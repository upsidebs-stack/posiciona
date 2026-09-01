import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';

import { db } from '@/db';
import { accounts, sessions, users, verificationTokens } from '@/db/schema';

// Google OAuth is optional in Fase 0 — the owner hasn't created those
// credentials yet (see DECISIONS.md). Magic link (Resend) is the primary
// sign-in method and the one the Fase 0 acceptance criterion tests.
const providers = [
  Resend({
    // next-auth's env-var auto-inference looks for AUTH_RESEND_KEY, but
    // PLANO.md section 17 names it RESEND_API_KEY — pass it explicitly so
    // that naming stays authoritative. See DECISIONS.md.
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.MAIL_FROM,
  }),
  ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
    ? [
        Google({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
      ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    // `users.email` is `citext` (case-insensitive) by deliberate product
    // choice — PLANO.md section 5. @auth/drizzle-adapter's Postgres types
    // only accept PgText/PgVarchar for that column, but at runtime it just
    // runs Drizzle queries against whatever column is there, so this is a
    // type-level cast only. See DECISIONS.md.
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any),
  providers,
  session: { strategy: 'database' },
  pages: {
    signIn: '/login',
    verifyRequest: '/login/check-email',
  },
});
