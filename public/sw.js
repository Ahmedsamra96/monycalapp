// MonyCal: only offline UI and public static files are cached, NEVER private data/API payloads.
const CACHE = 'monycal-static-v1';
const PRELOAD = ['/offline.html','/pwa-icon-192.png','/pwa-icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRELOAD)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET' || new URL(req.url).origin!==self.location.origin)return;
  const url=new URL(req.url);
  if(url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/') || url.searchParams.has('_rsc'))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req).catch(async()=>await caches.match('/offline.html')||Response.error()));
    return;
  }
  if(url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/pwa-icon-')){
    event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(response=>{
      if(response.ok){const copy=response.clone();void caches.open(CACHE).then(cache=>cache.put(req,copy));}
      return response;
    })));
  }
});
