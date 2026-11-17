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
  event.respondWith((async()=>{
    const cache=await caches.open(cacheName);
    return await cache.match(url.href,{ignoreSearch:true}) || fetch(event.request);
  })());
});
