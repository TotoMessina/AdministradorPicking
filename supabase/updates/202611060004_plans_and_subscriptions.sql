-- AdministradorKiosco: actualización individual 88/98.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/202611060004_plans_and_subscriptions.sql; SHA-256 222d45b7d13c2e2e00185911908e716995048bfcd5533cc03f1d9456efc1dab6.
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
  raise exception 'Falta el historial de instalación. No se aplicó 202611060004_plans_and_subscriptions.sql'
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
 if exists(select 1 from retail_private.schema_migrations where filename='202611060004_plans_and_subscriptions.sql') then
  raise notice '202611060004_plans_and_subscriptions.sql ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<88 and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó 202611060004_plans_and_subscriptions.sql',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
  raise notice 'Aplicando 202611060004_plans_and_subscriptions.sql';
  execute replace($retail_source_222d45b7d13c2e2e$
create table retail_private.plans (
 id uuid primary key default gen_random_uuid(),
 name text not null unique check (length(trim(name)) between 1 and 60),
 price numeric(14,2) not null default 0 check (price >= 0),
 max_branches integer check (max_branches is null or max_branches between 1 and 10000),
 max_registers integer check (max_registers is null or max_registers between 1 and 10000),
 max_users integer check (max_users is null or max_users between 1 and 10000),
 ai_enabled boolean not null default true,
 ai_daily_tokens integer check (ai_daily_tokens is null or ai_daily_tokens between 0 and 100000000),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table retail_private.billing_settings (
 id boolean primary key default true check (id),
 new_store_plan_id uuid references retail_private.plans(id) on delete set null,
 trial_days integer not null default 14 check (trial_days between 0 and 365),
 grace_days integer not null default 5 check (grace_days between 0 and 60),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
insert into retail_private.billing_settings(id) values (true);

create table retail_private.store_subscriptions (
 store_id uuid primary key references public.retail_stores(id) on delete cascade,
 plan_id uuid not null references retail_private.plans(id),
 exempt boolean not null default false,
 trial_until timestamptz,
 paid_until timestamptz,
 grace_days integer not null default 5 check (grace_days between 0 and 60),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
create index retail_store_subscriptions_plan on retail_private.store_subscriptions(plan_id);

create table retail_private.subscription_payments (
 id uuid primary key,
 store_id uuid not null references public.retail_stores(id) on delete cascade,
 paid_at timestamptz not null default now(),
 amount numeric(14,2) not null check (amount >= 0),
 months integer not null check (months between 1 and 36),
 method text not null check (method in ('transferencia', 'efectivo', 'mercado_pago', 'tarjeta', 'otro')),
 reference text check (reference is null or length(reference) <= 120),
 period_from timestamptz not null,
 period_to timestamptz not null,
 created_by uuid references auth.users(id) on delete set null
);
create index retail_subscription_payments_store on retail_private.subscription_payments(store_id, paid_at desc);
revoke all on retail_private.plans, retail_private.billing_settings, retail_private.store_subscriptions, retail_private.subscription_payments
 from public, anon, authenticated;

-- Hasta cuándo tiene acceso (prueba o pago) y en qué estado está.
create function retail_private.subscription_access_until(p_trial timestamptz, p_paid timestamptz) returns timestamptz
language sql immutable set search_path = '' as $$
 select nullif(greatest(coalesce(p_trial, '-infinity'::timestamptz), coalesce(p_paid, '-infinity'::timestamptz)), '-infinity'::timestamptz);
$$;
create function retail_private.subscription_status(p_exempt boolean, p_trial timestamptz, p_paid timestamptz, p_grace integer) returns text
language sql stable set search_path = '' as $$
 select case
  when p_exempt then 'bonificado'
  when coalesce(p_paid, '-infinity'::timestamptz) >= now() then 'al_dia'
  when coalesce(p_trial, '-infinity'::timestamptz) >= now() then 'prueba'
  when retail_private.subscription_access_until(p_trial, p_paid) is not null
   and retail_private.subscription_access_until(p_trial, p_paid) + make_interval(days => p_grace) >= now() then 'vencido'
  else 'bloqueado' end;
$$;
revoke all on function retail_private.subscription_access_until(timestamptz, timestamptz),
 retail_private.subscription_status(boolean, timestamptz, timestamptz, integer) from public, anon;
grant execute on function retail_private.subscription_access_until(timestamptz, timestamptz),
 retail_private.subscription_status(boolean, timestamptz, timestamptz, integer) to authenticated;

-- 1. Bloqueo: suspensión manual o abono bloqueado. Misma excepción para administradores de plataforma.
create or replace function retail_private.store_suspended(p_store uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select (exists (select 1 from retail_private.store_suspensions where store_id = p_store)
  or exists (select 1 from retail_private.store_subscriptions s where s.store_id = p_store
   and retail_private.subscription_status(s.exempt, s.trial_until, s.paid_until, s.grace_days) = 'bloqueado'))
  and not retail_private.is_platform_admin();
$$;

-- La pantalla de acceso suspendido explica también el abono vencido.
create or replace function public.retail_my_suspended_stores()
returns table (id uuid, name text, reason text, suspended_at timestamptz)
language sql stable security definer set search_path = '' as $$
 select s.id, s.name, x.reason, x.suspended_at from public.retail_members m
 join public.retail_stores s on s.id = m.store_id
 join retail_private.store_suspensions x on x.store_id = m.store_id
 where m.user_id = auth.uid() and not retail_private.is_platform_admin()
 union all
 select s.id, s.name,
  'El abono venció el ' || to_char(retail_private.subscription_access_until(b.trial_until, b.paid_until) at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY')
   || '. Al registrarse el pago, el acceso vuelve en el acto',
  retail_private.subscription_access_until(b.trial_until, b.paid_until) + make_interval(days => b.grace_days)
 from public.retail_members m
 join public.retail_stores s on s.id = m.store_id
 join retail_private.store_subscriptions b on b.store_id = m.store_id
 where m.user_id = auth.uid() and not retail_private.is_platform_admin()
  and retail_private.subscription_status(b.exempt, b.trial_until, b.paid_until, b.grace_days) = 'bloqueado'
  and not exists (select 1 from retail_private.store_suspensions x where x.store_id = m.store_id)
 order by 2;
$$;

-- 2. Comercios nuevos: prueba gratis con el plan elegido en la configuración (si hay uno).
create function retail_private.start_store_subscription() returns trigger
language plpgsql security definer set search_path = '' as $$
declare settings retail_private.billing_settings;
begin
 select * into settings from retail_private.billing_settings where id;
 if settings.new_store_plan_id is not null then
  insert into retail_private.store_subscriptions(store_id, plan_id, trial_until, grace_days)
  values (new.id, settings.new_store_plan_id, now() + make_interval(days => settings.trial_days), settings.grace_days)
  on conflict (store_id) do nothing;
 end if;
 return new;
end;
$$;
create trigger retail_start_subscription after insert on public.retail_stores
 for each row execute function retail_private.start_store_subscription();

-- 3. Límites del plan al agregar sucursales, cajas activas y personas. Lo ya existente no se toca.
create function retail_private.plan_limit(p_store uuid, p_kind text) returns integer
language sql stable security definer set search_path = '' as $$
 select case p_kind when 'branches' then p.max_branches when 'registers' then p.max_registers when 'users' then p.max_users end
 from retail_private.store_subscriptions s join retail_private.plans p on p.id = s.plan_id
 where s.store_id = p_store and not s.exempt;
$$;
revoke all on function retail_private.plan_limit(uuid, text) from public, anon, authenticated;

create function retail_private.enforce_plan_limits() returns trigger
language plpgsql security definer set search_path = '' as $$
declare cap integer; used integer; label text;
begin
 if tg_table_name = 'retail_registers' and (not new.active or (tg_op = 'UPDATE' and old.active)) then return new; end if;
 cap := retail_private.plan_limit(new.store_id, case tg_table_name when 'retail_branches' then 'branches' when 'retail_registers' then 'registers' else 'users' end);
 if cap is null then return new; end if;
 -- Dos altas simultáneas no pasan juntas el límite.
 perform pg_advisory_xact_lock(hashtextextended('plan-limit:' || new.store_id::text || tg_table_name, 0));
 if tg_table_name = 'retail_branches' then
  select count(*) into used from public.retail_branches where store_id = new.store_id; label := 'sucursales';
 elsif tg_table_name = 'retail_registers' then
  select count(*) into used from public.retail_registers where store_id = new.store_id and active and id <> new.id; label := 'cajas activas';
 elsif tg_table_name = 'retail_members' then
  select count(*) into used from public.retail_members where store_id = new.store_id; label := 'personas con acceso';
 else
  select (select count(*) from public.retail_members where store_id = new.store_id)
   + (select count(*) from public.retail_invitations where store_id = new.store_id) into used;
  label := 'personas con acceso (contando invitaciones pendientes)';
 end if;
 if used >= cap then
  raise exception 'Tu plan permite hasta % %. Para agregar más, pedí un cambio de plan', cap, label using errcode = 'P0001';
 end if;
 return new;
end;
$$;
create trigger retail_plan_limit_branches before insert on public.retail_branches for each row execute function retail_private.enforce_plan_limits();
create trigger retail_plan_limit_registers before insert or update of active on public.retail_registers for each row execute function retail_private.enforce_plan_limits();
create trigger retail_plan_limit_members before insert on public.retail_members for each row execute function retail_private.enforce_plan_limits();
create trigger retail_plan_limit_invitations before insert on public.retail_invitations for each row execute function retail_private.enforce_plan_limits();

-- 4. IA: la configuración propia del comercio manda; si no tiene, el plan; si no, la configuración general.
-- Corrige además que "configuración propia sin cupo" significa sin límite, como indica el panel.
create or replace function public.retail_ai_authorize(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
 settings retail_private.ai_settings;
 limits retail_private.ai_store_limits;
 has_limits boolean;
 has_plan boolean;
 plan_ai boolean;
 plan_cap integer;
 cap integer;
 used bigint;
begin
 if auth.uid() is null then return jsonb_build_object('allowed', false, 'code', 'ai_unauthenticated', 'message', 'Iniciá sesión para usar la IA'); end if;
 if p_store is null or retail_private.role_for(p_store) is null then
  return jsonb_build_object('allowed', false, 'code', 'ai_no_access', 'message', 'No tenés acceso a este comercio');
 end if;
 select * into settings from retail_private.ai_settings where id;
 if not coalesce(settings.enabled, true) then
  return jsonb_build_object('allowed', false, 'code', 'ai_disabled', 'message', 'La IA está pausada por el proveedor del servicio. Lo demás de la app funciona igual');
 end if;
 if (select count(*) from retail_private.ai_usage where user_id = auth.uid() and created_at > now() - interval '1 minute') >= 30 then
  return jsonb_build_object('allowed', false, 'code', 'ai_rate_limited', 'message', 'Demasiadas consultas seguidas. Probá de nuevo en un minuto', 'retry_after', 30);
 end if;
 select * into limits from retail_private.ai_store_limits where store_id = p_store;
 has_limits := found;
 if has_limits and not limits.enabled then
  return jsonb_build_object('allowed', false, 'code', 'ai_disabled', 'message', 'La IA no está habilitada para este comercio. Lo demás de la app funciona igual');
 end if;
 select p.ai_enabled, p.ai_daily_tokens into plan_ai, plan_cap from retail_private.store_subscriptions s join retail_private.plans p on p.id = s.plan_id
  where s.store_id = p_store and not s.exempt;
 has_plan := found;
 if not has_limits and has_plan and not plan_ai then
  return jsonb_build_object('allowed', false, 'code', 'ai_disabled', 'message', 'El plan del comercio no incluye IA. Lo demás de la app funciona igual');
 end if;
 cap := case when has_limits then limits.daily_tokens when has_plan then plan_cap else settings.default_daily_tokens end;
 if cap is not null then
  used := retail_private.ai_tokens_today(p_store);
  if used >= cap then
   return jsonb_build_object('allowed', false, 'code', 'ai_quota_exceeded', 'message', 'Se alcanzó el uso de IA de hoy para este comercio. Mañana vuelve a estar disponible', 'used', used, 'cap', cap);
  end if;
  return jsonb_build_object('allowed', true, 'remaining', cap - used);
 end if;
 return jsonb_build_object('allowed', true, 'remaining', null);
end;
$$;

-- 5. Para el dueño o administrador del comercio: su plan, vencimiento y uso de los límites.
create function public.retail_my_subscription(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare sub retail_private.store_subscriptions; pl retail_private.plans;
begin
 if coalesce(retail_private.role_for(p_store), '') not in ('owner', 'admin') then return null; end if;
 select * into sub from retail_private.store_subscriptions where store_id = p_store;
 if not found then return null; end if;
 select * into pl from retail_private.plans where id = sub.plan_id;
 return jsonb_build_object(
  'plan', pl.name, 'price', pl.price,
  'status', retail_private.subscription_status(sub.exempt, sub.trial_until, sub.paid_until, sub.grace_days),
  'access_until', retail_private.subscription_access_until(sub.trial_until, sub.paid_until),
  'blocks_at', retail_private.subscription_access_until(sub.trial_until, sub.paid_until) + make_interval(days => sub.grace_days),
  'limits', jsonb_build_object('branches', pl.max_branches, 'registers', pl.max_registers, 'users', pl.max_users),
  'used', jsonb_build_object(
   'branches', (select count(*) from public.retail_branches where store_id = p_store),
   'registers', (select count(*) from public.retail_registers where store_id = p_store and active),
   'users', (select count(*) from public.retail_members where store_id = p_store)));
end;
$$;
revoke all on function public.retail_my_subscription(uuid) from public, anon;
grant execute on function public.retail_my_subscription(uuid) to authenticated;

-- 6. Panel de plataforma: planes y configuración.
create function public.retail_admin_plans()
returns table (id uuid, name text, price numeric, max_branches integer, max_registers integer, max_users integer,
 ai_enabled boolean, ai_daily_tokens integer, active boolean, stores bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return query select p.id, p.name, p.price, p.max_branches, p.max_registers, p.max_users, p.ai_enabled, p.ai_daily_tokens, p.active,
  (select count(*) from retail_private.store_subscriptions s where s.plan_id = p.id)
 from retail_private.plans p order by p.active desc, p.price, p.name;
end;
$$;

create function public.retail_admin_save_plan(
 p_id uuid, p_name text, p_price numeric, p_max_branches integer, p_max_registers integer, p_max_users integer,
 p_ai_enabled boolean, p_ai_daily_tokens integer, p_active boolean
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare saved uuid;
begin
 perform retail_private.require_platform_admin();
 if length(trim(coalesce(p_name, ''))) not between 1 and 60 then raise exception 'Escribí el nombre del plan (hasta 60 caracteres)'; end if;
 if p_price is null or p_price < 0 or round(p_price, 2) <> p_price then raise exception 'Revisá el precio: un importe positivo con hasta dos decimales'; end if;
 if p_ai_enabled is null or p_active is null then raise exception 'Faltan datos del plan'; end if;
 if p_id is null then
  insert into retail_private.plans(name, price, max_branches, max_registers, max_users, ai_enabled, ai_daily_tokens, active)
  values (trim(p_name), p_price, p_max_branches, p_max_registers, p_max_users, p_ai_enabled, p_ai_daily_tokens, p_active) returning id into saved;
 else
  update retail_private.plans set name = trim(p_name), price = p_price, max_branches = p_max_branches, max_registers = p_max_registers,
   max_users = p_max_users, ai_enabled = p_ai_enabled, ai_daily_tokens = p_ai_daily_tokens, active = p_active, updated_at = now()
  where id = p_id returning id into saved;
  if saved is null then raise exception 'El plan ya no existe. Actualizá la lista'; end if;
 end if;
 return saved;
exception when unique_violation then raise exception 'Ya hay un plan con ese nombre';
end;
$$;

create function public.retail_admin_billing_settings() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return (select jsonb_build_object('new_store_plan_id', new_store_plan_id, 'trial_days', trial_days, 'grace_days', grace_days)
  from retail_private.billing_settings where id);
end;
$$;

create function public.retail_admin_save_billing_settings(p_new_store_plan uuid, p_trial_days integer, p_grace_days integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 if p_trial_days is null or p_trial_days not between 0 and 365 then raise exception 'La prueba gratis va de 0 a 365 días'; end if;
 if p_grace_days is null or p_grace_days not between 0 and 60 then raise exception 'Los días de gracia van de 0 a 60'; end if;
 if p_new_store_plan is not null and not exists (select 1 from retail_private.plans where id = p_new_store_plan and active) then
  raise exception 'Elegí un plan activo para los comercios nuevos';
 end if;
 update retail_private.billing_settings set new_store_plan_id = p_new_store_plan, trial_days = p_trial_days, grace_days = p_grace_days,
  updated_at = now(), updated_by = auth.uid() where id;
end;
$$;

-- 7. Abono de un comercio: estado, uso, pagos; asignar plan y registrar pagos.
create function public.retail_admin_store_subscription(p_store uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare sub retail_private.store_subscriptions;
begin
 perform retail_private.require_platform_admin();
 select * into sub from retail_private.store_subscriptions where store_id = p_store;
 return jsonb_build_object(
  'subscription', case when sub.store_id is null then null else jsonb_build_object(
   'plan_id', sub.plan_id, 'plan', (select name from retail_private.plans where id = sub.plan_id),
   'price', (select price from retail_private.plans where id = sub.plan_id),
   'exempt', sub.exempt, 'trial_until', sub.trial_until, 'paid_until', sub.paid_until, 'grace_days', sub.grace_days,
   'status', retail_private.subscription_status(sub.exempt, sub.trial_until, sub.paid_until, sub.grace_days),
   'access_until', retail_private.subscription_access_until(sub.trial_until, sub.paid_until)) end,
  'used', jsonb_build_object(
   'branches', (select count(*) from public.retail_branches where store_id = p_store),
   'registers', (select count(*) from public.retail_registers where store_id = p_store and active),
   'users', (select count(*) from public.retail_members where store_id = p_store),
   'invitations', (select count(*) from public.retail_invitations where store_id = p_store)),
  'payments', coalesce((select jsonb_agg(jsonb_build_object('paid_at', paid_at, 'amount', amount, 'months', months, 'method', method,
    'reference', reference, 'period_to', period_to, 'by', email) order by paid_at desc)
   from (select p.paid_at, p.amount, p.months, p.method, p.reference, p.period_to, u.email from retail_private.subscription_payments p
    left join auth.users u on u.id = p.created_by where p.store_id = p_store order by p.paid_at desc limit 24) h), '[]'::jsonb));
end;
$$;

-- p_plan null quita el abono: el comercio deja de controlarse (sin límites ni vencimiento).
create function public.retail_admin_set_store_plan(p_store uuid, p_plan uuid, p_exempt boolean, p_trial_days integer, p_grace_days integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 if not exists (select 1 from public.retail_stores where id = p_store) then raise exception 'El comercio no existe'; end if;
 if p_plan is null then delete from retail_private.store_subscriptions where store_id = p_store; return; end if;
 if not exists (select 1 from retail_private.plans where id = p_plan) then raise exception 'El plan ya no existe. Actualizá la lista'; end if;
 if p_exempt is null then raise exception 'Indicá si el comercio queda bonificado'; end if;
 if p_trial_days is not null and p_trial_days not between 0 and 365 then raise exception 'La prueba gratis va de 0 a 365 días'; end if;
 if p_grace_days is null or p_grace_days not between 0 and 60 then raise exception 'Los días de gracia van de 0 a 60'; end if;
 insert into retail_private.store_subscriptions(store_id, plan_id, exempt, trial_until, grace_days, updated_by)
 values (p_store, p_plan, p_exempt, case when p_trial_days is not null then now() + make_interval(days => p_trial_days) end, p_grace_days, auth.uid())
 on conflict (store_id) do update set plan_id = excluded.plan_id, exempt = excluded.exempt, grace_days = excluded.grace_days,
  trial_until = case when p_trial_days is not null then excluded.trial_until else retail_private.store_subscriptions.trial_until end,
  updated_at = now(), updated_by = auth.uid();
end;
$$;

-- Extiende el acceso por meses desde lo que esté más adelante: hoy, lo ya pagado o el fin de la prueba.
create function public.retail_admin_record_payment(p_request uuid, p_store uuid, p_amount numeric, p_months integer, p_method text, p_reference text)
returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare sub retail_private.store_subscriptions; prior retail_private.subscription_payments; base timestamptz; paid_to timestamptz;
begin
 perform retail_private.require_platform_admin();
 if p_request is null then raise exception 'Falta el identificador del pago'; end if;
 select * into prior from retail_private.subscription_payments where id = p_request;
 if found then
  if prior.store_id <> p_store then raise exception 'El identificador del pago ya se usó en otro comercio'; end if;
  return prior.period_to;
 end if;
 if p_amount is null or p_amount < 0 or round(p_amount, 2) <> p_amount then raise exception 'Revisá el importe: positivo y con hasta dos decimales'; end if;
 if p_months is null or p_months not between 1 and 36 then raise exception 'Elegí entre 1 y 36 meses'; end if;
 if p_method is null or p_method not in ('transferencia', 'efectivo', 'mercado_pago', 'tarjeta', 'otro') then raise exception 'Elegí cómo se pagó'; end if;
 if length(coalesce(p_reference, '')) > 120 then raise exception 'La referencia admite hasta 120 caracteres'; end if;
 select * into sub from retail_private.store_subscriptions where store_id = p_store for update;
 if not found then raise exception 'Asigná un plan al comercio antes de registrar pagos'; end if;
 base := greatest(now(), coalesce(sub.paid_until, now()), coalesce(sub.trial_until, now()));
 paid_to := base + make_interval(months => p_months);
 insert into retail_private.subscription_payments(id, store_id, amount, months, method, reference, period_from, period_to, created_by)
 values (p_request, p_store, p_amount, p_months, p_method, nullif(trim(p_reference), ''), base, paid_to, auth.uid());
 update retail_private.store_subscriptions set paid_until = paid_to, updated_at = now(), updated_by = auth.uid() where store_id = p_store;
 return paid_to;
end;
$$;

-- 8. Resumen de cobranza: estados, ingreso mensual estimado y próximos vencimientos.
create function public.retail_admin_billing_summary() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 return (with subs as (
  select s.store_id, st.name, p.name as plan, p.price,
   retail_private.subscription_status(s.exempt, s.trial_until, s.paid_until, s.grace_days) as status,
   retail_private.subscription_access_until(s.trial_until, s.paid_until) as access_until, s.grace_days
  from retail_private.store_subscriptions s join retail_private.plans p on p.id = s.plan_id join public.retail_stores st on st.id = s.store_id)
 select jsonb_build_object(
  'without_plan', (select count(*) from public.retail_stores st where not exists (select 1 from retail_private.store_subscriptions s where s.store_id = st.id)),
  'by_status', coalesce((select jsonb_object_agg(status, total) from (select status, count(*) as total from subs group by status) c), '{}'::jsonb),
  'monthly_revenue', (select coalesce(sum(price), 0) from subs where status in ('al_dia', 'vencido')),
  'collected_30d', (select coalesce(sum(amount), 0) from retail_private.subscription_payments where paid_at >= now() - interval '30 days'),
  'attention', coalesce((select jsonb_agg(jsonb_build_object('store_id', store_id, 'name', name, 'plan', plan, 'status', status, 'access_until', access_until,
    'blocks_at', access_until + make_interval(days => grace_days)) order by access_until nulls first)
   from (select * from subs where status in ('vencido', 'bloqueado') or (status in ('al_dia', 'prueba') and access_until < now() + interval '7 days')
    order by access_until nulls first limit 100) a), '[]'::jsonb)));
end;
$$;

-- 9. La lista de comercios muestra plan y estado del abono. Cambia el tipo de resultado.
drop function public.retail_admin_stores(text, integer);
create function public.retail_admin_stores(p_search text default null, p_days integer default 30)
returns table (
 id uuid, name text, created_at timestamptz, owner_email text, members integer, branches integer, products integer,
 sales_count bigint, sales_total numeric, last_sale_at timestamptz, ai_requests bigint, ai_tokens bigint,
 billing_enabled boolean, status text, note text, suspended_at timestamptz, plan_name text, subscription_status text
)
language plpgsql stable security definer set search_path = '' as $$
declare
 since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 365));
 term text := nullif(trim(coalesce(p_search, '')), '');
begin
 perform retail_private.require_platform_admin();
 return query
 select s.id, s.name, s.created_at, o.email::text,
  (select count(*)::integer from public.retail_members m where m.store_id = s.id),
  (select count(*)::integer from public.retail_branches b where b.store_id = s.id),
  (select count(*)::integer from public.retail_products p where p.store_id = s.id and p.active),
  coalesce(sa.sales_count, 0), coalesce(sa.sales_total, 0),
  (select max(x.created_at) from public.retail_sales x where x.store_id = s.id),
  coalesce(ai.requests, 0), coalesce(ai.tokens, 0),
  s.billing_enabled, coalesce(n.status, 'activo'), coalesce(n.note, ''), su.suspended_at,
  pl.name, case when sub.store_id is null then null
   else retail_private.subscription_status(sub.exempt, sub.trial_until, sub.paid_until, sub.grace_days) end
 from public.retail_stores s
 left join auth.users o on o.id = s.owner_id
 left join retail_private.platform_store_notes n on n.store_id = s.id
 left join retail_private.store_suspensions su on su.store_id = s.id
 left join retail_private.store_subscriptions sub on sub.store_id = s.id
 left join retail_private.plans pl on pl.id = sub.plan_id
 left join lateral (select count(*) as sales_count, sum(x.total) as sales_total from public.retail_sales x
  where x.store_id = s.id and x.created_at >= since) sa on true
 left join lateral (select count(*) as requests, sum(a.prompt_tokens + a.completion_tokens)::bigint as tokens from retail_private.ai_usage a
  where a.store_id = s.id and a.created_at >= since) ai on true
 where term is null or s.name ilike '%' || term || '%' or o.email ilike '%' || term || '%' or s.id::text = term
 order by s.created_at desc
 limit 500;
end;
$$;

revoke all on function public.retail_admin_stores(text, integer), public.retail_admin_plans(),
 public.retail_admin_save_plan(uuid, text, numeric, integer, integer, integer, boolean, integer, boolean),
 public.retail_admin_billing_settings(), public.retail_admin_save_billing_settings(uuid, integer, integer),
 public.retail_admin_store_subscription(uuid), public.retail_admin_set_store_plan(uuid, uuid, boolean, integer, integer),
 public.retail_admin_record_payment(uuid, uuid, numeric, integer, text, text), public.retail_admin_billing_summary() from public, anon;
grant execute on function public.retail_admin_stores(text, integer), public.retail_admin_plans(),
 public.retail_admin_save_plan(uuid, text, numeric, integer, integer, integer, boolean, integer, boolean),
 public.retail_admin_billing_settings(), public.retail_admin_save_billing_settings(uuid, integer, integer),
 public.retail_admin_store_subscription(uuid), public.retail_admin_set_store_plan(uuid, uuid, boolean, integer, integer),
 public.retail_admin_record_payment(uuid, uuid, numeric, integer, text, text), public.retail_admin_billing_summary() to authenticated;

notify pgrst, 'reload schema';
$retail_source_222d45b7d13c2e2e$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611060004_plans_and_subscriptions.sql','222d45b7d13c2e2e00185911908e716995048bfcd5533cc03f1d9456efc1dab6','schema');
 end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
