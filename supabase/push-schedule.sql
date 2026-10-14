-- Run AFTER deploying push-dispatch and creating the two Vault secrets below.
-- Vault names: push_dispatch_url (https://PROJECT.supabase.co/functions/v1/push-dispatch)
-- and push_dispatch_secret (same PUSH_DISPATCH_SECRET as the Edge Function).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$ begin
 if exists(select 1 from cron.job where jobname='retail-web-push') then
  perform cron.unschedule('retail-web-push');
 end if;
end $$;
select cron.schedule('retail-web-push','* * * * *', $job$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name='push_dispatch_url'),
  headers := jsonb_build_object('Content-Type','application/json','x-push-secret',
   (select decrypted_secret from vault.decrypted_secrets where name='push_dispatch_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 20000
 );
$job$);
