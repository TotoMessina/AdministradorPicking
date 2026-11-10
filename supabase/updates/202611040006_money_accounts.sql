-- AdministradorKiosco: actualización individual 83/98.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/202611040006_money_accounts.sql; SHA-256 f45ef0bac37eccb8822a89e20fb0294c0e53ed7258c5e28f9da1602ec941959d.
-- Requiere historial conciliado y TODAS las migraciones anteriores registradas.
-- Ejecutar este archivo COMPLETO en el proyecto correcto, de a uno y en orden.
-- Un DO atómico: sin tablas temporales; registra solo si termina correctamente.
-- Si ya está registrado con el mismo checksum, no repite el cuerpo SQL.
-- No fue ejecutado remotamente durante su preparación.
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
 },
 {
  "ordinal": 85,
  "filename": "202611060001_platform_admin_panel.sql",
  "sha256": "659abf945a67cc83a4775247e87f9c4c22a614b9331c59823c6bcff9b2f09dd4"
 },
 {
  "ordinal": 86,
  "filename": "202611060002_store_suspension.sql",
  "sha256": "c32216a04601682cf998ae591d7a771ee58d45a148c3fa980f6b9783c9f98ef9"
 },
 {
  "ordinal": 87,
  "filename": "202611060003_ai_server_limits.sql",
  "sha256": "83b162f1eb544e8de1acc0df7ca4414be9316e74370ac3887cbeae9c7c79e30e"
 },
 {
  "ordinal": 88,
  "filename": "202611060004_plans_and_subscriptions.sql",
  "sha256": "222d45b7d13c2e2e00185911908e716995048bfcd5533cc03f1d9456efc1dab6"
 },
 {
  "ordinal": 89,
  "filename": "202611060005_platform_announcements.sql",
  "sha256": "d5435338ad558c1a17f89b8154695b05d556b31231329b8e2f1725c0b3c89533"
 },
 {
  "ordinal": 90,
  "filename": "202611060006_push_for_all_members.sql",
  "sha256": "cbb1e3a8f7aeb3bd470418ab87ab02a4ba856ccfdc13d8d4f9294ccb6f0b463d"
 },
 {
  "ordinal": 91,
  "filename": "202611060007_advertising.sql",
  "sha256": "46353e26393c7e759b85930d27fd7d00ddbd14b76c7b8d7d31b19f1eca47f0ec"
 },
 {
  "ordinal": 92,
  "filename": "202611060008_delete_campaigns_and_notices.sql",
  "sha256": "4f1a2e35d7accaa392c4e227b04f27bbae8d6c0bd05e2061244faae486dddb72"
 },
 {
  "ordinal": 93,
  "filename": "202611060009_product_presentation_codes.sql",
  "sha256": "c0ee5421317c76645713f2d36b801f8a2e86058819903e88a6a1ba0a0ad099c0"
 },
 {
  "ordinal": 94,
  "filename": "202611060010_movement_receipts.sql",
  "sha256": "a65a158ee915c4929f5f36efcb260ec1433dab1ce10a82f2c92724c2e69db2bb"
 },
 {
  "ordinal": 95,
  "filename": "202611100001_product_expiry_grant.sql",
  "sha256": "660526cd46210f67ef9e910e08c259eea09218215c46edae88eb2f48e20efc86"
 },
 {
  "ordinal": 96,
  "filename": "202611100002_money_accounts_summary_volatile.sql",
  "sha256": "31d0bd1d2a7c0f29c45326db8a382184bde1249239d32b4b826b3406ea31f659"
 },
 {
  "ordinal": 97,
  "filename": "202611100003_payment_link_method.sql",
  "sha256": "90ac4ef0869c7ec6f4a2a8878fbe9149e9c74d0c6f64248989ce68a91e5d7901"
 },
 {
  "ordinal": 98,
  "filename": "202611100004_operational_push_notifications.sql",
  "sha256": "c7b807f7a2c473693de5db7627a348572a19c997b5458e1019e1d755f95fef17"
 }
]
$retail_schema_manifest_json$::jsonb;
 conflict text; missing text;
begin
 perform set_config('lock_timeout','10s',true);
 perform pg_advisory_xact_lock(hashtextextended('administrador-kiosco:schema',0));
 if to_regclass('retail_private.schema_migrations') is null then
  raise exception 'Falta el historial de instalación. No se aplicó 202611040006_money_accounts.sql'
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
 if exists(select 1 from retail_private.schema_migrations where filename='202611040006_money_accounts.sql') then
  raise notice '202611040006_money_accounts.sql ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<83 and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó 202611040006_money_accounts.sql',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
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
 end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
