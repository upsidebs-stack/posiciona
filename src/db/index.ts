import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema';

// Falls back to a placeholder so importing this module never throws — Next's
// build-time page-data collection imports every route (including ones that
// only need `auth()`, never `db`) without calling anything. A missing real
// DATABASE_URL still fails loudly, just at query time instead of import time.
const sql = neon(process.env.DATABASE_URL || 'postgresql://placeholder:placeholder@placeholder.neon.tech/placeholder');

export const db = drizzle(sql, { schema });
