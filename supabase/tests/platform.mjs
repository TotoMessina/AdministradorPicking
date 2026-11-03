// Minimal stand-in for what Supabase provides before migrations run. Local only: no real project or data.
export const PLATFORM_SQL = `create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 grant usage on schema auth to authenticated; grant execute on all functions in schema auth to authenticated;
 create schema storage;
 create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,owner uuid,owner_id text,metadata jsonb,created_at timestamptz default now());
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;
 create schema vault;
 create table vault.secrets(id uuid primary key default gen_random_uuid(),name text unique,description text,secret text not null);
 create function vault.create_secret(new_secret text,new_name text default null,new_description text default '',new_key_id uuid default null) returns uuid language sql as $$insert into vault.secrets(name,description,secret) values(new_name,new_description,new_secret) returning id$$;
 create function vault.update_secret(secret_id uuid,new_secret text default null,new_name text default null,new_description text default null,new_key_id uuid default null) returns void language sql as $$update vault.secrets set secret=coalesce(new_secret,secret),name=coalesce(new_name,name) where id=secret_id$$;
 create view vault.decrypted_secrets as select id,name,description,secret as decrypted_secret from vault.secrets;`;
