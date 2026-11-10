'use strict';
/* Plan académico (Inglés y Computación): se carga desde Excel, una hoja por nivel. Se guarda en este dispositivo (IndexedDB). */

/* ---------- almacén local del plan ---------- */
const PLAN = (() => {
  let db = null, okIdb = true; const mem = {};
  const open = () => new Promise((ok, no) => {
    if (!window.indexedDB) { no(new Error('sin indexedDB')); return; }
    const r = indexedDB.open('libreta-plan', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('c');
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  });
  return {
    ok: () => okIdb,
    async load() {
      try {
        db = await open();
        return await new Promise(ok => {
          const out = {}, rq = db.transaction('c').objectStore('c').openCursor();
          rq.onsuccess = e => { const c = e.target.result; if (c) { out[c.key] = c.value; c.continue(); } else ok(out); };
          rq.onerror = () => ok(out);
        });
      } catch (e) { okIdb = false; return mem; }
    },
    async apply(put, del) {
      Object.keys(put).forEach(k => { mem[k] = put[k]; }); (del || []).forEach(k => { delete mem[k]; });
      if (!db) return;
      await new Promise((ok, no) => {
        const tx = db.transaction('c', 'readwrite'), st = tx.objectStore('c');
        Object.keys(put).forEach(k => st.put(put[k], k)); (del || []).forEach(k => st.delete(k));
        tx.oncomplete = ok; tx.onerror = () => no(tx.error); tx.onabort = () => no(tx.error);
      });
    }
  };
})();

/* ---------- consultas ---------- */
let _idx = null;
const planReset = () => { _idx = null; };
function planIdx() {
  if (_idx) return _idx;
  const I = { ingles: {}, compu: {} };
  Object.keys(S.plan).forEach(k => {
    if (k.indexOf('c:') !== 0) return; const d = S.plan[k]; if (!d || !I[d.mat]) return;
    (I[d.mat][d.nivel] = I[d.mat][d.nivel] || []).push(d);
  });
  Object.keys(I).forEach(m => Object.keys(I[m]).forEach(n => I[m][n].sort((a, b) => a.n - b.n)));
  return (_idx = I);
}
const planNivel = (mat, nv) => planIdx()[mat][nv] || [];
const claseN = (mat, nv, n) => planNivel(mat, nv).find(d => d.n === n) || null;
const planMeta = mat => S.plan['m:' + mat] || {};
function nomNivel(mat, n) { const m = planMeta(mat); return (m.niveles && m.niveles[n]) || (mat === 'compu' ? NIVELES_C : NIVELES)[n] || ('Nivel ' + n); }
const nivelDe = (gid, mat) => { const g = S.grupos[gid]; if (!g) return 1; return mat === 'compu' ? (g.nivelCompu || g.nivel || 1) : (g.nivel || 1); };
const evalActiva = (gid, mat) => { const g = S.grupos[gid]; return (g && g.evalFase && g.evalFase[mat]) || null; };
function posicion(gid, mat) {
  mat = mat || 'ingles'; const g = S.grupos[gid]; if (!g) return 0;
  const dadas = listaDadas(gid, mat).filter(c => c.tipo !== 'eval').length;
  const rep = Object.values(S.bitacora).filter(b => b.grupoId === gid && b.materia === mat && b.repetir).length;
  return Math.max(0, dadas - rep + ((g.ajuste && g.ajuste[mat]) || 0));
}
function sigClase(gid, mat) {
  const nv = nivelDe(gid, mat), pos = posicion(gid, mat), n = pos + 1, ev = evalActiva(gid, mat), arr = planNivel(mat, nv), max = arr.length ? arr[arr.length - 1].n : 0, total = Math.max(CLASES_POR_NIVEL, max);
  const doc = claseN(mat, nv, n);
  return { mat, nivel: nv, pos, n, ev, doc, max, total, cargado: arr.length > 0, fin: n > total };
}
function tituloSig(si) {
  if (si.ev) return 'Clase de evaluación · ' + S.cfg.periodos[si.ev.periodo - 1];
  if (si.fin) return 'Nivel completo';
  if (si.doc) return 'Clase ' + si.n + ' · ' + (si.doc.titulo || si.doc.tema);
  return 'Clase ' + si.n + (si.cargado ? ' · aún no está en el plan cargado' : ' · sin plan cargado');
}
function bloqueDe(mat, nv, n) {
  const arr = planNivel(mat, nv), d = claseN(mat, nv, n); if (!d) return null;
  const temas = []; arr.forEach(x => { if (!temas.length || temas[temas.length - 1].t !== x.tema) temas.push({ t: x.tema, a: x.n, b: x.n }); else temas[temas.length - 1].b = x.n; });
  const i = temas.findIndex(t => n >= t.a && n <= t.b);
  return { i: i + 1, de: temas.length, tema: d.tema, a: temas[i].a, b: temas[i].b };
}
const linkify = t => esc(t).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">enlace</a>');
const partes = t => String(t || '').split(/[;\n]/).map(x => x.trim()).filter(Boolean);
function matLineas(d) { // { clave: descripción }
  const o = {}; String(d.detalle || '').split(/\n/).forEach(l => { const p = l.split(' · '); if (p.length > 1 && p[0].trim()) o[p[0].trim()] = p.slice(1).join(' · ').trim(); else if (l.trim()) o[l.trim().slice(0, 40)] = ''; });
  (d.claves || '').split(/[,;]/).map(x => x.trim()).filter(Boolean).forEach(k => { if (!(k in o)) o[k] = ''; });
  return o;
}
function periodoSug(gid, mat) {
  const hechos = new Set(listaDadas(gid, mat).filter(c => c.tipo === 'eval').map(c => c.periodo));
  for (let p = 1; p <= 3; p++) if (!hechos.has(p)) return p; return 3;
}

/* ---------- HTML de una clase del plan ---------- */
function claseHTML(d, abierto) {
  if (!d) return '';
  const act = (d.acts || []).map(a => '<tr><td style="white-space:nowrap;vertical-align:top" class="muted">' + esc(a.min) + '</td><td><span class="badge">' + esc(a.bloque) + '</span> <b>' + esc(a.nombre) + '</b><div class="small" style="margin-top:2px">' + esc(a.desarrollo) + '</div></td></tr>').join('');
  const ml = matLineas(d), claves = Object.keys(ml);
  return (d.objetivo ? '<h4>Objetivo</h4><p style="margin:0">' + esc(d.objetivo) + '</p>' : '') +
    (d.lenguaje ? '<h4>Lenguaje de la clase</h4><div class="chips">' + partes(d.lenguaje).map(x => '<span class="badge">' + esc(x) + '</span>').join('') + '</div>' : '') +
    (d.cuaderno ? '<h4>Nota para el cuaderno</h4><div class="note" style="white-space:pre-wrap">' + esc(d.cuaderno) + '</div>' : '') +
    (d.maestro ? '<details' + (abierto ? ' open' : '') + '><summary>Para el maestro</summary><p class="small" style="margin:6px 0 0;white-space:pre-wrap">' + esc(d.maestro) + '</p></details>' : '') +
    (claves.length ? '<h4>Material</h4><ul style="margin:0 0 0 18px;padding:0">' + claves.map(k => '<li><b>' + esc(k) + '</b>' + (ml[k] ? ' · ' + esc(ml[k]) : '') + '</li>').join('') + '</ul>' : '') +
    ((d.exacto || d.canva || d.enlaces) ? '<details><summary>Contenido y diseño del material</summary>' + (d.exacto ? '<p class="small" style="white-space:pre-wrap;margin:6px 0 0"><b>Contenido exacto:</b> ' + esc(d.exacto) + '</p>' : '') + (d.canva ? '<p class="small" style="white-space:pre-wrap;margin:6px 0 0"><b>Diseño en Canva:</b> ' + esc(d.canva) + '</p>' : '') + (d.enlaces ? '<p class="small" style="white-space:pre-wrap;margin:6px 0 0">' + linkify(d.enlaces) + '</p>' : '') + '</details>' : '') +
    (act ? '<h4>Actividades</h4><table>' + act + '</table>' : '') +
    (d.evidencia ? '<h4>Evidencia</h4><p style="margin:0">' + esc(d.evidencia) + '</p>' : '');
}
function evalHTML(gid, mat, ev) {
  const crit = S.cfg.criterios;
  return '<div class="note" style="margin-top:8px"><b>Esta clase es de evaluación (' + esc(S.cfg.periodos[ev.periodo - 1]) + ').</b> No avanza el plan: el grupo sigue en la clase ' + (posicion(gid, mat) + 1) + ' después.<ul style="margin:6px 0 0 18px;padding:0">' + crit.map(c => '<li>' + esc(c.nombre) + ' · ' + c.peso + '%</li>').join('') + '</ul>' +
    (alumnosDe(gid).length ? '<div class="small muted" style="margin-top:6px">Examen escrito: ' + alumnosDe(gid).length + ' copias. Al terminar, captura las calificaciones en Notas.</div>' : '') + '</div>';
}
function planHTML(gid, mat, si) {
  if (si.ev) return evalHTML(gid, mat, si.ev);
  if (si.fin) return '<p class="muted">Este grupo ya terminó las ' + si.total + ' clases de su nivel. Puedes subirlo de nivel en Grupos.</p>';
  if (!si.doc) return '<p class="muted">' + (si.cargado ? 'La clase ' + si.n + ' del nivel ' + si.nivel + ' todavía no está en el Excel cargado. Carga el archivo actualizado en Plan.' : 'No hay plan cargado para el nivel ' + si.nivel + ' de ' + MAT_NOMBRE[mat] + '. Cárgalo en Plan.') + '</p>';
  return claseHTML(si.doc, false);
}

/* ---------- lectura del Excel ---------- */
const COLMAP = { clase: 'n', tema: 'tema', fase: 'fase', estado: 'estado', titulo: 'titulo', objetivo: 'objetivo', lenguaje: 'lenguaje', para_el_maestro: 'maestro', nota_cuaderno: 'cuaderno', material_claves: 'claves', material_detalle: 'detalle', material_contenido_exacto: 'exacto', material_diseno_canva: 'canva', material_enlace_canva: 'enlaces', evidencia: 'evidencia' };
const normCol = h => normTxt(h).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
function leePlanLibro(wb, mat) {
  const docs = [], avisos = [], niveles = {}, nombres = {};
  wb.SheetNames.forEach(sn => {
    const m = String(sn).match(/nivel\s*(\d+)\s*(.*)$/i);
    if (!m) { avisos.push('La hoja “' + sn + '” no se llama “Nivel N …”; se omitió.'); return; }
    const nv = Number(m[1]); if (!(nv >= 1 && nv <= 10)) { avisos.push('La hoja “' + sn + '”: el nivel debe ir de 1 a 10; se omitió.'); return; }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '', raw: false });
    if (!rows.length) { avisos.push('Nivel ' + nv + ': la hoja no tiene clases.'); niveles[nv] = 0; nombres[nv] = titulo(m[2]); return; }
    nombres[nv] = titulo(m[2]) || nombres[nv]; const vistos = new Set(); let cuenta = 0;
    rows.forEach((r0, ri) => {
      const r = {}; Object.keys(r0).forEach(k => { r[normCol(k)] = String(r0[k] == null ? '' : r0[k]).trim(); });
      const n = parseInt(r.clase, 10); if (!n) { if (Object.values(r).some(Boolean)) avisos.push('Nivel ' + nv + ', renglón ' + (ri + 2) + ': sin número de clase; se omitió.'); return; }
      if (vistos.has(n)) { avisos.push('Nivel ' + nv + ': la clase ' + n + ' está repetida; se usó la última.'); }
      vistos.add(n);
      const d = { mat, nivel: nv, n };
      Object.keys(COLMAP).forEach(k => { if (k !== 'clase') d[COLMAP[k]] = r[k] || ''; });
      d.acts = [];
      for (let i = 1; i <= 12; i++) { const a = { min: r['act' + i + '_min'] || '', bloque: r['act' + i + '_bloque'] || '', nombre: r['act' + i + '_nombre'] || '', desarrollo: r['act' + i + '_desarrollo'] || '' }; if (a.nombre || a.desarrollo) d.acts.push(a); }
      d.borrador = /borrador|revisar|pendiente/i.test(d.estado || '');
      docs.push(d); cuenta++;
    });
    niveles[nv] = cuenta;
    const ns = Array.from(vistos).sort((a, b) => a - b); for (let i = 1; i < ns.length; i++) if (ns[i] !== ns[i - 1] + 1) avisos.push('Nivel ' + nv + ': faltan las clases ' + (ns[i - 1] + 1) + (ns[i] - 1 > ns[i - 1] + 1 ? ' a ' + (ns[i] - 1) : '') + '.');
  });
  return { docs, avisos, niveles, nombres };
}
async function cargaPlan(mat, f) {
  if (!(await asegurarXLSX())) { toast('No se pudo abrir el lector de Excel. Abre la app una vez con internet para actualizarla.', 'bad'); return; }
  let wb;
  try { wb = XLSX.read(new Uint8Array(await leerArchivo(f)), { type: 'array' }); }
  catch (e) { toast('No pude abrir ese archivo. Si está en Google Drive, descárgalo primero al dispositivo y elígelo de nuevo.', 'bad'); return; }
  const r = leePlanLibro(wb, mat);
  if (!r.docs.length) { S.ui.planAvisos = r.avisos.length ? r.avisos : ['No encontré clases en el archivo.']; toast('No encontré clases en ese Excel', 'bad'); render(); return; }
  const put = {}, del = [], nivs = Object.keys(r.niveles).map(Number);
  Object.keys(S.plan).forEach(k => { if (k.indexOf('c:' + mat + ':') === 0 && nivs.indexOf(S.plan[k].nivel) >= 0) del.push(k); });
  r.docs.forEach(d => { put['c:' + mat + ':' + d.nivel + ':' + d.n] = d; });
  const meta = Object.assign({ niveles: {} }, planMeta(mat)); meta.niveles = Object.assign({}, meta.niveles);
  Object.keys(r.nombres).forEach(n => { if (r.nombres[n]) meta.niveles[n] = r.nombres[n]; }); meta.cargado = hoy(); meta.archivo = f.name; put['m:' + mat] = meta;
  try { await PLAN.apply(put, del.filter(k => !(k in put))); }
  catch (e) { toast('No se pudo guardar el plan en este dispositivo: ' + ((e && e.message) || 'error'), 'bad'); return; }
  del.forEach(k => { if (!(k in put)) delete S.plan[k]; }); Object.assign(S.plan, put); planReset();
  S.ui.planAvisos = r.avisos; S.ui.planOk = MAT_NOMBRE[mat] + ': ' + r.docs.length + ' clases en ' + nivs.length + ' nivel(es) (' + f.name + ')';
  toast('Plan de ' + MAT_NOMBRE[mat] + ' cargado: ' + r.docs.length + ' clases', 'ok'); render();
}
CHG.planArchivo = async (el, mat) => { const f = el.files && el.files[0]; if (!f) return; try { await cargaPlan(mat, f); } catch (e) { console.error(e); toast('No pude leer ese archivo: ' + (e.message || 'error'), 'bad'); } el.value = ''; };
ACT.planBorrar = (el, mat) => ask('¿Quitar de este dispositivo el plan de <b>' + MAT_NOMBRE[mat] + '</b>? El avance de los grupos no se borra.', async () => {
  const del = Object.keys(S.plan).filter(k => k === 'm:' + mat || k.indexOf('c:' + mat + ':') === 0);
  try { await PLAN.apply({}, del); } catch (e) { toast('No se pudo borrar', 'bad'); return; }
  del.forEach(k => { delete S.plan[k]; }); planReset(); S.ui.planAvisos = null; S.ui.planOk = null; render();
}, 'Quitar');
ACT.planPlantilla = (el, mat) => {
  const H = ['clase', 'tema', 'fase', 'estado', 'titulo', 'objetivo', 'lenguaje', 'para_el_maestro', 'nota_cuaderno', 'material_claves', 'material_detalle', 'material_contenido_exacto', 'material_diseno_canva', 'material_enlace_canva'];
  for (let i = 1; i <= 6; i++) H.push('act' + i + '_min', 'act' + i + '_bloque', 'act' + i + '_nombre', 'act' + i + '_desarrollo'); H.push('evidencia');
  const ej = [1, 'Tema del bloque', 'Presentar', 'Borrador por revisar', 'Título de la clase', 'Qué lograrán los niños', 'palabra1; palabra2', 'Notas para ti', '', 'A-CLAVE-1', 'A-CLAVE-1 · Descripción · cantidad · tamaño', '', '', ''];
  for (let i = 1; i <= 6; i++) ej.push(i === 1 ? '0-5' : '', i === 1 ? 'Rutina' : '', i === 1 ? 'Saludo' : '', i === 1 ? 'Cómo se desarrolla la actividad' : ''); ej.push('Qué muestra el niño al terminar');
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([H, ej]), 'Nivel 1 ' + nomNivel(mat, 1));
  descargar('plantilla-plan-' + mat + '.xlsx', XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
};

