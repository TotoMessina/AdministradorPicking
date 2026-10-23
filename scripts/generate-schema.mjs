// Local SQL packaging only: no database connection, dependencies, build or tests.
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('../supabase/migrations/', import.meta.url);
// User confirmed on 2026-10-23 that all current migrations were applied manually.
// Keep this FIXED when adding migrations: never infer a new baseline from the last file.
const confirmedManualBaseline = '202610230002_ingredients_and_composition_costs.sql';
const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
const invalid = names.find(name => !/^\d{12,14}_[a-z0-9_]+\.sql$/.test(name));
if (invalid) throw new Error(`Nombre de migración no admitido: ${invalid}. No se omitió silenciosamente del schema.`);
if (!names.length) throw new Error('No hay migraciones para consolidar.');
if (!names.includes(confirmedManualBaseline)) throw new Error('Falta la migración del baseline confirmado. Revisar el historial antes de generar schema.');
const migrations = await Promise.all(names.map(async (name, index) => {
  const source = (await readFile(new URL(name, directory), 'utf8')).replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  // Only remove the outer transaction. Dollar-quoted function/DO bodies remain intact.
  const wrapped = source.match(/^(?:\s|--[^\n]*(?:\n|$))*begin;\s*\n([\s\S]*)\ncommit;\s*$/i);
  if (!wrapped) throw new Error(`${name}: se esperaba una transacción BEGIN/COMMIT exterior; revisar sin transformar SQL a ciegas.`);
  const checksum = createHash('sha256').update(source).digest('hex');
  const body = wrapped[1];
  const tag = `retail_source_${checksum.slice(0, 16)}`;
  if (source.includes(`$${tag}$`)) throw new Error(`${name}: delimitador SQL en conflicto.`);
  return { name, checksum, body, tag, order: index + 1 };
}));

const sql = `-- AdministradorKiosco: schema consolidado generado desde migrations/.
-- Regenerar: node scripts/generate-schema.mjs. NO editar los bloques generados.
-- Ejecutar completo en el SQL Editor del proyecto correcto; no desde el frontend.
-- Base nueva: instala todo. Base manual previa SIN historial: baseline declara
-- que TODAS las migraciones hasta ese nombre ya fueron aplicadas por el responsable.
-- El usuario confirmó todas las actuales el 2026-10-23. Baseline FIJO, no avanza
-- al agregar archivos. Para otro entorno, revisar o vaciar antes de ejecutar.
-- Una base existente sin historial ni baseline se rechaza ANTES de aplicar cambios.
-- Reejecuciones omiten migraciones registradas y verifican su SHA-256.
-- No incluye maintenance/, tests/, ni push-schedule.sql (requiere Vault y despliegue).
-- Este archivo no fue ejecutado contra Supabase durante su preparación.
begin;
select pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
select set_config('retail.schema_baseline', '${confirmedManualBaseline}', true);

create schema if not exists retail_private;
create table if not exists retail_private.schema_migrations (
 filename text primary key,
 sha256 text not null check(length(sha256)=64),
 origin text not null check(origin in ('schema','adopted')),
 registered_at timestamptz not null default now()
);
revoke all on retail_private.schema_migrations from public,anon,authenticated;
create temporary table retail_schema_manifest (
 ordinal integer primary key, filename text unique not null, sha256 text not null
) on commit drop;
insert into retail_schema_manifest(ordinal,filename,sha256) values
${migrations.map(migration => ` (${migration.order},'${migration.name}','${migration.checksum}')`).join(',\n')};

do $retail_bootstrap$
declare baseline text:=current_setting('retail.schema_baseline'); boundary integer; conflict text;
 existing_installation boolean;
begin
 if baseline<>'' then
  select ordinal into boundary from retail_schema_manifest where filename=baseline;
  if boundary is null then raise exception 'Baseline desconocido: %. Usá el nombre completo de una migración del manifiesto',baseline; end if;
 end if;
 select exists(select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and left(c.relname,7)='retail_')
  or exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and left(p.proname,7)='retail_') into existing_installation;
 if not exists(select 1 from retail_private.schema_migrations) then
  if existing_installation then
   if baseline='' then
    raise exception 'La base ya contiene objetos retail pero no tiene historial de schema. No se modificó la instalación. Consultá SUPABASE_SETUP.md y confirmá la última migración completa antes de indicar baseline';
   end if;
   if exists(select 1 from unnest(array['retail_stores','retail_members','retail_categories','retail_registers','retail_products','retail_shifts','retail_sales','retail_movements','retail_invitations']) t(name)
    where to_regclass('public.'||t.name) is null) then
    raise exception 'La instalación base está incompleta. No se puede adoptar por baseline; revisar el inventario sin borrar tablas';
   end if;
   -- Explicit operator declaration, NOT an inference from columns or row counts.
   insert into retail_private.schema_migrations(filename,sha256,origin)
    select filename,sha256,'adopted' from retail_schema_manifest where ordinal<=boundary;
   raise notice 'Adoptadas % migraciones hasta %. Esta fecha registra la adopción, no su ejecución original',boundary,baseline;
  end if;
 elsif baseline<>'' and exists(select 1 from retail_schema_manifest m where m.ordinal<=boundary
  and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)) then
  raise exception 'La base ya tiene historial. No se permite ampliar baseline para saltar migraciones pendientes';
 end if;
 select h.filename into conflict from retail_private.schema_migrations h
  left join retail_schema_manifest m on m.filename=h.filename
  where m.filename is null or m.sha256<>h.sha256 limit 1;
 if conflict is not null then
  raise exception 'El historial no coincide con este schema: %. No se aplicó ningún cambio. No editar migraciones registradas; preparar una nueva o usar la versión correcta del repositorio',conflict;
 end if;
 if exists(select 1 from retail_schema_manifest m join retail_private.schema_migrations h using(filename)
  where exists(select 1 from retail_schema_manifest previous where previous.ordinal<m.ordinal
   and not exists(select 1 from retail_private.schema_migrations applied where applied.filename=previous.filename))) then
  raise exception 'El historial tiene huecos. Revisalo antes de aplicar migraciones posteriores';
 end if;
end $retail_bootstrap$;

${migrations.map(migration => `-- ${migration.order}/${migrations.length}: ${migration.name}
do $retail_step_${migration.order}$
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='${migration.name}') then
  raise notice 'Aplicando ${migration.name}';
  execute $${migration.tag}$
${migration.body}
$${migration.tag}$;
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('${migration.name}','${migration.checksum}','schema');
 end if;
end $retail_step_${migration.order}$;`).join('\n\n')}

notify pgrst,'reload schema';
commit;
-- Solo metadatos de instalación; no expone datos del comercio ni secretos.
select filename,origin,registered_at from retail_private.schema_migrations order by filename;
`;
const target = new URL('../supabase/schema.sql', import.meta.url);
await writeFile(target, sql, 'utf8');
console.log(`${fileURLToPath(target)}: ${migrations.length} migraciones consolidadas; sin conexiones a base de datos.`);
