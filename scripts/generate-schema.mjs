// Local SQL packaging only: no database connection, dependencies, build or tests.
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const directory = new URL('../supabase/migrations/', import.meta.url);
// User confirmed on 2026-10-23 that all current migrations were applied manually.
// Keep this FIXED when adding migrations: never infer a new baseline from the last file.
const confirmedManualBaseline = '202610230002_ingredients_and_composition_costs.sql';
// Installer preflight only. Historical migration sources/checksums stay unchanged.
const requiredPriceTreeFunctions = [
  'public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)',
  'public.retail_save_price_override(uuid,uuid,uuid,numeric)',
  'retail_private.product_list_price(public.retail_products,uuid,integer)',
];
function prerequisites(name) {
  if (name === '202610270005_supplier_invoice_formats.sql') return `  if to_regclass('public.retail_supplier_invoice_formats') is not null then
   raise exception 'La tabla de formatos ya existe, pero 202610270005_supplier_invoice_formats.sql no figura en el historial'
    using errcode='55000', hint='No borrar la tabla ni marcar el paso a mano. Ver SUPABASE_SETUP.md: ejecutar primero los paquetes anteriores hasta 202610270004 y luego maintenance/adopt_supplier_invoice_formats.sql completo. Solo concilia si estructura, funciones y permisos coinciden; conserva los formatos.';
  end if;
`;
  if (name === '202610240001_shift_closing_details.sql') return `  if exists(select 1 from pg_catalog.pg_attribute
   where attrelid=to_regclass('public.retail_shifts') and attname in ('closing_denominations','ticket_count') and attnum>0 and not attisdropped) then
   raise exception 'Hay columnas del cierre instaladas, pero la migración 202610240001_shift_closing_details.sql no figura en el historial'
    using errcode='55000', hint='Detener y ejecutar supabase/maintenance/check_manual_schema_history.sql (solo lectura). Conciliar qué migraciones se aplicaron manualmente; una columna no prueba una migración completa. No borrar columnas, no omitir el paso y no ampliar el baseline automáticamente.';
  end if;
`;
  if (name !== '202610260005_delete_price_lists.sql') return '';
  return requiredPriceTreeFunctions.map(signature => `  if to_regprocedure('${signature}') is null then
   raise exception 'Falta una función del árbol de listas: %', '${signature}'
    using errcode='55000', hint='La eliminación requiere 202610260004_price_list_tree.sql. Aplicá primero el paquete 004 de supabase/updates/ o usá schema.sql completo. Si el historial ya declara instalada esa migración, revisar la instalación con el diagnóstico de solo lectura; no borrar historial ni ampliar el baseline.';
  end if;
`).join('');
}
function failureContext(name) {
  if (name !== '202610260004_price_list_tree.sql') return '';
  return `exception when raise_exception then
 if sqlerrm<>'La definición de checkout no coincide con la versión esperada. No se aplicaron cambios; revisar instalación' then raise; end if;
 raise exception using errcode=sqlstate,message=sqlerrm,
  detail='Huella del cuerpo checkout (LF): '||coalesce((select md5(replace(prosrc,chr(13),'')) from pg_catalog.pg_proc
   where oid=to_regprocedure('public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb)')),'función ausente'),
  hint='El SQL de instalación ya normaliza CRLF. Si persiste, ejecutar supabase/maintenance/check_manual_schema_history.sql y compartir el resultado y esta huella. No quitar la validación ni reemplazar checkout a ciegas.';
`;
}
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
  if (source.includes('$retail_install$')) throw new Error(`${name}: delimitador del instalador en conflicto; revisar sin alterar la migración.`);
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
-- Cada cuerpo se ejecuta con LF, incluso si el editor/portapapeles introduce CRLF.
-- Un único DO contiene manifiesto, comprobaciones y pasos: no usa tablas temporales.
-- No incluye maintenance/, tests/, ni push-schedule.sql (requiere Vault y despliegue).
-- Este archivo no fue ejecutado contra Supabase durante su preparación.
do $retail_install$
declare
 manifest jsonb := $retail_schema_manifest_json$
