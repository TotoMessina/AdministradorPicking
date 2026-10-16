import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import { createECDH } from 'node:crypto';
import assert from 'node:assert/strict';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost:3001'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(window,'isSecureContext',{value:true});
let installed=false;
window.matchMedia=()=>({matches:installed,addEventListener(){},removeEventListener(){}});
window.PushManager=function(){};
let permissionCalls=0, permissionResult='denied', subscribeCalls=0, unsubscribes=0, stored=false, saveFails=false;
const notice={permission:'default',requestPermission:async()=>{permissionCalls++;notice.permission=permissionResult;return permissionResult;}};
window.Notification=notice;globalThis.Notification=notice;
const ecdh=createECDH('prime256v1');ecdh.generateKeys();const key=ecdh.getPublicKey();
const sub={endpoint:'https://fcm.googleapis.com/fcm/send/test',options:{applicationServerKey:new Uint8Array(key).buffer},toJSON:()=>({keys:{p256dh:'B'.repeat(87),auth:'a'.repeat(22)}}),unsubscribe:async()=>{unsubscribes++;return true;}};
let currentSubscription=null, savedEndpoints=[], backendError=null;
const registration={active:{},pushManager:{getSubscription:async()=>currentSubscription,subscribe:async()=>{subscribeCalls++;return sub;}}};
Object.defineProperty(navigator,'serviceWorker',{value:{ready:Promise.resolve(registration),getRegistration:async()=>registration},configurable:true});
const React=await import('react');
const {render,screen,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
const server=await createServer({server:{middlewareMode:true,watch:null,hmr:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom',
  define:{'import.meta.env.VITE_ENABLE_DEV_PWA':'"true"','import.meta.env.VITE_VAPID_PUBLIC_KEY':JSON.stringify(key.toString('base64url')),
    'import.meta.env.VITE_SUPABASE_URL':'"https://example.supabase.co"','import.meta.env.VITE_SUPABASE_ANON_KEY':'"test-only"'}});
let client;
const calls=[];
try{
  ({supabase:client}=await server.ssrLoadModule('/src/lib/supabase.ts'));
  client.from=()=>({select:()=>{const query={eq:()=>query,limit:async()=>({data:savedEndpoints,error:backendError})};return query;}});
  client.rpc=async(name,args)=>{calls.push({name,args});if(name==='retail_save_push'&&saveFails)return {error:new Error('No se pudo guardar')};if(name==='retail_save_push')stored=true;return {data:name==='retail_request_push_test'?'test-delivery':null,error:null};};
  Object.defineProperty(client, 'functions', {
    value: {
      invoke: async (name, options) => {
        calls.push({ name, args: options.body });
        return { data: { accepted: 1 }, error: null };
      },
    },
  });
  const {PushSettings}=await server.ssrLoadModule('/src/features/retail/PushSettings.tsx');
  const mount=()=>render(React.createElement(PushSettings,{storeId:'store',userId:'user'}));
  mount();await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Activar notificaciones'}).disabled,false));
  assert.equal(permissionCalls,0);fireEvent.click(screen.getByRole('button',{name:'Activar notificaciones'}));
  await screen.findByText(/Los avisos siguen desactivados/);assert.equal(subscribeCalls,0);assert.equal(stored,false);
  cleanup();notice.permission='default';permissionResult='granted';saveFails=true;
  mount();await waitFor(()=>assert.equal(screen.getByRole('button',{name:'Activar notificaciones'}).disabled,false));
  fireEvent.click(screen.getByRole('button',{name:'Activar notificaciones'}));
  await screen.findByRole('alert');assert.equal(unsubscribes,1);assert.equal(stored,false);
  saveFails=false;fireEvent.click(screen.getByRole('button',{name:'Activar notificaciones'}));
  await screen.findByRole('button',{name:'Probar aviso'});assert.equal(stored,true);
  fireEvent.click(screen.getByRole('checkbox',{name:/Stock bajo/}));
  fireEvent.click(screen.getByRole('button',{name:'Guardar preferencias'}));
  await screen.findByText('Preferencias guardadas.');assert.equal(calls.filter(c=>c.name==='retail_save_push').at(-1).args.p_low_stock,false);
  fireEvent.click(screen.getByRole('button',{name:'Probar aviso'}));
  await screen.findByText(/Prueba enviada/);assert.equal(calls.at(-1).name,'push-dispatch');assert.equal(calls.at(-1).args.deliveryId,'test-delivery');
  fireEvent.click(screen.getByRole('button',{name:'Desactivar'}));
  await screen.findByText('Avisos desactivados en este dispositivo.');assert.equal(unsubscribes,2);assert.equal(calls.at(-1).name,'retail_remove_push');
  console.log('PASS permission only on gesture, denial without subscription, failed enrollment cleanup, preferences, real server test and unsubscribe');
  cleanup();
  const {PushWelcome}=await server.ssrLoadModule('/src/features/retail/PushWelcome.tsx');
  let done=0;
  const mountWelcome=()=>render(React.createElement(PushWelcome,{storeId:'store',storeName:'Mi comercio',userId:'user',onDone:()=>done++}));
  const before=permissionCalls;
  mountWelcome();await waitFor(()=>assert.equal(done,1));assert.equal(screen.queryByRole('dialog'),null);
  cleanup();installed=true;notice.permission='default';done=0;
  mountWelcome();await screen.findByRole('dialog');assert.equal(permissionCalls,before);
  fireEvent.click(screen.getByRole('button',{name:'Ahora no'}));assert.equal(done,1);assert.equal(permissionCalls,before);
  cleanup();done=0;saveFails=true;
  mountWelcome();await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button',{name:'Activar notificaciones'}));
  await screen.findByRole('alert');assert.equal(done,0);
  saveFails=false;fireEvent.click(screen.getByRole('button',{name:'Activar notificaciones'}));
  await waitFor(()=>assert.equal(done,1));assert.equal(screen.queryByRole('dialog'),null);
  const saved=calls.filter(c=>c.name==='retail_save_push').at(-1).args;
  assert.equal(saved.p_low_stock,true);assert.equal(saved.p_shift_closed,true);
  cleanup();done=0;currentSubscription=sub;savedEndpoints=[{endpoint:sub.endpoint}];
  const writes=calls.length;
  mountWelcome();await waitFor(()=>assert.equal(done,1));assert.equal(screen.queryByRole('dialog'),null);assert.equal(calls.length,writes);
  cleanup();done=0;notice.permission='denied';
  mountWelcome();await waitFor(()=>assert.equal(done,1));assert.equal(screen.queryByRole('dialog'),null);
  cleanup();done=0;notice.permission='default';currentSubscription=null;backendError={message:'Not configured'};
  mountWelcome();await waitFor(()=>assert.equal(done,1));assert.equal(screen.queryByRole('dialog'),null);
  console.log('PASS installed-PWA sign-in invitation, dismiss, retry, default alerts, existing preferences and denied/unconfigured skip');
}finally{cleanup();client?.auth.stopAutoRefresh();await server.close();dom.window.close();}
process.exit(0);
