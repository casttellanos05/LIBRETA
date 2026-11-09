'use strict';
/* Base de datos local (funciona sin internet) + sincronización opcional con Google Sheets (Apps Script). */
const LDB = (() => {
  const P = 'lb:', mem = new Map(), subs = [];
  let ok = true;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { ok = false; return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { ok = false; } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(P) === 0) { try { mem.set(k.slice(P.length), JSON.parse(localStorage.getItem(k))); } catch (e) { } } } } catch (e) { ok = false; }
  let out = {}; try { out = JSON.parse(ls.get('lbmeta:out') || '{}'); } catch (e) { }
  const saveOut = () => ls.set('lbmeta:out', JSON.stringify(out));
  const colOf = p => p.slice(0, p.lastIndexOf('/')), idOf = p => p.slice(p.lastIndexOf('/') + 1);
  const live = p => { const r = mem.get(p); return r && !r.x ? r : null; };
  const snapCol = col => { const docs = []; mem.forEach((r, p) => { if (!r.x && colOf(p) === col) docs.push({ id: idOf(p), exists: true, data: () => JSON.parse(JSON.stringify(r.d)) }); }); return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: true } }; };
  const snapDoc = p => { const r = live(p); return { id: idOf(p), exists: !!r, data: () => (r ? JSON.parse(JSON.stringify(r.d)) : undefined) }; };
  let nT = null; const pend = new Set();
  const notify = p => { pend.add(p); clearTimeout(nT); nT = setTimeout(() => { const ps = Array.from(pend); pend.clear(); const cols = new Set(ps.map(colOf)); subs.forEach(s => { try { if (s.col && cols.has(s.col)) s.cb(snapCol(s.col)); else if (s.doc && ps.indexOf(s.doc) >= 0) s.cb(snapDoc(s.doc)); } catch (e) { console.error(e); } }); }, 0); };
  const put = (p, rec, local) => { mem.set(p, rec); ls.set(P + p, JSON.stringify(rec)); if (local) { out[p] = rec.u; saveOut(); SYNC.soon(); } notify(p); };
  return {
    ok: () => ok, mem, out: () => out, colOf,
    doc: p => ({ id: idOf(p), path: p, set: async d => put(p, { d: JSON.parse(JSON.stringify(d)), u: Date.now() }, true), delete: async () => put(p, { x: 1, u: Date.now() }, true), get: async () => snapDoc(p), onSnapshot: cb => { subs.push({ doc: p, cb }); setTimeout(() => cb(snapDoc(p)), 0); return () => { }; } }),
    collection: col => ({ onSnapshot: cb => { subs.push({ col, cb }); setTimeout(() => cb(snapCol(col)), 0); return () => { }; } }),
    seed: (p, d) => { if (!mem.has(p)) put(p, { d, u: 1 }, false); },
    applyRemote: docs => { docs.forEach(r => { const cur = mem.get(r.p); if (!cur || cur.u < r.u) { put(r.p, r.x ? { x: 1, u: r.u } : { d: r.d, u: r.u }, false); } }); },
    sent: list => { list.forEach(c => { if (out[c.p] === c.u) delete out[c.p]; }); saveOut(); },
    count: () => { let n = 0; mem.forEach(r => { if (!r.x) n++; }); return n; },
    exportAll: () => { const o = {}; mem.forEach((r, p) => { if (!r.x) o[p] = r.d; }); return o; },
    importAll: o => { Object.keys(o).forEach(p => put(p, { d: o[p], u: Date.now() }, true)); },
    wipe: () => { mem.forEach((r, p) => ls.del(P + p)); mem.clear(); out = {}; saveOut(); ls.del('lbmeta:since'); }
  };
})();

const SYNC = (() => {
  let t = null, busy = false, last = null, err = null;
  const g = k => { try { return localStorage.getItem('lbmeta:' + k) || ''; } catch (e) { return ''; } };
  const s = (k, v) => { try { localStorage.setItem('lbmeta:' + k, v); } catch (e) { } };
  async function run(manual) {
    const url = g('url'); if (!url || busy) return false;
    if (!navigator.onLine) { err = 'offline'; if (typeof updSync === 'function') updSync(); return false; }
    busy = true; if (typeof updSync === 'function') updSync();
    try {
      const out = LDB.out(), changes = Object.keys(out).slice(0, 400).map(p => { const r = LDB.mem.get(p); return r ? { p, u: r.u, d: r.x ? null : r.d } : null; }).filter(Boolean);
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key: g('key'), since: Number(g('since') || 0), changes }), redirect: 'follow' });
      const j = await res.json(); if (!j.ok) throw new Error(j.error || 'respuesta inválida');
      LDB.sent(changes); LDB.applyRemote(j.docs || []); s('since', String(j.now)); last = Date.now(); err = null; s('last', String(last));
      busy = false; if (Object.keys(LDB.out()).length) soon(); if (typeof updSync === 'function') updSync(); if (manual) toast('Sincronizado', 'ok'); return true;
    } catch (e) { busy = false; err = e.message || 'error'; if (typeof updSync === 'function') updSync(); if (manual) toast('No se pudo sincronizar: ' + err, 'bad'); return false; }
  }
  function soon() { clearTimeout(t); t = setTimeout(() => run(false), 2500); }
  window.addEventListener('online', () => run(false));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) run(false); });
  setInterval(() => { if (!document.hidden) run(false); }, 90000);
  return { run, soon, get: g, set: s, busy: () => busy, err: () => err, last: () => last || Number(g('last') || 0), on: () => !!g('url') };
})();
