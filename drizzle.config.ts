import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// DATABASE_URL only needs to be a real, reachable connection string for
// `migrate` / `push` / `studio`. `generate` just diffs schema.ts against the
// local migrations folder and never opens a connection.
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://placeholder',
  },
  strict: true,
  verbose: true,
});
