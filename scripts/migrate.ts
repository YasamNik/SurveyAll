import 'dotenv/config';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from '../lib/db/client';

await migrate(db, { migrationsFolder: './drizzle' });
await pool.end();
console.log('migrations applied');
