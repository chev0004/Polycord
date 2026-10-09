import { defineConfig } from 'drizzle-kit';
import supabaseCa from './src/db/supabaseCa.json';

const url = new URL(
  process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/polycord',
);
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password) || undefined,
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: isLocal
      ? undefined
      : {
          rejectUnauthorized: true,
          ...(url.hostname.endsWith('.pooler.supabase.com') && {
            ca: supabaseCa,
          }),
        },
  },
  strict: true,
  verbose: true,
});
