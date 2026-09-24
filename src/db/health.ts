import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from './client';

export const pingDatabase = () => db.execute(sql`select 1`);