/* ---------- vista ---------- */
VIEWS.temario = function () {
  const mat = S.ui.pm = S.ui.pm || 'ingles', M = planMeta(mat);
  let h = '<div class="row sp" style="margin-bottom:12px"><div><h2>Plan académico</h2><div class="muted">Las clases de cada nivel, tal como las preparas en tu Excel.</div></div><div class="seg">' + ['ingles', 'compu'].map(m => '<button class="' + (mat === m ? 'on' : '') + '" data-act="planMat|' + m + '">' + MAT_NOMBRE[m] + '</button>').join('') + '</div></div>';
  const tot = NIVS.reduce((s, n) => s + planNivel(mat, n).length, 0), borr = NIVS.reduce((s, n) => s + planNivel(mat, n).filter(d => d.borrador).length, 0);
  h += '<div class="card"><div class="row" style="gap:22px"><div class="kpi"><b>' + tot + '</b><span>clases cargadas</span></div><div class="kpi"><b>' + NIVS.filter(n => planNivel(mat, n).length).length + '/10</b><span>niveles con plan</span></div><div class="kpi"><b>' + borr + '</b><span>borradores por revisar</span></div></div>' +
    '<div class="small muted" style="margin-top:8px">' + (M.cargado ? 'Última carga: ' + esc(M.cargado) + (M.archivo ? ' · ' + esc(M.archivo) : '') + '.' : 'Todavía no hay plan de ' + MAT_NOMBRE[mat] + '.') + '</div></div>';
  if (!PLAN.ok()) h += '<div class="card note warn">Este navegador no permite guardar el plan de forma permanente; se perderá al cerrar la app.</div>';
  if (S.ui.planOk) h += '<div class="card note"><b>✓ ' + esc(S.ui.planOk) + '</b></div>';
  if (S.ui.planAvisos && S.ui.planAvisos.length) h += '<div class="card note warn"><b>Revisa estos detalles del archivo:</b><ul style="margin:6px 0 0 18px;padding:0">' + S.ui.planAvisos.slice(0, 14).map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>' + (S.ui.planAvisos.length > 14 ? '<div class="small">y ' + (S.ui.planAvisos.length - 14) + ' más…</div>' : '') + '</div>';
  h += '<div class="card"><h3>Cargar el plan de ' + MAT_NOMBRE[mat] + '</h3><p class="muted" style="margin:0 0 10px">Sube tu Excel: una hoja por nivel, con el nombre “Nivel 1 Descubro”, “Nivel 2 Frases”… y una clase por renglón. Cada vez que cargas, se reemplazan los niveles que trae el archivo y los demás se conservan; el avance de tus grupos no cambia. El plan se guarda en este dispositivo: cárgalo también en tu otro aparato.</p>' +
    '<div class="row"><input type="file" accept=".xlsx,.xls" data-chg="planArchivo|' + mat + '"><button class="btn" data-act="planPlantilla|' + mat + '">Descargar formato vacío</button>' + (tot ? '<button class="btn sm danger" data-act="planBorrar|' + mat + '">Quitar plan</button>' : '') + '</div></div>';
  h += '<div class="stack" style="gap:8px">' + NIVS.map(n => {
    const arr = planNivel(mat, n), ab = S.ui.pn === n, gs = ordenGrupos().filter(g => matsDe(g.id).indexOf(mat) >= 0 && nivelDe(g.id, mat) === n);
    let d = '';
    if (ab) {
      let ult = null;
      d = '<div style="margin-top:10px">' + (arr.length ? arr.map(c => {
        const nb = c.tema !== ult, abierta = S.ui.pc === mat + n + '_' + c.n; ult = c.tema;
        return (nb ? '<h4 style="margin-top:12px">Bloque: ' + esc(c.tema) + '</h4>' : '') + '<div style="border-top:1px solid var(--line);padding:6px 0"><div class="row sp" data-act="planClase|' + n + '|' + c.n + '" style="cursor:pointer;flex-wrap:nowrap"><div><b>' + c.n + '.</b> ' + esc(c.titulo) + ' <span class="badge">' + esc(c.fase) + '</span>' + (c.borrador ? ' <span class="badge warn">borrador</span>' : '') + '</div><span class="muted">' + (abierta ? '▾' : '▸') + '</span></div>' + (abierta ? claseHTML(c, false) : '') + '</div>';
      }).join('') : '<div class="small muted">Sin clases cargadas en este nivel.</div>') + '</div>';
    }
    return '<div class="card" style="margin:0"><div class="row sp" data-act="planNivel|' + n + '" style="cursor:pointer;flex-wrap:nowrap"><div><span class="badge acc">Nivel ' + n + '</span> <b>' + esc(nomNivel(mat, n)) + '</b><div class="small muted">' + arr.length + ' de ' + CLASES_POR_NIVEL + ' clases' + (arr.some(x => x.borrador) ? ' · ' + arr.filter(x => x.borrador).length + ' por revisar' : '') + (gs.length ? ' · grupos: ' + gs.map(g => gNombre(g.id)).join(', ') : '') + '</div></div><span class="muted">' + (ab ? '▾' : '▸') + '</span></div>' + d + '</div>';
  }).join('') + '</div>';
  return h;
};
ACT.planMat = (el, m) => { S.ui.pm = m; S.ui.pn = null; S.ui.planAvisos = null; S.ui.planOk = null; render(); };
ACT.planNivel = (el, n) => { S.ui.pn = S.ui.pn === Number(n) ? null : Number(n); render(); };
ACT.planClase = (el, n, c) => { const k = S.ui.pm + n + '_' + c; S.ui.pc = S.ui.pc === k ? null : k; render(); };
