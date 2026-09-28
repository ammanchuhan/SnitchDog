import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

// Migrations run as the owner (DATABASE_URL). The server itself runs as snitchdog_app.
const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

for (const statement of schema.split(/;\s*$/m).map((s) => s.trim()).filter(Boolean)) {
  await sql.query(statement);
  console.log('✓', statement.split('\n').find((l) => l && !l.startsWith('--')) ?? statement.split('\n')[0]);
}

// The app role gets rows, never the schema. Re-applied every run so new tables are covered.
const role = await sql.query("select 1 from pg_roles where rolname = 'snitchdog_app'");
if (role.length) {
  await sql.query('grant usage on schema public to snitchdog_app');
  await sql.query('grant select, insert, update, delete on all tables in schema public to snitchdog_app');
  await sql.query('grant usage, select on all sequences in schema public to snitchdog_app');
  await sql.query('grant execute on all functions in schema public to snitchdog_app');
  console.log('✓ grants for snitchdog_app');
} else {
  console.log('! snitchdog_app does not exist yet: run scripts/create-app-role.mjs, then migrate again');
}
console.log('schema up to date');
