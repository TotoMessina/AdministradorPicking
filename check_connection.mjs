import {readFile} from 'node:fs/promises';
const raw=await readFile(new URL('./.env.local',import.meta.url),'utf8');
const config=Object.fromEntries(raw.replace(/^\uFEFF/,'').trim().split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const n=l.indexOf('=');return [l.slice(0,n),l.slice(n+1)];}));
if(!config.VITE_SUPABASE_URL||!config.VITE_SUPABASE_ANON_KEY)throw new Error('Configure .env.local');
for(const endpoint of ['/auth/v1/settings','/rest/v1/retail_stores?select=id&limit=0']){
 const res=await fetch(config.VITE_SUPABASE_URL+endpoint,{headers:{apikey:config.VITE_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(15000)});
 const body=await res.json();
 console.log(endpoint,{status:res.status,...(endpoint.includes('settings')?{emailEnabled:body.external?.email}:{code:body.code,message:body.message})});
}
