// A script edit in deck.js also triggers an offline cache refresh.
import './deck.js';
import {assets, version} from './assets.js';

const prefix = 'denville-evidence-';
const cacheName = prefix + version;
self.addEventListener('install', event => event.waitUntil((async()=>{
  const cache = await caches.open(cacheName);
  await cache.addAll(assets.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})));
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  await self.clients.claim();
  await Promise.all((await caches.keys()).filter(key=>key.startsWith(prefix) && key !== cacheName).map(key=>caches.delete(key)));
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET' || !url.href.startsWith(self.registration.scope)) return;
  if(url.pathname.endsWith('/')) url.pathname+='index.html';
  // Online: always the live version (and refresh the saved copy). Offline or slow (>4 s): the saved copy.
  event.respondWith((async()=>{
    const cache=await caches.open(cacheName);
    const saved=cache.match(url.href,{ignoreSearch:true});
    const live=fetch(event.request,{cache:'no-cache'}).then(res=>{
      if(res.ok) cache.put(url.href,res.clone());
      return res;
    });
    const timeout=new Promise(resolve=>setTimeout(resolve,4000));
    try {
      const res=await Promise.race([live,timeout.then(()=>saved)]);
      if(res) return res;
      return await live;
    } catch(e) {
      return (await saved) || Response.error();
    }
  })());
});
