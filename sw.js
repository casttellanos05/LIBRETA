/* Libreta de Clases: caché para funcionar sin internet. Sube el número de versión en cada actualización.
   - Instala bajando los archivos frescos (sin usar la caché del navegador) para no quedarse con versiones viejas.
   - Abre siempre desde lo guardado: instantáneo, con o sin internet. Las versiones nuevas se aplican al instalar la nueva. */
const V = 'libreta-v19';
const FILES = ["./", "index.html", "manifest.webmanifest", "data.js", "seed.js", "store.js", "core.js", "plan.js", "v_hoy.js", "v_grupos.js", "v_notas.js", "v_cobros.js", "v_avance.js", "v_ajustes.js", "lib/xlsx.full.min.js", "lib/jspdf.umd.min.js", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png", "icons/icon-maskable-512.png"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return c.put(f, r); })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('message', e => { if (e.data === 'version' && e.source) e.source.postMessage({ version: V }); if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(V), hit = await c.match(r, { ignoreSearch: true });
    if (hit) return hit;
    try { const res = await fetch(r); if (res && res.ok) c.put(r, res.clone()); return res; }
    catch (err) { return r.mode === 'navigate' ? ((await c.match('index.html')) || Response.error()) : Response.error(); }
  })());
});
