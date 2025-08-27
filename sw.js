
const CACHE_NAME = 'pwa-controle-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/app.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (evt)=>{
  evt.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (evt)=>{
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (evt)=>{
  evt.respondWith(caches.match(evt.request).then(resp=>{ return resp || fetch(evt.request).then(fetchResp=>{ return caches.open(CACHE_NAME).then(cache=>{ cache.put(evt.request, fetchResp.clone()); return fetchResp; }); }); }).catch(()=>caches.match('/')));
});
