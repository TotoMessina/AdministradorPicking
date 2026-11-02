// PostgREST runs STABLE and IMMUTABLE functions in a read-only transaction. Locking or writing there fails
// with "cannot execute SELECT FOR SHARE in a read-only transaction", even when the lock is in a function it calls.
// Runs on the final database, after every migration, so replaced functions are judged by their last definition.
import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PLATFORM_SQL } from './platform.mjs';

const db = new PGlite();
const FORBIDDEN = [
  [/\bfor\s+(no\s+key\s+update|update|key\s+share|share)\b/i, 'bloquea filas'],
  [/\b(insert\s+into|delete\s+from|merge\s+into|truncate)\b|\bupdate\s+[\w."]+(\s+(as\s+)?\w+)?\s+set\b/i, 'escribe datos'],
  [/\bnextval\s*\(/i, 'avanza una secuencia'],
];

const code = text => text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--.*$/gm, ' ').replace(/'(?:[^']|'')*'/g, "''");
const problem = text => FORBIDDEN.find(([pattern]) => pattern.test(text))?.[1];

async function loadFunctions() {
  const { rows } = await db.query(`select n.nspname||'.'||p.proname as name,p.proname as short,p.provolatile as volatility,p.prosrc as source,
      pg_catalog.format_type(p.prorettype,null) as returns
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace join pg_catalog.pg_language l on l.oid=p.prolang
    where n.nspname in ('public','retail_private','auth') and l.lanname in ('sql','plpgsql')`);
  return rows.filter(row => row.returns !== 'trigger').map(row => ({ ...row, body: code(row.source) }));
}

function calledBy(text, functions) {
  return functions.filter(fn => new RegExp(`(^|[^\\w"])${fn.short}\\s*\\(`, 'i').test(text));
}

// Returns the chain from the starting text to the first function that cannot run read-only.
function findPath(text, functions, seen = new Set()) {
  for (const fn of calledBy(text, functions)) {
    if (seen.has(fn.name)) continue;
    seen.add(fn.name);
    const reason = problem(fn.body);
    if (reason) return [`${fn.name} ${reason}`];
    const deeper = findPath(fn.body, functions, seen);
    if (deeper) return [fn.name, ...deeper];
  }
  return null;
}

async function violations() {
  const functions = await loadFunctions();
  const found = [];
  for (const fn of functions.filter(item => item.volatility !== 'v')) {
    const own = problem(fn.body);
    const path = own ? [`${own} en su propio cuerpo`] : findPath(fn.body, functions, new Set([fn.name]));
    if (path) found.push(`${fn.name}: ${path.join(' -> ')}`);
  }
  const policies = await db.query(`select tablename,policyname,qual from pg_catalog.pg_policies where cmd in ('SELECT','ALL') and qual is not null and schemaname in ('public','storage')`);
  for (const policy of policies.rows) {
    const path = findPath(code(policy.qual), functions);
    if (path) found.push(`política ${policy.tablename}.${policy.policyname}: ${path.join(' -> ')}`);
  }
  const views = await db.query(`select schemaname||'.'||viewname as name,definition from pg_catalog.pg_views where schemaname in ('public','retail_private')`);
  for (const view of views.rows) {
    const path = findPath(code(view.definition), functions);
    if (path) found.push(`vista ${view.name}: ${path.join(' -> ')}`);
  }
  return found;
}

try {
  await db.exec(PLATFORM_SQL);
  for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql')).sort()) await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^﻿/, ''));

  const found = await violations();
  assert.deepEqual(found, [], `Funciones de solo lectura que fallarían:\n${found.join('\n')}\nMarcalas volatile o quitá el bloqueo.`);
  console.log('PASS no read-only function, SELECT policy or view locks or writes');

  // The check must fail on the real incident that 202610300003 fixed, not just pass on a clean database.
  await db.exec('alter function public.retail_location_stock_summary(uuid) stable');
  assert.ok((await violations()).some(line => line.startsWith('public.retail_location_stock_summary:') && line.includes('require_permission')));
  await db.exec('alter function public.retail_location_stock_summary(uuid) volatile');
  console.log('PASS detects the transfers map incident through a called function');

  await db.exec(`create function public.retail_probe_lock() returns void language plpgsql stable as $$ begin perform 1 from public.retail_stores for share; end $$;`);
  assert.ok((await violations()).some(line => line.startsWith('public.retail_probe_lock:')));
  await db.exec('drop function public.retail_probe_lock()');
  console.log('PASS detects a direct lock');

  await db.exec(`create function public.retail_probe_note() returns text language plpgsql stable as $$ begin return 'for share'; end $$;`);
  assert.ok(!(await violations()).some(line => line.startsWith('public.retail_probe_note:')));
  await db.exec('drop function public.retail_probe_note()');
  console.log('PASS ignores the same words inside text');
} finally { await db.close(); }
