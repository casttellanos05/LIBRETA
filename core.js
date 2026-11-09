'use strict';
/* Núcleo: estado, base de datos, escritura segura, fechas, cálculo de notas, eventos, enrutador. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cl = o => (o === undefined ? undefined : JSON.parse(JSON.stringify(o)));
const num = v => (typeof v === 'number' && !isNaN(v));
const fix1 = x => (x == null || isNaN(x) ? '—' : (Math.round(x * 10) / 10).toFixed(1));
const COLS = ['grupos', 'alumnos', 'horario', 'clases', 'bitacora', 'calificaciones', 'pagos', 'planeaciones', 'cambios', 'temario'];

const S = {
  db: null, user: null, cfg: cl(CFG_DEF), loaded: {}, slow: false, err: null,
  grupos: {}, alumnos: {}, horario: {}, clases: {}, bitacora: {}, calificaciones: {}, pagos: {}, planeaciones: {}, cambios: {}, temario: {},
  metricas: null, view: 'hoy', fecha: null, ui: {}
};
const VIEWS = {}, ACT = {}, CHG = {}, INP = {};

/* ---------- fechas ---------- */
const z2 = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + z2(d.getMonth() + 1) + '-' + z2(d.getDate());
const hoy = () => ymd(new Date());
const pd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addD = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return ymd(d); };
const dow = s => { const g = pd(s).getDay(); return g === 0 ? 7 : g; };
const lunes = s => addD(s, 1 - dow(s));
const fmtLargo = s => { const d = pd(s); return DIAS[dow(s)] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; };
const fmtCorto = s => { const d = pd(s); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); };
const sigHabil = s => { let n = addD(s, 1); while (dow(n) > 5) n = addD(n, 1); return n; };
const antHabil = s => { let n = addD(s, -1); while (dow(n) > 5) n = addD(n, -1); return n; };
const hhmm = t => (t || '').replace(/^0/, '');
const money = n => '$' + (Math.round((n || 0) * 100) / 100).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/* ---------- escritura segura ---------- */
const W = { dirty: {}, job: {}, t: {}, chain: {} };
function pathOf(coll, id) { return coll === 'config' ? 'config/main' : coll + '/' + id; }
function updSync() { updSync1($('#sync')); const b = $('#sync2'), a = $('#sync'); if (a && b) { b.className = a.className; b.textContent = a.textContent; } }
function updSync1(el) {
  if (!el) return;
  const n = Object.keys(LDB.out()).length, on = navigator.onLine;
  if (!LDB.ok()) { el.className = 'sync bad'; el.textContent = 'Sin almacenamiento'; return; }
  if (!SYNC.on()) { el.className = 'sync'; el.textContent = '✓ Guardado'; return; }
  if (SYNC.busy()) { el.className = 'sync'; el.textContent = '↻ Sincronizando…'; }
  else if (!on) { el.className = 'sync warn'; el.textContent = 'Sin conexión' + (n ? ' · ' + n + ' por subir' : ''); }
  else if (SYNC.err() && SYNC.err() !== 'offline') { el.className = 'sync bad'; el.textContent = 'Error al sincronizar'; }
  else if (n) { el.className = 'sync warn'; el.textContent = '↑ ' + n + ' por subir'; }
  else { el.className = 'sync'; el.textContent = '✓ Sincronizado'; }
}
function setLocal(coll, id, data) {
  if (coll === 'config') S.cfg = mergeCfg(data);
  else if (coll === 'metricas') S.metricas = data;
  else if (data === null) delete S[coll][id];
  else S[coll][id] = data;
}
function save(coll, id, data, delay) {
  const k = pathOf(coll, id); data = cl(data);
  setLocal(coll, id, data);
  const job = { coll, id, data, del: false };
  W.job[k] = job; W.dirty[k] = 1; clearTimeout(W.t[k]);
  W.t[k] = setTimeout(() => flush(k), delay || 0);
  updSync();
}
function del(coll, id) {
  const k = pathOf(coll, id); setLocal(coll, id, null);
  const job = { coll, id, data: null, del: true };
  W.job[k] = job; W.dirty[k] = 1; clearTimeout(W.t[k]);
  W.t[k] = setTimeout(() => flush(k), 0);
  updSync();
}
function flush(k) {
  const job = W.job[k]; if (!job) return;
  W.chain[k] = (W.chain[k] || Promise.resolve()).then(async () => {
    try {
      if (!S.db) throw { message: 'sin conexión con la base' };
      const ref = S.db.doc(k);
      if (job.del) await ref.delete(); else await ref.set(job.data);
    } catch (e) { toast('No se pudo guardar: ' + (e.message || e.code || 'error'), 'bad'); }
    if (W.job[k] === job) { delete W.dirty[k]; delete W.job[k]; }
    updSync();
  });
}
async function putMany(coll, items, label) {
  items.forEach(it => { setLocal(coll, it.id, cl(it.data)); W.dirty[pathOf(coll, it.id)] = 1; });
  updSync(); render();
  let i = 0, fails = 0;
  const worker = async () => {
    while (i < items.length) {
      const it = items[i++], k = pathOf(coll, it.id);
      try { await S.db.doc(k).set(cl(it.data)); } catch (e) {
        try { await new Promise(r => setTimeout(r, 700)); await S.db.doc(k).set(cl(it.data)); } catch (e2) { fails++; }
      }
      delete W.dirty[k]; updSync();
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  toast(fails ? (label || 'Datos') + ': ' + fails + ' no se guardaron' : (label || 'Datos') + ' guardados (' + items.length + ')', fails ? 'bad' : 'ok');
}
function mergeCfg(d) {
  const b = cl(CFG_DEF), o = Object.assign(b, d || {});
  o.esc = Object.assign({}, CFG_DEF.esc, (d && d.esc) || {});
  if (!Array.isArray(o.criterios) || !o.criterios.length) o.criterios = cl(CFG_DEF.criterios);
  if (!Array.isArray(o.periodos) || !o.periodos.length) o.periodos = cl(CFG_DEF.periodos);
  return o;
}

/* ---------- suscripciones ---------- */
function subscribe() {
  const db = S.db;
  const timer = setTimeout(() => { if (!S.loaded.grupos) { S.slow = true; updSync(); softRender(); } }, 10000);
  COLS.forEach(name => {
    db.collection(name).onSnapshot(snap => {
      clearTimeout(timer);
      const m = {};
      snap.docs.forEach(d => { m[d.id] = d.data(); });
      for (const k in W.dirty) {
        if (k.indexOf(name + '/') === 0) { const id = k.slice(name.length + 1); if (S[name][id] !== undefined) m[id] = S[name][id]; else delete m[id]; }
      }
      S[name] = m; S.loaded[name] = true; S.slow = false;
      if (name === 'temario' && typeof aplicaTemario === 'function') aplicaTemario();
      softRender();
    }, e => { S.err = e; toast('Error al leer ' + name + ': ' + (e.message || e.code), 'bad'); });
  });
  db.doc('config/main').onSnapshot(s => {
    if (s.exists && !W.dirty['config/main']) S.cfg = mergeCfg(s.data());
    S.loaded.config = true; softRender();
  }, () => { });
  db.doc('metricas/main').onSnapshot(s => { if (s.exists) S.metricas = s.data(); softRender(); }, () => { });
}

/* ---------- render ---------- */
let rT = null, pendingRender = false;
function render() {
  const v = VIEWS[S.view] || VIEWS.hoy;
  const app = $('#app');
  const y = window.scrollY;
  try { app.innerHTML = (S.loaded.grupos ? v() : '<div class="loading">Abriendo tu libreta…</div>'); }
  catch (e) { app.innerHTML = '<div class="card note bad">Ocurrió un error al mostrar esta pantalla: ' + esc(e.message) + '</div>'; console.error(e); }
  renderNav(); updSync();
  window.scrollTo(0, y);
  $('#sub').textContent = S.cfg.escuela + ' · ' + S.cfg.ciclo; if ($('#sub2')) $('#sub2').textContent = S.cfg.ciclo;
}
function softRender() {
  clearTimeout(rT);
  rT = setTimeout(() => {
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('#app').contains(a)) { pendingRender = true; return; }
    render();
  }, 90);
}
document.addEventListener('focusout', () => { if (pendingRender) { pendingRender = false; setTimeout(() => { const a = document.activeElement; if (!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) render(); }, 150); } });
function sinDb() {
  return '<div class="card note warn"><b>Esta página necesita abrirse desde Claude</b> para poder guardar tus datos. Ábrela desde el enlace de la libreta en tu cuenta.</div>';
}
const TABS = [['hoy', 'Hoy'], ['semana', 'Semana'], ['notas', 'Notas'], ['cobros', 'Cobros'], ['grupos', 'Grupos'], ['avance', 'Avance'], ['temario', 'Temario'], ['ajustes', 'Ajustes'], ['mas', 'Más']];
const ICON = {
  hoy: '<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="9"/>', semana: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  notas: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>', cobros: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  grupos: '<circle cx="9" cy="9" r="3"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5"/><path d="M16 6.5a3 3 0 010 5M18 14.5c2 .7 3 2.300 3 4.5"/>', avance: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  temario: '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z"/><path d="M9 8h6M9 12h6"/>', ajustes: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.600 5.600l2.100 2.100M16.300 16.300l2.100 2.100M5.600 18.400l2.100-2.100M16.300 7.700l2.100-2.100"/>',
  mas: '<circle cx="5" cy="12" r="1.600"/><circle cx="12" cy="12" r="1.600"/><circle cx="19" cy="12" r="1.600"/>'
};
const ico = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round">' + ICON[k] + '</svg>';
const MOVIL = ['hoy', 'semana', 'notas', 'cobros', 'mas'];
function renderNav() {
  const enMas = MOVIL.indexOf(S.view) < 0;
  $('#nav').innerHTML = TABS.map(t => '<a data-act="ir|' + t[0] + '" class="' + (S.view === t[0] || (t[0] === 'mas' && enMas) ? 'on ' : '') + (MOVIL.indexOf(t[0]) < 0 ? 'only-d ' : '') + (t[0] === 'mas' ? 'only-m' : '') + '">' + ico(t[0]) + '<span>' + t[1] + '</span></a>').join('');
}
VIEWS.mas = () => '<h2 style="margin-bottom:12px">Más</h2><div class="stack" style="gap:8px">' + [['grupos', 'Grupos y alumnos', 'Listas, importación desde Excel, quién paga'], ['avance', 'Avance', 'Dónde va cada grupo, métricas y reporte final'], ['temario', 'Temario', 'Carga y consulta el programa de Inglés'], ['ajustes', 'Ajustes', 'Escuela, evaluación, horario, sincronización y respaldo']].map(x => '<a class="card linkc" data-act="ir|' + x[0] + '">' + ico(x[0]) + '<div><b>' + x[1] + '</b><div class="small muted">' + x[2] + '</div></div></a>').join('') + '</div>';
function ir(v) { S.view = v; try { history.replaceState(null, '', '#' + v); } catch (e) { } render(); window.scrollTo(0, 0); }
ACT.ir = (el, v) => ir(v);

/* ---------- avisos y diálogos ---------- */
function toast(msg, kind) {
  const t = $('#toast'), d = document.createElement('div');
  d.textContent = msg; if (kind) d.className = kind; t.appendChild(d);
  setTimeout(() => d.remove(), kind === 'bad' ? 6000 : 2800);
}
let askCb = null;
function ask(msg, yes, okLabel) {
  askCb = yes;
  $('#modal').innerHTML = '<div class="box"><p style="margin:0 0 14px">' + msg + '</p><div class="row" style="justify-content:flex-end"><button class="btn" data-act="askno">Cancelar</button><button class="btn pri" data-act="askyes">' + (okLabel || 'Confirmar') + '</button></div></div>';
  $('#modal').className = 'on';
}
function modal(html) { $('#modal').innerHTML = '<div class="box">' + html + '<div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-act="askno">Cerrar</button></div></div>'; $('#modal').className = 'on'; }
ACT.askno = () => { $('#modal').className = ''; askCb = null; };
ACT.askyes = () => { const f = askCb; $('#modal').className = ''; askCb = null; if (f) f(); };
async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); toast('Copiado', 'ok'); }
  catch (e) { modal('<p class="small muted">Selecciona y copia el texto:</p><textarea id="cp" rows="8" readonly>' + esc(txt) + '</textarea>'); setTimeout(() => { const t = $('#cp'); if (t) { t.focus(); t.select(); } }, 50); }
}
async function descargar(name, data) {
  try {
    const tipos = { pdf: 'application/pdf', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', json: 'application/json' };
    const blob = data instanceof Blob ? data : new Blob([data], { type: tipos[name.split('.').pop()] || 'application/octet-stream' });
    const movil = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (movil && navigator.canShare) {
      const f = new File([blob], name, { type: blob.type });
      if (navigator.canShare({ files: [f] })) { try { await navigator.share({ files: [f], title: name }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    }
    const a = document.createElement('a'), u = URL.createObjectURL(blob);
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 20000);
    toast('Archivo listo: ' + name, 'ok');
  } catch (e) { toast('No se pudo guardar el archivo (' + ((e && e.message) || 'error') + ')', 'bad'); }
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const [a, ...args] = el.dataset.act.split('|');
  const f = ACT[a]; if (f) { try { f(el, ...args); } catch (err) { console.error(err); toast('Error: ' + err.message, 'bad'); } }
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]'); if (!el) return;
  const [a, ...args] = el.dataset.chg.split('|');
  const f = CHG[a]; if (f) { try { f(el, ...args); } catch (err) { console.error(err); toast('Error: ' + err.message, 'bad'); } }
});
document.addEventListener('input', e => {
  const el = e.target.closest('[data-inp]'); if (!el) return;
  const [a, ...args] = el.dataset.inp.split('|');
  const f = INP[a]; if (f) { try { f(el, ...args); } catch (err) { console.error(err); } }
});

document.addEventListener('keydown', e => {
  const el = e.target.closest && e.target.closest('[data-enter]');
  if (el && e.key === 'Enter') { e.preventDefault(); const [a, ...args] = el.dataset.enter.split('|'); if (ACT[a]) ACT[a](el, ...args); }
});

/* ---------- consultas del dominio ---------- */
const gradoDe = id => parseInt(id, 10) || 0;
const ordenGrupos = () => Object.values(S.grupos).sort((a, b) => (a.grado - b.grado) || String(a.letra).localeCompare(b.letra));
const alumnosDe = gid => Object.values(S.alumnos).filter(a => a.grupoId === gid).sort((a, b) => a.num - b.num);
const pagan = gid => alumnosDe(gid).filter(a => a.paga !== false).length;
const matsDe = gid => { const g = S.grupos[gid]; return (g && g.materias && g.materias.length) ? g.materias : ['ingles']; };
const esDada = c => c.estado === 'impartida' || c.estado === 'cambiada';
const gEf = c => (c.estado === 'cambiada' ? (c.grupoReal || c.grupoId) : c.grupoId);
const cmpClase = (a, b) => (a.fecha + (a.ini || '')).localeCompare(b.fecha + (b.ini || ''));
const listaDadas = (gid, mat) => Object.values(S.clases).filter(c => esDada(c) && gEf(c) === gid && c.materia === mat).sort(cmpClase);
function posicion(gid) {
  const g = S.grupos[gid]; if (!g) return 0;
  const dadas = listaDadas(gid, 'ingles').length;
  const rep = Object.values(S.bitacora).filter(b => b.grupoId === gid && b.materia === 'ingles' && b.repetir).length;
  return Math.max(0, Math.min(TOTAL_SESIONES, dadas - rep + ((g.ajuste && g.ajuste.ingles) || 0)));
}
function infoSesion(s) {
  if (s >= TOTAL_SESIONES) return { s, fin: true, titulo: 'Programa completo', ciclo: 99, fase: -1 };
  if (s <= 0) return { s: 0, diag: true, titulo: 'Semana de diagnóstico', ciclo: 0, fase: -1 };
  const ciclo = Math.ceil(s / 3), fase = (s - 1) % 3, C = CICLOS[ciclo - 1] || { n: ciclo, tema: 'Ciclo ' + ciclo, palabras: '', recicla: '', producto: '' };
  return { s, ciclo, fase, C, titulo: 'Ciclo ' + ciclo + ' · ' + FASES[fase] + ': ' + C.tema };
}
function materialDe(ci, fase) {
  const T = S.temario['s' + ((ci - 1) * 3 + fase + 1)]; if (T && T.material) return T.material;
  if (ci === 1) return MATERIAL_C1[fase];
  const C = CICLOS[ci - 1] || { palabras: '', recicla: '', producto: '' };
  return ['Tarjetas del vocabulario (' + C.palabras + ') y la canción en la bocina', 'Las mismas tarjetas, tarjetas de ' + C.recicla + ' y un tablero de juego con dado', 'Hoja imprimible para el producto: ' + C.producto][fase];
}
function tareaDe(ci, fase, nivel) {
  const T = S.temario['s' + ((ci - 1) * 3 + fase + 1)]; if (T && T.tareas_por_nivel && T.tareas_por_nivel[nivel]) return T.tareas_por_nivel[nivel];
  if (!TAREAS_C1[nivel]) return '';
  return ci === 1 ? TAREAS_C1[nivel][fase] : TAREA_GEN[nivel][fase];
}

/* clases de una fecha (horario + registros + extras) */
function clasesDelDia(f) {
  const d = dow(f), out = [];
  Object.values(S.horario).filter(h => h.dia === d).forEach(h => {
    const key = f + '_' + h.id, r = S.clases[key];
    out.push(Object.assign({ key, fecha: f, slotId: h.id, grupoId: h.grupoId, materia: h.materia, ini: h.ini, fin: h.fin, extra: h.extra || '', estado: 'pendiente' }, r || {}, { key }));
  });
  Object.keys(S.clases).forEach(k => { const c = S.clases[k]; if (c.fecha === f && String(c.slotId).indexOf('x') === 0) out.push(Object.assign({ key: k, estado: 'pendiente' }, c, { key: k })); });
  return out.sort((a, b) => (a.ini || '99').localeCompare(b.ini || '99'));
}

/* ---------- calificaciones ---------- */
function clampNota(x) { return Math.min(S.cfg.esc.max, Math.max(S.cfg.esc.min, x)); }
function redond(x) { return S.cfg.redondeo === 'entero' ? Math.round(x) : Math.round(x * 10) / 10; }
function notaPeriodo(doc, per) {
  const p = doc && doc.p && doc.p[per]; if (!p) return null;
  let sw = 0, s = 0;
  S.cfg.criterios.forEach(c => { const v = p[c.id]; if (num(v)) { s += v * c.peso; sw += c.peso; } });
  return sw ? redond(clampNota(s / sw)) : null;
}
function notaAnual(doc) {
  const v = [1, 2, 3].map(p => notaPeriodo(doc, p)).filter(x => x != null);
  return v.length ? redond(v.reduce((a, b) => a + b, 0) / v.length) : null;
}
const calDoc = (aid, mat) => S.calificaciones[aid + '_' + mat];
function setCrit(aid, mat, per, crit, val) {
  const a = S.alumnos[aid]; if (!a) return;
  const key = aid + '_' + mat, d = cl(S.calificaciones[key]) || { alumnoId: aid, grupoId: a.grupoId, materia: mat, p: {} };
  d.p = d.p || {}; d.p[per] = d.p[per] || {};
  if (val == null || val === '') delete d.p[per][crit]; else d.p[per][crit] = val;
  save('calificaciones', key, d, 700); markMetricas();
}
let mT = null;
function markMetricas() { clearTimeout(mT); mT = setTimeout(() => { if (S.db && typeof guardarMetricas === 'function') guardarMetricas(true); }, 25000); }

/* ---------- arranque ---------- */
async function boot() {
  S.fecha = hoy();
  const h = (location.hash || '').replace('#', ''); if (TABS.some(t => t[0] === h)) S.view = h;
  window.addEventListener('hashchange', () => { const x = location.hash.replace('#', ''); if (TABS.some(t => t[0] === x) && x !== S.view) { S.view = x; render(); } });
  window.addEventListener('online', updSync); window.addEventListener('offline', updSync);
  if (typeof SEED !== 'undefined' && !LDB.count()) { LDB.seed('config/main', SEED.config); SEED.grupos.forEach(g => LDB.seed('grupos/' + g.id, g)); SEED.horario.forEach(x => LDB.seed('horario/' + x.id, x)); }
  S.db = LDB; renderNav(); subscribe(); updSync(); render(); SYNC.run(false);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => { });
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }
}