${JSON.stringify(migrations.map(migration => ({ ordinal: migration.order, filename: migration.name, sha256: migration.checksum })), null, 1)}
$retail_schema_manifest_json$::jsonb;
 baseline text; boundary integer; conflict text;
 existing_installation boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 perform set_config('retail.schema_baseline', '${confirmedManualBaseline}', true);
 baseline:=current_setting('retail.schema_baseline');
 create schema if not exists retail_private;
 create table if not exists retail_private.schema_migrations (
  filename text primary key,
  sha256 text not null check(length(sha256)=64),
  origin text not null check(origin in ('schema','adopted')),
  registered_at timestamptz not null default now()
 );
 revoke all on retail_private.schema_migrations from public,anon,authenticated;

 if baseline<>'' then
  select ordinal into boundary from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) where filename=baseline;
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
    select filename,sha256,'adopted' from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) where ordinal<=boundary;
   raise notice 'Adoptadas % migraciones hasta %. Esta fecha registra la adopción, no su ejecución original',boundary,baseline;
  end if;
 elsif baseline<>'' and exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) where m.ordinal<=boundary
  and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)) then
  raise exception 'La base ya tiene historial. No se permite ampliar baseline para saltar migraciones pendientes';
 end if;
 select h.filename into conflict from retail_private.schema_migrations h
  left join jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) on m.filename=h.filename
  where m.filename is null or m.sha256<>h.sha256 limit 1;
 if conflict is not null then
  raise exception 'El historial no coincide con este schema: %. No se aplicó ningún cambio. No editar migraciones registradas; preparar una nueva o usar la versión correcta del repositorio',conflict;
 end if;
 if exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) join retail_private.schema_migrations h using(filename)
  where exists(select 1 from jsonb_to_recordset(manifest) previous(ordinal integer,filename text,sha256 text) where previous.ordinal<m.ordinal
   and not exists(select 1 from retail_private.schema_migrations applied where applied.filename=previous.filename))) then
  raise exception 'El historial tiene huecos. Revisalo antes de aplicar migraciones posteriores';
 end if;
${migrations.map(migration => `-- ${migration.order}/${migrations.length}: ${migration.name}
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='${migration.name}') then
  raise notice 'Aplicando ${migration.name}';
${prerequisites(migration.name)}  execute replace($${migration.tag}$
${migration.body}
$${migration.tag}$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('${migration.name}','${migration.checksum}','schema');
 end if;
${failureContext(migration.name)}end;
`).join('\n')}

 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
-- Solo metadatos de instalación; no expone datos del comercio ni secretos.
select filename,origin,registered_at from retail_private.schema_migrations order by filename;
`;
const target = new URL('../supabase/schema.sql', import.meta.url);
await writeFile(target, sql, 'utf8');
console.log(`${fileURLToPath(target)}: ${migrations.length} migraciones consolidadas; sin conexiones a base de datos.`);

// Optional small packages for the diagnosed installation already reconciled
// through 202610260003. No baseline adoption and no historical source edits.
if (process.argv.includes('--individual-updates')) {
  const boundary = migrations.findIndex(migration => migration.name === '202610260003_billing_fields.sql');
  if (boundary !== 33) throw new Error('Cambió el prefijo de 34 migraciones. Revisar la instalación antes de generar actualizaciones individuales.');
  const updatesDirectory = new URL('../supabase/updates/', import.meta.url);
  await mkdir(updatesDirectory, { recursive: true });
  const manifest = JSON.stringify(migrations.map(migration => ({ ordinal: migration.order, filename: migration.name, sha256: migration.checksum })), null, 1);
  for (const migration of migrations.slice(boundary + 1)) {
    const update = `-- AdministradorKiosco: actualización individual ${migration.order}/${migrations.length}.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/${migration.name}; SHA-256 ${migration.checksum}.
-- Requiere historial conciliado y TODAS las migraciones anteriores registradas.
-- Ejecutar este archivo COMPLETO en el proyecto correcto, de a uno y en orden.
-- Un DO atómico: sin tablas temporales; registra solo si termina correctamente.
-- Si ya está registrado con el mismo checksum, no repite el cuerpo SQL.
-- No fue ejecutado remotamente durante su preparación.
do $retail_install$
declare
 manifest jsonb := $retail_schema_manifest_json$
${manifest}
$retail_schema_manifest_json$::jsonb;
 conflict text; missing text;
begin
 perform set_config('lock_timeout','10s',true);
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 if to_regclass('retail_private.schema_migrations') is null then
  raise exception 'Falta el historial de instalación. No se aplicó ${migration.name}'
   using errcode='55000',hint='Revisar SUPABASE_SETUP.md y el diagnóstico de solo lectura. Este archivo no adopta migraciones ni reemplaza una conciliación pendiente.';
 end if;
 select h.filename into conflict from retail_private.schema_migrations h
  left join jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text) using(filename)
  where m.filename is null or m.sha256<>h.sha256 limit 1;
 if conflict is not null then
  raise exception 'Historial distinto al paquete: %. No se modificó. Revisar versión del repositorio y diagnóstico',conflict;
 end if;
 if exists(select 1 from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  join retail_private.schema_migrations h using(filename)
  where exists(select 1 from jsonb_to_recordset(manifest) previous(ordinal integer,filename text,sha256 text)
   where previous.ordinal<m.ordinal and not exists(select 1 from retail_private.schema_migrations applied where applied.filename=previous.filename))) then
  raise exception 'El historial tiene huecos. No se modificó: revisar diagnóstico antes de continuar';
 end if;
 if exists(select 1 from retail_private.schema_migrations where filename='${migration.name}') then
  raise notice '${migration.name} ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<${migration.order} and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó ${migration.name}',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
  raise notice 'Aplicando ${migration.name}';
