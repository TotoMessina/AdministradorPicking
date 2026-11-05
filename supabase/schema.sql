-- AdministradorKiosco: schema consolidado generado desde migrations/.
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
[
 {
  "ordinal": 1,
  "filename": "202610010001_retail_multistore.sql",
  "sha256": "f24b734005cc1623cbeb235dd0436522445fce6501ec73999528a8f745ed1cb9"
 },
 {
  "ordinal": 2,
  "filename": "202610020001_catalog_global_and_segmentation.sql",
  "sha256": "bca9c54fa75c2a8940b4f28c76aaab415b1740330c2a4a334dad2fef5beca292"
 },
 {
  "ordinal": 3,
  "filename": "202610070001_harden_global_catalog_immutability.sql",
  "sha256": "f3ff59ec39b6e5744cb059f242cfdaf0c234f1ab34c4bae2ec93ca10f13594f5"
 },
 {
  "ordinal": 4,
  "filename": "202610130001_branches_prices_ledgers.sql",
  "sha256": "e86fe143f886cd858443bde5917d43095126a4beca788c866f2589bcee94509b"
 },
 {
  "ordinal": 5,
  "filename": "202610140001_web_push.sql",
  "sha256": "918efe9a5d3313e3dc695430c93c0c035acdf97f9b20fcc4c387b444a8737964"
 },
 {
  "ordinal": 6,
  "filename": "202610150001_cashier_access.sql",
  "sha256": "a30006ceabfa2ca5abd0116ddf06f3f79d042bae913fd59c25efb5a918a83017"
 },
 {
  "ordinal": 7,
  "filename": "202610160001_offline_pos.sql",
  "sha256": "770c916876fcdabf64104718e442e7b424f343e6787bfc742c4164cccf435313"
 },
 {
  "ordinal": 8,
  "filename": "202610160002_offline_queue.sql",
  "sha256": "ffb2f924480094f8255c3bd1105ac834381678058bb65ff6e63ec433b4710ab0"
 },
 {
  "ordinal": 9,
  "filename": "202610160003_pack_size.sql",
  "sha256": "e8f486a53e3699543bb33b819986d3e96c57bbfb112cb039428e534507228c6b"
 },
 {
  "ordinal": 10,
  "filename": "202610160004_margin_groups.sql",
  "sha256": "8a5790ed3a1371e6c0aa57f46b68b2fe0af74efd79a3650cfa7ced54b876cc86"
 },
 {
  "ordinal": 11,
  "filename": "202610160005_branch_price_rules.sql",
  "sha256": "7899d29739b25999d24e879b18ed53f8794628fe852743c7916b46d4db5b16e1"
 },
 {
  "ordinal": 12,
  "filename": "202610190001_justified_withdrawal.sql",
  "sha256": "029b5843eacab94f78439fd8f13da846c46e7729f376e1f314286e1f20a14fa9"
 },
 {
  "ordinal": 13,
  "filename": "202610190001_store_onboarding.sql",
  "sha256": "e5b8362448949bceec6db8607ab80a30285230317f319875eb6d9a2f1d47f09c"
 },
 {
  "ordinal": 14,
  "filename": "202610190002_pending_replenishments.sql",
  "sha256": "3ddd179e5609126a264e696cd293909008bf4dd1acc06a8bb409c248ba5ab707"
 },
 {
  "ordinal": 15,
  "filename": "202610190003_stock_transfers.sql",
  "sha256": "cab05c3785465fba81273dddaad52130c14a8c6c42fb63ed53f476416d53a4be"
 },
 {
  "ordinal": 16,
  "filename": "202610200001_supplier_mappings.sql",
  "sha256": "d4841853f82adbd4e881feb1bdf3f525d76a12121e152b54257f8eaf9a81611c"
 },
 {
  "ordinal": 17,
  "filename": "202610200002_supplier_alias_usage.sql",
  "sha256": "1adc3ce4519abbb20c3436578bff8de5d9111f08abda7e198639468bd77e15c4"
 },
 {
  "ordinal": 18,
  "filename": "202610200003_product_expiry.sql",
  "sha256": "77d1f8c0f62da28481839205c638d09ab8586267acd2b86fb97f44c812072a87"
 },
 {
  "ordinal": 19,
  "filename": "202610210001_ledger_routing.sql",
  "sha256": "f19dc026535013c80519da077ca4de832b6706cf7e885ffbc1b0e31185591d7e"
 },
 {
  "ordinal": 20,
  "filename": "202610210002_staff_profiles.sql",
  "sha256": "ca6e73c2c8993bc2390e2f91d48e9a0d82e60e3ae1be9613297f6ba667809a0e"
 },
 {
  "ordinal": 21,
  "filename": "202610210003_ledger_lock_order.sql",
  "sha256": "b9f318a08145ad1e1734c2afe5fc1ff04402666a69869aa0f27c4dee2abb5124"
 },
 {
  "ordinal": 22,
  "filename": "202610210004_delegated_catalog_actions.sql",
  "sha256": "bcfa6664c406dd0074ba93d0bbb367c1c212c5e9285e703583616519f163628e"
 },
 {
  "ordinal": 23,
  "filename": "202610220001_product_compositions.sql",
  "sha256": "ef088735e7a849006d0960d0e16decd98e257bb432da68ebd2e0d02618f93c84"
 },
 {
  "ordinal": 24,
  "filename": "202610220002_loose_cigarettes.sql",
  "sha256": "e943d579b3d7ed4e77e96ffc6c26125f7ccb84ca09dcb9a09a7dde87ed147bad"
 },
 {
  "ordinal": 25,
  "filename": "202610220003_product_deletion_history.sql",
  "sha256": "458a93d670539dd4bfd36c3f8b4aff69042989aafdea80511ced58e6d5a3f9b7"
 },
 {
  "ordinal": 26,
  "filename": "202610220004_standard_categories.sql",
  "sha256": "85e889e22c9dcc559736c4af21b9cf7bc0205cbd1ff940ed00ff9d38f481fd13"
 },
 {
  "ordinal": 27,
  "filename": "202610220005_category_labels.sql",
  "sha256": "e975aa6c462d6ee5492edbb36b1ed523a410c634658f8ad36fd24fe18a218f99"
 },
 {
  "ordinal": 28,
  "filename": "202610220006_complete_permission_profiles.sql",
  "sha256": "913347ffd59472a588b214ee3da8ec426cb47fe143db19889896279a221636d5"
 },
 {
  "ordinal": 29,
  "filename": "202610230001_automatic_margin_groups.sql",
  "sha256": "6cd429e7679685c41c4adb245d3ec97ec07eeb202ca421e9640e9a80f49050c2"
 },
 {
  "ordinal": 30,
  "filename": "202610230002_ingredients_and_composition_costs.sql",
  "sha256": "86fd19952b8e65341957126f53ec64e327dd8f4ed3de54b2d9a3b9a9e3baaffb"
 },
 {
  "ordinal": 31,
  "filename": "202610240001_shift_closing_details.sql",
  "sha256": "d3204ba0e41d297710ff1e4a05ea5048c703dbe07b9b266b66a6c7aa7a859759"
 },
 {
  "ordinal": 32,
  "filename": "202610260001_optional_depot.sql",
  "sha256": "f221d19fcff7ac881cdbeefc3d3546e625c464872038afb8b69d5491e90b1f5a"
 },
 {
  "ordinal": 33,
  "filename": "202610260002_create_composite_product.sql",
  "sha256": "2e23fbafc73e0b697b607cae3b0587c9a709f13e4882b3a8ce244530eabb60a4"
 },
 {
  "ordinal": 34,
  "filename": "202610260003_billing_fields.sql",
  "sha256": "2a42b0a16de6707616bf9ca85fc249a83f55ee6b5976299b51197573391e6cd3"
 },
 {
  "ordinal": 35,
  "filename": "202610260004_price_list_tree.sql",
  "sha256": "bb77060967eec30f15a7befb20989890ac312c90f76e002656fa6dfada36bf36"
 },
 {
  "ordinal": 36,
  "filename": "202610260005_delete_price_lists.sql",
  "sha256": "540fb2b7146a1f68e89f462f43305d58798953d156be4e62e6944f0edccd2a69"
 },
 {
  "ordinal": 37,
  "filename": "202610260006_billing_update_robustness.sql",
  "sha256": "97469041ab94b975ce569c26fb60b2aba78d9f8a94c4c13a5567c47f14c576f2"
 },
 {
  "ordinal": 38,
  "filename": "202610270001_store_billing_credentials.sql",
  "sha256": "5c5d202e9b94464428e5417696fbc782491a023ad726f772b5693436ba16b9cb"
 },
 {
  "ordinal": 39,
  "filename": "202610270002_primary_product_markup.sql",
  "sha256": "d9e8f398d415af14d4bc1235f3d2023f755cc62ad7879aa3b257794f756e6a02"
 },
 {
  "ordinal": 40,
  "filename": "202610270003_suppliers.sql",
  "sha256": "9f007483d72681a7d849f29714756c7fbfb83e6146d35d4ba80d9fbd78518f05"
 },
 {
  "ordinal": 41,
  "filename": "202610270004_cost_price_lists.sql",
  "sha256": "abe5683734a54251ad3e49ee9235ee1b9a9607081b9a6b04927e902cdfe56d0b"
 },
 {
  "ordinal": 42,
  "filename": "202610270005_supplier_invoice_formats.sql",
  "sha256": "62535c0e844930c8af0840aa80c582f265c0a8919b8cdabb4f83cb7cf0a41509"
 },
 {
  "ordinal": 43,
  "filename": "202610280001_supplier_alias_usage_repair.sql",
  "sha256": "e6eee2d43a1a62cc232ada97415baa8b591f83572848c8877f26444b82db583a"
 },
 {
  "ordinal": 44,
  "filename": "202610280002_location_funds.sql",
  "sha256": "f22cae1d60cb383ca0f76216dc20e303370a2018266199f8650aa7beb77f8ada"
 },
 {
  "ordinal": 45,
  "filename": "202610280003_location_inventory.sql",
  "sha256": "baa181aa8cc76f1bc973e914a77fe568f3f30228979d682a67ac3571ce3cc14d"
 },
 {
  "ordinal": 46,
  "filename": "202610280004_permanent_product_deletion.sql",
  "sha256": "c066941e7a7c08d3b00196d0eecce2b777cdddf4b805bab1197644a71e269368"
 },
 {
  "ordinal": 47,
  "filename": "202610290001_branch_location_and_deletion.sql",
  "sha256": "bd6a4e4c41f9646352bbb167137c5c9519d6cfbcf51d9143fff9ccb4136f5b75"
 },
 {
  "ordinal": 48,
  "filename": "202610290002_supplier_fiscal_profile.sql",
  "sha256": "51d60abcf980e182bc3975f9a90aadc68b180e1bde3e3db7b27c08f423162151"
 },
 {
  "ordinal": 49,
  "filename": "202610290003_purchase_invoices.sql",
  "sha256": "8a5afba23235cad78e07da7f4f364fccd51925225b721d3ad11456581bd926d8"
 },
 {
  "ordinal": 50,
  "filename": "202610290004_landed_costs.sql",
  "sha256": "12d7490f65c8eac5fa8e63ebfcbb081c62e1f1204a92fe6d7ed4771ad35efa16"
 },
 {
  "ordinal": 51,
  "filename": "202610290005_conflict_errors_without_retry.sql",
  "sha256": "ed34b128cffadb2189e4053ebaa3b983d2728c24f925eeebbfe6e59477453313"
 },
 {
  "ordinal": 52,
  "filename": "202610290006_supplier_contact_profile.sql",
  "sha256": "7c244212c97c982da6e0d2eb64ca2c64c50c1dd512c0f946338584a5a6fc497b"
 },
 {
  "ordinal": 53,
  "filename": "202610290007_purchase_invoice_tracking.sql",
  "sha256": "551f2d827fa2913e32d6fc01d3cbe19fe706f656d91eec0bbd074e8328a5261b"
 },
 {
  "ordinal": 54,
  "filename": "202610300001_supplier_payments.sql",
  "sha256": "1d44ea08176b5b5b2181d65d6019edd40be772aa25c14ae45b89866bde76cd8d"
 },
 {
  "ordinal": 55,
  "filename": "202610300002_payment_apply_same_invoice.sql",
  "sha256": "e0eb93640914e083ee8007a53a7f179287307aa44ecbc399e31eadad02305c5e"
 },
 {
  "ordinal": 56,
  "filename": "202610300003_branch_inventory_by_default.sql",
  "sha256": "85ae0991e1effe24807a0e8ac019e411696d7a8734c844218b4f5d67e09b31e8"
 },
 {
  "ordinal": 57,
  "filename": "202610300004_branch_inventory_always.sql",
  "sha256": "6aa129a6af964b60ffd90bafa3e6c9fa84e829600f8aaf5f398474ee1a50cc25"
 },
 {
  "ordinal": 58,
  "filename": "202610300005_shift_cash_into_branch_funds.sql",
  "sha256": "8b55ed736684a540c2625f954ea8800b79de3cd0669baadfecab91adfe138a7f"
 },
 {
  "ordinal": 59,
  "filename": "202610300006_editable_role_permissions.sql",
  "sha256": "f9353e99737cb1fa425d48bd5f2bde52f68be8dd243a828bdd278bf30f37846e"
 },
 {
  "ordinal": 60,
  "filename": "202610300007_expenses_and_month_result.sql",
  "sha256": "1cc8488904046c20951344260a91f485dc36962c059ed972063a91a0ce0e8a5d"
 },
 {
  "ordinal": 61,
  "filename": "202611020001_sale_returns.sql",
  "sha256": "160c3ea5ca68498ff127b1cd7d93a88090b36af3809b1a59c507ad9233e6f321"
 },
 {
  "ordinal": 62,
  "filename": "202611020002_stock_counts.sql",
  "sha256": "9daed2281b904f3b615feaa1219e2aefa68e12f2789ed8b359569634b9780932"
 },
 {
  "ordinal": 63,
  "filename": "202611020003_stock_count_sections.sql",
  "sha256": "9f3258490d566b004171326307b86f84a0b9a75ed73640157dbdb86ef5d2a513"
 },
 {
  "ordinal": 64,
  "filename": "202611020004_customer_accounts.sql",
  "sha256": "d1eade0c0e42edbd036e264de72c50ea6c9141c90d8a4841a9e1a56c90c0c21d"
 },
 {
  "ordinal": 65,
  "filename": "202611020005_customer_billing_and_credit.sql",
  "sha256": "d88f8756a740b886117b430cc3360986acce8c8a31f567eb20124b2ed36922df"
 },
 {
  "ordinal": 66,
  "filename": "202611020006_partial_credit.sql",
  "sha256": "c4cbb30b0390a79134633987f21ccdb9dd006a2f5e025d0ba55ce7a73d3a75b2"
 },
 {
  "ordinal": 67,
  "filename": "202611020007_purchase_orders.sql",
  "sha256": "9ee57671d2b9262c609e179b1b35faf8b25deef0d6695a0d0db22d293b06df2d"
 },
 {
  "ordinal": 68,
  "filename": "202611020008_branch_comparison.sql",
  "sha256": "9cbc6cfea5ad26ab8933c506327dcc66ab3232360d3125e91b64b095b76eaec8"
 },
 {
  "ordinal": 69,
  "filename": "202611020009_activity_log.sql",
  "sha256": "fef5de758a29f033e77ce8e27d8b9656b828dab410707836c2d569fc1fe45c3d"
 },
 {
  "ordinal": 70,
  "filename": "202611030001_funds_in_transit_and_bank.sql",
  "sha256": "fb72479c1dfb3f5f1350f7366a920227d47b9b32abbc47a9abfbd46b575eb197"
 },
 {
  "ordinal": 71,
  "filename": "202611030002_billing_safe_issue.sql",
  "sha256": "be0145bb9fed66746e073600d2af96db0354aae1e99196c397701e715cbe594f"
 },
 {
  "ordinal": 72,
  "filename": "202611030003_billing_receptor_credit_notes.sql",
  "sha256": "11f4d758d7e2d014c69e8f101ee0bd938f3fe4c6784e9b3cb936e37cf34a4395"
 },
 {
  "ordinal": 73,
  "filename": "202611030004_platform_admin_catalog.sql",
  "sha256": "df0715207f6ad9f380bd672af268ac3fa6f756293bda91c0b02effb41eb8ca7a"
 },
 {
  "ordinal": 74,
  "filename": "202611030005_global_catalog_import.sql",
  "sha256": "0cdd60b36af298deb64a950a27d4d63aab268c27eef093e6add5fb3cb303a9de"
 },
 {
  "ordinal": 75,
  "filename": "202611030006_add_products_from_global_catalog.sql",
  "sha256": "9ec08a8532c21cfbb3b06589646916248d74d15840a8d1fef44d4a579436a0ad"
 },
 {
  "ordinal": 76,
  "filename": "202611030007_cost_based_pricing.sql",
  "sha256": "104ebd8f16a2fcde040330f72d208b53386c07ff2f6c0a3cf387ed04272fe4bd"
 },
 {
  "ordinal": 77,
  "filename": "202611030008_bulk_markup_adjust.sql",
  "sha256": "68a2967522d593e16d155d2d1202fa7ce55aa0d4c33dd2f4724a5c1f06c67044"
 },
 {
  "ordinal": 78,
  "filename": "202611040001_product_price_history.sql",
  "sha256": "6e782e7b1aa273f8dbe3e245113a00722ce21c988b5a58d1a040f9100f287006"
 },
 {
  "ordinal": 79,
  "filename": "202611040002_price_index_by_group.sql",
  "sha256": "b22129d025e8d2a95256934157e503dcaa65157223b1359485363655ef8d69d3"
 },
 {
  "ordinal": 80,
  "filename": "202611040003_reconciliation_sales_detail.sql",
  "sha256": "dbc90b884f7104bc36b8f210b271330f43cfb3d5a45da0bca4cb552f1ddc780d"
 },
 {
  "ordinal": 81,
  "filename": "202611040004_reconciliation_totals.sql",
  "sha256": "6a335da16cd916379beb40b7d85504857c32933fc96638d1d0b03dedcde91825"
 },
 {
  "ordinal": 82,
  "filename": "202611040005_product_presentations.sql",
  "sha256": "93ba9b0485f9a37bedcf4c42244ae411649c725e77154762707ab14ba600e6cb"
 },
 {
  "ordinal": 83,
  "filename": "202611040006_money_accounts.sql",
  "sha256": "f45ef0bac37eccb8822a89e20fb0294c0e53ed7258c5e28f9da1602ec941959d"
 },
 {
  "ordinal": 84,
  "filename": "202611040007_money_movements_report.sql",
  "sha256": "df024af737bef5fb33bed1a53b63b816a644b8e96e0305f10845e4bd2cf0e57b"
 }
]
$retail_schema_manifest_json$::jsonb;
 baseline text; boundary integer; conflict text;
 existing_installation boolean;
begin
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 perform set_config('retail.schema_baseline', '202610230002_ingredients_and_composition_costs.sql', true);
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
-- 1/84: 202610010001_retail_multistore.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610010001_retail_multistore.sql') then
  raise notice 'Aplicando 202610010001_retail_multistore.sql';
  execute replace($retail_source_f24b734005cc1623$
create schema if not exists retail_private;
revoke all on schema retail_private from public;
grant usage on schema retail_private to authenticated;

create table public.retail_stores (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 100),
 owner_id uuid not null references auth.users(id), address text not null default '', phone text not null default '',
 receipt_message text not null default '¡Gracias por tu compra!', accent_color text not null default '#5a50df' check(accent_color ~ '^#[0-9a-fA-F]{6}$'),
 currency text not null default 'ARS' check(currency = 'ARS'), created_at timestamptz not null default now()
);
create table public.retail_members (
 store_id uuid not null references public.retail_stores(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','admin','cashier')), primary key(store_id,user_id)
);
create table public.retail_categories (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80), unique(store_id,name), unique(store_id,id)
);
create table public.retail_registers (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80), active boolean not null default true,
 unique(store_id,name), unique(store_id,id)
);
create table public.retail_products (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 category_id uuid not null, code text not null check(length(trim(code)) between 1 and 100),
 name text not null check(length(trim(name)) between 1 and 160), price numeric(14,2) not null check(price > 0),
 cost numeric(14,2) not null default 0 check(cost >= 0), stock integer not null default 0 check(stock >= 0),
 min_stock integer not null default 4 check(min_stock >= 0), emoji text not null default '📦', active boolean not null default true,
 unique(store_id,code), unique(store_id,id), foreign key(store_id,category_id) references public.retail_categories(store_id,id)
);
create table public.retail_shifts (
 id uuid primary key default gen_random_uuid(), store_id uuid not null, register_id uuid not null,
 opened_by uuid not null references auth.users(id), opened_at timestamptz not null default now(),
 opening_cash numeric(14,2) not null check(opening_cash >= 0), closed_at timestamptz, closed_by uuid references auth.users(id),
 counted_cash numeric(14,2) check(counted_cash >= 0), expected_cash numeric(14,2),
 unique(store_id,id), foreign key(store_id,register_id) references public.retail_registers(store_id,id)
);
create unique index retail_one_open_shift on public.retail_shifts(register_id) where closed_at is null;
create table public.retail_sales (
 id uuid primary key, store_id uuid not null, shift_id uuid not null, created_by uuid not null references auth.users(id),
 ticket_number bigint generated always as identity, created_at timestamptz not null default now(),
 payment_method text not null check(payment_method in ('Efectivo','QR','Debito','Credito')),
 total numeric(14,2) not null check(total > 0), amount_paid numeric(14,2) not null, change numeric(14,2) not null check(change >= 0),
 items jsonb not null, unique(store_id,id), foreign key(store_id,shift_id) references public.retail_shifts(store_id,id)
);
create table public.retail_movements (
 id uuid primary key default gen_random_uuid(), store_id uuid not null, shift_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 type text not null check(type in ('INGRESO','RETIRO')), amount numeric(14,2) not null check(amount > 0),
 reason text not null check(length(trim(reason)) between 1 and 300),
 foreign key(store_id,shift_id) references public.retail_shifts(store_id,id)
);
create table public.retail_invitations (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 email text not null check(email = lower(trim(email))), role text not null check(role in ('admin','cashier')),
 created_at timestamptz not null default now(), unique(store_id,email)
);
create index on public.retail_members(user_id);
create index on public.retail_products(store_id,category_id);
create index on public.retail_shifts(store_id,opened_at desc);
create index on public.retail_sales(store_id,shift_id,created_at desc);
create index on public.retail_movements(store_id,shift_id,created_at desc);

create function retail_private.role_for(p_store uuid) returns text language sql stable security definer set search_path = '' as $$
 select role from public.retail_members where store_id = p_store and user_id = (select auth.uid());
$$;
revoke all on function retail_private.role_for(uuid) from public;
grant execute on function retail_private.role_for(uuid) to authenticated;

alter table public.retail_stores enable row level security;
alter table public.retail_members enable row level security;
alter table public.retail_categories enable row level security;
alter table public.retail_registers enable row level security;
alter table public.retail_products enable row level security;
alter table public.retail_shifts enable row level security;
alter table public.retail_sales enable row level security;
alter table public.retail_movements enable row level security;
alter table public.retail_invitations enable row level security;

create policy member_read on public.retail_stores for select to authenticated using(retail_private.role_for(id) is not null);
create policy manager_update on public.retail_stores for update to authenticated using(retail_private.role_for(id) in ('owner','admin')) with check(retail_private.role_for(id) in ('owner','admin'));
create policy member_read on public.retail_members for select to authenticated using(retail_private.role_for(store_id) is not null);
create policy owner_remove on public.retail_members for delete to authenticated using(retail_private.role_for(store_id) = 'owner' and role <> 'owner');
create policy owner_read on public.retail_invitations for select to authenticated using(retail_private.role_for(store_id) = 'owner');
create policy owner_invite on public.retail_invitations for insert to authenticated with check(retail_private.role_for(store_id) = 'owner');
create policy owner_revoke on public.retail_invitations for delete to authenticated using(retail_private.role_for(store_id) = 'owner');

do $$ declare t text; begin
 foreach t in array array['retail_categories','retail_registers','retail_products'] loop
 execute format('create policy member_read on public.%I for select to authenticated using (retail_private.role_for(store_id) is not null)',t);
 execute format('create policy manager_insert on public.%I for insert to authenticated with check (retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 execute format('create policy manager_update on public.%I for update to authenticated using (retail_private.role_for(store_id) in (''owner'',''admin'')) with check (retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 end loop;
 foreach t in array array['retail_shifts','retail_sales','retail_movements'] loop
 execute format('create policy member_read on public.%I for select to authenticated using (retail_private.role_for(store_id) is not null)',t);
 end loop;
end $$;
-- Explicit grants: sales, movements and shifts can only be written by verified RPCs.
revoke all on public.retail_stores,public.retail_members,public.retail_categories,public.retail_registers,public.retail_products,public.retail_shifts,public.retail_sales,public.retail_movements,public.retail_invitations from anon,authenticated;
grant select on public.retail_stores,public.retail_members,public.retail_categories,public.retail_registers,public.retail_products,public.retail_shifts,public.retail_sales,public.retail_movements,public.retail_invitations to authenticated;
grant update(name,address,phone,receipt_message,accent_color) on public.retail_stores to authenticated;
grant insert on public.retail_categories,public.retail_registers,public.retail_products,public.retail_invitations to authenticated;
grant update(name) on public.retail_categories to authenticated;
grant update(name,active) on public.retail_registers to authenticated;
grant update(category_id,code,name,price,cost,stock,min_stock,emoji,active) on public.retail_products to authenticated;
grant delete on public.retail_members,public.retail_invitations to authenticated;

create function public.retail_create_store(p_name text) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 insert into public.retail_stores(name,owner_id) values(trim(p_name),auth.uid()) returning id into v_id;
 insert into public.retail_members values(v_id,auth.uid(),'owner');
 insert into public.retail_categories(store_id,name) select v_id,n from unnest(array['Golosinas','Bebidas','Snacks','Varios']) n;
 insert into public.retail_registers(store_id,name) values(v_id,'Caja principal');
 return v_id;
end $$;

-- Invitations are accepted by the verified account email, never by client-supplied user IDs.
create function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path = '' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 insert into public.retail_members(store_id,user_id,role)
 select store_id,auth.uid(),role from public.retail_invitations where email = v_email
 on conflict (store_id,user_id) do nothing;
 get diagnostics v_count = row_count;
 delete from public.retail_invitations where email = v_email;
 return v_count;
end $$;

create function public.retail_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then raise exception 'Caja no disponible'; end if;
 if p_opening is null or p_opening < 0 or p_opening::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
 insert into public.retail_shifts(store_id,register_id,opened_by,opening_cash) values(p_store,p_register,auth.uid(),p_opening) returning id into v_id;
 return v_id;
end $$;

create function retail_private.check_shift(p_shift uuid) returns public.retail_shifts language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; r text;
begin
 select * into s from public.retail_shifts where id=p_shift for update;
 r := retail_private.role_for(s.store_id);
 if s.id is null or r is null then raise exception 'Turno no disponible'; end if;
 if s.closed_at is not null then raise exception 'El turno ya está cerrado'; end if;
 if s.opened_by <> auth.uid() and r not in ('owner','admin') then raise exception 'Esta caja está abierta por otro usuario'; end if;
 return s;
end $$;
revoke all on function retail_private.check_shift(uuid) from public,anon,authenticated;

create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; p public.retail_products; item jsonb; v_qty integer; v_price numeric; v_name text;
 v_total numeric := 0; v_items jsonb := '[]'::jsonb; v_existing public.retail_sales;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 -- Serialize retries even if they originate from different registers.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by <> auth.uid() or v_existing.shift_id <> p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  return v_existing.id;
 end if;
 s := retail_private.check_shift(p_shift);
 if p_method is null or p_method not in ('Efectivo','QR','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 -- Stable product lock order avoids deadlocks between different registers.
 perform id from public.retail_products where store_id=s.store_id and id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty := (item->>'qty')::integer;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   if p.stock < v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
   if (item->>'unit_price')::numeric is distinct from p.price then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price := p.price; v_name := p.name;
   update public.retail_products set stock=stock-v_qty where id=p.id;
  else
   v_price := (item->>'unit_price')::numeric; v_name := trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price <= 0 or v_price > 999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price := round(v_price,2);
  v_total := v_total+v_qty*v_price;
  v_items := v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items);
 return p_request;
end $$;

create function public.retail_add_movement(p_shift uuid,p_type text,p_amount numeric,p_reason text,p_request uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; existing public.retail_movements;
begin
 s := retail_private.check_shift(p_shift);
 select * into existing from public.retail_movements where id=p_request;
 if found then
  if existing.shift_id <> p_shift or existing.created_by <> auth.uid() then raise exception 'Solicitud no válida'; end if;
  return existing.id;
 end if;
 if p_amount is null or p_amount <= 0 or p_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Importe inválido'; end if;
 insert into public.retail_movements(id,store_id,shift_id,created_by,type,amount,reason) values(p_request,s.store_id,s.id,auth.uid(),p_type,p_amount,trim(p_reason));
 return p_request;
end $$;

create function public.retail_close_shift(p_shift uuid,p_counted numeric) returns numeric language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 s := retail_private.check_shift(p_shift);
 if p_counted is null or p_counted < 0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 select s.opening_cash+coalesce((select sum(total) from public.retail_sales where shift_id=s.id and payment_method='Efectivo'),0)
 +coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0) into v_expected;
 update public.retail_shifts set closed_at=now(),closed_by=auth.uid(),counted_cash=p_counted,expected_cash=v_expected where id=s.id;
 return v_expected;
end $$;

revoke all on function public.retail_create_store(text),public.retail_accept_invitations(),public.retail_open_shift(uuid,uuid,numeric),public.retail_checkout(uuid,uuid,text,numeric,jsonb),public.retail_add_movement(uuid,text,numeric,text,uuid),public.retail_close_shift(uuid,numeric) from public,anon;
grant execute on function public.retail_create_store(text),public.retail_accept_invitations(),public.retail_open_shift(uuid,uuid,numeric),public.retail_checkout(uuid,uuid,text,numeric,jsonb),public.retail_add_movement(uuid,text,numeric,text,uuid),public.retail_close_shift(uuid,numeric) to authenticated;
$retail_source_f24b734005cc1623$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610010001_retail_multistore.sql','f24b734005cc1623cbeb235dd0436522445fce6501ec73999528a8f745ed1cb9','schema');
 end if;
end;

-- 2/84: 202610020001_catalog_global_and_segmentation.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610020001_catalog_global_and_segmentation.sql') then
  raise notice 'Aplicando 202610020001_catalog_global_and_segmentation.sql';
  execute replace($retail_source_bca9c54fa75c2a89$
-- ==============================================================================
-- 1. FUNCIÓN AUXILIAR: Actualización automática de timestamp (updated_at)
-- ==============================================================================
create or replace function retail_private.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function retail_private.set_updated_at() from public, anon;
grant execute on function retail_private.set_updated_at() to authenticated;

-- ==============================================================================
-- PARTE A: TABLA retail_global_catalog (Catálogo Comunitario por EAN)
-- ==============================================================================

-- 1. Creación de la tabla
create table if not exists public.retail_global_catalog (
  -- Clave primaria: código de barras EAN normalizado (entre 4 y 20 caracteres)
  ean_code text primary key check(length(trim(ean_code)) between 4 and 20),
  -- Datos descriptivos básicos del producto
  name text not null check(length(trim(name)) between 1 and 160),
  brand text,
  category_suggestion text,
  emoji text default '📦',
  description text,
  -- Métricas comunitarias de validación y confianza
  contributor_count integer default 1 check(contributor_count >= 1),
  confidence_score numeric(3,2) default 0.50 check(confidence_score between 0.00 and 1.00),
  -- Origen del registro: 'ai' | 'community' | 'verified'
  source text default 'community' check(source in ('ai', 'community', 'verified')),
  -- Metadatos de auditoría temporal
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Índices de optimización de búsqueda
-- Índice GIN para búsqueda full-text en español sobre el nombre del producto
create index if not exists idx_retail_global_catalog_fts
  on public.retail_global_catalog
  using gin(to_tsvector('spanish', name));

-- Índice B-Tree para filtrado por marca comercial
create index if not exists idx_retail_global_catalog_brand
  on public.retail_global_catalog(brand);

-- Índice B-Tree para filtrado por sugerencia de categoría
create index if not exists idx_retail_global_catalog_category_suggestion
  on public.retail_global_catalog(category_suggestion);

-- 3. Trigger para actualizar automáticamente el campo updated_at
drop trigger if exists trg_retail_global_catalog_updated_at on public.retail_global_catalog;
create trigger trg_retail_global_catalog_updated_at
  before update on public.retail_global_catalog
  for each row
  execute function retail_private.set_updated_at();

-- 4. Seguridad de Fila (Row Level Security - RLS)
alter table public.retail_global_catalog enable row level security;

-- Lectura pública: tanto usuarios anónimos como autenticados pueden consultar el catálogo comunitario
drop policy if exists global_catalog_read on public.retail_global_catalog;
create policy global_catalog_read
  on public.retail_global_catalog
  for select
  to anon, authenticated
  using (true);

-- Inserción: únicamente usuarios autenticados pueden registrar nuevos productos comunitarios
drop policy if exists global_catalog_insert on public.retail_global_catalog;
create policy global_catalog_insert
  on public.retail_global_catalog
  for insert
  to authenticated
  with check (auth.uid() is not null);

-- Actualización: usuarios autenticados pueden sugerir mejoras y aportar métricas
drop policy if exists global_catalog_update on public.retail_global_catalog;
create policy global_catalog_update
  on public.retail_global_catalog
  for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- 5. Concesión de privilegios (Grants)
-- Revocar accesos por defecto y conceder permisos específicos
revoke all on public.retail_global_catalog from anon, authenticated;

grant select on public.retail_global_catalog to anon, authenticated;
grant insert on public.retail_global_catalog to authenticated;

-- UPDATE limitado a columnas no críticas (protegiendo ean_code como PK y created_at como auditoría)
grant update(
  name,
  brand,
  category_suggestion,
  emoji,
  description,
  contributor_count,
  confidence_score,
  source
) on public.retail_global_catalog to authenticated;


-- ==============================================================================
-- PARTE B: COLUMNAS NUEVAS Y SEGMENTACIÓN EN retail_products
-- ==============================================================================

-- 1. Agregar nuevas columnas a la tabla de productos por comercio
alter table public.retail_products
  add column if not exists brand text,
  add column if not exists supplier text,
  add column if not exists supplier_code text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists unit_type text not null default 'unit';

-- 2. Restricción check para los valores admitidos en unit_type
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'retail_products_unit_type_check'
  ) then
    alter table public.retail_products
      add constraint retail_products_unit_type_check
      check (unit_type in ('unit', 'kg', 'lt', 'pack', 'box'));
  end if;
end $$;

-- 3. Índices para segmentación, filtrado y ajustes en lote
-- Índice para filtrado de productos por comercio y marca
create index if not exists idx_retail_products_store_brand
  on public.retail_products(store_id, brand);

-- Índice para filtrado de productos por comercio y proveedor/distribuidor
create index if not exists idx_retail_products_store_supplier
  on public.retail_products(store_id, supplier);

-- Índice GIN para búsquedas y filtros por etiquetas múltiples (tags)
create index if not exists idx_retail_products_tags
  on public.retail_products
  using gin(tags);

-- 4. Actualización de permisos: Extender grant update a las nuevas columnas
-- Permite que los roles autorizados (administradores/dueños según RLS de la tienda)
-- puedan modificar los nuevos atributos de producto.
grant update(
  brand,
  supplier,
  supplier_code,
  tags,
  unit_type
) on public.retail_products to authenticated;


-- ==============================================================================
-- PARTE C: FUNCIONES RPC PARA CATÁLOGO GLOBAL (LOOKUP Y CONTRIBUCIÓN)
-- ==============================================================================

-- 1. Búsqueda comunitaria por código EAN
create or replace function public.retail_lookup_ean(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rec record;
begin
  select
    ean_code,
    name,
    brand,
    category_suggestion,
    emoji,
    source,
    confidence_score
  into v_rec
  from public.retail_global_catalog
  where ean_code = trim(p_code)
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object(
    'found', true,
    'name', v_rec.name,
    'brand', v_rec.brand,
    'category_suggestion', v_rec.category_suggestion,
    'emoji', v_rec.emoji,
    'source', v_rec.source,
    'confidence_score', v_rec.confidence_score
  );
end;
$$;

revoke all on function public.retail_lookup_ean(text) from public;
grant execute on function public.retail_lookup_ean(text) to anon, authenticated;

-- 2. Contribución comunitaria al catálogo cuando se guarda un producto
create or replace function public.retail_contribute_catalog(
  p_code text,
  p_name text,
  p_brand text default null,
  p_category text default null,
  p_emoji text default '📦',
  p_source text default 'community'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := trim(p_code);
  v_name text := trim(p_name);
  v_rec record;
  v_new_count integer;
  v_new_conf numeric(3,2);
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Iniciá sesión para contribuir');
  end if;

  if length(v_code) not between 4 and 20 or length(v_name) not between 1 and 160 then
    return jsonb_build_object('error', 'Datos de producto inválidos');
  end if;

  select * into v_rec from public.retail_global_catalog where ean_code = v_code for update;

  if not found then
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      case when p_source in ('ai','community','verified') then p_source else 'community' end,
      1, 0.50
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1, 'confidence_score', 0.50);
  else
    v_new_count := v_rec.contributor_count + 1;
    v_new_conf := least(1.00, round(0.50 + (v_new_count * 0.05), 2));

    update public.retail_global_catalog
    set
      contributor_count = v_new_count,
      confidence_score = v_new_conf,
      -- No sobrescribir el nombre si el producto ya está verificado
      name = case when v_rec.confidence_score >= 0.90 then v_rec.name else v_name end,
      brand = coalesce(nullif(trim(p_brand), ''), v_rec.brand),
      category_suggestion = coalesce(nullif(trim(p_category), ''), v_rec.category_suggestion),
      emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
      updated_at = now()
    where ean_code = v_code;

    return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);
  end if;
exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public, anon;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

-- Notificar a PostgREST para recargar la caché de esquemas inmediatamente
notify pgrst, 'reload schema';

$retail_source_bca9c54fa75c2a89$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610020001_catalog_global_and_segmentation.sql','bca9c54fa75c2a8940b4f28c76aaab415b1740330c2a4a334dad2fef5beca292','schema');
 end if;
end;

-- 3/84: 202610070001_harden_global_catalog_immutability.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610070001_harden_global_catalog_immutability.sql') then
  raise notice 'Aplicando 202610070001_harden_global_catalog_immutability.sql';
  execute replace($retail_source_f3ff59ec39b6e574$
create or replace function public.retail_contribute_catalog(
  p_code text,
  p_name text,
  p_brand text default null,
  p_category text default null,
  p_emoji text default '📦',
  p_source text default 'community'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := trim(p_code);
  v_name text := trim(p_name);
  v_rec record;
  v_new_count integer;
  v_new_conf numeric(3,2);
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Iniciá sesión para contribuir');
  end if;

  if length(v_code) not between 4 and 20 or length(v_name) not between 1 and 160 then
    return jsonb_build_object('error', 'Datos de producto inválidos');
  end if;

  select * into v_rec from public.retail_global_catalog where ean_code = v_code for update;

  if not found then
    -- Si no existe en el catálogo global, se da de alta como producto nuevo
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      case when p_source in ('ai','community','verified') then p_source else 'community' end,
      1, case when p_source = 'verified' then 1.00 else 0.50 end
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1, 'confidence_score', 0.50);
  end if;

  -- 1. BLINDAJE OFICIAL: Si el producto está verificado o tiene alta confianza, sus datos son INTOCABLES
  if v_rec.source = 'verified' or coalesce(v_rec.confidence_score, 0) >= 0.90 then
    update public.retail_global_catalog
    set
      contributor_count = v_rec.contributor_count + 1,
      updated_at = now()
    where ean_code = v_code;

    return jsonb_build_object(
      'action', 'verified_protected',
      'message', 'El producto está verificado y sus datos oficiales no pueden ser alterados',
      'contributor_count', v_rec.contributor_count + 1
    );
  end if;

  -- 2. REGISTRO COMUNITARIO: Nunca sobreescribir datos existentes, solo completar campos vacíos (NULL)
  v_new_count := v_rec.contributor_count + 1;
  v_new_conf := least(0.89, round(0.50 + (v_new_count * 0.05), 2));

  update public.retail_global_catalog
  set
    contributor_count = v_new_count,
    confidence_score = v_new_conf,
    -- Mantener nombre original si ya existe
    name = coalesce(nullif(trim(v_rec.name), ''), v_name),
    -- Mantener marca original; solo rellenar si en la base estaba NULL o vacía
    brand = coalesce(nullif(trim(v_rec.brand), ''), nullif(trim(p_brand), '')),
    -- Mantener categoría original; solo rellenar si en la base estaba NULL o vacía
    category_suggestion = coalesce(nullif(trim(v_rec.category_suggestion), ''), nullif(trim(p_category), '')),
    -- Mantener emoji existente si ya tiene uno específico
    emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
    updated_at = now()
  where ean_code = v_code;

  return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);

exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

$retail_source_f3ff59ec39b6e574$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610070001_harden_global_catalog_immutability.sql','f3ff59ec39b6e5744cb059f242cfdaf0c234f1ab34c4bae2ec93ca10f13594f5','schema');
 end if;
end;

-- 4/84: 202610130001_branches_prices_ledgers.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610130001_branches_prices_ledgers.sql') then
  raise notice 'Aplicando 202610130001_branches_prices_ledgers.sql';
  execute replace($retail_source_e86fe143f886cd85$
create table public.retail_branches (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80), address text not null default '',
 is_default boolean not null default false, unique(store_id,id), unique(store_id,name)
);
create unique index retail_default_branch on public.retail_branches(store_id) where is_default;
create table public.retail_price_lists (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80),
 adjustment numeric(8,2) not null default 0 check(adjustment > -100 and adjustment <= 10000),
 active boolean not null default true, unique(store_id,id), unique(store_id,name)
);
create table public.retail_price_overrides (
 store_id uuid not null, list_id uuid not null, product_id uuid not null,
 price numeric(14,2) not null check(price > 0 and price < 1000000000000),
 primary key(list_id,product_id),
 foreign key(store_id,list_id) references public.retail_price_lists(store_id,id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create table public.retail_ledgers (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(trim(name)) between 1 and 80),
 is_default boolean not null default false, active boolean not null default true,
 check(not is_default or active), unique(store_id,id), unique(store_id,name)
);
create unique index retail_default_ledger on public.retail_ledgers(store_id) where is_default;

create function retail_private.initialize_location() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_branches(store_id,name,is_default) values(new.id,'Principal',true);
 insert into public.retail_ledgers(store_id,name,is_default) values(new.id,'General',true);
 insert into public.retail_ledgers(store_id,name) values(new.id,'Otras ventas');
 return new;
end $$;
revoke all on function retail_private.initialize_location() from public,anon,authenticated;
create trigger retail_initialize_location after insert on public.retail_stores for each row execute function retail_private.initialize_location();
insert into public.retail_branches(store_id,name,is_default) select id,'Principal',true from public.retail_stores;
insert into public.retail_ledgers(store_id,name,is_default) select id,'General',true from public.retail_stores;
insert into public.retail_ledgers(store_id,name) select id,'Otras ventas' from public.retail_stores;

alter table public.retail_registers add column branch_id uuid;
update public.retail_registers r set branch_id=b.id from public.retail_branches b where b.store_id=r.store_id and b.is_default;
alter table public.retail_registers alter column branch_id set not null;
alter table public.retail_registers add foreign key(store_id,branch_id) references public.retail_branches(store_id,id);
alter table public.retail_registers drop constraint retail_registers_store_id_name_key;
alter table public.retail_registers add unique(branch_id,name);
create function retail_private.default_register_branch() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.branch_id is null then select id into new.branch_id from public.retail_branches where store_id=new.store_id and is_default; end if;
 return new;
end $$;
revoke all on function retail_private.default_register_branch() from public,anon,authenticated;
create trigger retail_default_register_branch before insert on public.retail_registers for each row execute function retail_private.default_register_branch();

alter table public.retail_sales
 add column branch_id uuid, add column branch_name text,
 add column register_name text,
 add column price_list_id uuid, add column price_list_name text not null default 'Lista madre',
 add column ledger_id uuid, add column ledger_name text,
 add column invoice_reference text, add column invoiced_at timestamptz,
 add column invoiced_by uuid references auth.users(id),
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,price_list_id) references public.retail_price_lists(store_id,id),
 add foreign key(store_id,ledger_id) references public.retail_ledgers(store_id,id),
 add check(invoice_reference is null or length(trim(invoice_reference)) between 1 and 120);
update public.retail_sales s set branch_id=r.branch_id,branch_name=b.name,register_name=r.name
 from public.retail_shifts sh join public.retail_registers r on r.id=sh.register_id join public.retail_branches b on b.id=r.branch_id where sh.id=s.shift_id;
update public.retail_sales s set ledger_id=l.id,ledger_name=l.name from public.retail_ledgers l where l.store_id=s.store_id and l.is_default;
alter table public.retail_sales alter column branch_id set not null, alter column ledger_id set not null,
 alter column branch_name set not null, alter column register_name set not null, alter column ledger_name set not null;
create index retail_sales_reporting on public.retail_sales(store_id,created_at,id);

do $$ declare t text; begin
 foreach t in array array['retail_branches','retail_price_lists','retail_price_overrides','retail_ledgers'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert on public.%I to authenticated',t);
 execute format('create policy member_read on public.%I for select to authenticated using(retail_private.role_for(store_id) is not null)',t);
 execute format('create policy manager_insert on public.%I for insert to authenticated with check(retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 execute format('create policy manager_update on public.%I for update to authenticated using(retail_private.role_for(store_id) in (''owner'',''admin'')) with check(retail_private.role_for(store_id) in (''owner'',''admin''))',t);
 end loop;
end $$;
grant update(name,address) on public.retail_branches to authenticated;
grant update(name,adjustment,active) on public.retail_price_lists to authenticated;
grant update(name,active) on public.retail_ledgers to authenticated;
grant update,delete on public.retail_price_overrides to authenticated;
create policy manager_delete on public.retail_price_overrides for delete to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));

-- Attaching an externally issued invoice is append-only and identifies the operator.
create function public.retail_attach_invoice(p_sale uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare s public.retail_sales;
begin
 select * into s from public.retail_sales where id=p_sale for update;
 if s.id is null or coalesce(retail_private.role_for(s.store_id),'') not in ('owner','admin') then raise exception 'Sin permiso para asociar comprobantes'; end if;
 if s.invoice_reference is not null then
  if s.invoice_reference=trim(p_reference) then return; end if;
  raise exception 'La venta ya tiene un comprobante asociado';
 end if;
 if p_reference is null or length(trim(p_reference)) not between 1 and 120 then raise exception 'Ingresá la referencia del comprobante emitido'; end if;
 update public.retail_sales set invoice_reference=trim(p_reference),invoiced_at=now(),invoiced_by=auth.uid() where id=p_sale;
end $$;
revoke all on function public.retail_attach_invoice(uuid,text) from public,anon;
grant execute on function public.retail_attach_invoice(uuid,text) to authenticated;

drop function public.retail_checkout(uuid,uuid,text,numeric,jsonb);
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; p public.retail_products; item jsonb; v_qty integer; v_price numeric; v_name text;
 v_total numeric := 0; v_items jsonb := '[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 -- Serialize retries even if they originate from different registers.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by <> auth.uid() or v_existing.shift_id <> p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id <> p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s := retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and
  ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 -- Stable product lock order avoids deadlocks between different registers.
 perform id from public.retail_products where store_id=s.store_id and id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty := (item->>'qty')::integer;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   if p.stock < v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
   v_expected := p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected := coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price := v_expected; v_name := p.name;
   update public.retail_products set stock=stock-v_qty where id=p.id;
  else
   v_price := (item->>'unit_price')::numeric; v_name := trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price <= 0 or v_price > 999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price := round(v_price,2);
  v_total := v_total+v_qty*v_price;
  v_items := v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items,branch_id,branch_name,register_name,price_list_id,price_list_name,ledger_id,ledger_name)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items,v_branch.id,v_branch.name,v_register.name,p_price_list,coalesce(v_list.name,'Lista madre'),v_ledger.id,v_ledger.name);
 return p_request;
end $$;

revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid) to authenticated;

-- Update the mother list atomically; never insert incomplete products via upsert.
create function public.retail_update_prices(p_store uuid,p_updates jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; v_price numeric;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para cambiar precios'; end if;
 if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'Precios inválidos'; end if;
 if jsonb_array_length(p_updates) not between 1 and 10000 then raise exception 'Cantidad de cambios inválida'; end if;
 perform id from public.retail_products where store_id=p_store and id in (select (x->>'id')::uuid from jsonb_array_elements(p_updates) x) order by id for update;
 for item in select value from jsonb_array_elements(p_updates) loop
  v_price := (item->>'price')::numeric;
  if v_price is null or v_price <= 0 or v_price >= 1000000000000 or v_price::text in ('NaN','Infinity','-Infinity') or round(v_price,2)<=0 then raise exception 'Precio inválido'; end if;
  update public.retail_products set price=round(v_price,2) where id=(item->>'id')::uuid and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible en este comercio'; end if;
 end loop;
end $$;
revoke all on function public.retail_update_prices(uuid,jsonb) from public,anon;
grant execute on function public.retail_update_prices(uuid,jsonb) to authenticated;
$retail_source_e86fe143f886cd85$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610130001_branches_prices_ledgers.sql','e86fe143f886cd858443bde5917d43095126a4beca788c866f2589bcee94509b','schema');
 end if;
end;

-- 5/84: 202610140001_web_push.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610140001_web_push.sql') then
  raise notice 'Aplicando 202610140001_web_push.sql';
  execute replace($retail_source_918efe9a5d3313e3$
create table public.retail_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 20 and 2048),
 p256dh text not null, auth text not null,
 low_stock boolean not null default true, shift_closed boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 last_test_at timestamptz
);
create table public.retail_push_deliveries (
 id uuid primary key default gen_random_uuid(),
 subscription_id uuid not null references public.retail_push_subscriptions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 kind text not null check(kind in ('low_stock','shift_closed','test')),
 event_key text not null, created_at timestamptz not null default now(),
 available_at timestamptz not null default now(), attempts integer not null default 0,
 lease uuid, locked_at timestamptz, sent_at timestamptz, last_error text,
 unique(subscription_id,event_key)
);
create index on public.retail_push_subscriptions(store_id);
create index on public.retail_push_deliveries(available_at) where sent_at is null and attempts < 5;
alter table public.retail_push_subscriptions enable row level security;
alter table public.retail_push_deliveries enable row level security;
revoke all on public.retail_push_subscriptions,public.retail_push_deliveries from public,anon,authenticated;
grant select on public.retail_push_subscriptions to authenticated;
grant all on public.retail_push_subscriptions,public.retail_push_deliveries to service_role;
create policy own_device on public.retail_push_subscriptions for select to authenticated
 using(user_id=auth.uid() and retail_private.role_for(store_id) in ('owner','admin'));

create function public.retail_save_push(p_store uuid,p_endpoint text,p_p256dh text,p_auth text,
 p_low_stock boolean,p_shift_closed boolean) returns uuid
 language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_old public.retail_push_subscriptions;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo propietarios y administradores pueden activar estos avisos';
 end if;
 -- Only real browser push services, never arbitrary URLs or internal hosts.
 if p_endpoint !~ '^https://(fcm\.googleapis\.com|([a-z0-9-]+\.)?push\.services\.mozilla\.com|([a-z0-9-]+\.)?push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
  or length(p_endpoint)>2048 or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth !~ '^[A-Za-z0-9_-]{22}$'
  or p_endpoint is null or p_p256dh is null or p_auth is null then raise exception 'Suscripción push inválida'; end if;
 -- Serialize enrollment per endpoint and user (also bounds device count).
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 perform pg_advisory_xact_lock(hashtextextended(p_endpoint,1));
 select * into v_old from public.retail_push_subscriptions where endpoint=p_endpoint for update;
 if (v_old.id is null or v_old.user_id<>auth.uid()) and (select count(*) from public.retail_push_subscriptions where user_id=auth.uid())>=20 then
  raise exception 'Alcanzaste el máximo de 20 dispositivos';
 end if;
 if v_old.id is not null and (v_old.user_id<>auth.uid() or v_old.store_id<>p_store) then
  -- Account/store changes invalidate queued messages from the previous recipient.
  delete from public.retail_push_subscriptions where id=v_old.id;
 end if;
 insert into public.retail_push_subscriptions(user_id,store_id,endpoint,p256dh,auth,low_stock,shift_closed)
 values(auth.uid(),p_store,p_endpoint,p_p256dh,p_auth,p_low_stock,p_shift_closed)
 on conflict(endpoint) do update set p256dh=excluded.p256dh,auth=excluded.auth,
 low_stock=excluded.low_stock,shift_closed=excluded.shift_closed,updated_at=now()
 returning id into v_id;
 return v_id;
end $$;

create function public.retail_remove_push(p_endpoint text) returns void
 language sql security definer set search_path='' as $$
 delete from public.retail_push_subscriptions where endpoint=p_endpoint and user_id=auth.uid();
$$;

create function public.retail_request_push_test(p_store uuid,p_endpoint text) returns uuid
 language plpgsql security definer set search_path='' as $$
declare s public.retail_push_subscriptions; v_id uuid;
begin
 select * into s from public.retail_push_subscriptions where endpoint=p_endpoint and store_id=p_store
 and user_id=auth.uid() for update;
 if s.id is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Activá los avisos de este comercio primero'; end if;
 if s.last_test_at>now()-interval '1 minute' then raise exception 'Esperá un minuto antes de repetir la prueba'; end if;
 update public.retail_push_subscriptions set last_test_at=now() where id=s.id;
 insert into public.retail_push_deliveries(subscription_id,user_id,store_id,kind,event_key)
 values(s.id,s.user_id,s.store_id,'test',gen_random_uuid()::text) returning id into v_id;
 return v_id;
end $$;

create function retail_private.enqueue_push() returns trigger
 language plpgsql security definer set search_path='' as $$
declare v_kind text; v_key text;
begin
 if tg_table_name='retail_products' then
  if not new.active or new.stock>new.min_stock or (old.active and old.stock<=old.min_stock) then return new; end if;
  -- Group simultaneous low-stock crossings into one generic store notice per minute.
  v_kind:='low_stock'; v_key:='stock:'||new.store_id::text||':'||date_trunc('minute',now())::text;
 else
  if new.closed_at is null or old.closed_at is not null then return new; end if;
  v_kind:='shift_closed'; v_key:='shift:'||new.id::text;
 end if;
 insert into public.retail_push_deliveries(subscription_id,user_id,store_id,kind,event_key)
 select s.id,s.user_id,s.store_id,v_kind,v_key from public.retail_push_subscriptions s
 join public.retail_members m on m.store_id=s.store_id and m.user_id=s.user_id
 where s.store_id=new.store_id and m.role in ('owner','admin')
 and ((v_kind='low_stock' and s.low_stock) or (v_kind='shift_closed' and s.shift_closed))
 on conflict(subscription_id,event_key) do nothing;
 return new;
end $$;
create trigger retail_stock_push after update of stock,min_stock,active on public.retail_products
 for each row execute function retail_private.enqueue_push();
create trigger retail_shift_push after update of closed_at on public.retail_shifts
 for each row execute function retail_private.enqueue_push();

-- A short lease permits retries after worker failure without parallel claims.
create function public.retail_claim_push(p_only uuid default null) returns jsonb
 language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 delete from public.retail_push_deliveries where created_at<now()-interval '7 days';
 with candidates as (
  select d.id from public.retail_push_deliveries d where d.sent_at is null and d.attempts<5
  and d.available_at<=now() and d.created_at>now()-interval '24 hours'
  and (d.locked_at is null or d.locked_at<now()-interval '2 minutes')
  and (p_only is null or d.id=p_only) order by d.created_at for update skip locked limit 10
 ), claimed as (
  update public.retail_push_deliveries d set attempts=d.attempts+1,locked_at=now(),lease=gen_random_uuid()
  from candidates c where d.id=c.id returning d.*
 ) select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object(
  'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth,
  'authorized',exists(select 1 from public.retail_members m where m.store_id=c.store_id and m.user_id=c.user_id and m.role in ('owner','admin'))
   and s.user_id=c.user_id and s.store_id=c.store_id
   and (c.kind='test' or (c.kind='low_stock' and s.low_stock) or (c.kind='shift_closed' and s.shift_closed))
  )), '[]'::jsonb) into result from claimed c join public.retail_push_subscriptions s on s.id=c.subscription_id;
 return result;
end $$;
revoke all on function retail_private.enqueue_push() from public,anon,authenticated;
revoke all on function public.retail_save_push(uuid,text,text,text,boolean,boolean),public.retail_remove_push(text),
 public.retail_request_push_test(uuid,text),public.retail_claim_push(uuid) from public,anon,authenticated;
grant execute on function public.retail_save_push(uuid,text,text,text,boolean,boolean),public.retail_remove_push(text),
 public.retail_request_push_test(uuid,text) to authenticated;
grant execute on function public.retail_claim_push(uuid) to service_role;
$retail_source_918efe9a5d3313e3$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610140001_web_push.sql','918efe9a5d3313e3dc695430c93c0c035acdf97f9b20fcc4c387b444a8737964','schema');
 end if;
end;

-- 6/84: 202610150001_cashier_access.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610150001_cashier_access.sql') then
  raise notice 'Aplicando 202610150001_cashier_access.sql';
  execute replace($retail_source_a30006ceabfa2ca5$
alter table public.retail_members
 add column branch_id uuid,
 add column register_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,register_id) references public.retail_registers(store_id,id);
alter table public.retail_invitations
 add column branch_id uuid,
 add column register_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 add foreign key(store_id,register_id) references public.retail_registers(store_id,id);

create function retail_private.can_use_register(p_store uuid,p_register uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m join public.retail_registers r on r.store_id=m.store_id
 where m.store_id=p_store and m.user_id=auth.uid() and r.id=p_register
 and (m.role in ('owner','admin') or ((m.branch_id is null or m.branch_id=r.branch_id) and (m.register_id is null or m.register_id=r.id))));
$$;
revoke all on function retail_private.can_use_register(uuid,uuid) from public,anon;
grant execute on function retail_private.can_use_register(uuid,uuid) to authenticated;

drop policy member_read on public.retail_members;
create policy member_read on public.retail_members for select to authenticated
 using(user_id=auth.uid() or retail_private.role_for(store_id) in ('owner','admin'));
drop policy member_read on public.retail_registers;
create policy member_read on public.retail_registers for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin') or retail_private.can_use_register(store_id,id));
drop policy member_read on public.retail_branches;
create policy member_read on public.retail_branches for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or exists (
 select 1 from public.retail_members m where m.store_id=retail_branches.store_id and m.user_id=auth.uid()
 and (m.branch_id is null or m.branch_id=retail_branches.id)
 and (m.register_id is null or exists(select 1 from public.retail_registers r where r.id=m.register_id and r.branch_id=retail_branches.id))));
drop policy member_read on public.retail_shifts;
create policy member_read on public.retail_shifts for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and opened_by=auth.uid()));
drop policy member_read on public.retail_sales;
create policy member_read on public.retail_sales for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and created_by=auth.uid()));
drop policy member_read on public.retail_movements;
create policy member_read on public.retail_movements for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or (retail_private.role_for(store_id)='cashier' and created_by=auth.uid()));
create policy admin_read_cashier_invites on public.retail_invitations for select to authenticated
 using(retail_private.role_for(store_id)='admin' and role='cashier');
create index retail_shifts_operator on public.retail_shifts(store_id,opened_by);
create index retail_sales_operator on public.retail_sales(store_id,created_by);
create index retail_movements_operator on public.retail_movements(store_id,created_by);

-- Read current verified account emails without exposing auth.users to clients.
create function public.retail_team(p_store uuid)
returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para consultar el equipo'; end if;
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id
 from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;

-- A register selection always implies its branch. null/null means unrestricted.
create function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para asignar cajeros'; end if;
 if p_pending then
  select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
  select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if v_role is distinct from 'cashier' then raise exception 'Solo se pueden asignar permisos a cajeros de este comercio'; end if;
 v_branch := p_branch;
 if p_register is not null then
  select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
  if v_branch is null then raise exception 'Caja no disponible'; end if;
  if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then
  update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
  if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id
    where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null
    and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then
   raise exception 'El cajero debe cerrar su turno actual antes de cambiar a otra sucursal o caja';
  end if;
  update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 -- Serialize acceptance with editing the pending assignment.
 perform 1 from public.retail_invitations where email=v_email order by id for update;
 insert into public.retail_members(store_id,user_id,role,branch_id,register_id)
 select store_id,auth.uid(),role,branch_id,register_id from public.retail_invitations where email=v_email
 on conflict(store_id,user_id) do nothing;
 get diagnostics v_count = row_count;
 delete from public.retail_invitations where email=v_email;
 return v_count;
end $$;

create or replace function public.retail_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if not retail_private.can_use_register(p_store,p_register) then raise exception 'Sin acceso a esta caja'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then raise exception 'Caja no disponible'; end if;
 if p_opening is null or p_opening<0 or p_opening::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
 insert into public.retail_shifts(store_id,register_id,opened_by,opening_cash) values(p_store,p_register,auth.uid(),p_opening) returning id into v_id;
 return v_id;
end $$;

create or replace function retail_private.check_shift(p_shift uuid) returns public.retail_shifts language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; r text;
begin
 select * into s from public.retail_shifts where id=p_shift;
 perform 1 from public.retail_members where store_id=s.store_id and user_id=auth.uid() for share;
 select * into s from public.retail_shifts where id=p_shift for update;
 r := retail_private.role_for(s.store_id);
 if s.id is null or r is null then raise exception 'Turno no disponible'; end if;
 if s.closed_at is not null then raise exception 'El turno ya está cerrado'; end if;
 if s.opened_by<>auth.uid() and r not in ('owner','admin') then raise exception 'Esta caja está abierta por otro usuario'; end if;
 if not retail_private.can_use_register(s.store_id,s.register_id) then raise exception 'Sin acceso a esta caja'; end if;
 return s;
end $$;

-- Only disclose occupancy, never the other operator's identity, amounts or activity.
create function public.retail_register_availability(p_store uuid)
returns table(register_id uuid,occupied boolean) language sql stable security definer set search_path='' as $$
 select r.id,exists(select 1 from public.retail_shifts s where s.register_id=r.id and s.closed_at is null)
 from public.retail_registers r where r.store_id=p_store and r.active and retail_private.can_use_register(p_store,r.id);
$$;

-- Reconciliation needs the whole balance of one's own shift, including any manager
-- adjustments, while the underlying rows remain private to their authors/managers.
create function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 select s.opening_cash
  + coalesce((select sum(total) from public.retail_sales where shift_id=s.id and payment_method='Efectivo'),0)
  + coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0)
 into v_expected;
 return v_expected;
end $$;

revoke all on function public.retail_team(uuid),public.retail_set_cashier_access(uuid,uuid,uuid,uuid,boolean),public.retail_register_availability(uuid),public.retail_shift_balance(uuid) from public,anon;
grant execute on function public.retail_team(uuid),public.retail_set_cashier_access(uuid,uuid,uuid,uuid,boolean),public.retail_register_availability(uuid),public.retail_shift_balance(uuid) to authenticated;
notify pgrst,'reload schema';
$retail_source_a30006ceabfa2ca5$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610150001_cashier_access.sql','a30006ceabfa2ca5abd0116ddf06f3f79d042bae913fd59c25efb5a918a83017','schema');
 end if;
end;

-- 7/84: 202610160001_offline_pos.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160001_offline_pos.sql') then
  raise notice 'Aplicando 202610160001_offline_pos.sql';
  execute replace($retail_source_770c916876fcdabf$
alter table public.retail_sales drop constraint retail_sales_payment_method_check;
alter table public.retail_sales add check(payment_method in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito'));
alter table public.retail_sales add column payments jsonb, add column cash_amount numeric(14,2), add column recorded_at timestamptz not null default now();
update public.retail_sales set payments=jsonb_build_array(jsonb_build_object('method',payment_method,'amount',total)),cash_amount=case when payment_method='Efectivo' then total else 0 end;
alter table public.retail_sales alter column payments set not null,alter column cash_amount set not null;
alter table public.retail_sales add check(cash_amount>=0 and cash_amount<=total);
alter table public.retail_movements add column recorded_at timestamptz not null default now();
drop function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid);
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; p public.retail_products; item jsonb; v_qty integer; v_price numeric; v_name text;
 v_total numeric := 0; v_items jsonb := '[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric; v_parts jsonb; v_cash numeric; v_sum numeric; v_methods integer;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 -- Serialize retries even if they originate from different registers.
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by <> auth.uid() or v_existing.shift_id <> p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id <> p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s := retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and
  ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 -- Stable product lock order avoids deadlocks between different registers.
 perform id from public.retail_products where store_id=s.store_id and id in
 (select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty') !~ '^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty := (item->>'qty')::integer;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   if p.stock < v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
   v_expected := p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected := coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price := v_expected; v_name := p.name;
   update public.retail_products set stock=stock-v_qty where id=p.id;
  else
   v_price := (item->>'unit_price')::numeric; v_name := trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price <= 0 or v_price > 999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price := round(v_price,2);
  v_total := v_total+v_qty*v_price;
  v_items := v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 v_parts := coalesce(p_payments,jsonb_build_array(jsonb_build_object('method',p_method,'amount',v_total)));
 if jsonb_typeof(v_parts) is distinct from 'array' or jsonb_array_length(v_parts) not between 1 and 5 then raise exception 'Desglose de pago inválido'; end if;
 if exists(select 1 from jsonb_array_elements(v_parts) x where coalesce(x->>'method','') not in ('Efectivo','QR','Transferencia','Debito','Credito') or (x->>'amount') is null or (x->>'amount')::numeric<=0 or (x->>'amount')::numeric::text in ('NaN','Infinity','-Infinity') or round((x->>'amount')::numeric,2)<>(x->>'amount')::numeric) then raise exception 'Importe o medio de pago inválido'; end if;
 select sum((x->>'amount')::numeric),coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Efectivo'),0),count(distinct x->>'method') into v_sum,v_cash,v_methods from jsonb_array_elements(v_parts) x;
 if v_sum<>v_total or v_methods<>jsonb_array_length(v_parts) or (p_method='Mixto' and v_methods<2) or (p_method<>'Mixto' and (v_methods<>1 or v_parts->0->>'method'<>p_method)) then raise exception 'El desglose debe coincidir con el total y el medio elegido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items,branch_id,branch_name,register_name,price_list_id,price_list_name,ledger_id,ledger_name,payments,cash_amount)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items,v_branch.id,v_branch.name,v_register.name,p_price_list,coalesce(v_list.name,'Lista madre'),v_ledger.id,v_ledger.name,v_parts,v_cash);
 return p_request;
end $$;

revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) to authenticated;

create or replace function public.retail_close_shift(p_shift uuid,p_counted numeric) returns numeric language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 s := retail_private.check_shift(p_shift);
 if p_counted is null or p_counted < 0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 select s.opening_cash+coalesce((select sum(cash_amount) from public.retail_sales where shift_id=s.id),0)
 +coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0) into v_expected;
 update public.retail_shifts set closed_at=now(),closed_by=auth.uid(),counted_cash=p_counted,expected_cash=v_expected where id=s.id;
 return v_expected;
end $$;

create or replace function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 select s.opening_cash
  + coalesce((select sum(cash_amount) from public.retail_sales where shift_id=s.id),0)
  + coalesce((select sum(case when type='INGRESO' then amount else -amount end) from public.retail_movements where shift_id=s.id),0)
 into v_expected;
 return v_expected;
end $$;


notify pgrst,'reload schema';
$retail_source_770c916876fcdabf$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160001_offline_pos.sql','770c916876fcdabf64104718e442e7b424f343e6787bfc742c4164cccf435313','schema');
 end if;
end;

-- 8/84: 202610160002_offline_queue.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160002_offline_queue.sql') then
  raise notice 'Aplicando 202610160002_offline_queue.sql';
  execute replace($retail_source_ffb2f924480094f8$
create table public.retail_quick_products (
 store_id uuid not null, branch_id uuid not null, product_id uuid not null, position integer not null check(position between 0 and 19),
 primary key(branch_id,product_id), unique(branch_id,position),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
alter table public.retail_quick_products enable row level security;
create policy member_read on public.retail_quick_products for select to authenticated using (
 exists(select 1 from public.retail_branches b where b.id=branch_id and b.store_id=retail_quick_products.store_id));
grant select on public.retail_quick_products to authenticated;

create function public.retail_save_quick_products(p_store uuid,p_branch uuid,p_products uuid[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede personalizar la botonera'; end if;
 perform 1 from public.retail_branches where id=p_branch and store_id=p_store for update;
 if not found then raise exception 'Sucursal no disponible'; end if;
 if p_products is null or cardinality(p_products)>20 or
  (select count(distinct id) from unnest(p_products) id)<>cardinality(p_products) or
  exists(select 1 from unnest(p_products) as selected(product_id) where not exists(select 1 from public.retail_products p where p.id=selected.product_id and p.store_id=p_store and p.active)) then raise exception 'Elegí hasta 20 productos distintos de este comercio'; end if;
 delete from public.retail_quick_products where branch_id=p_branch;
 insert into public.retail_quick_products(store_id,branch_id,product_id,position) select p_store,p_branch,id,n-1 from unnest(p_products) with ordinality as t(id,n);
end $$;
create function public.retail_popular_products(p_store uuid,p_branch uuid) returns table(product_id uuid,units numeric)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) or
  not exists(select 1 from public.retail_registers r where r.branch_id=p_branch and retail_private.can_use_register(p_store,r.id)) then raise exception 'Sin acceso a la sucursal'; end if;
 -- Only aggregate product rotation; never expose tickets, operators or amounts.
 return query select (i->>'productId')::uuid,sum((i->>'qty')::numeric)
 from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
 where s.store_id=p_store and s.branch_id=p_branch and s.created_at>=now()-interval '30 days' and i->>'productId' is not null
 group by i->>'productId' order by sum((i->>'qty')::numeric) desc limit 20;
end $$;

create table public.retail_stock_movements (
 operation_id uuid not null, product_id uuid not null, store_id uuid not null, user_id uuid not null references auth.users(id),
 delta integer not null, cost numeric(14,2), occurred_at timestamptz not null, recorded_at timestamptz not null default now(),
 primary key(operation_id,product_id), foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
alter table public.retail_stock_movements enable row level security;
create policy manager_read on public.retail_stock_movements for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_stock_movements from public,anon,authenticated;
grant select on public.retail_stock_movements to authenticated;

create table public.retail_sync_receipts (
 id uuid primary key, user_id uuid not null references auth.users(id), store_id uuid not null references public.retail_stores(id),
 payload jsonb not null, result jsonb not null, synced_at timestamptz not null default now()
);
alter table public.retail_sync_receipts enable row level security;
-- Deliberately no direct client access. Receipts are written with the operation in one transaction.
revoke all on public.retail_sync_receipts from public,anon,authenticated;
create function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if coalesce(retail_private.role_for(v_store),'') not in ('owner','admin') then raise exception 'Sin permiso para registrar stock'; end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost) where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id);
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
revoke all on function public.retail_sync_operation(jsonb),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_popular_products(uuid,uuid) from public,anon;
grant execute on function public.retail_sync_operation(jsonb),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_popular_products(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
$retail_source_ffb2f924480094f8$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160002_offline_queue.sql','ffb2f924480094f8255c3bd1105ac834381678058bb65ff6e63ec433b4710ab0','schema');
 end if;
end;

-- 9/84: 202610160003_pack_size.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160003_pack_size.sql') then
  raise notice 'Aplicando 202610160003_pack_size.sql';
  execute replace($retail_source_e8f486a53e369954$
alter table public.retail_products
 add column pack_size integer default null check(pack_size is null or pack_size >= 1);
-- Product updates use explicit column grants and the existing manager RLS policy.
grant update(pack_size) on public.retail_products to authenticated;
notify pgrst,'reload schema';
$retail_source_e8f486a53e369954$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160003_pack_size.sql','e8f486a53e3699543bb33b819986d3e96c57bbfb112cb039428e534507228c6b','schema');
 end if;
end;

-- 10/84: 202610160004_margin_groups.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160004_margin_groups.sql') then
  raise notice 'Aplicando 202610160004_margin_groups.sql';
  execute replace($retail_source_8a5790ed3a1371e6$
-- May be rerun to finish a manual installation without deleting existing values.
alter table public.retail_products
 add column if not exists margin_group text default 'standard';
alter table public.retail_products alter column margin_group set default 'standard';

do $migration$
begin
 if not exists (
  select 1 from pg_catalog.pg_constraint
  where conrelid='public.retail_products'::regclass
    and conname='retail_products_margin_group_check'
 ) then
  alter table public.retail_products
   add constraint retail_products_margin_group_check check(margin_group in ('standard','low_margin'));
 end if;
end;
$migration$;
grant update(margin_group) on public.retail_products to authenticated;

-- A ticket may contain both groups. Capture the server's product data per line,
-- independently of its sales ledger, so later edits do not rewrite profitability.
create or replace function retail_private.snapshot_margin_items() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_item jsonb; v_product public.retail_products; v_items jsonb:='[]'::jsonb;
begin
 for v_item in select value from jsonb_array_elements(new.items) loop
  if v_item->>'productId' is not null then
   select * into v_product from public.retail_products where id=(v_item->>'productId')::uuid and store_id=new.store_id;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   v_item:=v_item || jsonb_build_object('marginGroup',coalesce(v_product.margin_group,'standard'),'unitCost',nullif(v_product.cost,0));
  else
   v_item:=v_item || jsonb_build_object('marginGroup','standard','unitCost',null);
  end if;
  v_items:=v_items || jsonb_build_array(v_item);
 end loop;
 new.items:=v_items;
 return new;
end $$;
revoke all on function retail_private.snapshot_margin_items() from public,anon,authenticated;
-- Recreate this migration's trigger atomically; existing sales are untouched.
drop trigger if exists retail_snapshot_margin_items on public.retail_sales;
create trigger retail_snapshot_margin_items before insert on public.retail_sales
 for each row execute function retail_private.snapshot_margin_items();
notify pgrst,'reload schema';
$retail_source_8a5790ed3a1371e6$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160004_margin_groups.sql','8a5790ed3a1371e6c0aa57f46b68b2fe0af74efd79a3650cfa7ced54b876cc86','schema');
 end if;
end;

-- 11/84: 202610160005_branch_price_rules.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610160005_branch_price_rules.sql') then
  raise notice 'Aplicando 202610160005_branch_price_rules.sql';
  execute replace($retail_source_7899d29739b25999$
alter table public.retail_price_lists add column branch_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id);
grant update(branch_id) on public.retail_price_lists to authenticated;
-- Global lists remain unlimited. A branch has one unambiguous active default.
create unique index retail_one_active_price_list_per_branch
 on public.retail_price_lists(store_id,branch_id) where active and branch_id is not null;

-- Existing member_read and manager_insert/update policies continue to enforce
-- store membership and owner/admin writes, including the new branch_id column.
create function public.retail_active_price_list_for_branch(p_store uuid,p_branch uuid)
returns uuid language plpgsql stable security invoker set search_path='' as $$
declare v_list uuid;
begin
 if retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 select id into v_list from public.retail_price_lists where store_id=p_store and branch_id=p_branch and active;
 return v_list;
end $$;
revoke all on function public.retail_active_price_list_for_branch(uuid,uuid) from public,anon;
grant execute on function public.retail_active_price_list_for_branch(uuid,uuid) to authenticated;

-- Runs inside checkout's transaction (also when syncing offline). Any exception
-- rolls back stock, payment and sale together. Existing idempotent retries remain valid.
create function retail_private.enforce_branch_price_rule() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_list public.retail_price_lists; v_default uuid;
begin
 if new.price_list_id is not null then
  select * into v_list from public.retail_price_lists where id=new.price_list_id and store_id=new.store_id and active for share;
  if not found or (v_list.branch_id is not null and v_list.branch_id<>new.branch_id) then
   raise exception 'La lista de precios no está disponible para esta sucursal';
  end if;
 end if;
 if retail_private.role_for(new.store_id)='cashier' then
  v_default:=public.retail_active_price_list_for_branch(new.store_id,new.branch_id);
  if new.price_list_id is distinct from v_default then raise exception 'Usá la lista de precios asignada a esta sucursal. Actualizá los datos antes de cobrar'; end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.enforce_branch_price_rule() from public,anon,authenticated;
create trigger retail_enforce_branch_price_rule before insert on public.retail_sales
 for each row execute function retail_private.enforce_branch_price_rule();
notify pgrst,'reload schema';
$retail_source_7899d29739b25999$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610160005_branch_price_rules.sql','7899d29739b25999d24e879b18ed53f8794628fe852743c7916b46d4db5b16e1','schema');
 end if;
end;

-- 12/84: 202610190001_justified_withdrawal.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190001_justified_withdrawal.sql') then
  raise notice 'Aplicando 202610190001_justified_withdrawal.sql';
  execute replace($retail_source_029b5843eacab94f$
alter table public.retail_movements
 add column category text not null default 'general' check(category in ('general','supplier_payment','other')),
 add column voucher_url text,
 add column supplier_name text,
 add constraint retail_movement_supplier_details check (
  (type='RETIRO' or category='general') and
  (supplier_name is null or length(trim(supplier_name)) between 1 and 160) and
  (category<>'supplier_payment' or (type='RETIRO' and nullif(trim(supplier_name),'') is not null and nullif(trim(voucher_url),'') is not null))
 );

-- No public objects, no overwrite/delete policies. Receipts are immutable for clients.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('retail-vouchers','retail-vouchers',false,10485760,array[
 'image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','image/bmp','image/tiff','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create function retail_private.can_upload_voucher(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(p_name,'/');
 v_uuid text:='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
 if auth.uid() is null or coalesce(array_length(parts,1),0)<>3 or parts[1]!~v_uuid or parts[2]!~v_uuid or
  parts[3]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|heic|heif|avif|bmp|tif|pdf)$' then return false; end if;
 return exists(select 1 from public.retail_shifts s where s.store_id=parts[1]::uuid and s.id=parts[2]::uuid and s.closed_at is null
  and retail_private.role_for(s.store_id) is not null
  and (retail_private.role_for(s.store_id) in ('owner','admin') or
   (s.opened_by=auth.uid() and retail_private.can_use_register(s.store_id,s.register_id))));
end $$;
create function retail_private.can_read_voucher(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1)
  and m.user_id=auth.uid() and m.role in ('owner','admin'));
$$;
revoke all on function retail_private.can_upload_voucher(text),retail_private.can_read_voucher(text) from public,anon;
grant execute on function retail_private.can_upload_voucher(text),retail_private.can_read_voucher(text) to authenticated;
create policy retail_vouchers_member_upload on storage.objects for insert to authenticated
 with check(bucket_id='retail-vouchers' and retail_private.can_upload_voucher(name));
create policy retail_vouchers_manager_read on storage.objects for select to authenticated
 using(bucket_id='retail-vouchers' and retail_private.can_read_voucher(name));

-- Column permissions prevent a cashier from requesting voucher_url directly through REST.
-- The RLS policies for the other columns remain in force (own rows for cashiers).
revoke select on public.retail_movements from authenticated,anon,public;
grant select(id,store_id,shift_id,created_by,type,amount,reason,created_at,recorded_at,category,supplier_name)
 on public.retail_movements to authenticated;

create function public.retail_movement_details(p_store uuid,p_shift uuid)
returns table(id uuid,type text,amount numeric,reason text,created_at timestamptz,category text,voucher_url text,supplier_name text)
language plpgsql stable security definer set search_path='' as $$
declare v_role text:=retail_private.role_for(p_store);
begin
 if v_role is null or not exists(select 1 from public.retail_shifts s where s.id=p_shift and s.store_id=p_store
  and (v_role in ('owner','admin') or s.opened_by=auth.uid())) then raise exception 'Sin acceso a este turno'; end if;
 return query select m.id,m.type,m.amount,m.reason,m.created_at,m.category,
  case when v_role in ('owner','admin') then m.voucher_url else null::text end,m.supplier_name
 from public.retail_movements m where m.store_id=p_store and m.shift_id=p_shift
 and (v_role in ('owner','admin') or m.created_by=auth.uid());
end $$;

-- Keep the original five-argument RPC for older clients. The new signature is explicit
-- (no ambiguous default-argument overload) and validates the actual uploaded object.
create function public.retail_add_movement(p_shift uuid,p_type text,p_amount numeric,p_reason text,p_request uuid,
 p_category text,p_voucher_url text,p_supplier_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; existing public.retail_movements;
 v_category text:=coalesce(p_category,'general'); v_supplier text:=nullif(trim(p_supplier_name),'');
 v_voucher text:=nullif(trim(p_voucher_url),''); v_path text;
begin
 if auth.uid() is null or p_request is null then raise exception 'Solicitud no válida'; end if;
 if v_category not in ('general','supplier_payment','other') or p_type not in ('INGRESO','RETIRO') or p_type is null
  or (p_type='INGRESO' and v_category<>'general') then raise exception 'Categoría de movimiento inválida'; end if;
 if v_category<>'supplier_payment' then v_supplier:=null; v_voucher:=null; end if;
 if v_category='supplier_payment' and v_supplier is null then raise exception 'Ingresá el nombre del proveedor'; end if;
 if v_category='supplier_payment' and v_voucher is null then raise exception 'Adjuntá el comprobante para pagos a proveedores'; end if;
 if v_supplier is not null and length(v_supplier)>160 then raise exception 'El nombre del proveedor supera los 160 caracteres'; end if;
 if p_amount is null or p_amount<=0 or p_amount>=1000000000000 or p_amount::text in ('NaN','Infinity','-Infinity') or round(p_amount,2)<=0 then raise exception 'Importe inválido'; end if;
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>300 then raise exception 'Completá el motivo (hasta 300 caracteres)'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from public.retail_movements where id=p_request;
 if found then
  if existing.shift_id<>p_shift or existing.created_by<>auth.uid() or retail_private.role_for(existing.store_id) is null
   or existing.type<>p_type or existing.amount<>round(p_amount,2) or existing.reason<>trim(p_reason)
   or existing.category<>v_category or existing.voucher_url is distinct from v_voucher or existing.supplier_name is distinct from v_supplier then
   raise exception 'El identificador ya corresponde a otro movimiento'; end if;
  return existing.id;
 end if;
 s:=retail_private.check_shift(p_shift);
 if v_voucher is not null then
  v_path:=substring(v_voucher from '^https?://[^/]+/storage/v1/object/authenticated/retail-vouchers/(.*)$');
  if v_path is null or split_part(v_path,'/',1)<>s.store_id::text or split_part(v_path,'/',2)<>s.id::text
   or not retail_private.can_upload_voucher(v_path) then raise exception 'El comprobante no corresponde al comercio y turno'; end if;
  perform 1 from storage.objects o where o.bucket_id='retail-vouchers' and o.name=v_path
   and (coalesce(to_jsonb(o)->>'owner_id',to_jsonb(o)->>'owner')=auth.uid()::text or retail_private.role_for(s.store_id) in ('owner','admin')) for share;
  if not found then raise exception 'Primero subí un comprobante válido para este turno'; end if;
 end if;
 insert into public.retail_movements(id,store_id,shift_id,created_by,type,amount,reason,category,voucher_url,supplier_name)
 values(p_request,s.store_id,s.id,auth.uid(),p_type,p_amount,trim(p_reason),v_category,v_voucher,v_supplier);
 return p_request;
end $$;

revoke all on function public.retail_movement_details(uuid,uuid),public.retail_add_movement(uuid,text,numeric,text,uuid,text,text,text) from public,anon;
grant execute on function public.retail_movement_details(uuid,uuid),public.retail_add_movement(uuid,text,numeric,text,uuid,text,text,text) to authenticated;

-- Keep offline replay transactional, idempotent and compatible with older queued movements.

create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if coalesce(retail_private.role_for(v_store),'') not in ('owner','admin') then raise exception 'Sin permiso para registrar stock'; end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost) where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;

revoke all on function public.retail_sync_operation(jsonb) from public,anon;
grant execute on function public.retail_sync_operation(jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_029b5843eacab94f$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190001_justified_withdrawal.sql','029b5843eacab94f78439fd8f13da846c46e7729f376e1f314286e1f20a14fa9','schema');
 end if;
end;

-- 13/84: 202610190001_store_onboarding.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190001_store_onboarding.sql') then
  raise notice 'Aplicando 202610190001_store_onboarding.sql';
  execute replace($retail_source_e5b8362448949bce$
create table public.retail_store_onboarding (
 store_id uuid primary key references public.retail_stores(id),
 step smallint not null default 1 check (step between 1 and 3),
 details_confirmed_at timestamptz,
 dismissed_at timestamptz,
 completed_at timestamptz,
 version integer not null default 0,
 updated_at timestamptz not null default now()
);
alter table public.retail_store_onboarding enable row level security;
revoke all on public.retail_store_onboarding from public, anon, authenticated;
grant select on public.retail_store_onboarding to authenticated;
create policy manager_read on public.retail_store_onboarding for select to authenticated
 using (retail_private.role_for(store_id) in ('owner','admin'));

create function retail_private.initialize_onboarding() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_store_onboarding(store_id) values(new.id);
 return new;
end $$;
revoke all on function retail_private.initialize_onboarding() from public,anon,authenticated;
create trigger retail_initialize_onboarding after insert on public.retail_stores
 for each row execute function retail_private.initialize_onboarding();

-- Stable client request across reloads; serialize matching pending creations across devices.
create table retail_private.store_creation_requests (
 user_id uuid not null references auth.users(id), request_id uuid not null,
 store_id uuid not null references public.retail_stores(id), primary key(user_id,request_id)
);
revoke all on retail_private.store_creation_requests from public,anon,authenticated;
create function public.retail_create_store_once(p_name text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or p_request is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 select store_id into v_id from retail_private.store_creation_requests where user_id=auth.uid() and request_id=p_request;
 if v_id is not null then return v_id; end if;
 select s.id into v_id from public.retail_stores s join public.retail_store_onboarding o on o.store_id=s.id
 where s.owner_id=auth.uid() and lower(s.name)=lower(trim(p_name)) and o.completed_at is null
 order by o.updated_at limit 1;
 if v_id is null then v_id := public.retail_create_store(p_name); end if;
 insert into retail_private.store_creation_requests values(auth.uid(),p_request,v_id);
 return v_id;
end $$;

create function public.retail_onboarding_update(p_store uuid,p_version integer,p_action text) returns public.retail_store_onboarding
language plpgsql security definer set search_path='' as $$
declare o public.retail_store_onboarding; has_products boolean;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para configurar este comercio'; end if;
 select * into o from public.retail_store_onboarding where store_id=p_store for update;
 if o.store_id is null then raise exception 'Este comercio no necesita inicio guiado'; end if;
 if p_version is null or o.version <> p_version then raise exception 'El inicio cambió en otro dispositivo. Actualizá para continuar.'; end if;
 if o.completed_at is not null then return o; end if;
 if p_action='details' then
   if not exists(select 1 from public.retail_registers where store_id=p_store and active) then raise exception 'Agregá una caja en Locales y cajas antes de continuar'; end if;
   o.details_confirmed_at := coalesce(o.details_confirmed_at,now()); o.step := 2;
 elsif p_action='products' then
   if o.details_confirmed_at is null then raise exception 'Confirmá primero los datos del comercio'; end if;
   o.step := 3;
 elsif p_action='back_details' then o.step := 1;
 elsif p_action='back_products' then o.step := 2;
 elsif p_action='dismiss' then o.dismissed_at := now();
 elsif p_action='resume' then o.dismissed_at := null;
 elsif p_action='finish' then
   if o.details_confirmed_at is null then raise exception 'Confirmá primero los datos del comercio'; end if;
   if not exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id
     where s.store_id=p_store and s.opened_by=auth.uid() and s.closed_at is null and r.active)
     then raise exception 'Abrí tu turno antes de empezar a vender'; end if;
   select exists(select 1 from public.retail_products where store_id=p_store and active) into has_products;
   o.completed_at := case when has_products then now() else null end;
   o.dismissed_at := now(); o.step := case when has_products then 3 else 2 end;
 else raise exception 'Acción de inicio no válida';
 end if;
 update public.retail_store_onboarding set step=o.step,details_confirmed_at=o.details_confirmed_at,
   dismissed_at=o.dismissed_at,completed_at=o.completed_at,version=version+1,updated_at=now()
 where store_id=p_store returning * into o;
 return o;
end $$;

-- This wrapper uses the actual opening RPC and its accounting/permission validation.
-- A retry (including another device) returns the same own open shift, never opens another.
create function public.retail_onboarding_open_shift(p_store uuid,p_register uuid,p_opening numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para configurar este comercio'; end if;
 perform 1 from public.retail_store_onboarding where store_id=p_store and details_confirmed_at is not null for update;
 if not found then raise exception 'Confirmá primero los datos del comercio'; end if;
 if not exists(select 1 from public.retail_registers where id=p_register and store_id=p_store and active) then
   raise exception 'Caja no disponible. Actualizá y elegí una caja activa.';
 end if;
 select id into v_id from public.retail_shifts where store_id=p_store and register_id=p_register and closed_at is null;
 if v_id is not null then
   if exists(select 1 from public.retail_shifts where id=v_id and opened_by=auth.uid()) then return v_id; end if;
   raise exception 'Esta caja está ocupada. Elegí otra caja o actualizá cuando se libere.';
 end if;
 if exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=auth.uid() and closed_at is null) then
   raise exception 'Ya tenés un turno abierto en otra caja. Actualizá y seleccioná esa caja para continuar.';
 end if;
 return public.retail_open_shift(p_store,p_register,p_opening);
end $$;
revoke all on function public.retail_create_store_once(text,uuid), public.retail_onboarding_update(uuid,integer,text), public.retail_onboarding_open_shift(uuid,uuid,numeric) from public,anon;
grant execute on function public.retail_create_store_once(text,uuid), public.retail_onboarding_update(uuid,integer,text), public.retail_onboarding_open_shift(uuid,uuid,numeric) to authenticated;
$retail_source_e5b8362448949bce$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190001_store_onboarding.sql','e5b8362448949bceec6db8607ab80a30285230317f319875eb6d9a2f1d47f09c','schema');
 end if;
end;

-- 14/84: 202610190002_pending_replenishments.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190002_pending_replenishments.sql') then
  raise notice 'Aplicando 202610190002_pending_replenishments.sql';
  execute replace($retail_source_3ddd179e5609126a$
create table public.retail_pending_replenishments (
 id uuid primary key, store_id uuid not null references public.retail_stores(id), branch_id uuid,
 submitted_by uuid not null references auth.users(id), submitted_at timestamptz not null default now(),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 image_url text not null unique, extracted_text text, items jsonb not null default '[]'::jsonb,
 notes text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz, rejection_reason text,
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=200),
 check(length(coalesce(notes,''))<=2000 and length(coalesce(extracted_text,''))<=100000),
 check((status='pending' and reviewed_by is null and reviewed_at is null and rejection_reason is null)
  or (status='approved' and reviewed_by is not null and reviewed_at is not null and rejection_reason is null)
  or (status='rejected' and reviewed_by is not null and reviewed_at is not null and rejection_reason is not null and length(trim(rejection_reason)) between 1 and 1000))
);
create index retail_pending_replenishments_store_status on public.retail_pending_replenishments(store_id,status,submitted_at,id);
alter table public.retail_pending_replenishments enable row level security;
create policy member_read on public.retail_pending_replenishments for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_create on public.retail_pending_replenishments for insert to authenticated
 with check(retail_private.role_for(store_id) is not null and submitted_by=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null);
create policy manager_review on public.retail_pending_replenishments for update to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
-- Writes must go through the RPCs so changing a status cannot bypass validation/stock.
revoke all on public.retail_pending_replenishments from public,anon,authenticated;
grant select on public.retail_pending_replenishments to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('retail-remitos','retail-remitos',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif','image/avif','image/bmp','image/tiff'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create function retail_private.can_upload_remito(p_name text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare parts text[]:=string_to_array(p_name,'/');
 v_uuid text:='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
 if auth.uid() is null or coalesce(array_length(parts,1),0)<>3 or parts[1]!~v_uuid or parts[2]<>auth.uid()::text or
  parts[3]!~'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|heic|heif|avif|bmp|tif)$' then return false; end if;
 return retail_private.role_for(parts[1]::uuid) is not null;
end $$;
create function retail_private.can_read_remito(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1)
  and m.user_id=auth.uid() and m.role in ('owner','admin'));
$$;
revoke all on function retail_private.can_upload_remito(text),retail_private.can_read_remito(text) from public,anon;
grant execute on function retail_private.can_upload_remito(text),retail_private.can_read_remito(text) to authenticated;
create policy retail_remitos_member_upload on storage.objects for insert to authenticated
 with check(bucket_id='retail-remitos' and retail_private.can_upload_remito(name));
create policy retail_remitos_manager_read on storage.objects for select to authenticated
 using(bucket_id='retail-remitos' and retail_private.can_read_remito(name));

create function retail_private.validate_remito_items(p_store uuid,p_items jsonb,p_require_links boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_result jsonb:='[]'::jsonb; v_item jsonb; v_product public.retail_products; v_id uuid;
 v_line text; v_name text; v_qty integer; v_pack integer; v_confidence numeric;
begin
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>200
  or (p_require_links and jsonb_array_length(p_items)=0) then raise exception 'Ingresá entre 1 y 200 artículos para aprobar (o enviá solo la foto para revisión)'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'quantity','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Cada cantidad debe ser un entero positivo en unidades individuales'; end if;
  v_qty:=(v_item->>'quantity')::integer;
  if v_qty>1000000 then raise exception 'La cantidad supera 1.000.000 de unidades'; end if;
  v_line:=trim(coalesce(v_item->>'invoice_line','')); v_name:=trim(coalesce(v_item->>'product_name',v_line));
  if length(v_line) not between 1 and 500 or length(v_name) not between 1 and 500 then raise exception 'Revisá las descripciones de los artículos'; end if;
  v_id:=nullif(v_item->>'product_id','')::uuid;
  if v_id is null then
   if p_require_links then raise exception 'Vinculá todos los artículos a productos del catálogo antes de aprobar'; end if;
  else
   select * into v_product from public.retail_products where id=v_id and store_id=p_store and active;
   if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
   v_name:=v_product.name;
  end if;
  v_pack:=null;
  if v_item->>'pack_size' is not null then
   if (v_item->>'pack_size')!~'^[1-9][0-9]{0,6}$' then raise exception 'La presentación del bulto es inválida'; end if;
   v_pack:=(v_item->>'pack_size')::integer;
   if v_pack>1000000 then raise exception 'La presentación del bulto es inválida'; end if;
  end if;
  v_confidence:=null;
  if jsonb_typeof(v_item->'confidence')='number' then v_confidence:=greatest(0,least(1,(v_item->>'confidence')::numeric)); end if;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('invoice_line',v_line,'product_id',v_id,'product_name',v_name,'quantity',v_qty,'pack_size',v_pack,'confidence',v_confidence));
 end loop;
 return v_result;
end $$;
revoke all on function retail_private.validate_remito_items(uuid,jsonb,boolean) from public,anon,authenticated;

create function public.retail_submit_pending_replenishment(p_store uuid,p_branch uuid,p_image_url text,p_extracted_text text,p_items jsonb,p_notes text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_path text; v_id uuid; existing public.retail_pending_replenishments; v_items jsonb;
 v_role text:=retail_private.role_for(p_store); v_assigned uuid;
begin
 if auth.uid() is null or v_role is null then raise exception 'Sin acceso al comercio'; end if;
 v_path:=substring(p_image_url from '^https?://[^/]+/storage/v1/object/authenticated/retail-remitos/(.*)$');
 if v_path is null or split_part(v_path,'/',1)<>p_store::text or not retail_private.can_upload_remito(v_path) then raise exception 'La foto no corresponde a este comercio y usuario'; end if;
 v_id:=split_part(split_part(v_path,'/',3),'.',1)::uuid;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,1));
 select * into existing from public.retail_pending_replenishments where id=v_id;
 if found then
  if existing.store_id<>p_store or existing.submitted_by<>auth.uid() or existing.image_url<>p_image_url then raise exception 'La foto ya corresponde a otro envío'; end if;
  return existing.id;
 end if;
 if p_branch is not null and not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if v_role='cashier' then
  select coalesce(m.branch_id,r.branch_id) into v_assigned from public.retail_members m left join public.retail_registers r on r.id=m.register_id and r.store_id=m.store_id where m.store_id=p_store and m.user_id=auth.uid();
  if v_assigned is not null and p_branch is distinct from v_assigned then raise exception 'Usá la sucursal asignada a tu cuenta'; end if;
 end if;
 if length(coalesce(p_notes,''))>2000 or length(coalesce(p_extracted_text,''))>100000 then raise exception 'El texto o las notas superan el tamaño permitido'; end if;
 perform 1 from storage.objects o where o.bucket_id='retail-remitos' and o.name=v_path
  and coalesce(nullif(to_jsonb(o)->>'owner_id',''),to_jsonb(o)->>'owner')=auth.uid()::text for share;
 if not found then raise exception 'Primero subí la foto del remito'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,'[]'::jsonb),false);
 insert into public.retail_pending_replenishments(id,store_id,branch_id,submitted_by,image_url,extracted_text,items,notes)
 values(v_id,p_store,p_branch,auth.uid(),p_image_url,nullif(p_extracted_text,''),v_items,nullif(trim(p_notes),''));
 return v_id;
end $$;

create function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments; v_items jsonb; v_group record; p public.retail_products; v_qty integer;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede aprobar ingresos de stock'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='approved' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue rechazado'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,r.items),true);
 -- Lock all products in a stable order, then add to current stock, never a client snapshot.
 perform pr.id from public.retail_products pr where pr.store_id=p_store and pr.id in
  (select (item->>'product_id')::uuid from jsonb_array_elements(v_items) item) order by pr.id for update;
 for v_group in select (item->>'product_id')::uuid as product_id,sum((item->>'quantity')::integer) as quantity
  from jsonb_array_elements(v_items) item group by (item->>'product_id')::uuid loop
  if v_group.quantity>1000000 then raise exception 'La suma por producto supera 1.000.000 de unidades'; end if;
  v_qty:=v_group.quantity::integer;
  select * into p from public.retail_products where id=v_group.product_id and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible'; end if;
  if p.stock>2147483647-v_qty then raise exception 'El stock resultante supera el máximo permitido'; end if;
  update public.retail_products set stock=stock+v_qty where id=p.id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,occurred_at)
   values(r.id,p.id,p_store,auth.uid(),v_qty,now());
 end loop;
 update public.retail_pending_replenishments set items=v_items,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
 return r.id;
end $$;

create function public.retail_reject_replenishment(p_store uuid,p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede rechazar remitos'; end if;
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>1000 then raise exception 'Ingresá un motivo de rechazo (hasta 1.000 caracteres)'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='rejected' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue aprobado'; end if;
 update public.retail_pending_replenishments set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=trim(p_reason) where id=r.id;
 return r.id;
end $$;
revoke all on function public.retail_submit_pending_replenishment(uuid,uuid,text,text,jsonb,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_reject_replenishment(uuid,uuid,text) from public,anon;
grant execute on function public.retail_submit_pending_replenishment(uuid,uuid,text,text,jsonb,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_reject_replenishment(uuid,uuid,text) to authenticated;
notify pgrst,'reload schema';
$retail_source_3ddd179e5609126a$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190002_pending_replenishments.sql','3ddd179e5609126a264e696cd293909008bf4dd1acc06a8bb409c248ba5ab707','schema');
 end if;
end;

-- 15/84: 202610190003_stock_transfers.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610190003_stock_transfers.sql') then
  raise notice 'Aplicando 202610190003_stock_transfers.sql';
  execute replace($retail_source_cab05c3785465fba$
-- Internal audit records only: these functions never update product stock.
create table public.retail_stock_transfers (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 from_branch_id uuid not null, to_branch_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 notes text, status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 items jsonb not null, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 foreign key(store_id,from_branch_id) references public.retail_branches(store_id,id),
 foreign key(store_id,to_branch_id) references public.retail_branches(store_id,id),
 check(from_branch_id<>to_branch_id), check(length(coalesce(notes,''))<=2000),
 check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 200),
 check((status='pending' and reviewed_by is null and reviewed_at is null)
  or (status in ('confirmed','cancelled') and reviewed_by is not null and reviewed_at is not null))
);
create index retail_stock_transfers_history on public.retail_stock_transfers(store_id,created_at desc,id);
alter table public.retail_stock_transfers enable row level security;
create policy member_read on public.retail_stock_transfers for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_create on public.retail_stock_transfers for insert to authenticated
 with check(retail_private.role_for(store_id) is not null and created_by=auth.uid() and status='pending' and reviewed_by is null and reviewed_at is null);
create policy manager_review on public.retail_stock_transfers for update to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
-- RPC-only writes preserve item validation, idempotency and review audit fields.
revoke all on public.retail_stock_transfers from public,anon,authenticated;
grant select on public.retail_stock_transfers to authenticated;

create function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_request,gen_random_uuid()); existing public.retail_stock_transfers;
 v_item jsonb; v_product uuid; v_qty integer; v_name text; v_items jsonb:='[]'::jsonb;
 v_requested jsonb:='[]'::jsonb; v_existing jsonb; v_notes text:=nullif(trim(p_notes),'');
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if p_from_branch is null or p_to_branch is null or p_from_branch=p_to_branch then raise exception 'Elegí sucursales de origen y destino diferentes'; end if;
 if length(coalesce(v_notes,''))>2000 then raise exception 'Las notas no pueden superar los 2.000 caracteres'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Agregá al menos un producto'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(v_item->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá los productos y sus cantidades enteras positivas'; end if;
  v_product:=(v_item->>'product_id')::uuid; v_qty:=(v_item->>'qty')::integer;
  if v_qty>1000000 then raise exception 'La cantidad por producto no puede superar 1.000.000 de unidades'; end if;
  v_requested:=v_requested||jsonb_build_array(jsonb_build_object('product_id',v_product,'qty',v_qty));
 end loop;
 if (select count(distinct item->>'product_id') from jsonb_array_elements(v_requested) item)<>jsonb_array_length(v_requested) then
  raise exception 'Incluí cada producto una sola vez con su cantidad total'; end if;
 select jsonb_agg(item order by item->>'product_id') into v_requested from jsonb_array_elements(v_requested) item;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into existing from public.retail_stock_transfers where id=v_id;
 if found then
  select jsonb_agg(jsonb_build_object('product_id',item->>'product_id','qty',(item->>'qty')::integer) order by item->>'product_id')
   into v_existing from jsonb_array_elements(existing.items) item;
  if existing.store_id<>p_store or existing.created_by<>auth.uid() or existing.from_branch_id<>p_from_branch or existing.to_branch_id<>p_to_branch
   or existing.notes is distinct from v_notes or v_existing<>v_requested then raise exception 'El identificador ya corresponde a otra transferencia'; end if;
  return existing.id;
 end if;
 if (select count(*) from public.retail_branches where store_id=p_store and id in (p_from_branch,p_to_branch))<>2 then raise exception 'Las sucursales deben pertenecer a este comercio'; end if;
 for v_item in select value from jsonb_array_elements(v_requested) loop
  v_product:=(v_item->>'product_id')::uuid;
  select name into v_name from public.retail_products where id=v_product and store_id=p_store and active;
  if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',v_product,'product_name',v_name,'qty',(v_item->>'qty')::integer));
 end loop;
 insert into public.retail_stock_transfers(id,store_id,from_branch_id,to_branch_id,created_by,items,notes)
 values(v_id,p_store,p_from_branch,p_to_branch,auth.uid(),v_items,v_notes);
 return v_id;
end $$;

create function public.retail_confirm_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede confirmar transferencias'; end if;
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='confirmed' then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia está cancelada'; end if;
 update public.retail_stock_transfers set status='confirmed',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create function public.retail_cancel_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 if auth.uid() is null or coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo el administrador puede cancelar transferencias'; end if;
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='cancelled' then return t.id; end if;
 if t.status<>'pending' then raise exception 'Una transferencia confirmada conserva su registro histórico'; end if;
 update public.retail_stock_transfers set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;
revoke all on function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid),public.retail_confirm_transfer(uuid,uuid),public.retail_cancel_transfer(uuid,uuid) from public,anon;
grant execute on function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid),public.retail_confirm_transfer(uuid,uuid),public.retail_cancel_transfer(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
$retail_source_cab05c3785465fba$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610190003_stock_transfers.sql','cab05c3785465fba81273dddaad52130c14a8c6c42fb63ed53f476416d53a4be','schema');
 end if;
end;

-- 16/84: 202610200001_supplier_mappings.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610200001_supplier_mappings.sql') then
  raise notice 'Aplicando 202610200001_supplier_mappings.sql';
  execute replace($retail_source_d4841853f82adbd4$
-- Same normalization as normalizeSupplierText in the client; no new extension.
create function retail_private.normalize_supplier(p_text text) returns text
language sql immutable set search_path = '' as $$
 select btrim(regexp_replace(regexp_replace(lower(regexp_replace(
   normalize(coalesce(p_text, ''), NFD), U&'[\0300-\036f]', '', 'g')),
   '[^[:alnum:][:space:]]', ' ', 'g'), '[[:space:]]+', ' ', 'g'));
$$;
revoke all on function retail_private.normalize_supplier(text) from public;
grant execute on function retail_private.normalize_supplier(text) to authenticated;

create table public.retail_supplier_mappings (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id),
 supplier text not null check(supplier <> '' and supplier = retail_private.normalize_supplier(supplier)),
 invoice_text text not null check(length(btrim(invoice_text)) > 0),
 product_id uuid not null references public.retail_products(id),
 product_name text not null check(length(btrim(product_name)) > 0),
 pack_size_detected integer check(pack_size_detected is null or pack_size_detected >= 1),
 confidence numeric(3,2) not null default 1.0 check(confidence between 0 and 1),
 times_used integer not null default 1 check(times_used >= 1),
 last_used_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 unique(store_id, supplier, invoice_text),
 -- A member cannot link their store's alias to another store's product.
 foreign key(store_id, product_id) references public.retail_products(store_id, id)
);
create index retail_supplier_mappings_rank
 on public.retail_supplier_mappings(store_id, supplier, times_used desc, last_used_at desc);

alter table public.retail_supplier_mappings enable row level security;
create policy member_read on public.retail_supplier_mappings for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy member_insert on public.retail_supplier_mappings for insert to authenticated
 with check(retail_private.role_for(store_id) is not null);
create policy member_update on public.retail_supplier_mappings for update to authenticated
 using(retail_private.role_for(store_id) is not null)
 with check(retail_private.role_for(store_id) is not null);
revoke all on public.retail_supplier_mappings from public, anon, authenticated;
grant select, insert, update on public.retail_supplier_mappings to authenticated;

create function public.retail_upsert_supplier_mapping(
 p_store uuid, p_supplier text, p_invoice_text text,
 p_product_id uuid, p_product_name text, p_pack_size integer default null
) returns public.retail_supplier_mappings
language plpgsql security invoker set search_path = '' as $$
declare result public.retail_supplier_mappings;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode = '42501';
 end if;
 insert into public.retail_supplier_mappings as existing
   (store_id, supplier, invoice_text, product_id, product_name, pack_size_detected)
 values (p_store, retail_private.normalize_supplier(p_supplier), btrim(p_invoice_text),
   p_product_id, btrim(p_product_name), p_pack_size)
 on conflict (store_id, supplier, invoice_text) do update set
   product_id = excluded.product_id, product_name = excluded.product_name,
   pack_size_detected = excluded.pack_size_detected,
   times_used = existing.times_used + 1, last_used_at = now()
 returning * into result;
 return result;
end;
$$;

create function public.retail_get_supplier_mappings(p_store uuid, p_supplier text)
returns setof public.retail_supplier_mappings
language plpgsql stable security invoker set search_path = '' as $$
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode = '42501';
 end if;
 return query select m.* from public.retail_supplier_mappings m
 where m.store_id = p_store and m.supplier = retail_private.normalize_supplier(p_supplier)
 order by m.times_used desc, m.last_used_at desc, m.id;
end;
$$;
revoke all on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer) from public, anon;
revoke all on function public.retail_get_supplier_mappings(uuid,text) from public, anon;
grant execute on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer) to authenticated;
grant execute on function public.retail_get_supplier_mappings(uuid,text) to authenticated;

$retail_source_d4841853f82adbd4$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610200001_supplier_mappings.sql','d4841853f82adbd4e881feb1bdf3f525d76a12121e152b54257f8eaf9a81611c','schema');
 end if;
end;

-- 17/84: 202610200002_supplier_alias_usage.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610200002_supplier_alias_usage.sql') then
  raise notice 'Aplicando 202610200002_supplier_alias_usage.sql';
  execute replace($retail_source_1adc3ce4519abbb2$
-- Replace the old signature without ambiguous PostgREST overloads; six-argument callers keep working.
drop function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer);
create function public.retail_upsert_supplier_mapping(
 p_store uuid, p_supplier text, p_invoice_text text, p_product_id uuid, p_product_name text,
 p_pack_size integer default null, p_confidence numeric default 1,
 p_usage_only boolean default false, p_mapping_id uuid default null
) returns public.retail_supplier_mappings
language plpgsql security invoker set search_path='' as $$
declare result public.retail_supplier_mappings;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 if p_confidence is null or p_confidence < 0 or p_confidence > 1 then
   raise exception 'La confianza debe estar entre cero y uno' using errcode='22023';
 end if;
 if p_usage_only then
   update public.retail_supplier_mappings m set times_used=m.times_used+1,last_used_at=now()
   where m.id=p_mapping_id and m.store_id=p_store and m.supplier=retail_private.normalize_supplier(p_supplier)
     and m.invoice_text=btrim(p_invoice_text) and m.product_id=p_product_id
     and m.pack_size_detected is not distinct from p_pack_size
     and m.confidence>=0.85 and m.times_used>=3
   returning m.* into result;
   if not found then raise exception 'El alias cambió o fue eliminado. Actualizá la memoria del proveedor.'; end if;
   return result;
 end if;
 insert into public.retail_supplier_mappings as existing
   (store_id,supplier,invoice_text,product_id,product_name,pack_size_detected,confidence)
 values(p_store,retail_private.normalize_supplier(p_supplier),btrim(p_invoice_text),p_product_id,btrim(p_product_name),p_pack_size,p_confidence)
 on conflict(store_id,supplier,invoice_text) do update set
   times_used=case when existing.product_id=excluded.product_id and existing.pack_size_detected is not distinct from excluded.pack_size_detected
     then existing.times_used+1 else 1 end,
   product_id=excluded.product_id,product_name=excluded.product_name,pack_size_detected=excluded.pack_size_detected,
   confidence=excluded.confidence,last_used_at=now()
 returning * into result;
 return result;
end;
$$;

create policy member_delete on public.retail_supplier_mappings for delete to authenticated
 using(retail_private.role_for(store_id) is not null);
grant delete on public.retail_supplier_mappings to authenticated;
create function public.retail_delete_supplier_mapping(p_store uuid,p_supplier text,p_mapping_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 delete from public.retail_supplier_mappings where id=p_mapping_id and store_id=p_store
   and supplier=retail_private.normalize_supplier(p_supplier);
end;
$$;
revoke all on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) from public,anon;
revoke all on function public.retail_delete_supplier_mapping(uuid,text,uuid) from public,anon;
grant execute on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) to authenticated;
grant execute on function public.retail_delete_supplier_mapping(uuid,text,uuid) to authenticated;
$retail_source_1adc3ce4519abbb2$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610200002_supplier_alias_usage.sql','1adc3ce4519abbb20c3436578bff8de5d9111f08abda7e198639468bd77e15c4','schema');
 end if;
end;

-- 18/84: 202610200003_product_expiry.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610200003_product_expiry.sql') then
  raise notice 'Aplicando 202610200003_product_expiry.sql';
  execute replace($retail_source_77d1f8c0f62da284$
alter table public.retail_products
  add column if not exists expiry_date date default null,
  add column if not exists last_restocked_at timestamptz default null;

$retail_source_77d1f8c0f62da284$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610200003_product_expiry.sql','77d1f8c0f62da28481839205c638d09ab8586267acd2b86fb97f44c812072a87','schema');
 end if;
end;

-- 19/84: 202610210001_ledger_routing.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210001_ledger_routing.sql') then
  raise notice 'Aplicando 202610210001_ledger_routing.sql';
  execute replace($retail_source_f19dc026535013c8$
alter table public.retail_ledgers add column payment_methods text[] not null default '{}'
 check(payment_methods <@ array['Efectivo','QR','Transferencia','Debito','Credito','Mixto']::text[]);
-- Each method has at most one destination per store, including direct inserts.
create unique index retail_ledger_cash_rule on public.retail_ledgers(store_id) where 'Efectivo'=any(payment_methods);
create unique index retail_ledger_qr_rule on public.retail_ledgers(store_id) where 'QR'=any(payment_methods);
create unique index retail_ledger_transfer_rule on public.retail_ledgers(store_id) where 'Transferencia'=any(payment_methods);
create unique index retail_ledger_debit_rule on public.retail_ledgers(store_id) where 'Debito'=any(payment_methods);
create unique index retail_ledger_credit_rule on public.retail_ledgers(store_id) where 'Credito'=any(payment_methods);
create unique index retail_ledger_mixed_rule on public.retail_ledgers(store_id) where 'Mixto'=any(payment_methods);

create function public.retail_save_ledger_routing(p_store uuid,p_default uuid,p_rules jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede configurar los registros'; end if;
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=p_default and active) then raise exception 'Elegí un registro principal activo'; end if;
 if jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Reglas inválidas'; end if;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   if entry.key not in ('Efectivo','QR','Transferencia','Debito','Credito','Mixto') or entry.value is null then raise exception 'Medio de pago inválido'; end if;
   if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=entry.value::uuid and active) then raise exception 'El registro elegido ya no está activo'; end if;
 end loop;
 update public.retail_ledgers set is_default=false,payment_methods='{}' where store_id=p_store;
 update public.retail_ledgers set is_default=true where store_id=p_store and id=p_default;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   update public.retail_ledgers set payment_methods=array_append(payment_methods,entry.key) where store_id=p_store and id=entry.value::uuid;
 end loop;
end $$;

-- Opt-in setup for existing stores: retain all other ledgers and historical sales.
create function public.retail_prepare_sales_ledgers(p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
declare general_id uuid; tests_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede preparar los registros'; end if;
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 insert into public.retail_ledgers(store_id,name) values(p_store,'General')
 on conflict(store_id,name) do update set active=true;
 select id into tests_id from public.retail_ledgers where store_id=p_store and name='Pruebas';
 if tests_id is null then
   select id into tests_id from public.retail_ledgers where store_id=p_store and name='Otras ventas' and not is_default;
   if tests_id is not null then
     update public.retail_ledgers set name='Pruebas',active=true where id=tests_id;
   else
     insert into public.retail_ledgers(store_id,name) values(p_store,'Pruebas');
   end if;
 else
   update public.retail_ledgers set active=true where id=tests_id;
 end if;
 select id into general_id from public.retail_ledgers where store_id=p_store and name='General';
 update public.retail_ledgers set is_default=false where store_id=p_store and is_default;
 update public.retail_ledgers set is_default=true where id=general_id;
end $$;

-- The same bootstrap as before; only the second new-store ledger's label changes.
create or replace function retail_private.initialize_location() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.retail_branches(store_id,name,is_default) values(new.id,'Principal',true);
 insert into public.retail_ledgers(store_id,name,is_default) values(new.id,'General',true);
 insert into public.retail_ledgers(store_id,name) values(new.id,'Pruebas');
 return new;
end $$;

create table public.retail_sale_ledger_changes (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 sale_id uuid not null, from_ledger uuid not null, to_ledger uuid not null,
 from_name text not null, to_name text not null,
 changed_by uuid not null references auth.users(id), changed_at timestamptz not null default now(),
 foreign key(store_id,sale_id) references public.retail_sales(store_id,id),
 foreign key(store_id,from_ledger) references public.retail_ledgers(store_id,id),
 foreign key(store_id,to_ledger) references public.retail_ledgers(store_id,id)
);
create index retail_sale_ledger_history on public.retail_sale_ledger_changes(store_id,sale_id,changed_at,id);
alter table public.retail_sale_ledger_changes enable row level security;
revoke all on public.retail_sale_ledger_changes from public,anon,authenticated;
grant select on public.retail_sale_ledger_changes to authenticated;
create policy sale_ledger_history_read on public.retail_sale_ledger_changes for select to authenticated using (
 retail_private.role_for(store_id) in ('owner','admin') or
 (retail_private.role_for(store_id)='cashier' and exists(select 1 from public.retail_sales s where s.id=sale_id and s.store_id=retail_sale_ledger_changes.store_id and s.created_by=auth.uid()))
);

create function public.retail_move_sale_ledger(p_store uuid,p_sale uuid,p_target uuid,p_expected uuid,p_request uuid)
returns public.retail_sales language plpgsql security definer set search_path='' as $$
declare s public.retail_sales; destination public.retail_ledgers; previous public.retail_sale_ledger_changes; actor_role text;
begin
 if p_store is null or p_sale is null or p_target is null or p_expected is null or p_request is null then raise exception 'Faltan datos para cambiar el registro'; end if;
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 select * into s from public.retail_sales where store_id=p_store and id=p_sale;
 if s.id is null or actor_role is null or (actor_role='cashier' and s.created_by<>auth.uid()) then raise exception 'No tenés acceso a esta venta'; end if;
 select * into previous from public.retail_sale_ledger_changes where id=p_request;
 if found then
   if previous.store_id<>p_store or previous.sale_id<>p_sale or previous.to_ledger<>p_target or previous.from_ledger<>p_expected or previous.changed_by<>auth.uid() then raise exception 'La solicitud corresponde a otro cambio'; end if;
   return s;
 end if;
 if actor_role='cashier' then
   perform retail_private.check_shift(s.shift_id);
 else
   perform 1 from public.retail_shifts where id=s.shift_id for update;
 end if;
 select * into s from public.retail_sales where store_id=p_store and id=p_sale for update;
 -- Lock both ledger FK targets in the same order as routing configuration.
 -- Locking only the destination can deadlock when the audit insert locks the source.
 perform id from public.retail_ledgers where store_id=p_store and id in (s.ledger_id,p_target) order by id for share;
 select * into destination from public.retail_ledgers where store_id=p_store and id=p_target and active for share;
 if not found then raise exception 'El registro de destino ya no está activo'; end if;
 if s.ledger_id=p_target then return s; end if;
 if s.ledger_id is distinct from p_expected then raise exception 'La venta cambió de registro en otro dispositivo. Actualizá y volvé a elegir'; end if;
 insert into public.retail_sale_ledger_changes(id,store_id,sale_id,from_ledger,to_ledger,from_name,to_name,changed_by)
 values(p_request,p_store,p_sale,s.ledger_id,p_target,s.ledger_name,destination.name,auth.uid());
 update public.retail_sales set ledger_id=p_target,ledger_name=destination.name where id=p_sale returning * into s;
 return s;
end $$;
revoke all on function public.retail_save_ledger_routing(uuid,uuid,jsonb),public.retail_prepare_sales_ledgers(uuid),public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.retail_save_ledger_routing(uuid,uuid,jsonb),public.retail_prepare_sales_ledgers(uuid),public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) to authenticated;
$retail_source_f19dc026535013c8$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210001_ledger_routing.sql','f19dc026535013c80519da077ca4de832b6706cf7e885ffbc1b0e31185591d7e','schema');
 end if;
end;

-- 20/84: 202610210002_staff_profiles.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210002_staff_profiles.sql') then
  raise notice 'Aplicando 202610210002_staff_profiles.sql';
  execute replace($retail_source_ca6e73c2c8993bc2$
alter table public.retail_members drop constraint retail_members_role_check;
alter table public.retail_members add constraint retail_members_role_check check(role in ('owner','admin','supervisor','cashier'));
alter table public.retail_invitations drop constraint retail_invitations_role_check;
alter table public.retail_invitations add constraint retail_invitations_role_check check(role in ('admin','supervisor','cashier'));
create table public.retail_permission_profiles (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 80),
 base_role text not null check(base_role in ('cashier','supervisor')),
 permissions text[] not null check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']::text[]),
 unique(store_id,id),unique(store_id,name)
);
alter table public.retail_members add column profile_id uuid,
 add foreign key(store_id,profile_id) references public.retail_permission_profiles(store_id,id);
alter table public.retail_invitations add column profile_id uuid,
 add foreign key(store_id,profile_id) references public.retail_permission_profiles(store_id,id);

-- Legacy administrative RPCs must never infer administrative authority for supervisors.
-- Actual role is still read directly from membership by the client/team RPC.
create or replace function retail_private.role_for(p_store uuid) returns text
language sql stable security definer set search_path='' as $$
 select case when role='supervisor' then 'cashier' else role end from public.retail_members
 where store_id=p_store and user_id=(select auth.uid());
$$;
create function retail_private.has_permission(p_store uuid,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select case when m.role in ('owner','admin') then true
 when m.profile_id is not null then p_action=any(p.permissions)
 else p_action=any(case when m.role='supervisor'
 then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']
 else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end) end
 from public.retail_members m left join public.retail_permission_profiles p on p.id=m.profile_id and p.store_id=m.store_id
 where m.store_id=p_store and m.user_id=auth.uid()),false);
$$;
revoke all on function retail_private.has_permission(uuid,text) from public,anon;
grant execute on function retail_private.has_permission(uuid,text) to authenticated;
create function public.retail_permissions(p_store uuid) returns text[]
language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']) action
 where retail_private.has_permission(p_store,action);
$$;

alter table public.retail_permission_profiles enable row level security;
revoke all on public.retail_permission_profiles from public,anon,authenticated;
grant select,insert on public.retail_permission_profiles to authenticated;
grant update(name,permissions) on public.retail_permission_profiles to authenticated;
create policy profile_read on public.retail_permission_profiles for select to authenticated using(retail_private.role_for(store_id) is not null);
create policy profile_create on public.retail_permission_profiles for insert to authenticated with check(retail_private.role_for(store_id) in ('owner','admin'));
create policy profile_update on public.retail_permission_profiles for update to authenticated using(retail_private.role_for(store_id) in ('owner','admin')) with check(retail_private.role_for(store_id) in ('owner','admin'));
create function retail_private.validate_staff_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.profile_id is not null and not exists(select 1 from public.retail_permission_profiles p where p.id=new.profile_id and p.store_id=new.store_id and p.base_role=new.role) then
   raise exception 'El perfil no corresponde al rol y comercio elegidos';
 end if;
 return new;
end $$;
create trigger retail_member_profile before insert or update of role,profile_id,store_id on public.retail_members for each row execute function retail_private.validate_staff_profile();
create trigger retail_invitation_profile before insert or update of role,profile_id,store_id on public.retail_invitations for each row execute function retail_private.validate_staff_profile();
revoke all on function retail_private.validate_staff_profile() from public,anon,authenticated;

create function public.retail_set_staff_profile(p_store uuid,p_target uuid,p_role text,p_profile uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo administración puede asignar perfiles'; end if;
 if p_role is null or p_role not in ('cashier','supervisor') then raise exception 'Elegí Cajero o Supervisor'; end if;
 if p_pending then
   select role into old_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
   select role into old_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if old_role is null or old_role not in ('cashier','supervisor') then raise exception 'Solo se pueden cambiar perfiles de cajeros y supervisores'; end if;
 if old_role<>p_role and not p_pending and exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de cambiar su rol'; end if;
 if p_pending then
   update public.retail_invitations set role=p_role,profile_id=p_profile where store_id=p_store and id=p_target;
 else
   update public.retail_members set role=p_role,profile_id=p_profile where store_id=p_store and user_id=p_target;
 end if;
end $$;

drop function public.retail_team(uuid);
create function public.retail_team(p_store uuid) returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid,profile_id uuid)
language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para consultar el equipo'; end if;
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id,m.profile_id from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;
drop policy admin_read_cashier_invites on public.retail_invitations;
create policy admin_read_cashier_invites on public.retail_invitations for select to authenticated using(retail_private.role_for(store_id)='admin' and role in ('cashier','supervisor'));

create or replace function public.retail_accept_invitations() returns integer language plpgsql security definer set search_path='' as $$
declare v_email text; v_count integer;
begin
 select lower(email) into v_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if v_email is null then return 0; end if;
 perform 1 from public.retail_invitations where email=v_email order by id for update;
 insert into public.retail_members(store_id,user_id,role,branch_id,register_id,profile_id)
 select store_id,auth.uid(),role,branch_id,register_id,profile_id from public.retail_invitations where email=v_email on conflict(store_id,user_id) do nothing;
 get diagnostics v_count=row_count;
 delete from public.retail_invitations where email=v_email;
 return v_count;
end $$;

create or replace function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Sin permiso para asignar personal'; end if;
 if p_pending then select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update; end if;
 if v_role is null or v_role not in ('cashier','supervisor') then raise exception 'Solo se pueden asignar cajeros o supervisores de este comercio'; end if;
 v_branch:=p_branch;
 if p_register is not null then
   select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
   if v_branch is null then raise exception 'Caja no disponible'; end if;
   if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
   if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then raise exception 'La persona debe cerrar su turno antes de cambiar a otra sucursal o caja'; end if;
   update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

-- Guard writes at the table boundary: REST, RPC and offline replay obey the same profile.
create function retail_private.require_permission(p_store uuid,p_action text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform 1 from public.retail_permission_profiles p join public.retail_members m on m.profile_id=p.id and m.store_id=p.store_id where m.store_id=p_store and m.user_id=auth.uid() for share of p;
 if not retail_private.has_permission(p_store,p_action) then raise exception 'Tu perfil no permite esta acción. Pedile a administración que revise tus permisos' using errcode='42501'; end if;
end $$;
create function retail_private.guard_staff_action() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='retail_sales' then
   if tg_op='INSERT' then perform retail_private.require_permission(new.store_id,'sell');
   elsif new.ledger_id is distinct from old.ledger_id then perform retail_private.require_permission(new.store_id,'move_sale_ledger'); end if;
 elsif tg_table_name='retail_movements' then
   perform retail_private.require_permission(new.store_id,case when new.type='INGRESO' then 'cash_income' else 'cash_withdrawal' end);
 else perform retail_private.require_permission(new.store_id,'submit_remito'); end if;
 return new;
end $$;
create trigger retail_sale_profile_guard before insert or update of ledger_id on public.retail_sales for each row execute function retail_private.guard_staff_action();
create trigger retail_movement_profile_guard before insert on public.retail_movements for each row execute function retail_private.guard_staff_action();
create trigger retail_remito_profile_guard before insert on public.retail_pending_replenishments for each row execute function retail_private.guard_staff_action();
revoke all on function retail_private.require_permission(uuid,text),retail_private.guard_staff_action() from public,anon,authenticated;

create function retail_private.can_review_sales(p_store uuid,p_shift uuid) returns boolean language sql stable security definer set search_path='' as $$
 select retail_private.has_permission(p_store,'view_sales') and exists(select 1 from public.retail_shifts s where s.id=p_shift and s.store_id=p_store and retail_private.can_use_register(p_store,s.register_id));
$$;
revoke all on function retail_private.can_review_sales(uuid,uuid) from public,anon;
grant execute on function retail_private.can_review_sales(uuid,uuid) to authenticated;
create policy staff_review_sales on public.retail_sales for select to authenticated using(retail_private.can_review_sales(store_id,shift_id));
revoke all on function public.retail_permissions(uuid),public.retail_set_staff_profile(uuid,uuid,text,uuid,boolean),public.retail_team(uuid) from public,anon;
grant execute on function public.retail_permissions(uuid),public.retail_set_staff_profile(uuid,uuid,text,uuid,boolean),public.retail_team(uuid) to authenticated;
$retail_source_ca6e73c2c8993bc2$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210002_staff_profiles.sql','ca6e73c2c8993bc2390e2f91d48e9a0d82e60e3ae1be9613297f6ba667809a0e','schema');
 end if;
end;

-- 21/84: 202610210003_ledger_lock_order.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210003_ledger_lock_order.sql') then
  raise notice 'Aplicando 202610210003_ledger_lock_order.sql';
  execute replace($retail_source_b9f318a08145ad1e$
-- Forward correction for environments that already applied ledger routing.
-- Keep the RPC contract, authorization and audit/idempotency behavior intact.
create or replace function public.retail_move_sale_ledger(p_store uuid,p_sale uuid,p_target uuid,p_expected uuid,p_request uuid)
returns public.retail_sales language plpgsql security definer set search_path='' as $$
declare s public.retail_sales; destination public.retail_ledgers; previous public.retail_sale_ledger_changes; actor_role text;
begin
 if p_store is null or p_sale is null or p_target is null or p_expected is null or p_request is null then raise exception 'Faltan datos para cambiar el registro'; end if;
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 select * into s from public.retail_sales where store_id=p_store and id=p_sale;
 if s.id is null or actor_role is null or (actor_role='cashier' and s.created_by<>auth.uid()) then raise exception 'No tenés acceso a esta venta'; end if;
 select * into previous from public.retail_sale_ledger_changes where id=p_request;
 if found then
   if previous.store_id<>p_store or previous.sale_id<>p_sale or previous.to_ledger<>p_target or previous.from_ledger<>p_expected or previous.changed_by<>auth.uid() then raise exception 'La solicitud corresponde a otro cambio'; end if;
   return s;
 end if;
 if actor_role='cashier' then
   perform retail_private.check_shift(s.shift_id);
 else
   perform 1 from public.retail_shifts where id=s.shift_id for update;
 end if;
 select * into s from public.retail_sales where store_id=p_store and id=p_sale for update;
 -- Both the audit's source and destination foreign keys need ledger row locks.
 -- Taking them together, in UUID order, avoids a cycle with configuration saves.
 perform id from public.retail_ledgers where store_id=p_store and id in (s.ledger_id,p_target) order by id for share;
 select * into destination from public.retail_ledgers where store_id=p_store and id=p_target and active for share;
 if not found then raise exception 'El registro de destino ya no está activo'; end if;
 if s.ledger_id=p_target then return s; end if;
 if s.ledger_id is distinct from p_expected then raise exception 'La venta cambió de registro en otro dispositivo. Actualizá y volvé a elegir'; end if;
 insert into public.retail_sale_ledger_changes(id,store_id,sale_id,from_ledger,to_ledger,from_name,to_name,changed_by)
 values(p_request,p_store,p_sale,s.ledger_id,p_target,s.ledger_name,destination.name,auth.uid());
 update public.retail_sales set ledger_id=p_target,ledger_name=destination.name where id=p_sale returning * into s;
 return s;
end $$;
revoke all on function public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) from public,anon;
grant execute on function public.retail_move_sale_ledger(uuid,uuid,uuid,uuid,uuid) to authenticated;

$retail_source_b9f318a08145ad1e$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210003_ledger_lock_order.sql','b9f318a08145ad1e1734c2afe5fc1ff04402666a69869aa0f27c4dee2abb5124','schema');
 end if;
end;

-- 22/84: 202610210004_delegated_catalog_actions.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610210004_delegated_catalog_actions.sql') then
  raise notice 'Aplicando 202610210004_delegated_catalog_actions.sql';
  execute replace($retail_source_bcfa6664c406dd00$
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check
 check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products']::text[]);
-- No profile or default role receives a new capability automatically.
create or replace function public.retail_permissions(p_store uuid) returns text[]
language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products']) action
 where retail_private.has_permission(p_store,action);
$$;

create function public.retail_update_product_price(p_store uuid,p_product uuid,p_price numeric,p_expected numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare product public.retail_products;
begin
 perform retail_private.require_permission(p_store,'edit_prices');
 if p_price is null or p_price<=0 or p_price::text in ('NaN','Infinity','-Infinity') or p_expected is null then raise exception 'Ingresá un precio válido mayor a cero'; end if;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.price=p_price then return product.id; end if;
 if product.price is distinct from p_expected then raise exception 'El precio cambió en otro dispositivo. Actualizá y revisalo antes de guardar'; end if;
 update public.retail_products set price=p_price where id=product.id;
 return product.id;
end $$;

create or replace function public.retail_save_quick_products(p_store uuid,p_branch uuid,p_products uuid[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_quick_products');
 perform 1 from public.retail_branches where id=p_branch and store_id=p_store for update;
 if not found then raise exception 'Sucursal no disponible'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') and not exists(
   select 1 from public.retail_registers r where r.store_id=p_store and r.branch_id=p_branch and r.active and retail_private.can_use_register(p_store,r.id)
 ) then raise exception 'No tenés una caja asignada en esta sucursal'; end if;
 if p_products is null or cardinality(p_products)>20 or
  (select count(distinct id) from unnest(p_products) id)<>cardinality(p_products) or
  exists(select 1 from unnest(p_products) as selected(product_id) where not exists(select 1 from public.retail_products p where p.id=selected.product_id and p.store_id=p_store and p.active)) then raise exception 'Elegí hasta 20 productos distintos de este comercio'; end if;
 delete from public.retail_quick_products where branch_id=p_branch;
 insert into public.retail_quick_products(store_id,branch_id,product_id,position) select p_store,p_branch,id,n-1 from unnest(p_products) with ordinality as t(id,n);
end $$;

-- Existing durable operation contract/receipts and deterministic product lock order.
-- Only stock authorization expands; non-administrators can add units, not remove or re-cost them.
create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  perform retail_private.require_permission(v_store,'replenish_stock');
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   if retail_private.role_for(v_store) not in ('owner','admin') and (v_delta<=0 or v_cost is not null) then raise exception 'Tu permiso permite sumar stock sin modificar costos'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost),
     last_restocked_at=case when v_delta>0 then greatest(coalesce(last_restocked_at,v_at),v_at) else last_restocked_at end
     where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
revoke all on function public.retail_update_product_price(uuid,uuid,numeric,numeric),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_sync_operation(jsonb) from public,anon;
grant execute on function public.retail_update_product_price(uuid,uuid,numeric,numeric),public.retail_save_quick_products(uuid,uuid,uuid[]),public.retail_sync_operation(jsonb) to authenticated;
$retail_source_bcfa6664c406dd00$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610210004_delegated_catalog_actions.sql','bcfa6664c406dd0074ba93d0bbb367c1c212c5e9285e703583616519f163628e','schema');
 end if;
end;

-- 23/84: 202610220001_product_compositions.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220001_product_compositions.sql') then
  raise notice 'Aplicando 202610220001_product_compositions.sql';
  execute replace($retail_source_ef088735e7a84900$
alter table public.retail_products add column if not exists stock_components jsonb not null default '[]'::jsonb;
alter table public.retail_products add constraint retail_product_components_array
 check(jsonb_typeof(stock_components)='array' and jsonb_array_length(stock_components)<=30);

-- No UPDATE privilege is granted for this column: configuration goes through the RPC.
create or replace function retail_private.validate_product_composition() returns trigger
language plpgsql security definer set search_path='' as $$
declare part jsonb; source public.retail_products;
begin
 if tg_op='DELETE' then
  if exists(select 1 from public.retail_stores where id=old.store_id) and exists(
   select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=old.store_id and c->>'product_id'=old.id::text) then
   raise exception 'El producto es componente de otro producto. Desvinculalo antes de eliminarlo';
  end if;
  return old;
 end if;
 if jsonb_typeof(new.stock_components) is distinct from 'array' or jsonb_array_length(new.stock_components)>30 then raise exception 'Composición inválida'; end if;
 if tg_op='INSERT' and jsonb_array_length(new.stock_components)>0 then raise exception 'Creá el producto sin stock y luego configurá su composición'; end if;
 if jsonb_array_length(new.stock_components)>0 then
  if new.stock<>0 then raise exception 'Reponé los componentes: este producto no tiene stock propio'; end if;
  if (select count(distinct c->>'product_id') from jsonb_array_elements(new.stock_components) c)<>jsonb_array_length(new.stock_components) then raise exception 'No repitas componentes'; end if;
  for part in select value from jsonb_array_elements(new.stock_components) loop
   if coalesce(part->>'quantity','')!~'^[1-9][0-9]{0,6}$' or (part->>'quantity')::integer>1000000 then raise exception 'Ingresá unidades enteras entre 1 y 1000000'; end if;
   select * into source from public.retail_products where store_id=new.store_id and id=(part->>'product_id')::uuid and active;
   if not found or source.id=new.id or jsonb_array_length(source.stock_components)>0 then raise exception 'Elegí componentes activos con stock propio del mismo comercio'; end if;
  end loop;
  if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=new.store_id and p.active and c->>'product_id'=new.id::text) then raise exception 'Este producto ya es componente de otro. No se permiten composiciones anidadas'; end if;
 end if;
 if not new.active and exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=new.store_id and p.active and c->>'product_id'=new.id::text) then raise exception 'Antes de archivar, quitá el producto de las composiciones activas'; end if;
 return new;
end $$;
revoke all on function retail_private.validate_product_composition() from public,anon,authenticated;
create trigger retail_validate_product_composition before insert or update of stock_components,stock,active or delete on public.retail_products
 for each row execute function retail_private.validate_product_composition();

create or replace function public.retail_save_product_composition(p_store uuid,p_product uuid,p_components jsonb,p_expected jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare product public.retail_products; normalized jsonb; previous jsonb;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 if retail_private.role_for(p_store) not in ('owner','admin') or retail_private.role_for(p_store) is null then raise exception 'Solo administración puede configurar composiciones'; end if;
 if jsonb_typeof(p_components) is distinct from 'array' or jsonb_array_length(p_components)>30 or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Composición inválida'; end if;
 -- Configuration and checkout take this lock BEFORE product locks. No nested recipes.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store and
  (id=p_product or id in(select (c->>'product_id')::uuid from jsonb_array_elements(p_components) c)) order by id for update;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active;
 if not found then raise exception 'Producto no disponible'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('product_id',((c->>'product_id')::uuid)::text,'quantity',(c->>'quantity')::integer) order by (c->>'product_id')::uuid),'[]'::jsonb) into normalized from jsonb_array_elements(p_components) c;
 select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into previous from jsonb_array_elements(p_expected) c;
 if product.stock_components=normalized then return; end if;
 if product.stock_components is distinct from previous then raise exception 'La composición cambió en otro dispositivo. Actualizá el catálogo antes de reintentar'; end if;
 if jsonb_array_length(product.stock_components)=0 and product.stock<>0 then raise exception 'El producto tiene stock propio. Creá otro producto con stock 0; no se trasladan existencias automáticamente'; end if;
 update public.retail_products set stock_components=normalized where id=p_product;
end $$;
revoke all on function public.retail_save_product_composition(uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.retail_save_product_composition(uuid,uuid,jsonb,jsonb) to authenticated;

-- Replaces only stock consumption in the existing checkout contract. Price-list,
-- ledger, payment, permission and margin-snapshot triggers remain in force.
create or replace function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts; p public.retail_products; component public.retail_products; part jsonb; item jsonb; v_qty integer; v_units bigint; v_price numeric; v_name text;
 v_total numeric:=0; v_items jsonb:='[]'::jsonb; v_existing public.retail_sales; v_list public.retail_price_lists; v_ledger public.retail_ledgers; v_branch public.retail_branches; v_register public.retail_registers; v_expected numeric; v_parts jsonb; v_cash numeric; v_sum numeric; v_methods integer; v_snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into v_existing from public.retail_sales where id=p_request;
 if found then
  if v_existing.created_by<>auth.uid() or v_existing.shift_id<>p_shift or retail_private.role_for(v_existing.store_id) is null then raise exception 'Solicitud no válida'; end if;
  if v_existing.price_list_id is distinct from p_price_list or (p_ledger is not null and v_existing.ledger_id<>p_ledger) then raise exception 'La solicitud ya fue usada con otra lista o registro'; end if;
  return v_existing.id;
 end if;
 s:=retail_private.check_shift(p_shift);
 select * into v_register from public.retail_registers where id=s.register_id;
 select * into v_branch from public.retail_branches where id=v_register.branch_id;
 select * into v_ledger from public.retail_ledgers where store_id=s.store_id and active and ((p_ledger is null and is_default) or id=p_ledger) for share;
 if not found then raise exception 'Registro de ventas no disponible'; end if;
 if p_price_list is not null then
  select * into v_list from public.retail_price_lists where id=p_price_list and store_id=s.store_id and active for share;
  if not found then raise exception 'Lista de precios no disponible'; end if;
 end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito') then raise exception 'Medio de pago inválido'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pedido inválido'; end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>300 then raise exception 'Pedido vacío o demasiado grande'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||s.store_id::text,0));
 -- Lock sold SKUs and their physical components together in UUID order.
 perform id from public.retail_products where store_id=s.store_id and id in (
  select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null
  union select (c->>'product_id')::uuid from public.retail_products sold cross join lateral jsonb_array_elements(sold.stock_components) c
   where sold.store_id=s.store_id and sold.id in(select (x->>'product_id')::uuid from jsonb_array_elements(p_items) x where x->>'product_id' is not null)
 ) order by id for update;
 for item in select value from jsonb_array_elements(p_items) loop
  if (item->>'qty') is null or (item->>'qty')!~'^[1-9][0-9]{0,5}$' then raise exception 'Cantidad inválida'; end if;
  v_qty:=(item->>'qty')::integer; v_snapshot:='[]'::jsonb;
  if item->>'product_id' is not null then
   select * into p from public.retail_products where id=(item->>'product_id')::uuid and store_id=s.store_id and active;
   if not found then raise exception 'Producto no disponible en este comercio'; end if;
   -- Older clients may sell ordinary products, but must refresh to sell a recipe.
   if jsonb_array_length(p.stock_components)>0 or item ? 'stock_components' then
    if jsonb_typeof(item->'stock_components') is distinct from 'array' then raise exception 'Actualizá la app y el catálogo para vender este combo o presentación'; end if;
    select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into v_snapshot from jsonb_array_elements(item->'stock_components') c;
    if v_snapshot is distinct from p.stock_components then raise exception 'Cambió la composición de %. Actualizá el catálogo y volvé a agregarlo',p.name; end if;
   end if;
   v_expected:=p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected:=coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;
   if (item->>'unit_price')::numeric is distinct from v_expected then raise exception 'Cambió el precio de %. Actualizá el catálogo y volvé a agregarlo.',p.name; end if;
   v_price:=v_expected; v_name:=p.name;
   if jsonb_array_length(p.stock_components)=0 then
    if p.stock<v_qty then raise exception 'Stock insuficiente: %',p.name; end if;
    update public.retail_products set stock=stock-v_qty where id=p.id;
   else
    for part in select value from jsonb_array_elements(p.stock_components) loop
     select * into component from public.retail_products where id=(part->>'product_id')::uuid and store_id=s.store_id and active;
     if not found or jsonb_array_length(component.stock_components)>0 then raise exception 'Componente no disponible. Revisá la composición de %',p.name; end if;
     v_units:=v_qty::bigint*(part->>'quantity')::bigint;
     if component.stock<v_units then raise exception 'Stock insuficiente de % para vender %',component.name,p.name; end if;
     update public.retail_products set stock=stock-v_units::integer where id=component.id;
    end loop;
   end if;
  else
   v_price:=(item->>'unit_price')::numeric; v_name:=trim(item->>'name');
   if v_name is null or length(v_name) not between 1 and 160 then raise exception 'Descripción manual inválida'; end if;
  end if;
  if v_price is null or v_price<=0 or v_price>999999999999.99 or v_price::text in ('NaN','Infinity','-Infinity') then raise exception 'Precio inválido'; end if;
  v_price:=round(v_price,2); v_total:=v_total+v_qty*v_price;
  v_items:=v_items || jsonb_build_array(jsonb_build_object('productId',item->>'product_id','name',v_name,'qty',v_qty,'unitPrice',v_price,'subtotal',v_price*v_qty,'stockComponents',v_snapshot));
 end loop;
 if p_paid is null or p_paid::text in ('NaN','Infinity','-Infinity') or (p_method='Efectivo' and p_paid<v_total) then raise exception 'Importe recibido insuficiente o inválido'; end if;
 v_parts:=coalesce(p_payments,jsonb_build_array(jsonb_build_object('method',p_method,'amount',v_total)));
 if jsonb_typeof(v_parts) is distinct from 'array' or jsonb_array_length(v_parts) not between 1 and 5 then raise exception 'Desglose de pago inválido'; end if;
 if exists(select 1 from jsonb_array_elements(v_parts) x where coalesce(x->>'method','') not in ('Efectivo','QR','Transferencia','Debito','Credito') or (x->>'amount') is null or (x->>'amount')::numeric<=0 or (x->>'amount')::numeric::text in ('NaN','Infinity','-Infinity') or round((x->>'amount')::numeric,2)<>(x->>'amount')::numeric) then raise exception 'Importe o medio de pago inválido'; end if;
 select sum((x->>'amount')::numeric),coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Efectivo'),0),count(distinct x->>'method') into v_sum,v_cash,v_methods from jsonb_array_elements(v_parts) x;
 if v_sum<>v_total or v_methods<>jsonb_array_length(v_parts) or (p_method='Mixto' and v_methods<2) or (p_method<>'Mixto' and (v_methods<>1 or v_parts->0->>'method'<>p_method)) then raise exception 'El desglose debe coincidir con el total y el medio elegido'; end if;
 insert into public.retail_sales(id,store_id,shift_id,created_by,payment_method,total,amount_paid,change,items,branch_id,branch_name,register_name,price_list_id,price_list_name,ledger_id,ledger_name,payments,cash_amount)
 values(p_request,s.store_id,s.id,auth.uid(),p_method,v_total,case when p_method='Efectivo' then p_paid else v_total end,case when p_method='Efectivo' then p_paid-v_total else 0 end,v_items,v_branch.id,v_branch.name,v_register.name,p_price_list,coalesce(v_list.name,'Lista madre'),v_ledger.id,v_ledger.name,v_parts,v_cash);
 return p_request;
end $$;
revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_ef088735e7a84900$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220001_product_compositions.sql','ef088735e7a849006d0960d0e16decd98e257bb432da68ebd2e0d02618f93c84','schema');
 end if;
end;

-- 24/84: 202610220002_loose_cigarettes.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220002_loose_cigarettes.sql') then
  raise notice 'Aplicando 202610220002_loose_cigarettes.sql';
  execute replace($retail_source_e943d579b3d7ed4e$
create table public.retail_loose_unit_conversions (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 packet_id uuid not null,
 unit_product_id uuid not null,
 units_per_packet integer not null check(units_per_packet between 2 and 1000),
 packet_stock integer not null check(packet_stock>=0),
 unit_stock integer not null check(unit_stock>=0),
 payload jsonb not null,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 unique(store_id,packet_id),
 foreign key(store_id,packet_id) references public.retail_products(store_id,id),
 foreign key(store_id,unit_product_id) references public.retail_products(store_id,id),
 check(packet_id<>unit_product_id)
);
alter table public.retail_loose_unit_conversions enable row level security;
create policy manager_read on public.retail_loose_unit_conversions for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_loose_unit_conversions from public,anon,authenticated;
grant select on public.retail_loose_unit_conversions to authenticated;

create or replace function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare packet public.retail_products; unit_product public.retail_products; previous public.retail_loose_unit_conversions;
 actor_role text; per_packet integer; target_id uuid; total_units bigint; unit_price numeric; unit_cost numeric; unit_name text; unit_code text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Solo administración puede convertir atados en cigarrillos sueltos'; end if;
 if p_request is null or p_store is null or p_packet is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Faltan datos para convertir el atado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_loose_unit_conversions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.packet_id<>p_packet or previous.created_by<>auth.uid() or previous.payload<>p_data then raise exception 'La solicitud corresponde a otra conversión'; end if;
  return previous.unit_product_id;
 end if;
 if coalesce(p_data->>'units','')!~'^[1-9][0-9]{0,3}$' then raise exception 'Indicá cuántos cigarrillos trae el atado'; end if;
 per_packet:=(p_data->>'units')::integer;
 if per_packet not between 2 and 1000 then raise exception 'Ingresá entre 2 y 1000 cigarrillos por atado'; end if;
 unit_price:=(p_data->>'price')::numeric; unit_cost:=(p_data->>'cost')::numeric;
 if unit_price is null or unit_price<=0 or unit_price>999999999999.99 or unit_price::text in ('NaN','Infinity','-Infinity') or unit_price<>round(unit_price,2) then raise exception 'Revisá el precio por cigarrillo'; end if;
 if unit_cost is null or unit_cost<0 or unit_cost>999999999999.99 or unit_cost::text in ('NaN','Infinity','-Infinity') or unit_cost<>round(unit_cost,2) then raise exception 'Revisá el costo por cigarrillo'; end if;
 target_id:=nullif(p_data->>'target','')::uuid;
 if target_id=p_packet then raise exception 'El atado y el suelto deben ser productos distintos'; end if;
 -- Same order as recipe configuration and checkout. This operation may reverse an
 -- existing incorrect unit -> packet recipe, so lock the store's products in order.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select * into packet from public.retail_products where store_id=p_store and id=p_packet and active;
 if not found then raise exception 'El atado ya no está disponible'; end if;
 if exists(select 1 from public.retail_loose_unit_conversions where store_id=p_store and packet_id=p_packet) then raise exception 'Este atado ya fue convertido. Actualizá el catálogo y usá su producto suelto'; end if;
 if jsonb_array_length(packet.stock_components)<>0 then raise exception 'Abrí este flujo desde el atado que tiene stock propio, no desde el cigarrillo suelto'; end if;
 if jsonb_build_object('name',packet.name,'code',packet.code,'stock',packet.stock,'cost',packet.cost,'price',packet.price,'components',packet.stock_components) is distinct from p_data->'expected_packet' then raise exception 'Cambió el atado o sus existencias. Actualizá el catálogo y revisá la conversión'; end if;
 total_units:=packet.stock::bigint*per_packet;
 if total_units>2147483647 then raise exception 'El stock convertido supera el máximo permitido'; end if;
 if target_id is not null then
  select * into unit_product from public.retail_products where store_id=p_store and id=target_id and active;
  if not found then raise exception 'El producto suelto ya no está disponible'; end if;
  if jsonb_build_object('name',unit_product.name,'code',unit_product.code,'stock',unit_product.stock,'cost',unit_product.cost,'price',unit_product.price,'components',unit_product.stock_components) is distinct from p_data->'expected_unit' then raise exception 'Cambió el producto suelto. Actualizá el catálogo antes de reintentar'; end if;
  if unit_product.stock<>0 then raise exception 'El suelto ya tiene stock propio. Revisá las existencias para evitar contarlas dos veces'; end if;
  if jsonb_array_length(unit_product.stock_components)>0 and not
   (jsonb_array_length(unit_product.stock_components)=1 and unit_product.stock_components->0->>'product_id'=p_packet::text) then raise exception 'El suelto tiene otra composición. Elegí un producto sin stock o vinculado solamente a este atado'; end if;
 else
  unit_name:=trim(p_data->>'name'); unit_code:=trim(p_data->>'code');
  if unit_name is null or length(unit_name) not between 1 and 160 or unit_code is null or length(unit_code) not between 1 and 100 then raise exception 'Completá el nombre y código interno del suelto'; end if;
  if unit_code='MANUAL' or exists(select 1 from public.retail_products where store_id=p_store and code=unit_code) then raise exception 'El código del suelto ya está en uso. Elegí otro código interno'; end if;
  target_id:=p_request;
 end if;
 if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and p.active and p.id<>target_id and c->>'product_id'=p_packet::text) then
  raise exception 'Otros productos consumen este atado. Revisá esas composiciones antes de convertirlo';
 end if;
 if unit_product.id is null then
  insert into public.retail_products(id,store_id,category_id,code,name,price,cost,stock,min_stock,emoji,active,
   brand,supplier,supplier_code,tags,unit_type,pack_size,margin_group,expiry_date,last_restocked_at)
  values(target_id,p_store,packet.category_id,unit_code,unit_name,unit_price,unit_cost,0,
   least(2147483647,packet.min_stock::bigint*per_packet)::integer,packet.emoji,true,
   packet.brand,packet.supplier,null,packet.tags,'unit',per_packet,packet.margin_group,packet.expiry_date,packet.last_restocked_at);
 end if;
 -- Both updates, the audit and movements commit together. The unit keeps all
 -- other metadata when reusing an existing record; packet price/cost stay intact.
 update public.retail_products set stock_components='[]'::jsonb,stock=total_units::integer,
  price=unit_price,cost=unit_cost,pack_size=per_packet,unit_type='unit' where store_id=p_store and id=target_id;
 update public.retail_products set stock=0,stock_components=jsonb_build_array(jsonb_build_object('product_id',target_id::text,'quantity',per_packet))
  where store_id=p_store and id=p_packet;
 insert into public.retail_loose_unit_conversions(id,store_id,packet_id,unit_product_id,units_per_packet,packet_stock,unit_stock,payload,created_by)
 values(p_request,p_store,p_packet,target_id,per_packet,packet.stock,total_units::integer,p_data,auth.uid());
 if packet.stock>0 then
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,p_packet,p_store,auth.uid(),-packet.stock,packet.cost,now()),(p_request,target_id,p_store,auth.uid(),total_units::integer,unit_cost,now());
 end if;
 return target_id;
end $$;
revoke all on function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_e943d579b3d7ed4e$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220002_loose_cigarettes.sql','e943d579b3d7ed4e77e96ffc6c26125f7ccb84ca09dcb9a09a7dde87ed147bad','schema');
 end if;
end;

-- 25/84: 202610220003_product_deletion_history.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220003_product_deletion_history.sql') then
  raise notice 'Aplicando 202610220003_product_deletion_history.sql';
  execute replace($retail_source_458a93d670539dd4$
create table public.retail_product_deletions (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 product_id uuid not null,
 product_name text not null,
 product_code text not null,
 event_type text not null check(event_type in ('deleted','restored','prior')),
 occurred_at timestamptz,
 recorded_at timestamptz not null default now(),
 actor_id uuid references auth.users(id) on delete set null,
 actor_email text,
 reason text check(reason is null or length(reason)<=500),
 product_snapshot jsonb not null,
 request_payload jsonb,
 search_text text generated always as (product_name||' '||product_code) stored
);
create index retail_product_deletions_history on public.retail_product_deletions(store_id,recorded_at desc,id desc);
alter table public.retail_product_deletions enable row level security;
create policy manager_read on public.retail_product_deletions for select to authenticated
 using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_product_deletions from public,anon,authenticated;
grant select on public.retail_product_deletions to authenticated;

create or replace function retail_private.audit_product_deletion() returns trigger
language plpgsql security definer set search_path='' as $$
declare context jsonb; event_id uuid:=gen_random_uuid(); actor_email text; reason text; payload jsonb;
begin
 if old.active is not distinct from new.active then return new; end if;
 context:=nullif(current_setting('retail.product_deletion_context',true),'')::jsonb;
 if context->>'store_id'=new.store_id::text and context->>'product_id'=new.id::text then
  event_id:=(context->>'request_id')::uuid; reason:=context->>'reason'; payload:=context->'payload';
 end if;
 select email into actor_email from auth.users where id=auth.uid();
 insert into public.retail_product_deletions(id,store_id,product_id,product_name,product_code,event_type,occurred_at,actor_id,actor_email,reason,product_snapshot,request_payload)
 values(event_id,new.store_id,new.id,new.name,new.code,case when new.active then 'restored' else 'deleted' end,
  now(),auth.uid(),actor_email,reason,case when new.active then to_jsonb(new) else to_jsonb(old) end,payload);
 return new;
end $$;
revoke all on function retail_private.audit_product_deletion() from public,anon,authenticated;
create trigger retail_audit_product_deletion after update of active on public.retail_products
 for each row execute function retail_private.audit_product_deletion();

-- Preserve discovery of already archived records without inventing who/when.
insert into public.retail_product_deletions(store_id,product_id,product_name,product_code,event_type,product_snapshot)
 select store_id,id,name,code,'prior',to_jsonb(p) from public.retail_products p where not active;

create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 if actor_role is null or actor_role not in ('owner','admin') then raise exception 'Solo administración puede eliminar o restaurar productos'; end if;
 if p_product is null or p_request is null or p_active is null or coalesce(length(reason),0)>500 then raise exception 'Revisá el producto y el motivo (hasta 500 caracteres)'; end if;
 payload:=jsonb_build_object('active',p_active,'reason',reason,'expected',p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_product_deletions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.product_id<>p_product or previous.actor_id is distinct from auth.uid() or previous.request_payload is distinct from payload then raise exception 'La solicitud corresponde a otra acción'; end if;
  return previous.id;
 end if;
 -- Same lock order as checkout and composition configuration.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.active=p_active then
  if p_active then raise exception 'El producto ya está activo. Actualizá el historial';
  else raise exception 'El producto ya está eliminado del catálogo. Actualizá los datos'; end if;
 end if;
 if p_expected is not null and jsonb_build_object('name',product.name,'code',product.code,'stock',product.stock,'components',product.stock_components) is distinct from p_expected then
  raise exception 'El producto o su stock cambió. Actualizá el catálogo y revisá la eliminación';
 end if;
 if not p_active then
  select string_agg(name,', ') into dependencies from (
   select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=p_store and p.active and c->>'product_id'=p_product::text order by p.name limit 5
  ) names;
  if dependencies is not null then raise exception 'Se usa en: %. Quitalo de esos componentes o eliminá primero esos combos/atados',dependencies; end if;
 else
  if exists(select 1 from jsonb_array_elements(product.stock_components) c
   left join public.retail_products component on component.store_id=p_store and component.id=(c->>'product_id')::uuid
   where component.id is null or not component.active or jsonb_array_length(component.stock_components)>0) then
   raise exception 'Para restaurar este producto, restaurá primero sus componentes y revisá que tengan stock propio';
  end if;
 end if;
 perform set_config('retail.product_deletion_context',jsonb_build_object('store_id',p_store,'product_id',p_product,'request_id',p_request,'reason',reason,'payload',payload)::text,true);
 update public.retail_products set active=p_active where store_id=p_store and id=p_product;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;
revoke all on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) from public,anon;
grant execute on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_458a93d670539dd4$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220003_product_deletion_history.sql','458a93d670539dd4bfd36c3f8b4aff69042989aafdea80511ced58e6d5a3f9b7','schema');
 end if;
end;

-- 26/84: 202610220004_standard_categories.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220004_standard_categories.sql') then
  raise notice 'Aplicando 202610220004_standard_categories.sql';
  execute replace($retail_source_85e889e22c9dcc55$
create table public.retail_category_catalog (
 name text primary key
);
insert into public.retail_category_catalog(name) values
 ('Aderezos y conservas'),('Aguas y saborizadas'),('Alfajores'),('Almacen'),
 ('Bebidas'),('Bebidas Alcoholicas'),('Cereales y barras'),('Chocolates'),
 ('Cigarrillos'),('Energizantes y deportivas'),('Galletitas y obleas'),
 ('Golosinas'),('Helados'),('Infusiones'),('Jugos'),('Lacteos'),
 ('Panificados y reposteria'),('Snacks'),('Varios');
alter table public.retail_category_catalog enable row level security;
create policy authenticated_read on public.retail_category_catalog for select to authenticated using(true);
revoke all on public.retail_category_catalog from public,anon,authenticated;
grant select on public.retail_category_catalog to authenticated;

alter table public.retail_categories add column catalog_name text references public.retail_category_catalog(name);
alter table public.retail_categories add constraint retail_category_catalog_label check(catalog_name is null or name=catalog_name);
create unique index retail_category_store_catalog on public.retail_categories(store_id,catalog_name) where catalog_name is not null;

create function retail_private.normalize_category_name(p_name text) returns text
language sql immutable set search_path='' as $$
 select regexp_replace(translate(lower(trim(p_name)),'áéíóúüñ','aeiouun'),'\s+',' ','g');
$$;
revoke all on function retail_private.normalize_category_name(text) from public,anon,authenticated;

-- Reuse exact names/IDs. Variants remain preserved as legacy rows.
insert into public.retail_categories(store_id,name,catalog_name)
 select s.id,c.name,c.name from public.retail_stores s cross join public.retail_category_catalog c
 on conflict(store_id,name) do update set catalog_name=excluded.catalog_name;

create table retail_private.product_category_migrations (
 product_id uuid primary key,
 store_id uuid not null,
 previous_category_id uuid not null,
 previous_category_name text not null,
 new_category_id uuid not null,
 migrated_at timestamptz not null default now()
);
revoke all on retail_private.product_category_migrations from public,anon,authenticated;
insert into retail_private.product_category_migrations(product_id,store_id,previous_category_id,previous_category_name,new_category_id)
 select p.id,p.store_id,p.category_id,old.name,target.id
 from public.retail_products p
 join public.retail_categories old on old.store_id=p.store_id and old.id=p.category_id
 left join public.retail_category_catalog known on retail_private.normalize_category_name(known.name)=retail_private.normalize_category_name(old.name)
 join public.retail_categories target on target.store_id=p.store_id and target.catalog_name=coalesce(known.name,'Varios')
 where p.category_id<>target.id;
update public.retail_products p set category_id=m.new_category_id
 from retail_private.product_category_migrations m where m.product_id=p.id and m.store_id=p.store_id;

-- Defense in depth: old clients cannot create or rename categories either.
drop policy if exists manager_insert on public.retail_categories;
drop policy if exists manager_update on public.retail_categories;
revoke insert,update,delete on public.retail_categories from authenticated,anon;
revoke update(name) on public.retail_categories from authenticated,anon;

create function retail_private.resolve_standard_product_category() returns trigger
language plpgsql security definer set search_path='' as $$
declare previous public.retail_categories; canonical text; resolved uuid;
begin
 if new.category_id is not null then
  select * into previous from public.retail_categories where store_id=new.store_id and id=new.category_id;
  if not found then raise exception 'La categoría no pertenece a este comercio. Actualizá el catálogo y reintentá'; end if;
  canonical:=previous.catalog_name;
  if canonical is null then
   select name into canonical from public.retail_category_catalog
    where retail_private.normalize_category_name(name)=retail_private.normalize_category_name(previous.name);
  end if;
 end if;
 select id into resolved from public.retail_categories where store_id=new.store_id and catalog_name=coalesce(canonical,'Varios');
 if resolved is null then raise exception 'Faltan las categorías del comercio. Revisá la migración de categorías estándar'; end if;
 new.category_id:=resolved;
 return new;
end $$;
revoke all on function retail_private.resolve_standard_product_category() from public,anon,authenticated;
create trigger retail_standard_product_category before insert or update of category_id on public.retail_products
 for each row execute function retail_private.resolve_standard_product_category();

-- Same store bootstrap and contract; all nineteen categories now come from SQL.
create or replace function public.retail_create_store(p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión para crear un comercio'; end if;
 insert into public.retail_stores(name,owner_id) values(trim(p_name),auth.uid()) returning id into v_id;
 insert into public.retail_members(store_id,user_id,role) values(v_id,auth.uid(),'owner');
 insert into public.retail_categories(store_id,name,catalog_name) select v_id,name,name from public.retail_category_catalog;
 insert into public.retail_registers(store_id,name) values(v_id,'Caja principal');
 return v_id;
end $$;
revoke all on function public.retail_create_store(text) from public,anon;
grant execute on function public.retail_create_store(text) to authenticated;
notify pgrst,'reload schema';
$retail_source_85e889e22c9dcc55$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220004_standard_categories.sql','85e889e22c9dcc559736c4af21b9cf7bc0205cbd1ff940ed00ff9d38f481fd13','schema');
 end if;
end;

-- 27/84: 202610220005_category_labels.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220005_category_labels.sql') then
  raise notice 'Aplicando 202610220005_category_labels.sql';
  execute replace($retail_source_e975aa6c462d6ee5$
alter table public.retail_categories add column display_name text
 check(display_name is null or length(trim(display_name)) between 1 and 80);
create unique index retail_category_display_name on public.retail_categories
 (store_id,retail_private.normalize_category_name(coalesce(display_name,catalog_name))) where catalog_name is not null;
create function public.retail_rename_category(p_store uuid,p_category uuid,p_name text,p_expected text) returns uuid
language plpgsql security definer set search_path='' as $$
declare category public.retail_categories; label text:=nullif(trim(p_name),'');
begin
 perform retail_private.require_permission(p_store,'manage_categories');
 if coalesce(length(label),0)>80 then raise exception 'Usá un nombre de hasta 80 caracteres'; end if;
 select * into category from public.retail_categories where store_id=p_store and id=p_category and catalog_name is not null for update;
 if not found then raise exception 'Categoría no disponible. Actualizá los datos'; end if;
 if coalesce(category.display_name,category.catalog_name)=coalesce(label,category.catalog_name) then return category.id; end if;
 if p_expected is null or coalesce(category.display_name,category.catalog_name)<>p_expected then raise exception 'Otra persona cambió este nombre. Actualizá los datos y revisá el cambio'; end if;
 update public.retail_categories set display_name=case when label=category.catalog_name then null else label end where id=category.id;
 return category.id;
end $$;
revoke all on function public.retail_rename_category(uuid,uuid,text,text) from public,anon;
grant execute on function public.retail_rename_category(uuid,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
$retail_source_e975aa6c462d6ee5$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220005_category_labels.sql','e975aa6c462d6ee5492edbb36b1ed523a410c634658f8ad36fd24fe18a218f99','schema');
 end if;
end;

-- 28/84: 202610220006_complete_permission_profiles.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610220006_complete_permission_profiles.sql') then
  raise notice 'Aplicando 202610220006_complete_permission_profiles.sql';
  execute replace($retail_source_913347ffd59472a5$
alter table public.retail_permission_profiles add column revision integer not null default 0;

create function retail_private.can_grant_permissions(p_store uuid,p_permissions text[]) returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.role_for(p_store) in ('owner','admin') or
 (retail_private.has_permission(p_store,'manage_profiles') and not exists(
  select 1 from unnest(p_permissions) action where not retail_private.has_permission(p_store,action)));
$$;
revoke all on function retail_private.can_grant_permissions(uuid,text[]) from public,anon;
grant execute on function retail_private.can_grant_permissions(uuid,text[]) to authenticated;

-- Profiles are written only through the validated, concurrent-safe RPC.
revoke insert,update on public.retail_permission_profiles from authenticated,anon;
revoke update(name,permissions) on public.retail_permission_profiles from authenticated,anon;
create function public.retail_save_permission_profile(p_store uuid,p_id uuid,p_name text,p_role text,p_permissions text[],p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.retail_permission_profiles; normalized text[]; label text:=trim(p_name);
begin
 perform retail_private.require_permission(p_store,'manage_profiles');
 if p_id is null or p_role is null or p_role not in ('cashier','supervisor') or label is null or length(label) not between 1 and 80 or p_permissions is null then raise exception 'Revisá nombre, rol y permisos del perfil'; end if;
 select coalesce(array_agg(distinct action order by action),'{}'::text[]) into normalized from unnest(p_permissions) action;
 if not coalesce(retail_private.can_grant_permissions(p_store,normalized),false) then raise exception 'Solo podés conceder permisos que ya tenés' using errcode='42501'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') and exists(select 1 from public.retail_members where store_id=p_store and user_id=auth.uid() and profile_id=p_id) then raise exception 'Pedile a otro administrador que cambie tu propio perfil' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into previous from public.retail_permission_profiles where id=p_id for update;
 if found then
  if previous.store_id<>p_store or previous.base_role<>p_role then raise exception 'El perfil no corresponde al comercio o rol'; end if;
  if previous.name=label and previous.permissions @> normalized and previous.permissions <@ normalized then return previous.id; end if;
  if p_revision is null or previous.revision<>p_revision then raise exception 'El perfil cambió en otro dispositivo. Actualizá la lista y revisá los cambios antes de guardar'; end if;
  update public.retail_permission_profiles set name=label,permissions=normalized,revision=revision+1 where id=p_id;
 else
  insert into public.retail_permission_profiles(id,store_id,name,base_role,permissions) values(p_id,p_store,label,p_role,normalized);
 end if;
 return p_id;
end $$;
revoke all on function public.retail_save_permission_profile(uuid,uuid,text,text,text[],integer) from public,anon;
grant execute on function public.retail_save_permission_profile(uuid,uuid,text,text,text[],integer) to authenticated;

-- Direct REST writes and RPCs must enforce the same capabilities.
create function retail_private.guard_product_capabilities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
  return new;
 end if;
 if new.active is distinct from old.active then perform retail_private.require_permission(new.store_id,'delete_products'); end if;
 if new.stock_components is distinct from old.stock_components then perform retail_private.require_permission(new.store_id,'manage_compositions'); end if;
 if (to_jsonb(new)-array['active','stock_components','stock','cost','last_restocked_at','price']) is distinct from
    (to_jsonb(old)-array['active','stock_components','stock','cost','last_restocked_at','price']) and not retail_private.has_permission(new.store_id,'manage_compositions') then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 if new.price is distinct from old.price and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'edit_prices'); end if;
 if (new.stock is distinct from old.stock or new.cost is distinct from old.cost or new.last_restocked_at is distinct from old.last_restocked_at)
  and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions')
  and not retail_private.has_permission(new.store_id,'review_remitos') then
  -- Checkout consumes stock with the sell permission; the RPC restricts it to
  -- the caller's valid shift and exact cart. REST updates still require product RLS.
  if not retail_private.has_permission(new.store_id,'sell') then perform retail_private.require_permission(new.store_id,'replenish_stock'); end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_product_capabilities() from public,anon,authenticated;
create trigger retail_product_capabilities before insert or update on public.retail_products for each row execute function retail_private.guard_product_capabilities();
create policy delegated_product_insert on public.retail_products for insert to authenticated with check(retail_private.has_permission(store_id,'manage_products'));
create policy delegated_product_update on public.retail_products for update to authenticated using(retail_private.has_permission(store_id,'manage_products')) with check(retail_private.has_permission(store_id,'manage_products'));
create policy delegated_store_update on public.retail_stores for update to authenticated using(retail_private.has_permission(id,'manage_store')) with check(retail_private.has_permission(id,'manage_store'));

create function retail_private.guard_delegated_staff() returns trigger
language plpgsql security definer set search_path='' as $$
declare allowed text[];
begin
 if retail_private.role_for(new.store_id) in ('owner','admin') then return new; end if;
 perform retail_private.require_permission(new.store_id,'manage_staff');
 if new.role not in ('cashier','supervisor') then raise exception 'No podés crear administradores' using errcode='42501'; end if;
 if new.profile_id is null then
  allowed:=array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'];
  if new.role='supervisor' then allowed:=allowed||array['view_sales']; end if;
 else select permissions into allowed from public.retail_permission_profiles where id=new.profile_id and store_id=new.store_id;
 end if;
 if allowed is null or exists(select 1 from unnest(allowed) action where not retail_private.has_permission(new.store_id,action)) then raise exception 'No podés asignar permisos que no tenés' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function retail_private.guard_delegated_staff() from public,anon,authenticated;
create trigger retail_delegated_invite before insert or update on public.retail_invitations for each row execute function retail_private.guard_delegated_staff();
create policy delegated_invites_read on public.retail_invitations for select to authenticated using(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
create policy delegated_invites_create on public.retail_invitations for insert to authenticated with check(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
create policy delegated_invites_delete on public.retail_invitations for delete to authenticated using(retail_private.has_permission(store_id,'manage_staff') and role in ('cashier','supervisor'));
-- Check open shifts with privileged access; their details remain private.
create function retail_private.can_remove_staff(p_store uuid,p_target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.has_permission(p_store,'manage_staff') and p_target<>auth.uid()
 and exists(select 1 from public.retail_members where store_id=p_store and user_id=p_target and role in ('cashier','supervisor'))
 and not exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null);
$$;
revoke all on function retail_private.can_remove_staff(uuid,uuid) from public,anon;
grant execute on function retail_private.can_remove_staff(uuid,uuid) to authenticated;
create policy delegated_staff_delete on public.retail_members for delete to authenticated using(retail_private.can_remove_staff(store_id,user_id));

create function retail_private.guard_transfer_permission() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform retail_private.require_permission(new.store_id,'manage_transfers'); return new; end $$;
revoke all on function retail_private.guard_transfer_permission() from public,anon,authenticated;
create trigger retail_transfer_capability before insert or update on public.retail_stock_transfers for each row execute function retail_private.guard_transfer_permission();

-- Further capability checks below retain the existing transactional bodies,
-- locking, idempotency, stock calculations and assignment/shift restrictions.

alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]) action where retail_private.has_permission(p_store,action);
$$;
create policy delegated_insert on public.retail_branches for insert to authenticated with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_update on public.retail_branches for update to authenticated using(retail_private.has_permission(store_id,'manage_locations')) with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_insert on public.retail_registers for insert to authenticated with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_update on public.retail_registers for update to authenticated using(retail_private.has_permission(store_id,'manage_locations')) with check(retail_private.has_permission(store_id,'manage_locations'));
create policy delegated_insert on public.retail_price_lists for insert to authenticated with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_update on public.retail_price_lists for update to authenticated using(retail_private.has_permission(store_id,'manage_price_lists')) with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_insert on public.retail_price_overrides for insert to authenticated with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_update on public.retail_price_overrides for update to authenticated using(retail_private.has_permission(store_id,'manage_price_lists')) with check(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_insert on public.retail_ledgers for insert to authenticated with check(retail_private.has_permission(store_id,'manage_ledgers'));
create policy delegated_update on public.retail_ledgers for update to authenticated using(retail_private.has_permission(store_id,'manage_ledgers')) with check(retail_private.has_permission(store_id,'manage_ledgers'));
create policy delegated_delete on public.retail_price_overrides for delete to authenticated using(retail_private.has_permission(store_id,'manage_price_lists'));
create policy delegated_history on public.retail_product_deletions for select to authenticated using(retail_private.has_permission(store_id,'delete_products'));
create or replace function retail_private.can_read_remito(p_name text) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.retail_members m where m.store_id::text=split_part(p_name,'/',1) and m.user_id=auth.uid() and retail_private.has_permission(m.store_id,'review_remitos')); $$;

create or replace function public.retail_update_prices(p_store uuid,p_updates jsonb) returns void language plpgsql security definer set search_path='' as $$
declare item jsonb; v_price numeric;
begin
 perform retail_private.require_permission(p_store,'edit_prices');
 if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'Precios inválidos'; end if;
 if jsonb_array_length(p_updates) not between 1 and 10000 then raise exception 'Cantidad de cambios inválida'; end if;
 perform id from public.retail_products where store_id=p_store and id in (select (x->>'id')::uuid from jsonb_array_elements(p_updates) x) order by id for update;
 for item in select value from jsonb_array_elements(p_updates) loop
  v_price := (item->>'price')::numeric;
  if v_price is null or v_price <= 0 or v_price >= 1000000000000 or v_price::text in ('NaN','Infinity','-Infinity') or round(v_price,2)<=0 then raise exception 'Precio inválido'; end if;
  update public.retail_products set price=round(v_price,2) where id=(item->>'id')::uuid and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible en este comercio'; end if;
 end loop;
end $$;

create or replace function public.retail_attach_invoice(p_sale uuid,p_reference text) returns void language plpgsql security definer set search_path='' as $$
declare s public.retail_sales;
begin
 select * into s from public.retail_sales where id=p_sale for update;
 if s.id is null then raise exception 'Venta no disponible'; end if;
 perform retail_private.require_permission(s.store_id,'attach_invoice');
 if not retail_private.can_review_sales(s.store_id,s.shift_id) then raise exception 'Sin acceso a esta venta' using errcode='42501'; end if;
 if s.invoice_reference is not null then
  if s.invoice_reference=trim(p_reference) then return; end if;
  raise exception 'La venta ya tiene un comprobante asociado';
 end if;
 if p_reference is null or length(trim(p_reference)) not between 1 and 120 then raise exception 'Ingresá la referencia del comprobante emitido'; end if;
 update public.retail_sales set invoice_reference=trim(p_reference),invoiced_at=now(),invoiced_by=auth.uid() where id=p_sale;
end $$;

create or replace function public.retail_save_product_composition(p_store uuid,p_product uuid,p_components jsonb,p_expected jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare product public.retail_products; normalized jsonb; previous jsonb;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_compositions');
 if jsonb_typeof(p_components) is distinct from 'array' or jsonb_array_length(p_components)>30 or jsonb_typeof(p_expected) is distinct from 'array' then raise exception 'Composición inválida'; end if;
 -- Configuration and checkout take this lock BEFORE product locks. No nested recipes.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store and
  (id=p_product or id in(select (c->>'product_id')::uuid from jsonb_array_elements(p_components) c)) order by id for update;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active;
 if not found then raise exception 'Producto no disponible'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('product_id',((c->>'product_id')::uuid)::text,'quantity',(c->>'quantity')::integer) order by (c->>'product_id')::uuid),'[]'::jsonb) into normalized from jsonb_array_elements(p_components) c;
 select coalesce(jsonb_agg(c order by c->>'product_id'),'[]'::jsonb) into previous from jsonb_array_elements(p_expected) c;
 if product.stock_components=normalized then return; end if;
 if product.stock_components is distinct from previous then raise exception 'La composición cambió en otro dispositivo. Actualizá el catálogo antes de reintentar'; end if;
 if jsonb_array_length(product.stock_components)=0 and product.stock<>0 then raise exception 'El producto tiene stock propio. Creá otro producto con stock 0; no se trasladan existencias automáticamente'; end if;
 update public.retail_products set stock_components=normalized where id=p_product;
end $$;

create or replace function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare packet public.retail_products; unit_product public.retail_products; previous public.retail_loose_unit_conversions;
 actor_role text; per_packet integer; target_id uuid; total_units bigint; unit_price numeric; unit_cost numeric; unit_name text; unit_code text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'manage_compositions');
 if p_request is null or p_store is null or p_packet is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Faltan datos para convertir el atado'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_loose_unit_conversions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.packet_id<>p_packet or previous.created_by<>auth.uid() or previous.payload<>p_data then raise exception 'La solicitud corresponde a otra conversión'; end if;
  return previous.unit_product_id;
 end if;
 if coalesce(p_data->>'units','')!~'^[1-9][0-9]{0,3}$' then raise exception 'Indicá cuántos cigarrillos trae el atado'; end if;
 per_packet:=(p_data->>'units')::integer;
 if per_packet not between 2 and 1000 then raise exception 'Ingresá entre 2 y 1000 cigarrillos por atado'; end if;
 unit_price:=(p_data->>'price')::numeric; unit_cost:=(p_data->>'cost')::numeric;
 if unit_price is null or unit_price<=0 or unit_price>999999999999.99 or unit_price::text in ('NaN','Infinity','-Infinity') or unit_price<>round(unit_price,2) then raise exception 'Revisá el precio por cigarrillo'; end if;
 if unit_cost is null or unit_cost<0 or unit_cost>999999999999.99 or unit_cost::text in ('NaN','Infinity','-Infinity') or unit_cost<>round(unit_cost,2) then raise exception 'Revisá el costo por cigarrillo'; end if;
 target_id:=nullif(p_data->>'target','')::uuid;
 if target_id=p_packet then raise exception 'El atado y el suelto deben ser productos distintos'; end if;
 -- Same order as recipe configuration and checkout. This operation may reverse an
 -- existing incorrect unit -> packet recipe, so lock the store's products in order.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select * into packet from public.retail_products where store_id=p_store and id=p_packet and active;
 if not found then raise exception 'El atado ya no está disponible'; end if;
 if exists(select 1 from public.retail_loose_unit_conversions where store_id=p_store and packet_id=p_packet) then raise exception 'Este atado ya fue convertido. Actualizá el catálogo y usá su producto suelto'; end if;
 if jsonb_array_length(packet.stock_components)<>0 then raise exception 'Abrí este flujo desde el atado que tiene stock propio, no desde el cigarrillo suelto'; end if;
 if jsonb_build_object('name',packet.name,'code',packet.code,'stock',packet.stock,'cost',packet.cost,'price',packet.price,'components',packet.stock_components) is distinct from p_data->'expected_packet' then raise exception 'Cambió el atado o sus existencias. Actualizá el catálogo y revisá la conversión'; end if;
 total_units:=packet.stock::bigint*per_packet;
 if total_units>2147483647 then raise exception 'El stock convertido supera el máximo permitido'; end if;
 if target_id is not null then
  select * into unit_product from public.retail_products where store_id=p_store and id=target_id and active;
  if not found then raise exception 'El producto suelto ya no está disponible'; end if;
  if jsonb_build_object('name',unit_product.name,'code',unit_product.code,'stock',unit_product.stock,'cost',unit_product.cost,'price',unit_product.price,'components',unit_product.stock_components) is distinct from p_data->'expected_unit' then raise exception 'Cambió el producto suelto. Actualizá el catálogo antes de reintentar'; end if;
  if unit_product.stock<>0 then raise exception 'El suelto ya tiene stock propio. Revisá las existencias para evitar contarlas dos veces'; end if;
  if jsonb_array_length(unit_product.stock_components)>0 and not
   (jsonb_array_length(unit_product.stock_components)=1 and unit_product.stock_components->0->>'product_id'=p_packet::text) then raise exception 'El suelto tiene otra composición. Elegí un producto sin stock o vinculado solamente a este atado'; end if;
 else
  unit_name:=trim(p_data->>'name'); unit_code:=trim(p_data->>'code');
  if unit_name is null or length(unit_name) not between 1 and 160 or unit_code is null or length(unit_code) not between 1 and 100 then raise exception 'Completá el nombre y código interno del suelto'; end if;
  if unit_code='MANUAL' or exists(select 1 from public.retail_products where store_id=p_store and code=unit_code) then raise exception 'El código del suelto ya está en uso. Elegí otro código interno'; end if;
  target_id:=p_request;
 end if;
 if exists(select 1 from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and p.active and p.id<>target_id and c->>'product_id'=p_packet::text) then
  raise exception 'Otros productos consumen este atado. Revisá esas composiciones antes de convertirlo';
 end if;
 if unit_product.id is null then
  insert into public.retail_products(id,store_id,category_id,code,name,price,cost,stock,min_stock,emoji,active,
   brand,supplier,supplier_code,tags,unit_type,pack_size,margin_group,expiry_date,last_restocked_at)
  values(target_id,p_store,packet.category_id,unit_code,unit_name,unit_price,unit_cost,0,
   least(2147483647,packet.min_stock::bigint*per_packet)::integer,packet.emoji,true,
   packet.brand,packet.supplier,null,packet.tags,'unit',per_packet,packet.margin_group,packet.expiry_date,packet.last_restocked_at);
 end if;
 -- Both updates, the audit and movements commit together. The unit keeps all
 -- other metadata when reusing an existing record; packet price/cost stay intact.
 update public.retail_products set stock_components='[]'::jsonb,stock=total_units::integer,
  price=unit_price,cost=unit_cost,pack_size=per_packet,unit_type='unit' where store_id=p_store and id=target_id;
 update public.retail_products set stock=0,stock_components=jsonb_build_array(jsonb_build_object('product_id',target_id::text,'quantity',per_packet))
  where store_id=p_store and id=p_packet;
 insert into public.retail_loose_unit_conversions(id,store_id,packet_id,unit_product_id,units_per_packet,packet_stock,unit_stock,payload,created_by)
 values(p_request,p_store,p_packet,target_id,per_packet,packet.stock,total_units::integer,p_data,auth.uid());
 if packet.stock>0 then
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,p_packet,p_store,auth.uid(),-packet.stock,packet.cost,now()),(p_request,target_id,p_store,auth.uid(),total_units::integer,unit_cost,now());
 end if;
 return target_id;
end $$;

create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'delete_products');
 if p_product is null or p_request is null or p_active is null or coalesce(length(reason),0)>500 then raise exception 'Revisá el producto y el motivo (hasta 500 caracteres)'; end if;
 payload:=jsonb_build_object('active',p_active,'reason',reason,'expected',p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_product_deletions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.product_id<>p_product or previous.actor_id is distinct from auth.uid() or previous.request_payload is distinct from payload then raise exception 'La solicitud corresponde a otra acción'; end if;
  return previous.id;
 end if;
 -- Same lock order as checkout and composition configuration.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.active=p_active then
  if p_active then raise exception 'El producto ya está activo. Actualizá el historial';
  else raise exception 'El producto ya está eliminado del catálogo. Actualizá los datos'; end if;
 end if;
 if p_expected is not null and jsonb_build_object('name',product.name,'code',product.code,'stock',product.stock,'components',product.stock_components) is distinct from p_expected then
  raise exception 'El producto o su stock cambió. Actualizá el catálogo y revisá la eliminación';
 end if;
 if not p_active then
  select string_agg(name,', ') into dependencies from (
   select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=p_store and p.active and c->>'product_id'=p_product::text order by p.name limit 5
  ) names;
  if dependencies is not null then raise exception 'Se usa en: %. Quitalo de esos componentes o eliminá primero esos combos/atados',dependencies; end if;
 else
  if exists(select 1 from jsonb_array_elements(product.stock_components) c
   left join public.retail_products component on component.store_id=p_store and component.id=(c->>'product_id')::uuid
   where component.id is null or not component.active or jsonb_array_length(component.stock_components)>0) then
   raise exception 'Para restaurar este producto, restaurá primero sus componentes y revisá que tengan stock propio';
  end if;
 end if;
 perform set_config('retail.product_deletion_context',jsonb_build_object('store_id',p_store,'product_id',p_product,'request_id',p_request,'reason',reason,'payload',payload)::text,true);
 update public.retail_products set active=p_active where store_id=p_store and id=p_product;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;

create or replace function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments; v_items jsonb; v_group record; p public.retail_products; v_qty integer;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='approved' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue rechazado'; end if;
 v_items:=retail_private.validate_remito_items(p_store,coalesce(p_items,r.items),true);
 -- Lock all products in a stable order, then add to current stock, never a client snapshot.
 perform pr.id from public.retail_products pr where pr.store_id=p_store and pr.id in
  (select (item->>'product_id')::uuid from jsonb_array_elements(v_items) item) order by pr.id for update;
 for v_group in select (item->>'product_id')::uuid as product_id,sum((item->>'quantity')::integer) as quantity
  from jsonb_array_elements(v_items) item group by (item->>'product_id')::uuid loop
  if v_group.quantity>1000000 then raise exception 'La suma por producto supera 1.000.000 de unidades'; end if;
  v_qty:=v_group.quantity::integer;
  select * into p from public.retail_products where id=v_group.product_id and store_id=p_store and active;
  if not found then raise exception 'Producto no disponible'; end if;
  if p.stock>2147483647-v_qty then raise exception 'El stock resultante supera el máximo permitido'; end if;
  update public.retail_products set stock=stock+v_qty where id=p.id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,occurred_at)
   values(r.id,p.id,p_store,auth.uid(),v_qty,now());
 end loop;
 update public.retail_pending_replenishments set items=v_items,status='approved',reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
 return r.id;
end $$;

create or replace function public.retail_reject_replenishment(p_store uuid,p_id uuid,p_reason text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 if nullif(trim(p_reason),'') is null or length(trim(p_reason))>1000 then raise exception 'Ingresá un motivo de rechazo (hasta 1.000 caracteres)'; end if;
 select * into r from public.retail_pending_replenishments where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.status='rejected' then return r.id; end if;
 if r.status<>'pending' then raise exception 'El remito ya fue aprobado'; end if;
 update public.retail_pending_replenishments set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),rejection_reason=trim(p_reason) where id=r.id;
 return r.id;
end $$;

create or replace function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_request,gen_random_uuid()); existing public.retail_stock_transfers;
 v_item jsonb; v_product uuid; v_qty integer; v_name text; v_items jsonb:='[]'::jsonb;
 v_requested jsonb:='[]'::jsonb; v_existing jsonb; v_notes text:=nullif(trim(p_notes),'');
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 if p_from_branch is null or p_to_branch is null or p_from_branch=p_to_branch then raise exception 'Elegí sucursales de origen y destino diferentes'; end if;
 if length(coalesce(v_notes,''))>2000 then raise exception 'Las notas no pueden superar los 2.000 caracteres'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Agregá al menos un producto'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for v_item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_item)<>'object' or coalesce(v_item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(v_item->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá los productos y sus cantidades enteras positivas'; end if;
  v_product:=(v_item->>'product_id')::uuid; v_qty:=(v_item->>'qty')::integer;
  if v_qty>1000000 then raise exception 'La cantidad por producto no puede superar 1.000.000 de unidades'; end if;
  v_requested:=v_requested||jsonb_build_array(jsonb_build_object('product_id',v_product,'qty',v_qty));
 end loop;
 if (select count(distinct item->>'product_id') from jsonb_array_elements(v_requested) item)<>jsonb_array_length(v_requested) then
  raise exception 'Incluí cada producto una sola vez con su cantidad total'; end if;
 select jsonb_agg(item order by item->>'product_id') into v_requested from jsonb_array_elements(v_requested) item;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into existing from public.retail_stock_transfers where id=v_id;
 if found then
  select jsonb_agg(jsonb_build_object('product_id',item->>'product_id','qty',(item->>'qty')::integer) order by item->>'product_id')
   into v_existing from jsonb_array_elements(existing.items) item;
  if existing.store_id<>p_store or existing.created_by<>auth.uid() or existing.from_branch_id<>p_from_branch or existing.to_branch_id<>p_to_branch
   or existing.notes is distinct from v_notes or v_existing<>v_requested then raise exception 'El identificador ya corresponde a otra transferencia'; end if;
  return existing.id;
 end if;
 if (select count(*) from public.retail_branches where store_id=p_store and id in (p_from_branch,p_to_branch))<>2 then raise exception 'Las sucursales deben pertenecer a este comercio'; end if;
 for v_item in select value from jsonb_array_elements(v_requested) loop
  v_product:=(v_item->>'product_id')::uuid;
  select name into v_name from public.retail_products where id=v_product and store_id=p_store and active;
  if not found then raise exception 'Uno de los productos no está disponible en este comercio'; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object('product_id',v_product,'product_name',v_name,'qty',(v_item->>'qty')::integer));
 end loop;
 insert into public.retail_stock_transfers(id,store_id,from_branch_id,to_branch_id,created_by,items,notes)
 values(v_id,p_store,p_from_branch,p_to_branch,auth.uid(),v_items,v_notes);
 return v_id;
end $$;

create or replace function public.retail_confirm_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='confirmed' then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia está cancelada'; end if;
 update public.retail_stock_transfers set status='confirmed',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create or replace function public.retail_cancel_transfer(p_store uuid,p_transfer_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_stock_transfers;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 select * into t from public.retail_stock_transfers where id=p_transfer_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if t.status='cancelled' then return t.id; end if;
 if t.status<>'pending' then raise exception 'Una transferencia confirmada conserva su registro histórico'; end if;
 update public.retail_stock_transfers set status='cancelled',reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end $$;

create or replace function public.retail_save_ledger_routing(p_store uuid,p_default uuid,p_rules jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare entry record;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_ledgers');
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=p_default and active) then raise exception 'Elegí un registro principal activo'; end if;
 if jsonb_typeof(p_rules) is distinct from 'object' then raise exception 'Reglas inválidas'; end if;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   if entry.key not in ('Efectivo','QR','Transferencia','Debito','Credito','Mixto') or entry.value is null then raise exception 'Medio de pago inválido'; end if;
   if not exists(select 1 from public.retail_ledgers where store_id=p_store and id=entry.value::uuid and active) then raise exception 'El registro elegido ya no está activo'; end if;
 end loop;
 update public.retail_ledgers set is_default=false,payment_methods='{}' where store_id=p_store;
 update public.retail_ledgers set is_default=true where store_id=p_store and id=p_default;
 for entry in select key,value from jsonb_each_text(p_rules) loop
   update public.retail_ledgers set payment_methods=array_append(payment_methods,entry.key) where store_id=p_store and id=entry.value::uuid;
 end loop;
end $$;

create or replace function public.retail_prepare_sales_ledgers(p_store uuid) returns void
language plpgsql security definer set search_path='' as $$
declare general_id uuid; tests_id uuid;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_ledgers');
 perform 1 from public.retail_stores where id=p_store for no key update;
 perform id from public.retail_ledgers where store_id=p_store order by id for update;
 insert into public.retail_ledgers(store_id,name) values(p_store,'General')
 on conflict(store_id,name) do update set active=true;
 select id into tests_id from public.retail_ledgers where store_id=p_store and name='Pruebas';
 if tests_id is null then
   select id into tests_id from public.retail_ledgers where store_id=p_store and name='Otras ventas' and not is_default;
   if tests_id is not null then
     update public.retail_ledgers set name='Pruebas',active=true where id=tests_id;
   else
     insert into public.retail_ledgers(store_id,name) values(p_store,'Pruebas');
   end if;
 else
   update public.retail_ledgers set active=true where id=tests_id;
 end if;
 select id into general_id from public.retail_ledgers where store_id=p_store and name='General';
 update public.retail_ledgers set is_default=false where store_id=p_store and is_default;
 update public.retail_ledgers set is_default=true where id=general_id;
end $$;

create or replace function public.retail_team(p_store uuid) returns table(user_id uuid,email text,role text,branch_id uuid,register_id uuid,profile_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 return query select m.user_id,u.email::text,m.role,m.branch_id,m.register_id,m.profile_id from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store order by lower(u.email);
end $$;

create or replace function public.retail_set_staff_profile(p_store uuid,p_target uuid,p_role text,p_profile uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare old_role text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store,'manage_staff');
 if p_role is null or p_role not in ('cashier','supervisor') then raise exception 'Elegí Cajero o Supervisor'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') then
  if not p_pending and p_target=auth.uid() then raise exception 'No podes cambiar tu propio acceso'; end if;
  if p_profile is null then
   if exists(select 1 from unnest(case when p_role='supervisor' then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales'] else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end) a where not retail_private.has_permission(p_store,a)) then raise exception 'No podes conceder permisos que no tenes'; end if;
  elsif not exists(select 1 from public.retail_permission_profiles p where p.id=p_profile and p.store_id=p_store and not exists(select 1 from unnest(p.permissions) a where not retail_private.has_permission(p_store,a))) then raise exception 'No podes conceder permisos que no tenes'; end if;
 end if;
 if p_pending then
   select role into old_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else
   select role into old_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 end if;
 if old_role is null or old_role not in ('cashier','supervisor') then raise exception 'Solo se pueden cambiar perfiles de cajeros y supervisores'; end if;
 if old_role<>p_role and not p_pending and exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de cambiar su rol'; end if;
 if p_pending then
   update public.retail_invitations set role=p_role,profile_id=p_profile where store_id=p_store and id=p_target;
 else
   update public.retail_members set role=p_role,profile_id=p_profile where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_set_cashier_access(p_store uuid,p_target uuid,p_branch uuid,p_register uuid,p_pending boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text; v_branch uuid;
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 if retail_private.role_for(p_store) not in ('owner','admin') and not p_pending and p_target=auth.uid() then raise exception 'No podes cambiar tu propia asignacion'; end if;
 if p_pending then select role into v_role from public.retail_invitations where store_id=p_store and id=p_target for update;
 else select role into v_role from public.retail_members where store_id=p_store and user_id=p_target for update; end if;
 if v_role is null or v_role not in ('cashier','supervisor') then raise exception 'Solo se pueden asignar cajeros o supervisores de este comercio'; end if;
 v_branch:=p_branch;
 if p_register is not null then
   select branch_id into v_branch from public.retail_registers where id=p_register and store_id=p_store and active;
   if v_branch is null then raise exception 'Caja no disponible'; end if;
   if p_branch is not null and p_branch<>v_branch then raise exception 'La caja no pertenece a esa sucursal'; end if;
 end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where id=v_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 if p_pending then update public.retail_invitations set branch_id=v_branch,register_id=p_register where store_id=p_store and id=p_target;
 else
   if exists(select 1 from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_by=p_target and s.closed_at is null and ((v_branch is not null and r.branch_id<>v_branch) or (p_register is not null and r.id<>p_register))) then raise exception 'La persona debe cerrar su turno antes de cambiar a otra sucursal o caja'; end if;
   update public.retail_members set branch_id=v_branch,register_id=p_register where store_id=p_store and user_id=p_target;
 end if;
end $$;

create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if not retail_private.has_permission(v_store,'manage_products') then perform retail_private.require_permission(v_store,'replenish_stock'); end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   if not retail_private.has_permission(v_store,'manage_products') and retail_private.role_for(v_store) not in ('owner','admin') and (v_delta<=0 or v_cost is not null) then raise exception 'Tu permiso permite sumar stock sin modificar costos'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost),
     last_restocked_at=case when v_delta>0 then greatest(coalesce(last_restocked_at,v_at),v_at) else last_restocked_at end
     where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind='close' then
   v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount);
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
-- Configuration metadata is separate from operational register availability.
-- Seeing all location names never grants use of an unassigned register.
create function public.retail_remove_staff(p_store uuid,p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target_role text;
begin
 perform retail_private.require_permission(p_store,'manage_staff');
 if p_target=auth.uid() then raise exception 'No podés quitar tu propio acceso'; end if;
 select role into target_role from public.retail_members where store_id=p_store and user_id=p_target for update;
 if not found then return; end if;
 if target_role='owner' or (target_role='admin' and retail_private.role_for(p_store)<>'owner') then raise exception 'No podés quitar este acceso' using errcode='42501'; end if;
 if exists(select 1 from public.retail_shifts where store_id=p_store and opened_by=p_target and closed_at is null) then raise exception 'La persona debe cerrar su turno antes de quitar el acceso'; end if;
 delete from public.retail_members where store_id=p_store and user_id=p_target;
end $$;
revoke all on function public.retail_remove_staff(uuid,uuid) from public,anon;
grant execute on function public.retail_remove_staff(uuid,uuid) to authenticated;
create function public.retail_management_locations(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not (retail_private.has_permission(p_store,'manage_locations') or retail_private.has_permission(p_store,'manage_staff') or retail_private.has_permission(p_store,'manage_transfers') or retail_private.has_permission(p_store,'manage_price_lists') or retail_private.has_permission(p_store,'review_remitos')) then raise exception 'Sin permiso para consultar esta configuración' using errcode='42501'; end if;
 return jsonb_build_object(
  'branches',(select coalesce(jsonb_agg(to_jsonb(b) order by b.name),'[]'::jsonb) from public.retail_branches b where b.store_id=p_store),
  'registers',(select coalesce(jsonb_agg(to_jsonb(r) order by r.name),'[]'::jsonb) from public.retail_registers r where r.store_id=p_store));
end $$;
create function public.retail_write_branch(p_store uuid,p_name text,p_address text,p_id uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if p_id is null then insert into public.retail_branches(store_id,name,address) values(p_store,trim(p_name),p_address) returning id into target;
 else update public.retail_branches set name=trim(p_name),address=p_address where store_id=p_store and id=p_id returning id into target; end if;
 if target is null then raise exception 'Sucursal no disponible. Actualizá los datos'; end if;
 return target;
end $$;
create function public.retail_write_register(p_store uuid,p_name text,p_branch uuid,p_id uuid default null,p_active boolean default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare current_register public.retail_registers; target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if p_branch is not null and not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'La sucursal no pertenece al comercio'; end if;
 if p_id is null then
  insert into public.retail_registers(store_id,name,branch_id,active) values(p_store,trim(p_name),p_branch,coalesce(p_active,true)) returning id into target;
 else
  select * into current_register from public.retail_registers where id=p_id and store_id=p_store for update;
  if not found then raise exception 'Caja no disponible. Actualizá los datos'; end if;
  if ((p_branch is not null and p_branch<>current_register.branch_id) or p_active=false) and exists(select 1 from public.retail_shifts where register_id=p_id and closed_at is null) then raise exception 'Cerrá el turno de esta caja antes de moverla o desactivarla'; end if;
  update public.retail_registers set name=coalesce(trim(p_name),name),branch_id=coalesce(p_branch,branch_id),active=coalesce(p_active,active) where id=p_id returning id into target;
 end if;
 return target;
end $$;
revoke all on function public.retail_management_locations(uuid),public.retail_write_branch(uuid,text,text,uuid),public.retail_write_register(uuid,text,uuid,uuid,boolean) from public,anon;
grant execute on function public.retail_management_locations(uuid),public.retail_write_branch(uuid,text,text,uuid),public.retail_write_register(uuid,text,uuid,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
$retail_source_913347ffd59472a5$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610220006_complete_permission_profiles.sql','913347ffd59472a588b214ee3da8ec426cb47fe143db19889896279a221636d5','schema');
 end if;
end;

-- 29/84: 202610230001_automatic_margin_groups.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610230001_automatic_margin_groups.sql') then
  raise notice 'Aplicando 202610230001_automatic_margin_groups.sql';
  execute replace($retail_source_6cd429e7679685c4$
alter table public.retail_stores add column low_margin_threshold numeric(5,2) not null default 10
 check(low_margin_threshold between 0 and 100);

create function retail_private.product_margin_group(p_price numeric,p_cost numeric,p_threshold numeric) returns text
language sql immutable set search_path='' as $$
 select case when p_price>0 and p_cost>0 and (p_price-p_cost)*100<p_price*p_threshold then 'low_margin' else 'standard' end;
$$;
revoke all on function retail_private.product_margin_group(numeric,numeric,numeric) from public,anon,authenticated;

create function retail_private.classify_product_margin() returns trigger
language plpgsql security definer set search_path='' as $$
declare threshold numeric;
begin
 -- Price/cost writers serialize with threshold changes; register assignments
 -- and all existing permission checks remain in force.
 select low_margin_threshold into threshold from public.retail_stores where id=new.store_id for share;
 if threshold is null then raise exception 'Comercio no disponible para calcular el margen'; end if;
 new.margin_group:=retail_private.product_margin_group(new.price,new.cost,threshold);
 return new;
end $$;
revoke all on function retail_private.classify_product_margin() from public,anon,authenticated;
-- Run AFTER the existing BEFORE permission/validation triggers. Only the server
-- derives this field, so editing a price does not require full product access.
create trigger retail_zz_classify_margin before insert or update of price,cost,margin_group on public.retail_products
 for each row execute function retail_private.classify_product_margin();

create function public.retail_set_margin_threshold(p_store uuid,p_threshold numeric,p_expected numeric) returns numeric
language plpgsql security definer set search_path='' as $$
declare previous numeric; normalized numeric;
begin
 perform retail_private.require_permission(p_store,'manage_store');
 if p_threshold is null or p_threshold::text in ('NaN','Infinity','-Infinity') or p_threshold<0 or p_threshold>100 then raise exception 'Usá un porcentaje entre 0 y 100, con hasta dos decimales'; end if;
 normalized:=round(p_threshold,2);
 if normalized<>p_threshold then raise exception 'Usá hasta dos decimales para el límite'; end if;
 -- Threshold writers serialize before taking any row locks. Lock products in
 -- the same UUID order as price/restock RPCs, then lock the store (not reversed).
 perform pg_advisory_xact_lock(hashtextextended('retail-margin:'||p_store::text,0));
 perform id from public.retail_products where store_id=p_store order by id for update;
 select low_margin_threshold into previous from public.retail_stores where id=p_store for update;
 if not found then raise exception 'Comercio no disponible'; end if;
 if previous=normalized then return normalized; end if;
 if p_expected is null or previous<>p_expected then raise exception 'Otra persona cambió el límite. Actualizá los datos y revisá el porcentaje antes de guardar'; end if;
 update public.retail_stores set low_margin_threshold=normalized where id=p_store;
 -- Same value: never alter prices. The last BEFORE trigger derives the group,
 -- without demanding product-edit permission from a store-settings delegate.
 update public.retail_products set price=price where store_id=p_store;
 return normalized;
end $$;
revoke all on function public.retail_set_margin_threshold(uuid,numeric,numeric) from public,anon;
grant execute on function public.retail_set_margin_threshold(uuid,numeric,numeric) to authenticated;
-- No UPDATE grant for the threshold column: writes must use the checked RPC.

-- Reclassify current products, including inactive ones, without touching sales.
update public.retail_products set price=price;
notify pgrst,'reload schema';
$retail_source_6cd429e7679685c4$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610230001_automatic_margin_groups.sql','6cd429e7679685c41c4adb245d3ec97ec07eeb202ca421e9640e9a80f49050c2','schema');
 end if;
end;

-- 30/84: 202610230002_ingredients_and_composition_costs.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610230002_ingredients_and_composition_costs.sql') then
  raise notice 'Aplicando 202610230002_ingredients_and_composition_costs.sql';
  execute replace($retail_source_86fd19952b8e6534$
alter table public.retail_products add column sellable boolean not null default true;
alter table public.retail_products drop constraint retail_products_price_check;
alter table public.retail_products add constraint retail_products_price_check
 check(price >= 0 and (not sellable or price > 0));
grant update(sellable) on public.retail_products to authenticated;

create function retail_private.guard_product_usage() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not new.sellable then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
 elsif new.sellable is distinct from old.sellable then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_product_usage() from public,anon,authenticated;
create trigger retail_product_usage before insert or update of sellable on public.retail_products
 for each row execute function retail_private.guard_product_usage();

create function retail_private.derive_composition_cost() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipe_cost numeric; known boolean; component_count integer;
begin
 if jsonb_array_length(new.stock_components)>0 then
  select sum(p.cost*(c->>'quantity')::numeric),bool_and(p.cost>0),count(*)
   into recipe_cost,known,component_count
   from jsonb_array_elements(new.stock_components) c
   join public.retail_products p on p.id=(c->>'product_id')::uuid and p.store_id=new.store_id;
  -- 0 is the existing unknown-cost representation: never report a partial sum as full cost.
  if component_count<>jsonb_array_length(new.stock_components) or not coalesce(known,false) then
   new.cost:=0;
  else
   if recipe_cost>999999999999.99 then raise exception 'El costo del combo supera el límite permitido. Revisá cantidades y costos de sus componentes'; end if;
   new.cost:=round(recipe_cost,2);
  end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.derive_composition_cost() from public,anon,authenticated;
-- Alphabetical trigger order: authorization/recipe validation, then derived cost, then margin.
-- All updates (including old clients) derive the cost; stale form data cannot overwrite it.
create trigger retail_y_derive_composition_cost before insert or update on public.retail_products
 for each row execute function retail_private.derive_composition_cost();
drop trigger retail_zz_classify_margin on public.retail_products;
create trigger retail_zz_classify_margin before insert or update on public.retail_products
 for each row execute function retail_private.classify_product_margin();

create function retail_private.refresh_dependent_composition_costs() returns trigger
language plpgsql security definer set search_path='' as $$
declare parent_id uuid;
begin
 if new.cost is not distinct from old.cost then return new; end if;
 -- No nested recipes are permitted. Derived writes do not grant any new client capability.
 -- Touch an unchanged price so permission guards see no requested catalog/price change;
 -- the later BEFORE triggers derive cost and margin on the server in this transaction.
 for parent_id in select p.id from public.retail_products p
  where p.store_id=new.store_id and p.stock_components @> jsonb_build_array(jsonb_build_object('product_id',new.id))
  order by p.id
 loop
  update public.retail_products set price=price where id=parent_id and store_id=new.store_id;
 end loop;
 return new;
end $$;
revoke all on function retail_private.refresh_dependent_composition_costs() from public,anon,authenticated;
create trigger retail_refresh_recipe_costs after update on public.retail_products
 for each row when (old.cost is distinct from new.cost)
 execute function retail_private.refresh_dependent_composition_costs();

create function retail_private.reject_ingredient_sales() returns trigger
language plpgsql security definer set search_path='' as $$
declare sold public.retail_products; item jsonb;
begin
 for item in select value from jsonb_array_elements(new.items) loop
  if item->>'productId' is not null then
   select * into sold from public.retail_products
    where id=(item->>'productId')::uuid and store_id=new.store_id for share;
   if found and not sold.sellable then
    raise exception '% es solo un insumo. Retiralo de la venta y actualizá el catálogo',sold.name;
   end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function retail_private.reject_ingredient_sales() from public,anon,authenticated;
-- A rejected checkout rolls back all stock updates. Recipes can still consume ingredients.
create trigger retail_reject_ingredient_sales before insert on public.retail_sales
 for each row execute function retail_private.reject_ingredient_sales();

-- Refresh only current recipe costs/margin; physical units, price and ticket snapshots stay intact.
update public.retail_products set price=price where jsonb_array_length(stock_components)>0;
notify pgrst,'reload schema';
$retail_source_86fd19952b8e6534$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610230002_ingredients_and_composition_costs.sql','86fd19952b8e65341957126f53ec64e327dd8f4ed3de54b2d9a3b9a9e3baaffb','schema');
 end if;
end;

-- 31/84: 202610240001_shift_closing_details.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610240001_shift_closing_details.sql') then
  raise notice 'Aplicando 202610240001_shift_closing_details.sql';
  if exists(select 1 from pg_catalog.pg_attribute
   where attrelid=to_regclass('public.retail_shifts') and attname in ('closing_denominations','ticket_count') and attnum>0 and not attisdropped) then
   raise exception 'Hay columnas del cierre instaladas, pero la migración 202610240001_shift_closing_details.sql no figura en el historial'
    using errcode='55000', hint='Detener y ejecutar supabase/maintenance/check_manual_schema_history.sql (solo lectura). Conciliar qué migraciones se aplicaron manualmente; una columna no prueba una migración completa. No borrar columnas, no omitir el paso y no ampliar el baseline automáticamente.';
  end if;
  execute replace($retail_source_d3204ba0e41d2977$
alter table public.retail_shifts
 add column closing_denominations jsonb,
 add column ticket_count integer check(ticket_count is null or ticket_count>=0);

create function retail_private.cash_denominations_total(p_details jsonb) returns numeric
language plpgsql immutable set search_path='' as $$
declare item record; total numeric:=0;
begin
 if p_details is null then return 0; end if;
 if jsonb_typeof(p_details)<>'object' then raise exception 'Revisá el detalle de billetes'; end if;
 for item in select * from jsonb_each(p_details) loop
  if item.key not in ('10','20','50','100','200','500','1000','2000','10000','20000')
   or jsonb_typeof(item.value)<>'number' or item.value::text!~'^[0-9]{1,7}$' then
   raise exception 'Usá las denominaciones disponibles y cantidades enteras entre 0 y 1.000.000';
  end if;
  if item.value::text::numeric>1000000 then raise exception 'La cantidad de cada billete no puede superar 1.000.000'; end if;
  total:=total+item.key::numeric*item.value::text::numeric;
 end loop;
 return total;
end $$;
revoke all on function retail_private.cash_denominations_total(jsonb) from public,anon,authenticated;

create function retail_private.snapshot_shift_closing() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.closed_at is not null and (new.closing_denominations is distinct from old.closing_denominations
  or new.ticket_count is distinct from old.ticket_count or new.counted_cash is distinct from old.counted_cash) then
  raise exception 'El cierre ya está guardado. No se puede reemplazar su conteo ni su detalle';
 end if;
 if new.closing_denominations is not null then
  if retail_private.cash_denominations_total(new.closing_denominations)>coalesce(new.counted_cash,999999999999.99) then
   raise exception 'Los billetes detallados superan el efectivo contado. Revisá cantidades o total';
  end if;
 end if;
 if old.closed_at is null and new.closed_at is not null then
  -- check_shift serializes checkout and close on this row; all payment methods count once.
  select count(*)::integer into new.ticket_count from public.retail_sales where shift_id=new.id and store_id=new.store_id;
 end if;
 return new;
end $$;
revoke all on function retail_private.snapshot_shift_closing() from public,anon,authenticated;
create trigger retail_snapshot_shift_closing before update of closed_at,counted_cash,closing_denominations,ticket_count
 on public.retail_shifts for each row execute function retail_private.snapshot_shift_closing();

-- Preserve accounting and permission checks in the existing two-argument function.
create function public.retail_close_shift(p_shift uuid,p_counted numeric,p_denominations jsonb) returns numeric
language plpgsql security definer set search_path='' as $$
declare s public.retail_shifts;
begin
 s:=retail_private.check_shift(p_shift);
 if p_counted is null or p_counted<0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 if retail_private.cash_denominations_total(p_denominations)>p_counted then
  raise exception 'Los billetes detallados superan el efectivo contado. Revisá cantidades o total';
 end if;
 update public.retail_shifts set closing_denominations=nullif(p_denominations,'{}'::jsonb) where id=s.id;
 return public.retail_close_shift(p_shift,p_counted);
end $$;
revoke all on function public.retail_close_shift(uuid,numeric,jsonb) from public,anon;
grant execute on function public.retail_close_shift(uuid,numeric,jsonb) to authenticated;

create function public.retail_shift_ticket_count(p_shift uuid) returns integer
language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts; total integer;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if auth.uid() is null or s.id is null or retail_private.role_for(s.store_id) is null
  or (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 if s.ticket_count is not null then return s.ticket_count; end if;
 select count(*)::integer into total from public.retail_sales where shift_id=s.id and store_id=s.store_id;
 return total;
end $$;
revoke all on function public.retail_shift_ticket_count(uuid) from public,anon;
grant execute on function public.retail_shift_ticket_count(uuid) to authenticated;

-- Offline replay follows below, preserving the current permission/stock/receipt logic.

create or replace function public.retail_sync_operation(p_operation jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=(p_operation->>'id')::uuid; v_store uuid:=(p_operation->>'store')::uuid;
 v_shift uuid:=(p_operation->>'shift')::uuid; v_kind text:=p_operation->>'kind';
 v_at timestamptz:=(p_operation->>'at')::timestamptz; v_result jsonb; v_receipt public.retail_sync_receipts;
 v_register uuid; v_amount numeric; v_sale public.retail_sales; v_item jsonb; v_delta integer; v_product public.retail_products; v_cost numeric;
begin
 if auth.uid() is null or retail_private.role_for(v_store) is null then raise exception 'Sin acceso al comercio. La operación sigue guardada en el dispositivo'; end if;
 if v_id is null or v_at is null or v_at>now()+interval '1 day' or v_at<'2000-01-01'::timestamptz then raise exception 'Identificador o fecha de operación inválidos'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_id::text,0));
 select * into v_receipt from public.retail_sync_receipts where id=v_id;
 if found then
  if v_receipt.user_id<>auth.uid() or v_receipt.payload<>p_operation then raise exception 'El identificador ya corresponde a otra operación'; end if;
  return v_receipt.result;
 end if;
 if (v_kind='sale' and exists(select 1 from public.retail_sales where id=v_id)) or
    (v_kind='movement' and exists(select 1 from public.retail_movements where id=v_id)) then raise exception 'El identificador ya corresponde a una operación registrada'; end if;
 if v_kind='open' then
  v_register:=(p_operation->>'register')::uuid; v_amount:=(p_operation->>'amount')::numeric;
  perform 1 from public.retail_members where store_id=v_store and user_id=auth.uid() for share;
  if not retail_private.can_use_register(v_store,v_register) or not exists(select 1 from public.retail_registers where id=v_register and active) then raise exception 'Sin acceso a esta caja'; end if;
  if v_amount is null or v_amount<0 or v_amount::text in ('NaN','Infinity','-Infinity') then raise exception 'Fondo inicial inválido'; end if;
  insert into public.retail_shifts(id,store_id,register_id,opened_by,opening_cash,opened_at) values(v_id,v_store,v_register,auth.uid(),v_amount,v_at);
  v_result:=jsonb_build_object('id',v_id);
 elsif v_kind='stock' then
  if not retail_private.has_permission(v_store,'manage_products') then perform retail_private.require_permission(v_store,'replenish_stock'); end if;
  if jsonb_typeof(p_operation->'items') is distinct from 'array' or jsonb_array_length(p_operation->'items') not between 1 and 10000 then raise exception 'Reposición inválida'; end if;
  if (select count(distinct x->>'product') from jsonb_array_elements(p_operation->'items') x)<>jsonb_array_length(p_operation->'items') then raise exception 'La reposición contiene productos repetidos'; end if;
  perform id from public.retail_products where store_id=v_store and id in (select (x->>'product')::uuid from jsonb_array_elements(p_operation->'items') x) order by id for update;
  for v_item in select value from jsonb_array_elements(p_operation->'items') loop
   select * into v_product from public.retail_products where id=(v_item->>'product')::uuid and store_id=v_store and active;
   if not found then raise exception 'Producto no disponible'; end if;
   if coalesce(v_item->>'delta','')!~'^-?[0-9]{1,7}$' then raise exception 'Cantidad inválida'; end if;
   v_delta:=(v_item->>'delta')::integer; v_cost:=(v_item->>'cost')::numeric;
   if abs(v_delta)>1000000 or v_product.stock+v_delta<0 then raise exception 'Stock resultante inválido'; end if;
   if v_cost is not null and (v_cost<0 or v_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
   if not retail_private.has_permission(v_store,'manage_products') and retail_private.role_for(v_store) not in ('owner','admin') and (v_delta<=0 or v_cost is not null) then raise exception 'Tu permiso permite sumar stock sin modificar costos'; end if;
   update public.retail_products set stock=stock+v_delta,cost=coalesce(v_cost,cost),
     last_restocked_at=case when v_delta>0 then greatest(coalesce(last_restocked_at,v_at),v_at) else last_restocked_at end
     where id=v_product.id;
   insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at) values(v_id,v_product.id,v_store,auth.uid(),v_delta,v_cost,v_at);
  end loop;
  v_result:=jsonb_build_object('id',v_id);
 else
  if not exists(select 1 from public.retail_shifts where id=v_shift and store_id=v_store) then raise exception 'Turno pendiente o no disponible'; end if;
  if v_kind='sale' then
   perform public.retail_checkout(v_shift,v_id,p_operation->>'method',(p_operation->>'paid')::numeric,p_operation->'items',(p_operation->>'priceList')::uuid,(p_operation->>'ledger')::uuid,p_operation->'payments');
   update public.retail_sales set created_at=v_at where id=v_id;
   select * into v_sale from public.retail_sales where id=v_id;
   v_result:=jsonb_build_object('id',v_id,'ticketNumber','T-'||v_sale.ticket_number);
  elsif v_kind='movement' then
   perform public.retail_add_movement(v_shift,p_operation->>'type',(p_operation->>'amount')::numeric,p_operation->>'reason',v_id,coalesce(p_operation->>'category','general'),p_operation->>'voucherUrl',p_operation->>'supplierName');
   update public.retail_movements set created_at=v_at where id=v_id;
   v_result:=jsonb_build_object('id',v_id);
  elsif v_kind in ('close','close_details') then
   if v_kind='close_details' then
    v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric,p_operation->'denominations');
   else
    v_amount:=public.retail_close_shift(v_shift,(p_operation->>'amount')::numeric);
   end if;
   update public.retail_shifts set closed_at=v_at where id=v_shift;
   v_result:=jsonb_build_object('id',v_shift,'expected',v_amount,'ticketCount',(select ticket_count from public.retail_shifts where id=v_shift));
  else raise exception 'Operación no admitida'; end if;
 end if;
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result) values(v_id,auth.uid(),v_store,p_operation,v_result);
 return v_result;
end $$;
revoke all on function public.retail_sync_operation(jsonb) from public,anon;
grant execute on function public.retail_sync_operation(jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_d3204ba0e41d2977$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610240001_shift_closing_details.sql','d3204ba0e41d297710ff1e4a05ea5048c703dbe07b9b266b66a6c7aa7a859759','schema');
 end if;
end;

-- 32/84: 202610260001_optional_depot.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610260001_optional_depot.sql') then
  raise notice 'Aplicando 202610260001_optional_depot.sql';
  execute replace($retail_source_f221d19fcff7ac88$
alter table public.retail_stores add column depot_enabled boolean not null default false;

create table public.retail_depot_balances (
 product_id uuid primary key references public.retail_products(id),
 store_id uuid not null references public.retail_stores(id),
 quantity integer not null check(quantity>=0),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create index retail_depot_balances_store on public.retail_depot_balances(store_id);
create table public.retail_depot_movements (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id),
 product_id uuid not null references public.retail_products(id),
 product_name text not null,
 action text not null check(action in ('to_salon','to_depot','receive')),
 quantity integer not null check(quantity between 1 and 1000000),
 total_after integer not null,
 depot_after integer not null,
 actor_id uuid not null references auth.users(id),
 actor_email text,
 created_at timestamptz not null default now(),
 payload jsonb not null,
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create index retail_depot_movements_store on public.retail_depot_movements(store_id,created_at desc);
alter table public.retail_depot_balances enable row level security;
alter table public.retail_depot_movements enable row level security;
revoke all on public.retail_depot_balances,public.retail_depot_movements from public,anon,authenticated;
grant select on public.retail_depot_balances,public.retail_depot_movements to authenticated;
create policy depot_balance_read on public.retail_depot_balances for select to authenticated
 using(retail_private.role_for(store_id) is not null);
create policy depot_movement_read on public.retail_depot_movements for select to authenticated
 using(retail_private.has_permission(store_id,'manage_products') or retail_private.has_permission(store_id,'replenish_stock') or retail_private.has_permission(store_id,'manage_store'));

-- Also protects legacy checkout clients, stock edits, recipes and direct REST calls.
create function retail_private.guard_depot_inventory() returns trigger
language plpgsql security definer set search_path='' as $$
declare reserved integer;
begin
 if tg_op='UPDATE' then
  if new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de un producto'; end if;
 end if;
 select quantity into reserved from public.retail_depot_balances where product_id=new.id;
 reserved:=coalesce(reserved,0);
 if new.stock<reserved then
  raise exception 'Stock de salón insuficiente para %. Hay % unidades en depósito. Reponé el salón o revisá el stock total',new.name,reserved;
 end if;
 if not new.active and reserved>0 then raise exception 'Pasá primero las unidades de % del depósito al salón antes de eliminar el producto',new.name; end if;
 return new;
end $$;
revoke all on function retail_private.guard_depot_inventory() from public,anon,authenticated;
create trigger retail_guard_depot_inventory before insert or update of stock,active,store_id on public.retail_products
 for each row execute function retail_private.guard_depot_inventory();

create function retail_private.guard_depot_setting() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.depot_enabled is distinct from old.depot_enabled then
  perform retail_private.require_permission(new.id,'manage_store');
  if not new.depot_enabled and exists(select 1 from public.retail_depot_balances where store_id=new.id and quantity>0) then
   raise exception 'Todavía hay mercadería en depósito. Pasala al salón antes de desactivar; no se borra ni se mueve automáticamente';
  end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_depot_setting() from public,anon,authenticated;
create trigger retail_guard_depot_setting before update of depot_enabled on public.retail_stores
 for each row execute function retail_private.guard_depot_setting();

create function public.retail_set_depot(p_store uuid,p_enabled boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_store');
 if p_enabled is null then raise exception 'Indicá si usás depósito'; end if;
 update public.retail_stores set depot_enabled=p_enabled where id=p_store;
end $$;
revoke all on function public.retail_set_depot(uuid,boolean) from public,anon;
grant execute on function public.retail_set_depot(uuid,boolean) to authenticated;

create function public.retail_depot_operation(p_store uuid,p_product uuid,p_quantity integer,p_action text,p_request uuid,p_cost numeric default null,p_note text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.retail_products; previous public.retail_depot_movements; reserved integer;
 enabled boolean; signature jsonb; note text:=nullif(trim(p_note),'');
begin
 if retail_private.has_permission(p_store,'manage_products') then
  perform retail_private.require_permission(p_store,'manage_products');
 else perform retail_private.require_permission(p_store,'replenish_stock'); end if;
 if p_request is null or p_quantity is null or p_quantity not between 1 and 1000000 or p_action is null or p_action not in ('to_salon','to_depot','receive') then raise exception 'Revisá la operación y la cantidad de unidades'; end if;
 if p_cost is not null and (p_action<>'receive' or p_cost<0 or p_cost::text in ('NaN','Infinity','-Infinity')) then raise exception 'Costo inválido'; end if;
 if p_cost is not null then perform retail_private.require_permission(p_store,'manage_products'); end if;
 if length(note)>300 then raise exception 'La referencia admite hasta 300 caracteres'; end if;
 signature:=jsonb_build_object('product',p_product,'quantity',p_quantity,'action',p_action,'cost',p_cost,'note',note);
 perform pg_advisory_xact_lock(hashtextextended('depot:'||p_request::text,0));
 select * into previous from public.retail_depot_movements where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.actor_id<>auth.uid() or previous.payload<>signature then raise exception 'La solicitud corresponde a otra operación de depósito'; end if;
  return previous.id;
 end if;
 -- Consistent lock order: setting first, then product. Checkout locks the product too.
 select depot_enabled into enabled from public.retail_stores where id=p_store for share;
 if not coalesce(enabled,false) then raise exception 'El depósito no está habilitado. Actualizá los datos del comercio'; end if;
 select * into p from public.retail_products where id=p_product and store_id=p_store and active for update;
 if not found then raise exception 'Producto no disponible. Actualizá el catálogo'; end if;
 if jsonb_array_length(p.stock_components)>0 then raise exception 'Mové o recibí los componentes; el combo no tiene stock físico propio'; end if;
 select quantity into reserved from public.retail_depot_balances where product_id=p.id;
 reserved:=coalesce(reserved,0);
 if p_action='to_salon' then
  if reserved<p_quantity then raise exception 'No alcanza el stock del depósito para %. Actualizá y revisá la cantidad',p.name; end if;
  reserved:=reserved-p_quantity;
 elsif p_action='to_depot' then
  if p.stock-reserved<p_quantity then raise exception 'No alcanza el stock del salón para %. Actualizá y revisá la cantidad',p.name; end if;
  reserved:=reserved+p_quantity;
 else
  if p.stock::bigint+p_quantity>2147483647 then raise exception 'El stock resultante supera el límite permitido'; end if;
  update public.retail_products set stock=stock+p_quantity,cost=coalesce(p_cost,cost),last_restocked_at=now() where id=p.id;
  p.stock:=p.stock+p_quantity;
  reserved:=reserved+p_quantity;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
   values(p_request,p.id,p_store,auth.uid(),p_quantity,p_cost,now());
 end if;
 insert into public.retail_depot_balances(product_id,store_id,quantity) values(p.id,p_store,reserved)
  on conflict(product_id) do update set quantity=excluded.quantity;
 insert into public.retail_depot_movements(id,store_id,product_id,product_name,action,quantity,total_after,depot_after,actor_id,actor_email,payload)
  values(p_request,p_store,p.id,p.name,p_action,p_quantity,p.stock,reserved,auth.uid(),auth.jwt()->>'email',signature);
 return p_request;
end $$;
revoke all on function public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text) from public,anon;
grant execute on function public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text) to authenticated;
notify pgrst,'reload schema';
$retail_source_f221d19fcff7ac88$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260001_optional_depot.sql','f221d19fcff7ac881cdbeefc3d3546e625c464872038afb8b69d5491e90b1f5a','schema');
 end if;
end;

-- 33/84: 202610260002_create_composite_product.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610260002_create_composite_product.sql') then
  raise notice 'Aplicando 202610260002_create_composite_product.sql';
  execute replace($retail_source_2e23fbafc73e0b69$
create function public.retail_create_composite_product(p_store uuid,p_request uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare signature jsonb; previous public.retail_sync_receipts; category uuid;
 label text:=trim(p_data->>'name'); code text:=trim(p_data->>'code'); price numeric;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 perform retail_private.require_permission(p_store,'manage_compositions');
 if p_request is null or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'Revisá los datos del combo'; end if;
 signature:=jsonb_build_object('kind','create_composite','store',p_store,'data',p_data);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_sync_receipts where id=p_request;
 if found then
  if previous.user_id<>auth.uid() or previous.store_id<>p_store or previous.payload<>signature then raise exception 'La solicitud corresponde a otra operación. Revisá el combo antes de guardar'; end if;
  return (previous.result->>'id')::uuid;
 end if;
 if label is null or length(label) not between 1 and 160 or code is null or length(code) not between 1 and 80 then raise exception 'Completá nombre y código del combo'; end if;
 price:=(p_data->>'price')::numeric;
 if price is null or price::text in ('NaN','Infinity','-Infinity') or price not between 0.01 and 9999999999 then raise exception 'Ingresá un precio de venta válido'; end if;
 category:=(p_data->>'categoryId')::uuid;
 if not exists(select 1 from public.retail_categories where id=category and store_id=p_store) then raise exception 'Elegí una categoría del comercio'; end if;
 if jsonb_typeof(p_data->'components') is distinct from 'array' then raise exception 'Elegí los componentes del combo'; end if;
 if jsonb_array_length(p_data->'components') not between 1 and 30 then raise exception 'Elegí entre 1 y 30 componentes'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 -- The existing composition trigger requires an empty recipe on INSERT. Both
 -- statements stay in this transaction: no bare product survives a recipe error.
 insert into public.retail_products(id,store_id,category_id,name,code,price,cost,stock,min_stock,emoji,sellable)
  values(p_request,p_store,category,label,code,price,0,0,4,'📦',true);
 perform public.retail_save_product_composition(p_store,p_request,p_data->'components','[]'::jsonb);
 insert into public.retail_sync_receipts(id,user_id,store_id,payload,result)
  values(p_request,auth.uid(),p_store,signature,jsonb_build_object('id',p_request));
 return p_request;
end $$;
revoke all on function public.retail_create_composite_product(uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_create_composite_product(uuid,uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
$retail_source_2e23fbafc73e0b69$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260002_create_composite_product.sql','2e23fbafc73e0b697b607cae3b0587c9a709f13e4882b3a8ce244530eabb60a4','schema');
 end if;
end;

-- 34/84: 202610260003_billing_fields.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610260003_billing_fields.sql') then
  raise notice 'Aplicando 202610260003_billing_fields.sql';
  execute replace($retail_source_2a42b0a16de67076$
alter table public.retail_stores
  add column cuit text,
  add column razon_social text,
  add column condicion_iva text check(condicion_iva is null or condicion_iva in ('RI','MO','EX')),
  add column punto_venta_afip integer check(punto_venta_afip is null or (punto_venta_afip between 1 and 99998)),
  add column iibb text,
  add column inicio_actividades date,
  add column billing_enabled boolean not null default false;

alter table public.retail_stores
  add constraint retail_stores_billing_enabled_check
  check (
    not billing_enabled or (
      cuit is not null and length(trim(cuit)) >= 11 and
      razon_social is not null and length(trim(razon_social)) >= 1 and
      condicion_iva in ('RI','MO','EX') and
      punto_venta_afip is not null and (punto_venta_afip between 1 and 99998)
    )
  );

alter table public.retail_sales
  add column cbte_tipo smallint,
  add column cbte_nro bigint,
  add column cae text,
  add column cae_vto date,
  add column billing_status text not null default 'none' check(billing_status in ('none','pending','authorized','error','retry')),
  add column billing_error text,
  add column billing_attempts smallint not null default 0 check(billing_attempts >= 0);

create index retail_sales_billing_pending
  on public.retail_sales(store_id, billing_status)
  where billing_status in ('pending', 'retry', 'error');

create function retail_private.initialize_sale_billing() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  v_billing_enabled boolean;
begin
  if new.billing_status is null or new.billing_status = 'none' then
    select billing_enabled into v_billing_enabled from public.retail_stores where id = new.store_id;
    if coalesce(v_billing_enabled, false) then
      new.billing_status := 'pending';
    else
      new.billing_status := 'none';
    end if;
  end if;
  return new;
end $$;
revoke all on function retail_private.initialize_sale_billing() from public,anon,authenticated;

create trigger retail_initialize_sale_billing
  before insert on public.retail_sales
  for each row execute function retail_private.initialize_sale_billing();

create function public.retail_set_billing_settings(
  p_store uuid,
  p_cuit text,
  p_razon_social text,
  p_condicion_iva text,
  p_punto_venta_afip integer,
  p_iibb text,
  p_inicio_actividades date,
  p_billing_enabled boolean
) returns void
language plpgsql security definer set search_path='' as $$
declare
  v_cuit text := nullif(trim(p_cuit), '');
  v_razon text := nullif(trim(p_razon_social), '');
  v_condicion text := nullif(trim(p_condicion_iva), '');
  v_iibb text := nullif(trim(p_iibb), '');
  v_enabled boolean := coalesce(p_billing_enabled, false);
begin
  perform retail_private.require_permission(p_store, 'manage_store');

  if v_cuit is not null then
    if not (v_cuit ~ '^\d{2}-?\d{8}-?\d{1}$') then
      raise exception 'El CUIT debe tener 11 dígitos numéricos válidos';
    end if;
  end if;

  if v_condicion is not null and v_condicion not in ('RI', 'MO', 'EX') then
    raise exception 'Condición frente al IVA inválida. Elegí Monotributo, Responsable Inscripto o Exento';
  end if;

  if p_punto_venta_afip is not null and (p_punto_venta_afip < 1 or p_punto_venta_afip > 99998) then
    raise exception 'El punto de venta debe estar entre 1 y 99998';
  end if;

  if v_enabled then
    if v_cuit is null or v_razon is null or v_condicion is null or p_punto_venta_afip is null then
      raise exception 'Para activar la facturación completá CUIT, Razón Social, Condición frente al IVA y Punto de Venta';
    end if;
  end if;

  update public.retail_stores
  set
    cuit = v_cuit,
    razon_social = v_razon,
    condicion_iva = v_condicion,
    punto_venta_afip = p_punto_venta_afip,
    iibb = v_iibb,
    inicio_actividades = p_inicio_actividades,
    billing_enabled = v_enabled
  where id = p_store;
end $$;

revoke all on function public.retail_set_billing_settings(uuid,text,text,text,integer,text,date,boolean) from public,anon;
grant execute on function public.retail_set_billing_settings(uuid,text,text,text,integer,text,date,boolean) to authenticated;

create function public.retail_update_sale_billing(
  p_store uuid,
  p_sale uuid,
  p_status text,
  p_cbte_tipo smallint default null,
  p_cbte_nro bigint default null,
  p_cae text default null,
  p_cae_vto date default null,
  p_error text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  s public.retail_sales;
begin
  if not (retail_private.has_permission(p_store, 'manage_store') or
          retail_private.has_permission(p_store, 'sell') or
          retail_private.has_permission(p_store, 'view_sales')) then
    raise exception 'Permisos insuficientes para actualizar el comprobante fiscal';
  end if;

  select * into s from public.retail_sales
  where id = p_sale and store_id = p_store for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if p_status not in ('none', 'pending', 'authorized', 'error', 'retry') then
    raise exception 'Estado de facturación inválido';
  end if;

  if p_status = 'authorized' then
    if p_cae is null or trim(p_cae) = '' or p_cae_vto is null or p_cbte_tipo is null or p_cbte_nro is null then
      raise exception 'Faltan datos de autorización (CAE, vencimiento o número de comprobante)';
    end if;

    update public.retail_sales
    set
      billing_status = 'authorized',
      cbte_tipo = p_cbte_tipo,
      cbte_nro = p_cbte_nro,
      cae = trim(p_cae),
      cae_vto = p_cae_vto,
      billing_error = null
    where id = p_sale;
  elsif p_status = 'error' then
    update public.retail_sales
    set
      billing_status = 'error',
      billing_error = nullif(trim(p_error), ''),
      billing_attempts = billing_attempts + 1
    where id = p_sale;
  else
    update public.retail_sales
    set
      billing_status = p_status
    where id = p_sale;
  end if;
end $$;

revoke all on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,date,text) from public,anon;
grant execute on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,date,text) to authenticated;

notify pgrst,'reload schema';
$retail_source_2a42b0a16de67076$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260003_billing_fields.sql','2a42b0a16de6707616bf9ca85fc249a83f55ee6b5976299b51197573391e6cd3','schema');
 end if;
end;

-- 35/84: 202610260004_price_list_tree.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610260004_price_list_tree.sql') then
  raise notice 'Aplicando 202610260004_price_list_tree.sql';
  execute replace($retail_source_bb77060967eec30f$
-- Legacy lists keep their catalog origin, percentages, branch and fixed prices.
-- Cost is a virtual read-only origin, not a new sellable list or a product write.
alter table public.retail_price_lists
 add column base_kind text not null default 'catalog' check(base_kind in ('cost','catalog','list')),
 add column parent_id uuid,
 add column pricing_rules jsonb not null default '[]'::jsonb,
 add column revision bigint not null default 0,
 add constraint retail_price_list_parent foreign key(store_id,parent_id) references public.retail_price_lists(store_id,id),
 add constraint retail_price_list_origin check((base_kind='list')=(parent_id is not null));
create index retail_price_list_children on public.retail_price_lists(store_id,parent_id);

create function retail_private.validate_price_tree() returns trigger
language plpgsql security definer set search_path='' as $$
declare rule jsonb; parent public.retail_price_lists; cursor_id uuid; visited uuid[]; depth integer:=1; child_depth integer;
begin
 if tg_op='UPDATE' and new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de una lista'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.store_id::text,0));
 if jsonb_typeof(new.pricing_rules) is distinct from 'array' or jsonb_array_length(new.pricing_rules)>300 then raise exception 'La lista admite hasta 300 reglas'; end if;
 for rule in select value from jsonb_array_elements(new.pricing_rules) loop
  if coalesce(rule->>'scope','') not in ('category','brand','product') or coalesce(btrim(rule->>'target'),'')='' or
     jsonb_typeof(rule->'adjustment') is distinct from 'number' then raise exception 'Completá el destino y porcentaje de cada regla'; end if;
  if (rule->>'adjustment')::numeric<=-100 or (rule->>'adjustment')::numeric>10000 or round((rule->>'adjustment')::numeric,2)<>(rule->>'adjustment')::numeric then raise exception 'El ajuste debe estar entre -99,99 y 10.000, con hasta dos decimales'; end if;
  if rule->>'scope'='category' and not exists(select 1 from public.retail_categories where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Categoría no disponible en este comercio'; end if;
  if rule->>'scope'='product' and not exists(select 1 from public.retail_products where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Producto no disponible en este comercio'; end if;
  if rule->>'scope'='brand' and (length(rule->>'target')>200 or rule->>'target'<>lower(btrim(rule->>'target'))) then raise exception 'La marca debe estar normalizada'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(new.pricing_rules) r group by r->>'scope',r->>'target' having count(*)>1) then raise exception 'Hay reglas repetidas para el mismo destino'; end if;
 visited:=array[new.id]; cursor_id:=new.parent_id;
 while cursor_id is not null loop
  if cursor_id=any(visited) then raise exception 'Una lista no puede depender de sí misma ni de una lista derivada de ella'; end if;
  select * into parent from public.retail_price_lists where id=cursor_id and store_id=new.store_id;
  if not found then raise exception 'La lista de origen no está disponible en este comercio'; end if;
  if parent.branch_id is not null and parent.branch_id is distinct from new.branch_id then raise exception 'Una lista de sucursal solo puede originar listas de esa misma sucursal'; end if;
  visited:=array_append(visited,cursor_id); depth:=depth+1; cursor_id:=parent.parent_id;
  if depth>12 then raise exception 'Se permiten hasta 12 niveles de listas'; end if;
 end loop;
 if new.branch_id is not null and exists(select 1 from public.retail_price_lists where parent_id=new.id and store_id=new.store_id and branch_id is distinct from new.branch_id) then raise exception 'Primero revisá las sucursales de las listas derivadas'; end if;
 with recursive children as (
  select id,1 as level,array[new.id,id] as path from public.retail_price_lists where store_id=new.store_id and parent_id=new.id
  union all select l.id,c.level+1,c.path||l.id from children c join public.retail_price_lists l on l.parent_id=c.id and l.store_id=new.store_id where not l.id=any(c.path) and c.level<12
 ) select coalesce(max(level),0) into child_depth from children;
 if depth+child_depth>12 then raise exception 'Este origen dejaría más de 12 niveles de listas'; end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
 return new;
end $$;
revoke all on function retail_private.validate_price_tree() from public,anon,authenticated;
create trigger retail_validate_price_tree before insert or update on public.retail_price_lists
 for each row execute function retail_private.validate_price_tree();

-- RPC-only writes lock the store BEFORE rows, coordinating checkout and concurrent edits.
-- RLS member reads and delegated policies remain; no new role is granted.
revoke insert,update,delete on public.retail_price_lists from authenticated;
revoke update(name,adjustment,active,branch_id) on public.retail_price_lists from authenticated;
revoke insert,update,delete on public.retail_price_overrides from authenticated;

create function public.retail_save_price_list_tree(p_store uuid,p_id uuid,p_name text,p_adjustment numeric,p_active boolean,p_branch uuid,p_base text,p_parent uuid,p_rules jsonb,p_revision bigint default 0)
returns uuid language plpgsql security definer set search_path='' as $$
declare previous public.retail_price_lists;
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para administrar listas' using errcode='42501'; end if;
 if p_id is null then raise exception 'Falta el identificador de la lista'; end if;
 if p_adjustment is null or p_adjustment::text in ('NaN','Infinity','-Infinity') or p_adjustment<=-100 or p_adjustment>10000 or round(p_adjustment,2)<>p_adjustment then raise exception 'Ingresá un ajuste entre -99,99 y 10.000, con hasta dos decimales'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 select * into previous from public.retail_price_lists where id=p_id for update;
 if found then
  if previous.store_id<>p_store then raise exception 'Lista no disponible' using errcode='42501'; end if;
  -- Retrying a committed request does not create another list or bump its revision.
  if row(previous.name,previous.adjustment,previous.active,previous.branch_id,previous.base_kind,previous.parent_id,previous.pricing_rules)
    is not distinct from row(btrim(p_name),p_adjustment,p_active,p_branch,p_base,p_parent,p_rules) then return p_id; end if;
  if previous.revision is distinct from p_revision then raise exception 'La lista cambió en otro dispositivo. Actualizá los datos y revisá el borrador antes de guardarlo'; end if;
  update public.retail_price_lists set name=btrim(p_name),adjustment=p_adjustment,active=p_active,branch_id=p_branch,base_kind=p_base,parent_id=p_parent,pricing_rules=p_rules where id=p_id and store_id=p_store;
 else
  insert into public.retail_price_lists(id,store_id,name,adjustment,active,branch_id,base_kind,parent_id,pricing_rules)
   values(p_id,p_store,btrim(p_name),p_adjustment,p_active,p_branch,p_base,p_parent,p_rules);
 end if;
 return p_id;
end $$;
revoke all on function public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint) from public,anon;
grant execute on function public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint) to authenticated;

create function public.retail_save_price_override(p_store uuid,p_list uuid,p_product uuid,p_price numeric)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para administrar listas' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 if not exists(select 1 from public.retail_price_lists where id=p_list and store_id=p_store) or not exists(select 1 from public.retail_products where id=p_product and store_id=p_store) then raise exception 'Lista o producto no disponible en este comercio'; end if;
 if p_price is null then
  delete from public.retail_price_overrides where store_id=p_store and list_id=p_list and product_id=p_product;
 else
  insert into public.retail_price_overrides(store_id,list_id,product_id,price) values(p_store,p_list,p_product,p_price)
   on conflict(list_id,product_id) do update set price=excluded.price;
 end if;
end $$;
revoke all on function public.retail_save_price_override(uuid,uuid,uuid,numeric) from public,anon;
grant execute on function public.retail_save_price_override(uuid,uuid,uuid,numeric) to authenticated;

create function retail_private.product_list_price(p_product public.retail_products,p_list uuid,p_depth integer default 0)
returns numeric language plpgsql security definer set search_path='' as $$
declare list public.retail_price_lists; price numeric; rule jsonb; scope text; target text;
begin
 if p_depth>=12 then raise exception 'Revisá el origen de la lista: demasiados niveles'; end if;
 if p_list is null then return p_product.price; end if;
 select * into list from public.retail_price_lists where id=p_list and store_id=p_product.store_id;
 if not found then raise exception 'Lista de origen no disponible'; end if;
 select o.price into price from public.retail_price_overrides o where o.store_id=p_product.store_id and o.list_id=p_list and o.product_id=p_product.id;
 if found then return price; end if;
 if list.base_kind='cost' then
  if p_product.cost<=0 then raise exception 'Falta cargar el costo de % para calcular esta lista',p_product.name; end if;
  price:=p_product.cost;
 elsif list.base_kind='list' then price:=retail_private.product_list_price(p_product,list.parent_id,p_depth+1);
 else price:=p_product.price;
 end if;
 price:=greatest(0.01,round(price*(1+list.adjustment/100),2));
 foreach scope in array array['category','brand','product'] loop
  target:=case scope when 'category' then p_product.category_id::text when 'product' then p_product.id::text else lower(btrim(coalesce(p_product.brand,''))) end;
  for rule in select value from jsonb_array_elements(list.pricing_rules) r where r->>'scope'=scope and r->>'target'=target loop
   price:=greatest(0.01,round(price*(1+(rule->>'adjustment')::numeric/100),2));
  end loop;
 end loop;
 if price>=1000000000000 then raise exception 'El precio calculado de % supera el límite permitido',p_product.name; end if;
 return price;
end $$;
revoke all on function retail_private.product_list_price(public.retail_products,uuid,integer) from public,anon,authenticated;

-- Preserve the real checkout and all subsequent stock, ledger, margin, permission,
-- payment, receipt and idempotency protections. Replace only its price lookup.
do $patch$
declare definition text; previous text:=$old$   v_expected:=p.price;
   if p_price_list is not null then
    select price into v_expected from public.retail_price_overrides where store_id=s.store_id and list_id=p_price_list and product_id=p.id for share;
    v_expected:=coalesce(v_expected,greatest(0.01,round(p.price*(1+v_list.adjustment/100),2)));
   end if;$old$;
begin
 definition:=replace(pg_get_functiondef('public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb)'::regprocedure),E'\r','');
 if position(previous in definition)=0 or position(' s:=retail_private.check_shift(p_shift);' in definition)=0 then
  raise exception 'La definición de checkout no coincide con la versión esperada. No se aplicaron cambios; revisar instalación';
 end if;
 definition:=replace(definition,previous,'   v_expected:=retail_private.product_list_price(p,p_price_list);');
 definition:=replace(definition,' s:=retail_private.check_shift(p_shift);',E' s:=retail_private.check_shift(p_shift);\n perform pg_advisory_xact_lock_shared(hashtextextended(''retail-pricing:''||s.store_id::text,0));');
 execute definition;
end $patch$;

notify pgrst,'reload schema';
$retail_source_bb77060967eec30f$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260004_price_list_tree.sql','bb77060967eec30f15a7befb20989890ac312c90f76e002656fa6dfada36bf36','schema');
 end if;
exception when raise_exception then
 if sqlerrm<>'La definición de checkout no coincide con la versión esperada. No se aplicaron cambios; revisar instalación' then raise; end if;
 raise exception using errcode=sqlstate,message=sqlerrm,
  detail='Huella del cuerpo checkout (LF): '||coalesce((select md5(replace(prosrc,chr(13),'')) from pg_catalog.pg_proc
   where oid=to_regprocedure('public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb)')),'función ausente'),
  hint='El SQL de instalación ya normaliza CRLF. Si persiste, ejecutar supabase/maintenance/check_manual_schema_history.sql y compartir el resultado y esta huella. No quitar la validación ni reemplazar checkout a ciegas.';
end;

-- 36/84: 202610260005_delete_price_lists.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610260005_delete_price_lists.sql') then
  raise notice 'Aplicando 202610260005_delete_price_lists.sql';
  if to_regprocedure('public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)') is null then
   raise exception 'Falta una función del árbol de listas: %', 'public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)'
    using errcode='55000', hint='La eliminación requiere 202610260004_price_list_tree.sql. Aplicá primero el paquete 004 de supabase/updates/ o usá schema.sql completo. Si el historial ya declara instalada esa migración, revisar la instalación con el diagnóstico de solo lectura; no borrar historial ni ampliar el baseline.';
  end if;
  if to_regprocedure('public.retail_save_price_override(uuid,uuid,uuid,numeric)') is null then
   raise exception 'Falta una función del árbol de listas: %', 'public.retail_save_price_override(uuid,uuid,uuid,numeric)'
    using errcode='55000', hint='La eliminación requiere 202610260004_price_list_tree.sql. Aplicá primero el paquete 004 de supabase/updates/ o usá schema.sql completo. Si el historial ya declara instalada esa migración, revisar la instalación con el diagnóstico de solo lectura; no borrar historial ni ampliar el baseline.';
  end if;
  if to_regprocedure('retail_private.product_list_price(public.retail_products,uuid,integer)') is null then
   raise exception 'Falta una función del árbol de listas: %', 'retail_private.product_list_price(public.retail_products,uuid,integer)'
    using errcode='55000', hint='La eliminación requiere 202610260004_price_list_tree.sql. Aplicá primero el paquete 004 de supabase/updates/ o usá schema.sql completo. Si el historial ya declara instalada esa migración, revisar la instalación con el diagnóstico de solo lectura; no borrar historial ni ampliar el baseline.';
  end if;
  execute replace($retail_source_540fb2b7146a1f68$
-- Soft deletion retains sale FKs, fixed prices, rules and the author of the removal.
alter table public.retail_price_lists
 add column deleted_at timestamptz,
 add column deleted_by uuid references auth.users(id),
 add constraint retail_price_list_deleted_state check((deleted_at is null)=(deleted_by is null) and (deleted_at is null or not active));
alter table public.retail_price_lists drop constraint retail_price_lists_store_id_name_key;
create unique index retail_live_price_list_name on public.retail_price_lists(store_id,name) where deleted_at is null;

drop policy member_read on public.retail_price_lists;
create policy member_read on public.retail_price_lists for select to authenticated
 using(retail_private.role_for(store_id) is not null and deleted_at is null);
drop policy member_read on public.retail_price_overrides;
create policy member_read on public.retail_price_overrides for select to authenticated
 using(retail_private.role_for(store_id) is not null and exists(
  select 1 from public.retail_price_lists l where l.id=list_id and l.store_id=retail_price_overrides.store_id and l.deleted_at is null
 ));

create or replace function retail_private.validate_price_tree() returns trigger
language plpgsql security definer set search_path='' as $$
declare rule jsonb; parent public.retail_price_lists; cursor_id uuid; visited uuid[]; depth integer:=1; child_depth integer;
begin
 if tg_op='UPDATE' and new.store_id<>old.store_id then raise exception 'No se puede cambiar el comercio de una lista'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.store_id::text,0));
 if tg_op='UPDATE' and old.deleted_at is not null then raise exception 'Esta lista fue eliminada. Actualizá los datos'; end if;
 if new.deleted_at is not null then
  if tg_op<>'UPDATE' then raise exception 'No se puede crear una lista eliminada'; end if;
  if exists(select 1 from public.retail_price_lists where store_id=new.store_id and parent_id=new.id and deleted_at is null) then
   raise exception 'Cambiá primero el origen de las listas derivadas antes de eliminar esta lista';
  end if;
  new.revision:=old.revision+1; return new;
 end if;
 if jsonb_typeof(new.pricing_rules) is distinct from 'array' or jsonb_array_length(new.pricing_rules)>300 then raise exception 'La lista admite hasta 300 reglas'; end if;
 for rule in select value from jsonb_array_elements(new.pricing_rules) loop
  if coalesce(rule->>'scope','') not in ('category','brand','product') or coalesce(btrim(rule->>'target'),'')='' or
     jsonb_typeof(rule->'adjustment') is distinct from 'number' then raise exception 'Completá el destino y porcentaje de cada regla'; end if;
  if (rule->>'adjustment')::numeric<=-100 or (rule->>'adjustment')::numeric>10000 or round((rule->>'adjustment')::numeric,2)<>(rule->>'adjustment')::numeric then raise exception 'El ajuste debe estar entre -99,99 y 10.000, con hasta dos decimales'; end if;
  if rule->>'scope'='category' and not exists(select 1 from public.retail_categories where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Categoría no disponible en este comercio'; end if;
  if rule->>'scope'='product' and not exists(select 1 from public.retail_products where store_id=new.store_id and id::text=rule->>'target') then raise exception 'Producto no disponible en este comercio'; end if;
  if rule->>'scope'='brand' and (length(rule->>'target')>200 or rule->>'target'<>lower(btrim(rule->>'target'))) then raise exception 'La marca debe estar normalizada'; end if;
 end loop;
 if exists(select 1 from jsonb_array_elements(new.pricing_rules) r group by r->>'scope',r->>'target' having count(*)>1) then raise exception 'Hay reglas repetidas para el mismo destino'; end if;
 visited:=array[new.id]; cursor_id:=new.parent_id;
 while cursor_id is not null loop
  if cursor_id=any(visited) then raise exception 'Una lista no puede depender de sí misma ni de una lista derivada de ella'; end if;
  select * into parent from public.retail_price_lists where id=cursor_id and store_id=new.store_id and deleted_at is null;
  if not found then raise exception 'La lista de origen no está disponible. Elegí otra'; end if;
  if parent.branch_id is not null and parent.branch_id is distinct from new.branch_id then raise exception 'Una lista de sucursal solo puede originar listas de esa misma sucursal'; end if;
  visited:=array_append(visited,cursor_id); depth:=depth+1; cursor_id:=parent.parent_id;
  if depth>12 then raise exception 'Se permiten hasta 12 niveles de listas'; end if;
 end loop;
 if new.branch_id is not null and exists(select 1 from public.retail_price_lists where parent_id=new.id and store_id=new.store_id and deleted_at is null and branch_id is distinct from new.branch_id) then raise exception 'Primero revisá las sucursales de las listas derivadas'; end if;
 with recursive children as (
  select id,1 as level,array[new.id,id] as path from public.retail_price_lists where store_id=new.store_id and parent_id=new.id and deleted_at is null
  union all select l.id,c.level+1,c.path||l.id from children c join public.retail_price_lists l on l.parent_id=c.id and l.store_id=new.store_id where l.deleted_at is null and not l.id=any(c.path) and c.level<12
 ) select coalesce(max(level),0) into child_depth from children;
 if depth+child_depth>12 then raise exception 'Este origen dejaría más de 12 niveles de listas'; end if;
 if tg_op='UPDATE' then new.revision:=old.revision+1; end if;
 return new;
end $$;
revoke all on function retail_private.validate_price_tree() from public,anon,authenticated;

-- Reject writes from stale clients and deleted ancestors, including idempotent-save
-- fast paths that do not run a row trigger. Leave all price calculations intact.
do $patch$
declare signature text; anchor text; replacement text; definition text;
begin
 for signature,anchor,replacement in select * from (values
  ('public.retail_save_price_list_tree(uuid,uuid,text,numeric,boolean,uuid,text,uuid,jsonb,bigint)',
   'if previous.store_id<>p_store then raise exception ''Lista no disponible'' using errcode=''42501''; end if;',
   E'if previous.store_id<>p_store then raise exception ''Lista no disponible'' using errcode=''42501''; end if;\n  if previous.deleted_at is not null then raise exception ''Esta lista fue eliminada. Actualizá los datos''; end if;'),
  ('public.retail_save_price_override(uuid,uuid,uuid,numeric)',
   'where id=p_list and store_id=p_store)',
   'where id=p_list and store_id=p_store and deleted_at is null)'),
  ('retail_private.product_list_price(public.retail_products,uuid,integer)',
   'if not found then raise exception ''Lista de origen no disponible''; end if;',
   'if not found or list.deleted_at is not null then raise exception ''Lista de origen no disponible. Actualizá los datos''; end if;')
 ) as patches(signature,anchor,replacement)
 loop
  definition:=pg_get_functiondef(signature::regprocedure);
  if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>1 then
   raise exception 'La definición de % no coincide con la versión esperada. No se aplicaron cambios; revisar instalación',signature;
  end if;
  execute replace(definition,anchor,replacement);
 end loop;
end $patch$;

create function public.retail_delete_price_list(p_store uuid,p_list uuid,p_revision bigint)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_list public.retail_price_lists;
begin
 if not retail_private.has_permission(p_store,'manage_price_lists') then raise exception 'Sin permiso para eliminar listas' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||p_store::text,0));
 select * into current_list from public.retail_price_lists where id=p_list and store_id=p_store for update;
 if not found then raise exception 'Lista no disponible en este comercio'; end if;
 -- A lost response can be retried without changing its original author or timestamp.
 if current_list.deleted_at is not null then return p_list; end if;
 if current_list.revision is distinct from p_revision then raise exception 'La lista cambió en otro dispositivo. Actualizá los datos y volvé a revisar antes de eliminarla'; end if;
 if exists(select 1 from public.retail_price_lists where store_id=p_store and parent_id=p_list and deleted_at is null) then
  raise exception 'Cambiá primero el origen de las listas derivadas antes de eliminar esta lista';
 end if;
 update public.retail_price_lists set active=false,deleted_at=clock_timestamp(),deleted_by=auth.uid() where id=p_list and store_id=p_store;
 return p_list;
end $$;
revoke all on function public.retail_delete_price_list(uuid,uuid,bigint) from public,anon;
grant execute on function public.retail_delete_price_list(uuid,uuid,bigint) to authenticated;

notify pgrst,'reload schema';
$retail_source_540fb2b7146a1f68$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260005_delete_price_lists.sql','540fb2b7146a1f68e89f462f43305d58798953d156be4e62e6944f0edccd2a69','schema');
 end if;
end;

-- 37/84: 202610260006_billing_update_robustness.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610260006_billing_update_robustness.sql') then
  raise notice 'Aplicando 202610260006_billing_update_robustness.sql';
  execute replace($retail_source_97469041ab94b975$
-- Eliminar firmas previas sobrecargadas para evitar conflicto de tipos (PGRST203) en PostgREST
drop function if exists public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,date,text);
drop function if exists public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text);

create or replace function public.retail_update_sale_billing(
  p_store uuid,
  p_sale uuid,
  p_status text,
  p_cbte_tipo smallint default null,
  p_cbte_nro bigint default null,
  p_cae text default null,
  p_cae_vto text default null,
  p_error text default null
) returns void
language plpgsql security definer set search_path='' as $$
declare
  s public.retail_sales;
  v_vto date;
begin
  if not (retail_private.has_permission(p_store, 'manage_store') or
          retail_private.has_permission(p_store, 'sell') or
          retail_private.has_permission(p_store, 'view_sales')) then
    raise exception 'Permisos insuficientes para actualizar el comprobante fiscal';
  end if;

  select * into s from public.retail_sales
  where id = p_sale and store_id = p_store for update;

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if p_status not in ('none', 'pending', 'authorized', 'error', 'retry') then
    raise exception 'Estado de facturación inválido';
  end if;

  if p_status = 'authorized' then
    if p_cae is null or trim(p_cae) = '' or p_cae_vto is null or trim(p_cae_vto) = '' or p_cbte_tipo is null or p_cbte_nro is null then
      raise exception 'Faltan datos de autorización (CAE, vencimiento o número de comprobante)';
    end if;

    begin
      v_vto := trim(p_cae_vto)::date;
    exception when others then
      v_vto := current_date + 10;
    end;

    update public.retail_sales
    set
      billing_status = 'authorized',
      cbte_tipo = p_cbte_tipo,
      cbte_nro = p_cbte_nro,
      cae = trim(p_cae),
      cae_vto = v_vto,
      billing_error = null
    where id = p_sale;
  elsif p_status = 'error' then
    update public.retail_sales
    set
      billing_status = 'error',
      billing_error = nullif(trim(p_error), ''),
      billing_attempts = coalesce(billing_attempts, 0) + 1
    where id = p_sale;
  else
    update public.retail_sales
    set
      billing_status = p_status
    where id = p_sale;
  end if;
end $$;

revoke all on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) from public,anon;
grant execute on function public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) to authenticated;

notify pgrst,'reload schema';
$retail_source_97469041ab94b975$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610260006_billing_update_robustness.sql','97469041ab94b975ce569c26fb60b2aba78d9f8a94c4c13a5567c47f14c576f2','schema');
 end if;
end;

-- 38/84: 202610270001_store_billing_credentials.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610270001_store_billing_credentials.sql') then
  raise notice 'Aplicando 202610270001_store_billing_credentials.sql';
  execute replace($retail_source_5c5d202e9b944644$
create table if not exists retail_private.store_billing_credentials (
  store_id uuid primary key references public.retail_stores(id) on delete cascade,
  arca_cert text not null,
  arca_key text not null,
  arca_environment text not null default 'homo' check (arca_environment in ('homo', 'prod')),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

revoke all on retail_private.store_billing_credentials from public,anon,authenticated;

-- RPC to securely set/update ARCA credentials for a store. Requires manage_store permission.
create or replace function public.retail_set_billing_credentials(
  p_store uuid,
  p_cert text,
  p_key text,
  p_environment text default 'homo'
) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not retail_private.has_permission(p_store, 'manage_store') then
    raise exception 'Solo administradores o propietarios pueden configurar certificados fiscales de ARCA';
  end if;

  if p_cert is null or trim(p_cert) = '' then
    raise exception 'El certificado digital (.crt) es obligatorio';
  end if;

  if p_key is null or trim(p_key) = '' then
    raise exception 'La clave privada (.key) es obligatoria';
  end if;

  if p_environment not in ('homo', 'prod') then
    raise exception 'Entorno inválido. Debe ser "homo" (testing) o "prod" (producción)';
  end if;

  insert into retail_private.store_billing_credentials(
    store_id, arca_cert, arca_key, arca_environment, updated_at, updated_by
  ) values (
    p_store, trim(p_cert), trim(p_key), p_environment, now(), auth.uid()
  )
  on conflict (store_id) do update set
    arca_cert = excluded.arca_cert,
    arca_key = excluded.arca_key,
    arca_environment = excluded.arca_environment,
    updated_at = now(),
    updated_by = auth.uid();
end $$;

-- RPC to inspect the status of credentials without EVER exposing the private key or full certificate
create or replace function public.retail_get_billing_credentials_status(
  p_store uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  cred retail_private.store_billing_credentials;
begin
  if not retail_private.has_permission(p_store, 'manage_store') then
    return jsonb_build_object('configured', false, 'error', 'Sin permisos');
  end if;

  select * into cred from retail_private.store_billing_credentials where store_id = p_store;

  if not found then
    return jsonb_build_object(
      'configured', false,
      'environment', 'homo',
      'updated_at', null
    );
  end if;

  return jsonb_build_object(
    'configured', true,
    'environment', cred.arca_environment,
    'updated_at', cred.updated_at
  );
end $$;

revoke all on function public.retail_set_billing_credentials(uuid,text,text,text) from public,anon;
grant execute on function public.retail_set_billing_credentials(uuid,text,text,text) to authenticated;

revoke all on function public.retail_get_billing_credentials_status(uuid) from public,anon;
grant execute on function public.retail_get_billing_credentials_status(uuid) to authenticated;

notify pgrst,'reload schema';
$retail_source_5c5d202e9b944644$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610270001_store_billing_credentials.sql','5c5d202e9b94464428e5417696fbc782491a023ad726f772b5693436ba16b9cb','schema');
 end if;
end;

-- 39/84: 202610270002_primary_product_markup.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610270002_primary_product_markup.sql') then
  raise notice 'Aplicando 202610270002_primary_product_markup.sql';
  execute replace($retail_source_d9e8f398d415af14$
alter table public.retail_products add column sale_markup numeric(7,2)
 check(sale_markup is null or sale_markup between -99.99 and 10000);
grant update(sale_markup) on public.retail_products to authenticated;
alter table public.retail_price_lists add column is_primary boolean not null default false;
create unique index retail_one_primary_price_list on public.retail_price_lists(store_id) where is_primary;

create function retail_private.initialize_primary_price_list() returns trigger
language plpgsql security definer set search_path='' as $$
declare label text:='Principal'; suffix integer:=1;
begin
 perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||new.id::text,0));
 if exists(select 1 from public.retail_price_lists where store_id=new.id and is_primary) then return new; end if;
 while exists(select 1 from public.retail_price_lists where store_id=new.id and name=label and deleted_at is null) loop
  suffix:=suffix+1; label:='Principal '||suffix;
 end loop;
 insert into public.retail_price_lists(store_id,name,adjustment,active,base_kind,pricing_rules,is_primary)
  values(new.id,label,0,true,'catalog','[]'::jsonb,true);
 return new;
end $$;
revoke all on function retail_private.initialize_primary_price_list() from public,anon,authenticated;
create trigger retail_initialize_primary_price_list after insert on public.retail_stores
 for each row execute function retail_private.initialize_primary_price_list();

-- The existing tree validator still checks cycles, branch rules and 12 levels.
-- Do not flatten or delete a deep tree to force this migration to pass.
do $backfill$
declare shop record; primary_id uuid; label text; suffix integer;
begin
 for shop in select id from public.retail_stores order by id loop
  perform pg_advisory_xact_lock(hashtextextended('retail-pricing:'||shop.id::text,0));
  label:='Principal'; suffix:=1;
  while exists(select 1 from public.retail_price_lists where store_id=shop.id and name=label and deleted_at is null) loop
   suffix:=suffix+1; label:='Principal '||suffix;
  end loop;
  insert into public.retail_price_lists(store_id,name,adjustment,active,base_kind,pricing_rules,is_primary)
   values(shop.id,label,0,true,'catalog','[]'::jsonb,true) returning id into primary_id;
  update public.retail_price_lists set base_kind='list',parent_id=primary_id
   where store_id=shop.id and not is_primary and deleted_at is null and base_kind in ('cost','catalog');
 end loop;
end $backfill$;

create function retail_private.guard_primary_price_list() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.is_primary then raise exception 'La lista principal se conserva. Editá el margen de los productos'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and new.is_primary is distinct from old.is_primary then raise exception 'No se puede cambiar la identidad de la lista principal'; end if;
 if new.is_primary then
  if not new.active or new.deleted_at is not null or new.branch_id is not null or new.base_kind<>'catalog'
   or new.parent_id is not null or new.adjustment<>0 or new.pricing_rules<>'[]'::jsonb then
   raise exception 'La principal usa el costo y porcentaje de cada producto, está activa para todo el comercio y no puede eliminarse';
  end if;
 elsif new.deleted_at is null and (new.base_kind<>'list' or new.parent_id is null) then
  raise exception 'Elegí la lista principal o una de sus derivadas como origen';
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_primary_price_list() from public,anon,authenticated;
create trigger retail_primary_price_list before insert or update or delete on public.retail_price_lists
 for each row execute function retail_private.guard_primary_price_list();

create function retail_private.guard_primary_price_override() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.retail_price_lists where id=new.list_id and store_id=new.store_id and is_primary) then
  raise exception 'Editá el costo y margen del producto para cambiar el precio principal. Los precios fijos se usan en las derivadas';
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_primary_price_override() from public,anon,authenticated;
create trigger retail_primary_price_override before insert or update on public.retail_price_overrides
 for each row execute function retail_private.guard_primary_price_override();

create function retail_private.derive_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare calculated numeric;
begin
 if (tg_op='INSERT' and new.sale_markup is not null) or
  (tg_op='UPDATE' and new.sale_markup is distinct from old.sale_markup) then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 if not new.sellable then new.sale_markup:=null; return new; end if;
 if new.sale_markup is null then return new; end if;
 if new.sale_markup not between -99.99 and 10000 then raise exception 'Revisá el porcentaje sobre costo'; end if;
 if new.cost>0 then calculated:=greatest(0.01,round(new.cost*(1+new.sale_markup/100),2)); end if;
 -- A deliberate manual price edit keeps existing price-only/bulk/import flows.
 -- A cost-only change, or a form sending the calculated price, keeps its percent.
 if tg_op='UPDATE' and new.sale_markup is not distinct from old.sale_markup and new.price is distinct from old.price
  and (calculated is null or new.price<>calculated) then
  new.sale_markup:=null; return new;
 end if;
 if calculated is not null then
  if calculated>9999999999 then raise exception 'El precio calculado supera el límite permitido. Revisá costo y porcentaje'; end if;
  new.price:=calculated;
 end if;
 return new;
end $$;
revoke all on function retail_private.derive_product_markup_price() from public,anon,authenticated;
-- After component-derived cost, before the existing low-margin classifier.
create trigger retail_zy_product_markup before insert or update on public.retail_products
 for each row execute function retail_private.derive_product_markup_price();

create function retail_private.check_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.retail_products;
begin
 select * into p from public.retail_products where id=new.id;
 if found and p.sellable and p.sale_markup is not null then
  if p.cost<=0 or p.price<>greatest(0.01,round(p.cost*(1+p.sale_markup/100),2)) then
   raise exception 'Cargá un costo mayor a cero para calcular el precio principal de %',p.name;
  end if;
 end if;
 return null;
end $$;
revoke all on function retail_private.check_product_markup_price() from public,anon,authenticated;
-- Recipes are inserted and configured in one transaction; validate final cost.
create constraint trigger retail_check_product_markup after insert or update on public.retail_products
 deferrable initially deferred for each row execute function retail_private.check_product_markup_price();

-- Extend the existing atomic recipe RPC, preserving its signature, permissions,
-- stock/composition rules and request-id replay checks. No standalone product survives.
do $composite$
declare definition text;
begin
 if (select md5(replace(prosrc,E'\r','')) from pg_catalog.pg_proc
  where oid='public.retail_create_composite_product(uuid,uuid,jsonb)'::regprocedure)<>'e0b520b78d301e2180f6a2a7a164df99' then
  raise exception 'La creación de combos cambió. Revisar la definición antes de aplicar el porcentaje; no se omitió la validación';
 end if;
 definition:=replace(pg_get_functiondef('public.retail_create_composite_product(uuid,uuid,jsonb)'::regprocedure),E'\r','');
 definition:=replace(definition,'min_stock,emoji,sellable)','min_stock,emoji,sellable,sale_markup)');
 definition:=replace(definition,'0,0,4,''📦'',true);','0,0,4,''📦'',true,(p_data->>''sale_markup'')::numeric);');
 if position('min_stock,emoji,sellable,sale_markup)' in definition)=0
  or position('(p_data->>''sale_markup'')::numeric' in definition)=0 then raise exception 'No se encontró el alta atómica esperada para combos'; end if;
 execute definition;
end $composite$;

create or replace function public.retail_active_price_list_for_branch(p_store uuid,p_branch uuid)
returns uuid language plpgsql stable security invoker set search_path='' as $$
declare v_list uuid;
begin
 if retail_private.role_for(p_store) is null then raise exception 'Sin acceso al comercio'; end if;
 if not exists(select 1 from public.retail_branches where id=p_branch and store_id=p_store) then raise exception 'Sucursal no disponible'; end if;
 select id into v_list from public.retail_price_lists where store_id=p_store and branch_id=p_branch and active and deleted_at is null;
 if v_list is null then select id into v_list from public.retail_price_lists where store_id=p_store and is_primary and active and deleted_at is null; end if;
 return v_list;
end $$;
revoke all on function public.retail_active_price_list_for_branch(uuid,uuid) from public,anon;
grant execute on function public.retail_active_price_list_for_branch(uuid,uuid) to authenticated;

create or replace function retail_private.enforce_branch_price_rule() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_list public.retail_price_lists; v_default uuid;
begin
 if new.price_list_id is not null then
  select * into v_list from public.retail_price_lists where id=new.price_list_id and store_id=new.store_id and active and deleted_at is null for share;
  if not found or (v_list.branch_id is not null and v_list.branch_id<>new.branch_id) then raise exception 'La lista de precios no está disponible para esta sucursal'; end if;
 end if;
 if retail_private.role_for(new.store_id)='cashier' then
  v_default:=public.retail_active_price_list_for_branch(new.store_id,new.branch_id);
  -- Old prepared carts/queues may use null for catalog, which is exactly the
  -- neutral Principal price. Branch-specific derived lists remain mandatory.
  if new.price_list_id is distinct from v_default and not(new.price_list_id is null and exists(
   select 1 from public.retail_price_lists where id=v_default and store_id=new.store_id and is_primary)) then
   raise exception 'Usá la lista de precios asignada a esta sucursal. Actualizá los datos antes de cobrar';
  end if;
 end if;
 return new;
end $$;
revoke all on function retail_private.enforce_branch_price_rule() from public,anon,authenticated;
notify pgrst,'reload schema';
$retail_source_d9e8f398d415af14$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610270002_primary_product_markup.sql','d9e8f398d415af14d4bc1235f3d2023f755cc62ad7879aa3b257794f756e6a02','schema');
 end if;
end;

-- 40/84: 202610270003_suppliers.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610270003_suppliers.sql') then
  raise notice 'Aplicando 202610270003_suppliers.sql';
  execute replace($retail_source_9f007483d72681a7$
-- Registered suppliers per store, with the discount this store gets from each one.
-- The invoice review uses it when the discount appears only in the invoice totals.
create table public.retail_suppliers (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 120 and name = btrim(name)),
 supplier_key text not null check(supplier_key <> '' and supplier_key = retail_private.normalize_supplier(name)),
 discount_percent numeric(5,2) not null default 0 check(discount_percent >= 0 and discount_percent < 100),
 notes text check(notes is null or length(notes) <= 300),
 revision integer not null default 1 check(revision >= 1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(store_id, supplier_key)
);

alter table public.retail_suppliers enable row level security;
-- Every member may read (the invoice review needs the discount); writes use the checked RPCs.
create policy member_read on public.retail_suppliers for select to authenticated
 using(retail_private.role_for(store_id) is not null);
revoke all on public.retail_suppliers from public, anon, authenticated;
grant select on public.retail_suppliers to authenticated;

-- p_id null creates; otherwise p_expected must match the current revision.
create function public.retail_save_supplier(
 p_store uuid, p_id uuid, p_name text, p_discount numeric, p_notes text default null, p_expected integer default null
) returns public.retail_suppliers
language plpgsql security definer set search_path='' as $$
declare result public.retail_suppliers; clean_name text; clean_key text; clean_notes text;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 clean_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' or length(clean_name)>120 then raise exception 'Ingresá el nombre del proveedor (hasta 120 caracteres)' using errcode='22023'; end if;
 if p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount>=100 then
   raise exception 'El descuento debe ser un porcentaje desde 0 y menor a 100' using errcode='22023';
 end if;
 if round(p_discount,2)<>p_discount then raise exception 'Usá hasta dos decimales para el descuento' using errcode='22023'; end if;
 clean_notes:=nullif(btrim(coalesce(p_notes,'')),'');
 if length(clean_notes)>300 then raise exception 'Las notas admiten hasta 300 caracteres' using errcode='22023'; end if;
 if exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.supplier_key=clean_key and s.id is distinct from p_id) then
   raise exception 'Ya existe un proveedor con ese nombre en el comercio' using errcode='23505';
 end if;
 if p_id is null then
   insert into public.retail_suppliers(store_id,name,supplier_key,discount_percent,notes)
   values(p_store,clean_name,clean_key,p_discount,clean_notes)
   returning * into result;
   return result;
 end if;
 update public.retail_suppliers s set name=clean_name,supplier_key=clean_key,discount_percent=p_discount,
   notes=clean_notes,revision=s.revision+1,updated_at=now()
 where s.id=p_id and s.store_id=p_store and s.revision=p_expected
 returning * into result;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar' using errcode='40001'; end if;
 return result;
end $$;

create function public.retail_delete_supplier(p_store uuid, p_id uuid, p_expected integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 -- Products and alias memory keep their supplier text; only the discount record is removed.
 delete from public.retail_suppliers where id=p_id and store_id=p_store and revision=p_expected;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de eliminar' using errcode='40001'; end if;
end $$;

revoke all on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer) from public,anon;
revoke all on function public.retail_delete_supplier(uuid,uuid,integer) from public,anon;
grant execute on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer) to authenticated;
grant execute on function public.retail_delete_supplier(uuid,uuid,integer) to authenticated;

notify pgrst,'reload schema';
$retail_source_9f007483d72681a7$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610270003_suppliers.sql','9f007483d72681a7d849f29714756c7fbfb83e6146d35d4ba80d9fbd78518f05','schema');
 end if;
end;

-- 41/84: 202610270004_cost_price_lists.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610270004_cost_price_lists.sql') then
  raise notice 'Aplicando 202610270004_cost_price_lists.sql';
  execute replace($retail_source_abe5683734a54251$
-- Lists may start again from product cost (Costo +X%) besides Principal and its
-- derived lists. Existing lists, prices, fixed prices and assignments are not
-- touched: only the guard from 202610270002 accepts the cost origin again.
-- A second catalog root stays blocked because Principal already is that price.
create or replace function retail_private.guard_primary_price_list() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.is_primary then raise exception 'La lista principal se conserva. Editá el margen de los productos'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and new.is_primary is distinct from old.is_primary then raise exception 'No se puede cambiar la identidad de la lista principal'; end if;
 if new.is_primary then
  if not new.active or new.deleted_at is not null or new.branch_id is not null or new.base_kind<>'catalog'
   or new.parent_id is not null or new.adjustment<>0 or new.pricing_rules<>'[]'::jsonb then
   raise exception 'La principal usa el costo y porcentaje de cada producto, está activa para todo el comercio y no puede eliminarse';
  end if;
 elsif new.deleted_at is null and not ((new.base_kind='list' and new.parent_id is not null)
  or (new.base_kind='cost' and new.parent_id is null)) then
  raise exception 'Elegí Costo, la lista principal o una de sus derivadas como origen';
 end if;
 return new;
end $$;
revoke all on function retail_private.guard_primary_price_list() from public,anon,authenticated;

notify pgrst,'reload schema';
$retail_source_abe5683734a54251$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610270004_cost_price_lists.sql','abe5683734a54251ad3e49ee9235ee1b9a9607081b9a6b04927e902cdfe56d0b','schema');
 end if;
end;

-- 42/84: 202610270005_supplier_invoice_formats.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610270005_supplier_invoice_formats.sql') then
  raise notice 'Aplicando 202610270005_supplier_invoice_formats.sql';
  if to_regclass('public.retail_supplier_invoice_formats') is not null then
   raise exception 'La tabla de formatos ya existe, pero 202610270005_supplier_invoice_formats.sql no figura en el historial'
    using errcode='55000', hint='No borrar la tabla ni marcar el paso a mano. Ver SUPABASE_SETUP.md: ejecutar primero los paquetes anteriores hasta 202610270004 y luego maintenance/adopt_supplier_invoice_formats.sql completo. Solo concilia si estructura, funciones y permisos coinciden; conserva los formatos.';
  end if;
  execute replace($retail_source_62535c0e844930c8$
-- Invoice column layout learned per supplier after a confirmed import.
-- When the next invoice of that supplier matches it, the review reads it locally without Groq.
-- Keyed by the normalized supplier text, like the alias memory: it works for unregistered suppliers too.
create table public.retail_supplier_invoice_formats (
 store_id uuid not null references public.retail_stores(id),
 supplier_key text not null check(supplier_key <> '' and length(supplier_key) <= 120),
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 format jsonb not null check(jsonb_typeof(format) = 'object' and (format->>'version') = '1' and pg_column_size(format) <= 1000),
 samples integer not null default 0 check(samples >= 0),
 local_reads integer not null default 0 check(local_reads >= 0),
 updated_at timestamptz not null default now(),
 primary key(store_id, supplier_key)
);

alter table public.retail_supplier_invoice_formats enable row level security;
-- Every member may read it (invoice review); writes use the checked RPCs.
create policy member_read on public.retail_supplier_invoice_formats for select to authenticated
 using(retail_private.role_for(store_id) is not null);
revoke all on public.retail_supplier_invoice_formats from public, anon, authenticated;
grant select on public.retail_supplier_invoice_formats to authenticated;

-- Any member who imports an invoice may teach or confirm the layout, as with supplier aliases.
-- p_local_read=true only confirms a layout that already read this invoice without AI.
create function public.retail_save_supplier_invoice_format(
 p_store uuid, p_supplier text, p_format jsonb, p_samples integer, p_local_read boolean default false
) returns public.retail_supplier_invoice_formats
language plpgsql security definer set search_path='' as $$
declare result public.retail_supplier_invoice_formats; clean_name text; clean_key text;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 clean_name:=left(btrim(regexp_replace(coalesce(p_supplier,''),'[[:space:]]+',' ','g')),120);
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' then raise exception 'Indicá el proveedor para recordar el formato' using errcode='22023'; end if;
 if p_format is null or jsonb_typeof(p_format)<>'object' or (p_format->>'version') is distinct from '1' or pg_column_size(p_format)>1000 then
   raise exception 'Formato de factura inválido' using errcode='22023';
 end if;
 if p_samples is null or p_samples<1 then raise exception 'El formato necesita renglones confirmados' using errcode='22023'; end if;
 insert into public.retail_supplier_invoice_formats as existing(store_id,supplier_key,supplier_name,format,samples,local_reads)
 values(p_store,clean_key,clean_name,p_format,p_samples,case when p_local_read then 1 else 0 end)
 on conflict(store_id,supplier_key) do update set
   supplier_name=excluded.supplier_name,
   format=excluded.format,
   -- A different layout starts over; the same one accumulates confirmations.
   samples=case when existing.format=excluded.format then existing.samples+excluded.samples else excluded.samples end,
   local_reads=case when existing.format=excluded.format then existing.local_reads+excluded.local_reads else excluded.local_reads end,
   updated_at=now()
 returning * into result;
 return result;
end $$;

create function public.retail_delete_supplier_invoice_format(p_store uuid, p_supplier text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 delete from public.retail_supplier_invoice_formats
 where store_id=p_store and supplier_key=retail_private.normalize_supplier(p_supplier);
end $$;

revoke all on function public.retail_save_supplier_invoice_format(uuid,text,jsonb,integer,boolean) from public,anon;
revoke all on function public.retail_delete_supplier_invoice_format(uuid,text) from public,anon;
grant execute on function public.retail_save_supplier_invoice_format(uuid,text,jsonb,integer,boolean) to authenticated;
grant execute on function public.retail_delete_supplier_invoice_format(uuid,text) to authenticated;

notify pgrst,'reload schema';
$retail_source_62535c0e844930c8$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610270005_supplier_invoice_formats.sql','62535c0e844930c8af0840aa80c582f265c0a8919b8cdabb4f83cb7cf0a41509','schema');
 end if;
end;

-- 43/84: 202610280001_supplier_alias_usage_repair.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610280001_supplier_alias_usage_repair.sql') then
  raise notice 'Aplicando 202610280001_supplier_alias_usage_repair.sql';
  execute replace($retail_source_e6eee2d43a1a62cc$
-- Some conciliated installations registered 202610200002_supplier_alias_usage.sql without its effects:
-- they keep the six-argument upsert, so the app's alias sharing fails with "function not found".
-- Recreate that migration's objects idempotently; on complete installations this changes nothing.
drop function if exists public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer);
create or replace function public.retail_upsert_supplier_mapping(
 p_store uuid, p_supplier text, p_invoice_text text, p_product_id uuid, p_product_name text,
 p_pack_size integer default null, p_confidence numeric default 1,
 p_usage_only boolean default false, p_mapping_id uuid default null
) returns public.retail_supplier_mappings
language plpgsql security invoker set search_path='' as $$
declare result public.retail_supplier_mappings;
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 if p_confidence is null or p_confidence < 0 or p_confidence > 1 then
   raise exception 'La confianza debe estar entre cero y uno' using errcode='22023';
 end if;
 if p_usage_only then
   update public.retail_supplier_mappings m set times_used=m.times_used+1,last_used_at=now()
   where m.id=p_mapping_id and m.store_id=p_store and m.supplier=retail_private.normalize_supplier(p_supplier)
     and m.invoice_text=btrim(p_invoice_text) and m.product_id=p_product_id
     and m.pack_size_detected is not distinct from p_pack_size
     and m.confidence>=0.85 and m.times_used>=3
   returning m.* into result;
   if not found then raise exception 'El alias cambió o fue eliminado. Actualizá la memoria del proveedor.'; end if;
   return result;
 end if;
 insert into public.retail_supplier_mappings as existing
   (store_id,supplier,invoice_text,product_id,product_name,pack_size_detected,confidence)
 values(p_store,retail_private.normalize_supplier(p_supplier),btrim(p_invoice_text),p_product_id,btrim(p_product_name),p_pack_size,p_confidence)
 on conflict(store_id,supplier,invoice_text) do update set
   times_used=case when existing.product_id=excluded.product_id and existing.pack_size_detected is not distinct from excluded.pack_size_detected
     then existing.times_used+1 else 1 end,
   product_id=excluded.product_id,product_name=excluded.product_name,pack_size_detected=excluded.pack_size_detected,
   confidence=excluded.confidence,last_used_at=now()
 returning * into result;
 return result;
end;
$$;

do $repair$
begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='retail_supplier_mappings' and policyname='member_delete') then
   create policy member_delete on public.retail_supplier_mappings for delete to authenticated
    using(retail_private.role_for(store_id) is not null);
 end if;
end $repair$;
grant delete on public.retail_supplier_mappings to authenticated;

create or replace function public.retail_delete_supplier_mapping(p_store uuid,p_supplier text,p_mapping_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or retail_private.role_for(p_store) is null then
   raise exception 'Sin acceso al comercio' using errcode='42501';
 end if;
 delete from public.retail_supplier_mappings where id=p_mapping_id and store_id=p_store
   and supplier=retail_private.normalize_supplier(p_supplier);
end;
$$;

revoke all on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) from public,anon;
revoke all on function public.retail_delete_supplier_mapping(uuid,text,uuid) from public,anon;
grant execute on function public.retail_upsert_supplier_mapping(uuid,text,text,uuid,text,integer,numeric,boolean,uuid) to authenticated;
grant execute on function public.retail_delete_supplier_mapping(uuid,text,uuid) to authenticated;

notify pgrst,'reload schema';
$retail_source_e6eee2d43a1a62cc$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610280001_supplier_alias_usage_repair.sql','e6eee2d43a1a62cc232ada97415baa8b591f83572848c8877f26444b82db583a','schema');
 end if;
end;

-- 44/84: 202610280002_location_funds.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610280002_location_funds.sql') then
  raise notice 'Aplicando 202610280002_location_funds.sql';
  execute replace($retail_source_f22cae1d60cb383c$
-- Funds are separate from shifts, cash movements, sales and expected cash.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]) action where retail_private.has_permission(p_store,action);
$$;

create table public.retail_location_funds (
 store_id uuid not null references public.retail_stores(id), location text not null,
 balance numeric(16,2) not null default 0 check(balance>=0 and balance::text not in ('NaN','Infinity','-Infinity')),
 primary key(store_id,location),
 check(location='depot' or location ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
);
create table public.retail_fund_transfers (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 from_location text, to_location text, amount numeric(16,2) not null check(amount>0 and amount::text<>'NaN'),
 note text not null check(length(btrim(note)) between 1 and 1000),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 check(from_location is not null or to_location is not null),
 check(from_location is null or to_location is null or from_location<>to_location),
 foreign key(store_id,from_location) references public.retail_location_funds(store_id,location),
 foreign key(store_id,to_location) references public.retail_location_funds(store_id,location)
);
create index retail_fund_transfer_history on public.retail_fund_transfers(store_id,created_at desc,id);
alter table public.retail_location_funds enable row level security;
alter table public.retail_fund_transfers enable row level security;
create policy authorized_read on public.retail_location_funds for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
create policy authorized_read on public.retail_fund_transfers for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
revoke all on public.retail_location_funds,public.retail_fund_transfers from public,anon,authenticated;
grant select on public.retail_location_funds,public.retail_fund_transfers to authenticated;

create function public.retail_move_location_funds(p_store uuid,p_from text,p_to text,p_amount numeric,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.retail_fund_transfers; loc text; source_balance numeric; target_balance numeric;
 note text:=btrim(p_note);
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if p_request is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity')
  or p_amount<=0 or p_amount>999999999999.99 or round(p_amount,2)<>p_amount then raise exception 'Ingresá un importe positivo con hasta dos decimales'; end if;
 if note is null or length(note) not between 1 and 1000 then raise exception 'Escribí un motivo de hasta 1.000 caracteres'; end if;
 if (p_from is null and p_to is null) or p_from=p_to then raise exception 'Elegí un origen y un destino diferentes'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-request:'||p_request::text,0));
 select * into prior from public.retail_fund_transfers where id=p_request;
 if found then
  if prior.store_id<>p_store or prior.created_by<>auth.uid() or prior.from_location is distinct from p_from
   or prior.to_location is distinct from p_to or prior.amount<>p_amount or prior.note<>note then raise exception 'La solicitud corresponde a otro movimiento'; end if;
  return prior.id;
 end if;
 -- Serialize account updates, including first-use rows. No negative source balances.
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 foreach loc in array array[p_from,p_to] loop
  if loc is null then continue; end if;
  if loc<>'depot' and not exists(select 1 from public.retail_branches where store_id=p_store and id::text=loc) then raise exception 'La ubicación no pertenece a este comercio'; end if;
  insert into public.retail_location_funds(store_id,location) values(p_store,loc) on conflict do nothing;
 end loop;
 if p_from is not null then
  select balance into source_balance from public.retail_location_funds where store_id=p_store and location=p_from for update;
  if source_balance<p_amount then raise exception 'El fondo de origen no tiene saldo suficiente. Actualizá los saldos'; end if;
  update public.retail_location_funds set balance=balance-p_amount where store_id=p_store and location=p_from;
 end if;
 if p_to is not null then
  select balance into target_balance from public.retail_location_funds where store_id=p_store and location=p_to for update;
  if target_balance+p_amount>999999999999.99 then raise exception 'El saldo resultante supera el límite permitido'; end if;
  update public.retail_location_funds set balance=balance+p_amount where store_id=p_store and location=p_to;
 end if;
 insert into public.retail_fund_transfers(id,store_id,from_location,to_location,amount,note,created_by,actor_email)
 values(p_request,p_store,p_from,p_to,p_amount,note,auth.uid(),auth.jwt()->>'email');
 return p_request;
end $$;
revoke all on function public.retail_move_location_funds(uuid,text,text,numeric,text,uuid) from public,anon;
grant execute on function public.retail_move_location_funds(uuid,text,text,numeric,text,uuid) to authenticated;

create or replace function public.retail_management_locations(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not (retail_private.has_permission(p_store,'manage_locations') or retail_private.has_permission(p_store,'manage_staff') or retail_private.has_permission(p_store,'manage_transfers') or retail_private.has_permission(p_store,'manage_funds') or retail_private.has_permission(p_store,'manage_price_lists') or retail_private.has_permission(p_store,'review_remitos')) then raise exception 'Sin permiso para consultar esta configuración' using errcode='42501'; end if;
 return jsonb_build_object(
  'branches',(select coalesce(jsonb_agg(to_jsonb(b) order by b.name),'[]'::jsonb) from public.retail_branches b where b.store_id=p_store),
  'registers',(select coalesce(jsonb_agg(to_jsonb(r) order by r.name),'[]'::jsonb) from public.retail_registers r where r.store_id=p_store));
end $$;
notify pgrst,'reload schema';
$retail_source_f22cae1d60cb383c$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610280002_location_funds.sql','f22cae1d60cb383ca0f76216dc20e303370a2018266199f8650aa7beb77f8ada','schema');
 end if;
end;

-- 45/84: 202610280003_location_inventory.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610280003_location_inventory.sql') then
  raise notice 'Aplicando 202610280003_location_inventory.sql';
  execute replace($retail_source_baa181aa8cc76f1b$
alter table public.retail_stores add column branch_inventory_enabled boolean not null default false;
alter table public.retail_depot_movements add column branch_id uuid,
 add foreign key(store_id,branch_id) references public.retail_branches(store_id,id);
create table public.retail_branch_stock (
 store_id uuid not null, branch_id uuid not null, product_id uuid not null,
 quantity integer not null check(quantity>=0), primary key(store_id,branch_id,product_id),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create table public.retail_inventory_activations (
 store_id uuid primary key references public.retail_stores(id), branch_id uuid not null,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id)
);
alter table public.retail_branch_stock enable row level security;
alter table public.retail_inventory_activations enable row level security;
create policy member_read on public.retail_branch_stock for select to authenticated using(retail_private.role_for(store_id) is not null);
create policy manager_read on public.retail_inventory_activations for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_branch_stock,public.retail_inventory_activations from public,anon,authenticated;
grant select on public.retail_branch_stock,public.retail_inventory_activations to authenticated;

create function public.retail_location_stock_summary(p_store uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
  select 'depot'::text as location,coalesce(sum(d.quantity),0) as quantity from public.retail_depot_balances d
   join public.retail_products p on p.id=d.product_id and p.store_id=d.store_id where d.store_id=p_store and p.active
  union all
  select b.id::text,coalesce(sum(s.quantity) filter(where p.active),0) from public.retail_branches b
   left join public.retail_branch_stock s on s.branch_id=b.id and s.store_id=b.store_id
   left join public.retail_products p on p.id=s.product_id and p.store_id=s.store_id where b.store_id=p_store group by b.id
 ) t);
end $$;
revoke all on function public.retail_location_stock_summary(uuid) from public,anon;
grant execute on function public.retail_location_stock_summary(uuid) to authenticated;

create function retail_private.inventory_location(p_store uuid,p_location text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_location is null or (p_location<>'depot' and not exists(select 1 from public.retail_branches where store_id=p_store and id::text=p_location)) then raise exception 'Elegí una ubicación de este comercio'; end if;
end $$;
revoke all on function retail_private.inventory_location(uuid,text) from public,anon,authenticated;

create function public.retail_enable_branch_inventory(p_store uuid,p_branch uuid) returns void
language plpgsql security definer set search_path='' as $$
declare prior public.retail_inventory_activations;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo un administrador puede distribuir el inventario inicial' using errcode='42501'; end if;
 perform 1 from public.retail_stores where id=p_store for update;
 select * into prior from public.retail_inventory_activations where store_id=p_store;
 if found then
  if prior.branch_id<>p_branch then raise exception 'El inventario ya fue distribuido. Usá una transferencia para moverlo'; end if;
  return;
 end if;
 perform retail_private.inventory_location(p_store,p_branch::text);
 if exists(select 1 from public.retail_shifts where store_id=p_store and closed_at is null) then raise exception 'Cerrá los turnos y sincronizá todos los dispositivos antes de distribuir el stock'; end if;
 if exists(select 1 from public.retail_stock_transfers where store_id=p_store and status='pending') then raise exception 'Confirmá o cancelá los traslados anteriores pendientes antes de distribuir el stock'; end if;
 perform 1 from public.retail_products where store_id=p_store order by id for update;
 insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity)
 select p_store,p_branch,p.id,p.stock-coalesce(d.quantity,0) from public.retail_products p
 left join public.retail_depot_balances d on d.store_id=p_store and d.product_id=p.id
 where p.store_id=p_store and jsonb_array_length(p.stock_components)=0;
 insert into public.retail_inventory_activations(store_id,branch_id,created_by) values(p_store,p_branch,auth.uid());
 update public.retail_stores set branch_inventory_enabled=true,depot_enabled=true where id=p_store;
end $$;

create function retail_private.guard_branch_inventory_setting() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.branch_inventory_enabled and not new.depot_enabled then raise exception 'El depósito forma parte del inventario por ubicación. Conservá sus saldos y usá Transferencias'; end if;
 if new.branch_inventory_enabled is distinct from old.branch_inventory_enabled then
  if not new.branch_inventory_enabled or not exists(select 1 from public.retail_inventory_activations where store_id=new.id) then raise exception 'El inventario por sucursal se activa distribuyendo el stock, y no se desactiva borrando saldos'; end if;
  if coalesce(retail_private.role_for(new.id),'') not in ('owner','admin') then raise exception 'Solo el administrador puede distribuir el inventario' using errcode='42501'; end if;
 end if;
 return new;
end $$;
create trigger retail_branch_inventory_setting before update of branch_inventory_enabled,depot_enabled on public.retail_stores for each row execute function retail_private.guard_branch_inventory_setting();

-- Coordinate activation with existing stock writers and shift openings, including REST.
create function retail_private.lock_inventory_setting() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.retail_stores where id=new.store_id for share;
 return new;
end $$;
create trigger retail_lock_inventory_setting before insert or update of stock on public.retail_products for each row execute function retail_private.lock_inventory_setting();
create trigger retail_lock_shift_inventory_setting before insert on public.retail_shifts for each row execute function retail_private.lock_inventory_setting();

-- Product.stock remains the aggregate. A transaction explicitly identifies the branch.
create function retail_private.allocate_branch_stock() returns trigger language plpgsql security definer set search_path='' as $$
declare delta bigint; loc text; current_qty integer;
begin
 if not exists(select 1 from public.retail_stores where id=new.store_id and branch_inventory_enabled) then return new; end if;
 delta:=new.stock-case when tg_op='INSERT' then 0 else old.stock end;
 if delta=0 then return new; end if;
 loc:=nullif(current_setting('retail.inventory_location',true),'');
 if loc in ('depot','conversion') then return new; end if;
 perform retail_private.inventory_location(new.store_id,loc);
 insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(new.store_id,loc::uuid,new.id,0) on conflict do nothing;
 select quantity into current_qty from public.retail_branch_stock where store_id=new.store_id and branch_id=loc::uuid and product_id=new.id for update;
 if current_qty::bigint+delta not between 0 and 2147483647 then raise exception 'Stock insuficiente de % en esta sucursal, o cantidad fuera de límite. Actualizá el catálogo',new.name; end if;
 update public.retail_branch_stock set quantity=(current_qty::bigint+delta)::integer where store_id=new.store_id and branch_id=loc::uuid and product_id=new.id;
 return new;
end $$;
create trigger retail_allocate_branch_stock after insert or update of stock on public.retail_products for each row execute function retail_private.allocate_branch_stock();

create function retail_private.check_location_stock_total() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.retail_products; pid uuid; sid uuid; qty bigint;
begin
 if tg_table_name='retail_products' then pid:=new.id; sid:=new.store_id;
 elsif tg_op='DELETE' then pid:=old.product_id; sid:=old.store_id;
 else pid:=new.product_id; sid:=new.store_id; end if;
 if not exists(select 1 from public.retail_stores where id=sid and branch_inventory_enabled) then return null; end if;
 select * into p from public.retail_products where store_id=sid and id=pid;
 if not found then return null; end if;
 select coalesce(sum(quantity),0) into qty from public.retail_branch_stock where store_id=sid and product_id=pid;
 qty:=qty+coalesce((select quantity from public.retail_depot_balances where store_id=sid and product_id=pid),0);
 if qty<>p.stock then raise exception 'Las existencias por ubicación no coinciden con el total de %. La operación se revirtió',p.name; end if;
 return null;
end $$;
create constraint trigger retail_location_product_total after insert or update on public.retail_products deferrable initially deferred for each row execute function retail_private.check_location_stock_total();
create constraint trigger retail_location_branch_total after insert or update or delete on public.retail_branch_stock deferrable initially deferred for each row execute function retail_private.check_location_stock_total();
create constraint trigger retail_location_depot_total after insert or update or delete on public.retail_depot_balances deferrable initially deferred for each row execute function retail_private.check_location_stock_total();

-- Keep all existing checkout/billing/pricing/permission logic inside its original body.
alter function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) rename to retail_checkout_before_locations;
revoke all on function public.retail_checkout_before_locations(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare branch uuid; saved uuid; previous text:=current_setting('retail.inventory_location',true);
begin
 select r.branch_id into branch from public.retail_shifts s join public.retail_registers r on r.id=s.register_id and r.store_id=s.store_id where s.id=p_shift;
 perform 1 from public.retail_stores where id=(select store_id from public.retail_shifts where id=p_shift) for share;
 perform set_config('retail.inventory_location',coalesce(branch::text,''),true);
 saved:=public.retail_checkout_before_locations(p_shift,p_request,p_method,p_paid,p_items,p_price_list,p_ledger,p_payments);
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;
alter function public.retail_sync_operation(jsonb) rename to retail_sync_before_locations;
revoke all on function public.retail_sync_before_locations(jsonb) from public,anon,authenticated;
create function public.retail_sync_operation(p_operation jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare saved jsonb; branch uuid; previous text:=current_setting('retail.inventory_location',true);
begin
 if retail_private.role_for((p_operation->>'store')::uuid) is null then raise exception 'Sin acceso al comercio' using errcode='42501'; end if;
 perform 1 from public.retail_stores where id=(p_operation->>'store')::uuid for share;
 if p_operation->>'kind'='stock' then perform set_config('retail.inventory_location',coalesce(p_operation->>'branch',''),true); end if;
 if p_operation->>'kind'='sale' then
  select r.branch_id into branch from public.retail_shifts s join public.retail_registers r on r.id=s.register_id and r.store_id=s.store_id
   where s.id=(p_operation->>'shift')::uuid and s.store_id=(p_operation->>'store')::uuid;
  perform set_config('retail.inventory_location',coalesce(branch::text,''),true);
 end if;
 saved:=public.retail_sync_before_locations(p_operation);
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;

-- REST product permissions still apply; branch is context for the stock delta only.
create function public.retail_save_product_at_branch(p_store uuid,p_values jsonb,p_edit boolean,p_expected integer,p_branch uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare columns_sql text; expressions_sql text; assignment_sql text; saved uuid; previous text:=current_setting('retail.inventory_location',true); product_id uuid;
 allowed text[]:=array['category_id','code','name','price','sale_markup','cost','stock','min_stock','emoji','active','sellable','brand','supplier','supplier_code','tags','unit_type','pack_size','expiry_date','last_restocked_at'];
begin
 if p_values is null or jsonb_typeof(p_values)<>'object' or p_edit is null then raise exception 'Datos del producto incompletos'; end if;
 product_id:=(p_values->>'id')::uuid;
 if exists(select 1 from jsonb_object_keys(p_values) k where k<>all(allowed||array['id'])) then raise exception 'Campos de producto no admitidos'; end if;
 if not exists(select 1 from public.retail_branches where store_id=p_store and id=p_branch) then raise exception 'Elegí la sucursal del stock'; end if;
 perform set_config('retail.inventory_location',p_branch::text,true);
 select string_agg(format('%I',k),','),string_agg(format('(jsonb_populate_record(null::public.retail_products,$1)).%I',k),','),
  string_agg(format('%I=(jsonb_populate_record(null::public.retail_products,$1)).%I',k,k),',')
 into columns_sql,expressions_sql,assignment_sql from jsonb_object_keys(p_values) k where k=any(allowed);
 if p_edit then
  execute 'update public.retail_products set '||assignment_sql||' where store_id=$2 and id=$3 and active and stock=$4 returning id' into saved using p_values,p_store,product_id,p_expected;
 else
  execute 'insert into public.retail_products(store_id,'||columns_sql||') select $2,'||expressions_sql||' returning id' into saved using p_values,p_store;
 end if;
 if saved is null then raise exception 'El producto cambió o no tenés permiso. Actualizá y revisá el borrador'; end if;
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return jsonb_build_object('id',saved);
end $$;

alter function public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text) rename to retail_depot_before_locations;
revoke all on function public.retail_depot_before_locations(uuid,uuid,integer,text,uuid,numeric,text) from public,anon,authenticated;
create function public.retail_depot_operation_at_branch(p_store uuid,p_product uuid,p_quantity integer,p_action text,p_request uuid,p_branch uuid,p_cost numeric default null,p_note text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare saved uuid; current_qty integer; previous text:=current_setting('retail.inventory_location',true); enabled boolean;
begin
 if not retail_private.has_permission(p_store,'manage_products') then perform retail_private.require_permission(p_store,'replenish_stock'); end if;
 select branch_inventory_enabled into enabled from public.retail_stores where id=p_store for share;
 if coalesce(enabled,false) then
  perform retail_private.inventory_location(p_store,p_branch::text);
  perform 1 from public.retail_products where id=p_product and store_id=p_store for update;
  if exists(select 1 from public.retail_depot_movements where id=p_request) then
   if not exists(select 1 from public.retail_depot_movements where id=p_request and store_id=p_store and branch_id=p_branch) then raise exception 'La solicitud de depósito corresponde a otra sucursal'; end if;
   return public.retail_depot_before_locations(p_store,p_product,p_quantity,p_action,p_request,p_cost,p_note);
  end if;
  insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(p_store,p_branch,p_product,0) on conflict do nothing;
  select quantity into current_qty from public.retail_branch_stock where store_id=p_store and branch_id=p_branch and product_id=p_product for update;
  if p_action='to_depot' and current_qty<p_quantity then raise exception 'No alcanza el stock de esta sucursal'; end if;
 end if;
 perform set_config('retail.inventory_location','depot',true);
 saved:=public.retail_depot_before_locations(p_store,p_product,p_quantity,p_action,p_request,p_cost,p_note);
 update public.retail_depot_movements set branch_id=p_branch where id=saved and store_id=p_store;
 if coalesce(enabled,false) and p_action in ('to_depot','to_salon') then
  update public.retail_branch_stock set quantity=quantity+case when p_action='to_salon' then p_quantity else -p_quantity end
   where store_id=p_store and branch_id=p_branch and product_id=p_product;
 end if;
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;
create function public.retail_depot_operation(p_store uuid,p_product uuid,p_quantity integer,p_action text,p_request uuid,p_cost numeric default null,p_note text default null)
returns uuid language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled) then raise exception 'Elegí una sucursal y actualizá la app para operar con depósito'; end if;
 return public.retail_depot_before_locations(p_store,p_product,p_quantity,p_action,p_request,p_cost,p_note);
end $$;

alter function public.retail_approve_replenishment(uuid,uuid,jsonb) rename to retail_approve_before_locations;
revoke all on function public.retail_approve_before_locations(uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_approve_replenishment(p_store uuid,p_id uuid,p_items jsonb default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare branch uuid; saved uuid; previous text:=current_setting('retail.inventory_location',true);
begin
 select branch_id into branch from public.retail_pending_replenishments where store_id=p_store and id=p_id;
 perform 1 from public.retail_stores where id=p_store for share;
 perform set_config('retail.inventory_location',coalesce(branch::text,''),true);
 saved:=public.retail_approve_before_locations(p_store,p_id,p_items);
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;

create function public.retail_approve_replenishment_at_branch(p_store uuid,p_id uuid,p_items jsonb,p_branch uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.retail_pending_replenishments;
begin
 perform retail_private.require_permission(p_store,'review_remitos');
 perform 1 from public.retail_stores where id=p_store for share;
 perform retail_private.inventory_location(p_store,p_branch::text);
 select * into r from public.retail_pending_replenishments where store_id=p_store and id=p_id for update;
 if not found then raise exception 'Remito no disponible'; end if;
 if r.branch_id is not null and r.branch_id<>p_branch then raise exception 'El remito pertenece a otra sucursal'; end if;
 if r.branch_id is null and r.status='pending' then
  update public.retail_pending_replenishments set branch_id=p_branch where id=r.id;
 end if;
 return public.retail_approve_replenishment(p_store,p_id,p_items);
end $$;
revoke all on function public.retail_approve_replenishment_at_branch(uuid,uuid,jsonb,uuid) from public,anon;
grant execute on function public.retail_approve_replenishment_at_branch(uuid,uuid,jsonb,uuid) to authenticated;

-- Unit conversion preserves each branch's proportion rather than allocating it again.
alter function public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb) rename to retail_loose_before_locations;
revoke all on function public.retail_loose_before_locations(uuid,uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_enable_loose_cigarettes(p_store uuid,p_packet uuid,p_request uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare saved uuid; depot_qty integer; factor integer; previous text:=current_setting('retail.inventory_location',true);
begin
 perform retail_private.require_permission(p_store,'manage_compositions');
 perform 1 from public.retail_stores where id=p_store for share;
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 if not exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled)
  or exists(select 1 from public.retail_loose_unit_conversions where id=p_request) then return public.retail_loose_before_locations(p_store,p_packet,p_request,p_data); end if;
 perform 1 from public.retail_products where store_id=p_store and id=p_packet for update;
 select quantity into depot_qty from public.retail_depot_balances where store_id=p_store and product_id=p_packet;
 update public.retail_depot_balances set quantity=0 where store_id=p_store and product_id=p_packet;
 perform set_config('retail.inventory_location','conversion',true);
 saved:=public.retail_loose_before_locations(p_store,p_packet,p_request,p_data);
 factor:=(p_data->>'units')::integer;
 insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity)
 select store_id,branch_id,saved,(quantity::bigint*factor)::integer from public.retail_branch_stock where store_id=p_store and product_id=p_packet
 on conflict(store_id,branch_id,product_id) do update set quantity=excluded.quantity;
 update public.retail_branch_stock set quantity=0 where store_id=p_store and product_id=p_packet;
 insert into public.retail_depot_balances(store_id,product_id,quantity) values(p_store,saved,(coalesce(depot_qty,0)::bigint*factor)::integer)
 on conflict(product_id) do update set quantity=excluded.quantity;
 perform set_config('retail.inventory_location',coalesce(previous,''),true);
 return saved;
end $$;

create table public.retail_location_transfers (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 from_location text not null,to_location text not null, items jsonb not null,
 status text not null default 'pending' check(status in ('pending','confirmed','cancelled')),
 notes text, created_by uuid not null references auth.users(id), actor_email text,created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id),reviewed_at timestamptz,
 check(from_location<>to_location),check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 200),
 check((status='pending' and reviewed_by is null and reviewed_at is null) or(status<>'pending' and reviewed_by is not null and reviewed_at is not null))
);
create index retail_location_transfer_history on public.retail_location_transfers(store_id,created_at desc,id);
alter table public.retail_location_transfers enable row level security;
create policy authorized_read on public.retail_location_transfers for select to authenticated using(retail_private.has_permission(store_id,'manage_transfers'));
revoke all on public.retail_location_transfers from public,anon,authenticated;
grant select on public.retail_location_transfers to authenticated;

create function public.retail_create_location_transfer(p_store uuid,p_from text,p_to text,p_items jsonb,p_notes text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.retail_location_transfers; item jsonb; canonical jsonb; snapshot jsonb:='[]'; p public.retail_products;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 perform retail_private.inventory_location(p_store,p_from); perform retail_private.inventory_location(p_store,p_to);
 if p_from=p_to or p_request is null or p_items is null or jsonb_typeof(p_items)<>'array' or length(coalesce(p_notes,''))>2000 then raise exception 'Revisá origen, destino, productos y notas'; end if;
 if jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Incluí entre 1 y 200 productos'; end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if coalesce(item->>'product_id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
   or coalesce(item->>'qty','')!~'^[1-9][0-9]{0,6}$' or (item->>'qty')::integer>1000000 then raise exception 'Usá cantidades enteras de 1 a 1.000.000'; end if;
 end loop;
 if (select count(distinct x->>'product_id') from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'Incluí cada producto una sola vez'; end if;
 select jsonb_agg(jsonb_build_object('product_id',x->>'product_id','qty',(x->>'qty')::integer) order by x->>'product_id') into canonical from jsonb_array_elements(p_items) x;
 perform pg_advisory_xact_lock(hashtextextended('location-transfer:'||p_request::text,0));
 select * into prior from public.retail_location_transfers where id=p_request;
 if found then
  if prior.store_id<>p_store or prior.created_by<>auth.uid() or prior.from_location<>p_from or prior.to_location<>p_to or prior.notes is distinct from nullif(btrim(p_notes),'')
   or (select jsonb_agg(jsonb_build_object('product_id',x->>'product_id','qty',(x->>'qty')::integer) order by x->>'product_id') from jsonb_array_elements(prior.items) x)<>canonical then raise exception 'La solicitud corresponde a otra transferencia'; end if;
  return prior.id;
 end if;
 if not exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled) then raise exception 'Primero distribuí el stock actual entre ubicaciones'; end if;
 for item in select value from jsonb_array_elements(canonical) loop
  select * into p from public.retail_products where store_id=p_store and id=(item->>'product_id')::uuid and active;
  if not found or jsonb_array_length(p.stock_components)>0 then raise exception 'Transferí productos físicos o los componentes del combo'; end if;
  snapshot:=snapshot||jsonb_build_array(item||jsonb_build_object('product_name',p.name));
 end loop;
 insert into public.retail_location_transfers(id,store_id,from_location,to_location,items,notes,created_by,actor_email)
 values(p_request,p_store,p_from,p_to,snapshot,nullif(btrim(p_notes),''),auth.uid(),auth.jwt()->>'email');
 return p_request;
end $$;

create function public.retail_review_location_transfer(p_store uuid,p_id uuid,p_confirm boolean) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.retail_location_transfers; item jsonb; source_qty integer; destination_qty integer; pid uuid; qty integer; depot_qty integer; branch uuid; product_name text; total integer; depot_after integer; movement_id uuid; movement_action text;
begin
 perform retail_private.require_permission(p_store,'manage_transfers');
 if p_confirm is null then raise exception 'Indicá si confirmás o cancelás'; end if;
 select * into t from public.retail_location_transfers where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Transferencia no disponible'; end if;
 if (p_confirm and t.status='confirmed') or (not p_confirm and t.status='cancelled') then return t.id; end if;
 if t.status<>'pending' then raise exception 'La transferencia ya fue revisada. Actualizá el historial'; end if;
 if p_confirm then
  perform 1 from public.retail_stores where id=p_store for share;
  for item in (select value from jsonb_array_elements(t.items) order by (value->>'product_id')) loop
   pid:=(item->>'product_id')::uuid; qty:=(item->>'qty')::integer;
   perform 1 from public.retail_products where id=pid and store_id=p_store and active and jsonb_array_length(stock_components)=0 for update;
   if not found then raise exception 'Un producto ya no está disponible para transferir'; end if;
   if t.from_location='depot' or t.to_location='depot' then
    branch:=(case when t.from_location='depot' then t.to_location else t.from_location end)::uuid;
    insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(p_store,branch,pid,0) on conflict do nothing;
    insert into public.retail_depot_balances(store_id,product_id,quantity) values(p_store,pid,0) on conflict do nothing;
    select quantity into source_qty from public.retail_branch_stock where store_id=p_store and branch_id=branch and product_id=pid for update;
    select quantity into depot_qty from public.retail_depot_balances where store_id=p_store and product_id=pid for update;
    if (t.from_location='depot' and depot_qty<qty) or (t.to_location='depot' and source_qty<qty) then raise exception 'No alcanza el stock de origen. Actualizá existencias'; end if;
    depot_after:=case when t.from_location='depot' then depot_qty - qty else depot_qty + qty end;
    update public.retail_branch_stock set quantity=case when t.from_location='depot' then quantity + qty else quantity - qty end where store_id=p_store and branch_id=branch and product_id=pid;
    update public.retail_depot_balances set quantity=depot_after where store_id=p_store and product_id=pid;
    select name,stock into product_name,total from public.retail_products where id=pid and store_id=p_store;
    movement_id:=md5(t.id::text||pid::text)::uuid; movement_action:=case when t.from_location='depot' then 'to_salon' else 'to_depot' end;
    insert into public.retail_depot_movements(id,store_id,product_id,product_name,action,quantity,total_after,depot_after,actor_id,actor_email,branch_id,payload)
    values(movement_id,p_store,pid,product_name,movement_action,qty,total,depot_after,auth.uid(),auth.jwt()->>'email',branch,
     jsonb_build_object('product',pid,'quantity',qty,'action',movement_action,'cost',null,'note','Transferencia '||t.id::text));
   else
    insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity) values(p_store,t.from_location::uuid,pid,0),(p_store,t.to_location::uuid,pid,0) on conflict do nothing;
    perform 1 from public.retail_branch_stock where store_id=p_store and product_id=pid and branch_id in (t.from_location::uuid,t.to_location::uuid) order by branch_id for update;
    select quantity into source_qty from public.retail_branch_stock where store_id=p_store and branch_id=t.from_location::uuid and product_id=pid;
    select quantity into destination_qty from public.retail_branch_stock where store_id=p_store and branch_id=t.to_location::uuid and product_id=pid;
    if source_qty<qty or destination_qty::bigint+qty>2147483647 then raise exception 'No alcanza el stock de origen o el destino supera el límite. Actualizá existencias'; end if;
    update public.retail_branch_stock set quantity=case when branch_id=t.from_location::uuid then quantity - qty else quantity + qty end where store_id=p_store and product_id=pid and branch_id in (t.from_location::uuid,t.to_location::uuid);
   end if;
  end loop;
 end if;
 update public.retail_location_transfers set status=case when p_confirm then 'confirmed' else 'cancelled' end,reviewed_by=auth.uid(),reviewed_at=now() where id=t.id;
 return t.id;
end; $$;

-- Old clients cannot silently create non-inventory transfers after activation.
alter function public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid) rename to retail_create_transfer_before_locations;
revoke all on function public.retail_create_transfer_before_locations(uuid,uuid,uuid,jsonb,text,uuid) from public,anon,authenticated;
create function public.retail_create_transfer(p_store uuid,p_from_branch uuid,p_to_branch uuid,p_items jsonb,p_notes text,p_request uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.retail_stores where id=p_store for share;
 if exists(select 1 from public.retail_stores where id=p_store and branch_inventory_enabled) then raise exception 'Actualizá la app y usá las transferencias por ubicación'; end if;
 return public.retail_create_transfer_before_locations(p_store,p_from_branch,p_to_branch,p_items,p_notes,p_request);
end $$;

revoke all on function public.retail_enable_branch_inventory(uuid,uuid),public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb),public.retail_sync_operation(jsonb),public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid),public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text),public.retail_depot_operation_at_branch(uuid,uuid,integer,text,uuid,uuid,numeric,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb),public.retail_create_location_transfer(uuid,text,text,jsonb,text,uuid),public.retail_review_location_transfer(uuid,uuid,boolean),public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid) from public,anon;
grant execute on function public.retail_enable_branch_inventory(uuid,uuid),public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb),public.retail_sync_operation(jsonb),public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid),public.retail_depot_operation(uuid,uuid,integer,text,uuid,numeric,text),public.retail_depot_operation_at_branch(uuid,uuid,integer,text,uuid,uuid,numeric,text),public.retail_approve_replenishment(uuid,uuid,jsonb),public.retail_enable_loose_cigarettes(uuid,uuid,uuid,jsonb),public.retail_create_location_transfer(uuid,text,text,jsonb,text,uuid),public.retail_review_location_transfer(uuid,uuid,boolean),public.retail_create_transfer(uuid,uuid,uuid,jsonb,text,uuid) to authenticated;
revoke all on function retail_private.allocate_branch_stock(),retail_private.check_location_stock_total(),retail_private.guard_branch_inventory_setting(),retail_private.lock_inventory_setting() from public,anon,authenticated;
notify pgrst,'reload schema';
$retail_source_baa181aa8cc76f1b$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610280003_location_inventory.sql','baa181aa8cc76f1bc973e914a77fe568f3f30228979d682a67ac3571ce3cc14d','schema');
 end if;
end;

-- 46/84: 202610280004_permanent_product_deletion.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610280004_permanent_product_deletion.sql') then
  raise notice 'Aplicando 202610280004_permanent_product_deletion.sql';
  execute replace($retail_source_c066941e7a7c08d3$
-- Limpieza preventiva de productos inactivos huérfanos que hayan quedado fijados en la botonera
delete from public.retail_quick_products q
where not exists (
  select 1 from public.retail_products p
  where p.id = q.product_id and p.store_id = q.store_id and p.active
);

-- Actualizar retail_set_product_active para quitar automáticamente de la botonera al archivar/desactivar
create or replace function public.retail_set_product_active(p_store uuid,p_product uuid,p_active boolean,p_request uuid,p_reason text default null,p_expected jsonb default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare product public.retail_products; previous public.retail_product_deletions; actor_role text;
 reason text:=nullif(trim(p_reason),''); payload jsonb; dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 actor_role:=retail_private.role_for(p_store);
 perform retail_private.require_permission(p_store,'delete_products');
 if p_product is null or p_request is null or p_active is null or coalesce(length(reason),0)>500 then raise exception 'Revisá el producto y el motivo (hasta 500 caracteres)'; end if;
 payload:=jsonb_build_object('active',p_active,'reason',reason,'expected',p_expected);
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into previous from public.retail_product_deletions where id=p_request;
 if found then
  if previous.store_id<>p_store or previous.product_id<>p_product or previous.actor_id is distinct from auth.uid() or previous.request_payload is distinct from payload then raise exception 'La solicitud corresponde a otra acción'; end if;
  return previous.id;
 end if;
 -- Same lock order as checkout and composition configuration.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if product.active=p_active then
  if p_active then raise exception 'El producto ya está activo. Actualizá el historial';
  else raise exception 'El producto ya está eliminado del catálogo. Actualizá los datos'; end if;
 end if;
 if p_expected is not null and jsonb_build_object('name',product.name,'code',product.code,'stock',product.stock,'components',product.stock_components) is distinct from p_expected then
  raise exception 'El producto o su stock cambió. Actualizá el catálogo y revisá la eliminación';
 end if;
 if not p_active then
  select string_agg(name,', ') into dependencies from (
   select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
   where p.store_id=p_store and p.active and c->>'product_id'=p_product::text order by p.name limit 5
  ) names;
  if dependencies is not null then raise exception 'Se usa en: %. Quitalo de esos componentes o eliminá primero esos combos/atados',dependencies; end if;
 else
  if exists(select 1 from jsonb_array_elements(product.stock_components) c
   left join public.retail_products component on component.store_id=p_store and component.id=(c->>'product_id')::uuid
   where component.id is null or not component.active or jsonb_array_length(component.stock_components)>0) then
   raise exception 'Para restaurar este producto, restaurá primero sus componentes y revisá que tengan stock propio';
  end if;
 end if;
 perform set_config('retail.product_deletion_context',jsonb_build_object('store_id',p_store,'product_id',p_product,'request_id',p_request,'reason',reason,'payload',payload)::text,true);
 update public.retail_products set active=p_active where store_id=p_store and id=p_product;
 if not p_active then
  delete from public.retail_quick_products where store_id=p_store and product_id=p_product;
 end if;
 perform set_config('retail.product_deletion_context','',true);
 return p_request;
end $$;

revoke all on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) from public,anon;
grant execute on function public.retail_set_product_active(uuid,uuid,boolean,uuid,text,jsonb) to authenticated;

-- Función para eliminación física definitiva del producto y sus referencias
create or replace function public.retail_delete_product_permanently(p_store uuid, p_product uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 product public.retail_products;
 dependencies text;
begin
 perform 1 from public.retail_members where store_id=p_store and user_id=auth.uid() for share;
 perform retail_private.require_permission(p_store, 'delete_products');

 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text, 0));
 select * into product from public.retail_products where store_id=p_store and id=p_product for update;
 if not found then
  raise exception 'El producto ya no existe';
 end if;

 -- Validar si es componente de otros productos activos o inactivos
 select string_agg(name, ', ') into dependencies from (
  select distinct p.name from public.retail_products p cross join lateral jsonb_array_elements(p.stock_components) c
  where p.store_id=p_store and c->>'product_id'=p_product::text order by p.name limit 5
 ) names;
 if dependencies is not null then
  raise exception 'No se puede eliminar definitivamente: se usa como componente en: %. Quitalo de esas recetas primero.', dependencies;
 end if;

 -- Validar remitos pendientes de revisión
 if exists (
  select 1 from public.retail_pending_replenishments r cross join lateral jsonb_array_elements(r.items) i
  where r.store_id=p_store and r.status='pending' and i->>'product_id'=p_product::text
 ) then
  raise exception 'El producto está incluido en remitos pendientes de revisión';
 end if;

 -- Limpieza de registros dependientes
 delete from public.retail_quick_products where store_id=p_store and product_id=p_product;
 delete from public.retail_price_overrides where store_id=p_store and product_id=p_product;
 if to_regclass('public.retail_depot_balances') is not null then
  execute 'delete from public.retail_depot_balances where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_depot_movements') is not null then
  execute 'delete from public.retail_depot_movements where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_branch_stock') is not null then
  execute 'delete from public.retail_branch_stock where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_supplier_product_mappings') is not null then
  execute 'delete from public.retail_supplier_product_mappings where store_id=$1 and product_id=$2' using p_store, p_product;
 end if;
 if to_regclass('public.retail_cigarette_conversions') is not null then
  execute 'delete from public.retail_cigarette_conversions where store_id=$1 and (packet_id=$2 or unit_product_id=$2)' using p_store, p_product;
 end if;
 delete from public.retail_stock_movements where store_id=p_store and product_id=p_product;
 delete from public.retail_product_deletions where store_id=p_store and product_id=p_product;

 -- Eliminar físicamente el producto
 delete from public.retail_products where store_id=p_store and id=p_product;
end $$;

revoke all on function public.retail_delete_product_permanently(uuid, uuid) from public, anon;
grant execute on function public.retail_delete_product_permanently(uuid, uuid) to authenticated;

$retail_source_c066941e7a7c08d3$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610280004_permanent_product_deletion.sql','c066941e7a7c08d3b00196d0eecce2b777cdddf4b805bab1197644a71e269368','schema');
 end if;
end;

-- 47/84: 202610290001_branch_location_and_deletion.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610290001_branch_location_and_deletion.sql') then
  raise notice 'Aplicando 202610290001_branch_location_and_deletion.sql';
  execute replace($retail_source_bd6a4e4c41f96463$
-- Ubicación opcional en el mapa. Sin coordenadas la sucursal sigue operando igual.
alter table public.retail_branches
 add column latitude double precision check(latitude between -90 and 90),
 add column longitude double precision check(longitude between -180 and 180),
 add check((latitude is null)=(longitude is null));

create function public.retail_set_branch_location(p_store uuid,p_id uuid,p_latitude double precision,p_longitude double precision) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 if (p_latitude is null)<>(p_longitude is null) or p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
  raise exception 'Ubicación inválida. Elegí un punto en el mapa';
 end if;
 update public.retail_branches set latitude=p_latitude,longitude=p_longitude where store_id=p_store and id=p_id returning id into target;
 if target is null then raise exception 'Sucursal no disponible. Actualizá los datos'; end if;
 return target;
end $$;

-- Eliminar solo sucursales sin historial: ventas, turnos, stock, transferencias y fondos se conservan siempre.
create function public.retail_delete_branch(p_store uuid,p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare branch public.retail_branches; dependency text;
begin
 perform retail_private.require_permission(p_store,'manage_locations');
 select * into branch from public.retail_branches where store_id=p_store and id=p_id for update;
 if not found then raise exception 'Sucursal no disponible. Actualizá los datos'; end if;
 if branch.is_default then raise exception 'La sucursal principal no se puede eliminar'; end if;
 if exists(select 1 from public.retail_registers where store_id=p_store and branch_id=p_id and active) then
  raise exception 'Mové o desactivá primero las cajas de esta sucursal';
 end if;
 if exists(select 1 from public.retail_location_funds where store_id=p_store and location=p_id::text)
  or exists(select 1 from public.retail_fund_transfers where store_id=p_store and (from_location=p_id::text or to_location=p_id::text)) then
  raise exception 'La sucursal tiene fondos o movimientos de dinero registrados; no se puede eliminar';
 end if;
 if exists(select 1 from public.retail_location_transfers where store_id=p_store and (from_location=p_id::text or to_location=p_id::text)) then
  raise exception 'La sucursal tiene transferencias registradas; no se puede eliminar';
 end if;
 begin
  -- Configuración propia sin historial: se elimina junto con la sucursal.
  delete from public.retail_quick_products where store_id=p_store and branch_id=p_id;
  delete from public.retail_branch_stock where store_id=p_store and branch_id=p_id and quantity=0;
  delete from public.retail_registers r where r.store_id=p_store and r.branch_id=p_id and not r.active
   and not exists(select 1 from public.retail_shifts s where s.register_id=r.id);
  delete from public.retail_branches where store_id=p_store and id=p_id;
 exception when foreign_key_violation then
  get stacked diagnostics dependency=table_name;
  raise exception '%', case
   when dependency in ('retail_sales','retail_shifts','retail_registers') then 'La sucursal tiene cajas con turnos o ventas registradas; no se puede eliminar'
   when dependency in ('retail_members','retail_invitations') then 'Hay personas asignadas a esta sucursal. Cambiá su asignación primero'
   when dependency='retail_price_lists' then 'Hay listas de precios asignadas a esta sucursal. Cambiá su sucursal primero'
   when dependency in ('retail_branch_stock','retail_inventory_activations','retail_depot_movements') then 'La sucursal tiene stock o historial de inventario; no se puede eliminar'
   when dependency='retail_pending_replenishments' then 'La sucursal tiene remitos o reposiciones registradas; no se puede eliminar'
   when dependency='retail_stock_transfers' then 'La sucursal tiene transferencias registradas; no se puede eliminar'
   else 'La sucursal tiene historial asociado; no se puede eliminar' end;
 end;
 return p_id;
end $$;

revoke all on function public.retail_set_branch_location(uuid,uuid,double precision,double precision) from public,anon;
revoke all on function public.retail_delete_branch(uuid,uuid) from public,anon;
grant execute on function public.retail_set_branch_location(uuid,uuid,double precision,double precision) to authenticated;
grant execute on function public.retail_delete_branch(uuid,uuid) to authenticated;

$retail_source_bd6a4e4c41f96463$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610290001_branch_location_and_deletion.sql','bd6a4e4c41f9646352bbb167137c5c9519d6cfbcf51d9143fff9ccb4136f5b75','schema');
 end if;
end;

-- 48/84: 202610290002_supplier_fiscal_profile.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610290002_supplier_fiscal_profile.sql') then
  raise notice 'Aplicando 202610290002_supplier_fiscal_profile.sql';
  execute replace($retail_source_51d60abcf980e182$
-- Ficha fiscal del proveedor: CUIT para reconocer sus facturas y reglas de lectura.
-- No cambia costos, stock ni descuentos existentes.
create function retail_private.valid_cuit(p_cuit text) returns boolean
language plpgsql immutable set search_path='' as $$
declare total integer:=0; weights integer[]:=array[5,4,3,2,7,6,5,4,3,2]; check_digit integer;
begin
 if p_cuit is null or p_cuit !~ '^[0-9]{11}$' then return false; end if;
 for i in 1..10 loop total:=total+substr(p_cuit,i,1)::integer*weights[i]; end loop;
 check_digit:=11-total%11;
 if check_digit=11 then check_digit:=0; end if;
 return check_digit<10 and check_digit=substr(p_cuit,11,1)::integer;
end $$;

create function retail_private.valid_supplier_invoice_rules(p_rules jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(p_rules)='object'
  and not exists(select 1 from jsonb_object_keys(p_rules) k where k not in ('quantity_unit','amount_includes_vat','merge_repeated_codes','cost_column'))
  and coalesce(p_rules->>'quantity_unit','auto') in ('auto','unit')
  and coalesce(jsonb_typeof(p_rules->'amount_includes_vat'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'merge_repeated_codes'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'cost_column'),'string')='string'
  and length(coalesce(p_rules->>'cost_column',''))<=60;
$$;

alter table public.retail_suppliers
 add column cuit text check(cuit is null or retail_private.valid_cuit(cuit)),
 add column invoice_rules jsonb not null default '{}'::jsonb check(retail_private.valid_supplier_invoice_rules(invoice_rules));
create unique index retail_suppliers_cuit on public.retail_suppliers(store_id,cuit) where cuit is not null;

-- Misma firma ampliada. Sin p_cuit/p_rules (clientes anteriores) se conservan los valores guardados;
-- p_cuit '' quita el CUIT.
drop function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer);
create function public.retail_save_supplier(
 p_store uuid, p_id uuid, p_name text, p_discount numeric, p_notes text default null, p_expected integer default null,
 p_cuit text default null, p_rules jsonb default null
) returns public.retail_suppliers
language plpgsql security definer set search_path='' as $$
declare result public.retail_suppliers; clean_name text; clean_key text; clean_notes text; clean_cuit text;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 clean_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' or length(clean_name)>120 then raise exception 'Ingresá el nombre del proveedor (hasta 120 caracteres)' using errcode='22023'; end if;
 if p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount>=100 then
   raise exception 'El descuento debe ser un porcentaje desde 0 y menor a 100' using errcode='22023';
 end if;
 if round(p_discount,2)<>p_discount then raise exception 'Usá hasta dos decimales para el descuento' using errcode='22023'; end if;
 clean_notes:=nullif(btrim(coalesce(p_notes,'')),'');
 if length(clean_notes)>300 then raise exception 'Las notas admiten hasta 300 caracteres' using errcode='22023'; end if;
 clean_cuit:=nullif(regexp_replace(coalesce(p_cuit,''),'[^0-9]','','g'),'');
 if clean_cuit is not null and not retail_private.valid_cuit(clean_cuit) then
   raise exception 'El CUIT no es válido. Revisá los 11 números' using errcode='22023';
 end if;
 if p_rules is not null and not retail_private.valid_supplier_invoice_rules(p_rules) then
   raise exception 'Las reglas de lectura de facturas no son válidas' using errcode='22023';
 end if;
 if exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.supplier_key=clean_key and s.id is distinct from p_id) then
   raise exception 'Ya existe un proveedor con ese nombre en el comercio' using errcode='23505';
 end if;
 if clean_cuit is not null and exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.cuit=clean_cuit and s.id is distinct from p_id) then
   raise exception 'Ese CUIT ya pertenece a otro proveedor del comercio' using errcode='23505';
 end if;
 if p_id is null then
   insert into public.retail_suppliers(store_id,name,supplier_key,discount_percent,notes,cuit,invoice_rules)
   values(p_store,clean_name,clean_key,p_discount,clean_notes,clean_cuit,coalesce(p_rules,'{}'::jsonb))
   returning * into result;
   return result;
 end if;
 update public.retail_suppliers s set name=clean_name,supplier_key=clean_key,discount_percent=p_discount,
   notes=clean_notes,
   cuit=case when p_cuit is null then s.cuit else clean_cuit end,
   invoice_rules=coalesce(p_rules,s.invoice_rules),
   revision=s.revision+1,updated_at=now()
 where s.id=p_id and s.store_id=p_store and s.revision=p_expected
 returning * into result;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar' using errcode='40001'; end if;
 return result;
end $$;

-- Las restricciones de la tabla usan estas funciones: mismo criterio que normalize_supplier.
revoke all on function retail_private.valid_cuit(text) from public;
revoke all on function retail_private.valid_supplier_invoice_rules(jsonb) from public;
grant execute on function retail_private.valid_cuit(text) to authenticated;
grant execute on function retail_private.valid_supplier_invoice_rules(jsonb) to authenticated;
revoke all on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb) from public,anon;
grant execute on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb) to authenticated;

notify pgrst,'reload schema';
$retail_source_51d60abcf980e182$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610290002_supplier_fiscal_profile.sql','51d60abcf980e182bc3975f9a90aadc68b180e1bde3e3db7b27c08f423162151','schema');
 end if;
end;

-- 49/84: 202610290003_purchase_invoices.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610290003_purchase_invoices.sql') then
  raise notice 'Aplicando 202610290003_purchase_invoices.sql';
  execute replace($retail_source_8a5afba23235cad7$
-- Comprobantes de compra: cabecera fiscal para el contador. Independiente del stock:
-- registrar, corregir o borrar un comprobante no cambia productos, costos ni existencias.
create table public.retail_purchase_invoices (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id),
 supplier_id uuid references public.retail_suppliers(id) on delete set null,
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 issuer_cuit text not null check(retail_private.valid_cuit(issuer_cuit)),
 receiver_cuit text check(receiver_cuit is null or retail_private.valid_cuit(receiver_cuit)),
 voucher_type smallint not null check(voucher_type between 1 and 999),
 point_of_sale integer not null check(point_of_sale between 1 and 99999),
 number bigint not null check(number between 1 and 99999999),
 issue_date date not null,
 authorization_type text check(authorization_type in ('E','A')),
 authorization_code text check(authorization_code ~ '^[0-9]{14}$'),
 net_21 numeric(16,2) not null default 0 check(net_21>=0),
 vat_21 numeric(16,2) not null default 0 check(vat_21>=0),
 net_10_5 numeric(16,2) not null default 0 check(net_10_5>=0),
 vat_10_5 numeric(16,2) not null default 0 check(vat_10_5>=0),
 net_27 numeric(16,2) not null default 0 check(net_27>=0),
 vat_27 numeric(16,2) not null default 0 check(vat_27>=0),
 untaxed numeric(16,2) not null default 0 check(untaxed>=0),
 internal_taxes numeric(16,2) not null default 0 check(internal_taxes>=0),
 vat_perceptions numeric(16,2) not null default 0 check(vat_perceptions>=0),
 iibb_perceptions numeric(16,2) not null default 0 check(iibb_perceptions>=0),
 other_taxes numeric(16,2) not null default 0 check(other_taxes>=0),
 total numeric(16,2) not null check(total>0),
 -- Calculado al guardar: IVA por alícuota y suma de conceptos contra el total (±$0,05).
 balanced boolean not null,
 qr_verified boolean not null default false,
 notes text check(notes is null or length(notes)<=300),
 created_by uuid not null references auth.users(id),
 actor_email text,
 created_at timestamptz not null default now(),
 unique(store_id,issuer_cuit,voucher_type,point_of_sale,number)
);
create index retail_purchase_invoice_period on public.retail_purchase_invoices(store_id,issue_date desc,id);

alter table public.retail_purchase_invoices enable row level security;
create policy authorized_read on public.retail_purchase_invoices for select to authenticated
 using(retail_private.has_permission(store_id,'manage_products'));
revoke all on public.retail_purchase_invoices from public,anon,authenticated;
grant select on public.retail_purchase_invoices to authenticated;

-- p_request es el id del comprobante: reintentar con los mismos datos devuelve el mismo registro.
create function public.retail_save_purchase_invoice(p_store uuid,p_request uuid,p_invoice jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.retail_purchase_invoices; duplicate public.retail_purchase_invoices; inv public.retail_purchase_invoices;
 amounts text[]:=array['net_21','vat_21','net_10_5','vat_10_5','net_27','vat_27','untaxed','internal_taxes','vat_perceptions','iibb_perceptions','other_taxes','total'];
 field text; value numeric; supplier uuid; sum_parts numeric;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if p_request is null or jsonb_typeof(p_invoice)<>'object' then raise exception 'Datos del comprobante incompletos' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into previous from public.retail_purchase_invoices where id=p_request;
 if found then
  if previous.store_id<>p_store then raise exception 'La solicitud corresponde a otro comercio'; end if;
  return previous.id;
 end if;
 foreach field in array amounts loop
  begin value:=coalesce((p_invoice->>field)::numeric,0);
  exception when others then raise exception 'Revisá el importe %', field using errcode='22023'; end;
  if value<0 or value::text in ('NaN','Infinity','-Infinity') or round(value,2)<>value or value>99999999999999 then
   raise exception 'Revisá el importe %: usá montos positivos con hasta dos decimales', field using errcode='22023';
  end if;
 end loop;
 if nullif(p_invoice->>'supplier_id','') is not null then
  select id into supplier from public.retail_suppliers where store_id=p_store and id=(p_invoice->>'supplier_id')::uuid;
 end if;
 begin
  inv:=jsonb_populate_record(null::public.retail_purchase_invoices,p_invoice);
 exception when others then raise exception 'Revisá tipo, punto de venta, número y fecha del comprobante' using errcode='22023';
 end;
 if inv.issuer_cuit is null or not retail_private.valid_cuit(inv.issuer_cuit) then raise exception 'El CUIT del proveedor no es válido' using errcode='22023'; end if;
 if inv.receiver_cuit is not null and not retail_private.valid_cuit(inv.receiver_cuit) then raise exception 'El CUIT del receptor no es válido' using errcode='22023'; end if;
 if inv.voucher_type is null or inv.point_of_sale is null or inv.number is null or inv.issue_date is null then
  raise exception 'Completá tipo, punto de venta, número y fecha del comprobante' using errcode='22023';
 end if;
 if coalesce(inv.total,0)<=0 then raise exception 'Completá el total del comprobante' using errcode='22023'; end if;
 select * into duplicate from public.retail_purchase_invoices d where d.store_id=p_store and d.issuer_cuit=inv.issuer_cuit
  and d.voucher_type=inv.voucher_type and d.point_of_sale=inv.point_of_sale and d.number=inv.number;
 if found then
  raise exception 'Este comprobante ya se registró el % (proveedor %)', to_char(duplicate.created_at at time zone 'America/Argentina/Buenos_Aires','DD/MM/YYYY'), duplicate.supplier_name using errcode='23505';
 end if;
 sum_parts:=coalesce(inv.net_21,0)+coalesce(inv.vat_21,0)+coalesce(inv.net_10_5,0)+coalesce(inv.vat_10_5,0)+coalesce(inv.net_27,0)+coalesce(inv.vat_27,0)
  +coalesce(inv.untaxed,0)+coalesce(inv.internal_taxes,0)+coalesce(inv.vat_perceptions,0)+coalesce(inv.iibb_perceptions,0)+coalesce(inv.other_taxes,0);
 insert into public.retail_purchase_invoices(
  id,store_id,supplier_id,supplier_name,issuer_cuit,receiver_cuit,voucher_type,point_of_sale,number,issue_date,authorization_type,authorization_code,
  net_21,vat_21,net_10_5,vat_10_5,net_27,vat_27,untaxed,internal_taxes,vat_perceptions,iibb_perceptions,other_taxes,total,
  balanced,qr_verified,notes,created_by,actor_email)
 values(p_request,p_store,supplier,btrim(coalesce(inv.supplier_name,'')),inv.issuer_cuit,inv.receiver_cuit,inv.voucher_type,inv.point_of_sale,inv.number,inv.issue_date,
  inv.authorization_type,nullif(inv.authorization_code,''),
  coalesce(inv.net_21,0),coalesce(inv.vat_21,0),coalesce(inv.net_10_5,0),coalesce(inv.vat_10_5,0),coalesce(inv.net_27,0),coalesce(inv.vat_27,0),
  coalesce(inv.untaxed,0),coalesce(inv.internal_taxes,0),coalesce(inv.vat_perceptions,0),coalesce(inv.iibb_perceptions,0),coalesce(inv.other_taxes,0),inv.total,
  abs(sum_parts-inv.total)<=0.05 and abs(coalesce(inv.net_21,0)*0.21-coalesce(inv.vat_21,0))<=0.05
   and abs(coalesce(inv.net_10_5,0)*0.105-coalesce(inv.vat_10_5,0))<=0.05 and abs(coalesce(inv.net_27,0)*0.27-coalesce(inv.vat_27,0))<=0.05,
  coalesce(inv.qr_verified,false),nullif(btrim(coalesce(inv.notes,'')),''),auth.uid(),auth.jwt()->>'email');
 return p_request;
end $$;

create function public.retail_delete_purchase_invoice(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 delete from public.retail_purchase_invoices where store_id=p_store and id=p_id;
 if not found then raise exception 'El comprobante ya no está disponible. Actualizá los datos'; end if;
end $$;

revoke all on function public.retail_save_purchase_invoice(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_delete_purchase_invoice(uuid,uuid) from public,anon;
grant execute on function public.retail_save_purchase_invoice(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_delete_purchase_invoice(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
$retail_source_8a5afba23235cad7$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610290003_purchase_invoices.sql','8a5afba23235cad78e07da7f4f364fccd51925225b721d3ad11456581bd926d8','schema');
 end if;
end;

-- 50/84: 202610290004_landed_costs.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610290004_landed_costs.sql') then
  raise notice 'Aplicando 202610290004_landed_costs.sql';
  execute replace($retail_source_12d7490f65c8eac5$
-- Costo final: nueva regla de proveedor "price_basis" ('auto' según el tipo de factura, 'final' si el
-- costo tomado ya incluye IVA e impuestos internos, por ejemplo la columna "Final C/Dto.").
create or replace function retail_private.valid_supplier_invoice_rules(p_rules jsonb) returns boolean
language sql immutable set search_path='' as $$
 select jsonb_typeof(p_rules)='object'
  and not exists(select 1 from jsonb_object_keys(p_rules) k where k not in ('quantity_unit','amount_includes_vat','merge_repeated_codes','cost_column','price_basis'))
  and coalesce(p_rules->>'quantity_unit','auto') in ('auto','unit')
  and coalesce(jsonb_typeof(p_rules->'amount_includes_vat'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'merge_repeated_codes'),'boolean')='boolean'
  and coalesce(jsonb_typeof(p_rules->'cost_column'),'string')='string'
  and length(coalesce(p_rules->>'cost_column',''))<=60
  and coalesce(p_rules->>'price_basis','auto') in ('auto','final');
$$;

-- Ajuste explícito de costos existentes (por ejemplo, sumar el IVA a los productos de un proveedor).
-- Todo o nada: si algún costo cambió desde la vista previa, no se modifica ninguno; así reintentar
-- nunca suma el IVA dos veces. Los productos con precio por porcentaje recalculan su precio por el
-- disparador existente.
create function public.retail_adjust_product_costs(p_store uuid,p_changes jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare change jsonb; product public.retail_products; next_cost numeric; expected numeric; changed text; total integer:=0;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 2000 then
  raise exception 'Elegí entre 1 y 2.000 productos para ajustar' using errcode='22023';
 end if;
 if (select count(distinct c->>'id') from jsonb_array_elements(p_changes) c)<>jsonb_array_length(p_changes) then
  raise exception 'Hay productos repetidos en el ajuste' using errcode='22023';
 end if;
 -- Mismo orden de bloqueo para ajustes simultáneos.
 for change in select c from jsonb_array_elements(p_changes) c order by c->>'id' loop
  begin
   next_cost:=(change->>'cost')::numeric; expected:=(change->>'expected')::numeric;
  exception when others then raise exception 'Revisá los costos del ajuste' using errcode='22023';
  end;
  if next_cost is null or expected is null or next_cost<0 or round(next_cost,2)<>next_cost or next_cost>999999999999 then
   raise exception 'Revisá los costos del ajuste: montos positivos con hasta dos decimales' using errcode='22023';
  end if;
  select * into product from public.retail_products where store_id=p_store and id=(change->>'id')::uuid for update;
  if not found then raise exception 'Un producto ya no está disponible. Actualizá la vista previa'; end if;
  -- Los combos calculan su costo desde los componentes: no se ajustan directamente.
  if jsonb_array_length(coalesce(product.stock_components,'[]'::jsonb))>0 then
   raise exception '% es un combo: su costo sale de sus componentes', product.name using errcode='22023';
  end if;
  if product.cost<>expected then changed:=coalesce(changed||', ','')||product.name; end if;
 end loop;
 if changed is not null then
  raise exception 'El costo cambió en: %. Actualizá la vista previa; no se ajustó ningún producto', left(changed,300) using errcode='40001';
 end if;
 for change in select c from jsonb_array_elements(p_changes) c order by c->>'id' loop
  update public.retail_products set cost=(change->>'cost')::numeric where store_id=p_store and id=(change->>'id')::uuid;
  total:=total+1;
 end loop;
 return total;
end $$;

revoke all on function public.retail_adjust_product_costs(uuid,jsonb) from public,anon;
grant execute on function public.retail_adjust_product_costs(uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
$retail_source_12d7490f65c8eac5$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610290004_landed_costs.sql','12d7490f65c8eac5fa8e63ebfcbb081c62e1f1204a92fe6d7ed4771ad35efa16','schema');
 end if;
end;

-- 51/84: 202610290005_conflict_errors_without_retry.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610290005_conflict_errors_without_retry.sql') then
  raise notice 'Aplicando 202610290005_conflict_errors_without_retry.sql';
  execute replace($retail_source_ed34b128cffadb21$
-- PostgREST reintenta automáticamente las transacciones que fallan con SQLSTATE 40001
-- (serialization_failure). Estas funciones usaban 40001 para avisar "el dato cambió": el aviso
-- nunca llegaba y la llamada quedaba reintentándose. Se redefinen igual, con el error por defecto (P0001).
-- Mismas firmas, permisos y comportamiento; solo cambia el código del error.

create or replace function public.retail_adjust_product_costs(p_store uuid,p_changes jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare change jsonb; product public.retail_products; next_cost numeric; expected numeric; changed text; total integer:=0;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 2000 then
  raise exception 'Elegí entre 1 y 2.000 productos para ajustar' using errcode='22023';
 end if;
 if (select count(distinct c->>'id') from jsonb_array_elements(p_changes) c)<>jsonb_array_length(p_changes) then
  raise exception 'Hay productos repetidos en el ajuste' using errcode='22023';
 end if;
 -- Mismo orden de bloqueo para ajustes simultáneos.
 for change in select c from jsonb_array_elements(p_changes) c order by c->>'id' loop
  begin
   next_cost:=(change->>'cost')::numeric; expected:=(change->>'expected')::numeric;
  exception when others then raise exception 'Revisá los costos del ajuste' using errcode='22023';
  end;
  if next_cost is null or expected is null or next_cost<0 or round(next_cost,2)<>next_cost or next_cost>999999999999 then
   raise exception 'Revisá los costos del ajuste: montos positivos con hasta dos decimales' using errcode='22023';
  end if;
  select * into product from public.retail_products where store_id=p_store and id=(change->>'id')::uuid for update;
  if not found then raise exception 'Un producto ya no está disponible. Actualizá la vista previa'; end if;
  -- Los combos calculan su costo desde los componentes: no se ajustan directamente.
  if jsonb_array_length(coalesce(product.stock_components,'[]'::jsonb))>0 then
   raise exception '% es un combo: su costo sale de sus componentes', product.name using errcode='22023';
  end if;
  if product.cost<>expected then changed:=coalesce(changed||', ','')||product.name; end if;
 end loop;
 if changed is not null then
  raise exception 'El costo cambió en: %. Actualizá la vista previa; no se ajustó ningún producto', left(changed,300);
 end if;
 for change in select c from jsonb_array_elements(p_changes) c order by c->>'id' loop
  update public.retail_products set cost=(change->>'cost')::numeric where store_id=p_store and id=(change->>'id')::uuid;
  total:=total+1;
 end loop;
 return total;
end $$;

create or replace function public.retail_save_supplier(
 p_store uuid, p_id uuid, p_name text, p_discount numeric, p_notes text default null, p_expected integer default null,
 p_cuit text default null, p_rules jsonb default null
) returns public.retail_suppliers
language plpgsql security definer set search_path='' as $$
declare result public.retail_suppliers; clean_name text; clean_key text; clean_notes text; clean_cuit text;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 clean_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' or length(clean_name)>120 then raise exception 'Ingresá el nombre del proveedor (hasta 120 caracteres)' using errcode='22023'; end if;
 if p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount>=100 then
   raise exception 'El descuento debe ser un porcentaje desde 0 y menor a 100' using errcode='22023';
 end if;
 if round(p_discount,2)<>p_discount then raise exception 'Usá hasta dos decimales para el descuento' using errcode='22023'; end if;
 clean_notes:=nullif(btrim(coalesce(p_notes,'')),'');
 if length(clean_notes)>300 then raise exception 'Las notas admiten hasta 300 caracteres' using errcode='22023'; end if;
 clean_cuit:=nullif(regexp_replace(coalesce(p_cuit,''),'[^0-9]','','g'),'');
 if clean_cuit is not null and not retail_private.valid_cuit(clean_cuit) then
   raise exception 'El CUIT no es válido. Revisá los 11 números' using errcode='22023';
 end if;
 if p_rules is not null and not retail_private.valid_supplier_invoice_rules(p_rules) then
   raise exception 'Las reglas de lectura de facturas no son válidas' using errcode='22023';
 end if;
 if exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.supplier_key=clean_key and s.id is distinct from p_id) then
   raise exception 'Ya existe un proveedor con ese nombre en el comercio' using errcode='23505';
 end if;
 if clean_cuit is not null and exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.cuit=clean_cuit and s.id is distinct from p_id) then
   raise exception 'Ese CUIT ya pertenece a otro proveedor del comercio' using errcode='23505';
 end if;
 if p_id is null then
   insert into public.retail_suppliers(store_id,name,supplier_key,discount_percent,notes,cuit,invoice_rules)
   values(p_store,clean_name,clean_key,p_discount,clean_notes,clean_cuit,coalesce(p_rules,'{}'::jsonb))
   returning * into result;
   return result;
 end if;
 update public.retail_suppliers s set name=clean_name,supplier_key=clean_key,discount_percent=p_discount,
   notes=clean_notes,
   cuit=case when p_cuit is null then s.cuit else clean_cuit end,
   invoice_rules=coalesce(p_rules,s.invoice_rules),
   revision=s.revision+1,updated_at=now()
 where s.id=p_id and s.store_id=p_store and s.revision=p_expected
 returning * into result;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar'; end if;
 return result;
end $$;

create or replace function public.retail_delete_supplier(p_store uuid, p_id uuid, p_expected integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 -- Products and alias memory keep their supplier text; only the discount record is removed.
 delete from public.retail_suppliers where id=p_id and store_id=p_store and revision=p_expected;
 if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de eliminar'; end if;
end $$;

notify pgrst,'reload schema';
$retail_source_ed34b128cffadb21$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610290005_conflict_errors_without_retry.sql','ed34b128cffadb2189e4053ebaa3b983d2728c24f925eeebbfe6e59477453313','schema');
 end if;
end;

-- 52/84: 202610290006_supplier_contact_profile.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610290006_supplier_contact_profile.sql') then
  raise notice 'Aplicando 202610290006_supplier_contact_profile.sql';
  execute replace($retail_source_7c244212c97c982d$
-- Ficha completa del proveedor (cuenta corriente, etapa A): datos fiscales, contacto y condiciones de pago.
-- Todos opcionales. No cambia descuentos, costos, comprobantes ni reglas de lectura.
create function retail_private.valid_cbu(p_cbu text) returns boolean
language plpgsql immutable set search_path='' as $$
declare first_weights integer[]:=array[7,1,3,9,7,1,3]; second_weights integer[]:=array[3,9,7,1,3,9,7,1,3,9,7,1,3];
 total integer:=0; digit integer;
begin
 if p_cbu is null or p_cbu !~ '^[0-9]{22}$' then return false; end if;
 for i in 1..7 loop total:=total+substr(p_cbu,i,1)::integer*first_weights[i]; end loop;
 digit:=(10-total%10)%10;
 if digit<>substr(p_cbu,8,1)::integer then return false; end if;
 total:=0;
 for i in 1..13 loop total:=total+substr(p_cbu,8+i,1)::integer*second_weights[i]; end loop;
 digit:=(10-total%10)%10;
 return digit=substr(p_cbu,22,1)::integer;
end $$;
revoke all on function retail_private.valid_cbu(text) from public;
grant execute on function retail_private.valid_cbu(text) to authenticated;

alter table public.retail_suppliers
 add column legal_name text check(legal_name is null or length(legal_name) between 1 and 160),
 add column vat_condition text check(vat_condition in ('RI','MO','EX')),
 add column fiscal_address text check(fiscal_address is null or length(fiscal_address) between 1 and 300),
 add column commercial_address text check(commercial_address is null or length(commercial_address) between 1 and 300),
 add column phone text check(phone is null or length(phone) between 1 and 40),
 add column email text check(email is null or (length(email)<=160 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
 add column bank_cbu text check(bank_cbu is null or retail_private.valid_cbu(bank_cbu)),
 add column bank_alias text check(bank_alias is null or bank_alias ~ '^[A-Za-z0-9.-]{6,20}$'),
 add column payment_terms text check(payment_terms is null or length(payment_terms) between 1 and 300),
 add column payment_days smallint check(payment_days between 0 and 365),
 add column collections_contact text check(collections_contact is null or length(collections_contact) between 1 and 160),
 add column purchasing_contact text check(purchasing_contact is null or length(purchasing_contact) between 1 and 160);

-- Misma función con p_profile. Sin p_profile (clientes anteriores) se conserva la ficha guardada;
-- con p_profile se reemplazan todos sus campos (los ausentes quedan vacíos).
drop function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb);
create function public.retail_save_supplier(
 p_store uuid, p_id uuid, p_name text, p_discount numeric, p_notes text default null, p_expected integer default null,
 p_cuit text default null, p_rules jsonb default null, p_profile jsonb default null
) returns public.retail_suppliers
language plpgsql security definer set search_path='' as $$
declare result public.retail_suppliers; clean_name text; clean_key text; clean_notes text; clean_cuit text;
 profile public.retail_suppliers; clean_cbu text;
 fields text[]:=array['legal_name','vat_condition','fiscal_address','commercial_address','phone','email','bank_cbu','bank_alias','payment_terms','payment_days','collections_contact','purchasing_contact'];
begin
 perform retail_private.require_permission(p_store,'manage_products');
 clean_name:=btrim(regexp_replace(coalesce(p_name,''),'[[:space:]]+',' ','g'));
 clean_key:=retail_private.normalize_supplier(clean_name);
 if clean_key='' or length(clean_name)>120 then raise exception 'Ingresá el nombre del proveedor (hasta 120 caracteres)' using errcode='22023'; end if;
 if p_discount is null or p_discount::text in ('NaN','Infinity','-Infinity') or p_discount<0 or p_discount>=100 then
   raise exception 'El descuento debe ser un porcentaje desde 0 y menor a 100' using errcode='22023';
 end if;
 if round(p_discount,2)<>p_discount then raise exception 'Usá hasta dos decimales para el descuento' using errcode='22023'; end if;
 clean_notes:=nullif(btrim(coalesce(p_notes,'')),'');
 if length(clean_notes)>300 then raise exception 'Las notas admiten hasta 300 caracteres' using errcode='22023'; end if;
 clean_cuit:=nullif(regexp_replace(coalesce(p_cuit,''),'[^0-9]','','g'),'');
 if clean_cuit is not null and not retail_private.valid_cuit(clean_cuit) then
   raise exception 'El CUIT no es válido. Revisá los 11 números' using errcode='22023';
 end if;
 if p_rules is not null and not retail_private.valid_supplier_invoice_rules(p_rules) then
   raise exception 'Las reglas de lectura de facturas no son válidas' using errcode='22023';
 end if;
 if p_profile is not null then
  if jsonb_typeof(p_profile)<>'object' or exists(select 1 from jsonb_object_keys(p_profile) k where k<>all(fields)) then
   raise exception 'Datos de la ficha del proveedor no válidos' using errcode='22023';
  end if;
  begin
   profile:=jsonb_populate_record(null::public.retail_suppliers,p_profile);
  exception when others then raise exception 'Revisá el plazo de pago: días enteros de 0 a 365' using errcode='22023';
  end;
  clean_cbu:=nullif(regexp_replace(coalesce(profile.bank_cbu,''),'[^0-9]','','g'),'');
  if clean_cbu is not null and not retail_private.valid_cbu(clean_cbu) then
   raise exception 'El CBU no es válido. Revisá los 22 números' using errcode='22023';
  end if;
  if nullif(btrim(coalesce(profile.bank_alias,'')),'') is not null and btrim(profile.bank_alias) !~ '^[A-Za-z0-9.-]{6,20}$' then
   raise exception 'El alias debe tener de 6 a 20 letras, números, puntos o guiones' using errcode='22023';
  end if;
  if nullif(btrim(coalesce(profile.email,'')),'') is not null and (length(btrim(profile.email))>160 or btrim(profile.email) !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') then
   raise exception 'Revisá el correo de administración' using errcode='22023';
  end if;
  if profile.vat_condition is not null and profile.vat_condition not in ('RI','MO','EX') then
   raise exception 'Elegí una condición frente al IVA válida' using errcode='22023';
  end if;
  if profile.payment_days is not null and profile.payment_days not between 0 and 365 then
   raise exception 'Revisá el plazo de pago: días enteros de 0 a 365' using errcode='22023';
  end if;
  if length(profile.legal_name)>160 or length(profile.fiscal_address)>300 or length(profile.commercial_address)>300 or length(profile.phone)>40
   or length(profile.payment_terms)>300 or length(profile.collections_contact)>160 or length(profile.purchasing_contact)>160 then
   raise exception 'Algún dato de la ficha supera el largo permitido' using errcode='22023';
  end if;
 end if;
 if exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.supplier_key=clean_key and s.id is distinct from p_id) then
   raise exception 'Ya existe un proveedor con ese nombre en el comercio' using errcode='23505';
 end if;
 if clean_cuit is not null and exists(select 1 from public.retail_suppliers s where s.store_id=p_store and s.cuit=clean_cuit and s.id is distinct from p_id) then
   raise exception 'Ese CUIT ya pertenece a otro proveedor del comercio' using errcode='23505';
 end if;
 if p_id is null then
   insert into public.retail_suppliers(store_id,name,supplier_key,discount_percent,notes,cuit,invoice_rules)
   values(p_store,clean_name,clean_key,p_discount,clean_notes,clean_cuit,coalesce(p_rules,'{}'::jsonb))
   returning * into result;
 else
   update public.retail_suppliers s set name=clean_name,supplier_key=clean_key,discount_percent=p_discount,
     notes=clean_notes,
     cuit=case when p_cuit is null then s.cuit else clean_cuit end,
     invoice_rules=coalesce(p_rules,s.invoice_rules),
     revision=s.revision+1,updated_at=now()
   where s.id=p_id and s.store_id=p_store and s.revision=p_expected
   returning * into result;
   -- Sin 40001: PostgREST reintentaría la transacción en lugar de devolver el aviso.
   if not found then raise exception 'Otra persona cambió o eliminó este proveedor. Actualizá los datos y revisá antes de guardar'; end if;
 end if;
 if p_profile is not null then
   update public.retail_suppliers s set
     legal_name=nullif(btrim(coalesce(profile.legal_name,'')),''),
     vat_condition=profile.vat_condition,
     fiscal_address=nullif(btrim(coalesce(profile.fiscal_address,'')),''),
     commercial_address=nullif(btrim(coalesce(profile.commercial_address,'')),''),
     phone=nullif(btrim(coalesce(profile.phone,'')),''),
     email=nullif(lower(btrim(coalesce(profile.email,''))),''),
     bank_cbu=clean_cbu,
     bank_alias=nullif(btrim(coalesce(profile.bank_alias,'')),''),
     payment_terms=nullif(btrim(coalesce(profile.payment_terms,'')),''),
     payment_days=profile.payment_days,
     collections_contact=nullif(btrim(coalesce(profile.collections_contact,'')),''),
     purchasing_contact=nullif(btrim(coalesce(profile.purchasing_contact,'')),'')
   where s.id=result.id
   returning * into result;
 end if;
 return result;
end $$;

revoke all on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb,jsonb) from public,anon;
grant execute on function public.retail_save_supplier(uuid,uuid,text,numeric,text,integer,text,jsonb,jsonb) to authenticated;

notify pgrst,'reload schema';
$retail_source_7c244212c97c982d$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610290006_supplier_contact_profile.sql','7c244212c97c982da6e0d2eb64ca2c64c50c1dd512c0f946338584a5a6fc497b','schema');
 end if;
end;

-- 53/84: 202610290007_purchase_invoice_tracking.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610290007_purchase_invoice_tracking.sql') then
  raise notice 'Aplicando 202610290007_purchase_invoice_tracking.sql';
  execute replace($retail_source_551f2d827fa2913e$
-- Cuenta corriente, etapa B: vencimiento, revisión, aceptación de notas de débito y vínculo de notas
-- de crédito/débito con su factura. Los importes originales nunca se modifican.
alter table public.retail_purchase_invoices
 add column due_date date,
 add column review_reason text check(review_reason is null or length(btrim(review_reason)) between 1 and 300),
 add column reviewed_by uuid references auth.users(id),
 add column reviewed_at timestamptz,
 add column accepted_by uuid references auth.users(id),
 add column accepted_at timestamptz,
 add column applies_to uuid references public.retail_purchase_invoices(id) on delete set null,
 add check(applies_to is null or applies_to<>id),
 add check((accepted_at is null)=(accepted_by is null));
create index retail_purchase_invoice_applies_to on public.retail_purchase_invoices(applies_to) where applies_to is not null;

-- Vencimiento por defecto: emisión + plazo del proveedor (por id o, si no, por CUIT). Sin plazo: la emisión.
create function retail_private.default_purchase_due_date() returns trigger
language plpgsql set search_path='' as $$
declare days integer;
begin
 if new.due_date is null then
  select s.payment_days into days from public.retail_suppliers s
   where s.store_id=new.store_id and (s.id=new.supplier_id or (new.supplier_id is null and s.cuit=new.issuer_cuit))
   order by (s.id=new.supplier_id) desc limit 1;
  new.due_date:=new.issue_date+coalesce(days,0);
 end if;
 return new;
end $$;
create trigger retail_purchase_due_date before insert on public.retail_purchase_invoices
 for each row execute function retail_private.default_purchase_due_date();

update public.retail_purchase_invoices p set due_date=p.issue_date+coalesce(
 (select s.payment_days from public.retail_suppliers s where s.store_id=p.store_id and (s.id=p.supplier_id or (p.supplier_id is null and s.cuit=p.issuer_cuit))
  order by (s.id=p.supplier_id) desc limit 1),0);
alter table public.retail_purchase_invoices alter column due_date set not null,
 add check(due_date>=issue_date);

-- Tipos: facturas (1, 6, 11, 51), notas de débito (2, 7, 12) y de crédito (3, 8, 13).
create function public.retail_update_purchase_invoice_tracking(p_store uuid,p_id uuid,p_changes jsonb) returns public.retail_purchase_invoices
language plpgsql security definer set search_path='' as $$
declare inv public.retail_purchase_invoices; target public.retail_purchase_invoices; result public.retail_purchase_invoices;
 next_due date; next_reason text; next_target uuid; linked numeric;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_changes)<>'object' or exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('due_date','review_reason','accept','applies_to')) then
  raise exception 'Cambios no válidos para el comprobante' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into inv from public.retail_purchase_invoices where store_id=p_store and id=p_id for update;
 if not found then raise exception 'El comprobante ya no está disponible. Actualizá los datos'; end if;
 next_due:=inv.due_date; next_reason:=inv.review_reason; next_target:=inv.applies_to;
 if p_changes ? 'due_date' then
  begin next_due:=(p_changes->>'due_date')::date;
  exception when others then raise exception 'Revisá la fecha de vencimiento' using errcode='22023'; end;
  if next_due is null or next_due<inv.issue_date then raise exception 'El vencimiento no puede ser anterior a la emisión' using errcode='22023'; end if;
 end if;
 if p_changes ? 'review_reason' then
  next_reason:=nullif(btrim(coalesce(p_changes->>'review_reason','')),'');
  if length(next_reason)>300 then raise exception 'El motivo admite hasta 300 caracteres' using errcode='22023'; end if;
 end if;
 if coalesce((p_changes->>'accept')::boolean,false) and inv.voucher_type not in (2,7,12) then
  raise exception 'Solo se aceptan notas de débito' using errcode='22023';
 end if;
 if p_changes ? 'applies_to' then
  next_target:=nullif(p_changes->>'applies_to','')::uuid;
  if next_target is not null then
   if inv.voucher_type not in (2,3,7,8,12,13) then raise exception 'Solo las notas de crédito o débito se vinculan con una factura' using errcode='22023'; end if;
   select * into target from public.retail_purchase_invoices where store_id=p_store and id=next_target;
   if not found or target.id=inv.id then raise exception 'La factura elegida no está disponible' using errcode='22023'; end if;
   if target.voucher_type not in (1,6,11,51) or target.issuer_cuit<>inv.issuer_cuit then
    raise exception 'Elegí una factura del mismo proveedor' using errcode='22023';
   end if;
   if inv.voucher_type in (3,8,13) then
    select coalesce(sum(total),0) into linked from public.retail_purchase_invoices
     where store_id=p_store and applies_to=next_target and voucher_type in (3,8,13) and id<>inv.id;
    if linked+inv.total>target.total+0.05 then
     raise exception 'Las notas de crédito vinculadas superarían el total de la factura' using errcode='22023';
    end if;
   end if;
  end if;
 end if;
 update public.retail_purchase_invoices set
  due_date=next_due,
  review_reason=next_reason,
  reviewed_by=case when next_reason is distinct from inv.review_reason then case when next_reason is null then null else auth.uid() end else reviewed_by end,
  reviewed_at=case when next_reason is distinct from inv.review_reason then case when next_reason is null then null else now() end else reviewed_at end,
  accepted_by=case when coalesce((p_changes->>'accept')::boolean,false) and accepted_at is null then auth.uid() else accepted_by end,
  accepted_at=case when coalesce((p_changes->>'accept')::boolean,false) and accepted_at is null then now() else accepted_at end,
  applies_to=next_target
 where id=inv.id
 returning * into result;
 return result;
end $$;

revoke all on function retail_private.default_purchase_due_date() from public,anon,authenticated;
revoke all on function public.retail_update_purchase_invoice_tracking(uuid,uuid,jsonb) from public,anon;
grant execute on function public.retail_update_purchase_invoice_tracking(uuid,uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
$retail_source_551f2d827fa2913e$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610290007_purchase_invoice_tracking.sql','551f2d827fa2913e32d6fc01d3cbe19fe706f656d91eec0bbd074e8328a5261b','schema');
 end if;
end;

-- 54/84: 202610300001_supplier_payments.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610300001_supplier_payments.sql') then
  raise notice 'Aplicando 202610300001_supplier_payments.sql';
  execute replace($retail_source_1d44ea08176b5b5b$
-- Cuenta corriente, etapa C: pagos a proveedores aplicados a comprobantes, retenciones y anticipos.
-- Nuevo permiso: los perfiles existentes no lo reciben automáticamente.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]) action where retail_private.has_permission(p_store,action);
$$;

create table public.retail_supplier_payments (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id),
 issuer_cuit text not null check(retail_private.valid_cuit(issuer_cuit)),
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 paid_on date not null,
 method text not null check(method in ('cash','transfer','check','other')),
 -- Dinero entregado. Las retenciones también cancelan deuda, pero no salen de la caja.
 amount numeric(16,2) not null check(amount>=0),
 ret_vat numeric(16,2) not null default 0 check(ret_vat>=0),
 ret_income numeric(16,2) not null default 0 check(ret_income>=0),
 ret_iibb numeric(16,2) not null default 0 check(ret_iibb>=0),
 ret_suss numeric(16,2) not null default 0 check(ret_suss>=0),
 retention_certificate text check(length(retention_certificate)<=60),
 reference text check(length(reference)<=120),
 notes text check(length(notes)<=300),
 movement_id uuid references public.retail_movements(id),
 voided_at timestamptz,
 voided_by uuid references auth.users(id),
 void_reason text check(length(void_reason)<=300),
 voided_allocations jsonb,
 created_by uuid not null references auth.users(id),
 actor_email text,
 created_at timestamptz not null default now(),
 check(amount+ret_vat+ret_income+ret_iibb+ret_suss>0),
 check((voided_at is null)=(void_reason is null)),
 check(method<>'cash' or movement_id is not null)
);
create index retail_supplier_payment_history on public.retail_supplier_payments(store_id,paid_on desc,id);
create index retail_supplier_payment_account on public.retail_supplier_payments(store_id,issuer_cuit);

create table public.retail_supplier_payment_allocations (
 payment_id uuid not null references public.retail_supplier_payments(id),
 invoice_id uuid not null references public.retail_purchase_invoices(id),
 store_id uuid not null references public.retail_stores(id),
 amount numeric(16,2) not null check(amount>0),
 primary key(payment_id,invoice_id)
);
create index retail_supplier_allocation_invoice on public.retail_supplier_payment_allocations(invoice_id);

alter table public.retail_supplier_payments enable row level security;
alter table public.retail_supplier_payment_allocations enable row level security;
create policy authorized_read on public.retail_supplier_payments for select to authenticated using(retail_private.has_permission(store_id,'manage_supplier_accounts'));
create policy authorized_read on public.retail_supplier_payment_allocations for select to authenticated using(retail_private.has_permission(store_id,'manage_supplier_accounts'));
revoke all on public.retail_supplier_payments,public.retail_supplier_payment_allocations from public,anon,authenticated;
grant select on public.retail_supplier_payments,public.retail_supplier_payment_allocations to authenticated;

-- Quien registra pagos necesita ver los comprobantes para aplicarlos.
drop policy authorized_read on public.retail_purchase_invoices;
create policy authorized_read on public.retail_purchase_invoices for select to authenticated
 using(retail_private.has_permission(store_id,'manage_products') or retail_private.has_permission(store_id,'manage_supplier_accounts'));

-- Las notas de crédito y débito se vinculan en la etapa B. Valida y guarda aplicaciones de un pago:
-- mismo proveedor, solo facturas y notas de débito, sin superar su saldo ni lo disponible del pago.
create function retail_private.allocate_supplier_payment(p_store uuid,p_payment uuid,p_cuit text,p_available numeric,p_allocations jsonb) returns numeric
language plpgsql security definer set search_path='' as $$
declare item jsonb; invoice public.retail_purchase_invoices; value numeric; balance numeric; used numeric:=0;
begin
 if jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)>200 then raise exception 'Revisá las facturas elegidas' using errcode='22023'; end if;
 for item in select c from jsonb_array_elements(p_allocations) c loop
  begin value:=(item->>'amount')::numeric;
  exception when others then raise exception 'Revisá los importes aplicados' using errcode='22023'; end;
  if value is null or value<=0 or round(value,2)<>value then raise exception 'Revisá los importes aplicados: positivos con hasta dos decimales' using errcode='22023'; end if;
  select * into invoice from public.retail_purchase_invoices where store_id=p_store and id=(item->>'invoice_id')::uuid for update;
  if not found or invoice.issuer_cuit<>p_cuit or invoice.voucher_type not in (1,2,6,7,11,12,51) then
   raise exception 'Elegí facturas o notas de débito de este proveedor' using errcode='22023';
  end if;
  balance:=invoice.total
   -coalesce((select sum(n.total) from public.retail_purchase_invoices n where n.store_id=p_store and n.applies_to=invoice.id and n.voucher_type in (3,8,13)),0)
   -coalesce((select sum(a.amount) from public.retail_supplier_payment_allocations a where a.invoice_id=invoice.id),0);
  if value>balance+0.005 then
   raise exception 'El importe aplicado supera el saldo del comprobante %-% (saldo %)', invoice.point_of_sale, invoice.number, round(balance,2) using errcode='22023';
  end if;
  insert into public.retail_supplier_payment_allocations(payment_id,invoice_id,store_id,amount) values(p_payment,invoice.id,p_store,value);
  used:=used+value;
 end loop;
 if used>p_available+0.005 then raise exception 'Lo aplicado supera el importe disponible del pago' using errcode='22023'; end if;
 return used;
end $$;
revoke all on function retail_private.allocate_supplier_payment(uuid,uuid,text,numeric,jsonb) from public,anon,authenticated;

-- p_request es el id del pago: reintentar devuelve el mismo registro. En efectivo crea en la misma
-- transacción el retiro del turno, con las validaciones de caja de retail_add_movement.
create function public.retail_save_supplier_payment(p_store uuid,p_request uuid,p_payment jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.retail_supplier_payments; pay public.retail_supplier_payments; v_shift uuid; v_voucher text; v_movement uuid;
 v_name text; total numeric; field text;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 if p_request is null or jsonb_typeof(p_payment)<>'object' then raise exception 'Datos del pago incompletos' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into previous from public.retail_supplier_payments where id=p_request;
 if found then
  if previous.store_id<>p_store then raise exception 'La solicitud corresponde a otro comercio'; end if;
  return previous.id;
 end if;
 begin
  pay:=jsonb_populate_record(null::public.retail_supplier_payments,p_payment);
 exception when others then raise exception 'Revisá fecha, medio e importes del pago' using errcode='22023';
 end;
 v_name:=btrim(coalesce(pay.supplier_name,''));
 if pay.issuer_cuit is null or not retail_private.valid_cuit(pay.issuer_cuit) then raise exception 'Elegí un proveedor con CUIT válido' using errcode='22023'; end if;
 if v_name='' or length(v_name)>120 then raise exception 'Falta el nombre del proveedor' using errcode='22023'; end if;
 if pay.paid_on is null then raise exception 'Completá la fecha del pago' using errcode='22023'; end if;
 if pay.method is null or pay.method not in ('cash','transfer','check','other') then raise exception 'Elegí el medio de pago' using errcode='22023'; end if;
 foreach field in array array['amount','ret_vat','ret_income','ret_iibb','ret_suss'] loop
  if coalesce((to_jsonb(pay)->>field)::numeric,0)<0 or round(coalesce((to_jsonb(pay)->>field)::numeric,0),2)<>coalesce((to_jsonb(pay)->>field)::numeric,0) then
   raise exception 'Revisá los importes del pago: positivos con hasta dos decimales' using errcode='22023';
  end if;
 end loop;
 total:=coalesce(pay.amount,0)+coalesce(pay.ret_vat,0)+coalesce(pay.ret_income,0)+coalesce(pay.ret_iibb,0)+coalesce(pay.ret_suss,0);
 if total<=0 then raise exception 'Completá el importe del pago' using errcode='22023'; end if;
 if pay.method='cash' then
  if coalesce(pay.amount,0)<=0 then raise exception 'Completá el efectivo entregado' using errcode='22023'; end if;
  v_shift:=nullif(p_payment->>'shift_id','')::uuid;
  v_voucher:=nullif(btrim(coalesce(p_payment->>'voucher_url','')),'');
  if v_shift is null then raise exception 'Elegí el turno de caja del que sale el efectivo' using errcode='22023'; end if;
  if not exists(select 1 from public.retail_shifts s where s.id=v_shift and s.store_id=p_store and s.closed_at is null) then
   raise exception 'El turno elegido ya no está abierto' using errcode='22023';
  end if;
  v_movement:=public.retail_add_movement(v_shift,'RETIRO',pay.amount,left('Pago a proveedor: '||v_name,300),p_request,'supplier_payment',v_voucher,v_name);
 end if;
 insert into public.retail_supplier_payments(id,store_id,issuer_cuit,supplier_name,paid_on,method,amount,ret_vat,ret_income,ret_iibb,ret_suss,
  retention_certificate,reference,notes,movement_id,created_by,actor_email)
 values(p_request,p_store,pay.issuer_cuit,v_name,pay.paid_on,pay.method,coalesce(pay.amount,0),coalesce(pay.ret_vat,0),coalesce(pay.ret_income,0),coalesce(pay.ret_iibb,0),coalesce(pay.ret_suss,0),
  nullif(btrim(coalesce(pay.retention_certificate,'')),''),nullif(btrim(coalesce(pay.reference,'')),''),nullif(btrim(coalesce(pay.notes,'')),''),v_movement,auth.uid(),auth.jwt()->>'email');
 perform retail_private.allocate_supplier_payment(p_store,p_request,pay.issuer_cuit,total,coalesce(p_payment->'allocations','[]'::jsonb));
 return p_request;
end $$;

-- Aplica lo que quedó a favor (anticipo) a comprobantes del mismo proveedor.
create function public.retail_apply_supplier_payment(p_store uuid,p_id uuid,p_allocations jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare pay public.retail_supplier_payments; used numeric;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into pay from public.retail_supplier_payments where store_id=p_store and id=p_id for update;
 if not found or pay.voided_at is not null then raise exception 'El pago ya no está disponible. Actualizá los datos'; end if;
 select coalesce(sum(a.amount),0) into used from public.retail_supplier_payment_allocations a where a.payment_id=p_id;
 if exists(select 1 from jsonb_array_elements(p_allocations) c join public.retail_supplier_payment_allocations a on a.payment_id=p_id and a.invoice_id=(c->>'invoice_id')::uuid) then
  raise exception 'Este pago ya está aplicado a uno de esos comprobantes' using errcode='22023';
 end if;
 perform retail_private.allocate_supplier_payment(p_store,p_id,pay.issuer_cuit,pay.amount+pay.ret_vat+pay.ret_income+pay.ret_iibb+pay.ret_suss-used,p_allocations);
end $$;

-- Un pago no se borra: se anula con motivo y sus aplicaciones quedan como constancia.
-- El retiro de caja no se revierte: el efectivo ya salió y el arqueo no debe cambiar por una corrección.
create function public.retail_void_supplier_payment(p_store uuid,p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare pay public.retail_supplier_payments; reason text:=nullif(btrim(coalesce(p_reason,'')),''); snapshot jsonb;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 if reason is null or length(reason)>300 then raise exception 'Indicá el motivo de la anulación (hasta 300 caracteres)' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into pay from public.retail_supplier_payments where store_id=p_store and id=p_id for update;
 if not found then raise exception 'El pago ya no está disponible. Actualizá los datos'; end if;
 if pay.voided_at is not null then raise exception 'Este pago ya está anulado'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('invoice_id',a.invoice_id,'amount',a.amount)),'[]'::jsonb) into snapshot
  from public.retail_supplier_payment_allocations a where a.payment_id=p_id;
 delete from public.retail_supplier_payment_allocations where payment_id=p_id;
 update public.retail_supplier_payments set voided_at=now(),voided_by=auth.uid(),void_reason=reason,voided_allocations=snapshot where id=p_id;
end $$;

create or replace function public.retail_delete_purchase_invoice(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if exists(select 1 from public.retail_supplier_payment_allocations a where a.store_id=p_store and a.invoice_id=p_id) then
  raise exception 'Este comprobante tiene pagos aplicados. Anulá esos pagos antes de eliminarlo';
 end if;
 delete from public.retail_purchase_invoices where store_id=p_store and id=p_id;
 if not found then raise exception 'El comprobante ya no está disponible. Actualizá los datos'; end if;
end $$;

-- Una nota de crédito no puede dejar la factura por debajo de lo ya pagado.
create or replace function public.retail_update_purchase_invoice_tracking(p_store uuid,p_id uuid,p_changes jsonb) returns public.retail_purchase_invoices
language plpgsql security definer set search_path='' as $$
declare inv public.retail_purchase_invoices; target public.retail_purchase_invoices; result public.retail_purchase_invoices;
 next_due date; next_reason text; next_target uuid; linked numeric;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_changes)<>'object' or exists(select 1 from jsonb_object_keys(p_changes) k where k not in ('due_date','review_reason','accept','applies_to')) then
  raise exception 'Cambios no válidos para el comprobante' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into inv from public.retail_purchase_invoices where store_id=p_store and id=p_id for update;
 if not found then raise exception 'El comprobante ya no está disponible. Actualizá los datos'; end if;
 next_due:=inv.due_date; next_reason:=inv.review_reason; next_target:=inv.applies_to;
 if p_changes ? 'due_date' then
  begin next_due:=(p_changes->>'due_date')::date;
  exception when others then raise exception 'Revisá la fecha de vencimiento' using errcode='22023'; end;
  if next_due is null or next_due<inv.issue_date then raise exception 'El vencimiento no puede ser anterior a la emisión' using errcode='22023'; end if;
 end if;
 if p_changes ? 'review_reason' then
  next_reason:=nullif(btrim(coalesce(p_changes->>'review_reason','')),'');
  if length(next_reason)>300 then raise exception 'El motivo admite hasta 300 caracteres' using errcode='22023'; end if;
 end if;
 if coalesce((p_changes->>'accept')::boolean,false) and inv.voucher_type not in (2,7,12) then
  raise exception 'Solo se aceptan notas de débito' using errcode='22023';
 end if;
 if p_changes ? 'applies_to' then
  next_target:=nullif(p_changes->>'applies_to','')::uuid;
  if next_target is not null then
   if inv.voucher_type not in (2,3,7,8,12,13) then raise exception 'Solo las notas de crédito o débito se vinculan con una factura' using errcode='22023'; end if;
   select * into target from public.retail_purchase_invoices where store_id=p_store and id=next_target;
   if not found or target.id=inv.id then raise exception 'La factura elegida no está disponible' using errcode='22023'; end if;
   if target.voucher_type not in (1,6,11,51) or target.issuer_cuit<>inv.issuer_cuit then
    raise exception 'Elegí una factura del mismo proveedor' using errcode='22023';
   end if;
   if inv.voucher_type in (3,8,13) then
    select coalesce(sum(total),0) into linked from public.retail_purchase_invoices
     where store_id=p_store and applies_to=next_target and voucher_type in (3,8,13) and id<>inv.id;
    if linked+inv.total+coalesce((select sum(a.amount) from public.retail_supplier_payment_allocations a where a.invoice_id=next_target),0)>target.total+0.05 then
     raise exception 'Las notas de crédito y los pagos aplicados superarían el total de la factura' using errcode='22023';
    end if;
   end if;
  end if;
 end if;
 update public.retail_purchase_invoices set
  due_date=next_due,
  review_reason=next_reason,
  reviewed_by=case when next_reason is distinct from inv.review_reason then case when next_reason is null then null else auth.uid() end else reviewed_by end,
  reviewed_at=case when next_reason is distinct from inv.review_reason then case when next_reason is null then null else now() end else reviewed_at end,
  accepted_by=case when coalesce((p_changes->>'accept')::boolean,false) and accepted_at is null then auth.uid() else accepted_by end,
  accepted_at=case when coalesce((p_changes->>'accept')::boolean,false) and accepted_at is null then now() else accepted_at end,
  applies_to=next_target
 where id=inv.id
 returning * into result;
 return result;
end $$;

revoke all on function public.retail_save_supplier_payment(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_apply_supplier_payment(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_void_supplier_payment(uuid,uuid,text) from public,anon;
grant execute on function public.retail_save_supplier_payment(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_apply_supplier_payment(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_void_supplier_payment(uuid,uuid,text) to authenticated;

notify pgrst,'reload schema';
$retail_source_1d44ea08176b5b5b$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610300001_supplier_payments.sql','1d44ea08176b5b5b2181d65d6019edd40be772aa25c14ae45b89866bde76cd8d','schema');
 end if;
end;

-- 55/84: 202610300002_payment_apply_same_invoice.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610300002_payment_apply_same_invoice.sql') then
  raise notice 'Aplicando 202610300002_payment_apply_same_invoice.sql';
  execute replace($retail_source_e0eb93640914e083$
-- Lo que queda a favor de un pago debe poder aplicarse a un comprobante que ese pago ya cubrió en parte
-- (un proveedor con una sola factura dejaba el anticipo sin destino). Las aplicaciones se acumulan.
create or replace function retail_private.allocate_supplier_payment(p_store uuid,p_payment uuid,p_cuit text,p_available numeric,p_allocations jsonb) returns numeric
language plpgsql security definer set search_path='' as $$
declare item jsonb; invoice public.retail_purchase_invoices; value numeric; balance numeric; used numeric:=0;
begin
 if jsonb_typeof(p_allocations)<>'array' or jsonb_array_length(p_allocations)>200 then raise exception 'Revisá las facturas elegidas' using errcode='22023'; end if;
 for item in select c from jsonb_array_elements(p_allocations) c loop
  begin value:=(item->>'amount')::numeric;
  exception when others then raise exception 'Revisá los importes aplicados' using errcode='22023'; end;
  if value is null or value<=0 or round(value,2)<>value then raise exception 'Revisá los importes aplicados: positivos con hasta dos decimales' using errcode='22023'; end if;
  select * into invoice from public.retail_purchase_invoices where store_id=p_store and id=(item->>'invoice_id')::uuid for update;
  if not found or invoice.issuer_cuit<>p_cuit or invoice.voucher_type not in (1,2,6,7,11,12,51) then
   raise exception 'Elegí facturas o notas de débito de este proveedor' using errcode='22023';
  end if;
  balance:=invoice.total
   -coalesce((select sum(n.total) from public.retail_purchase_invoices n where n.store_id=p_store and n.applies_to=invoice.id and n.voucher_type in (3,8,13)),0)
   -coalesce((select sum(a.amount) from public.retail_supplier_payment_allocations a where a.invoice_id=invoice.id),0);
  if value>balance+0.005 then
   raise exception 'El importe aplicado supera el saldo del comprobante %-% (saldo %)', invoice.point_of_sale, invoice.number, round(balance,2) using errcode='22023';
  end if;
  insert into public.retail_supplier_payment_allocations(payment_id,invoice_id,store_id,amount) values(p_payment,invoice.id,p_store,value)
   on conflict(payment_id,invoice_id) do update set amount=public.retail_supplier_payment_allocations.amount+excluded.amount;
  used:=used+value;
 end loop;
 if used>p_available+0.005 then raise exception 'Lo aplicado supera el importe disponible del pago' using errcode='22023'; end if;
 return used;
end $$;

create or replace function public.retail_apply_supplier_payment(p_store uuid,p_id uuid,p_allocations jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare pay public.retail_supplier_payments; used numeric;
begin
 perform retail_private.require_permission(p_store,'manage_supplier_accounts');
 perform pg_advisory_xact_lock(hashtextextended('retail-purchase-invoice:'||p_store::text,0));
 select * into pay from public.retail_supplier_payments where store_id=p_store and id=p_id for update;
 if not found or pay.voided_at is not null then raise exception 'El pago ya no está disponible. Actualizá los datos'; end if;
 select coalesce(sum(a.amount),0) into used from public.retail_supplier_payment_allocations a where a.payment_id=p_id;
 perform retail_private.allocate_supplier_payment(p_store,p_id,pay.issuer_cuit,pay.amount+pay.ret_vat+pay.ret_income+pay.ret_iibb+pay.ret_suss-used,p_allocations);
end $$;

notify pgrst,'reload schema';
$retail_source_e0eb93640914e083$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610300002_payment_apply_same_invoice.sql','e0eb93640914e083ee8007a53a7f179287307aa44ecbc399e31eadad02305c5e','schema');
 end if;
end;

-- 56/84: 202610300003_branch_inventory_by_default.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610300003_branch_inventory_by_default.sql') then
  raise notice 'Aplicando 202610300003_branch_inventory_by_default.sql';
  execute replace($retail_source_85ae0991e1effe24$
-- require_permission bloquea filas con FOR SHARE: una función STABLE corre en transacción de solo lectura y falla.
alter function public.retail_location_stock_summary(uuid) volatile;

-- Comercios nuevos: nacen con stock por sucursal; todavía no hay stock que distribuir.
alter table public.retail_stores
 alter column branch_inventory_enabled set default true,
 alter column depot_enabled set default true;

create or replace function retail_private.activate_new_store_inventory() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.is_default then
  insert into public.retail_inventory_activations(store_id,branch_id,created_by)
  select s.id,new.id,s.owner_id from public.retail_stores s where s.id=new.store_id and s.branch_inventory_enabled
  on conflict (store_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function retail_private.activate_new_store_inventory() from public,anon,authenticated;
drop trigger if exists retail_activate_new_store_inventory on public.retail_branches;
create trigger retail_activate_new_store_inventory after insert on public.retail_branches for each row execute function retail_private.activate_new_store_inventory();

-- Comercios existentes con una sola sucursal: no hay decisión que tomar sobre dónde está el stock.
-- Con varias sucursales, turnos abiertos o traslados pendientes se conserva la activación manual desde Transferencias.
do $$
declare r record; rolled uuid[]:='{}';
begin
 for r in select s.id as store_id,b.id as branch_id,s.owner_id from public.retail_stores s
  join public.retail_branches b on b.store_id=s.id and b.is_default
  where not s.branch_inventory_enabled
   and not exists(select 1 from public.retail_inventory_activations a where a.store_id=s.id)
   and (select count(*) from public.retail_branches o where o.store_id=s.id)=1
   and not exists(select 1 from public.retail_shifts x where x.store_id=s.id and x.closed_at is null)
   and not exists(select 1 from public.retail_stock_transfers t where t.store_id=s.id and t.status='pending')
   and not exists(select 1 from public.retail_products p
    left join public.retail_depot_balances d on d.store_id=p.store_id and d.product_id=p.id
    where p.store_id=s.id and jsonb_array_length(p.stock_components)=0 and p.stock-coalesce(d.quantity,0)<0)
 loop
  insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity)
  select r.store_id,r.branch_id,p.id,p.stock-coalesce(d.quantity,0) from public.retail_products p
  left join public.retail_depot_balances d on d.store_id=p.store_id and d.product_id=p.id
  where p.store_id=r.store_id and jsonb_array_length(p.stock_components)=0;
  insert into public.retail_inventory_activations(store_id,branch_id,created_by) values(r.store_id,r.branch_id,r.owner_id);
  rolled:=rolled||r.store_id;
 end loop;
 -- Estas guardas exigen un administrador con sesión; la migración no tiene sesión.
 alter table public.retail_stores disable trigger retail_branch_inventory_setting;
 alter table public.retail_stores disable trigger retail_guard_depot_setting;
 update public.retail_stores set branch_inventory_enabled=true,depot_enabled=true where id=any(rolled);
 alter table public.retail_stores enable trigger retail_branch_inventory_setting;
 alter table public.retail_stores enable trigger retail_guard_depot_setting;
end $$;
$retail_source_85ae0991e1effe24$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610300003_branch_inventory_by_default.sql','85ae0991e1effe24807a0e8ac019e411696d7a8734c844218b4f5d67e09b31e8','schema');
 end if;
end;

-- 57/84: 202610300004_branch_inventory_always.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610300004_branch_inventory_always.sql') then
  raise notice 'Aplicando 202610300004_branch_inventory_always.sql';
  execute replace($retail_source_6aa129a6af964b60$
-- El stock por sucursal deja de ser opcional: los comercios que quedaban sin activar asignan su salón a la sucursal principal.
-- Solo se omite un saldo imposible (depósito mayor que el total), que seguiría usando la activación desde Transferencias.
do $$
declare r record; rolled uuid[]:='{}';
begin
 for r in select s.id as store_id,b.id as branch_id,s.owner_id from public.retail_stores s
  join public.retail_branches b on b.store_id=s.id and b.is_default
  where not s.branch_inventory_enabled
   and not exists(select 1 from public.retail_inventory_activations a where a.store_id=s.id)
   and not exists(select 1 from public.retail_products p
    left join public.retail_depot_balances d on d.store_id=p.store_id and d.product_id=p.id
    where p.store_id=s.id and jsonb_array_length(p.stock_components)=0 and p.stock-coalesce(d.quantity,0)<0)
 loop
  perform 1 from public.retail_stores where id=r.store_id for update;
  perform 1 from public.retail_products where store_id=r.store_id order by id for update;
  insert into public.retail_branch_stock(store_id,branch_id,product_id,quantity)
  select r.store_id,r.branch_id,p.id,p.stock-coalesce(d.quantity,0) from public.retail_products p
  left join public.retail_depot_balances d on d.store_id=p.store_id and d.product_id=p.id
  where p.store_id=r.store_id and jsonb_array_length(p.stock_components)=0;
  insert into public.retail_inventory_activations(store_id,branch_id,created_by) values(r.store_id,r.branch_id,r.owner_id);
  rolled:=rolled||r.store_id;
 end loop;
 -- Estas guardas exigen un administrador con sesión; la migración no tiene sesión.
 alter table public.retail_stores disable trigger retail_branch_inventory_setting;
 alter table public.retail_stores disable trigger retail_guard_depot_setting;
 update public.retail_stores set branch_inventory_enabled=true,depot_enabled=true where id=any(rolled);
 alter table public.retail_stores enable trigger retail_branch_inventory_setting;
 alter table public.retail_stores enable trigger retail_guard_depot_setting;
end $$;
$retail_source_6aa129a6af964b60$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610300004_branch_inventory_always.sql','6aa129a6af964b60ffd90bafa3e6c9fa84e829600f8aaf5f398474ee1a50cc25','schema');
 end if;
end;

-- 58/84: 202610300005_shift_cash_into_branch_funds.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610300005_shift_cash_into_branch_funds.sql') then
  raise notice 'Aplicando 202610300005_shift_cash_into_branch_funds.sql';
  execute replace($retail_source_8b55ed736684a540$
-- Un cierre puede dejar menos efectivo que la apertura: el saldo refleja ese faltante en vez de impedir el cierre.
-- Los movimientos manuales siguen rechazando sacar más de lo disponible.
alter table public.retail_location_funds drop constraint if exists retail_location_funds_balance_check;
alter table public.retail_location_funds drop constraint if exists retail_location_funds_balance_valid;
alter table public.retail_location_funds add constraint retail_location_funds_balance_valid check(balance::text not in ('NaN','Infinity','-Infinity'));

alter table public.retail_fund_transfers add column if not exists shift_id uuid;
alter table public.retail_fund_transfers drop constraint if exists retail_fund_transfers_shift_fkey;
alter table public.retail_fund_transfers add constraint retail_fund_transfers_shift_fkey foreign key(store_id,shift_id) references public.retail_shifts(store_id,id);

-- Lo generado por el turno: efectivo contado menos el efectivo con que abrió. Cubre cierres en línea y sin conexión.
create or replace function retail_private.shift_cash_to_fund() returns trigger language plpgsql security definer set search_path='' as $$
declare v_branch uuid; v_register text; delta numeric;
begin
 if old.closed_at is not null or new.closed_at is null or new.counted_cash is null then return new; end if;
 delta:=new.counted_cash-new.opening_cash;
 if delta=0 then return new; end if;
 select branch_id,name into v_branch,v_register from public.retail_registers where store_id=new.store_id and id=new.register_id;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||new.store_id::text,0));
 insert into public.retail_location_funds(store_id,location) values(new.store_id,v_branch::text) on conflict do nothing;
 update public.retail_location_funds set balance=balance+delta where store_id=new.store_id and location=v_branch::text;
 insert into public.retail_fund_transfers(id,store_id,from_location,to_location,amount,note,created_by,actor_email,shift_id)
 values(gen_random_uuid(),new.store_id,case when delta<0 then v_branch::text end,case when delta>0 then v_branch::text end,abs(delta),
  left('Cierre de turno · '||coalesce(v_register,'Caja'),1000),coalesce(new.closed_by,new.opened_by),auth.jwt()->>'email',new.id);
 return new;
end $$;
revoke all on function retail_private.shift_cash_to_fund() from public,anon,authenticated;
drop trigger if exists retail_shift_cash_to_fund on public.retail_shifts;
create trigger retail_shift_cash_to_fund after update of closed_at on public.retail_shifts for each row execute function retail_private.shift_cash_to_fund();

-- Efectivo de turnos abiertos por sucursal. Solo administración: el arqueo sigue a ciegas para quien cobra.
create or replace function public.retail_open_shift_cash(p_store uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then return '[]'::jsonb; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('location',t.branch_id::text,'cash',t.cash,'shifts',t.shifts)),'[]'::jsonb) from (
  select r.branch_id,count(*) as shifts,sum(s.opening_cash
   +coalesce((select sum(x.cash_amount) from public.retail_sales x where x.shift_id=s.id),0)
   +coalesce((select sum(case when m.type='INGRESO' then m.amount else -m.amount end) from public.retail_movements m where m.shift_id=s.id),0)) as cash
  from public.retail_shifts s join public.retail_registers r on r.store_id=s.store_id and r.id=s.register_id
  where s.store_id=p_store and s.closed_at is null group by r.branch_id
 ) t);
end $$;
revoke all on function public.retail_open_shift_cash(uuid) from public,anon;
grant execute on function public.retail_open_shift_cash(uuid) to authenticated;
notify pgrst,'reload schema';
$retail_source_8b55ed736684a540$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610300005_shift_cash_into_branch_funds.sql','8b55ed736684a540c2625f954ea8800b79de3cd0669baadfecab91adfe138a7f','schema');
 end if;
end;

-- 59/84: 202610300006_editable_role_permissions.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610300006_editable_role_permissions.sql') then
  raise notice 'Aplicando 202610300006_editable_role_permissions.sql';
  execute replace($retail_source_f9353e99737cb1fa$
-- Lo habitual de cada rol, por comercio. Sin fila se usan los permisos de siempre.
create table if not exists public.retail_role_permissions (
 store_id uuid not null references public.retail_stores(id), role text not null check(role in ('cashier','supervisor')),
 permissions text[] not null check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai']::text[]),
 revision integer not null default 0, primary key(store_id,role)
);
alter table public.retail_role_permissions enable row level security;
drop policy if exists member_read on public.retail_role_permissions;
create policy member_read on public.retail_role_permissions for select to authenticated using(retail_private.role_for(store_id) is not null);
revoke all on public.retail_role_permissions from public,anon,authenticated;
grant select on public.retail_role_permissions to authenticated;

create or replace function retail_private.has_permission(p_store uuid,p_action text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select case when m.role in ('owner','admin') then true
 when m.profile_id is not null then p_action=any(p.permissions)
 else p_action=any(coalesce(r.permissions,case when m.role='supervisor'
 then array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales']
 else array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito'] end)) end
 from public.retail_members m left join public.retail_permission_profiles p on p.id=m.profile_id and p.store_id=m.store_id
 left join public.retail_role_permissions r on r.store_id=m.store_id and r.role=m.role
 where m.store_id=p_store and m.user_id=auth.uid()),false);
$$;

create or replace function public.retail_save_role_permissions(p_store uuid,p_role text,p_permissions text[],p_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare previous public.retail_role_permissions; normalized text[];
begin
 perform retail_private.require_permission(p_store,'manage_profiles');
 if p_role is null or p_role not in ('cashier','supervisor') or p_permissions is null then raise exception 'Revisá el rol y los permisos'; end if;
 select coalesce(array_agg(distinct action order by action),'{}'::text[]) into normalized from unnest(p_permissions) action;
 if not coalesce(retail_private.can_grant_permissions(p_store,normalized),false) then raise exception 'Solo podés conceder permisos que ya tenés' using errcode='42501'; end if;
 if retail_private.role_for(p_store) not in ('owner','admin') and exists(select 1 from public.retail_members where store_id=p_store and user_id=auth.uid() and role=p_role and profile_id is null) then
  raise exception 'No podés cambiar los permisos de tu propio rol' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('role-permissions:'||p_store::text||p_role,0));
 select * into previous from public.retail_role_permissions where store_id=p_store and role=p_role for update;
 if found then
  if previous.permissions @> normalized and previous.permissions <@ normalized then return; end if;
  if p_revision is null or previous.revision<>p_revision then raise exception 'El rol cambió en otro dispositivo. Actualizá la lista y revisá los cambios antes de guardar'; end if;
  update public.retail_role_permissions set permissions=normalized,revision=revision+1 where store_id=p_store and role=p_role;
 else
  insert into public.retail_role_permissions(store_id,role,permissions) values(p_store,p_role,normalized);
 end if;
end $$;
revoke all on function public.retail_save_role_permissions(uuid,text,text[],integer) from public,anon;
grant execute on function public.retail_save_role_permissions(uuid,text,text[],integer) to authenticated;
notify pgrst,'reload schema';
$retail_source_f9353e99737cb1fa$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610300006_editable_role_permissions.sql','f9353e99737cb1fa425d48bd5f2bde52f68be8dd243a828bdd278bf30f37846e','schema');
 end if;
end;

-- 60/84: 202610300007_expenses_and_month_result.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202610300007_expenses_and_month_result.sql') then
  raise notice 'Aplicando 202610300007_expenses_and_month_result.sql';
  execute replace($retail_source_1cc8488904046c20$
-- Gastos del negocio que no son mercadería. Solo administración: el resultado es información sensible.
create table if not exists public.retail_expenses (
 id uuid primary key, store_id uuid not null references public.retail_stores(id), branch_id uuid,
 spent_on date not null, category text not null check(category in ('alquiler','servicios','sueldos','impuestos','mantenimiento','otros')),
 description text not null check(length(btrim(description)) between 1 and 300),
 amount numeric(14,2) not null check(amount>0 and amount::text<>'NaN'), fixed boolean not null default false,
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 voided_at timestamptz, voided_by uuid references auth.users(id),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id)
);
create index if not exists retail_expense_month on public.retail_expenses(store_id,spent_on desc);
alter table public.retail_expenses enable row level security;
drop policy if exists manager_read on public.retail_expenses;
create policy manager_read on public.retail_expenses for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_expenses from public,anon,authenticated;
grant select on public.retail_expenses to authenticated;

create or replace function public.retail_save_expense(p_store uuid,p_id uuid,p_expense jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare previous public.retail_expenses; v_branch uuid:=nullif(p_expense->>'branch_id','')::uuid; v_date date:=(p_expense->>'spent_on')::date;
 v_category text:=p_expense->>'category'; v_description text:=btrim(p_expense->>'description'); v_amount numeric:=(p_expense->>'amount')::numeric; v_fixed boolean:=coalesce((p_expense->>'fixed')::boolean,false);
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede cargar gastos' using errcode='42501'; end if;
 if p_id is null or v_date is null or v_amount is null or v_amount<=0 or v_amount>999999999999.99 or round(v_amount,2)<>v_amount then raise exception 'Revisá la fecha y el importe'; end if;
 if v_description is null or length(v_description) not between 1 and 300 then raise exception 'Escribí en qué se gastó'; end if;
 if v_branch is not null and not exists(select 1 from public.retail_branches where store_id=p_store and id=v_branch) then raise exception 'La sucursal no pertenece a este comercio'; end if;
 perform pg_advisory_xact_lock(hashtextextended('expense:'||p_id::text,0));
 select * into previous from public.retail_expenses where id=p_id;
 if found then
  if previous.store_id<>p_store or previous.voided_at is not null then raise exception 'Este gasto ya no se puede editar. Actualizá la lista'; end if;
  update public.retail_expenses set branch_id=v_branch,spent_on=v_date,category=v_category,description=v_description,amount=v_amount,fixed=v_fixed where id=p_id;
 else
  insert into public.retail_expenses(id,store_id,branch_id,spent_on,category,description,amount,fixed,created_by,actor_email)
  values(p_id,p_store,v_branch,v_date,v_category,v_description,v_amount,v_fixed,auth.uid(),auth.jwt()->>'email');
 end if;
 return p_id;
end $$;

create or replace function public.retail_delete_expense(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede eliminar gastos' using errcode='42501'; end if;
 update public.retail_expenses set voided_at=now(),voided_by=auth.uid() where store_id=p_store and id=p_id and voided_at is null;
end $$;

-- Costo de lo vendido con el costo guardado en cada renglón del ticket, no el costo de hoy.
create or replace function public.retail_month_result(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires';
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 return (with sold as (
  select s.id,s.branch_id,s.total from public.retail_sales s
  where s.store_id=p_store and s.created_at>=(first_day::timestamp at time zone zone) and s.created_at<(next_day::timestamp at time zone zone)
 ), line as (
  select s.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty
  from sold s cross join lateral jsonb_array_elements(coalesce((select r.items from public.retail_sales r where r.id=s.id),'[]'::jsonb)) i(item)
 ), spent as (
  select e.branch_id,e.category,e.amount from public.retail_expenses e
  where e.store_id=p_store and e.voided_at is null and e.spent_on>=first_day and e.spent_on<next_day
 ), places as (
  select branch_id from sold union select branch_id from spent where branch_id is not null
 )
 select jsonb_build_object(
  'sales',coalesce((select sum(total) from sold),0),
  'tickets',(select count(*) from sold),
  'cost',coalesce((select sum(unit_cost*qty) from line),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null or unit_cost<=0),
  'expenses',coalesce((select sum(amount) from spent),0),
  'shared_expenses',coalesce((select sum(amount) from spent where branch_id is null),0),
  'by_category',coalesce((select jsonb_agg(jsonb_build_object('category',c.category,'amount',c.amount) order by c.amount desc) from (select category,sum(amount) as amount from spent group by category) c),'[]'::jsonb),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sum(total) from sold x where x.branch_id=p.branch_id),0),
    'cost',coalesce((select sum(unit_cost*qty) from line l where l.branch_id=p.branch_id),0),
    'expenses',coalesce((select sum(amount) from spent e where e.branch_id=p.branch_id),0))) from places p),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_save_expense(uuid,uuid,jsonb) from public,anon;
revoke all on function public.retail_delete_expense(uuid,uuid) from public,anon;
revoke all on function public.retail_month_result(uuid,date) from public,anon;
grant execute on function public.retail_save_expense(uuid,uuid,jsonb) to authenticated;
grant execute on function public.retail_delete_expense(uuid,uuid) to authenticated;
grant execute on function public.retail_month_result(uuid,date) to authenticated;
notify pgrst,'reload schema';
$retail_source_1cc8488904046c20$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202610300007_expenses_and_month_result.sql','1cc8488904046c20951344260a91f485dc36962c059ed972063a91a0ce0e8a5d','schema');
 end if;
end;

-- 61/84: 202611020001_sale_returns.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020001_sale_returns.sql') then
  raise notice 'Aplicando 202611020001_sale_returns.sql';
  execute replace($retail_source_160c3ea5ca68498f$
-- Anulaciones y devoluciones de ventas. La venta original no se borra ni se reescribe:
-- cada devolución es un registro propio y la venta solo lleva el acumulado devuelto.

-- Nuevo permiso: los perfiles y roles existentes no lo reciben automáticamente.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales']::text[]);
alter table public.retail_role_permissions drop constraint retail_role_permissions_permissions_check;
alter table public.retail_role_permissions add constraint retail_role_permissions_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales']::text[]) action where retail_private.has_permission(p_store,action);
$$;

alter table public.retail_sales
 add column returned_total numeric(14,2) not null default 0,
 add column return_status text not null default 'none' check(return_status in ('none','partial','voided')),
 add constraint retail_sales_returned_total_valid check(returned_total>=0 and returned_total<=total);

create table public.retail_sale_returns (
 id uuid primary key, store_id uuid not null references public.retail_stores(id), sale_id uuid not null,
 kind text not null check(kind in ('void','partial')),
 -- Caja de la que salió el efectivo devuelto; sin efectivo no hace falta caja abierta.
 shift_id uuid, branch_id uuid not null, items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)>0),
 total numeric(14,2) not null check(total>0), cash_amount numeric(14,2) not null check(cash_amount>=0 and cash_amount<=total),
 payments jsonb not null check(jsonb_typeof(payments)='array'),
 reason text not null check(length(btrim(reason)) between 3 and 300),
 credit_note_required boolean not null default false,
 credit_note_reference text check(credit_note_reference is null or length(btrim(credit_note_reference)) between 1 and 120),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 foreign key(store_id,sale_id) references public.retail_sales(store_id,id),
 foreign key(store_id,shift_id) references public.retail_shifts(store_id,id),
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id)
);
create index retail_sale_returns_sale on public.retail_sale_returns(sale_id);
create index retail_sale_returns_shift on public.retail_sale_returns(shift_id) where shift_id is not null;
create index retail_sale_returns_month on public.retail_sale_returns(store_id,created_at);
alter table public.retail_sale_returns enable row level security;
-- Visible para quien puede ver la venta: la política de ventas se aplica dentro de la subconsulta.
create policy sale_visible_read on public.retail_sale_returns for select to authenticated
 using(exists(select 1 from public.retail_sales s where s.id=sale_id and s.store_id=retail_sale_returns.store_id));
revoke all on public.retail_sale_returns from public,anon,authenticated;
grant select on public.retail_sale_returns to authenticated;

-- Un único cálculo de efectivo esperado: apertura + efectivo cobrado + ingresos − retiros − efectivo devuelto.
create function retail_private.shift_expected_cash(p_shift uuid) returns numeric language sql stable security definer set search_path='' as $$
 select s.opening_cash
  + coalesce((select sum(x.cash_amount) from public.retail_sales x where x.shift_id=s.id),0)
  + coalesce((select sum(case when m.type='INGRESO' then m.amount else -m.amount end) from public.retail_movements m where m.shift_id=s.id),0)
  - coalesce((select sum(r.cash_amount) from public.retail_sale_returns r where r.shift_id=s.id),0)
 from public.retail_shifts s where s.id=p_shift;
$$;
revoke all on function retail_private.shift_expected_cash(uuid) from public,anon,authenticated;

create or replace function public.retail_close_shift(p_shift uuid,p_counted numeric) returns numeric language plpgsql security definer set search_path = '' as $$
declare s public.retail_shifts; v_expected numeric;
begin
 s := retail_private.check_shift(p_shift);
 if p_counted is null or p_counted < 0 or p_counted::text in ('NaN','Infinity','-Infinity') then raise exception 'Conteo inválido'; end if;
 v_expected:=retail_private.shift_expected_cash(s.id);
 update public.retail_shifts set closed_at=now(),closed_by=auth.uid(),counted_cash=p_counted,expected_cash=v_expected where id=s.id;
 return v_expected;
end $$;

create or replace function public.retail_shift_balance(p_shift uuid) returns numeric language plpgsql stable security definer set search_path='' as $$
declare s public.retail_shifts;
begin
 select * into s from public.retail_shifts where id=p_shift;
 if s.id is null or retail_private.role_for(s.store_id) is null or
  (s.opened_by<>auth.uid() and retail_private.role_for(s.store_id) not in ('owner','admin')) then
  raise exception 'Sin acceso a este turno';
 end if;
 return retail_private.shift_expected_cash(s.id);
end $$;

create or replace function public.retail_open_shift_cash(p_store uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then return '[]'::jsonb; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('location',t.branch_id::text,'cash',t.cash,'shifts',t.shifts)),'[]'::jsonb) from (
  select r.branch_id,count(*) as shifts,sum(retail_private.shift_expected_cash(s.id)) as cash
  from public.retail_shifts s join public.retail_registers r on r.store_id=s.store_id and r.id=s.register_id
  where s.store_id=p_store and s.closed_at is null group by r.branch_id
 ) t);
end $$;

-- p_items null anula lo que queda de la venta; si no, [{index,qty}] sobre los renglones del ticket.
-- p_refund [{method,amount}] es obligatorio en devoluciones parciales; al anular se repite el cobro original.
create function public.retail_return_sale(p_store uuid,p_sale uuid,p_request uuid,p_items jsonb,p_reason text,p_refund jsonb default null,p_shift uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_existing public.retail_sale_returns; v_role text; v_reason text:=btrim(coalesce(p_reason,''));
 v_line jsonb; v_req jsonb; v_index integer; v_qty integer; v_left integer; v_lines jsonb:='[]'::jsonb; v_amount numeric:=0;
 v_kind text; v_parts jsonb; v_cash numeric:=0; v_sum numeric; v_methods integer; v_shift public.retail_shifts; v_credit boolean:=false;
 v_billing_status text; v_previous text:=current_setting('retail.inventory_location',true); v_stock record;
begin
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 if p_request is null or p_sale is null or p_store is null then raise exception 'Datos de la devolución incompletos'; end if;
 perform pg_advisory_xact_lock(hashtextextended('sale-return:'||p_request::text,0));
 select * into v_existing from public.retail_sale_returns where id=p_request;
 if found then
  if v_existing.sale_id<>p_sale or v_existing.created_by<>auth.uid() then raise exception 'El identificador ya corresponde a otra devolución'; end if;
  select * into v_sale from public.retail_sales where id=p_sale;
  return jsonb_build_object('id',v_existing.id,'returnedTotal',v_sale.returned_total,'returnStatus',v_sale.return_status,'total',v_existing.total,'creditNoteRequired',v_existing.credit_note_required);
 end if;
 v_role:=retail_private.role_for(p_store);
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales')) then
  raise exception 'Tu perfil no permite anular ni devolver ventas. Pedile a administración que revise tus permisos' using errcode='42501';
 end if;
 if length(v_reason) not between 3 and 300 then raise exception 'Escribí el motivo de la devolución'; end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no disponible. Si se cobró sin conexión, sincronizá antes de devolverla'; end if;
 if v_role not in ('owner','admin') and v_sale.created_by<>auth.uid() and not retail_private.can_review_sales(p_store,v_sale.shift_id) then
  raise exception 'Sin acceso a esta venta' using errcode='42501';
 end if;
 if v_sale.return_status='voided' then raise exception 'Esta venta ya está anulada'; end if;
 v_billing_status:=v_sale.billing_status;
 if v_billing_status in ('pending','retry','error') and p_items is not null then
  raise exception 'La factura de esta venta está pendiente. Facturala antes de devolver una parte, o anulá la venta completa';
 end if;
 v_credit:=v_billing_status='authorized';

 if p_items is null then
  v_kind:='void';
  for v_line, v_index in select value,(ordinality-1)::integer from jsonb_array_elements(v_sale.items) with ordinality loop
   v_left:=(v_line->>'qty')::integer-coalesce((select sum((x->>'qty')::integer) from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.items) x
    where r.sale_id=p_sale and (x->>'index')::integer=v_index),0);
   if v_left>0 then v_lines:=v_lines||jsonb_build_array(v_line||jsonb_build_object('index',v_index,'qty',v_left,'subtotal',round(v_left*(v_line->>'unitPrice')::numeric,2))); end if;
  end loop;
 else
  v_kind:='partial';
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 300 then raise exception 'Elegí qué se devuelve'; end if;
  if (select count(distinct x->>'index') from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'Cada renglón se devuelve una sola vez'; end if;
  for v_req in select value from jsonb_array_elements(p_items) loop
   if coalesce(v_req->>'index','')!~'^[0-9]{1,3}$' or coalesce(v_req->>'qty','')!~'^[1-9][0-9]{0,5}$' then raise exception 'Cantidad a devolver inválida'; end if;
   v_index:=(v_req->>'index')::integer; v_qty:=(v_req->>'qty')::integer;
   v_line:=v_sale.items->v_index;
   if v_line is null then raise exception 'Ese renglón no está en la venta'; end if;
   v_left:=(v_line->>'qty')::integer-coalesce((select sum((x->>'qty')::integer) from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.items) x
    where r.sale_id=p_sale and (x->>'index')::integer=v_index),0);
   if v_qty>v_left then raise exception 'No podés devolver más de lo que queda de %: % unidades',v_line->>'name',v_left; end if;
   v_lines:=v_lines||jsonb_build_array(v_line||jsonb_build_object('index',v_index,'qty',v_qty,'subtotal',round(v_qty*(v_line->>'unitPrice')::numeric,2)));
  end loop;
 end if;
 if jsonb_array_length(v_lines)=0 then raise exception 'No queda nada por devolver en esta venta'; end if;
 select sum((x->>'subtotal')::numeric) into v_amount from jsonb_array_elements(v_lines) x;
 -- Lo que falta devolver se toma del total para no acumular diferencias de redondeo.
 if v_amount>v_sale.total-v_sale.returned_total or (v_kind='void') then v_amount:=v_sale.total-v_sale.returned_total; end if;
 if v_amount<=0 then raise exception 'No queda nada por devolver en esta venta'; end if;

 if p_refund is null then
  if v_kind='partial' or v_sale.returned_total>0 then raise exception 'Elegí cómo se devuelve la plata'; end if;
  v_parts:=v_sale.payments;
 else
  v_parts:=p_refund;
 end if;
 if jsonb_typeof(v_parts) is distinct from 'array' or jsonb_array_length(v_parts) not between 1 and 5 then raise exception 'Medio de devolución inválido'; end if;
 if exists(select 1 from jsonb_array_elements(v_parts) x where coalesce(x->>'method','') not in ('Efectivo','QR','Transferencia','Debito','Credito')
  or coalesce(x->>'amount','')!~'^[0-9]+(\.[0-9]{1,2})?$' or (x->>'amount')::numeric<=0) then raise exception 'Medio de devolución inválido'; end if;
 select sum((x->>'amount')::numeric),coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Efectivo'),0),count(distinct x->>'method')
  into v_sum,v_cash,v_methods from jsonb_array_elements(v_parts) x;
 if v_sum<>v_amount or v_methods<>jsonb_array_length(v_parts) then raise exception 'Lo que se devuelve debe sumar %',v_amount; end if;

 if v_cash>0 then
  if p_shift is null then raise exception 'Abrí tu caja para devolver efectivo. Si devolvés por otro medio no hace falta'; end if;
  v_shift:=retail_private.check_shift(p_shift);
  if v_shift.store_id<>p_store then raise exception 'La caja no pertenece a este comercio'; end if;
  if retail_private.shift_expected_cash(v_shift.id)<v_cash then raise exception 'No hay suficiente efectivo en la caja para devolver'; end if;
 end if;

 -- El stock vuelve a la sucursal de la venta, con la composición guardada en el ticket.
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 perform set_config('retail.inventory_location',v_sale.branch_id::text,true);
 for v_stock in
  with units as (
   select (l->>'productId')::uuid as product_id,(l->>'qty')::bigint as qty from jsonb_array_elements(v_lines) l
    where nullif(l->>'productId','') is not null and jsonb_array_length(coalesce(l->'stockComponents','[]'::jsonb))=0
   union all
   select (c->>'product_id')::uuid,(l->>'qty')::bigint*(c->>'quantity')::bigint from jsonb_array_elements(v_lines) l
    cross join lateral jsonb_array_elements(l->'stockComponents') c
    where nullif(l->>'productId','') is not null and jsonb_array_length(coalesce(l->'stockComponents','[]'::jsonb))>0
  )
  select u.product_id,sum(u.qty) as qty from units u join public.retail_products p on p.id=u.product_id and p.store_id=p_store
  group by u.product_id order by u.product_id
 loop
  perform 1 from public.retail_products where id=v_stock.product_id for update;
  update public.retail_products set stock=stock+v_stock.qty::integer where id=v_stock.product_id and store_id=p_store;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_request,v_stock.product_id,p_store,auth.uid(),v_stock.qty::integer,null,now());
 end loop;
 perform set_config('retail.inventory_location',coalesce(v_previous,''),true);

 insert into public.retail_sale_returns(id,store_id,sale_id,kind,shift_id,branch_id,items,total,cash_amount,payments,reason,credit_note_required,created_by,actor_email)
 values(p_request,p_store,p_sale,v_kind,case when v_cash>0 then v_shift.id end,v_sale.branch_id,v_lines,v_amount,v_cash,v_parts,v_reason,v_credit,auth.uid(),auth.jwt()->>'email');
 update public.retail_sales set returned_total=returned_total+v_amount,
  return_status=case when returned_total+v_amount>=total then 'voided' else 'partial' end,
  -- Una anulación con la factura todavía pendiente la cancela: no debe emitirse después.
  billing_status=case when v_kind='void' and billing_status in ('pending','retry','error') then 'none' else billing_status end,
  billing_error=case when v_kind='void' and billing_status in ('pending','retry','error') then 'Venta anulada antes de facturar' else billing_error end
 where id=p_sale returning * into v_sale;
 return jsonb_build_object('id',p_request,'returnedTotal',v_sale.returned_total,'returnStatus',v_sale.return_status,'total',v_amount,'creditNoteRequired',v_credit);
end $$;
revoke all on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) from public,anon;
grant execute on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) to authenticated;

-- Si una factura en curso se autoriza después de anular, la devolución queda pidiendo nota de crédito.
create function retail_private.flag_credit_note_after_return() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.billing_status='authorized' and old.billing_status is distinct from 'authorized' and new.return_status<>'none' then
  update public.retail_sale_returns set credit_note_required=true where sale_id=new.id;
 end if;
 return new;
end $$;
revoke all on function retail_private.flag_credit_note_after_return() from public,anon,authenticated;
create trigger retail_flag_credit_note_after_return after update of billing_status on public.retail_sales
 for each row execute function retail_private.flag_credit_note_after_return();

-- La nota de crédito se emite por ahora fuera de la app; acá se registra su número.
create function public.retail_attach_credit_note(p_store uuid,p_return uuid,p_reference text) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text:=retail_private.role_for(p_store);
begin
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales') and not retail_private.has_permission(p_store,'attach_invoice')) then
  raise exception 'Tu perfil no permite cargar notas de crédito' using errcode='42501';
 end if;
 if p_reference is null or length(btrim(p_reference)) not between 1 and 120 then raise exception 'Escribí el número de la nota de crédito'; end if;
 update public.retail_sale_returns set credit_note_reference=btrim(p_reference)
  where id=p_return and store_id=p_store and credit_note_required
   and exists(select 1 from public.retail_sales s where s.id=sale_id and (v_role in ('owner','admin') or s.created_by=auth.uid() or retail_private.can_review_sales(p_store,s.shift_id)));
 if not found then raise exception 'Devolución no disponible'; end if;
end $$;
revoke all on function public.retail_attach_credit_note(uuid,uuid,text) from public,anon;
grant execute on function public.retail_attach_credit_note(uuid,uuid,text) to authenticated;

-- Ganancias: las devoluciones restan en el mes en que se hicieron, con el costo guardado en el ticket.
create or replace function public.retail_month_result(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires';
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 return (with sold as (
  select s.id,s.branch_id,s.total from public.retail_sales s
  where s.store_id=p_store and s.created_at>=(first_day::timestamp at time zone zone) and s.created_at<(next_day::timestamp at time zone zone)
 ), line as (
  select s.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty
  from sold s cross join lateral jsonb_array_elements(coalesce((select r.items from public.retail_sales r where r.id=s.id),'[]'::jsonb)) i(item)
 ), returned as (
  select r.branch_id,r.total,r.items from public.retail_sale_returns r
  where r.store_id=p_store and r.created_at>=(first_day::timestamp at time zone zone) and r.created_at<(next_day::timestamp at time zone zone)
 ), returned_line as (
  select r.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty from returned r cross join lateral jsonb_array_elements(r.items) i(item)
 ), spent as (
  select e.branch_id,e.category,e.amount from public.retail_expenses e
  where e.store_id=p_store and e.voided_at is null and e.spent_on>=first_day and e.spent_on<next_day
 ), places as (
  select branch_id from sold union select branch_id from returned union select branch_id from spent where branch_id is not null
 )
 select jsonb_build_object(
  'sales',coalesce((select sum(total) from sold),0)-coalesce((select sum(total) from returned),0),
  'returns',coalesce((select sum(total) from returned),0),
  'tickets',(select count(*) from sold),
  'cost',coalesce((select sum(unit_cost*qty) from line),0)-coalesce((select sum(unit_cost*qty) from returned_line),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null or unit_cost<=0),
  'expenses',coalesce((select sum(amount) from spent),0),
  'shared_expenses',coalesce((select sum(amount) from spent where branch_id is null),0),
  'by_category',coalesce((select jsonb_agg(jsonb_build_object('category',c.category,'amount',c.amount) order by c.amount desc) from (select category,sum(amount) as amount from spent group by category) c),'[]'::jsonb),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sum(total) from sold x where x.branch_id=p.branch_id),0)-coalesce((select sum(total) from returned x where x.branch_id=p.branch_id),0),
    'cost',coalesce((select sum(unit_cost*qty) from line l where l.branch_id=p.branch_id),0)-coalesce((select sum(unit_cost*qty) from returned_line l where l.branch_id=p.branch_id),0),
    'expenses',coalesce((select sum(amount) from spent e where e.branch_id=p.branch_id),0))) from places p),'[]'::jsonb)
 ));
end $$;

notify pgrst,'reload schema';
$retail_source_160c3ea5ca68498f$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020001_sale_returns.sql','160c3ea5ca68498ff127b1cd7d93a88090b36af3809b1a59c507ad9233e6f321','schema');
 end if;
end;

-- 62/84: 202611020002_stock_counts.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020002_stock_counts.sql') then
  raise notice 'Aplicando 202611020002_stock_counts.sql';
  execute replace($retail_source_9daed2281b904f3b$
-- Conteo físico por sucursal o depósito. Cada renglón guarda cuánto decía el sistema al cargarse lo contado.
-- Al confirmar se aplica solo esa diferencia sobre el stock actual: lo vendido o movido después del
-- conteo baja el sistema y la estantería por igual, así que no genera diferencias falsas.

create table public.retail_stock_counts (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 location text not null check(location='depot' or location ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
 category_id uuid, status text not null default 'open' check(status in ('open','confirmed','cancelled')),
 notes text check(notes is null or length(notes)<=1000),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 closed_by uuid references auth.users(id), closed_email text, closed_at timestamptz,
 check((status='open')=(closed_at is null)),
 foreign key(store_id,category_id) references public.retail_categories(store_id,id)
);
-- Un único conteo abierto por ubicación: dos conteos simultáneos ajustarían dos veces lo mismo.
create unique index retail_stock_counts_one_open on public.retail_stock_counts(store_id,location) where status='open';
create index retail_stock_counts_history on public.retail_stock_counts(store_id,created_at desc);

create table public.retail_stock_count_lines (
 count_id uuid not null references public.retail_stock_counts(id), store_id uuid not null, product_id uuid not null,
 counted integer not null check(counted between 0 and 2147483647), expected integer not null,
 reason text check(reason in ('rotura','vencido','robo','error_carga','otro')),
 note text check(note is null or length(note)<=300),
 counted_by uuid not null references auth.users(id), counted_email text, counted_at timestamptz not null default now(),
 adjustment integer, unit_cost numeric(14,2),
 primary key(count_id,product_id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);
create index retail_stock_count_lines_product on public.retail_stock_count_lines(store_id,product_id);

alter table public.retail_stock_counts enable row level security;
alter table public.retail_stock_count_lines enable row level security;
create function retail_private.can_count_stock(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false)
  or retail_private.has_permission(p_store,'manage_products') or retail_private.has_permission(p_store,'replenish_stock');
$$;
revoke all on function retail_private.can_count_stock(uuid) from public,anon;
grant execute on function retail_private.can_count_stock(uuid) to authenticated;
create policy counters_read on public.retail_stock_counts for select to authenticated using(retail_private.can_count_stock(store_id));
create policy counters_read on public.retail_stock_count_lines for select to authenticated using(retail_private.can_count_stock(store_id));
revoke all on public.retail_stock_counts,public.retail_stock_count_lines from public,anon,authenticated;
grant select on public.retail_stock_counts,public.retail_stock_count_lines to authenticated;

-- Lo que el sistema tiene hoy en una ubicación. Sin inventario por sucursal, el salón es el total menos el depósito.
create function retail_private.location_quantity(p_store uuid,p_product uuid,p_location text) returns integer
language sql stable security definer set search_path='' as $$
 select case
  when p_location='depot' then coalesce((select d.quantity from public.retail_depot_balances d where d.store_id=p_store and d.product_id=p_product),0)
  when s.branch_inventory_enabled then coalesce((select b.quantity from public.retail_branch_stock b where b.store_id=p_store and b.product_id=p_product and b.branch_id::text=p_location),0)
  else p.stock-coalesce((select d.quantity from public.retail_depot_balances d where d.store_id=p_store and d.product_id=p_product),0) end
 from public.retail_stores s join public.retail_products p on p.store_id=s.id and p.id=p_product where s.id=p_store;
$$;
revoke all on function retail_private.location_quantity(uuid,uuid,text) from public,anon,authenticated;

create function public.retail_start_stock_count(p_store uuid,p_id uuid,p_location text,p_category uuid default null,p_notes text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_stock_counts; v_store public.retail_stores;
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 if p_id is null or p_location is null then raise exception 'Elegí dónde vas a contar'; end if;
 perform pg_advisory_xact_lock(hashtextextended('stock-count:'||p_id::text,0));
 select * into v_existing from public.retail_stock_counts where id=p_id;
 if found then
  if v_existing.store_id<>p_store or v_existing.location<>p_location then raise exception 'El identificador ya corresponde a otro conteo'; end if;
  return p_id;
 end if;
 select * into v_store from public.retail_stores where id=p_store;
 if p_location='depot' then
  if not v_store.depot_enabled then raise exception 'Este comercio no usa depósito'; end if;
 elsif not exists(select 1 from public.retail_branches where store_id=p_store and id::text=p_location) then
  raise exception 'Elegí una sucursal de este comercio';
 end if;
 if p_category is not null and not exists(select 1 from public.retail_categories where store_id=p_store and id=p_category) then raise exception 'Elegí una categoría de este comercio'; end if;
 if exists(select 1 from public.retail_stock_counts where store_id=p_store and location=p_location and status='open') then
  raise exception 'Ya hay un conteo abierto en este lugar. Seguilo o cancelalo antes de empezar otro';
 end if;
 insert into public.retail_stock_counts(id,store_id,location,category_id,notes,created_by,actor_email)
 values(p_id,p_store,p_location,p_category,nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),auth.jwt()->>'email');
 return p_id;
end $$;

-- p_lines: [{product_id, counted (null quita el renglón), reason, note}]. Repetir el mismo valor no cambia nada;
-- volver a contar un producto toma de nuevo lo que dice el sistema en ese momento.
create function public.retail_save_stock_count_lines(p_store uuid,p_count uuid,p_lines jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare v_count public.retail_stock_counts; v_line jsonb; v_product public.retail_products; v_counted integer; v_previous public.retail_stock_count_lines; v_saved integer:=0;
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 select * into v_count from public.retail_stock_counts where id=p_count and store_id=p_store for update;
 if not found then raise exception 'Conteo no disponible'; end if;
 if v_count.status<>'open' then raise exception 'Este conteo ya está cerrado'; end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 2000 then raise exception 'No hay renglones para guardar'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  select * into v_product from public.retail_products where id=nullif(v_line->>'product_id','')::uuid and store_id=p_store;
  if not found or not v_product.active then raise exception 'Producto no disponible en este comercio'; end if;
  if jsonb_array_length(v_product.stock_components)>0 then raise exception '% no tiene stock propio: contá sus componentes',v_product.name; end if;
  if v_count.category_id is not null and v_product.category_id<>v_count.category_id then raise exception '% no es de la categoría de este conteo',v_product.name; end if;
  if v_line->>'reason' is not null and v_line->>'reason' not in ('rotura','vencido','robo','error_carga','otro') then raise exception 'Motivo inválido'; end if;
  if v_line->'counted' is null or jsonb_typeof(v_line->'counted')='null' then
   delete from public.retail_stock_count_lines where count_id=p_count and product_id=v_product.id;
   continue;
  end if;
  if coalesce(v_line->>'counted','')!~'^[0-9]{1,9}$' then raise exception 'Cantidad contada inválida para %',v_product.name; end if;
  v_counted:=(v_line->>'counted')::integer;
  select * into v_previous from public.retail_stock_count_lines where count_id=p_count and product_id=v_product.id;
  if found and v_previous.counted=v_counted then
   update public.retail_stock_count_lines set reason=v_line->>'reason',note=nullif(btrim(coalesce(v_line->>'note','')),'') where count_id=p_count and product_id=v_product.id;
  else
   insert into public.retail_stock_count_lines(count_id,store_id,product_id,counted,expected,reason,note,counted_by,counted_email)
   values(p_count,p_store,v_product.id,v_counted,retail_private.location_quantity(p_store,v_product.id,v_count.location),v_line->>'reason',
    nullif(btrim(coalesce(v_line->>'note','')),''),auth.uid(),auth.jwt()->>'email')
   on conflict(count_id,product_id) do update set counted=excluded.counted,expected=excluded.expected,reason=excluded.reason,note=excluded.note,
    counted_by=excluded.counted_by,counted_email=excluded.counted_email,counted_at=now();
  end if;
  v_saved:=v_saved+1;
 end loop;
 return v_saved;
end $$;

-- Confirmar aplica los ajustes y cierra el conteo. Cada diferencia necesita motivo.
create function public.retail_confirm_stock_count(p_store uuid,p_count uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_count public.retail_stock_counts; v_line public.retail_stock_count_lines; v_product public.retail_products; v_diff integer;
 v_current integer; v_previous text:=current_setting('retail.inventory_location',true); v_branch_mode boolean; v_missing text;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') and not retail_private.has_permission(p_store,'manage_products') then
  raise exception 'Solo quien puede editar productos confirma los ajustes del conteo' using errcode='42501';
 end if;
 perform pg_advisory_xact_lock(hashtextextended('retail-composition:'||p_store::text,0));
 select * into v_count from public.retail_stock_counts where id=p_count and store_id=p_store for update;
 if not found then raise exception 'Conteo no disponible'; end if;
 if v_count.status='confirmed' then
  return jsonb_build_object('id',p_count,'status','confirmed','lines',(select count(*) from public.retail_stock_count_lines where count_id=p_count and adjustment<>0));
 end if;
 if v_count.status<>'open' then raise exception 'Este conteo fue cancelado'; end if;
 if not exists(select 1 from public.retail_stock_count_lines where count_id=p_count) then raise exception 'Todavía no contaste ningún producto'; end if;
 select string_agg(p.name,', ' order by p.name) into v_missing from public.retail_stock_count_lines l join public.retail_products p on p.id=l.product_id
  where l.count_id=p_count and l.counted<>l.expected and l.reason is null;
 if v_missing is not null then raise exception 'Elegí el motivo de cada diferencia: %',left(v_missing,300); end if;
 select branch_inventory_enabled into v_branch_mode from public.retail_stores where id=p_store for share;
 for v_line in select * from public.retail_stock_count_lines where count_id=p_count order by product_id for update loop
  select * into v_product from public.retail_products where id=v_line.product_id and store_id=p_store for update;
  v_diff:=v_line.counted-v_line.expected;
  update public.retail_stock_count_lines set adjustment=v_diff,unit_cost=nullif(v_product.cost,0) where count_id=p_count and product_id=v_line.product_id;
  continue when v_diff=0;
  v_current:=retail_private.location_quantity(p_store,v_product.id,v_count.location);
  if v_current+v_diff<0 then
   raise exception 'No se puede ajustar %: el sistema tiene % y el ajuste es %. Volvé a contarlo',v_product.name,v_current,v_diff;
  end if;
  if v_count.location='depot' then
   perform set_config('retail.inventory_location','depot',true);
   if v_diff<0 then update public.retail_depot_balances set quantity=quantity+v_diff where store_id=p_store and product_id=v_product.id; end if;
   update public.retail_products set stock=stock+v_diff where id=v_product.id;
   if v_diff>0 then
    insert into public.retail_depot_balances(product_id,store_id,quantity) values(v_product.id,p_store,v_diff)
    on conflict(product_id) do update set quantity=public.retail_depot_balances.quantity+excluded.quantity;
   end if;
  else
   perform set_config('retail.inventory_location',case when v_branch_mode then v_count.location else '' end,true);
   update public.retail_products set stock=stock+v_diff where id=v_product.id;
  end if;
  insert into public.retail_stock_movements(operation_id,product_id,store_id,user_id,delta,cost,occurred_at)
  values(p_count,v_product.id,p_store,auth.uid(),v_diff,nullif(v_product.cost,0),now());
 end loop;
 perform set_config('retail.inventory_location',coalesce(v_previous,''),true);
 update public.retail_stock_counts set status='confirmed',closed_by=auth.uid(),closed_email=auth.jwt()->>'email',closed_at=now() where id=p_count;
 return jsonb_build_object('id',p_count,'status','confirmed','lines',(select count(*) from public.retail_stock_count_lines where count_id=p_count and adjustment<>0));
end $$;

create function public.retail_cancel_stock_count(p_store uuid,p_count uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 update public.retail_stock_counts set status='cancelled',closed_by=auth.uid(),closed_email=auth.jwt()->>'email',closed_at=now()
  where id=p_count and store_id=p_store and status='open';
 if not found and not exists(select 1 from public.retail_stock_counts where id=p_count and store_id=p_store and status='cancelled') then
  raise exception 'Este conteo ya está cerrado';
 end if;
end $$;

revoke all on function public.retail_start_stock_count(uuid,uuid,text,uuid,text),public.retail_save_stock_count_lines(uuid,uuid,jsonb),
 public.retail_confirm_stock_count(uuid,uuid),public.retail_cancel_stock_count(uuid,uuid) from public,anon;
grant execute on function public.retail_start_stock_count(uuid,uuid,text,uuid,text),public.retail_save_stock_count_lines(uuid,uuid,jsonb),
 public.retail_confirm_stock_count(uuid,uuid),public.retail_cancel_stock_count(uuid,uuid) to authenticated;

-- Pérdidas de conteos confirmados en el mes, valuadas al costo del momento de confirmar.
-- Los sobrantes se informan aparte y compensan; costo cero cuenta como desconocido.
create function public.retail_month_stock_losses(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires';
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 return (with line as (
  select l.reason,l.adjustment,l.unit_cost from public.retail_stock_count_lines l join public.retail_stock_counts c on c.id=l.count_id
  where c.store_id=p_store and c.status='confirmed' and l.adjustment<>0
   and c.closed_at>=(first_day::timestamp at time zone zone) and c.closed_at<(next_day::timestamp at time zone zone)
 ) select jsonb_build_object(
  'losses',coalesce((select sum(-adjustment*unit_cost) from line where adjustment<0),0),
  'surplus',coalesce((select sum(adjustment*unit_cost) from line where adjustment>0),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null),
  'by_reason',coalesce((select jsonb_agg(jsonb_build_object('reason',r.reason,'amount',r.amount,'units',r.units) order by r.amount desc)
   from (select reason,sum(-adjustment*coalesce(unit_cost,0)) as amount,sum(-adjustment) as units from line where adjustment<0 group by reason) r),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_month_stock_losses(uuid,date) from public,anon;
grant execute on function public.retail_month_stock_losses(uuid,date) to authenticated;

notify pgrst,'reload schema';
$retail_source_9daed2281b904f3b$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020002_stock_counts.sql','9daed2281b904f3b615feaa1219e2aefa68e12f2789ed8b359569634b9780932','schema');
 end if;
end;

-- 63/84: 202611020003_stock_count_sections.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020003_stock_count_sections.sql') then
  raise notice 'Aplicando 202611020003_stock_count_sections.sql';
  execute replace($retail_source_9f3258490d566b00$
-- Conteos por sección: todo, una categoría, una marca o ambas. Varias secciones del mismo lugar pueden estar
-- abiertas a la vez; un producto solo puede contarse en un conteo abierto por lugar, así no se ajusta dos veces.

alter table public.retail_stock_counts add column brand text check(brand is null or length(btrim(brand)) between 1 and 160);
drop index public.retail_stock_counts_one_open;
create unique index retail_stock_counts_one_open_section on public.retail_stock_counts(store_id,location,coalesce(category_id::text,''),coalesce(lower(btrim(brand)),''))
 where status='open';

drop function public.retail_start_stock_count(uuid,uuid,text,uuid,text);
create function public.retail_start_stock_count(p_store uuid,p_id uuid,p_location text,p_category uuid default null,p_notes text default null,p_brand text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_stock_counts; v_store public.retail_stores; v_brand text:=nullif(btrim(coalesce(p_brand,'')),'');
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 if p_id is null or p_location is null then raise exception 'Elegí dónde vas a contar'; end if;
 perform pg_advisory_xact_lock(hashtextextended('stock-count:'||p_id::text,0));
 select * into v_existing from public.retail_stock_counts where id=p_id;
 if found then
  if v_existing.store_id<>p_store or v_existing.location<>p_location then raise exception 'El identificador ya corresponde a otro conteo'; end if;
  return p_id;
 end if;
 select * into v_store from public.retail_stores where id=p_store;
 if p_location='depot' then
  if not v_store.depot_enabled then raise exception 'Este comercio no usa depósito'; end if;
 elsif not exists(select 1 from public.retail_branches where store_id=p_store and id::text=p_location) then
  raise exception 'Elegí una sucursal de este comercio';
 end if;
 if p_category is not null and not exists(select 1 from public.retail_categories where store_id=p_store and id=p_category) then raise exception 'Elegí una categoría de este comercio'; end if;
 if v_brand is not null and length(v_brand)>160 then raise exception 'Marca demasiado larga'; end if;
 if exists(select 1 from public.retail_stock_counts where store_id=p_store and location=p_location and status='open'
   and category_id is not distinct from p_category and lower(btrim(coalesce(brand,'')))=lower(coalesce(v_brand,''))) then
  raise exception 'Ya hay un conteo abierto de esta sección en este lugar. Seguilo o cancelalo antes de empezar otro';
 end if;
 insert into public.retail_stock_counts(id,store_id,location,category_id,brand,notes,created_by,actor_email)
 values(p_id,p_store,p_location,p_category,v_brand,nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),auth.jwt()->>'email');
 return p_id;
end $$;
revoke all on function public.retail_start_stock_count(uuid,uuid,text,uuid,text,text) from public,anon;
grant execute on function public.retail_start_stock_count(uuid,uuid,text,uuid,text,text) to authenticated;

create or replace function public.retail_save_stock_count_lines(p_store uuid,p_count uuid,p_lines jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare v_count public.retail_stock_counts; v_line jsonb; v_product public.retail_products; v_counted integer; v_previous public.retail_stock_count_lines; v_saved integer:=0;
begin
 if not retail_private.can_count_stock(p_store) then raise exception 'Tu perfil no permite contar stock' using errcode='42501'; end if;
 select * into v_count from public.retail_stock_counts where id=p_count and store_id=p_store for update;
 if not found then raise exception 'Conteo no disponible'; end if;
 if v_count.status<>'open' then raise exception 'Este conteo ya está cerrado'; end if;
 if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 2000 then raise exception 'No hay renglones para guardar'; end if;
 for v_line in select value from jsonb_array_elements(p_lines) loop
  select * into v_product from public.retail_products where id=nullif(v_line->>'product_id','')::uuid and store_id=p_store;
  if not found or not v_product.active then raise exception 'Producto no disponible en este comercio'; end if;
  if jsonb_array_length(v_product.stock_components)>0 then raise exception '% no tiene stock propio: contá sus componentes',v_product.name; end if;
  if v_count.category_id is not null and v_product.category_id<>v_count.category_id then raise exception '% no es de la categoría de este conteo',v_product.name; end if;
  if v_count.brand is not null and lower(btrim(coalesce(v_product.brand,'')))<>lower(btrim(v_count.brand)) then raise exception '% no es de la marca de este conteo',v_product.name; end if;
  if v_line->>'reason' is not null and v_line->>'reason' not in ('rotura','vencido','robo','error_carga','otro') then raise exception 'Motivo inválido'; end if;
  if v_line->'counted' is null or jsonb_typeof(v_line->'counted')='null' then
   delete from public.retail_stock_count_lines where count_id=p_count and product_id=v_product.id;
   continue;
  end if;
  if coalesce(v_line->>'counted','')!~'^[0-9]{1,9}$' then raise exception 'Cantidad contada inválida para %',v_product.name; end if;
  v_counted:=(v_line->>'counted')::integer;
  -- Dos secciones abiertas del mismo lugar no pueden contar el mismo producto.
  perform pg_advisory_xact_lock(hashtextextended('stock-count-product:'||p_store::text||v_count.location||v_product.id::text,0));
  if exists(select 1 from public.retail_stock_count_lines l join public.retail_stock_counts c on c.id=l.count_id
    where c.store_id=p_store and c.location=v_count.location and c.status='open' and c.id<>p_count and l.product_id=v_product.id) then
   raise exception '% ya se está contando en otro conteo abierto de este lugar',v_product.name;
  end if;
  select * into v_previous from public.retail_stock_count_lines where count_id=p_count and product_id=v_product.id;
  if found and v_previous.counted=v_counted then
   update public.retail_stock_count_lines set reason=v_line->>'reason',note=nullif(btrim(coalesce(v_line->>'note','')),'') where count_id=p_count and product_id=v_product.id;
  else
   insert into public.retail_stock_count_lines(count_id,store_id,product_id,counted,expected,reason,note,counted_by,counted_email)
   values(p_count,p_store,v_product.id,v_counted,retail_private.location_quantity(p_store,v_product.id,v_count.location),v_line->>'reason',
    nullif(btrim(coalesce(v_line->>'note','')),''),auth.uid(),auth.jwt()->>'email')
   on conflict(count_id,product_id) do update set counted=excluded.counted,expected=excluded.expected,reason=excluded.reason,note=excluded.note,
    counted_by=excluded.counted_by,counted_email=excluded.counted_email,counted_at=now();
  end if;
  v_saved:=v_saved+1;
 end loop;
 return v_saved;
end $$;

notify pgrst,'reload schema';
$retail_source_9f3258490d566b00$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020003_stock_count_sections.sql','9f3258490d566b004171326307b86f84a0b9a75ed73640157dbdb86ef5d2a513','schema');
 end if;
end;

-- 64/84: 202611020004_customer_accounts.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020004_customer_accounts.sql') then
  raise notice 'Aplicando 202611020004_customer_accounts.sql';
  execute replace($retail_source_d1eade0c0e42edbd$
-- Clientes y cuenta corriente. Una venta «Fiado» suma deuda al cliente y no suma efectivo a la caja;
-- el efectivo entra a la caja cuando se registra el cobro. Ganancias cuenta la venta cuando se hace.

-- Nuevo permiso: crear y editar clientes y fiar por encima del límite. No se asigna automáticamente.
alter table public.retail_permission_profiles drop constraint retail_permission_profiles_permissions_check;
alter table public.retail_permission_profiles add constraint retail_permission_profiles_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales','manage_customers']::text[]);
alter table public.retail_role_permissions drop constraint retail_role_permissions_permissions_check;
alter table public.retail_role_permissions add constraint retail_role_permissions_permissions_check check(permissions <@ array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales','manage_customers']::text[]);
create or replace function public.retail_permissions(p_store uuid) returns text[] language sql stable security invoker set search_path='' as $$
 select coalesce(array_agg(action order by action),'{}'::text[]) from unnest(array['sell','cash_income','cash_withdrawal','move_sale_ledger','submit_remito','view_sales','replenish_stock','edit_prices','manage_quick_products','manage_products','manage_compositions','delete_products','manage_price_lists','review_remitos','manage_transfers','manage_funds','manage_supplier_accounts','attach_invoice','manage_store','manage_locations','manage_categories','manage_ledgers','manage_staff','manage_profiles','use_ai','refund_sales','manage_customers']::text[]) action where retail_private.has_permission(p_store,action);
$$;

create function retail_private.can_manage_customers(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false) or retail_private.has_permission(p_store,'manage_customers');
$$;
-- Quien cobra necesita ver a quién le fía y cuánto debe.
create function retail_private.can_use_customers(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select retail_private.can_manage_customers(p_store) or retail_private.has_permission(p_store,'sell');
$$;
revoke all on function retail_private.can_manage_customers(uuid),retail_private.can_use_customers(uuid) from public,anon;
grant execute on function retail_private.can_manage_customers(uuid),retail_private.can_use_customers(uuid) to authenticated;

create table public.retail_customers (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 120),
 phone text check(phone is null or length(btrim(phone)) between 1 and 40),
 credit_limit numeric(14,2) check(credit_limit is null or (credit_limit>=0 and credit_limit::text<>'NaN')),
 active boolean not null default true,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(store_id,id)
);
create index retail_customers_name on public.retail_customers(store_id,lower(name));

create table public.retail_customer_movements (
 id uuid primary key, store_id uuid not null, customer_id uuid not null,
 kind text not null check(kind in ('sale','payment','return')),
 -- Positivo: el cliente debe más. Negativo: pagó o se le descontó una devolución.
 amount numeric(14,2) not null check(amount<>0 and amount::text<>'NaN'),
 method text check(method is null or method in ('Efectivo','QR','Transferencia','Debito','Credito')),
 sale_id uuid, return_id uuid, shift_id uuid, note text check(note is null or length(note)<=300),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 check((kind='payment')=(method is not null)), check(kind<>'payment' or amount<0), check(kind<>'sale' or amount>0),
 foreign key(store_id,customer_id) references public.retail_customers(store_id,id),
 foreign key(store_id,sale_id) references public.retail_sales(store_id,id),
 foreign key(store_id,shift_id) references public.retail_shifts(store_id,id)
);
create index retail_customer_movements_customer on public.retail_customer_movements(customer_id,created_at desc);
create index retail_customer_movements_shift on public.retail_customer_movements(shift_id) where shift_id is not null;

alter table public.retail_customers enable row level security;
alter table public.retail_customer_movements enable row level security;
create policy customer_users_read on public.retail_customers for select to authenticated using(retail_private.can_use_customers(store_id));
create policy customer_users_read on public.retail_customer_movements for select to authenticated using(retail_private.can_use_customers(store_id));
revoke all on public.retail_customers,public.retail_customer_movements from public,anon,authenticated;
grant select on public.retail_customers,public.retail_customer_movements to authenticated;

alter table public.retail_sales drop constraint if exists retail_sales_payment_method_check;
alter table public.retail_sales add constraint retail_sales_payment_method_check check(payment_method in ('Efectivo','QR','Transferencia','Mixto','Debito','Credito','Fiado'));
alter table public.retail_sales add column customer_id uuid, add column customer_name text,
 add constraint retail_sales_customer_fkey foreign key(store_id,customer_id) references public.retail_customers(store_id,id),
 add constraint retail_sales_credit_needs_customer check(payment_method<>'Fiado' or customer_id is not null);

create function retail_private.customer_balance(p_customer uuid) returns numeric language sql stable security definer set search_path='' as $$
 select coalesce(sum(amount),0) from public.retail_customer_movements where customer_id=p_customer;
$$;
revoke all on function retail_private.customer_balance(uuid) from public,anon,authenticated;

create function public.retail_save_customer(p_store uuid,p_id uuid,p_customer jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_name text:=btrim(coalesce(p_customer->>'name','')); v_phone text:=nullif(btrim(coalesce(p_customer->>'phone','')),'');
 v_limit numeric; v_active boolean:=coalesce((p_customer->>'active')::boolean,true);
begin
 if not retail_private.can_manage_customers(p_store) then raise exception 'Tu perfil no permite cargar ni editar clientes' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos del cliente incompletos'; end if;
 if length(v_name) not between 1 and 120 then raise exception 'Escribí el nombre del cliente'; end if;
 if v_phone is not null and length(v_phone)>40 then raise exception 'Teléfono demasiado largo'; end if;
 if nullif(p_customer->>'credit_limit','') is not null then
  if (p_customer->>'credit_limit')!~'^[0-9]{1,12}(\.[0-9]{1,2})?$' then raise exception 'Revisá el límite de deuda'; end if;
  v_limit:=(p_customer->>'credit_limit')::numeric;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('customer:'||p_id::text,0));
 if exists(select 1 from public.retail_customers where id=p_id and store_id<>p_store) then raise exception 'El identificador ya corresponde a otro comercio'; end if;
 insert into public.retail_customers(id,store_id,name,phone,credit_limit,active,created_by)
 values(p_id,p_store,v_name,v_phone,v_limit,v_active,auth.uid())
 on conflict(id) do update set name=excluded.name,phone=excluded.phone,credit_limit=excluded.credit_limit,active=excluded.active;
 return p_id;
end $$;

-- Clientes con saldo, para la pantalla y para Inicio.
create function public.retail_customer_balances(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_use_customers(p_store) then raise exception 'Tu perfil no permite ver clientes' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'phone',c.phone,'credit_limit',c.credit_limit,'active',c.active,
   'balance',coalesce(m.balance,0),'last_movement',m.last_at) order by coalesce(m.balance,0) desc,lower(c.name)),'[]'::jsonb)
  from public.retail_customers c
  left join (select customer_id,sum(amount) as balance,max(created_at) as last_at from public.retail_customer_movements where store_id=p_store group by customer_id) m on m.customer_id=c.id
  where c.store_id=p_store);
end $$;

-- Cobro total o parcial. El efectivo entra a la caja abierta de quien cobra; los otros medios no tocan caja.
create function public.retail_customer_payment(p_store uuid,p_customer uuid,p_request uuid,p_amount numeric,p_method text,p_shift uuid default null,p_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_customer public.retail_customers; v_existing public.retail_customer_movements; v_balance numeric; v_shift public.retail_shifts;
begin
 if not retail_private.can_use_customers(p_store) then raise exception 'Tu perfil no permite registrar cobros' using errcode='42501'; end if;
 if p_request is null or p_customer is null then raise exception 'Datos del cobro incompletos'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer-payment:'||p_request::text,0));
 select * into v_existing from public.retail_customer_movements where id=p_request;
 if found then
  if v_existing.customer_id<>p_customer or v_existing.created_by<>auth.uid() then raise exception 'El identificador ya corresponde a otro movimiento'; end if;
  return jsonb_build_object('id',p_request,'balance',retail_private.customer_balance(p_customer));
 end if;
 select * into v_customer from public.retail_customers where id=p_customer and store_id=p_store for update;
 if not found then raise exception 'Cliente no disponible'; end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Debito','Credito') then raise exception 'Elegí cómo te pagó'; end if;
 if p_amount is null or p_amount<=0 or round(p_amount,2)<>p_amount or p_amount::text='NaN' then raise exception 'Revisá el importe cobrado'; end if;
 v_balance:=retail_private.customer_balance(p_customer);
 if p_amount>v_balance then raise exception 'El cobro supera lo que debe el cliente (%)',v_balance; end if;
 if p_method='Efectivo' then
  if p_shift is null then raise exception 'Abrí tu caja para cobrar en efectivo, o elegí otro medio'; end if;
  v_shift:=retail_private.check_shift(p_shift);
  if v_shift.store_id<>p_store then raise exception 'La caja no pertenece a este comercio'; end if;
 end if;
 insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,method,shift_id,note,created_by,actor_email)
 values(p_request,p_store,p_customer,'payment',-p_amount,p_method,case when p_method='Efectivo' then v_shift.id end,
  nullif(btrim(coalesce(p_note,'')),''),auth.uid(),auth.jwt()->>'email');
 return jsonb_build_object('id',p_request,'balance',v_balance-p_amount);
end $$;

-- La caja suma el efectivo de los cobros de cuenta corriente hechos en ese turno.
create or replace function retail_private.shift_expected_cash(p_shift uuid) returns numeric language sql stable security definer set search_path='' as $$
 select s.opening_cash
  + coalesce((select sum(x.cash_amount) from public.retail_sales x where x.shift_id=s.id),0)
  + coalesce((select sum(case when m.type='INGRESO' then m.amount else -m.amount end) from public.retail_movements m where m.shift_id=s.id),0)
  - coalesce((select sum(r.cash_amount) from public.retail_sale_returns r where r.shift_id=s.id),0)
  - coalesce((select sum(c.amount) from public.retail_customer_movements c where c.shift_id=s.id and c.method='Efectivo'),0)
 from public.retail_shifts s where s.id=p_shift;
$$;

-- Fiado: se valida con el cobro existente como medio sin efectivo y, en la misma transacción,
-- se marca como Fiado, se controla el límite y se suma la deuda. Si algo falla, no queda venta ni stock movido.
alter function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) rename to retail_checkout_before_credit;
revoke all on function public.retail_checkout_before_credit(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb) from public,anon,authenticated;
create function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null,p_customer uuid default null,p_over_limit boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_store uuid; v_customer public.retail_customers; v_sale public.retail_sales; v_balance numeric; saved uuid;
begin
 if p_method is distinct from 'Fiado' then
  if p_customer is not null then raise exception 'El cliente se elige solo para ventas fiadas'; end if;
  return public.retail_checkout_before_credit(p_shift,p_request,p_method,p_paid,p_items,p_price_list,p_ledger,p_payments);
 end if;
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 if p_customer is null then raise exception 'Elegí a quién le fiás'; end if;
 select store_id into v_store from public.retail_shifts where id=p_shift;
 select * into v_customer from public.retail_customers where id=p_customer and store_id=v_store for update;
 if not found or not v_customer.active then raise exception 'Cliente no disponible'; end if;
 if not retail_private.can_use_customers(v_store) then raise exception 'Tu perfil no permite fiar' using errcode='42501'; end if;
 select * into v_sale from public.retail_sales where id=p_request;
 if found then
  if v_sale.customer_id is distinct from p_customer then raise exception 'La solicitud ya fue usada con otro cliente'; end if;
  return public.retail_checkout_before_credit(p_shift,p_request,'Transferencia',0,p_items,p_price_list,p_ledger,null);
 end if;
 saved:=public.retail_checkout_before_credit(p_shift,p_request,'Transferencia',0,p_items,p_price_list,p_ledger,null);
 select * into v_sale from public.retail_sales where id=saved for update;
 v_balance:=retail_private.customer_balance(p_customer);
 if v_customer.credit_limit is not null and v_balance+v_sale.total>v_customer.credit_limit then
  if not p_over_limit then
   raise exception 'Con esta venta % debería %, más que su límite de %',v_customer.name,v_balance+v_sale.total,v_customer.credit_limit;
  end if;
  if not retail_private.can_manage_customers(v_store) then
   raise exception 'Supera el límite de % y tu perfil no permite fiar por encima. Pedile a administración',v_customer.name using errcode='42501';
  end if;
 end if;
 update public.retail_sales set payment_method='Fiado',payments=jsonb_build_array(jsonb_build_object('method','Fiado','amount',total)),
  amount_paid=total,change=0,cash_amount=0,customer_id=p_customer,customer_name=v_customer.name where id=saved;
 insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,created_by,actor_email)
 values(saved,v_store,p_customer,'sale',v_sale.total,saved,auth.uid(),auth.jwt()->>'email');
 return saved;
end $$;
revoke all on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb,uuid,boolean) from public,anon;
grant execute on function public.retail_checkout(uuid,uuid,text,numeric,jsonb,uuid,uuid,jsonb,uuid,boolean) to authenticated;

-- Devolver una venta fiada descuenta de la cuenta del cliente en vez de entregar plata.
alter function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) rename to retail_return_sale_before_credit;
revoke all on function public.retail_return_sale_before_credit(uuid,uuid,uuid,jsonb,text,jsonb,uuid) from public,anon,authenticated;
create function public.retail_return_sale(p_store uuid,p_sale uuid,p_request uuid,p_items jsonb,p_reason text,p_refund jsonb default null,p_shift uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_parts jsonb:=p_refund; v_core jsonb; v_credit numeric; v_result jsonb;
begin
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store;
 if not found or v_sale.customer_id is null then
  if exists(select 1 from jsonb_array_elements(coalesce(p_refund,'[]'::jsonb)) x where x->>'method'='Fiado') then raise exception 'Solo una venta fiada se devuelve a cuenta del cliente'; end if;
  return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift);
 end if;
 -- Anular por primera vez repite el cobro original: todo a cuenta del cliente.
 if v_parts is null and p_items is null and v_sale.returned_total=0 then v_parts:=jsonb_build_array(jsonb_build_object('method','Fiado','amount',v_sale.total)); end if;
 if v_parts is null then return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift); end if;
 select coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Fiado'),0) into v_credit from jsonb_array_elements(v_parts) x;
 select coalesce(jsonb_agg(case when x->>'method'='Fiado' then jsonb_set(x,'{method}','"Transferencia"') else x end),'[]'::jsonb) into v_core from jsonb_array_elements(v_parts) x;
 v_result:=public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,v_core,p_shift);
 if v_credit>0 then
  update public.retail_sale_returns set payments=v_parts where id=p_request and payments is distinct from v_parts;
  insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,return_id,created_by,actor_email)
  values(p_request,p_store,v_sale.customer_id,'return',-v_credit,p_sale,p_request,auth.uid(),auth.jwt()->>'email') on conflict(id) do nothing;
 end if;
 return v_result;
end $$;
revoke all on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) from public,anon;
grant execute on function public.retail_return_sale(uuid,uuid,uuid,jsonb,text,jsonb,uuid) to authenticated;

revoke all on function public.retail_save_customer(uuid,uuid,jsonb),public.retail_customer_balances(uuid),
 public.retail_customer_payment(uuid,uuid,uuid,numeric,text,uuid,text) from public,anon;
grant execute on function public.retail_save_customer(uuid,uuid,jsonb),public.retail_customer_balances(uuid),
 public.retail_customer_payment(uuid,uuid,uuid,numeric,text,uuid,text) to authenticated;

notify pgrst,'reload schema';
$retail_source_d1eade0c0e42edbd$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020004_customer_accounts.sql','d1eade0c0e42edbd036e264de72c50ea6c9141c90d8a4841a9e1a56c90c0c21d','schema');
 end if;
end;

-- 65/84: 202611020005_customer_billing_and_credit.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020005_customer_billing_and_credit.sql') then
  raise notice 'Aplicando 202611020005_customer_billing_and_credit.sql';
  execute replace($retail_source_d88f8756a740b886$
-- Datos opcionales para facturarle al cliente y saldo a favor: un cobro puede superar la deuda
-- y lo que sobra queda a cuenta para una próxima compra con «Fiado».

alter table public.retail_customers
 add column business_name text check(business_name is null or length(btrim(business_name)) between 1 and 160),
 add column tax_id_type text check(tax_id_type is null or tax_id_type in ('CUIT','CUIL','DNI')),
 add column tax_id text check(tax_id is null or tax_id ~ '^[0-9]{7,11}$'),
 add column iva_condition text check(iva_condition is null or iva_condition in ('CF','RI','MO','EX')),
 add column address text check(address is null or length(btrim(address)) between 1 and 200),
 add column email text check(email is null or (length(email)<=254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
 add constraint retail_customers_tax_id_pair check((tax_id is null)=(tax_id_type is null)),
 add constraint retail_customers_tax_id_length check(tax_id is null or (tax_id_type='DNI' and length(tax_id) between 7 and 8) or (tax_id_type in ('CUIT','CUIL') and length(tax_id)=11));

create or replace function public.retail_save_customer(p_store uuid,p_id uuid,p_customer jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_name text:=btrim(coalesce(p_customer->>'name','')); v_phone text:=nullif(btrim(coalesce(p_customer->>'phone','')),'');
 v_limit numeric; v_active boolean:=coalesce((p_customer->>'active')::boolean,true);
 v_business text:=nullif(btrim(coalesce(p_customer->>'business_name','')),'');
 v_tax text:=nullif(regexp_replace(coalesce(p_customer->>'tax_id',''),'[^0-9]','','g'),'');
 v_tax_type text:=nullif(btrim(coalesce(p_customer->>'tax_id_type','')),'');
 v_iva text:=nullif(btrim(coalesce(p_customer->>'iva_condition','')),'');
 v_address text:=nullif(btrim(coalesce(p_customer->>'address','')),'');
 v_email text:=nullif(lower(btrim(coalesce(p_customer->>'email',''))),'');
begin
 if not retail_private.can_manage_customers(p_store) then raise exception 'Tu perfil no permite cargar ni editar clientes' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos del cliente incompletos'; end if;
 if length(v_name) not between 1 and 120 then raise exception 'Escribí el nombre del cliente'; end if;
 if v_phone is not null and length(v_phone)>40 then raise exception 'Teléfono demasiado largo'; end if;
 if nullif(p_customer->>'credit_limit','') is not null then
  if (p_customer->>'credit_limit')!~'^[0-9]{1,12}(\.[0-9]{1,2})?$' then raise exception 'Revisá el límite de deuda'; end if;
  v_limit:=(p_customer->>'credit_limit')::numeric;
 end if;
 if v_tax is null then v_tax_type:=null;
 else
  if v_tax_type is null then v_tax_type:=case when length(v_tax)=11 then 'CUIT' else 'DNI' end; end if;
  if v_tax_type not in ('CUIT','CUIL','DNI') or (v_tax_type='DNI' and length(v_tax) not between 7 and 8) or (v_tax_type<>'DNI' and length(v_tax)<>11) then
   raise exception 'Revisá el documento: el CUIT o CUIL lleva 11 números y el DNI 7 u 8';
  end if;
 end if;
 if v_iva is not null and v_iva not in ('CF','RI','MO','EX') then raise exception 'Revisá la condición frente al IVA'; end if;
 if v_business is not null and length(v_business)>160 then raise exception 'Razón social demasiado larga'; end if;
 if v_address is not null and length(v_address)>200 then raise exception 'Domicilio demasiado largo'; end if;
 if v_email is not null and (length(v_email)>254 or v_email!~'^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'Revisá el email'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer:'||p_id::text,0));
 if exists(select 1 from public.retail_customers where id=p_id and store_id<>p_store) then raise exception 'El identificador ya corresponde a otro comercio'; end if;
 insert into public.retail_customers(id,store_id,name,phone,credit_limit,active,business_name,tax_id_type,tax_id,iva_condition,address,email,created_by)
 values(p_id,p_store,v_name,v_phone,v_limit,v_active,v_business,v_tax_type,v_tax,v_iva,v_address,v_email,auth.uid())
 on conflict(id) do update set name=excluded.name,phone=excluded.phone,credit_limit=excluded.credit_limit,active=excluded.active,
  business_name=excluded.business_name,tax_id_type=excluded.tax_id_type,tax_id=excluded.tax_id,iva_condition=excluded.iva_condition,
  address=excluded.address,email=excluded.email;
 return p_id;
end $$;

create or replace function public.retail_customer_balances(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_use_customers(p_store) then raise exception 'Tu perfil no permite ver clientes' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'phone',c.phone,'credit_limit',c.credit_limit,'active',c.active,
   'business_name',c.business_name,'tax_id_type',c.tax_id_type,'tax_id',c.tax_id,'iva_condition',c.iva_condition,'address',c.address,'email',c.email,
   'balance',coalesce(m.balance,0),'last_movement',m.last_at) order by coalesce(m.balance,0) desc,lower(c.name)),'[]'::jsonb)
  from public.retail_customers c
  left join (select customer_id,sum(amount) as balance,max(created_at) as last_at from public.retail_customer_movements where store_id=p_store group by customer_id) m on m.customer_id=c.id
  where c.store_id=p_store);
end $$;

-- Un cobro puede superar la deuda: lo que sobra queda a favor del cliente.
create or replace function public.retail_customer_payment(p_store uuid,p_customer uuid,p_request uuid,p_amount numeric,p_method text,p_shift uuid default null,p_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_customer public.retail_customers; v_existing public.retail_customer_movements; v_balance numeric; v_shift public.retail_shifts;
begin
 if not retail_private.can_use_customers(p_store) then raise exception 'Tu perfil no permite registrar cobros' using errcode='42501'; end if;
 if p_request is null or p_customer is null then raise exception 'Datos del cobro incompletos'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer-payment:'||p_request::text,0));
 select * into v_existing from public.retail_customer_movements where id=p_request;
 if found then
  if v_existing.customer_id<>p_customer or v_existing.created_by<>auth.uid() then raise exception 'El identificador ya corresponde a otro movimiento'; end if;
  return jsonb_build_object('id',p_request,'balance',retail_private.customer_balance(p_customer));
 end if;
 select * into v_customer from public.retail_customers where id=p_customer and store_id=p_store for update;
 if not found then raise exception 'Cliente no disponible'; end if;
 if p_method is null or p_method not in ('Efectivo','QR','Transferencia','Debito','Credito') then raise exception 'Elegí cómo te pagó'; end if;
 if p_amount is null or p_amount<=0 or p_amount>999999999999.99 or round(p_amount,2)<>p_amount or p_amount::text='NaN' then raise exception 'Revisá el importe cobrado'; end if;
 v_balance:=retail_private.customer_balance(p_customer);
 if p_method='Efectivo' then
  if p_shift is null then raise exception 'Abrí tu caja para cobrar en efectivo, o elegí otro medio'; end if;
  v_shift:=retail_private.check_shift(p_shift);
  if v_shift.store_id<>p_store then raise exception 'La caja no pertenece a este comercio'; end if;
 end if;
 insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,method,shift_id,note,created_by,actor_email)
 values(p_request,p_store,p_customer,'payment',-p_amount,p_method,case when p_method='Efectivo' then v_shift.id end,
  nullif(btrim(coalesce(p_note,'')),''),auth.uid(),auth.jwt()->>'email');
 return jsonb_build_object('id',p_request,'balance',v_balance-p_amount);
end $$;

notify pgrst,'reload schema';
$retail_source_d88f8756a740b886$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020005_customer_billing_and_credit.sql','d88f8756a740b886117b430cc3360986acce8c8a31f567eb20124b2ed36922df','schema');
 end if;
end;

-- 66/84: 202611020006_partial_credit.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020006_partial_credit.sql') then
  raise notice 'Aplicando 202611020006_partial_credit.sql';
  execute replace($retail_source_c4cbb30b0390a791$
-- Fiado parcial: un pago Mixto puede llevar una parte «Fiado», por ejemplo $500 en efectivo y el resto fiado.
-- En una sola transacción el efectivo queda en la venta (y en la caja) y solo la parte fiada va a la cuenta del cliente.

create or replace function public.retail_checkout(p_shift uuid,p_request uuid,p_method text,p_paid numeric,p_items jsonb,p_price_list uuid default null,p_ledger uuid default null,p_payments jsonb default null,p_customer uuid default null,p_over_limit boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_store uuid; v_customer public.retail_customers; v_sale public.retail_sales; v_balance numeric; saved uuid;
 v_credit numeric:=0; v_core_parts jsonb; v_placeholder text; v_core_method text; v_core_paid numeric;
begin
 if p_method='Mixto' and jsonb_typeof(p_payments)='array' then
  select coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Fiado'),0) into v_credit
  from jsonb_array_elements(p_payments) x where coalesce(x->>'amount','')~'^[0-9]+(\.[0-9]{1,2})?$';
  if exists(select 1 from jsonb_array_elements(p_payments) x where x->>'method'='Fiado') and v_credit<=0 then raise exception 'Revisá el importe fiado'; end if;
 end if;
 if p_method is distinct from 'Fiado' and v_credit=0 then
  if p_customer is not null then raise exception 'El cliente se elige solo para ventas fiadas'; end if;
  return public.retail_checkout_before_credit(p_shift,p_request,p_method,p_paid,p_items,p_price_list,p_ledger,p_payments);
 end if;
 if auth.uid() is null then raise exception 'Iniciá sesión'; end if;
 if p_customer is null then raise exception 'Elegí a quién le fiás'; end if;
 select store_id into v_store from public.retail_shifts where id=p_shift;
 select * into v_customer from public.retail_customers where id=p_customer and store_id=v_store for update;
 if not found or not v_customer.active then raise exception 'Cliente no disponible'; end if;
 if not retail_private.can_use_customers(v_store) then raise exception 'Tu perfil no permite fiar' using errcode='42501'; end if;
 -- El cobro existente valida la venta con la parte fiada como un medio sin efectivo que no esté ya en uso.
 if p_method='Fiado' then
  v_core_method:='Transferencia'; v_core_paid:=0; v_core_parts:=null;
 else
  select m into v_placeholder from unnest(array['Transferencia','QR','Debito','Credito']) m
   where not exists(select 1 from jsonb_array_elements(p_payments) x where x->>'method'=m) limit 1;
  if v_placeholder is null then raise exception 'Demasiados medios de pago en la misma venta'; end if;
  select jsonb_agg(case when x->>'method'='Fiado' then jsonb_set(x,'{method}',to_jsonb(v_placeholder)) else x end) into v_core_parts from jsonb_array_elements(p_payments) x;
  v_core_method:='Mixto'; v_core_paid:=p_paid;
 end if;
 select * into v_sale from public.retail_sales where id=p_request;
 if found then
  if v_sale.customer_id is distinct from p_customer then raise exception 'La solicitud ya fue usada con otro cliente'; end if;
  return v_sale.id;
 end if;
 saved:=public.retail_checkout_before_credit(p_shift,p_request,v_core_method,v_core_paid,p_items,p_price_list,p_ledger,v_core_parts);
 select * into v_sale from public.retail_sales where id=saved for update;
 if p_method='Fiado' then v_credit:=v_sale.total; end if;
 v_balance:=retail_private.customer_balance(p_customer);
 if v_customer.credit_limit is not null and v_balance+v_credit>v_customer.credit_limit then
  if not p_over_limit then
   raise exception 'Con esta venta % debería %, más que su límite de %',v_customer.name,v_balance+v_credit,v_customer.credit_limit;
  end if;
  if not retail_private.can_manage_customers(v_store) then
   raise exception 'Supera el límite de % y tu perfil no permite fiar por encima. Pedile a administración',v_customer.name using errcode='42501';
  end if;
 end if;
 if p_method='Fiado' then
  update public.retail_sales set payment_method='Fiado',payments=jsonb_build_array(jsonb_build_object('method','Fiado','amount',total)),
   amount_paid=total,change=0,cash_amount=0,customer_id=p_customer,customer_name=v_customer.name where id=saved;
 else
  -- El efectivo ya quedó en cash_amount; se devuelve el desglose real con su parte fiada.
  update public.retail_sales set payments=p_payments,customer_id=p_customer,customer_name=v_customer.name where id=saved;
 end if;
 insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,created_by,actor_email)
 values(saved,v_store,p_customer,'sale',v_credit,saved,auth.uid(),auth.jwt()->>'email');
 return saved;
end $$;

-- Anular una venta con fiado parcial repite su desglose: el efectivo sale de la caja y lo fiado se descuenta de la cuenta.
create or replace function public.retail_return_sale(p_store uuid,p_sale uuid,p_request uuid,p_items jsonb,p_reason text,p_refund jsonb default null,p_shift uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_parts jsonb:=p_refund; v_core jsonb; v_credit numeric; v_result jsonb; v_placeholder text;
begin
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store;
 if not found or v_sale.customer_id is null then
  if exists(select 1 from jsonb_array_elements(coalesce(p_refund,'[]'::jsonb)) x where x->>'method'='Fiado') then raise exception 'Solo una venta fiada se devuelve a cuenta del cliente'; end if;
  return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift);
 end if;
 if v_parts is null and p_items is null and v_sale.returned_total=0 then v_parts:=v_sale.payments; end if;
 if v_parts is null then return public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,p_refund,p_shift); end if;
 select coalesce(sum((x->>'amount')::numeric) filter(where x->>'method'='Fiado'),0) into v_credit from jsonb_array_elements(v_parts) x;
 select m into v_placeholder from unnest(array['Transferencia','QR','Debito','Credito']) m
  where not exists(select 1 from jsonb_array_elements(v_parts) x where x->>'method'=m) limit 1;
 if v_credit>0 and v_placeholder is null then raise exception 'Demasiados medios de devolución'; end if;
 select coalesce(jsonb_agg(case when x->>'method'='Fiado' then jsonb_set(x,'{method}',to_jsonb(v_placeholder)) else x end),'[]'::jsonb) into v_core from jsonb_array_elements(v_parts) x;
 v_result:=public.retail_return_sale_before_credit(p_store,p_sale,p_request,p_items,p_reason,v_core,p_shift);
 if v_credit>0 then
  update public.retail_sale_returns set payments=v_parts where id=p_request and payments is distinct from v_parts;
  insert into public.retail_customer_movements(id,store_id,customer_id,kind,amount,sale_id,return_id,created_by,actor_email)
  values(p_request,p_store,v_sale.customer_id,'return',-v_credit,p_sale,p_request,auth.uid(),auth.jwt()->>'email') on conflict(id) do nothing;
 end if;
 return v_result;
end $$;

notify pgrst,'reload schema';
$retail_source_c4cbb30b0390a791$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020006_partial_credit.sql','c4cbb30b0390a79134633987f21ccdb9dd006a2f5e025d0ba55ce7a73d3a75b2','schema');
 end if;
end;

-- 67/84: 202611020007_purchase_orders.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020007_purchase_orders.sql') then
  raise notice 'Aplicando 202611020007_purchase_orders.sql';
  execute replace($retail_source_9ee57671d2b9262c$
-- Pedidos a proveedores: se arman con sugerencias, se guardan, se envían a mano (WhatsApp o copiar)
-- y, al cargar la factura con el lector, se guarda lo recibido para comparar contra lo pedido.

create function retail_private.can_order(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false)
  or retail_private.has_permission(p_store,'manage_products') or retail_private.has_permission(p_store,'manage_supplier_accounts');
$$;
revoke all on function retail_private.can_order(uuid) from public,anon;
grant execute on function retail_private.can_order(uuid) to authenticated;

create table public.retail_purchase_orders (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 supplier_id uuid references public.retail_suppliers(id) on delete set null,
 supplier_name text not null check(length(btrim(supplier_name)) between 1 and 120),
 branch_id uuid not null,
 status text not null default 'draft' check(status in ('draft','sent','received','cancelled')),
 notes text check(notes is null or length(notes)<=1000),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), sent_at timestamptz,
 -- Lo que trajo la factura: [{product_id, name, qty, unit_cost}] en unidades y costo final por unidad.
 receipt jsonb check(receipt is null or jsonb_typeof(receipt)='array'),
 received_at timestamptz, received_by uuid references auth.users(id), received_email text,
 foreign key(store_id,branch_id) references public.retail_branches(store_id,id),
 check((status='received')=(receipt is not null))
);
create index retail_purchase_orders_store on public.retail_purchase_orders(store_id,created_at desc);

create table public.retail_purchase_order_lines (
 order_id uuid not null references public.retail_purchase_orders(id), store_id uuid not null, product_id uuid not null,
 product_name text not null, qty integer not null check(qty between 1 and 1000000),
 -- Costo del producto al pedir: sirve para detectar aumentos en la factura.
 unit_cost numeric(14,2), suggested integer check(suggested is null or suggested>=0),
 primary key(order_id,product_id),
 foreign key(store_id,product_id) references public.retail_products(store_id,id)
);

alter table public.retail_purchase_orders enable row level security;
alter table public.retail_purchase_order_lines enable row level security;
create policy buyers_read on public.retail_purchase_orders for select to authenticated using(retail_private.can_order(store_id));
create policy buyers_read on public.retail_purchase_order_lines for select to authenticated using(retail_private.can_order(store_id));
revoke all on public.retail_purchase_orders,public.retail_purchase_order_lines from public,anon,authenticated;
grant select on public.retail_purchase_orders,public.retail_purchase_order_lines to authenticated;

-- Unidades vendidas por producto y sucursal en los últimos días, con los combos descontados por sus componentes.
create function public.retail_product_sales_velocity(p_store uuid,p_days integer default 28) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_days is null or p_days not between 1 and 180 then raise exception 'Elegí entre 1 y 180 días'; end if;
 return (with item as (
  select s.branch_id,i.value as line from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
  where s.store_id=p_store and s.return_status<>'voided' and s.created_at>=now()-make_interval(days=>p_days)
 ), units as (
  select branch_id,(line->>'productId')::uuid as product_id,(line->>'qty')::numeric as qty from item
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))=0
  union all
  select branch_id,(c->>'product_id')::uuid,(line->>'qty')::numeric*(c->>'quantity')::numeric from item cross join lateral jsonb_array_elements(line->'stockComponents') c
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))>0
 ) select coalesce(jsonb_agg(jsonb_build_object('product_id',product_id,'branch_id',branch_id,'units',units)),'[]'::jsonb)
   from (select product_id,branch_id,sum(qty) as units from units group by product_id,branch_id) t);
end $$;

-- Guardar o editar un pedido mientras no esté recibido ni cancelado. Repetir el guardado no duplica renglones.
create function public.retail_save_purchase_order(p_store uuid,p_id uuid,p_order jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_purchase_orders; v_supplier uuid:=nullif(p_order->>'supplier_id','')::uuid; v_name text:=btrim(coalesce(p_order->>'supplier_name',''));
 v_branch uuid:=nullif(p_order->>'branch_id','')::uuid; v_line jsonb; v_product public.retail_products;
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos del pedido incompletos'; end if;
 if jsonb_typeof(p_order->'lines') is distinct from 'array' or jsonb_array_length(p_order->'lines') not between 1 and 1000 then raise exception 'El pedido no tiene productos'; end if;
 if v_supplier is not null then
  select name into v_name from public.retail_suppliers where id=v_supplier and store_id=p_store;
  if not found then raise exception 'Proveedor no disponible'; end if;
 end if;
 if length(v_name) not between 1 and 120 then raise exception 'Elegí o escribí el proveedor'; end if;
 if v_branch is null or not exists(select 1 from public.retail_branches where store_id=p_store and id=v_branch) then raise exception 'Elegí la sucursal del pedido'; end if;
 perform pg_advisory_xact_lock(hashtextextended('purchase-order:'||p_id::text,0));
 select * into v_existing from public.retail_purchase_orders where id=p_id for update;
 if found then
  if v_existing.store_id<>p_store then raise exception 'El identificador ya corresponde a otro comercio'; end if;
  if v_existing.status in ('received','cancelled') then raise exception 'Este pedido ya está cerrado'; end if;
  update public.retail_purchase_orders set supplier_id=v_supplier,supplier_name=v_name,branch_id=v_branch,
   notes=nullif(btrim(coalesce(p_order->>'notes','')),''),updated_at=now() where id=p_id;
  delete from public.retail_purchase_order_lines where order_id=p_id;
 else
  insert into public.retail_purchase_orders(id,store_id,supplier_id,supplier_name,branch_id,notes,created_by,actor_email)
  values(p_id,p_store,v_supplier,v_name,v_branch,nullif(btrim(coalesce(p_order->>'notes','')),''),auth.uid(),auth.jwt()->>'email');
 end if;
 for v_line in select value from jsonb_array_elements(p_order->'lines') loop
  if coalesce(v_line->>'qty','')!~'^[1-9][0-9]{0,6}$' then raise exception 'Revisá las cantidades del pedido'; end if;
  select * into v_product from public.retail_products where id=nullif(v_line->>'product_id','')::uuid and store_id=p_store;
  if not found then raise exception 'Producto no disponible en este comercio'; end if;
  insert into public.retail_purchase_order_lines(order_id,store_id,product_id,product_name,qty,unit_cost,suggested)
  values(p_id,p_store,v_product.id,v_product.name,(v_line->>'qty')::integer,nullif(v_product.cost,0),nullif(v_line->>'suggested','')::integer)
  on conflict(order_id,product_id) do update set qty=excluded.qty,suggested=excluded.suggested;
 end loop;
 return p_id;
end $$;

create function public.retail_set_purchase_order_status(p_store uuid,p_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
declare v_order public.retail_purchase_orders;
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_status not in ('sent','cancelled') then raise exception 'Estado inválido'; end if;
 select * into v_order from public.retail_purchase_orders where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Pedido no disponible'; end if;
 if v_order.status=p_status then return; end if;
 if v_order.status in ('received','cancelled') then raise exception 'Este pedido ya está cerrado'; end if;
 update public.retail_purchase_orders set status=p_status,sent_at=case when p_status='sent' then coalesce(sent_at,now()) else sent_at end,updated_at=now() where id=p_id;
end $$;

-- Al cargar una factura con el lector: se guarda lo recibido en el pedido abierto más reciente
-- del mismo proveedor y sucursal. Devuelve el pedido o null si no había ninguno.
create function public.retail_receive_purchase_order(p_store uuid,p_supplier_name text,p_branch uuid,p_receipt jsonb,p_order uuid default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_order public.retail_purchase_orders; v_key text:=retail_private.normalize_supplier(coalesce(p_supplier_name,''));
begin
 if not retail_private.can_order(p_store) then return null; end if;
 if jsonb_typeof(p_receipt) is distinct from 'array' or jsonb_array_length(p_receipt) not between 1 and 2000 then raise exception 'La factura no tiene renglones'; end if;
 if exists(select 1 from jsonb_array_elements(p_receipt) x where nullif(x->>'product_id','') is null or coalesce(x->>'qty','')!~'^[0-9]+(\.[0-9]+)?$') then raise exception 'Renglones de factura inválidos'; end if;
 if p_order is not null then
  select * into v_order from public.retail_purchase_orders where id=p_order and store_id=p_store and status in ('draft','sent') for update;
 else
  select * into v_order from public.retail_purchase_orders where store_id=p_store and status in ('draft','sent') and branch_id is not distinct from p_branch
   and v_key<>'' and retail_private.normalize_supplier(supplier_name)=v_key order by coalesce(sent_at,created_at) desc limit 1 for update;
 end if;
 if not found then return null; end if;
 update public.retail_purchase_orders set status='received',receipt=p_receipt,received_at=now(),received_by=auth.uid(),received_email=auth.jwt()->>'email',updated_at=now()
  where id=v_order.id;
 return v_order.id;
end $$;

revoke all on function public.retail_product_sales_velocity(uuid,integer),public.retail_save_purchase_order(uuid,uuid,jsonb),
 public.retail_set_purchase_order_status(uuid,uuid,text),public.retail_receive_purchase_order(uuid,text,uuid,jsonb,uuid) from public,anon;
grant execute on function public.retail_product_sales_velocity(uuid,integer),public.retail_save_purchase_order(uuid,uuid,jsonb),
 public.retail_set_purchase_order_status(uuid,uuid,text),public.retail_receive_purchase_order(uuid,text,uuid,jsonb,uuid) to authenticated;

notify pgrst,'reload schema';
$retail_source_9ee57671d2b9262c$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020007_purchase_orders.sql','9ee57671d2b9262c609e179b1b35faf8b25deef0d6695a0d0db22d293b06df2d','schema');
 end if;
end;

-- 68/84: 202611020008_branch_comparison.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020008_branch_comparison.sql') then
  raise notice 'Aplicando 202611020008_branch_comparison.sql';
  execute replace($retail_source_9cbc6cfea5ad26ab$
-- Comparación de sucursales. El cálculo de ventas, devoluciones y costo de Ganancias pasa a una sola función
-- interna por período, que usan el resultado del mes y la comparación; lo mismo con las unidades vendidas,
-- que usan los pedidos y la comparación. Nada se calcula dos veces de formas distintas.

-- Ventas netas, tickets y costo por sucursal entre dos instantes. Las devoluciones restan en su fecha,
-- con el costo guardado en el ticket. Las líneas sin costo se cuentan para avisar que el dato no es confiable.
create function retail_private.sales_period(p_store uuid,p_from timestamptz,p_to timestamptz) returns jsonb
language sql stable security definer set search_path='' as $$
 with sold as (
  select s.id,s.branch_id,s.total,s.items from public.retail_sales s where s.store_id=p_store and s.created_at>=p_from and s.created_at<p_to
 ), line as (
  select s.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty,(i.item->>'subtotal')::numeric as subtotal
  from sold s cross join lateral jsonb_array_elements(coalesce(s.items,'[]'::jsonb)) i(item)
 ), returned as (
  select r.branch_id,r.total,r.items from public.retail_sale_returns r where r.store_id=p_store and r.created_at>=p_from and r.created_at<p_to
 ), returned_line as (
  select r.branch_id,(i.item->>'unitCost')::numeric as unit_cost,(i.item->>'qty')::numeric as qty from returned r cross join lateral jsonb_array_elements(r.items) i(item)
 ), places as (select branch_id from sold union select branch_id from returned)
 select jsonb_build_object(
  'sales',coalesce((select sum(total) from sold),0)-coalesce((select sum(total) from returned),0),
  'returns',coalesce((select sum(total) from returned),0),
  'tickets',(select count(*) from sold),
  'cost',coalesce((select sum(unit_cost*qty) from line),0)-coalesce((select sum(unit_cost*qty) from returned_line),0),
  'uncosted_lines',(select count(*) from line where unit_cost is null or unit_cost<=0),
  'uncosted_sales',coalesce((select sum(subtotal) from line where unit_cost is null or unit_cost<=0),0),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sum(total) from sold x where x.branch_id=p.branch_id),0)-coalesce((select sum(total) from returned x where x.branch_id=p.branch_id),0),
    'returns',coalesce((select sum(total) from returned x where x.branch_id=p.branch_id),0),
    'tickets',(select count(*) from sold x where x.branch_id=p.branch_id),
    'cost',coalesce((select sum(unit_cost*qty) from line l where l.branch_id=p.branch_id),0)-coalesce((select sum(unit_cost*qty) from returned_line l where l.branch_id=p.branch_id),0),
    'uncosted_lines',(select count(*) from line l where l.branch_id=p.branch_id and (l.unit_cost is null or l.unit_cost<=0)),
    'uncosted_sales',coalesce((select sum(subtotal) from line l where l.branch_id=p.branch_id and (l.unit_cost is null or l.unit_cost<=0)),0))) from places p),'[]'::jsonb)
 );
$$;
revoke all on function retail_private.sales_period(uuid,timestamptz,timestamptz) from public,anon,authenticated;

-- Unidades vendidas por producto y sucursal: combos por sus componentes, sin ventas anuladas.
create function retail_private.units_sold(p_store uuid,p_from timestamptz,p_to timestamptz)
returns table(product_id uuid,branch_id uuid,units numeric) language sql stable security definer set search_path='' as $$
 with item as (
  select s.branch_id,i.value as line from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
  where s.store_id=p_store and s.return_status<>'voided' and s.created_at>=p_from and s.created_at<p_to
 ), units as (
  select branch_id,(line->>'productId')::uuid as product_id,(line->>'qty')::numeric as qty from item
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))=0
  union all
  select branch_id,(c->>'product_id')::uuid,(line->>'qty')::numeric*(c->>'quantity')::numeric from item cross join lateral jsonb_array_elements(line->'stockComponents') c
   where nullif(line->>'productId','') is not null and jsonb_array_length(coalesce(line->'stockComponents','[]'::jsonb))>0
 ) select product_id,branch_id,sum(qty) from units group by product_id,branch_id;
$$;
revoke all on function retail_private.units_sold(uuid,timestamptz,timestamptz) from public,anon,authenticated;

create or replace function public.retail_product_sales_velocity(p_store uuid,p_days integer default 28) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not retail_private.can_order(p_store) then raise exception 'Tu perfil no permite armar pedidos' using errcode='42501'; end if;
 if p_days is null or p_days not between 1 and 180 then raise exception 'Elegí entre 1 y 180 días'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('product_id',u.product_id,'branch_id',u.branch_id,'units',u.units)),'[]'::jsonb)
  from retail_private.units_sold(p_store,now()-make_interval(days=>p_days),now()+interval '1 minute') u);
end $$;

-- Ganancias del mes: el mismo cálculo por período más los gastos del mes.
create or replace function public.retail_month_result(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date; next_day date; zone text:='America/Argentina/Buenos_Aires'; v_period jsonb;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 next_day:=(first_day+interval '1 month')::date;
 v_period:=retail_private.sales_period(p_store,first_day::timestamp at time zone zone,next_day::timestamp at time zone zone);
 return (with spent as (
  select e.branch_id,e.category,e.amount from public.retail_expenses e
  where e.store_id=p_store and e.voided_at is null and e.spent_on>=first_day and e.spent_on<next_day
 ), sold as (
  select (b->>'branch_id')::uuid as branch_id,(b->>'sales')::numeric as sales,(b->>'cost')::numeric as cost from jsonb_array_elements(v_period->'branches') b
 ), places as (select branch_id from sold union select branch_id from spent where branch_id is not null)
 select (v_period-'branches'-'uncosted_sales')||jsonb_build_object(
  'expenses',coalesce((select sum(amount) from spent),0),
  'shared_expenses',coalesce((select sum(amount) from spent where branch_id is null),0),
  'by_category',coalesce((select jsonb_agg(jsonb_build_object('category',c.category,'amount',c.amount) order by c.amount desc) from (select category,sum(amount) as amount from spent group by category) c),'[]'::jsonb),
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',p.branch_id,
    'sales',coalesce((select sales from sold x where x.branch_id=p.branch_id),0),
    'cost',coalesce((select cost from sold x where x.branch_id=p.branch_id),0),
    'expenses',coalesce((select sum(amount) from spent e where e.branch_id=p.branch_id),0))) from places p),'[]'::jsonb)
 ));
end $$;

-- Panel de sucursales para un rango de días: ventas, ganancia bruta, tickets, ticket promedio,
-- lo más vendido y lo que tiene stock pero no se vendió. Solo dueños y administradores.
create function public.retail_branch_comparison(p_store uuid,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz; v_period jsonb;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede comparar sucursales' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 v_period:=retail_private.sales_period(p_store,v_from,v_to);
 return (with sold as (select * from retail_private.units_sold(p_store,v_from,v_to)),
  totals as (select (b->>'branch_id')::uuid as branch_id,b from jsonb_array_elements(v_period->'branches') b),
  branch as (select id,name from public.retail_branches where store_id=p_store),
  stocked as (
   select b.id as branch_id,p.id as product_id,p.name,p.cost,retail_private.location_quantity(p_store,p.id,b.id::text) as quantity
   from branch b cross join public.retail_products p
   where p.store_id=p_store and p.active and jsonb_array_length(p.stock_components)=0
  )
 select jsonb_build_object(
  'from',p_from,'to',p_to,
  'sales',v_period->'sales','cost',v_period->'cost','tickets',v_period->'tickets',
  'uncosted_lines',v_period->'uncosted_lines','uncosted_sales',v_period->'uncosted_sales',
  'branches',coalesce((select jsonb_agg(jsonb_build_object('branch_id',b.id,'name',b.name,
    'sales',coalesce((t.b->>'sales')::numeric,0),'returns',coalesce((t.b->>'returns')::numeric,0),'cost',coalesce((t.b->>'cost')::numeric,0),
    'tickets',coalesce((t.b->>'tickets')::integer,0),'uncosted_lines',coalesce((t.b->>'uncosted_lines')::integer,0),'uncosted_sales',coalesce((t.b->>'uncosted_sales')::numeric,0),
    'top',coalesce((select jsonb_agg(x order by (x->>'units')::numeric desc) from (
      select jsonb_build_object('product_id',s.product_id,'name',p.name,'units',s.units) as x from sold s join public.retail_products p on p.id=s.product_id
      where s.branch_id=b.id and s.units>0 order by s.units desc,p.name limit 5) top),'[]'::jsonb),
    'idle_count',(select count(*) from stocked k where k.branch_id=b.id and k.quantity>0 and not exists(select 1 from sold s where s.branch_id=b.id and s.product_id=k.product_id and s.units>0)),
    'idle',coalesce((select jsonb_agg(x) from (
      select jsonb_build_object('product_id',k.product_id,'name',k.name,'stock',k.quantity,'value',k.quantity*coalesce(nullif(k.cost,0),0)) as x from stocked k
      where k.branch_id=b.id and k.quantity>0 and not exists(select 1 from sold s where s.branch_id=b.id and s.product_id=k.product_id and s.units>0)
      order by k.quantity*coalesce(k.cost,0) desc,k.quantity desc,k.name limit 10) idle),'[]'::jsonb)
   ) order by coalesce((t.b->>'sales')::numeric,0) desc,b.name) from branch b left join totals t on t.branch_id=b.id),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_branch_comparison(uuid,date,date) from public,anon;
grant execute on function public.retail_branch_comparison(uuid,date,date) to authenticated;

notify pgrst,'reload schema';
$retail_source_9cbc6cfea5ad26ab$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020008_branch_comparison.sql','9cbc6cfea5ad26ab8933c506327dcc66ab3232360d3125e91b64b095b76eaec8','schema');
 end if;
end;

-- 69/84: 202611020009_activity_log.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611020009_activity_log.sql') then
  raise notice 'Aplicando 202611020009_activity_log.sql';
  execute replace($retail_source_fef5de758a29f033$
-- Actividad: un único lugar para ver quién hizo qué. Lo que ya tenía historial propio (cajas, plata, anulaciones,
-- bajas de productos, stock, conteos, pagos) se lee de su tabla. Lo que no quedaba registrado (precios, ediciones
-- de productos, permisos, personas y configuración) se guarda en un registro nuevo que nadie puede editar ni borrar.
-- Nunca se guardan contraseñas, tokens ni certificados: cada tabla registra solo las columnas listadas.

create table public.retail_audit_log (
 id bigint generated always as identity primary key, store_id uuid not null, at timestamptz not null default now(),
 actor_id uuid, actor_email text, branch_id uuid,
 kind text not null check(kind in ('precios','productos','stock','permisos','configuracion','borrados')),
 entity text not null, entity_id text, entity_name text, operation text not null check(operation in ('INSERT','UPDATE','DELETE')),
 before jsonb, after jsonb
);
create index retail_audit_log_store_at on public.retail_audit_log(store_id,at desc);
alter table public.retail_audit_log enable row level security;
create policy managers_read on public.retail_audit_log for select to authenticated using(retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_audit_log from public,anon,authenticated;
grant select on public.retail_audit_log to authenticated;

-- Inalterable: ni la app ni una función pueden cambiar o borrar un registro, salvo la limpieza por antigüedad.
create function retail_private.audit_log_immutable() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' and current_setting('retail.audit_purge',true)='on' then return old; end if;
 raise exception 'El registro de actividad es de solo lectura';
end $$;
create trigger retail_audit_log_immutable before update or delete on public.retail_audit_log for each row execute function retail_private.audit_log_immutable();

-- Conservación: 24 meses en este registro. Las ventas, cajas y demás historiales operativos no se borran.
create function retail_private.purge_audit_log() returns integer language plpgsql security definer set search_path='' as $$
declare removed integer;
begin
 perform set_config('retail.audit_purge','on',true);
 delete from public.retail_audit_log where at<now()-interval '24 months';
 get diagnostics removed=row_count;
 perform set_config('retail.audit_purge','off',true);
 return removed;
end $$;
revoke all on function retail_private.purge_audit_log() from public,anon,authenticated;

-- TG_ARGV: tipo de acción, nombre de la entidad y columnas permitidas, separadas por coma.
create function retail_private.audit_row() returns trigger language plpgsql security definer set search_path='' as $$
declare old_row jsonb:=case when tg_op<>'INSERT' then to_jsonb(old) end; new_row jsonb:=case when tg_op<>'DELETE' then to_jsonb(new) end;
 row_data jsonb; cols text[]:=string_to_array(tg_argv[2],','); col text; v_before jsonb:='{}'; v_after jsonb:='{}';
 v_kind text:=tg_argv[0]; v_branch uuid; v_location text:=nullif(current_setting('retail.inventory_location',true),''); v_name text;
begin
 row_data:=coalesce(new_row,old_row);
 -- El stock solo se registra cuando se edita desde la ficha del producto: ventas, devoluciones, conteos,
 -- reposiciones y traslados ya quedan en su propio historial.
 if tg_table_name='retail_products' and current_setting('retail.audit_product_form',true) is distinct from 'on' then cols:=array_remove(cols,'stock'); end if;
 foreach col in array cols loop
  if tg_op='UPDATE' and (old_row->col) is not distinct from (new_row->col) then continue; end if;
  if old_row ? col then v_before:=v_before||jsonb_build_object(col,old_row->col); end if;
  if new_row ? col then v_after:=v_after||jsonb_build_object(col,new_row->col); end if;
 end loop;
 if tg_op='UPDATE' and v_before='{}'::jsonb and v_after='{}'::jsonb then return null; end if;
 if tg_op='DELETE' then v_kind:='borrados';
 elsif tg_table_name='retail_products' then
  v_kind:=case when v_after ? 'stock' then 'stock' when v_after ?| array['price','cost','sale_markup'] then 'precios' else 'productos' end;
 end if;
 if tg_table_name='retail_branches' then v_branch:=(row_data->>'id')::uuid;
 elsif row_data ? 'branch_id' and nullif(row_data->>'branch_id','') is not null then v_branch:=(row_data->>'branch_id')::uuid;
 elsif v_location ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_branch:=v_location::uuid;
 end if;
 v_name:=coalesce(row_data->>'name',row_data->>'product_name',row_data->>'email',row_data->>'role');
 if tg_table_name='retail_members' then select email into v_name from auth.users where id=(row_data->>'user_id')::uuid; end if;
 if tg_table_name='retail_price_overrides' then select name into v_name from public.retail_products where id=(row_data->>'product_id')::uuid; end if;
 insert into public.retail_audit_log(store_id,actor_id,actor_email,branch_id,kind,entity,entity_id,entity_name,operation,before,after)
 values(coalesce(row_data->>'store_id',row_data->>'id')::uuid,auth.uid(),auth.jwt()->>'email',v_branch,v_kind,tg_argv[1],
  coalesce(row_data->>'id',row_data->>'user_id',row_data->>'product_id',row_data->>'role'),v_name,tg_op,
  case when tg_op='INSERT' then null else v_before end,case when tg_op='DELETE' then null else v_after end);
 return null;
end $$;
revoke all on function retail_private.audit_row() from public,anon,authenticated;

create trigger retail_audit_products after update or delete on public.retail_products for each row
 execute function retail_private.audit_row('productos','Producto','name,code,price,cost,sale_markup,min_stock,category_id,pack_size,supplier,stock');
create trigger retail_audit_price_overrides after insert or update or delete on public.retail_price_overrides for each row
 execute function retail_private.audit_row('precios','Precio fijo','list_id,product_id,price');
create trigger retail_audit_price_lists after insert or update or delete on public.retail_price_lists for each row
 execute function retail_private.audit_row('precios','Lista de precios','name,adjustment,active,branch_id,parent_id,base_kind,pricing_rules');
create trigger retail_audit_members after insert or update or delete on public.retail_members for each row
 execute function retail_private.audit_row('permisos','Persona con acceso','role,profile_id,branch_id,register_id');
create trigger retail_audit_invitations after insert or update or delete on public.retail_invitations for each row
 execute function retail_private.audit_row('permisos','Acceso pendiente','email,role,profile_id,branch_id,register_id');
create trigger retail_audit_profiles after insert or update or delete on public.retail_permission_profiles for each row
 execute function retail_private.audit_row('permisos','Perfil de permisos','name,base_role,permissions');
create trigger retail_audit_role_permissions after insert or update or delete on public.retail_role_permissions for each row
 execute function retail_private.audit_row('permisos','Permisos del rol','role,permissions');
create trigger retail_audit_stores after update on public.retail_stores for each row
 execute function retail_private.audit_row('configuracion','Comercio','name,address,phone,receipt_message,low_margin_threshold,branch_inventory_enabled,depot_enabled,billing_enabled,cuit,razon_social,condicion_iva,punto_venta_afip');
create trigger retail_audit_branches after insert or update or delete on public.retail_branches for each row
 execute function retail_private.audit_row('configuracion','Sucursal','name,address,is_default');
create trigger retail_audit_registers after insert or update or delete on public.retail_registers for each row
 execute function retail_private.audit_row('configuracion','Caja','name,active,branch_id');
create trigger retail_audit_ledgers after insert or update or delete on public.retail_ledgers for each row
 execute function retail_private.audit_row('configuracion','Registro de ventas','name,active,is_default,payment_methods');

-- La ficha del producto marca su edición para que el cambio de stock quede registrado.
alter function public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid) rename to retail_save_product_at_branch_before_audit;
create function public.retail_save_product_at_branch(p_store uuid,p_values jsonb,p_edit boolean,p_expected integer,p_branch uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare saved jsonb;
begin
 perform set_config('retail.audit_product_form','on',true);
 saved:=public.retail_save_product_at_branch_before_audit(p_store,p_values,p_edit,p_expected,p_branch);
 perform set_config('retail.audit_product_form','off',true);
 return saved;
end $$;
revoke all on function public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid) from public,anon;
grant execute on function public.retail_save_product_at_branch(uuid,jsonb,boolean,integer,uuid) to authenticated;

-- Todo junto, de lo más nuevo a lo más viejo. Solo lectura y solo para dueños y administradores.
create function public.retail_activity(p_store uuid,p_from date,p_to date,p_kind text default null,p_actor uuid default null,
 p_branch uuid default null,p_query text default null,p_before timestamptz default null,p_limit integer default 100) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz; v_limit integer:=least(greatest(coalesce(p_limit,100),1),200);
 v_query text:=nullif(lower(btrim(coalesce(p_query,''))),'');
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver la actividad' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 if p_kind is not null and p_kind not in ('precios','productos','stock','plata','caja','anulaciones','ventas','permisos','configuracion','borrados') then raise exception 'Tipo de actividad inválido'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=least((p_to+1)::timestamp at time zone zone,coalesce(p_before,'infinity'::timestamptz));
 return (with feed(at,kind,actor,actor_email,branch_id,title,detail,before,after) as (
  select a.at,a.kind,a.actor_id,a.actor_email,a.branch_id,
   case a.operation when 'INSERT' then 'Creó ' when 'DELETE' then 'Eliminó ' else 'Cambió ' end||lower(a.entity)||coalesce(' «'||a.entity_name||'»',''),null::text,a.before,a.after
  from public.retail_audit_log a where a.store_id=p_store and a.at>=v_from and a.at<v_to
  union all
  select s.opened_at,'caja',s.opened_by,null,r.branch_id,'Abrió '||r.name,null,null,jsonb_build_object('apertura',s.opening_cash)
  from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.opened_at>=v_from and s.opened_at<v_to
  union all
  select s.closed_at,'caja',s.closed_by,null,r.branch_id,'Cerró '||r.name,null,jsonb_build_object('esperado',s.expected_cash),
   jsonb_build_object('contado',s.counted_cash,'diferencia',s.counted_cash-s.expected_cash)
  from public.retail_shifts s join public.retail_registers r on r.id=s.register_id where s.store_id=p_store and s.closed_at>=v_from and s.closed_at<v_to
  union all
  select m.created_at,'plata',m.created_by,null,r.branch_id,case when m.type='INGRESO' then 'Ingreso de efectivo' else 'Retiro de efectivo' end,m.reason,null,jsonb_build_object('importe',m.amount)
  from public.retail_movements m join public.retail_shifts s on s.id=m.shift_id join public.retail_registers r on r.id=s.register_id
  where m.store_id=p_store and m.created_at>=v_from and m.created_at<v_to
  union all
  select f.created_at,'plata',f.created_by,f.actor_email,case when coalesce(f.to_location,f.from_location)~'^[0-9a-f-]{36}$' then coalesce(f.to_location,f.from_location)::uuid end,
   'Movimiento de plata',f.note,null,jsonb_build_object('importe',f.amount,'desde',f.from_location,'hacia',f.to_location)
  from public.retail_fund_transfers f where f.store_id=p_store and f.shift_id is null and f.created_at>=v_from and f.created_at<v_to
  union all
  select e.created_at,'plata',e.created_by,e.actor_email,e.branch_id,'Cargó un gasto',e.description,null,jsonb_build_object('importe',e.amount,'categoria',e.category)
  from public.retail_expenses e where e.store_id=p_store and e.created_at>=v_from and e.created_at<v_to
  union all
  select e.voided_at,'borrados',e.voided_by,null,e.branch_id,'Eliminó un gasto',e.description,jsonb_build_object('importe',e.amount),null
  from public.retail_expenses e where e.store_id=p_store and e.voided_at>=v_from and e.voided_at<v_to
  union all
  select p.created_at,'plata',p.created_by,p.actor_email,null,'Pagó a '||p.supplier_name,p.reference,null,jsonb_build_object('importe',p.amount,'medio',p.method)
  from public.retail_supplier_payments p where p.store_id=p_store and p.created_at>=v_from and p.created_at<v_to
  union all
  select p.voided_at,'anulaciones',p.voided_by,null,null,'Anuló un pago a '||p.supplier_name,p.void_reason,jsonb_build_object('importe',p.amount),null
  from public.retail_supplier_payments p where p.store_id=p_store and p.voided_at>=v_from and p.voided_at<v_to
  union all
  select c.created_at,'plata',c.created_by,c.actor_email,null,'Cobró a '||k.name,c.note,null,jsonb_build_object('importe',-c.amount,'medio',c.method)
  from public.retail_customer_movements c join public.retail_customers k on k.id=c.customer_id
  where c.store_id=p_store and c.kind='payment' and c.created_at>=v_from and c.created_at<v_to
  union all
  select r.created_at,'anulaciones',r.created_by,r.actor_email,r.branch_id,(case when r.kind='void' then 'Anuló la venta T-' else 'Devolvió parte de la venta T-' end)||s.ticket_number,r.reason,
   jsonb_build_object('total_venta',s.total),jsonb_build_object('devuelto',r.total)
  from public.retail_sale_returns r join public.retail_sales s on s.id=r.sale_id where r.store_id=p_store and r.created_at>=v_from and r.created_at<v_to
  union all
  select l.changed_at,'ventas',l.changed_by,null,s.branch_id,'Cambió el registro de la venta T-'||s.ticket_number,null,jsonb_build_object('registro',l.from_name),jsonb_build_object('registro',l.to_name)
  from public.retail_sale_ledger_changes l join public.retail_sales s on s.id=l.sale_id where l.store_id=p_store and l.changed_at>=v_from and l.changed_at<v_to
  union all
  select d.recorded_at,'borrados',d.actor_id,d.actor_email,null,(case when d.event_type='restored' then 'Restauró «' else 'Eliminó «' end)||d.product_name||'»',d.reason,null,null
  from public.retail_product_deletions d where d.store_id=p_store and d.event_type in ('deleted','restored') and d.recorded_at>=v_from and d.recorded_at<v_to
  union all
  select d.created_at,'stock',d.actor_id,d.actor_email,d.branch_id,
   (case d.action when 'to_depot' then 'Guardó en depósito «' when 'to_salon' then 'Pasó al salón «' else 'Recibió en depósito «' end)||d.product_name||'»',null,null,
   jsonb_build_object('cantidad',d.quantity,'deposito',d.depot_after)
  from public.retail_depot_movements d where d.store_id=p_store and d.created_at>=v_from and d.created_at<v_to
  union all
  select t.created_at,'stock',t.created_by,t.actor_email,case when t.to_location~'^[0-9a-f-]{36}$' then t.to_location::uuid end,
   'Armó un traslado de '||jsonb_array_length(t.items)||' productos',t.notes,null,jsonb_build_object('desde',t.from_location,'hacia',t.to_location)
  from public.retail_location_transfers t where t.store_id=p_store and t.created_at>=v_from and t.created_at<v_to
  union all
  select t.reviewed_at,'stock',t.reviewed_by,null,case when t.to_location~'^[0-9a-f-]{36}$' then t.to_location::uuid end,
   case when t.status='confirmed' then 'Confirmó un traslado' else 'Canceló un traslado' end,t.notes,null,jsonb_build_object('desde',t.from_location,'hacia',t.to_location)
  from public.retail_location_transfers t where t.store_id=p_store and t.reviewed_at>=v_from and t.reviewed_at<v_to
  union all
  select c.closed_at,'stock',c.closed_by,c.closed_email,case when c.location<>'depot' then c.location::uuid end,
   case when c.status='confirmed' then 'Confirmó un conteo' else 'Canceló un conteo' end,c.notes,null,
   jsonb_build_object('productos_ajustados',(select count(*) from public.retail_stock_count_lines l where l.count_id=c.id and l.adjustment<>0))
  from public.retail_stock_counts c where c.store_id=p_store and c.status<>'open' and c.closed_at>=v_from and c.closed_at<v_to
  union all
  -- Reposiciones (también sin conexión): las de devoluciones y conteos ya figuran arriba.
  select m.recorded_at,'stock',m.user_id,null,null,'Repuso «'||p.name||'»',null,null,jsonb_build_object('cantidad',m.delta,'costo',m.cost)
  from public.retail_stock_movements m join public.retail_products p on p.id=m.product_id
  where m.store_id=p_store and m.recorded_at>=v_from and m.recorded_at<v_to
   and not exists(select 1 from public.retail_sale_returns r where r.id=m.operation_id)
   and not exists(select 1 from public.retail_stock_counts c where c.id=m.operation_id)
 ), filtered as (
  select f.*,coalesce(f.actor_email,u.email) as email from feed f left join auth.users u on u.id=f.actor
  where (p_kind is null or f.kind=p_kind) and (p_actor is null or f.actor=p_actor) and (p_branch is null or f.branch_id=p_branch)
   and (v_query is null or lower(f.title||' '||coalesce(f.detail,''))like '%'||v_query||'%')
  order by f.at desc limit v_limit
 ) select jsonb_build_object(
  'items',coalesce((select jsonb_agg(jsonb_build_object('at',at,'kind',kind,'actor',actor,'actor_email',email,'branch_id',branch_id,
    'title',title,'detail',detail,'before',before,'after',after) order by at desc) from filtered),'[]'::jsonb),
  'next_before',case when (select count(*) from filtered)=v_limit then (select min(at) from filtered) end,
  'people',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'email',u.email) order by u.email) from public.retail_members m join auth.users u on u.id=m.user_id where m.store_id=p_store),'[]'::jsonb)
 ));
end $$;
revoke all on function public.retail_activity(uuid,date,date,text,uuid,uuid,text,timestamptz,integer) from public,anon;
grant execute on function public.retail_activity(uuid,date,date,text,uuid,uuid,text,timestamptz,integer) to authenticated;

notify pgrst,'reload schema';
$retail_source_fef5de758a29f033$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611020009_activity_log.sql','fef5de758a29f033e77ce8e27d8b9656b828dab410707836c2d569fc1fe45c3d','schema');
 end if;
end;

-- 70/84: 202611030001_funds_in_transit_and_bank.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030001_funds_in_transit_and_bank.sql') then
  raise notice 'Aplicando 202611030001_funds_in_transit_and_bank.sql';
  execute replace($retail_source_fb72479c1dfb3f5f$
-- 1. Plata en camino: un envío entre ubicaciones sale del origen al enviarlo y entra al destino cuando
--    alguien confirma cuánto llegó. Si no llega, queda «en camino» para revisarlo o devolverlo al origen.
-- 2. Conciliación: lo que entró al banco por QR, tarjetas y transferencias contra lo vendido por esos medios,
--    con comisiones y retenciones. Ganancias resta las comisiones una sola vez, desde estas liquidaciones.
-- El arqueo del cajero no cambia: nada de esto se muestra a quien cobra.

alter table public.retail_fund_transfers
 add column status text not null default 'done' check(status in ('done','in_transit','received','returned')),
 add column received_amount numeric(16,2) check(received_amount is null or (received_amount>=0 and received_amount::text<>'NaN')),
 add column received_by uuid references auth.users(id), add column received_email text, add column received_at timestamptz,
 add column review_note text check(review_note is null or length(btrim(review_note)) between 1 and 1000),
 add constraint retail_fund_transfers_transit_route check(status='done' or (from_location is not null and to_location is not null)),
 add constraint retail_fund_transfers_review check((status in ('received','returned'))=(received_at is not null));
create index retail_fund_transfers_in_transit on public.retail_fund_transfers(store_id,created_at) where status='in_transit';

-- Entre dos ubicaciones queda en camino; ingresos y salidas externas siguen siendo inmediatos.
create or replace function public.retail_move_location_funds(p_store uuid,p_from text,p_to text,p_amount numeric,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.retail_fund_transfers; loc text; source_balance numeric; target_balance numeric;
 note text:=btrim(p_note); v_transit boolean:=p_from is not null and p_to is not null;
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if p_request is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity')
  or p_amount<=0 or p_amount>999999999999.99 or round(p_amount,2)<>p_amount then raise exception 'Ingresá un importe positivo con hasta dos decimales'; end if;
 if note is null or length(note) not between 1 and 1000 then raise exception 'Escribí un motivo de hasta 1.000 caracteres'; end if;
 if (p_from is null and p_to is null) or p_from=p_to then raise exception 'Elegí un origen y un destino diferentes'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-request:'||p_request::text,0));
 select * into prior from public.retail_fund_transfers where id=p_request;
 if found then
  if prior.store_id<>p_store or prior.created_by<>auth.uid() or prior.from_location is distinct from p_from
   or prior.to_location is distinct from p_to or prior.amount<>p_amount or prior.note<>note then raise exception 'La solicitud corresponde a otro movimiento'; end if;
  return prior.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 foreach loc in array array[p_from,p_to] loop
  if loc is null then continue; end if;
  if loc<>'depot' and not exists(select 1 from public.retail_branches where store_id=p_store and id::text=loc) then raise exception 'La ubicación no pertenece a este comercio'; end if;
  insert into public.retail_location_funds(store_id,location) values(p_store,loc) on conflict do nothing;
 end loop;
 if p_from is not null then
  select balance into source_balance from public.retail_location_funds where store_id=p_store and location=p_from for update;
  if source_balance<p_amount then raise exception 'El fondo de origen no tiene saldo suficiente. Actualizá los saldos'; end if;
  update public.retail_location_funds set balance=balance-p_amount where store_id=p_store and location=p_from;
 end if;
 if p_to is not null and not v_transit then
  select balance into target_balance from public.retail_location_funds where store_id=p_store and location=p_to for update;
  if target_balance+p_amount>999999999999.99 then raise exception 'El saldo resultante supera el límite permitido'; end if;
  update public.retail_location_funds set balance=balance+p_amount where store_id=p_store and location=p_to;
 end if;
 insert into public.retail_fund_transfers(id,store_id,from_location,to_location,amount,note,created_by,actor_email,status)
 values(p_request,p_store,p_from,p_to,p_amount,note,auth.uid(),auth.jwt()->>'email',case when v_transit then 'in_transit' else 'done' end);
 return p_request;
end $$;

-- Confirmar lo que llegó. Si llegó menos, la diferencia queda registrada como faltante y exige una nota.
create function public.retail_receive_location_funds(p_store uuid,p_id uuid,p_amount numeric,p_note text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_transfer public.retail_fund_transfers; v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 select * into v_transfer from public.retail_fund_transfers where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Envío no disponible'; end if;
 if v_transfer.status='received' then return jsonb_build_object('id',p_id,'status','received','missing',v_transfer.amount-v_transfer.received_amount); end if;
 if v_transfer.status<>'in_transit' then raise exception 'Este envío ya no está en camino'; end if;
 if p_amount is null or p_amount<0 or p_amount>v_transfer.amount or round(p_amount,2)<>p_amount then raise exception 'Lo recibido debe estar entre 0 y lo enviado'; end if;
 if p_amount<v_transfer.amount and v_note is null then raise exception 'Llegó menos de lo enviado: escribí qué pasó'; end if;
 insert into public.retail_location_funds(store_id,location) values(p_store,v_transfer.to_location) on conflict do nothing;
 update public.retail_location_funds set balance=balance+p_amount where store_id=p_store and location=v_transfer.to_location;
 update public.retail_fund_transfers set status='received',received_amount=p_amount,received_by=auth.uid(),received_email=auth.jwt()->>'email',received_at=now(),review_note=v_note where id=p_id;
 return jsonb_build_object('id',p_id,'status','received','missing',v_transfer.amount-p_amount);
end $$;

-- Si no llegó: vuelve entera al origen, con su motivo.
create function public.retail_return_location_funds(p_store uuid,p_id uuid,p_note text) returns void
language plpgsql security definer set search_path='' as $$
declare v_transfer public.retail_fund_transfers; v_note text:=nullif(btrim(coalesce(p_note,'')),'');
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if v_note is null then raise exception 'Escribí por qué vuelve al origen'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 select * into v_transfer from public.retail_fund_transfers where id=p_id and store_id=p_store for update;
 if not found then raise exception 'Envío no disponible'; end if;
 if v_transfer.status='returned' then return; end if;
 if v_transfer.status<>'in_transit' then raise exception 'Este envío ya no está en camino'; end if;
 update public.retail_location_funds set balance=balance+v_transfer.amount where store_id=p_store and location=v_transfer.from_location;
 update public.retail_fund_transfers set status='returned',received_amount=0,received_by=auth.uid(),received_email=auth.jwt()->>'email',received_at=now(),review_note=v_note where id=p_id;
end $$;
revoke all on function public.retail_receive_location_funds(uuid,uuid,numeric,text),public.retail_return_location_funds(uuid,uuid,text) from public,anon;
grant execute on function public.retail_receive_location_funds(uuid,uuid,numeric,text),public.retail_return_location_funds(uuid,uuid,text) to authenticated;

-- Liquidaciones: lo que acreditó el banco o la billetera por un medio de pago, para un rango de días de venta.
create function retail_private.can_reconcile(p_store uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(retail_private.role_for(p_store) in ('owner','admin'),false) or retail_private.has_permission(p_store,'manage_funds');
$$;
revoke all on function retail_private.can_reconcile(uuid) from public,anon;
grant execute on function retail_private.can_reconcile(uuid) to authenticated;

create table public.retail_bank_deposits (
 id uuid primary key, store_id uuid not null references public.retail_stores(id),
 method text not null check(method in ('QR','Debito','Credito','Transferencia')),
 provider text check(provider is null or length(btrim(provider)) between 1 and 80),
 deposited_on date not null, sales_from date not null, sales_to date not null,
 -- Lo que acreditaron, lo que cobraron de comisión y lo que retuvieron por impuestos.
 net numeric(16,2) not null check(net>=0 and net::text<>'NaN'),
 commission numeric(16,2) not null default 0 check(commission>=0 and commission::text<>'NaN'),
 taxes numeric(16,2) not null default 0 check(taxes>=0 and taxes::text<>'NaN'),
 reference text check(reference is null or length(reference)<=120), note text check(note is null or length(note)<=500),
 created_by uuid not null references auth.users(id), actor_email text, created_at timestamptz not null default now(),
 voided_at timestamptz, voided_by uuid references auth.users(id), void_reason text check(void_reason is null or length(btrim(void_reason)) between 1 and 300),
 check(sales_to>=sales_from and sales_to-sales_from<=93), check((voided_at is null)=(void_reason is null)), check(net+commission+taxes>0)
);
create index retail_bank_deposits_store on public.retail_bank_deposits(store_id,sales_to desc);
alter table public.retail_bank_deposits enable row level security;
create policy reconcilers_read on public.retail_bank_deposits for select to authenticated using(retail_private.can_reconcile(store_id));
revoke all on public.retail_bank_deposits from public,anon,authenticated;
grant select on public.retail_bank_deposits to authenticated;

create function public.retail_save_bank_deposit(p_store uuid,p_id uuid,p_deposit jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_existing public.retail_bank_deposits; v_method text:=p_deposit->>'method';
 v_net numeric; v_commission numeric; v_taxes numeric; v_from date; v_to date; v_on date;
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_id is null then raise exception 'Datos de la liquidación incompletos'; end if;
 if v_method is null or v_method not in ('QR','Debito','Credito','Transferencia') then raise exception 'Elegí el medio de pago'; end if;
 if exists(select 1 from jsonb_each_text(p_deposit) e where e.key in ('net','commission','taxes') and e.value is not null and e.value<>'' and e.value!~'^[0-9]{1,13}(\.[0-9]{1,2})?$') then
  raise exception 'Revisá los importes';
 end if;
 v_net:=coalesce(nullif(p_deposit->>'net','')::numeric,0); v_commission:=coalesce(nullif(p_deposit->>'commission','')::numeric,0); v_taxes:=coalesce(nullif(p_deposit->>'taxes','')::numeric,0);
 if v_net+v_commission+v_taxes<=0 then raise exception 'Cargá lo acreditado'; end if;
 v_on:=nullif(p_deposit->>'deposited_on','')::date; v_from:=nullif(p_deposit->>'sales_from','')::date; v_to:=nullif(p_deposit->>'sales_to','')::date;
 if v_on is null or v_from is null or v_to is null or v_to<v_from or v_to-v_from>93 then raise exception 'Revisá las fechas: los días de venta pueden abarcar hasta tres meses'; end if;
 perform pg_advisory_xact_lock(hashtextextended('bank-deposit:'||p_id::text,0));
 select * into v_existing from public.retail_bank_deposits where id=p_id for update;
 if found then
  if v_existing.store_id<>p_store then raise exception 'El identificador ya corresponde a otro comercio'; end if;
  if v_existing.voided_at is not null then raise exception 'Esta liquidación está anulada'; end if;
  update public.retail_bank_deposits set method=v_method,provider=nullif(btrim(coalesce(p_deposit->>'provider','')),''),deposited_on=v_on,sales_from=v_from,sales_to=v_to,
   net=v_net,commission=v_commission,taxes=v_taxes,reference=nullif(btrim(coalesce(p_deposit->>'reference','')),''),note=nullif(btrim(coalesce(p_deposit->>'note','')),'') where id=p_id;
 else
  insert into public.retail_bank_deposits(id,store_id,method,provider,deposited_on,sales_from,sales_to,net,commission,taxes,reference,note,created_by,actor_email)
  values(p_id,p_store,v_method,nullif(btrim(coalesce(p_deposit->>'provider','')),''),v_on,v_from,v_to,v_net,v_commission,v_taxes,
   nullif(btrim(coalesce(p_deposit->>'reference','')),''),nullif(btrim(coalesce(p_deposit->>'note','')),''),auth.uid(),auth.jwt()->>'email');
 end if;
 return p_id;
end $$;

create function public.retail_void_bank_deposit(p_store uuid,p_id uuid,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_reason is null or length(btrim(p_reason)) not between 1 and 300 then raise exception 'Escribí por qué se anula'; end if;
 update public.retail_bank_deposits set voided_at=now(),voided_by=auth.uid(),void_reason=btrim(p_reason) where id=p_id and store_id=p_store and voided_at is null;
 if not found and not exists(select 1 from public.retail_bank_deposits where id=p_id and store_id=p_store) then raise exception 'Liquidación no disponible'; end if;
end $$;

-- Lo vendido por medio (pagos de ventas y cobros a clientes, menos devoluciones por ese medio) contra lo liquidado.
-- Se comparan las liquidaciones cuyos días de venta están dentro del período elegido.
create function public.retail_bank_reconciliation(p_store uuid,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz;
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 return (with methods(method) as (values ('QR'),('Debito'),('Credito'),('Transferencia')),
  sold as (
   select x->>'method' as method,sum((x->>'amount')::numeric) as amount from public.retail_sales s cross join lateral jsonb_array_elements(s.payments) x
   where s.store_id=p_store and s.created_at>=v_from and s.created_at<v_to group by 1
  ), refunded as (
   select x->>'method' as method,sum((x->>'amount')::numeric) as amount from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.payments) x
   where r.store_id=p_store and r.created_at>=v_from and r.created_at<v_to group by 1
  ), collected as (
   select c.method,sum(-c.amount) as amount from public.retail_customer_movements c
   where c.store_id=p_store and c.kind='payment' and c.created_at>=v_from and c.created_at<v_to group by 1
  ), deposited as (
   select method,sum(net) as net,sum(commission) as commission,sum(taxes) as taxes,count(*) as deposits from public.retail_bank_deposits
   where store_id=p_store and voided_at is null and sales_from>=p_from and sales_to<=p_to group by 1
  )
  select jsonb_build_object('from',p_from,'to',p_to,
   'methods',(select jsonb_agg(jsonb_build_object('method',m.method,
     'sold',coalesce(s.amount,0)-coalesce(r.amount,0)+coalesce(c.amount,0),
     'net',coalesce(d.net,0),'commission',coalesce(d.commission,0),'taxes',coalesce(d.taxes,0),'deposits',coalesce(d.deposits,0),
     -- Diferencia: lo liquidado (acreditado + comisión + retenciones) menos lo vendido. Negativo: falta cobrar.
     'difference',coalesce(d.net,0)+coalesce(d.commission,0)+coalesce(d.taxes,0)-(coalesce(s.amount,0)-coalesce(r.amount,0)+coalesce(c.amount,0)))
    order by m.method) from methods m left join sold s on s.method=m.method left join refunded r on r.method=m.method
    left join collected c on c.method=m.method left join deposited d on d.method=m.method),
   'deposits',coalesce((select jsonb_agg(to_jsonb(b)-'store_id'-'created_by'-'voided_by' order by b.deposited_on desc,b.created_at desc) from public.retail_bank_deposits b
    where b.store_id=p_store and b.sales_to>=p_from and b.sales_from<=p_to),'[]'::jsonb)
  ));
end $$;

-- Ganancias: comisiones y retenciones de las liquidaciones acreditadas en el mes. Se toman solo de acá,
-- así que no hay que cargarlas también como gasto.
create function public.retail_month_commissions(p_store uuid,p_month date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare first_day date:=date_trunc('month',p_month)::date;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then raise exception 'Solo la administración puede ver el resultado' using errcode='42501'; end if;
 return (with month as (
  select method,commission,taxes from public.retail_bank_deposits
  where store_id=p_store and voided_at is null and deposited_on>=first_day and deposited_on<(first_day+interval '1 month')::date
 ) select jsonb_build_object('commission',coalesce((select sum(commission) from month),0),'taxes',coalesce((select sum(taxes) from month),0),
   'deposits',(select count(*) from month),
   'by_method',coalesce((select jsonb_agg(jsonb_build_object('method',method,'commission',total) order by total desc)
    from (select method,sum(commission) as total from month group by method having sum(commission)>0) t),'[]'::jsonb)));
end $$;

revoke all on function public.retail_save_bank_deposit(uuid,uuid,jsonb),public.retail_void_bank_deposit(uuid,uuid,text),
 public.retail_bank_reconciliation(uuid,date,date),public.retail_month_commissions(uuid,date) from public,anon;
grant execute on function public.retail_save_bank_deposit(uuid,uuid,jsonb),public.retail_void_bank_deposit(uuid,uuid,text),
 public.retail_bank_reconciliation(uuid,date,date),public.retail_month_commissions(uuid,date) to authenticated;

notify pgrst,'reload schema';
$retail_source_fb72479c1dfb3f5f$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030001_funds_in_transit_and_bank.sql','fb72479c1dfb3f5f1350f7366a920227d47b9b32abbc47a9abfbd46b575eb197','schema');
 end if;
end;

-- 71/84: 202611030002_billing_safe_issue.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030002_billing_safe_issue.sql') then
  raise notice 'Aplicando 202611030002_billing_safe_issue.sql';
  execute replace($retail_source_be0145bb9fed6674$
do $$ begin
 if to_regnamespace('vault') is null then
  raise exception 'Activá Vault en Supabase (Database → Extensions → supabase_vault) y volvé a aplicar esta actualización';
 end if;
end $$;

-- 1. Clave privada en Vault. La columna de texto queda vacía y ya no se puede volver a usar.
alter table retail_private.store_billing_credentials
 alter column arca_key drop not null,
 alter column arca_environment set default 'homo',
 add column if not exists arca_key_secret uuid;
update retail_private.store_billing_credentials
 set arca_key_secret=vault.create_secret(arca_key,'arca_key_'||store_id::text,'Clave privada ARCA del comercio'),arca_key=null
 where arca_key is not null and arca_key_secret is null;
alter table retail_private.store_billing_credentials
 add constraint store_billing_credentials_key_in_vault check (arca_key is null and arca_key_secret is not null);

-- 2. Permiso de ARCA (WSAA) guardado entre ejecuciones: ARCA niega uno nuevo mientras el anterior siga vigente.
create table retail_private.billing_wsaa_tokens (
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 environment text not null check (environment in ('homo','prod')),
 token text not null, sign text not null, expires_at timestamptz not null,
 primary key (store_id,environment)
);
revoke all on retail_private.billing_wsaa_tokens from public,anon,authenticated;

-- 3. Cada pedido de CAE queda registrado antes de salir. Solo puede haber uno en curso por punto de venta,
-- tipo y entorno, y uno por venta: ese es el bloqueo de numeración.
create table public.retail_billing_attempts (
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.retail_stores(id),
 sale_id uuid not null references public.retail_sales(id),
 environment text not null check (environment in ('homo','prod')),
 pto_vta integer not null, cbte_tipo smallint not null,
 cbte_nro bigint, cbte_fch date not null,
 imp_total numeric(14,2) not null, imp_neto numeric(14,2) not null, imp_iva numeric(14,2) not null,
 -- reserved: tiene el turno pero no salió nada a ARCA. sent: salió con número y todavía no se sabe la respuesta.
 status text not null default 'reserved' check (status in ('reserved','sent','authorized','rejected','not_issued','cancelled','conflict')),
 cae text, cae_vto date, error text,
 lease_until timestamptz not null,
 requested_by uuid references auth.users(id),
 created_at timestamptz not null default now(), resolved_at timestamptz,
 check (status<>'sent' or cbte_nro is not null)
);
create unique index retail_billing_attempts_one_open_per_sequence on public.retail_billing_attempts(store_id,environment,pto_vta,cbte_tipo) where status in ('reserved','sent');
create unique index retail_billing_attempts_one_open_per_sale on public.retail_billing_attempts(sale_id) where status in ('reserved','sent');
create unique index retail_billing_attempts_one_invoice_per_sale on public.retail_billing_attempts(sale_id,environment) where status='authorized';
create unique index retail_billing_attempts_unique_number on public.retail_billing_attempts(store_id,environment,pto_vta,cbte_tipo,cbte_nro) where status='authorized';
create index retail_billing_attempts_sale on public.retail_billing_attempts(store_id,sale_id,created_at desc);
alter table public.retail_billing_attempts enable row level security;
create policy owner_read on public.retail_billing_attempts for select to authenticated using (retail_private.role_for(store_id) in ('owner','admin'));
revoke all on public.retail_billing_attempts from public,anon,authenticated;
grant select on public.retail_billing_attempts to authenticated;

-- 4. Certificados: solo el dueño o un administrador. La clave puede omitirse para cambiar solo el certificado o el entorno.
create or replace function public.retail_set_billing_credentials(p_store uuid,p_cert text,p_key text,p_environment text default 'homo')
returns void language plpgsql security definer set search_path='' as $$
declare current_secret uuid; v_cert text:=nullif(trim(coalesce(p_cert,'')),''); v_key text:=nullif(trim(coalesce(p_key,'')),'');
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then
  raise exception 'Solo el dueño o un administrador puede cargar el certificado de ARCA' using errcode='42501';
 end if;
 if p_environment is null or p_environment not in ('homo','prod') then raise exception 'Elegí homologación (pruebas) o producción'; end if;
 if v_cert is null or v_cert not like '-----BEGIN CERTIFICATE-----%' then raise exception 'El certificado (.crt) no es válido: tiene que empezar con -----BEGIN CERTIFICATE-----'; end if;
 if v_key is not null and v_key !~ '^-----BEGIN (RSA )?PRIVATE KEY-----' then raise exception 'La clave privada (.key) no es válida'; end if;
 select arca_key_secret into current_secret from retail_private.store_billing_credentials where store_id=p_store for update;
 if v_key is null and current_secret is null then raise exception 'La clave privada (.key) es obligatoria'; end if;
 if v_key is not null then
  if current_secret is null then current_secret:=vault.create_secret(v_key,'arca_key_'||p_store::text||'_'||gen_random_uuid()::text,'Clave privada ARCA del comercio');
  else perform vault.update_secret(current_secret,v_key); end if;
 end if;
 insert into retail_private.store_billing_credentials(store_id,arca_cert,arca_key,arca_key_secret,arca_environment,updated_at,updated_by)
 values(p_store,v_cert,null,current_secret,p_environment,now(),auth.uid())
 on conflict (store_id) do update set arca_cert=excluded.arca_cert,arca_key_secret=excluded.arca_key_secret,
  arca_environment=excluded.arca_environment,updated_at=now(),updated_by=auth.uid();
 -- Un certificado nuevo invalida el permiso de ARCA guardado.
 delete from retail_private.billing_wsaa_tokens where store_id=p_store;
end $$;

create or replace function public.retail_get_billing_credentials_status(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cred retail_private.store_billing_credentials;
begin
 if coalesce(retail_private.role_for(p_store),'') not in ('owner','admin') then return jsonb_build_object('configured',false,'error','Sin permisos'); end if;
 select * into cred from retail_private.store_billing_credentials where store_id=p_store;
 if not found then return jsonb_build_object('configured',false,'environment','homo','updated_at',null); end if;
 return jsonb_build_object('configured',true,'environment',cred.arca_environment,'updated_at',cred.updated_at);
end $$;

-- 5. Turno para pedir el CAE de una venta. Lo llama la función del servidor con la sesión de quien vende,
-- así se revisan sus permisos. Importes, tipo, CUIT y punto de venta salen de la base, nunca del navegador.
create function public.retail_billing_begin(p_store uuid,p_sale uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_store public.retail_stores; v_env text; v_tipo smallint; v_open public.retail_billing_attempts;
 v_neto numeric(14,2); v_iva numeric(14,2); v_attempt public.retail_billing_attempts;
begin
 if not (retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Sin permiso para facturar en este comercio' using errcode='42501';
 end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada. Si se cobró sin conexión, sincronizá antes de facturar'; end if;
 if v_sale.billing_status='authorized' then
  return jsonb_build_object('state','authorized','cae',v_sale.cae,'cae_vto',v_sale.cae_vto,'cbte_nro',v_sale.cbte_nro,'cbte_tipo',v_sale.cbte_tipo);
 end if;
 if v_sale.return_status='voided' then return jsonb_build_object('state','voided'); end if;
 if v_sale.billing_status='none' then return jsonb_build_object('state','skip'); end if;
 select * into v_store from public.retail_stores where id=p_store;
 if not v_store.billing_enabled then return jsonb_build_object('state','skip','error','La facturación electrónica está desactivada'); end if;
 v_tipo:=case v_store.condicion_iva when 'RI' then 6 when 'MO' then 11 end;
 if v_tipo is null then return jsonb_build_object('state','skip','error','Los comercios exentos todavía no emiten comprobante desde la app'); end if;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if v_env is null then return jsonb_build_object('state','error','error','Falta cargar el certificado de ARCA en Mi comercio'); end if;
 if coalesce(v_sale.total,0)<=0 then return jsonb_build_object('state','error','error','La venta no tiene importe para facturar'); end if;

 -- Primero se ordena lo que haya quedado en curso para este punto de venta y tipo.
 select * into v_open from public.retail_billing_attempts
  where store_id=p_store and environment=v_env and pto_vta=v_store.punto_venta_afip and cbte_tipo=v_tipo and status in ('reserved','sent') for update;
 if found then
  if v_open.lease_until>now() then return jsonb_build_object('state','busy'); end if;
  if v_open.status='reserved' then
   -- Nunca salió a ARCA: se libera sin riesgo.
   update public.retail_billing_attempts set status='cancelled',error='Se cortó antes de pedir el CAE',resolved_at=now() where id=v_open.id;
  else
   -- Salió con número y no se supo la respuesta: hay que consultarlo en ARCA antes de usar otro número.
   update public.retail_billing_attempts set lease_until=now()+interval '3 minutes' where id=v_open.id returning * into v_open;
   return jsonb_build_object('state','recover','attempt',to_jsonb(v_open),'cuit',regexp_replace(v_store.cuit,'\D','','g'));
  end if;
 end if;

 if v_tipo=6 then v_neto:=round(v_sale.total/1.21,2); v_iva:=v_sale.total-v_neto; else v_neto:=v_sale.total; v_iva:=0; end if;
 insert into public.retail_billing_attempts(store_id,sale_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,lease_until,requested_by)
 values(p_store,p_sale,v_env,v_store.punto_venta_afip,v_tipo,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_sale.total,v_neto,v_iva,now()+interval '3 minutes',auth.uid()) returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',regexp_replace(v_store.cuit,'\D','','g'));
end $$;

-- 6. Antes de mandar el pedido a ARCA se anota el número. Si la respuesta se pierde, se sabe qué consultar.
create function public.retail_billing_mark_sent(p_attempt uuid,p_cbte_nro bigint) returns void
language plpgsql security definer set search_path='' as $$
declare v public.retail_billing_attempts;
begin
 select * into v from public.retail_billing_attempts where id=p_attempt for update;
 if not found or v.status<>'reserved' then raise exception 'El turno de facturación ya no está disponible'; end if;
 if v.lease_until<=now() then raise exception 'El turno de facturación venció. Reintentá'; end if;
 if p_cbte_nro is null or p_cbte_nro<1 then raise exception 'Número de comprobante inválido'; end if;
 update public.retail_billing_attempts set status='sent',cbte_nro=p_cbte_nro,lease_until=now()+interval '3 minutes' where id=p_attempt;
end $$;

-- 7. Resultado del pedido. ARCA manda: si autorizó, la venta queda autorizada aunque el turno ya se hubiera dado por perdido.
create function public.retail_billing_finish(p_attempt uuid,p_result text,p_cae text default null,p_cae_vto date default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.retail_billing_attempts; v_sale public.retail_sales; v_error text:=left(nullif(trim(coalesce(p_error,'')),''),500);
begin
 if p_result not in ('authorized','rejected','not_issued','cancelled','unknown','conflict') then raise exception 'Resultado inválido'; end if;
 select * into v from public.retail_billing_attempts where id=p_attempt for update;
 if not found then raise exception 'Pedido de facturación no encontrado'; end if;
 select * into v_sale from public.retail_sales where id=v.sale_id for update;

 if p_result='authorized' then
  if nullif(trim(coalesce(p_cae,'')),'') is null or p_cae_vto is null or v.cbte_nro is null then raise exception 'Faltan el CAE, su vencimiento o el número'; end if;
  if v.status='authorized' then return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cae',v.cae); end if;
  if v_sale.billing_status='authorized' and v_sale.cae is distinct from trim(p_cae) then
   update public.retail_billing_attempts set status='conflict',cae=trim(p_cae),cae_vto=p_cae_vto,resolved_at=now(),
    error='La venta ya tenía factura y ARCA autorizó otra: corresponde anularla con nota de crédito' where id=v.id;
   return jsonb_build_object('state','conflict','error','La venta quedó con dos facturas en ARCA. Hay que anular una con nota de crédito');
  end if;
  update public.retail_billing_attempts set status='authorized',cae=trim(p_cae),cae_vto=p_cae_vto,error=null,resolved_at=now() where id=v.id;
  update public.retail_sales set billing_status='authorized',cbte_tipo=v.cbte_tipo,cbte_nro=v.cbte_nro,cae=trim(p_cae),cae_vto=p_cae_vto,billing_error=null
   where id=v.sale_id;
  return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cbte_tipo',v.cbte_tipo,'cae',trim(p_cae),'cae_vto',p_cae_vto);
 end if;

 if v.status not in ('reserved','sent') then return jsonb_build_object('state',v.status); end if;
 if p_result='unknown' then
  -- Se deja en curso: el próximo pedido para este punto de venta lo consulta en ARCA antes de seguir.
  if v.status<>'sent' then raise exception 'Solo un pedido enviado puede quedar sin respuesta'; end if;
  update public.retail_billing_attempts set error=coalesce(v_error,'ARCA no respondió') where id=v.id;
  if v_sale.billing_status<>'authorized' then
   update public.retail_sales set billing_status='retry',billing_error='ARCA no respondió. Antes de reintentar se revisa si la factura quedó hecha',
    billing_attempts=least(billing_attempts+1,32767) where id=v.sale_id;
  end if;
  return jsonb_build_object('state','retry');
 end if;

 update public.retail_billing_attempts set status=p_result,error=v_error,resolved_at=now() where id=v.id;
 if v_sale.billing_status<>'authorized' then
  update public.retail_sales set
   billing_status=case when p_result in ('rejected','conflict') then 'error' else 'retry' end,
   billing_error=coalesce(v_error,case when p_result in ('rejected','conflict') then 'ARCA rechazó el comprobante' else 'No se pudo pedir el CAE. Se reintenta' end),
   billing_attempts=least(billing_attempts+1,32767)
  where id=v.sale_id;
 end if;
 return jsonb_build_object('state',case when p_result in ('rejected','conflict') then 'error' else 'retry' end,'error',v_error);
end $$;

-- 8. Solo para la función del servidor: certificado, clave descifrada y permiso de ARCA vigente.
create function public.retail_billing_secrets(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare cred retail_private.store_billing_credentials; v_key text; v_token retail_private.billing_wsaa_tokens;
begin
 select * into cred from retail_private.store_billing_credentials where store_id=p_store;
 if not found then return null; end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where id=cred.arca_key_secret;
 select * into v_token from retail_private.billing_wsaa_tokens where store_id=p_store and environment=cred.arca_environment and expires_at>now()+interval '10 minutes';
 return jsonb_build_object('cert',cred.arca_cert,'key',v_key,'environment',cred.arca_environment,
  'token',v_token.token,'sign',v_token.sign,'token_expires_at',v_token.expires_at);
end $$;

create function public.retail_billing_save_token(p_store uuid,p_environment text,p_token text,p_sign text,p_expires_at timestamptz) returns void
language sql security definer set search_path='' as $$
 insert into retail_private.billing_wsaa_tokens(store_id,environment,token,sign,expires_at) values(p_store,p_environment,p_token,p_sign,p_expires_at)
 on conflict (store_id,environment) do update set token=excluded.token,sign=excluded.sign,expires_at=excluded.expires_at;
$$;

-- 9. Desde la app ya no se puede marcar una venta como autorizada ni pisar una autorizada.
create or replace function public.retail_update_sale_billing(p_store uuid,p_sale uuid,p_status text,p_cbte_tipo smallint default null,
 p_cbte_nro bigint default null,p_cae text default null,p_cae_vto text default null,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
declare s public.retail_sales;
begin
 if not (retail_private.has_permission(p_store,'manage_store') or retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Permisos insuficientes para actualizar el comprobante fiscal';
 end if;
 if p_status is null or p_status not in ('pending','error','retry') then
  raise exception 'El CAE lo registra solamente el servidor de facturación';
 end if;
 select * into s from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada'; end if;
 if s.billing_status='authorized' then raise exception 'La venta ya tiene factura autorizada. Para corregirla corresponde una nota de crédito'; end if;
 if s.billing_status='none' then raise exception 'Esta venta no se factura'; end if;
 if exists(select 1 from public.retail_billing_attempts where sale_id=p_sale and status in ('reserved','sent')) then return; end if;
 update public.retail_sales set billing_status=p_status,
  billing_error=case when p_status='error' then coalesce(nullif(trim(p_error),''),billing_error) else billing_error end,
  billing_attempts=case when p_status='error' then least(billing_attempts+1,32767) else billing_attempts end
 where id=p_sale;
end $$;

revoke all on function public.retail_billing_begin(uuid,uuid),public.retail_billing_mark_sent(uuid,bigint),
 public.retail_billing_finish(uuid,text,text,date,text),public.retail_billing_secrets(uuid),
 public.retail_billing_save_token(uuid,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.retail_billing_begin(uuid,uuid) to authenticated;
grant execute on function public.retail_billing_mark_sent(uuid,bigint),public.retail_billing_finish(uuid,text,text,date,text),
 public.retail_billing_secrets(uuid),public.retail_billing_save_token(uuid,text,text,text,timestamptz) to service_role;
revoke all on function public.retail_set_billing_credentials(uuid,text,text,text),public.retail_get_billing_credentials_status(uuid),
 public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) from public,anon;
grant execute on function public.retail_set_billing_credentials(uuid,text,text,text),public.retail_get_billing_credentials_status(uuid),
 public.retail_update_sale_billing(uuid,uuid,text,smallint,bigint,text,text,text) to authenticated;

notify pgrst,'reload schema';
$retail_source_be0145bb9fed6674$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030002_billing_safe_issue.sql','be0145bb9fed66746e073600d2af96db0354aae1e99196c397701e715cbe594f','schema');
 end if;
end;

-- 72/84: 202611030003_billing_receptor_credit_notes.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030003_billing_receptor_credit_notes.sql') then
  raise notice 'Aplicando 202611030003_billing_receptor_credit_notes.sql';
  execute replace($retail_source_11f4d758d7e2d014$
-- 1. Receptor del comprobante, guardado al autorizar para el ticket y el QR.
alter table public.retail_sales
 add column receptor_doc_tipo smallint, add column receptor_doc_nro bigint,
 add column receptor_name text, add column receptor_iva smallint;

-- 2. Nota de crédito por devolución.
alter table public.retail_sale_returns
 add column credit_note_status text not null default 'none' check (credit_note_status in ('none','pending','authorized','error','retry')),
 add column cbte_tipo smallint, add column cbte_nro bigint, add column cae text, add column cae_vto date, add column credit_note_error text;

-- Las devoluciones nuevas de ventas facturadas quedan para emitir desde la app. Las anteriores siguen con carga manual.
create function retail_private.queue_credit_note() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.credit_note_required and new.credit_note_status='none' and new.credit_note_reference is null then new.credit_note_status:='pending'; end if;
 return new;
end $$;
revoke all on function retail_private.queue_credit_note() from public,anon,authenticated;
create trigger retail_queue_credit_note before insert or update of credit_note_required on public.retail_sale_returns
 for each row execute function retail_private.queue_credit_note();

-- 3. Los pedidos llevan el receptor y, en las notas de crédito, la devolución y la factura asociada.
alter table public.retail_billing_attempts
 add column return_id uuid references public.retail_sale_returns(id),
 add column doc_tipo smallint not null default 99, add column doc_nro bigint not null default 0,
 add column cond_iva_receptor smallint not null default 5, add column receptor_name text,
 add column asoc jsonb;
drop index public.retail_billing_attempts_one_open_per_sale;
drop index public.retail_billing_attempts_one_invoice_per_sale;
create unique index retail_billing_attempts_one_open_per_sale on public.retail_billing_attempts(sale_id) where status in ('reserved','sent') and return_id is null;
create unique index retail_billing_attempts_one_open_per_return on public.retail_billing_attempts(return_id) where status in ('reserved','sent') and return_id is not null;
create unique index retail_billing_attempts_one_invoice_per_sale on public.retail_billing_attempts(sale_id,environment) where status='authorized' and return_id is null;
create unique index retail_billing_attempts_one_note_per_return on public.retail_billing_attempts(return_id,environment) where status='authorized' and return_id is not null;

-- 4. Turno por punto de venta y tipo: libre, ocupado o con un pedido anterior para consultar en ARCA.
create function retail_private.billing_claim(p_store uuid,p_env text,p_pto integer,p_tipo smallint,p_cuit text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_open public.retail_billing_attempts;
begin
 select * into v_open from public.retail_billing_attempts
  where store_id=p_store and environment=p_env and pto_vta=p_pto and cbte_tipo=p_tipo and status in ('reserved','sent') for update;
 if not found then return null; end if;
 if v_open.lease_until>now() then return jsonb_build_object('state','busy'); end if;
 if v_open.status='reserved' then
  update public.retail_billing_attempts set status='cancelled',error='Se cortó antes de pedir el CAE',resolved_at=now() where id=v_open.id;
  return null;
 end if;
 update public.retail_billing_attempts set lease_until=now()+interval '3 minutes' where id=v_open.id returning * into v_open;
 return jsonb_build_object('state','recover','attempt',to_jsonb(v_open),'cuit',p_cuit);
end $$;
revoke all on function retail_private.billing_claim(uuid,text,integer,smallint,text) from public,anon,authenticated;

-- 5. Factura de una venta, con el cliente como receptor si la venta tiene uno.
create or replace function public.retail_billing_begin(p_store uuid,p_sale uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_store public.retail_stores; v_customer public.retail_customers; v_env text; v_tipo smallint;
 v_claim jsonb; v_neto numeric(14,2); v_iva numeric(14,2); v_attempt public.retail_billing_attempts; v_cuit text;
 v_doc_tipo smallint:=99; v_doc_nro bigint:=0; v_cond smallint:=5; v_name text;
begin
 if not (retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Sin permiso para facturar en este comercio' using errcode='42501';
 end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada. Si se cobró sin conexión, sincronizá antes de facturar'; end if;
 if v_sale.billing_status='authorized' then
  return jsonb_build_object('state','authorized','cae',v_sale.cae,'cae_vto',v_sale.cae_vto,'cbte_nro',v_sale.cbte_nro,'cbte_tipo',v_sale.cbte_tipo);
 end if;
 if v_sale.return_status='voided' then return jsonb_build_object('state','voided'); end if;
 if v_sale.billing_status='none' then return jsonb_build_object('state','skip'); end if;
 select * into v_store from public.retail_stores where id=p_store;
 if not v_store.billing_enabled then return jsonb_build_object('state','skip','error','La facturación electrónica está desactivada'); end if;
 if v_store.condicion_iva not in ('RI','MO') then return jsonb_build_object('state','skip','error','Los comercios exentos todavía no emiten comprobante desde la app'); end if;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if v_env is null then return jsonb_build_object('state','error','error','Falta cargar el certificado de ARCA en Mi comercio'); end if;
 if coalesce(v_sale.total,0)<=0 then return jsonb_build_object('state','error','error','La venta no tiene importe para facturar'); end if;

 -- Receptor: el cliente de la venta, si tiene documento cargado. Si no, consumidor final.
 if v_sale.customer_id is not null then
  select * into v_customer from public.retail_customers where id=v_sale.customer_id and store_id=p_store;
  if v_customer.tax_id is not null then
   v_doc_tipo:=case v_customer.tax_id_type when 'CUIT' then 80 when 'CUIL' then 86 else 96 end;
   v_doc_nro:=v_customer.tax_id::bigint; v_name:=coalesce(v_customer.business_name,v_customer.name);
  end if;
  v_cond:=case v_customer.iva_condition when 'RI' then 1 when 'MO' then 6 when 'EX' then 4 else 5 end;
 end if;
 if v_store.condicion_iva='RI' then
  -- A Responsables Inscriptos y Monotributistas, Factura A con su CUIT. Al resto, Factura B.
  if v_cond in (1,6) then
   if v_doc_tipo<>80 then return jsonb_build_object('state','error','error','Para Factura A cargá el CUIT del cliente en Clientes'); end if;
   v_tipo:=1;
  else v_tipo:=6; end if;
 else v_tipo:=11; end if;

 v_cuit:=regexp_replace(v_store.cuit,'\D','','g');
 v_claim:=retail_private.billing_claim(p_store,v_env,v_store.punto_venta_afip,v_tipo,v_cuit);
 if v_claim is not null then return v_claim; end if;
 if v_tipo in (1,6) then v_neto:=round(v_sale.total/1.21,2); v_iva:=v_sale.total-v_neto; else v_neto:=v_sale.total; v_iva:=0; end if;
 insert into public.retail_billing_attempts(store_id,sale_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,lease_until,requested_by,
  doc_tipo,doc_nro,cond_iva_receptor,receptor_name)
 values(p_store,p_sale,v_env,v_store.punto_venta_afip,v_tipo,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_sale.total,v_neto,v_iva,now()+interval '3 minutes',auth.uid(),v_doc_tipo,v_doc_nro,v_cond,v_name) returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',v_cuit);
end $$;

-- 6. Nota de crédito de una devolución: mismo receptor que la factura y la factura como comprobante asociado.
create function public.retail_billing_begin_credit(p_store uuid,p_return uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_return public.retail_sale_returns; v_sale public.retail_sales; v_store public.retail_stores; v_original public.retail_billing_attempts;
 v_role text:=retail_private.role_for(p_store); v_env text; v_tipo smallint; v_claim jsonb; v_neto numeric(14,2); v_iva numeric(14,2);
 v_attempt public.retail_billing_attempts; v_cuit text; v_pto integer;
begin
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales') and not retail_private.has_permission(p_store,'attach_invoice')) then
  raise exception 'Tu perfil no permite emitir notas de crédito' using errcode='42501';
 end if;
 select * into v_return from public.retail_sale_returns where id=p_return and store_id=p_store for update;
 if not found then raise exception 'Devolución no encontrada'; end if;
 select * into v_sale from public.retail_sales where id=v_return.sale_id for update;
 if v_role not in ('owner','admin') and v_sale.created_by<>auth.uid() and not retail_private.can_review_sales(p_store,v_sale.shift_id) then
  raise exception 'Sin acceso a esta venta' using errcode='42501';
 end if;
 if v_return.credit_note_status='authorized' then
  return jsonb_build_object('state','authorized','cae',v_return.cae,'cae_vto',v_return.cae_vto,'cbte_nro',v_return.cbte_nro,'cbte_tipo',v_return.cbte_tipo);
 end if;
 if not v_return.credit_note_required or v_return.credit_note_reference is not null then return jsonb_build_object('state','skip'); end if;
 if v_sale.billing_status<>'authorized' then return jsonb_build_object('state','error','error','La venta todavía no tiene factura'); end if;
 select * into v_store from public.retail_stores where id=p_store;
 select arca_environment into v_env from retail_private.store_billing_credentials where store_id=p_store;
 if v_env is null then return jsonb_build_object('state','error','error','Falta cargar el certificado de ARCA en Mi comercio'); end if;
 v_tipo:=case v_sale.cbte_tipo when 1 then 3 when 6 then 8 when 11 then 13 end;
 if v_tipo is null then return jsonb_build_object('state','error','error','La factura de esta venta no admite nota de crédito desde la app'); end if;
 select * into v_original from public.retail_billing_attempts
  where sale_id=v_sale.id and return_id is null and status='authorized' order by resolved_at desc limit 1;
 if found and v_original.environment<>v_env then
  return jsonb_build_object('state','error','error','La factura se emitió en otro entorno de ARCA. Volvé a ese entorno para anularla');
 end if;
 v_pto:=coalesce(v_original.pto_vta,v_store.punto_venta_afip);
 v_cuit:=regexp_replace(v_store.cuit,'\D','','g');
 v_claim:=retail_private.billing_claim(p_store,v_env,v_pto,v_tipo,v_cuit);
 if v_claim is not null then return v_claim; end if;
 if v_tipo in (3,8) then v_neto:=round(v_return.total/1.21,2); v_iva:=v_return.total-v_neto; else v_neto:=v_return.total; v_iva:=0; end if;
 insert into public.retail_billing_attempts(store_id,sale_id,return_id,environment,pto_vta,cbte_tipo,cbte_fch,imp_total,imp_neto,imp_iva,lease_until,requested_by,
  doc_tipo,doc_nro,cond_iva_receptor,receptor_name,asoc)
 values(p_store,v_sale.id,p_return,v_env,v_pto,v_tipo,(now() at time zone 'America/Argentina/Buenos_Aires')::date,
  v_return.total,v_neto,v_iva,now()+interval '3 minutes',auth.uid(),
  coalesce(v_sale.receptor_doc_tipo,99),coalesce(v_sale.receptor_doc_nro,0),coalesce(v_sale.receptor_iva,5),v_sale.receptor_name,
  -- Las facturas emitidas antes de este circuito no tienen fecha guardada: se asocian sin fecha.
  jsonb_strip_nulls(jsonb_build_object('tipo',v_sale.cbte_tipo,'pto_vta',v_pto,'nro',v_sale.cbte_nro,'cuit',v_cuit,'fecha',v_original.cbte_fch)))
 returning * into v_attempt;
 return jsonb_build_object('state','issue','attempt',to_jsonb(v_attempt),'cuit',v_cuit);
end $$;

-- 7. Resultado: la factura actualiza la venta y la nota de crédito actualiza la devolución.
create or replace function public.retail_billing_finish(p_attempt uuid,p_result text,p_cae text default null,p_cae_vto date default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v public.retail_billing_attempts; v_sale public.retail_sales; v_return public.retail_sale_returns;
 v_error text:=left(nullif(trim(coalesce(p_error,'')),''),500); v_current_cae text; v_done boolean; v_note boolean;
begin
 if p_result not in ('authorized','rejected','not_issued','cancelled','unknown','conflict') then raise exception 'Resultado inválido'; end if;
 select * into v from public.retail_billing_attempts where id=p_attempt for update;
 if not found then raise exception 'Pedido de facturación no encontrado'; end if;
 v_note:=v.return_id is not null;
 select * into v_sale from public.retail_sales where id=v.sale_id for update;
 if v_note then
  select * into v_return from public.retail_sale_returns where id=v.return_id for update;
  v_done:=v_return.credit_note_status='authorized'; v_current_cae:=v_return.cae;
 else
  v_done:=v_sale.billing_status='authorized'; v_current_cae:=v_sale.cae;
 end if;

 if p_result='authorized' then
  if nullif(trim(coalesce(p_cae,'')),'') is null or p_cae_vto is null or v.cbte_nro is null then raise exception 'Faltan el CAE, su vencimiento o el número'; end if;
  if v.status='authorized' then return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cbte_tipo',v.cbte_tipo,'cae',v.cae,'cae_vto',v.cae_vto); end if;
  if v_done and v_current_cae is distinct from trim(p_cae) then
   update public.retail_billing_attempts set status='conflict',cae=trim(p_cae),cae_vto=p_cae_vto,resolved_at=now(),
    error='Ya tenía comprobante y ARCA autorizó otro: corresponde anularlo con nota de crédito' where id=v.id;
   return jsonb_build_object('state','conflict','error','Quedaron dos comprobantes en ARCA para lo mismo. Hay que anular uno con nota de crédito');
  end if;
  update public.retail_billing_attempts set status='authorized',cae=trim(p_cae),cae_vto=p_cae_vto,error=null,resolved_at=now() where id=v.id;
  if v_note then
   update public.retail_sale_returns set credit_note_status='authorized',cbte_tipo=v.cbte_tipo,cbte_nro=v.cbte_nro,cae=trim(p_cae),cae_vto=p_cae_vto,
    credit_note_error=null,credit_note_reference=case v.cbte_tipo when 3 then 'NC A ' when 8 then 'NC B ' else 'NC C ' end
     ||lpad(v.pto_vta::text,5,'0')||'-'||lpad(v.cbte_nro::text,8,'0')
   where id=v.return_id;
  else
   update public.retail_sales set billing_status='authorized',cbte_tipo=v.cbte_tipo,cbte_nro=v.cbte_nro,cae=trim(p_cae),cae_vto=p_cae_vto,billing_error=null,
    receptor_doc_tipo=v.doc_tipo,receptor_doc_nro=v.doc_nro,receptor_name=v.receptor_name,receptor_iva=v.cond_iva_receptor
   where id=v.sale_id;
  end if;
  return jsonb_build_object('state','authorized','cbte_nro',v.cbte_nro,'cbte_tipo',v.cbte_tipo,'cae',trim(p_cae),'cae_vto',p_cae_vto);
 end if;

 if v.status not in ('reserved','sent') then return jsonb_build_object('state',v.status); end if;
 if p_result='unknown' then
  -- Se deja en curso: el próximo pedido para este punto de venta lo consulta en ARCA antes de seguir.
  if v.status<>'sent' then raise exception 'Solo un pedido enviado puede quedar sin respuesta'; end if;
  update public.retail_billing_attempts set error=coalesce(v_error,'ARCA no respondió') where id=v.id;
  v_error:='ARCA no respondió. Antes de reintentar se revisa si el comprobante quedó hecho';
 else
  update public.retail_billing_attempts set status=p_result,error=v_error,resolved_at=now() where id=v.id;
  v_error:=coalesce(v_error,case when p_result in ('rejected','conflict') then 'ARCA rechazó el comprobante' else 'No se pudo pedir el CAE. Se reintenta' end);
 end if;
 if not v_done then
  if v_note then
   update public.retail_sale_returns set credit_note_status=case when p_result in ('rejected','conflict') then 'error' else 'retry' end,credit_note_error=v_error where id=v.return_id;
  else
   update public.retail_sales set billing_status=case when p_result in ('rejected','conflict') then 'error' else 'retry' end,billing_error=v_error,
    billing_attempts=least(billing_attempts+1,32767) where id=v.sale_id;
  end if;
 end if;
 return jsonb_build_object('state',case when p_result in ('rejected','conflict') then 'error' else 'retry' end,'error',v_error);
end $$;

-- 8. Factura a nombre de un cliente: se elige antes de facturar, también en ventas que no son fiadas.
create function public.retail_set_sale_receptor(p_store uuid,p_sale uuid,p_customer uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_sale public.retail_sales; v_customer public.retail_customers;
begin
 if not (retail_private.has_permission(p_store,'sell') or retail_private.has_permission(p_store,'view_sales')) then
  raise exception 'Sin permiso para facturar en este comercio' using errcode='42501';
 end if;
 select * into v_sale from public.retail_sales where id=p_sale and store_id=p_store for update;
 if not found then raise exception 'Venta no encontrada'; end if;
 if v_sale.billing_status='authorized' then raise exception 'La factura ya se emitió. Para cambiar el cliente, anulá la venta y cobrala de nuevo'; end if;
 if v_sale.billing_status='none' or v_sale.return_status='voided' then raise exception 'Esta venta no se factura'; end if;
 if exists(select 1 from public.retail_billing_attempts where sale_id=p_sale and return_id is null and status in ('reserved','sent')) then
  raise exception 'Se está facturando en este momento. Probá en unos minutos';
 end if;
 if exists(select 1 from public.retail_customer_movements where sale_id=p_sale and kind='sale') and p_customer is distinct from v_sale.customer_id then
  raise exception 'En una venta fiada la factura va a nombre del cliente de la cuenta';
 end if;
 if p_customer is not null then
  select * into v_customer from public.retail_customers where id=p_customer and store_id=p_store;
  if not found or not v_customer.active then raise exception 'Cliente no disponible'; end if;
 end if;
 update public.retail_sales set customer_id=p_customer,customer_name=v_customer.name where id=p_sale;
end $$;

-- 9. La nota de crédito a mano queda para devoluciones anteriores o rechazadas, nunca mientras la app la está emitiendo.
create or replace function public.retail_attach_credit_note(p_store uuid,p_return uuid,p_reference text) returns void
language plpgsql security definer set search_path='' as $$
declare v_role text:=retail_private.role_for(p_store);
begin
 if v_role is null or (v_role not in ('owner','admin') and not retail_private.has_permission(p_store,'refund_sales') and not retail_private.has_permission(p_store,'attach_invoice')) then
  raise exception 'Tu perfil no permite cargar notas de crédito' using errcode='42501';
 end if;
 if p_reference is null or length(btrim(p_reference)) not between 1 and 120 then raise exception 'Escribí el número de la nota de crédito'; end if;
 if exists(select 1 from public.retail_billing_attempts where return_id=p_return and status in ('reserved','sent','authorized')) then
  raise exception 'La nota de crédito se está emitiendo o ya se emitió desde la app';
 end if;
 update public.retail_sale_returns set credit_note_reference=btrim(p_reference),credit_note_status='none',credit_note_error=null
  where id=p_return and store_id=p_store and credit_note_required and credit_note_status<>'authorized'
   and exists(select 1 from public.retail_sales s where s.id=sale_id and (v_role in ('owner','admin') or s.created_by=auth.uid() or retail_private.can_review_sales(p_store,s.shift_id)));
 if not found then raise exception 'Devolución no disponible'; end if;
end $$;

revoke all on function public.retail_billing_begin(uuid,uuid),public.retail_billing_begin_credit(uuid,uuid),public.retail_billing_finish(uuid,text,text,date,text),
 public.retail_set_sale_receptor(uuid,uuid,uuid),public.retail_attach_credit_note(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.retail_billing_begin(uuid,uuid),public.retail_billing_begin_credit(uuid,uuid),public.retail_set_sale_receptor(uuid,uuid,uuid),
 public.retail_attach_credit_note(uuid,uuid,text) to authenticated;
grant execute on function public.retail_billing_finish(uuid,text,text,date,text) to service_role;

notify pgrst,'reload schema';
$retail_source_11f4d758d7e2d014$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030003_billing_receptor_credit_notes.sql','11f4d758d7e2d014c69e8f101ee0bd938f3fe4c6784e9b3cb936e37cf34a4395','schema');
 end if;
end;

-- 73/84: 202611030004_platform_admin_catalog.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030004_platform_admin_catalog.sql') then
  raise notice 'Aplicando 202611030004_platform_admin_catalog.sql';
  execute replace($retail_source_df0715207f6ad9f3$
-- 1. Quiénes administran la plataforma. Sin acceso desde la API.
create table retail_private.platform_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 note text check (note is null or length(note)<=200),
 created_at timestamptz not null default now()
);
revoke all on retail_private.platform_admins from public,anon,authenticated;

create function retail_private.is_platform_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from retail_private.platform_admins where user_id=(select auth.uid()));
$$;
revoke all on function retail_private.is_platform_admin() from public,anon;
grant execute on function retail_private.is_platform_admin() to authenticated;

-- Para que la app sepa si mostrar herramientas de plataforma. Mostrar no da permiso: cada función vuelve a validar.
create function public.retail_is_platform_admin() returns boolean
language sql stable security definer set search_path='' as $$
 select retail_private.is_platform_admin();
$$;
revoke all on function public.retail_is_platform_admin() from public,anon;
grant execute on function public.retail_is_platform_admin() to authenticated;

-- 2. Sin escritura directa: antes cualquier usuario con sesión podía insertar o cambiar filas, incluido source y confianza.
drop policy if exists global_catalog_insert on public.retail_global_catalog;
drop policy if exists global_catalog_update on public.retail_global_catalog;
revoke insert,update,delete,truncate on public.retail_global_catalog from public,anon,authenticated;

-- 3. Aporte de los comercios: misma lógica que 202610070001, pero 'verified' solo para administradores de plataforma.
create or replace function public.retail_contribute_catalog(
  p_code text,
  p_name text,
  p_brand text default null,
  p_category text default null,
  p_emoji text default '📦',
  p_source text default 'community'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := trim(p_code);
  v_name text := trim(p_name);
  v_source text;
  v_rec record;
  v_new_count integer;
  v_new_conf numeric(3,2);
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Iniciá sesión para contribuir');
  end if;

  if length(v_code) not between 4 and 20 or length(v_name) not between 1 and 160 then
    return jsonb_build_object('error', 'Datos de producto inválidos');
  end if;

  v_source := case
    when p_source = 'verified' and retail_private.is_platform_admin() then 'verified'
    when p_source = 'ai' then 'ai'
    else 'community'
  end;

  select * into v_rec from public.retail_global_catalog where ean_code = v_code for update;

  if not found then
    insert into public.retail_global_catalog(
      ean_code, name, brand, category_suggestion, emoji, source, contributor_count, confidence_score
    ) values (
      v_code, v_name, trim(p_brand), trim(p_category), coalesce(trim(p_emoji), '📦'),
      v_source, 1, case when v_source = 'verified' then 1.00 else 0.50 end
    );
    return jsonb_build_object('action', 'inserted', 'contributor_count', 1,
      'confidence_score', case when v_source = 'verified' then 1.00 else 0.50 end);
  end if;

  -- Verificados o de alta confianza: sus datos no cambian, solo se cuenta el aporte.
  if v_rec.source = 'verified' or coalesce(v_rec.confidence_score, 0) >= 0.90 then
    update public.retail_global_catalog
    set
      contributor_count = v_rec.contributor_count + 1,
      updated_at = now()
    where ean_code = v_code;

    return jsonb_build_object(
      'action', 'verified_protected',
      'message', 'El producto está verificado y sus datos oficiales no pueden ser alterados',
      'contributor_count', v_rec.contributor_count + 1
    );
  end if;

  -- Comunitarios: nunca sobrescribir datos existentes, solo completar campos vacíos.
  v_new_count := v_rec.contributor_count + 1;
  v_new_conf := least(0.89, round(0.50 + (v_new_count * 0.05), 2));

  update public.retail_global_catalog
  set
    contributor_count = v_new_count,
    confidence_score = v_new_conf,
    name = coalesce(nullif(trim(v_rec.name), ''), v_name),
    brand = coalesce(nullif(trim(v_rec.brand), ''), nullif(trim(p_brand), '')),
    category_suggestion = coalesce(nullif(trim(v_rec.category_suggestion), ''), nullif(trim(p_category), '')),
    emoji = case when v_rec.emoji is not null and v_rec.emoji <> '📦' then v_rec.emoji else coalesce(trim(p_emoji), v_rec.emoji) end,
    updated_at = now()
  where ean_code = v_code;

  return jsonb_build_object('action', 'updated', 'contributor_count', v_new_count, 'confidence_score', v_new_conf);

exception when others then
  return jsonb_build_object('error', sqlerrm);
end;
$$;

revoke all on function public.retail_contribute_catalog(text, text, text, text, text, text) from public, anon;
grant execute on function public.retail_contribute_catalog(text, text, text, text, text, text) to authenticated;

-- 4. Edición del administrador de plataforma: reemplaza los datos del EAN (o lo crea).
-- p_verified true lo deja oficial e inmutable para los comercios; false lo devuelve a comunitario (confianza hasta 0,89).
create function public.retail_admin_save_catalog(
 p_code text, p_name text, p_brand text, p_category text, p_emoji text, p_description text, p_verified boolean
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 code text:=trim(p_code); nm text:=trim(p_name); prior record;
begin
 if not retail_private.is_platform_admin() then raise exception 'Solo un administrador de plataforma puede editar el catálogo global' using errcode='42501'; end if;
 if code is null or length(code) not between 4 and 20 then raise exception 'El código debe tener entre 4 y 20 caracteres'; end if;
 if nm is null or length(nm) not between 1 and 160 then raise exception 'El nombre debe tener entre 1 y 160 caracteres'; end if;
 if p_verified is null then raise exception 'Indicá si el producto queda verificado'; end if;

 select * into prior from public.retail_global_catalog where ean_code=code for update;
 if not found then
  insert into public.retail_global_catalog(ean_code,name,brand,category_suggestion,emoji,description,source,contributor_count,confidence_score)
  values(code,nm,nullif(trim(p_brand),''),nullif(trim(p_category),''),coalesce(nullif(trim(p_emoji),''),'📦'),nullif(trim(p_description),''),
   case when p_verified then 'verified' else 'community' end,1,case when p_verified then 1.00 else 0.50 end);
  return jsonb_build_object('action','inserted','ean_code',code,'verified',p_verified);
 end if;

 update public.retail_global_catalog set
  name=nm,
  brand=nullif(trim(p_brand),''),
  category_suggestion=nullif(trim(p_category),''),
  emoji=coalesce(nullif(trim(p_emoji),''),'📦'),
  description=nullif(trim(p_description),''),
  source=case when p_verified then 'verified' when prior.source='verified' then 'community' else prior.source end,
  confidence_score=case when p_verified then 1.00 else least(coalesce(prior.confidence_score,0.50),0.89) end,
  updated_at=now()
 where ean_code=code;
 return jsonb_build_object('action','updated','ean_code',code,'verified',p_verified);
end;
$$;

-- 5. Borrar un EAN equivocado. Los productos de los comercios no cambian: solo copiaban los datos.
create function public.retail_admin_delete_catalog(p_code text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if not retail_private.is_platform_admin() then raise exception 'Solo un administrador de plataforma puede editar el catálogo global' using errcode='42501'; end if;
 delete from public.retail_global_catalog where ean_code=trim(p_code);
 return found;
end;
$$;

revoke all on function public.retail_admin_save_catalog(text,text,text,text,text,text,boolean),public.retail_admin_delete_catalog(text) from public,anon;
grant execute on function public.retail_admin_save_catalog(text,text,text,text,text,text,boolean),public.retail_admin_delete_catalog(text) to authenticated;

notify pgrst,'reload schema';
$retail_source_df0715207f6ad9f3$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030004_platform_admin_catalog.sql','df0715207f6ad9f380bd672af268ac3fa6f756293bda91c0b02effb41eb8ca7a','schema');
 end if;
end;

-- 74/84: 202611030005_global_catalog_import.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030005_global_catalog_import.sql') then
  raise notice 'Aplicando 202611030005_global_catalog_import.sql';
  execute replace($retail_source_0cdd60b36af298de$
create function public.retail_admin_import_catalog(p_rows jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 r jsonb; ref text; code text; nm text; br text; cat text; emo text; descr text; ver boolean;
 src text; conf numeric(3,2); prior record; known boolean; changed integer;
 inserted integer:=0; updated integer:=0; unchanged integer:=0;
begin
 if not retail_private.is_platform_admin() then raise exception 'Solo un administrador de plataforma puede editar el catálogo global' using errcode='42501'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 1000 then
  raise exception 'Mandá entre 1 y 1.000 filas por vez';
 end if;
 if (select count(distinct trim(value->>'code')) from jsonb_array_elements(p_rows)) <> jsonb_array_length(p_rows) then
  raise exception 'Hay códigos repetidos en el lote';
 end if;

 for r in select value from jsonb_array_elements(p_rows) loop
  ref:=coalesce('Fila '||(r->>'row')||': ','');
  code:=trim(r->>'code');
  if code is null or length(code) not between 4 and 20 then raise exception '%El código debe tener entre 4 y 20 caracteres',ref; end if;
  if r ? 'verified' and jsonb_typeof(r->'verified')<>'boolean' then raise exception '%Verificado debe ser Sí o No',ref; end if;
  ver:=case when r ? 'verified' then (r->>'verified')::boolean end;

  select * into prior from public.retail_global_catalog where ean_code=code for update;
  known:=found;
  nm:=case when r ? 'name' or not known then trim(r->>'name') else prior.name end;
  br:=case when r ? 'brand' then nullif(trim(r->>'brand'),'') else prior.brand end;
  cat:=case when r ? 'category' then nullif(trim(r->>'category'),'') else prior.category_suggestion end;
  emo:=case when r ? 'emoji' then coalesce(nullif(trim(r->>'emoji'),''),'📦') else coalesce(prior.emoji,'📦') end;
  descr:=case when r ? 'description' then nullif(trim(r->>'description'),'') else prior.description end;
  if nm is null or length(nm) not between 1 and 160 then raise exception '%El nombre debe tener entre 1 y 160 caracteres',ref; end if;
  -- Los límites valen para lo que trae la planilla; un dato anterior que no viene no frena la fila.
  if (r ? 'brand' and length(br)>80) or (r ? 'category' and length(cat)>80) then raise exception '%Marca y categoría admiten hasta 80 caracteres',ref; end if;
  if r ? 'emoji' and length(emo)>16 then raise exception '%El emoji es demasiado largo',ref; end if;
  if r ? 'description' and length(descr)>500 then raise exception '%La descripción admite hasta 500 caracteres',ref; end if;

  if not known then
   insert into public.retail_global_catalog(ean_code,name,brand,category_suggestion,emoji,description,source,contributor_count,confidence_score)
   values(code,nm,br,cat,emo,descr,case when ver then 'verified' else 'community' end,1,case when ver then 1.00 else 0.50 end);
   inserted:=inserted+1;
   continue;
  end if;

  src:=case when ver then 'verified' when ver=false and prior.source='verified' then 'community' else prior.source end;
  conf:=case when ver then 1.00 when ver=false then least(coalesce(prior.confidence_score,0.50),0.89) else prior.confidence_score end;
  update public.retail_global_catalog set name=nm,brand=br,category_suggestion=cat,emoji=emo,description=descr,source=src,confidence_score=conf,updated_at=now()
  where ean_code=code
   and (name,brand,category_suggestion,emoji,description,source,confidence_score) is distinct from (nm,br,cat,emo,descr,src,conf);
  get diagnostics changed=row_count;
  if changed>0 then updated:=updated+1; else unchanged:=unchanged+1; end if;
 end loop;

 return jsonb_build_object('inserted',inserted,'updated',updated,'unchanged',unchanged);
end;
$$;

revoke all on function public.retail_admin_import_catalog(jsonb) from public,anon;
grant execute on function public.retail_admin_import_catalog(jsonb) to authenticated;

notify pgrst,'reload schema';
$retail_source_0cdd60b36af298de$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030005_global_catalog_import.sql','0cdd60b36af298deb64a950a27d4d63aab268c27eef093e6add5fb3cb303a9de','schema');
 end if;
end;

-- 75/84: 202611030006_add_products_from_global_catalog.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030006_add_products_from_global_catalog.sql') then
  raise notice 'Aplicando 202611030006_add_products_from_global_catalog.sql';
  execute replace($retail_source_9ec08a8532c21cfb$
-- 1. Sin precio: no a la venta y precio 0. Es distinto de un insumo, que tampoco se vende pero no espera precio.
alter table public.retail_products add column price_pending boolean not null default false;
alter table public.retail_products add constraint retail_products_price_pending check (not price_pending or (not sellable and price=0));

create function retail_private.clear_price_pending() returns trigger
language plpgsql set search_path='' as $$
begin
 if new.sellable then new.price_pending:=false; end if;
 return new;
end $$;
revoke all on function retail_private.clear_price_pending() from public,anon,authenticated;
create trigger retail_clear_price_pending before insert or update of sellable,price_pending on public.retail_products
 for each row execute function retail_private.clear_price_pending();
-- La ficha la apaga al guardar el producto como insumo: ya no espera precio.
grant update(price_pending) on public.retail_products to authenticated;

-- 2. Marcas y categorías del catálogo global, sin distinguir mayúsculas ni espacios.
-- Con una marca elegida, las categorías se cuentan dentro de esa marca, y al revés.
create function public.retail_global_catalog_facets(p_brand text default null,p_category text default null) returns jsonb
language sql stable security definer set search_path='' as $$
 with base as (
  select nullif(btrim(brand),'') brand,nullif(btrim(category_suggestion),'') category from public.retail_global_catalog
 )
 select jsonb_build_object(
  'brands',coalesce((select jsonb_agg(jsonb_build_object('name',name,'count',total) order by lower(name))
   from (select mode() within group (order by brand) name,count(*) total from base
    where brand is not null and (nullif(btrim(p_category),'') is null or lower(category)=lower(btrim(p_category))) group by lower(brand)) b),'[]'::jsonb),
  'categories',coalesce((select jsonb_agg(jsonb_build_object('name',name,'count',total) order by lower(name))
   from (select mode() within group (order by category) name,count(*) total from base
    where category is not null and (nullif(btrim(p_brand),'') is null or lower(brand)=lower(btrim(p_brand))) group by lower(category)) c),'[]'::jsonb));
$$;
revoke all on function public.retail_global_catalog_facets(text,text) from public,anon;
grant execute on function public.retail_global_catalog_facets(text,text) to authenticated;

-- 3. Productos del catálogo global para una marca, una categoría o las dos (hasta 1.000).
create function public.retail_global_catalog_matches(p_brand text,p_category text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_brand text:=nullif(btrim(p_brand),''); v_category text:=nullif(btrim(p_category),''); total integer;
begin
 if v_brand is null and v_category is null then raise exception 'Elegí una marca, una categoría o las dos'; end if;
 select count(*) into total from public.retail_global_catalog
  where (v_brand is null or lower(btrim(brand))=lower(v_brand)) and (v_category is null or lower(btrim(category_suggestion))=lower(v_category));
 return jsonb_build_object('total',total,'items',coalesce((select jsonb_agg(to_jsonb(g) order by lower(g.name),g.ean_code) from (
  select ean_code,name,brand,category_suggestion,emoji,source,confidence_score from public.retail_global_catalog
  where (v_brand is null or lower(btrim(brand))=lower(v_brand)) and (v_category is null or lower(btrim(category_suggestion))=lower(v_category))
  order by lower(name),ean_code limit 1000) g),'[]'::jsonb));
end $$;
revoke all on function public.retail_global_catalog_matches(text,text) from public,anon;
grant execute on function public.retail_global_catalog_matches(text,text) to authenticated;

-- 4. Alta en bloque. Nombre, marca y emoji salen del catálogo global, no del pedido.
-- Un código que el comercio ya tiene (activo o archivado) se omite, así repetir el pedido no duplica.
create function public.retail_add_from_global_catalog(p_store uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 item jsonb; v_code text; v_price numeric; v_cost numeric; v_category uuid; fallback uuid; g record; new_id uuid;
 created integer:=0; priced integer:=0; skipped jsonb:='[]'::jsonb;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then
  raise exception 'Elegí entre 1 y 500 productos por vez';
 end if;
 if (select count(distinct btrim(value->>'code')) from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then
  raise exception 'Hay productos repetidos en el pedido';
 end if;
 select id into fallback from public.retail_categories where store_id=p_store and catalog_name='Varios';

 for item in select value from jsonb_array_elements(p_items) loop
  v_code:=btrim(item->>'code');
  select * into g from public.retail_global_catalog where ean_code=v_code;
  if not found then skipped:=skipped||jsonb_build_object('code',v_code,'reason','not_in_catalog'); continue; end if;

  v_price:=case when jsonb_typeof(item->'price')='number' then (item->>'price')::numeric end;
  v_cost:=case when jsonb_typeof(item->'cost')='number' then (item->>'cost')::numeric else 0 end;
  if v_price is not null and (v_price<=0 or v_price>9999999999 or round(v_price,2)<>v_price) then raise exception 'Revisá el precio de %',g.name; end if;
  if v_cost<0 or v_cost>9999999999 or round(v_cost,2)<>v_cost then raise exception 'Revisá el costo de %',g.name; end if;

  v_category:=null;
  if item->>'category_id' is not null then
   select id into v_category from public.retail_categories where store_id=p_store and id::text=item->>'category_id';
   if v_category is null then raise exception 'La categoría elegida para % no pertenece a este comercio',g.name; end if;
  end if;
  v_category:=coalesce(v_category,fallback);
  if v_category is null then raise exception 'Falta la categoría Varios en este comercio. Actualizá las categorías'; end if;

  insert into public.retail_products(store_id,category_id,code,name,price,cost,stock,emoji,brand,sellable,price_pending)
  values(p_store,v_category,v_code,left(btrim(g.name),160),coalesce(v_price,0),v_cost,0,coalesce(nullif(btrim(g.emoji),''),'📦'),nullif(btrim(g.brand),''),
   v_price is not null,v_price is null)
  on conflict (store_id,code) do nothing
  returning id into new_id;
  if new_id is null then skipped:=skipped||jsonb_build_object('code',v_code,'reason','exists'); continue; end if;
  created:=created+1;
  if v_price is not null then priced:=priced+1; end if;
  new_id:=null;
 end loop;

 return jsonb_build_object('created',created,'priced',priced,'pending',created-priced,'skipped',skipped);
end $$;
revoke all on function public.retail_add_from_global_catalog(uuid,jsonb) from public,anon;
grant execute on function public.retail_add_from_global_catalog(uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
$retail_source_9ec08a8532c21cfb$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030006_add_products_from_global_catalog.sql','9ec08a8532c21cfbb3b06589646916248d74d15840a8d1fef44d4a579436a0ad','schema');
 end if;
end;

-- 76/84: 202611030007_cost_based_pricing.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030007_cost_based_pricing.sql') then
  raise notice 'Aplicando 202611030007_cost_based_pricing.sql';
  execute replace($retail_source_104ebd8f16a2fcde$
-- 1. Configuración del comercio y excepción por producto. Pasos: 0 (centavos), $1, $5, $10, $50 o $100, siempre hacia arriba.
alter table public.retail_stores
 add column price_rounding integer not null default 0 check (price_rounding in (0,1,5,10,50,100)),
 add column default_markup numeric(7,2) not null default 30 check (default_markup between 0 and 10000);
alter table public.retail_stores alter column price_rounding set default 10;
alter table public.retail_products add column price_rounding integer check (price_rounding is null or price_rounding in (0,1,5,10,50,100));
grant update(price_rounding) on public.retail_products to authenticated;

create function retail_private.markup_price(p_cost numeric,p_markup numeric,p_step integer) returns numeric
language sql immutable set search_path='' as $$
 select case when coalesce(p_step,0)>0 then ceil(raw/p_step)*p_step else raw end
 from (select greatest(0.01,round(p_cost*(1+p_markup/100),2)) raw) r;
$$;
revoke all on function retail_private.markup_price(numeric,numeric,integer) from public,anon,authenticated;

create function retail_private.product_rounding(p_store uuid,p_override integer) returns integer
language sql stable security definer set search_path='' as $$
 select coalesce(p_override,(select price_rounding from public.retail_stores where id=p_store),0);
$$;
revoke all on function retail_private.product_rounding(uuid,integer) from public,anon,authenticated;

-- 2. Mismo cálculo que 202610270002, con redondeo. Cambiar porcentaje o redondeo alcanza con editar precios.
create or replace function retail_private.derive_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare calculated numeric;
begin
 if (tg_op='INSERT' and (new.sale_markup is not null or new.price_rounding is not null)) or
  (tg_op='UPDATE' and (new.sale_markup is distinct from old.sale_markup or new.price_rounding is distinct from old.price_rounding)) then
  if not retail_private.has_permission(new.store_id,'edit_prices') then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
 end if;
 if not new.sellable then new.sale_markup:=null; return new; end if;
 if new.sale_markup is null then return new; end if;
 if new.sale_markup not between -99.99 and 10000 then raise exception 'Revisá el porcentaje sobre costo'; end if;
 if new.cost>0 then calculated:=retail_private.markup_price(new.cost,new.sale_markup,retail_private.product_rounding(new.store_id,new.price_rounding)); end if;
 -- A deliberate manual price edit keeps existing price-only/bulk/import flows.
 -- A cost-only change, or a form sending the calculated price, keeps its percent.
 if tg_op='UPDATE' and new.sale_markup is not distinct from old.sale_markup and new.price_rounding is not distinct from old.price_rounding
  and new.price is distinct from old.price and (calculated is null or new.price<>calculated) then
  new.sale_markup:=null; return new;
 end if;
 if calculated is not null then
  if calculated>9999999999 then raise exception 'El precio calculado supera el límite permitido. Revisá costo y porcentaje'; end if;
  new.price:=calculated;
 end if;
 return new;
end $$;

create or replace function retail_private.check_product_markup_price() returns trigger
language plpgsql security definer set search_path='' as $$
declare p public.retail_products;
begin
 select * into p from public.retail_products where id=new.id;
 if found and p.sellable and p.sale_markup is not null then
  if p.cost<=0 or p.price<>retail_private.markup_price(p.cost,p.sale_markup,retail_private.product_rounding(p.store_id,p.price_rounding)) then
   raise exception 'Cargá un costo mayor a cero para calcular el precio principal de %',p.name;
  end if;
 end if;
 return null;
end $$;

-- 3. Igual que 202610220006, salvo que porcentaje y redondeo se cuentan como precio, no como ficha.
create or replace function retail_private.guard_product_capabilities() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then
  if not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'manage_products'); end if;
  return new;
 end if;
 if new.active is distinct from old.active then perform retail_private.require_permission(new.store_id,'delete_products'); end if;
 if new.stock_components is distinct from old.stock_components then perform retail_private.require_permission(new.store_id,'manage_compositions'); end if;
 if (to_jsonb(new)-array['active','stock_components','stock','cost','last_restocked_at','price','sale_markup','price_rounding']) is distinct from
    (to_jsonb(old)-array['active','stock_components','stock','cost','last_restocked_at','price','sale_markup','price_rounding']) and not retail_private.has_permission(new.store_id,'manage_compositions') then
  perform retail_private.require_permission(new.store_id,'manage_products');
 end if;
 if (new.price is distinct from old.price or new.sale_markup is distinct from old.sale_markup or new.price_rounding is distinct from old.price_rounding)
  and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions') then perform retail_private.require_permission(new.store_id,'edit_prices'); end if;
 if (new.stock is distinct from old.stock or new.cost is distinct from old.cost or new.last_restocked_at is distinct from old.last_restocked_at)
  and not retail_private.has_permission(new.store_id,'manage_products') and not retail_private.has_permission(new.store_id,'manage_compositions')
  and not retail_private.has_permission(new.store_id,'review_remitos') then
  -- Checkout consumes stock with the sell permission; the RPC restricts it to
  -- the caller's valid shift and exact cart. REST updates still require product RLS.
  if not retail_private.has_permission(new.store_id,'sell') then perform retail_private.require_permission(new.store_id,'replenish_stock'); end if;
 end if;
 return new;
end $$;

-- 4. Editar el precio por costo: porcentaje y redondeo (null = el del comercio). Devuelve el precio que quedó.
create function public.retail_update_product_pricing(p_store uuid,p_product uuid,p_markup numeric,p_rounding integer,p_expected numeric) returns numeric
language plpgsql security definer set search_path='' as $$
declare product public.retail_products; saved numeric;
begin
 if not retail_private.has_permission(p_store,'edit_prices') then perform retail_private.require_permission(p_store,'manage_products'); end if;
 if p_markup is null or p_markup not between -99.99 and 10000 or round(p_markup,2)<>p_markup then raise exception 'El porcentaje debe estar entre -99,99 y 10.000, con hasta dos decimales'; end if;
 if p_rounding is not null and p_rounding not in (0,1,5,10,50,100) then raise exception 'Elegí un redondeo válido'; end if;
 select * into product from public.retail_products where store_id=p_store and id=p_product and active for update;
 if not found then raise exception 'El producto ya no está disponible'; end if;
 if not product.sellable then raise exception 'Este producto no se vende directamente'; end if;
 if product.cost<=0 then raise exception 'Cargá el costo de % para calcular el precio',product.name; end if;
 if p_expected is null or product.price is distinct from p_expected then raise exception 'El precio cambió en otro dispositivo. Actualizá y revisalo antes de guardar'; end if;
 update public.retail_products set sale_markup=p_markup,price_rounding=p_rounding where id=product.id returning price into saved;
 return saved;
end $$;
revoke all on function public.retail_update_product_pricing(uuid,uuid,numeric,integer,numeric) from public,anon;
grant execute on function public.retail_update_product_pricing(uuid,uuid,numeric,integer,numeric) to authenticated;

-- 5. Ganancia por defecto y redondeo del comercio. Cambiar el redondeo recalcula los precios por costo que
-- usan el del comercio; los manuales y los que tienen su propio redondeo no cambian.
create function public.retail_set_store_pricing(p_store uuid,p_rounding integer,p_default_markup numeric) returns integer
language plpgsql security definer set search_path='' as $$
declare previous integer; repriced integer:=0;
begin
 perform retail_private.require_permission(p_store,'manage_store');
 if p_rounding is null or p_rounding not in (0,1,5,10,50,100) then raise exception 'Elegí un redondeo válido'; end if;
 if p_default_markup is null or p_default_markup not between 0 and 10000 or round(p_default_markup,2)<>p_default_markup then raise exception 'La ganancia por defecto debe estar entre 0 y 10.000%%, con hasta dos decimales'; end if;
 select price_rounding into previous from public.retail_stores where id=p_store for update;
 if not found then raise exception 'Comercio no disponible'; end if;
 update public.retail_stores set price_rounding=p_rounding,default_markup=p_default_markup where id=p_store;
 if previous is distinct from p_rounding then
  if not retail_private.has_permission(p_store,'edit_prices') then perform retail_private.require_permission(p_store,'manage_products'); end if;
  -- Una actualización sin cambios hace que el cálculo vuelva a correr con el redondeo nuevo.
  update public.retail_products set price=price
  where store_id=p_store and sale_markup is not null and sellable and price_rounding is null and cost>0;
  get diagnostics repriced=row_count;
 end if;
 return repriced;
end $$;
revoke all on function public.retail_set_store_pricing(uuid,integer,numeric) from public,anon;
grant execute on function public.retail_set_store_pricing(uuid,integer,numeric) to authenticated;

-- 6. Alta desde el catálogo global (reemplaza la de 202611030006): además de precio manual acepta
-- porcentaje sobre costo, que necesita costo mayor a cero. Sin ninguno de los dos queda «sin precio».
create or replace function public.retail_add_from_global_catalog(p_store uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 item jsonb; v_code text; v_price numeric; v_cost numeric; v_markup numeric; v_category uuid; fallback uuid; g record; new_id uuid;
 created integer:=0; priced integer:=0; skipped jsonb:='[]'::jsonb;
begin
 perform retail_private.require_permission(p_store,'manage_products');
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then
  raise exception 'Elegí entre 1 y 500 productos por vez';
 end if;
 if (select count(distinct btrim(value->>'code')) from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then
  raise exception 'Hay productos repetidos en el pedido';
 end if;
 select id into fallback from public.retail_categories where store_id=p_store and catalog_name='Varios';

 for item in select value from jsonb_array_elements(p_items) loop
  v_code:=btrim(item->>'code');
  select * into g from public.retail_global_catalog where ean_code=v_code;
  if not found then skipped:=skipped||jsonb_build_object('code',v_code,'reason','not_in_catalog'); continue; end if;

  v_price:=case when jsonb_typeof(item->'price')='number' then (item->>'price')::numeric end;
  v_markup:=case when jsonb_typeof(item->'markup')='number' then (item->>'markup')::numeric end;
  v_cost:=case when jsonb_typeof(item->'cost')='number' then (item->>'cost')::numeric else 0 end;
  if v_price is not null and v_markup is not null then raise exception 'Elegí porcentaje o precio manual para %, no los dos',g.name; end if;
  if v_price is not null and (v_price<=0 or v_price>9999999999 or round(v_price,2)<>v_price) then raise exception 'Revisá el precio de %',g.name; end if;
  if v_cost<0 or v_cost>9999999999 or round(v_cost,2)<>v_cost then raise exception 'Revisá el costo de %',g.name; end if;
  if v_markup is not null and (v_markup not between -99.99 and 10000 or round(v_markup,2)<>v_markup) then raise exception 'Revisá el porcentaje de %',g.name; end if;
  if v_markup is not null and v_cost<=0 then raise exception 'Cargá el costo de % para calcular el precio',g.name; end if;

  v_category:=null;
  if item->>'category_id' is not null then
   select id into v_category from public.retail_categories where store_id=p_store and id::text=item->>'category_id';
   if v_category is null then raise exception 'La categoría elegida para % no pertenece a este comercio',g.name; end if;
  end if;
  v_category:=coalesce(v_category,fallback);
  if v_category is null then raise exception 'Falta la categoría Varios en este comercio. Actualizá las categorías'; end if;

  -- Con porcentaje, el precio lo calcula el comercio con su redondeo; 0,01 es solo el valor inicial.
  insert into public.retail_products(store_id,category_id,code,name,price,sale_markup,cost,stock,emoji,brand,sellable,price_pending)
  values(p_store,v_category,v_code,left(btrim(g.name),160),case when v_markup is not null then 0.01 else coalesce(v_price,0) end,v_markup,v_cost,0,
   coalesce(nullif(btrim(g.emoji),''),'📦'),nullif(btrim(g.brand),''),v_price is not null or v_markup is not null,v_price is null and v_markup is null)
  on conflict (store_id,code) do nothing
  returning id into new_id;
  if new_id is null then skipped:=skipped||jsonb_build_object('code',v_code,'reason','exists'); continue; end if;
  created:=created+1;
  if v_price is not null or v_markup is not null then priced:=priced+1; end if;
  new_id:=null;
 end loop;

 return jsonb_build_object('created',created,'priced',priced,'pending',created-priced,'skipped',skipped);
end $$;

notify pgrst,'reload schema';
$retail_source_104ebd8f16a2fcde$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030007_cost_based_pricing.sql','104ebd8f16a2fcde040330f72d208b53386c07ff2f6c0a3cf387ed04272fe4bd','schema');
 end if;
end;

-- 77/84: 202611030008_bulk_markup_adjust.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611030008_bulk_markup_adjust.sql') then
  raise notice 'Aplicando 202611030008_bulk_markup_adjust.sql';
  execute replace($retail_source_68a2967522d593e1$
create function public.retail_bulk_update_pricing(p_store uuid,p_items jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare item jsonb; product public.retail_products; v_id uuid; v_markup numeric; v_rounding integer;
 updated integer:=0; skipped jsonb:='[]'::jsonb;
begin
 if not retail_private.has_permission(p_store,'edit_prices') then perform retail_private.require_permission(p_store,'manage_products'); end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 500 then
  raise exception 'Ajustá entre 1 y 500 productos por vez';
 end if;
 for item in select value from jsonb_array_elements(p_items) loop
  begin v_id:=(item->>'id')::uuid; exception when others then raise exception 'Producto inválido en el ajuste'; end;
  v_markup:=case when jsonb_typeof(item->'markup')='number' then (item->>'markup')::numeric end;
  if v_markup is null or v_markup not between -99.99 and 10000 or round(v_markup,2)<>v_markup then raise exception 'Revisá la ganancia: debe estar entre -99,99 y 10.000%%, con hasta dos decimales'; end if;
  if item ? 'rounding' then
   v_rounding:=case when jsonb_typeof(item->'rounding')='number' then (item->>'rounding')::integer end;
   if v_rounding is not null and v_rounding not in (0,1,5,10,50,100) then raise exception 'Elegí un redondeo válido'; end if;
  end if;
  select * into product from public.retail_products where store_id=p_store and id=v_id and active for update;
  if not found or not product.sellable then skipped:=skipped||jsonb_build_object('id',v_id,'reason','unavailable'); continue; end if;
  if product.cost<=0 then skipped:=skipped||jsonb_build_object('id',v_id,'reason','no_cost'); continue; end if;
  if jsonb_typeof(item->'expected')<>'number' or product.price<>(item->>'expected')::numeric then
   skipped:=skipped||jsonb_build_object('id',v_id,'reason','changed'); continue;
  end if;
  update public.retail_products set sale_markup=v_markup,
   price_rounding=case when item ? 'rounding' then v_rounding else price_rounding end
  where id=product.id;
  updated:=updated+1;
 end loop;
 return jsonb_build_object('updated',updated,'skipped',skipped);
end $$;
revoke all on function public.retail_bulk_update_pricing(uuid,jsonb) from public,anon;
grant execute on function public.retail_bulk_update_pricing(uuid,jsonb) to authenticated;

notify pgrst,'reload schema';
$retail_source_68a2967522d593e1$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611030008_bulk_markup_adjust.sql','68a2967522d593e16d155d2d1202fa7ce55aa0d4c33dd2f4724a5c1f06c67044','schema');
 end if;
end;

-- 78/84: 202611040001_product_price_history.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611040001_product_price_history.sql') then
  raise notice 'Aplicando 202611040001_product_price_history.sql';
  execute replace($retail_source_6e782e7b1aa273f8$
create function public.retail_product_price_history(p_store uuid,p_product uuid,p_from date default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare product public.retail_products; zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; first_change timestamptz;
begin
 if not retail_private.has_permission(p_store,'edit_prices') and not retail_private.has_permission(p_store,'manage_products') then
  raise exception 'Necesitás permiso para editar precios o productos' using errcode='42501';
 end if;
 select * into product from public.retail_products where store_id=p_store and id=p_product;
 if not found then raise exception 'El producto no está disponible'; end if;
 v_from:=coalesce(p_from::timestamp at time zone zone,'-infinity'::timestamptz);
 select min(at) into first_change from public.retail_audit_log
  where store_id=p_store and entity='Producto' and entity_id=p_product::text and (after ?| array['price','cost','sale_markup']);

 return jsonb_build_object(
  'product',jsonb_build_object('name',product.name,'price',product.price,'cost',product.cost,'sale_markup',product.sale_markup,
   'sellable',product.sellable,'price_pending',product.price_pending),
  'tracked_since',first_change,
  'changes',coalesce((select jsonb_agg(jsonb_build_object('at',a.at,'actor',a.actor_email,'before',a.before,'after',a.after) order by a.at)
   from (select at,actor_email,before,after from public.retail_audit_log
    where store_id=p_store and entity='Producto' and entity_id=p_product::text and at>=v_from and (after ?| array['price','cost','sale_markup'])
    order by at desc limit 1000) a),'[]'::jsonb),
  'restocks',coalesce((select jsonb_agg(jsonb_build_object('at',m.occurred_at,'cost',m.cost,'qty',m.delta,'actor',m.email) order by m.occurred_at)
   from (select sm.occurred_at,sm.cost,sm.delta,u.email from public.retail_stock_movements sm left join auth.users u on u.id=sm.user_id
    where sm.store_id=p_store and sm.product_id=p_product and sm.cost is not null and sm.occurred_at>=v_from
    order by sm.occurred_at desc limit 1000) m),'[]'::jsonb),
  -- El precio más cobrado de cada día (las listas por sucursal pueden dar otros importes el mismo día).
  'sales',coalesce((select jsonb_agg(jsonb_build_object('day',d.day,'price',d.price,'qty',d.qty) order by d.day)
   from (select (s.created_at at time zone zone)::date as day,mode() within group (order by (i->>'unitPrice')::numeric) as price,sum((i->>'qty')::numeric) as qty
    from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
    where s.store_id=p_store and s.created_at>=v_from and s.created_at<coalesce(first_change,'infinity'::timestamptz)
     and coalesce(s.return_status,'none')<>'voided' and i->>'productId'=p_product::text and jsonb_typeof(i->'unitPrice')='number'
    group by 1 order by 1 desc limit 400) d),'[]'::jsonb)
 );
end $$;
revoke all on function public.retail_product_price_history(uuid,uuid,date) from public,anon;
grant execute on function public.retail_product_price_history(uuid,uuid,date) to authenticated;

notify pgrst,'reload schema';
$retail_source_6e782e7b1aa273f8$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611040001_product_price_history.sql','6e782e7b1aa273f8dbe3e245113a00722ce21c988b5a58d1a040f9100f287006','schema');
 end if;
end;

-- 79/84: 202611040002_price_index_by_group.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611040002_price_index_by_group.sql') then
  raise notice 'Aplicando 202611040002_price_index_by_group.sql';
  execute replace($retail_source_b22129d025e8d2a9$
create function public.retail_price_index(p_store uuid,p_group_kind text,p_groups text[],p_period text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_start timestamptz; v_step interval; v_now timestamptz:=now(); tracked timestamptz;
begin
 if not retail_private.has_permission(p_store,'edit_prices') and not retail_private.has_permission(p_store,'manage_products') then
  raise exception 'Necesitás permiso para editar precios o productos' using errcode='42501';
 end if;
 if p_group_kind not in ('all','category','brand','supplier') then raise exception 'Agrupación inválida'; end if;
 if p_group_kind<>'all' and (p_groups is null or cardinality(p_groups) not between 1 and 4) then raise exception 'Elegí entre 1 y 4 grupos para comparar'; end if;
 case p_period
  when '3m' then v_start:=date_trunc('day',(v_now at time zone zone)-interval '3 months') at time zone zone; v_step:=interval '1 week';
  when '6m' then v_start:=date_trunc('day',(v_now at time zone zone)-interval '6 months') at time zone zone; v_step:=interval '1 week';
  when '1y' then v_start:=date_trunc('day',(v_now at time zone zone)-interval '12 months') at time zone zone; v_step:=interval '1 month';
  else raise exception 'Período inválido';
 end case;
 select min(at) into tracked from public.retail_audit_log where store_id=p_store and entity='Producto' and (after ?| array['price','cost']);

 return (with
  prods as (
   select p.id,p.name,p.price,p.cost,
    case p_group_kind when 'all' then 'all' when 'category' then p.category_id::text
     when 'brand' then lower(btrim(p.brand)) else lower(btrim(p.supplier)) end as grp,
    case p_group_kind when 'all' then 'Todo el comercio' when 'category' then coalesce(c.name,'Sin categoría')
     when 'brand' then btrim(p.brand) else btrim(p.supplier) end as label
   from public.retail_products p left join public.retail_categories c on c.store_id=p.store_id and c.id=p.category_id
   where p.store_id=p_store and p.active and p.sellable
  ),
  chosen as (
   select * from prods where p_group_kind='all' or grp=any(array(select lower(btrim(g)) from unnest(p_groups) g))
  ),
  changes as (
   select a.entity_id::uuid as pid,a.at,a.before,a.after from public.retail_audit_log a
   where a.store_id=p_store and a.entity='Producto' and a.at>=v_start and (a.after ?| array['price','cost'])
    and a.entity_id in (select id::text from chosen)
  ),
  restocks as (
   select distinct on (m.product_id,m.occurred_at) m.product_id as pid,m.occurred_at as at,m.cost from public.retail_stock_movements m
   where m.store_id=p_store and m.cost is not null and m.product_id in (select id from chosen)
   order by m.product_id,m.occurred_at,m.recorded_at desc
  ),
  units as (
   select (i->>'productId')::uuid as pid,sum((i->>'qty')::numeric) as qty
   from public.retail_sales s cross join lateral jsonb_array_elements(s.items) i
   where s.store_id=p_store and s.created_at>=v_start and coalesce(s.return_status,'none')<>'voided'
    and i->>'productId' in (select id::text from chosen)
   group by 1
  ),
  buckets as (
   select t from generate_series(v_start,v_now,v_step) t
   union select v_now
  ),
  -- Tramos: cada «antes» rige desde el cambio anterior hasta ese cambio. Se cruzan por producto, no fila por fila.
  price_seg as (
   select pid,lag(at) over (partition by pid order by at) as from_t,at as to_t,(before->>'price')::numeric as v from changes where after ? 'price'
  ),
  cost_seg as (
   select pid,lag(at) over (partition by pid order by at) as from_t,at as to_t,(before->>'cost')::numeric as v from changes where after ? 'cost'
  ),
  restock_seg as (
   select pid,at as from_t,lead(at) over (partition by pid order by at) as to_t,cost as v from restocks
  ),
  grid as (
   select ch.id,ch.grp,b.t,1+coalesce(u.qty,0) as w,
    coalesce(ps.v,ch.price) as price,
    -- Antes del registro, una reposición posterior con otro costo indica que el costo de ese momento era el de la reposición anterior.
    coalesce(cs.v,case when rs.to_t is not null and rs.to_t<coalesce(tracked,'infinity'::timestamptz) then rs.v end,ch.cost) as cost
   from chosen ch cross join buckets b
   left join units u on u.pid=ch.id
   left join price_seg ps on ps.pid=ch.id and b.t<ps.to_t and (ps.from_t is null or b.t>=ps.from_t)
   left join cost_seg cs on cs.pid=ch.id and b.t<cs.to_t and (cs.from_t is null or b.t>=cs.from_t)
   left join restock_seg rs on rs.pid=ch.id and b.t>=rs.from_t and (rs.to_t is null or b.t<rs.to_t)
  ),
  based as (
   select g.*,first_value(g.price) over w as price0,first_value(g.cost) over w as cost0
   from grid g window w as (partition by g.id order by g.t)
  ),
  points as (
   select grp,t,
    round(100*sum(w*price/price0) filter (where price0>0 and price>0)/nullif(sum(w) filter (where price0>0 and price>0),0),2) as price_index,
    round(100*sum(w*cost/cost0) filter (where cost0>0 and cost>0)/nullif(sum(w) filter (where cost0>0 and cost>0),0),2) as cost_index,
    round(100*sum(w*(price/cost-1)) filter (where price>0 and cost>0)/nullif(sum(w) filter (where price>0 and cost>0),0),2) as markup
   from based group by grp,t
  ),
  movers as (
   select ch.id,ch.name,ch.label,
    round(100*(ch.price/nullif(b.price0,0)-1),2) as price_change,
    round(100*(ch.cost/nullif(b.cost0,0)-1),2) as cost_change,
    coalesce(u.qty,0) as qty
   from chosen ch join (select distinct on (id) id,price0,cost0 from based order by id,t) b on b.id=ch.id left join units u on u.pid=ch.id
  )
  select jsonb_build_object(
   'start',v_start,'tracked_since',tracked,
   'groups',coalesce((select jsonb_agg(jsonb_build_object('key',k.grp,'label',k.label,'products',k.n,
     'points',(select jsonb_agg(jsonb_build_object('t',p.t,'price',p.price_index,'cost',p.cost_index,'markup',p.markup) order by p.t) from points p where p.grp=k.grp))
     order by k.label)
    from (select grp,mode() within group (order by label) as label,count(*) as n from chosen group by grp) k),'[]'::jsonb),
   'movers',coalesce((select jsonb_agg(to_jsonb(m) order by greatest(abs(coalesce(m.cost_change,0)),abs(coalesce(m.price_change,0))) desc)
    from (select * from movers where coalesce(price_change,0)<>0 or coalesce(cost_change,0)<>0
     order by greatest(abs(coalesce(cost_change,0)),abs(coalesce(price_change,0))) desc limit 20) m),'[]'::jsonb)
  ));
end $$;
revoke all on function public.retail_price_index(uuid,text,text[],text) from public,anon;
grant execute on function public.retail_price_index(uuid,text,text[],text) to authenticated;

notify pgrst,'reload schema';
$retail_source_b22129d025e8d2a9$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611040002_price_index_by_group.sql','b22129d025e8d2a95256934157e503dcaa65157223b1359485363655ef8d69d3','schema');
 end if;
end;

-- 80/84: 202611040003_reconciliation_sales_detail.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611040003_reconciliation_sales_detail.sql') then
  raise notice 'Aplicando 202611040003_reconciliation_sales_detail.sql';
  execute replace($retail_source_dbc90b884f7104bc$
create function public.retail_reconciliation_detail(p_store uuid,p_from date,p_to date,p_method text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz;
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 if p_method not in ('QR','Debito','Credito','Transferencia') then raise exception 'Medio de pago inválido'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 return (with rows as (
  select 'sale' as kind,s.id,s.created_at as at,(x->>'amount')::numeric as amount,s.total,s.ticket_number,
   jsonb_array_length(s.payments)>1 as mixed,s.return_status,reg.name as register,u.email as actor,null::text as detail
  from public.retail_sales s cross join lateral jsonb_array_elements(s.payments) x
  left join public.retail_shifts sh on sh.id=s.shift_id left join public.retail_registers reg on reg.id=sh.register_id
  left join auth.users u on u.id=s.created_by
  where s.store_id=p_store and s.created_at>=v_from and s.created_at<v_to and x->>'method'=p_method
  union all
  select 'refund',r.id,r.created_at,-(x->>'amount')::numeric,r.total,s.ticket_number,false,r.kind,reg.name,r.actor_email,r.reason
  from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.payments) x
  join public.retail_sales s on s.id=r.sale_id
  left join public.retail_shifts sh on sh.id=s.shift_id left join public.retail_registers reg on reg.id=sh.register_id
  where r.store_id=p_store and r.created_at>=v_from and r.created_at<v_to and x->>'method'=p_method
  union all
  select 'collection',c.id,c.created_at,-c.amount,null,null,false,null,null,c.actor_email,k.name
  from public.retail_customer_movements c join public.retail_customers k on k.id=c.customer_id
  where c.store_id=p_store and c.kind='payment' and c.method=p_method and c.created_at>=v_from and c.created_at<v_to
 )
 select jsonb_build_object('method',p_method,'count',(select count(*) from rows),'total',coalesce((select sum(amount) from rows),0),
  'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc) from (select * from rows order by at desc limit 2000) r),'[]'::jsonb)));
end $$;
revoke all on function public.retail_reconciliation_detail(uuid,date,date,text) from public,anon;
grant execute on function public.retail_reconciliation_detail(uuid,date,date,text) to authenticated;

notify pgrst,'reload schema';
$retail_source_dbc90b884f7104bc$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611040003_reconciliation_sales_detail.sql','dbc90b884f7104bc36b8f210b271330f43cfb3d5a45da0bca4cb552f1ddc780d','schema');
 end if;
end;

-- 81/84: 202611040004_reconciliation_totals.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611040004_reconciliation_totals.sql') then
  raise notice 'Aplicando 202611040004_reconciliation_totals.sql';
  execute replace($retail_source_6a335da16cd91637$
drop function public.retail_reconciliation_detail(uuid,date,date,text);

create function public.retail_reconciliation_detail(p_store uuid,p_from date,p_to date,p_method text,p_limit integer default 2000) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz; v_limit integer:=least(greatest(coalesce(p_limit,2000),1),20000);
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 if p_method not in ('QR','Debito','Credito','Transferencia') then raise exception 'Medio de pago inválido'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 return (with rows as (
  select 'sale' as kind,s.id,s.created_at as at,(x->>'amount')::numeric as amount,s.total,s.ticket_number,
   jsonb_array_length(s.payments)>1 as mixed,s.return_status,reg.name as register,u.email as actor,null::text as detail
  from public.retail_sales s cross join lateral jsonb_array_elements(s.payments) x
  left join public.retail_shifts sh on sh.id=s.shift_id left join public.retail_registers reg on reg.id=sh.register_id
  left join auth.users u on u.id=s.created_by
  where s.store_id=p_store and s.created_at>=v_from and s.created_at<v_to and x->>'method'=p_method
  union all
  select 'refund',r.id,r.created_at,-(x->>'amount')::numeric,r.total,s.ticket_number,false,r.kind,reg.name,r.actor_email,r.reason
  from public.retail_sale_returns r cross join lateral jsonb_array_elements(r.payments) x
  join public.retail_sales s on s.id=r.sale_id
  left join public.retail_shifts sh on sh.id=s.shift_id left join public.retail_registers reg on reg.id=sh.register_id
  where r.store_id=p_store and r.created_at>=v_from and r.created_at<v_to and x->>'method'=p_method
  union all
  select 'collection',c.id,c.created_at,-c.amount,null,null,false,null,null,c.actor_email,k.name
  from public.retail_customer_movements c join public.retail_customers k on k.id=c.customer_id
  where c.store_id=p_store and c.kind='payment' and c.method=p_method and c.created_at>=v_from and c.created_at<v_to
 )
 select jsonb_build_object('method',p_method,'count',(select count(*) from rows),'total',coalesce((select sum(amount) from rows),0),
  'sales',coalesce((select sum(amount) from rows where kind='sale'),0),'sales_count',(select count(*) from rows where kind='sale'),
  'refunds',coalesce((select sum(amount) from rows where kind='refund'),0),'refunds_count',(select count(*) from rows where kind='refund'),
  'collections',coalesce((select sum(amount) from rows where kind='collection'),0),'collections_count',(select count(*) from rows where kind='collection'),
  'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc) from (select * from rows order by at desc limit v_limit) r),'[]'::jsonb)));
end $$;
revoke all on function public.retail_reconciliation_detail(uuid,date,date,text,integer) from public,anon;
grant execute on function public.retail_reconciliation_detail(uuid,date,date,text,integer) to authenticated;

notify pgrst,'reload schema';
$retail_source_6a335da16cd91637$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611040004_reconciliation_totals.sql','6a335da16cd916379beb40b7d85504857c32933fc96638d1d0b03dedcde91825','schema');
 end if;
end;

-- 82/84: 202611040005_product_presentations.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611040005_product_presentations.sql') then
  raise notice 'Aplicando 202611040005_product_presentations.sql';
  execute replace($retail_source_93ba9b0485f9a37b$
alter table public.retail_products
 add column display_size integer check (display_size is null or display_size between 1 and 2147483647),
 add constraint retail_products_display_fits_pack check (display_size is null or pack_size is null or pack_size % display_size = 0);
grant update(display_size) on public.retail_products to authenticated;

notify pgrst,'reload schema';
$retail_source_93ba9b0485f9a37b$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611040005_product_presentations.sql','93ba9b0485f9a37bedcf4c42244ae411649c725e77154762707ab14ba600e6cb','schema');
 end if;
end;

-- 83/84: 202611040006_money_accounts.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611040006_money_accounts.sql') then
  raise notice 'Aplicando 202611040006_money_accounts.sql';
  execute replace($retail_source_f45ef0bac37eccb8$
create table public.retail_money_accounts (
 id uuid primary key default gen_random_uuid(), store_id uuid not null references public.retail_stores(id),
 name text not null check(length(btrim(name)) between 1 and 80),
 kind text not null default 'bank' check(kind in ('bank','wallet','other')),
 active boolean not null default true,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(store_id,id)
);
create unique index retail_money_accounts_name on public.retail_money_accounts(store_id,lower(btrim(name))) where active;

-- Qué medio de pago cae en qué cuenta y desde cuándo. Reasignar un medio cierra el período anterior: lo cobrado
-- antes queda en la cuenta donde entró.
create table public.retail_money_account_methods (
 id uuid primary key default gen_random_uuid(), store_id uuid not null,
 account_id uuid not null, method text not null check(method in ('QR','Debito','Credito','Transferencia')),
 from_at timestamptz not null default now(), to_at timestamptz, check(to_at is null or to_at>=from_at),
 foreign key(store_id,account_id) references public.retail_money_accounts(store_id,id)
);
create unique index retail_money_account_methods_open on public.retail_money_account_methods(store_id,method) where to_at is null;
create index retail_money_account_methods_account on public.retail_money_account_methods(account_id);

alter table public.retail_money_accounts enable row level security;
alter table public.retail_money_account_methods enable row level security;
create policy funds_read on public.retail_money_accounts for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
create policy funds_read on public.retail_money_account_methods for select to authenticated using(retail_private.has_permission(store_id,'manage_funds'));
revoke all on public.retail_money_accounts,public.retail_money_account_methods from public,anon,authenticated;
grant select on public.retail_money_accounts,public.retail_money_account_methods to authenticated;

-- Lo cobrado por los medios de la cuenta, con las mismas reglas que la conciliación.
create function retail_private.money_account_inflow(p_store uuid,p_account uuid) returns numeric
language sql stable security definer set search_path='' as $$
 select coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sales s on s.store_id=m.store_id and s.created_at>=m.from_at and s.created_at<coalesce(m.to_at,'infinity'::timestamptz)
   cross join lateral jsonb_array_elements(s.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 - coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sale_returns r on r.store_id=m.store_id and r.created_at>=m.from_at and r.created_at<coalesce(m.to_at,'infinity'::timestamptz)
   cross join lateral jsonb_array_elements(r.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 + coalesce((select sum(-c.amount) from public.retail_money_account_methods m
   join public.retail_customer_movements c on c.store_id=m.store_id and c.kind='payment' and c.method=m.method
    and c.created_at>=m.from_at and c.created_at<coalesce(m.to_at,'infinity'::timestamptz)
   where m.store_id=p_store and m.account_id=p_account),0);
$$;
revoke all on function retail_private.money_account_inflow(uuid,uuid) from public,anon,authenticated;

create function retail_private.is_money_account(p_store uuid,p_location text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.retail_money_accounts where store_id=p_store and id::text=p_location and active);
$$;
revoke all on function retail_private.is_money_account(uuid,text) from public,anon,authenticated;

-- Igual que 202611030001, con las cuentas como ubicación válida y su saldo calculado para controlar lo disponible.
create or replace function public.retail_move_location_funds(p_store uuid,p_from text,p_to text,p_amount numeric,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare prior public.retail_fund_transfers; loc text; source_balance numeric; target_balance numeric;
 note text:=btrim(p_note); v_transit boolean:=p_from is not null and p_to is not null;
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if p_request is null or p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity')
  or p_amount<=0 or p_amount>999999999999.99 or round(p_amount,2)<>p_amount then raise exception 'Ingresá un importe positivo con hasta dos decimales'; end if;
 if note is null or length(note) not between 1 and 1000 then raise exception 'Escribí un motivo de hasta 1.000 caracteres'; end if;
 if (p_from is null and p_to is null) or p_from=p_to then raise exception 'Elegí un origen y un destino diferentes'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-request:'||p_request::text,0));
 select * into prior from public.retail_fund_transfers where id=p_request;
 if found then
  if prior.store_id<>p_store or prior.created_by<>auth.uid() or prior.from_location is distinct from p_from
   or prior.to_location is distinct from p_to or prior.amount<>p_amount or prior.note<>note then raise exception 'La solicitud corresponde a otro movimiento'; end if;
  return prior.id;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 foreach loc in array array[p_from,p_to] loop
  if loc is null then continue; end if;
  if loc<>'depot' and not exists(select 1 from public.retail_branches where store_id=p_store and id::text=loc)
   and not retail_private.is_money_account(p_store,loc) then raise exception 'La ubicación no pertenece a este comercio'; end if;
  insert into public.retail_location_funds(store_id,location) values(p_store,loc) on conflict do nothing;
 end loop;
 if p_from is not null then
  select balance into source_balance from public.retail_location_funds where store_id=p_store and location=p_from for update;
  if retail_private.is_money_account(p_store,p_from) then source_balance:=source_balance+retail_private.money_account_inflow(p_store,p_from::uuid); end if;
  if source_balance<p_amount then raise exception 'El fondo de origen no tiene saldo suficiente. Actualizá los saldos'; end if;
  update public.retail_location_funds set balance=balance-p_amount where store_id=p_store and location=p_from;
 end if;
 if p_to is not null and not v_transit then
  select balance into target_balance from public.retail_location_funds where store_id=p_store and location=p_to for update;
  if target_balance+p_amount>999999999999.99 then raise exception 'El saldo resultante supera el límite permitido'; end if;
  update public.retail_location_funds set balance=balance+p_amount where store_id=p_store and location=p_to;
 end if;
 insert into public.retail_fund_transfers(id,store_id,from_location,to_location,amount,note,created_by,actor_email,status)
 values(p_request,p_store,p_from,p_to,p_amount,note,auth.uid(),auth.jwt()->>'email',case when v_transit then 'in_transit' else 'done' end);
 return p_request;
end $$;

-- Cuentas del comercio con su saldo: movimientos manuales más lo cobrado por sus medios.
create function public.retail_money_accounts_summary(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 return coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'kind',a.kind,
   'methods',coalesce((select jsonb_agg(m.method order by m.method) from public.retail_money_account_methods m where m.account_id=a.id and m.to_at is null),'[]'::jsonb),
   'manual',coalesce(f.balance,0),'inflow',retail_private.money_account_inflow(p_store,a.id),
   'balance',coalesce(f.balance,0)+retail_private.money_account_inflow(p_store,a.id)) order by lower(a.name))
  from public.retail_money_accounts a left join public.retail_location_funds f on f.store_id=a.store_id and f.location=a.id::text
  where a.store_id=p_store and a.active),'[]'::jsonb);
end $$;

-- Crear o editar una cuenta y qué medios de pago caen en ella. Un medio está en una sola cuenta a la vez.
create function public.retail_save_money_account(p_store uuid,p_id uuid,p_name text,p_kind text,p_methods text[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_name text:=btrim(p_name); v_methods text[]:=coalesce(p_methods,'{}'); v_method text; v_now timestamptz:=now();
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 if p_id is null then raise exception 'Cuenta inválida'; end if;
 if v_name is null or length(v_name) not between 1 and 80 then raise exception 'Escribí un nombre de hasta 80 caracteres'; end if;
 if p_kind not in ('bank','wallet','other') then raise exception 'Tipo de cuenta inválido'; end if;
 if exists(select 1 from unnest(v_methods) m where m not in ('QR','Debito','Credito','Transferencia')) then raise exception 'Medio de pago inválido'; end if;
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 if exists(select 1 from public.retail_money_accounts where id=p_id and store_id<>p_store) then raise exception 'Cuenta inválida'; end if;
 if exists(select 1 from public.retail_money_accounts where id=p_id and not active) then raise exception 'La cuenta está archivada'; end if;
 insert into public.retail_money_accounts(id,store_id,name,kind,created_by) values(p_id,p_store,v_name,p_kind,auth.uid())
 on conflict(id) do update set name=excluded.name,kind=excluded.kind;
 -- Medios que deja de tener esta cuenta.
 update public.retail_money_account_methods set to_at=v_now where store_id=p_store and account_id=p_id and to_at is null and method<>all(v_methods);
 foreach v_method in array v_methods loop
  if exists(select 1 from public.retail_money_account_methods where store_id=p_store and account_id=p_id and method=v_method and to_at is null) then continue; end if;
  -- El medio estaba en otra cuenta: desde ahora entra en esta.
  update public.retail_money_account_methods set to_at=v_now where store_id=p_store and method=v_method and to_at is null;
  insert into public.retail_money_account_methods(store_id,account_id,method,from_at) values(p_store,p_id,v_method,v_now);
 end loop;
 return p_id;
end $$;

-- Archivar una cuenta: solo con saldo cero, para no perder plata de vista. El historial se conserva.
create function public.retail_archive_money_account(p_store uuid,p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_balance numeric;
begin
 perform retail_private.require_permission(p_store,'manage_funds');
 perform pg_advisory_xact_lock(hashtextextended('fund-store:'||p_store::text,0));
 if not retail_private.is_money_account(p_store,p_id::text) then raise exception 'Cuenta no disponible'; end if;
 v_balance:=coalesce((select balance from public.retail_location_funds where store_id=p_store and location=p_id::text),0)+retail_private.money_account_inflow(p_store,p_id);
 if v_balance<>0 then raise exception 'La cuenta tiene saldo. Pasalo a otra cuenta o registrá la salida antes de archivarla'; end if;
 if exists(select 1 from public.retail_fund_transfers where store_id=p_store and status='in_transit' and (from_location=p_id::text or to_location=p_id::text)) then
  raise exception 'Hay envíos en camino con esta cuenta. Confirmalos o devolvelos antes de archivarla';
 end if;
 update public.retail_money_account_methods set to_at=now() where store_id=p_store and account_id=p_id and to_at is null;
 update public.retail_money_accounts set active=false where id=p_id;
end $$;

revoke all on function public.retail_money_accounts_summary(uuid),public.retail_save_money_account(uuid,uuid,text,text,text[]),public.retail_archive_money_account(uuid,uuid) from public,anon;
grant execute on function public.retail_money_accounts_summary(uuid),public.retail_save_money_account(uuid,uuid,text,text,text[]),public.retail_archive_money_account(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
$retail_source_f45ef0bac37eccb8$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611040006_money_accounts.sql','f45ef0bac37eccb8822a89e20fb0294c0e53ed7258c5e28f9da1602ec941959d','schema');
 end if;
end;

-- 84/84: 202611040007_money_movements_report.sql
begin
 if not exists(select 1 from retail_private.schema_migrations where filename='202611040007_money_movements_report.sql') then
  raise notice 'Aplicando 202611040007_money_movements_report.sql';
  execute replace($retail_source_df024af737bef5fb$
-- Lo cobrado por los medios de una cuenta entre dos momentos (mismas reglas que money_account_inflow).
create function retail_private.money_account_inflow_between(p_store uuid,p_account uuid,p_from timestamptz,p_to timestamptz) returns numeric
language sql stable security definer set search_path='' as $$
 select coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sales s on s.store_id=m.store_id and s.created_at>=greatest(m.from_at,p_from) and s.created_at<least(coalesce(m.to_at,'infinity'::timestamptz),p_to)
   cross join lateral jsonb_array_elements(s.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 - coalesce((select sum((x->>'amount')::numeric) from public.retail_money_account_methods m
   join public.retail_sale_returns r on r.store_id=m.store_id and r.created_at>=greatest(m.from_at,p_from) and r.created_at<least(coalesce(m.to_at,'infinity'::timestamptz),p_to)
   cross join lateral jsonb_array_elements(r.payments) x
   where m.store_id=p_store and m.account_id=p_account and x->>'method'=m.method),0)
 + coalesce((select sum(-c.amount) from public.retail_money_account_methods m
   join public.retail_customer_movements c on c.store_id=m.store_id and c.kind='payment' and c.method=m.method
    and c.created_at>=greatest(m.from_at,p_from) and c.created_at<least(coalesce(m.to_at,'infinity'::timestamptz),p_to)
   where m.store_id=p_store and m.account_id=p_account),0);
$$;
revoke all on function retail_private.money_account_inflow_between(uuid,uuid,timestamptz,timestamptz) from public,anon,authenticated;

-- Nombre legible de una ubicación de plata, también de cuentas archivadas o sucursales eliminadas.
create function retail_private.fund_location_name(p_store uuid,p_location text) returns text
language sql stable security definer set search_path='' as $$
 select case when p_location is null then null when p_location='depot' then 'Depósito'
  else coalesce((select name from public.retail_branches where store_id=p_store and id::text=p_location),
   (select name from public.retail_money_accounts where store_id=p_store and id::text=p_location),'Ubicación anterior') end;
$$;
revoke all on function retail_private.fund_location_name(uuid,text) from public,anon,authenticated;

create function public.retail_money_movements_report(p_store uuid,p_from date,p_to date) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare zone text:='America/Argentina/Buenos_Aires'; v_from timestamptz; v_to timestamptz;
begin
 if not retail_private.can_reconcile(p_store) then raise exception 'Tu perfil no permite conciliar' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'Elegí un período de hasta un año'; end if;
 v_from:=p_from::timestamp at time zone zone; v_to:=(p_to+1)::timestamp at time zone zone;
 return jsonb_build_object(
  'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.name,'kind',a.kind,'active',a.active,
    'methods',coalesce((select jsonb_agg(m.method order by m.method) from public.retail_money_account_methods m where m.account_id=a.id and m.to_at is null),'[]'::jsonb),
    'collected',retail_private.money_account_inflow_between(p_store,a.id,v_from,v_to),
    'balance',coalesce(f.balance,0)+retail_private.money_account_inflow(p_store,a.id)) order by a.active desc,lower(a.name))
   from public.retail_money_accounts a left join public.retail_location_funds f on f.store_id=a.store_id and f.location=a.id::text
   where a.store_id=p_store and (a.active or exists(select 1 from public.retail_fund_transfers t where t.store_id=p_store and t.created_at>=v_from and t.created_at<v_to
    and (t.from_location=a.id::text or t.to_location=a.id::text)))),'[]'::jsonb),
  'rows',coalesce((select jsonb_agg(to_jsonb(r) order by r.at desc) from (
   -- Retiros e ingresos dentro de un turno: siempre efectivo de esa caja.
   select 'shift' as origin,m.id,m.created_at as at,case when m.type='RETIRO' then 'withdrawal' else 'income' end as kind,
    case when m.type='RETIRO' then -m.amount else m.amount end as amount,
    case when m.type='RETIRO' then 'Efectivo · '||coalesce(reg.name,'Caja') end as source,
    case when m.type='INGRESO' then 'Efectivo · '||coalesce(reg.name,'Caja') end as destination,
    'cash' as source_kind,m.reason as note,m.category,m.supplier_name,u.email as actor,null::text as status
   from public.retail_movements m join public.retail_shifts sh on sh.id=m.shift_id left join public.retail_registers reg on reg.id=sh.register_id
   left join auth.users u on u.id=m.created_by
   where m.store_id=p_store and m.created_at>=v_from and m.created_at<v_to
   union all
   -- Movimientos de sucursales, depósito y cuentas. Los cierres de caja automáticos ya están en el arqueo.
   select 'fund',t.id,t.created_at,case when t.from_location is null then 'income' when t.to_location is null then 'withdrawal' else 'transfer' end,
    case when t.from_location is null then t.amount when t.to_location is null then -t.amount else t.amount end,
    retail_private.fund_location_name(p_store,t.from_location),retail_private.fund_location_name(p_store,t.to_location),
    case when exists(select 1 from public.retail_money_accounts a where a.store_id=p_store and a.id::text in (t.from_location,t.to_location)) then 'account' else 'fund' end,
    t.note,null,null,t.actor_email,t.status
   from public.retail_fund_transfers t
   where t.store_id=p_store and t.shift_id is null and t.created_at>=v_from and t.created_at<v_to
   order by 3 desc limit 5000) r),'[]'::jsonb));
end $$;
revoke all on function public.retail_money_movements_report(uuid,date,date) from public,anon;
grant execute on function public.retail_money_movements_report(uuid,date,date) to authenticated;

notify pgrst,'reload schema';
$retail_source_df024af737bef5fb$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611040007_money_movements_report.sql','df024af737bef5fb33bed1a53b63b816a644b8e96e0305f10845e4bd2cf0e57b','schema');
 end if;
end;


 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
-- Solo metadatos de instalación; no expone datos del comercio ni secretos.
select filename,origin,registered_at from retail_private.schema_migrations order by filename;
