/* Libreta de Clases: caché para funcionar sin internet. Sube el número de versión en cada actualización. */
const V = 'libreta-v15';
const FILES = ["./", "index.html", "manifest.webmanifest", "data.js", "seed.js", "store.js", "core.js", "plan.js", "v_hoy.js", "v_grupos.js", "v_notas.js", "v_cobros.js", "v_avance.js", "v_ajustes.js", "lib/xlsx.full.min.js", "lib/jspdf.umd.min.js", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png", "icons/icon-maskable-512.png"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('index.html'))));
});
