// Clears every rate-limit window. For test runs against a development database only.
import { neon } from '@neondatabase/serverless';

if (process.env.NODE_ENV === 'production') throw new Error('not in production');
await neon(process.env.DATABASE_URL).query('delete from rate_limits');
console.log('rate limits cleared');
