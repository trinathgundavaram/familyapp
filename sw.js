// Simple offline cache: network first, fall back to the last saved copy.
const CACHE='nourish-v5';
self.addEventListener('install',e=>{self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.hostname.indexOf('googleapis.com')>=0&&u.hostname.indexOf('fonts')<0)return; // never cache API calls
  if(u.hostname.indexOf('openfoodfacts')>=0)return;
  e.respondWith(fetch(r).then(res=>{
    if(res&&res.status===200&&(u.origin===location.origin||u.hostname==='www.gstatic.com')){const copy=res.clone();caches.open(CACHE).then(c=>c.put(r,copy))}
    return res;
  }).catch(()=>caches.match(r)));
});
