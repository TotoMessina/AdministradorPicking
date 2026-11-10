-- AdministradorKiosco: actualización individual 92/98.
-- Generado: node scripts/generate-schema.mjs --individual-updates. NO editar.
-- Fuente: migrations/202611060008_delete_campaigns_and_notices.sql; SHA-256 4f1a2e35d7accaa392c4e227b04f27bbae8d6c0bd05e2061244faae486dddb72.
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
  raise exception 'Falta el historial de instalación. No se aplicó 202611060008_delete_campaigns_and_notices.sql'
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
 if exists(select 1 from retail_private.schema_migrations where filename='202611060008_delete_campaigns_and_notices.sql') then
  raise notice '202611060008_delete_campaigns_and_notices.sql ya está registrada con el mismo checksum. No se repitió';
  return;
 end if;
 select m.filename into missing from jsonb_to_recordset(manifest) m(ordinal integer,filename text,sha256 text)
  where m.ordinal<92 and not exists(select 1 from retail_private.schema_migrations h where h.filename=m.filename)
  order by m.ordinal limit 1;
 if missing is not null then
  raise exception 'Falta registrar la migración anterior %. No se aplicó 202611060008_delete_campaigns_and_notices.sql',missing
   using errcode='55000',hint='Ejecutar las actualizaciones en orden. Si falta un paso manual anterior, conciliar primero; no insertar historial a mano.';
 end if;
 begin
  raise notice 'Aplicando 202611060008_delete_campaigns_and_notices.sql';
  execute replace($retail_source_4f1a2e35d7accaa3$
-- Imágenes de las campañas indicadas que ninguna otra campaña usa.
create function retail_private.orphan_ad_images(p_ids uuid[]) returns text[]
language sql stable security definer set search_path = '' as $$
 select coalesce(array_agg(distinct c.image_path), '{}'::text[]) from retail_private.ad_campaigns c
 where c.id = any(p_ids) and c.image_path is not null
  and not exists (select 1 from retail_private.ad_campaigns o where o.image_path = c.image_path and not (o.id = any(p_ids)));
$$;
revoke all on function retail_private.orphan_ad_images(uuid[]) from public, anon, authenticated;

create function public.retail_admin_delete_campaign(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare images text[];
begin
 perform retail_private.require_platform_admin();
 perform 1 from retail_private.ad_campaigns where id = p_id for update;
 if not found then raise exception 'La campaña ya no existe. Actualizá la lista'; end if;
 images := retail_private.orphan_ad_images(array[p_id]);
 delete from retail_private.ad_campaigns where id = p_id;
 return jsonb_build_object('deleted', 1, 'images', to_jsonb(images));
end;
$$;

create function public.retail_admin_delete_announcement(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 perform retail_private.require_platform_admin();
 delete from retail_private.platform_announcements where id = p_id;
 if not found then raise exception 'El aviso ya no existe. Actualizá la lista'; end if;
end;
$$;

-- Limpieza: campañas terminadas hace al menos p_days días; avisos vencidos o cancelados hace al menos p_days días.
-- p_preview true solo cuenta, sin borrar.
create function public.retail_admin_purge_ended(p_kind text, p_days integer, p_preview boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare cutoff timestamptz; ids uuid[]; images text[] := '{}';
begin
 perform retail_private.require_platform_admin();
 if p_days is null or p_days not between 0 and 3650 then raise exception 'Indicá desde hace cuántos días (0 a 3.650)'; end if;
 cutoff := now() - make_interval(days => p_days);
 if p_kind = 'campaigns' then
  select coalesce(array_agg(id), '{}') into ids from retail_private.ad_campaigns where ends_at < cutoff;
  if not coalesce(p_preview, true) and cardinality(ids) > 0 then
   images := retail_private.orphan_ad_images(ids);
   delete from retail_private.ad_campaigns where id = any(ids);
  end if;
 elsif p_kind = 'announcements' then
  select coalesce(array_agg(id), '{}') into ids from retail_private.platform_announcements where coalesce(canceled_at, ends_at) < cutoff;
  if not coalesce(p_preview, true) and cardinality(ids) > 0 then
   delete from retail_private.platform_announcements where id = any(ids);
  end if;
 else
  raise exception 'Elegí qué limpiar';
 end if;
 return jsonb_build_object('count', cardinality(ids), 'deleted', case when coalesce(p_preview, true) then 0 else cardinality(ids) end, 'images', to_jsonb(images));
end;
$$;

revoke all on function public.retail_admin_delete_campaign(uuid), public.retail_admin_delete_announcement(uuid),
 public.retail_admin_purge_ended(text, integer, boolean) from public, anon;
grant execute on function public.retail_admin_delete_campaign(uuid), public.retail_admin_delete_announcement(uuid),
 public.retail_admin_purge_ended(text, integer, boolean) to authenticated;

notify pgrst, 'reload schema';
$retail_source_4f1a2e35d7accaa3$,chr(13)||chr(10),chr(10));
  insert into retail_private.schema_migrations(filename,sha256,origin)
   values('202611060008_delete_campaigns_and_notices.sql','4f1a2e35d7accaa392c4e227b04f27bbae8d6c0bd05e2061244faae486dddb72','schema');
 end;
 perform pg_notify('pgrst','reload schema');
end;
$retail_install$;
select count(*) as migraciones,max(filename) as ultima_migracion from retail_private.schema_migrations;
