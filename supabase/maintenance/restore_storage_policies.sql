-- Only for a project restored from a manual copy: database dumps leave out the storage schema policies.
-- Same policies as 202610190001 and 202610190002. Safe to repeat. Do not include in the installer.

begin;

drop policy if exists retail_vouchers_member_upload on storage.objects;
create policy retail_vouchers_member_upload on storage.objects for insert to authenticated
 with check(bucket_id='retail-vouchers' and retail_private.can_upload_voucher(name));
drop policy if exists retail_vouchers_manager_read on storage.objects;
create policy retail_vouchers_manager_read on storage.objects for select to authenticated
 using(bucket_id='retail-vouchers' and retail_private.can_read_voucher(name));
drop policy if exists retail_remitos_member_upload on storage.objects;
create policy retail_remitos_member_upload on storage.objects for insert to authenticated
 with check(bucket_id='retail-remitos' and retail_private.can_upload_remito(name));
drop policy if exists retail_remitos_manager_read on storage.objects;
create policy retail_remitos_manager_read on storage.objects for select to authenticated
 using(bucket_id='retail-remitos' and retail_private.can_read_remito(name));

commit;

select policyname,cmd from pg_catalog.pg_policies
where schemaname='storage' and tablename='objects' and policyname like 'retail\_%' order by policyname;