${prerequisites(migration.name)}  execute replace($${migration.tag}$
${migration.body}
$${migration.tag}$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('${migration.name}','${migration.checksum}','schema');
 ${failureContext(migration.name)}end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
`;
    await writeFile(new URL(migration.name, updatesDirectory), update, 'utf8');
  }
  console.log(`${fileURLToPath(updatesDirectory)}: ${migrations.length - boundary - 1} actualizaciones individuales; sin conexiones a base de datos.`);
}

// Explicit, installation-specific recovery packaging. NEVER advances the baseline,
// runs SQL, or adopts later migrations from their presence. See SUPABASE_SETUP.md.
if (process.argv.includes('--manual-history-recovery-20261027')) {
  const recoveryBoundary = '202610260003_billing_fields.sql';
  const pinned = migrations.filter(migration => migration.name <= recoveryBoundary);
  if (pinned.length !== 34 || pinned.at(-1)?.name !== recoveryBoundary) {
    throw new Error('El prefijo de recuperación cambió. Revisar el diagnóstico; no ampliar la adopción automáticamente.');
  }
  const recoveryTarget = new URL('../supabase/maintenance/adopt_manual_history_20261027.sql', import.meta.url);
  const source = await readFile(recoveryTarget, 'utf8');
  const marker = /-- BEGIN PINNED MANIFEST:[^\r\n]*\r?\n[\s\S]*?-- END PINNED MANIFEST/;
  if (!marker.test(source)) throw new Error('Faltan los delimitadores del manifiesto de recuperación.');
  const manifest = `-- BEGIN PINNED MANIFEST: generated only with the explicit recovery flag.
 manifest jsonb := $retail_manual_manifest$
${JSON.stringify(pinned.map(migration => ({ ordinal: migration.order, filename: migration.name, sha256: migration.checksum })), null, 1)}
$retail_manual_manifest$::jsonb;
-- END PINNED MANIFEST`;
  await writeFile(recoveryTarget, source.replace(marker, () => manifest), 'utf8');
  console.log(`${fileURLToPath(recoveryTarget)}: manifiesto fijo de 34 migraciones; solo empaquetado, sin aplicar SQL.`);
}

// Explicit recovery for one manually installed migration, never the baseline.
// Source-derived metadata is packaged locally; no SQL is run here.
if (process.argv.includes('--supplier-format-recovery')) {
  const migration = migrations.find(item => item.name === '202610270005_supplier_invoice_formats.sql');
  if (!migration || migration.order !== 42) throw new Error('Cambió la frontera de formatos. Revisar la recuperación antes de generar.');
  const functionSpecs = [
    { name: 'retail_save_supplier_invoice_format', signature: 'public.retail_save_supplier_invoice_format(uuid,text,jsonb,integer,boolean)', arg_names: ['p_store', 'p_supplier', 'p_format', 'p_samples', 'p_local_read'], defaults: 1, returns_table: true },
    { name: 'retail_delete_supplier_invoice_format', signature: 'public.retail_delete_supplier_invoice_format(uuid,text)', arg_names: ['p_store', 'p_supplier'], defaults: 0, returns_table: false },
  ];
  const expectedFunctions = functionSpecs.map(({ name, ...spec }) => {
    const match = migration.body.match(new RegExp(`create function public\\.${name}\\([\\s\\S]*?as \\$\\$([\\s\\S]*?)\\$\\$;`, 'i'));
    if (!match) throw new Error(`No se pudo obtener el cuerpo de ${name}. No se generó su recuperación.`);
    return { ...spec, body_hash: createHash('md5').update(match[1]).digest('hex') };
  });
  const table = migration.body.match(/create table public\.retail_supplier_invoice_formats \([\s\S]*?\n\);/i)?.[0];
  if (!table || !table.includes('references public.retail_stores(id)')) throw new Error('Cambió la tabla de formatos. Revisar la comparación de estructura.');
  const reference = table.replace('create table public.retail_supplier_invoice_formats', 'create temporary table retail_expected_invoice_format')
    .replace('references public.retail_stores(id)', '').replace(/\);$/, ') on commit drop;');
  const recoveryTarget = new URL('../supabase/maintenance/adopt_supplier_invoice_formats.sql', import.meta.url);
  const source = await readFile(recoveryTarget, 'utf8');
  const marker = /-- BEGIN FORMAT RECOVERY METADATA:[^\r\n]*\r?\n[\s\S]*?-- END FORMAT RECOVERY METADATA/;
  if (!marker.test(source)) throw new Error('Faltan los delimitadores de la recuperación de formatos.');
  const metadata = `-- BEGIN FORMAT RECOVERY METADATA: generated with --supplier-format-recovery.
 manifest jsonb := $format_manifest$
${JSON.stringify(migrations.map(item => ({ ordinal: item.order, filename: item.name, sha256: item.checksum })), null, 1)}
$format_manifest$::jsonb;
 expected_functions jsonb := $format_functions$
${JSON.stringify(expectedFunctions, null, 1)}
$format_functions$::jsonb;
 expected_table_sql text := $format_reference$
${reference}
$format_reference$;
-- END FORMAT RECOVERY METADATA`;
  await writeFile(recoveryTarget, source.replace(marker, () => metadata), 'utf8');
  console.log(`${fileURLToPath(recoveryTarget)}: recuperación exclusiva de 202610270005; sin aplicar SQL ni ampliar baseline.`);
}
