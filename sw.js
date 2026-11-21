// Gira INSESO — caché para funcionar sin conexión.
// Solo atiende los archivos de esta app (no los de otras carpetas, como encamados/).
// Responde desde la caché y la renueva en segundo plano cuando hay conexión.
const V = 'gira-tic-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const BASE = new URL('./', self.location).pathname;            // p. ej. /gira-tic/
const PROPIOS = new Set(FILES.map(f => new URL(f, self.location).pathname));

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(FILES.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('gira-tic-') && k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!PROPIOS.has(url.pathname)) return;           // otras apps y version.json: siempre a la red
  const clave = url.pathname === BASE ? BASE + 'index.html' : url.pathname;
  e.respondWith(caches.open(V).then(async c => {
    const hit = await c.match(clave);
    const red = fetch(req, { cache: 'no-store' }).then(r => { if (r && r.ok) c.put(clave, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(red); return hit; }
    return (await red) || c.match(BASE + 'index.html') || Response.error();
  }));
});
