// Creates the least-privilege role the server runs as, and prints nothing secret.
//
//   node --env-file=.env.local scripts/create-app-role.mjs
//
// The role can read and write rows but can't change the schema or bypass row-level security.
// Its connection string is written to .env.local as APP_DATABASE_URL; set the same value on
// Vercel (marked Sensitive). Run again to rotate the password. Grants are applied by migrate.
import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

const ROLE = 'snitchdog_app';
const owner = neon(process.env.DATABASE_URL);
const password = randomBytes(24).toString('base64url');

const exists = (await owner.query('select 1 from pg_roles where rolname = $1', [ROLE])).length > 0;
// A role name and password can't be bind parameters; both are generated or constant here.
await owner.query(
  exists
    ? `alter role ${ROLE} with login password '${password}' nobypassrls nocreatedb nocreaterole`
    : `create role ${ROLE} with login password '${password}' nobypassrls nocreatedb nocreaterole`,
);

const url = new URL(process.env.DATABASE_URL);
url.username = ROLE;
url.password = password;

const env = readFileSync('.env.local', 'utf8');
const line = `APP_DATABASE_URL=${url.toString()}`;
if (/^APP_DATABASE_URL=/m.test(env)) writeFileSync('.env.local', env.replace(/^APP_DATABASE_URL=.*$/m, line));
else appendFileSync('.env.local', `\n# The least-privilege role the server runs as (scripts/create-app-role.mjs)\n${line}\n`);
console.log(`${exists ? 'rotated' : 'created'} ${ROLE}; APP_DATABASE_URL written to .env.local`);
