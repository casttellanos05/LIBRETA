'use strict';
/* Avance por grupo, métricas (sin nombres), cambios al programa y reporte final por grupo */

/* ---------- estadísticas ---------- */
const avg = arr => { const v = arr.filter(num); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
function notasGrupo(gid, mat, per) {
  return alumnosDe(gid).map(a => {
    const d = calDoc(a.id, mat), p = per === 'anual' ? null : (d && d.p && d.p[per]) || {};
    const o = { a, fin: per === 'anual' ? notaAnual(d) : notaPeriodo(d, per) };
    critDe(mat).forEach(c => { o[c.id] = p ? p[c.id] : null; });
    return o;
  });
}
function statsGrupo(gid, mat, per) {
  const L = notasGrupo(gid, mat, per), fin = L.map(x => x.fin).filter(x => x != null);
  const st = { n: alumnosDe(gid).length, conNota: fin.length, final: avg(fin), aprob: fin.length ? Math.round(100 * fin.filter(x => x >= S.cfg.esc.aprob).length / fin.length) : null, dist: {} };
  critDe(mat).forEach(c => { st[c.id] = avg(L.map(x => x[c.id])); });
  for (let k = S.cfg.esc.min; k <= S.cfg.esc.max; k++) st.dist[k] = 0;
  fin.forEach(x => { const k = Math.max(S.cfg.esc.min, Math.min(S.cfg.esc.max, Math.round(x))); st.dist[k]++; });
  return st;
}
function bitStats(gid) {
  const bs = Object.values(S.bitacora).filter(b => b.grupoId === gid);
  const tags = {}; bs.forEach(b => (b.tags || []).forEach(t => { tags[t] = (tags[t] || 0) + 1; }));
  return { n: bs.length, animo: avg(bs.map(b => b.animo)), part: avg(bs.map(b => b.part)), planSi: bs.filter(b => b.plan === 'si').length, planParcial: bs.filter(b => b.plan === 'parcial').length, planNo: bs.filter(b => b.plan === 'no').length, repetir: bs.filter(b => b.repetir).length, tags };
}
const r2 = x => (x == null ? null : Math.round(x * 100) / 100);

/* Documento de métricas: SOLO agregados, sin nombres ni notas individuales */
function metricasDoc() {
  const out = { actualizado: new Date().toISOString(), ciclo: S.cfg.ciclo, criterios: { ingles: critDe('ingles').map(c => ({ id: c.id, nombre: c.nombre, peso: c.peso })), compu: critDe('compu').map(c => ({ id: c.id, nombre: c.nombre, peso: c.peso })) }, aprobatorio: S.cfg.esc.aprob, grupos: {}, grados: {}, niveles: {} };
  const acumG = {}, acumN = {};
  ordenGrupos().forEach(g => {
    const o = { grado: g.grado, nivel: g.nivel, alumnos: alumnosDe(g.id).length, avance: avanceDoc(g.id), bitacora: (() => { const b = bitStats(g.id); return { registros: b.n, animo: r2(b.animo), participacion: r2(b.part), planCumplido: b.planSi, planParcial: b.planParcial, planNoCumplido: b.planNo, repeticiones: b.repetir, etiquetas: b.tags }; })() };
    matsDe(g.id).forEach(m => {
      o[m] = {};
      [1, 2, 3, 'anual'].forEach(p => {
        const s = statsGrupo(g.id, m, p); if (!s.conNota) return;
        const e = { conNota: s.conNota, final: r2(s.final), aprobadosPct: s.aprob, distribucion: s.dist }; critDe(m).forEach(c => { e[c.id] = r2(s[c.id]); });
        o[m][p === 'anual' ? 'anual' : 'p' + p] = e;
        if (p === 'anual') { (acumG[g.grado + '|' + m] = acumG[g.grado + '|' + m] || []).push(s.final); (acumN[g.nivel + '|' + m] = acumN[g.nivel + '|' + m] || []).push(s.final); }
      });
    });
    out.grupos[g.id] = o;
  });
  Object.keys(acumG).forEach(k => { const [gr, m] = k.split('|'); (out.grados[gr] = out.grados[gr] || {})[m] = r2(avg(acumG[k])); });
  Object.keys(acumN).forEach(k => { const [nv, m] = k.split('|'); (out.niveles[nv] = out.niveles[nv] || {})[m] = r2(avg(acumN[k])); });
  return out;
}
async function guardarMetricas(silencioso) {
  if (!S.db) return;
  save('metricas', 'main', metricasDoc());
  if (!silencioso) toast('Métricas actualizadas para Claude (solo promedios, sin nombres)', 'ok');
}
ACT.metGuardar = () => { guardarMetricas(false); render(); };

const barra = (v, max, cls) => '<div class="bar ' + (cls || '') + '"><i style="width:' + (v == null ? 0 : Math.max(2, Math.min(100, v / max * 100))) + '%"></i></div>';

/* ---------- vista ---------- */

/* ---------- Resumen de evaluaciones: qué grupos ya están evaluados, por materia ---------- */
/* El trimestre "activo" de un grupo es el más avanzado en el que algún alumno ya tiene calificación (mínimo el 1.º). */
function evalEstado(gid, mat) {
  const al = alumnosDe(gid), crit = critDe(mat), N = al.length, per = S.cfg.periodos;
  const st = [1, 2, 3].map(p => {
    let comp = 0, alguno = 0, parcial = 0;
    const marks = al.map(a => {
      const d = calDoc(a.id, mat), pp = d && d.p && d.p[p], k = pp ? crit.filter(c => num(pp[c.id])).length : 0;
      if (k) alguno++; if (k && k < crit.length) parcial++; if (k >= crit.length && crit.length) { comp++; return 2; } return k ? 1 : 0;
    });
    return { p, comp, alguno, parcial, marks };
  });
  let act = 1; st.forEach(x => { if (x.alguno) act = x.p; });
  const a = st[act - 1], falta = N - a.comp, previos = st.slice(0, act - 1).filter(x => x.comp < N).map(x => ({ p: x.p, falta: N - x.comp }));
  return { N, act, nombre: per[act - 1] || ('Trimestre ' + act), comp: a.comp, falta, parcial: a.parcial, marks: a.marks, completo: N > 0 && falta === 0, anio: N > 0 && falta === 0 && act === 3, previos };
}
function evalCard(gid, mat, i, anim, el) {
  const e = evalEstado(gid, mat), per = S.cfg.periodos;
  const txt = !e.N ? 'sin alumnos' : e.anio ? 'año evaluado completo ✓' : e.completo ? 'evaluado ✓' : (e.falta === 1 ? 'falta 1 alumno' : 'faltan ' + e.falta + ' alumnos');
  const prev = e.previos.map(x => '<div class="evw">' + esc((per[x.p - 1] || '').replace('trimestre', 'trim.')) + ': ' + (x.falta === 1 ? 'falta 1' : 'faltan ' + x.falta) + '</div>').join('');
  return '<div class="evc ev-' + mat + (e.completo ? ' done' : '') + (anim ? ' anim' : '') + '" style="--d:' + (i * 70 - (el || 0)) + 'ms">' +
    '<div class="evh"><b>' + gNombre(gid) + '</b><span>' + e.comp + '/' + e.N + '</span></div>' +
    '<div class="evg">' + e.marks.map((m, k) => '<i class="ec f' + m + '" style="--i:' + k + '"></i>').join('') + '</div>' +
    '<div class="evp">' + esc(e.nombre) + '</div><div class="evt' + (e.completo ? ' evok' : '') + '">' + txt + '</div>' + prev +
    '<div class="evb"><i style="width:' + (e.N ? Math.round(100 * e.comp / e.N) : 0) + '%"></i></div></div>';
}
function evalResumen() {
  /* La animación corre al entrar; si la pantalla se redibuja mientras corre, sigue donde iba (retraso negativo). */
  if (!S.ui.evT) S.ui.evT = Date.now(); const el = Date.now() - S.ui.evT, anim = el < 3600;
  let h = '<div class="card evr"><div class="row sp" style="margin-bottom:2px"><h3 style="margin:0">Evaluaciones por grupo</h3><span class="small muted">Cada cuadrito es un alumno · se llena al capturar su evaluación</span></div>';
  ['ingles', 'compu'].forEach(m => {
    const gs = ordenGrupos().filter(g => matsDe(g.id).indexOf(m) >= 0 && alumnosDe(g.id).length); if (!gs.length) return;
    const ok = gs.filter(g => evalEstado(g.id, m).completo).length;
    h += '<div class="evm ev-' + m + '"><i></i><b>' + MAT_NOMBRE[m] + '</b><span class="muted small">' + ok + ' de ' + gs.length + ' grupos con su trimestre completo</span></div><div class="evgrid">' + gs.map((g, i) => evalCard(g.id, m, i, anim, el)).join('') + '</div>';
  });
  return h + '</div>';
}

VIEWS.avance = function () {
  const sub = S.ui.av || 'resumen';
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>Avance</h2><div class="muted">Dónde va cada grupo y cómo van los resultados.</div></div><div class="seg">' + [['resumen', 'Resumen'], ['grupos', 'Por grupo'], ['metricas', 'Métricas'], ['cambios', 'Cambios'], ['reporte', 'Reporte final']].map(x => '<button class="' + (sub === x[0] ? 'on' : '') + '" data-act="avSub|' + x[0] + '">' + x[1] + (x[0] === 'cambios' && pendientes().length ? ' (' + pendientes().length + ')' : '') + '</button>').join('') + '</div></div>';
  if (!Object.keys(S.grupos).length) return h + '<div class="card empty">Todavía no hay grupos.</div>';
  return h + (sub === 'resumen' ? evalResumen() : '') + ({ resumen: avResumen, grupos: avGrupos, metricas: avMetricas, cambios: avCambios, reporte: avReporte }[sub])();
};
ACT.avSub = (el, s) => { S.ui.av = s; render(); };
const pendientes = () => Object.values(S.cambios).filter(c => c.estado === 'pendiente');

function avanceDoc(gid) {
  const o = {}; matsDe(gid).forEach(m => { const si = sigClase(gid, m); o[m] = { nivel: si.nivel, clasesCompletadas: si.pos, claseSiguiente: si.fin ? null : si.n, deTotal: si.total, enEvaluacion: si.ev ? S.cfg.periodos[si.ev.periodo - 1] : null, impartidas: listaDadas(gid, m).length }; });
  return o;
}
function chipsRegistro(gid, mat, si) {
  const fechas = {}; listaDadas(gid, mat).forEach(c => { if (c.tipo !== 'eval' && c.claseN) fechas[c.claseN] = c.fecha; });
  let h = '<div class="row" style="gap:3px;margin-top:6px">';
  for (let k = 1; k <= si.total; k++) {
    const hecha = k <= si.pos, actual = k === si.n && !si.fin, d = claseN(mat, si.nivel, k);
    h += '<span class="badge ' + (hecha ? 'ok' : actual ? 'acc' : '') + '" style="min-width:26px;justify-content:center;' + (actual ? 'outline:2px solid var(--acc,#2457d6);' : '') + (!hecha && !actual ? 'opacity:.55;' : '') + '" title="Clase ' + k + (d ? ': ' + esc(d.titulo) : ' (sin plan)') + (fechas[k] ? ' · ' + fmtCorto(fechas[k]) : '') + '">' + k + '</span>';
  }
  return h + '</div>';
}
function avGrupos() {
  return '<div class="grid2">' + ordenGrupos().map(g => {
    const b = bitStats(g.id);
    let h = '<div class="card"><div class="row sp"><span class="gtitle">' + gNombre(g.id) + '</span><span class="small muted">' + alumnosDe(g.id).length + ' alumnos</span></div>';
    matsDe(g.id).forEach(mat => {
      const si = sigClase(g.id, mat), bl = !si.fin && !si.ev ? bloqueDe(mat, si.nivel, si.n) : null, fk = g.id + '|' + mat, abre = S.ui.evalForm === fk;
      h += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)"><div class="row sp"><b>' + MAT_NOMBRE[mat] + '</b><span class="badge acc">Nivel ' + si.nivel + ' · ' + esc(nomNivel(mat, si.nivel)) + '</span></div>' +
        '<div class="row sp small" style="margin-top:6px"><span>' + (si.fin ? 'Nivel completo' : 'Va en la clase <b>' + si.n + '</b> de ' + si.total) + '</span><span class="muted">' + listaDadas(g.id, mat).length + ' clases impartidas</span></div>' + barra(Math.min(si.pos, si.total), si.total) +
        '<div style="margin-top:6px"><span class="muted">Le toca:</span> <b>' + esc(tituloSig(si)) + '</b></div>' + (bl ? '<div class="small muted">Bloque ' + bl.i + ' de ' + bl.de + ': ' + esc(bl.tema) + '</div>' : '') +
        chipsRegistro(g.id, mat, si) +
        '<div class="row" style="margin-top:8px"><span class="small muted">Ajustar:</span><button class="btn sm" data-act="ajusta|' + g.id + '|' + mat + '|-1">−1</button><button class="btn sm" data-act="ajusta|' + g.id + '|' + mat + '|1">+1</button><input id="ir' + g.id + mat + '" inputmode="numeric" placeholder="Ir a clase…" style="width:104px;min-height:30px"><button class="btn sm" data-act="irClase|' + g.id + '|' + mat + '">Ir</button></div>';
      if (si.ev) h += '<div class="note warn row sp" style="margin-top:8px"><span><b>En fase de evaluación</b> · ' + esc(S.cfg.periodos[si.ev.periodo - 1]) + '. Su siguiente clase será de evaluación.</span><button class="btn sm" data-act="evalCancelar|' + g.id + '|' + mat + '">Cancelar</button></div>';
      else if (abre) h += '<div class="note" style="margin-top:8px"><div class="row"><label class="f">Periodo que se evalúa<select data-chg="evalPer|' + g.id + '|' + mat + '">' + S.cfg.periodos.map((p, i) => '<option value="' + (i + 1) + '"' + (periodoSug(g.id, mat) === i + 1 ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select></label><button class="btn pri" data-act="evalIniciar|' + g.id + '|' + mat + '" style="align-self:flex-end">Aplicar examen · iniciar fase de evaluación</button><button class="btn ghost" data-act="evalForm|' + g.id + '|' + mat + '" style="align-self:flex-end">Cancelar</button></div><div class="small muted" style="margin-top:4px">La siguiente clase de ' + MAT_NOMBRE[mat] + ' de ' + gNombre(g.id) + ' se dedica a evaluar y no avanza el plan.</div></div>';
      else h += '<div style="margin-top:8px"><button class="btn sm" data-act="evalForm|' + g.id + '|' + mat + '">Aplicar examen · iniciar fase de evaluación</button></div>';
      h += '</div>';
    });
    if (b.n) h += '<div class="small muted" style="margin-top:10px">Bitácora: ánimo ' + (b.animo ? ANIMOS[Math.round(b.animo) - 1] : '—') + ' · participación ' + fix1(b.part) + '/5</div>';
    return h + '</div>';
  }).join('') + '</div>';
}
ACT.ajusta = (el, id, mat, d) => {
  d = Number(d); if (posicion(id, mat) + d < 0) return;
  const g = cl(S.grupos[id]); g.ajuste = g.ajuste || {}; g.ajuste[mat] = (g.ajuste[mat] || 0) + d; save('grupos', id, g); render();
};
ACT.irClase = (el, id, mat) => {
  const inp = $('#ir' + id + mat), n = parseInt(inp && inp.value, 10), si = sigClase(id, mat);
  if (!(n >= 1 && n <= si.total)) { toast('Escribe un número de clase de 1 a ' + si.total, 'bad'); return; }
  const g = cl(S.grupos[id]); g.ajuste = g.ajuste || {}; g.ajuste[mat] = (g.ajuste[mat] || 0) + (n - 1 - si.pos); save('grupos', id, g); toast(gNombre(id) + ' ahora va en la clase ' + n, 'ok'); render();
};

/* ---------- métricas de un alumno (para el menú de cada niño) ---------- */
function aluMetricasHTML(a) {
  const g = S.grupos[a.grupoId]; if (!g) return '';
  let h = '<div class="grid2">';
  matsDe(g.id).forEach(mat => {
    const d = calDoc(a.id, mat), si = sigClase(g.id, mat), crit = critDe(mat);
    const rows = [1, 2, 3].map(p => { const fin = notaPeriodo(d, p); if (fin == null) return null; const gs = statsGrupo(g.id, mat, p); return { p, x: d.p[p], fin, gm: gs.final, gs }; }).filter(Boolean);
    h += '<div class="card flat" style="margin:0"><div class="row sp"><b>' + MAT_NOMBRE[mat] + '</b><span class="small muted">El grupo va en la clase ' + (si.fin ? '—' : si.n) + ' · Nivel ' + si.nivel + '</span></div>';
    if (!rows.length) h += '<div class="small muted" style="margin-top:6px">Aún no tiene calificaciones de ' + MAT_NOMBRE[mat] + '.</div>';
    else {
      h += '<div class="scroll"><table style="margin-top:6px"><tr><th>Periodo</th>' + crit.map(c => '<th class="n">' + esc(c.nombre.replace('Examen ', 'Ex. ').replace(' en clase', '')) + '</th>').join('') + '<th class="n">Final</th><th class="n">Grupo</th></tr>' + rows.map(r => '<tr><td>' + esc(S.cfg.periodos[r.p - 1]) + '</td>' + crit.map(c => '<td class="n">' + (num(r.x[c.id]) ? r.x[c.id] : '—') + '</td>').join('') + '<td class="n"><b>' + fmtNota(r.fin) + '</b></td><td class="n muted">' + fix1(r.gm) + '</td></tr>').join('') + '</table></div>';
      const u = rows[rows.length - 1], dif = u.fin - u.gm, tend = rows.length > 1 ? rows[rows.length - 1].fin - rows[0].fin : null;
      let est = u.fin < S.cfg.esc.aprob ? ['warn', 'Merece un impulso extra'] : dif >= 0.5 ? ['ok', 'Por encima del promedio del grupo'] : dif <= -0.5 ? ['warn', 'Un poco por debajo del grupo'] : ['acc', 'En el promedio del grupo'];
      const dc = crit.map(c => ({ c, v: u.x[c.id], gm: u.gs[c.id] })).filter(z => num(z.v) && z.gm != null).map(z => Object.assign(z, { d: z.v - z.gm })).sort((p, q) => p.d - q.d);
      h += '<div class="row" style="margin-top:8px;gap:6px"><span class="badge ' + est[0] + '">' + est[1] + '</span>' + (tend != null ? '<span class="badge ' + (tend > 0.05 ? 'ok' : tend < -0.05 ? 'warn' : '') + '">' + (tend > 0.05 ? '↑ Va mejorando' : tend < -0.05 ? '↓ Bajó respecto al inicio' : '→ Estable') + '</span>' : '') + '</div>';
      if (dc.length > 1) h += '<div class="small muted" style="margin-top:6px">' + (dc[dc.length - 1].d > 0.4 ? 'Fortaleza: ' + esc(dc[dc.length - 1].c.nombre) + '. ' : '') + (dc[0].d < -0.4 ? 'Para reforzar: ' + esc(dc[0].c.nombre) + '.' : '') + '</div>';
      if (rows.length === 3) h += '<div class="small" style="margin-top:6px">Promedio anual: <b>' + fmtNota(notaAnual(d)) + '</b></div>';
      const ob = [3, 2, 1].map(p => d.p[p] && d.p[p].obs).find(Boolean); if (ob) h += '<div class="small muted" style="margin-top:6px">Última observación: “' + esc(ob) + '”</div>';
    }
    h += '</div>';
  });
  return h + '</div>';
}

/* ---------- resumen general y por grado ---------- */
function resumenGrupos(gs, mat, per) {
  const fin = [], crit = {}, crs = critDe(mat); crs.forEach(c => { crit[c.id] = []; });
  gs.forEach(g => notasGrupo(g.id, mat, per).forEach(x => { if (x.fin != null) fin.push(x.fin); crs.forEach(c => { if (num(x[c.id])) crit[c.id].push(x[c.id]); }); }));
  const bs = gs.map(g => bitStats(g.id)), part = avg(bs.map(b => b.part)), animo = avg(bs.map(b => b.animo));
  return { n: gs.reduce((s, g) => s + alumnosDe(g.id).length, 0), conNota: fin.length, final: avg(fin), aprob: fin.length ? Math.round(100 * fin.filter(x => x >= S.cfg.esc.aprob).length / fin.length) : null, crit: crs.map(c => ({ c, v: avg(crit[c.id]) })), part, animo, dadas: gs.reduce((s, g) => s + listaDadas(g.id, mat).length, 0) };
}
function avResumen() {
  const n = S.ui.met = S.ui.met || { m: 'ingles', p: 1 }, per = n.p === 'anual' ? 'anual' : Number(n.p);
  const gs = ordenGrupos().filter(g => matsDe(g.id).indexOf(n.m) >= 0), T = resumenGrupos(gs, n.m, per);
  let h = '<div class="card"><div class="row"><div class="seg">' + ['ingles', 'compu'].map(m => '<button class="' + (n.m === m ? 'on' : '') + '" data-act="metSet|m|' + m + '">' + MAT_NOMBRE[m] + '</button>').join('') + '</div><div class="seg">' + S.cfg.periodos.map((p, i) => '<button class="' + (n.p === i + 1 ? 'on' : '') + '" data-act="metSet|p|' + (i + 1) + '">' + esc(p) + '</button>').join('') + '<button class="' + (n.p === 'anual' ? 'on' : '') + '" data-act="metSet|p|anual">Anual</button></div></div></div>';
  h += '<div class="card"><h3>Desempeño general · ' + MAT_NOMBRE[n.m] + '</h3><div class="row" style="gap:22px"><div class="kpi"><b>' + gs.length + '</b><span>grupos</span></div><div class="kpi"><b>' + T.n + '</b><span>alumnos</span></div><div class="kpi"><b>' + T.dadas + '</b><span>clases impartidas</span></div><div class="kpi"><b>' + fix1(T.final) + '</b><span>promedio general</span></div><div class="kpi"><b>' + (T.aprob == null ? '—' : T.aprob + '%') + '</b><span>aprobados</span></div><div class="kpi"><b>' + fix1(T.part) + '</b><span>participación (1–5)</span></div></div>' +
    (T.conNota ? '<div style="margin-top:12px">' + T.crit.map(x => '<div class="row" style="gap:10px;padding:3px 0;flex-wrap:nowrap"><span style="width:150px">' + esc(x.c.nombre) + '</span><div class="grow">' + barra(x.v, 10, 'gold') + '</div><b style="width:36px;text-align:right">' + fix1(x.v) + '</b></div>').join('') + '</div>' : '<div class="small muted" style="margin-top:8px">Aún no hay calificaciones capturadas en este periodo.</div>') + '</div>';
  [1, 2, 3, 4, 5, 6].forEach(gr => {
    const gg = gs.filter(g => g.grado === gr); if (!gg.length) return; const R = resumenGrupos(gg, n.m, per);
    h += '<div class="card"><div class="row sp"><h3 style="margin:0">' + gr + '.º grado</h3><div class="row" style="gap:16px"><div class="kpi"><b>' + fix1(R.final) + '</b><span>promedio</span></div><div class="kpi"><b>' + (R.aprob == null ? '—' : R.aprob + '%') + '</b><span>aprobados</span></div><div class="kpi"><b>' + R.n + '</b><span>alumnos</span></div></div></div>' +
      (R.conNota ? '<div style="margin-top:8px">' + R.crit.map(x => '<div class="row" style="gap:10px;padding:2px 0;flex-wrap:nowrap"><span style="width:150px" class="small">' + esc(x.c.nombre) + '</span><div class="grow">' + barra(x.v, 10) + '</div><b style="width:36px;text-align:right">' + fix1(x.v) + '</b></div>').join('') + '</div>' : '') +
      '<div class="scroll"><table style="margin-top:10px"><tr><th>Grupo</th><th>Nivel</th><th>Va en</th><th class="n">Promedio</th><th class="n">Aprob.</th><th class="n">Particip.</th></tr>' + gg.map(g => {
        const s = statsGrupo(g.id, n.m, per), si = sigClase(g.id, n.m), b = bitStats(g.id);
        return '<tr><td><b>' + gNombre(g.id) + '</b></td><td>' + si.nivel + '</td><td>' + (si.ev ? 'Evaluación' : si.fin ? 'Completo' : 'Clase ' + si.n) + '</td><td class="n"><b>' + fix1(s.final) + '</b></td><td class="n">' + (s.aprob == null ? '—' : s.aprob + '%') + '</td><td class="n">' + fix1(b.part) + '</td></tr>';
      }).join('') + '</table></div></div>';
  });
  return h;
}

/* Cuadro de honor: mejores promedios (se permiten empates: si varios igualan el último lugar, todos entran). */
function topN(lista, n) {
  const L = lista.slice().sort((a, b) => b.fin - a.fin || a.a.nombre.localeCompare(b.a.nombre, 'es'));
  L.forEach(x => { x.lugar = 1 + L.filter(y => y.fin > x.fin).length; });
  return L.filter(x => x.lugar <= n);
}
function honorTabla(L) {
  return '<table class="honor"><tr><th class="n">#</th><th>Alumno</th><th>Grupo</th><th class="n">Promedio</th></tr>' + L.map(x => '<tr class="' + (x.lugar === 1 ? 'oro' : x.lugar === 2 ? 'plata' : x.lugar === 3 ? 'bronce' : '') + '"><td class="n"><b>' + x.lugar + '</b></td><td>' + esc(x.a.nombre) + '</td><td>' + gNombre(x.gid) + '</td><td class="n"><b>' + fix1(x.fin) + '</b></td></tr>').join('') + '</table>';
}
function honorCard(gs, mat, per) {
  const todos = []; gs.forEach(g => notasGrupo(g.id, mat, per).forEach(x => { if (x.fin != null) todos.push({ a: x.a, fin: x.fin, gid: g.id, grado: g.grado }); }));
  if (!todos.length) return '';
  const porGrado = [1, 2, 3, 4, 5, 6].map(gr => ({ gr, L: topN(todos.filter(x => x.grado === gr), 10) })).filter(x => x.L.length);
  const porGrupo = gs.map(g => ({ g, L: topN(todos.filter(x => x.gid === g.id), 3) })).filter(x => x.L.length);
  return '<div class="card honorc"><div class="row sp"><h3 style="margin:0">🏆 Cuadro de honor · ' + MAT_NOMBRE[mat] + '</h3><span class="small muted">Si hay empate en un lugar, entran todos</span></div>' +
    '<h4 style="margin:12px 0 4px">Los 10 mejores promedios de la escuela</h4><div class="scroll">' + honorTabla(topN(todos, 10)) + '</div>' +
    '<details style="margin-top:12px"><summary><b>Los 10 mejores por grado</b></summary><div class="grid2" style="margin-top:8px">' + porGrado.map(x => '<div><h4 style="margin:6px 0 4px">' + x.gr + '.º grado</h4><div class="scroll">' + honorTabla(x.L) + '</div></div>').join('') + '</div></details>' +
    '<details style="margin-top:8px"><summary><b>Los 3 mejores por grupo</b></summary><div class="grid2" style="margin-top:8px">' + porGrupo.map(x => '<div><h4 style="margin:6px 0 4px">' + gNombre(x.g.id) + '</h4><div class="scroll">' + honorTabla(x.L) + '</div></div>').join('') + '</div></details></div>';
}
/* ---------- Distribución de calificaciones: escuela o un grupo, y quién va mejor / quién necesita refuerzo ---------- */
const BANDAS = [{ n: 'Reprobado', c: '#c0392b' }, { n: '6 – 7', c: '#d9962b' }, { n: '8 – 9', c: '#2457d6' }, { n: '10', c: '#1f9d6b' }];
const bandaDe = k => k < S.cfg.esc.aprob ? 0 : k < 8 ? 1 : k < S.cfg.esc.max ? 2 : 3;
function resumenDist(ids, mat, per) {
  const fins = []; ids.forEach(id => notasGrupo(id, mat, per).forEach(x => { if (x.fin != null) fins.push(x.fin); }));
  const dist = {}; for (let k = S.cfg.esc.min; k <= S.cfg.esc.max; k++) dist[k] = 0;
  fins.forEach(x => { dist[Math.max(S.cfg.esc.min, Math.min(S.cfg.esc.max, Math.round(x)))]++; });
  const rep = fins.filter(x => x < S.cfg.esc.aprob).length;
  return { n: fins.length, dist, prom: avg(fins), repPct: fins.length ? Math.round(100 * rep / fins.length) : null, aprobPct: fins.length ? Math.round(100 * (fins.length - rep) / fins.length) : null };
}
function estadoGrupo(r, esc) { // relativo a la escuela: refuerzo si hay muchos reprobados o va claramente por debajo
  if (r.prom == null) return null;
  if (r.repPct >= 20 || (esc != null && r.prom <= esc - 0.4)) return { t: 'Refuerzo', k: 'bad' };
  if (esc != null && r.prom >= esc + 0.4 && r.repPct < 10) return { t: 'Destaca', k: 'ok' };
  return { t: 'Parejo', k: '' };
}
function histSVG(dist, mat) {
  const ks = Object.keys(dist).map(Number), mx = Math.max(1, ...Object.values(dist)), tot = ks.reduce((s, k) => s + dist[k], 0) || 1;
  const W = 560, H = 236, pl = 8, pr = 8, pt = 30, pb = 46, bw = (W - pl - pr) / ks.length, ch = H - pt - pb;
  let o = '<svg class="hist" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Distribución de calificaciones">';
  [0.5, 1].forEach(f => { o += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + (pt + ch * (1 - f)) + '" y2="' + (pt + ch * (1 - f)) + '" stroke="currentColor" stroke-opacity=".08"/>'; });
  ks.forEach((k, i) => {
    const v = dist[k], h = ch * v / mx, x = pl + i * bw + bw * 0.14, w = bw * 0.72, y = pt + ch - h, c = BANDAS[bandaDe(k)].c;
    o += '<g><title>' + (k === S.cfg.esc.min ? k + ' o menos' : k) + ': ' + v + ' alumno' + (v === 1 ? '' : 's') + '</title>' +
      (v ? '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="7" fill="' + c + '" style="animation-delay:' + (i * 70) + 'ms"/>' : '<rect x="' + x + '" y="' + (pt + ch - 2) + '" width="' + w + '" height="2" rx="1" fill="' + c + '" opacity=".35"/>') +
      '<text x="' + (x + w / 2) + '" y="' + (v ? y - 7 : pt + ch - 9) + '" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">' + v + '</text>' +
      '<text x="' + (x + w / 2) + '" y="' + (H - 24) + '" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">' + (k === S.cfg.esc.min ? '≤' + k : k) + '</text>' +
      '<text x="' + (x + w / 2) + '" y="' + (H - 7) + '" text-anchor="middle" font-size="11.5" fill="currentColor" fill-opacity=".55">' + Math.round(100 * v / tot) + '%</text></g>';
  });
  return o + '</svg>';
}
function distCard(gs, n, per) {
  const sg = (n.dg && gs.some(g => g.id === n.dg)) ? n.dg : 'todos', esc0 = resumenDist(gs.map(g => g.id), n.m, per);
  const filas = gs.map(g => { const r = resumenDist([g.id], n.m, per); return { g, r, e: estadoGrupo(r, esc0.prom) }; });
  const con = filas.filter(f => f.r.prom != null).sort((a, b) => b.r.prom - a.r.prom);
  const sel = sg === 'todos' ? esc0 : (filas.find(f => f.g.id === sg) || { r: esc0 }).r, est = sg === 'todos' ? null : (filas.find(f => f.g.id === sg) || {}).e;
  const dotC = f => !f.e ? '#b8bfcc' : f.e.k === 'bad' ? '#c0392b' : f.e.k === 'ok' ? '#1f9d6b' : '#2457d6';
  const mejor = con[0], peores = con.filter(f => f.e && f.e.k === 'bad').sort((a, b) => a.r.prom - b.r.prom);
  let h = '<div class="card dist"><div class="row sp"><h3 style="margin:0">Distribución de calificaciones · ' + MAT_NOMBRE[n.m] + '</h3></div>' +
    '<div class="chipsb"><button class="btn sm' + (sg === 'todos' ? ' pri' : '') + '" data-act="metDg|todos">🏫 Toda la escuela</button>' + filas.map(f => '<button class="btn sm' + (sg === f.g.id ? ' pri' : '') + '" data-act="metDg|' + f.g.id + '"><i class="dot" style="background:' + dotC(f) + '"></i>' + gNombre(f.g.id) + '</button>').join('') + '</div>';
  if (!sel.n) return h + '<div class="empty" style="padding:18px 0">Este grupo aún no tiene calificaciones en este periodo.</div></div>';
  h += '<div class="kpis"><div class="kpi"><b>' + fix1(sel.prom) + '</b><span>promedio</span></div><div class="kpi"><b>' + sel.aprobPct + '%</b><span>aprobados</span></div><div class="kpi"><b>' + sel.n + '</b><span>alumnos con calificación</span></div>' + (est ? '<div class="kpi"><span class="badge ' + est.k + '" style="font-size:13px">' + est.t + '</span><span>frente al promedio de la escuela (' + fix1(esc0.prom) + ')</span></div>' : '') + '</div>' +
    '<div class="histw">' + histSVG(sel.dist, n.m) + '</div>' +
    '<div class="leyb">' + BANDAS.map(b => '<span><i class="dot" style="background:' + b.c + '"></i>' + b.n + '</span>').join('') + '</div>';
  // vista rápida de todos los grupos
  h += '<h4 style="margin:16px 0 6px">¿Quién va mejor y quién necesita refuerzo?</h4>';
  if (con.length > 1) h += '<div class="small" style="margin-bottom:8px">' + (mejor ? '<b style="color:#1f9d6b">Va mejor:</b> ' + gNombre(mejor.g.id) + ' (' + fix1(mejor.r.prom) + ')' : '') + (peores.length ? ' &nbsp;·&nbsp; <b style="color:#c0392b">Más refuerzo:</b> ' + peores.slice(0, 3).map(f => gNombre(f.g.id) + ' (' + fix1(f.r.prom) + ')').join(', ') : ' &nbsp;·&nbsp; Ningún grupo necesita refuerzo urgente.') + '</div>';
  h += '<div class="rk">' + con.map(f => { const tot = f.r.n || 1, seg = [0, 0, 0, 0]; Object.keys(f.r.dist).forEach(k => { seg[bandaDe(Number(k))] += f.r.dist[k]; });
    return '<button class="rkr' + (sg === f.g.id ? ' on' : '') + '" data-act="metDg|' + f.g.id + '"><span class="rkn">' + gNombre(f.g.id) + '</span><span class="rkb">' + seg.map((v, i) => v ? '<i style="width:' + (100 * v / tot) + '%;background:' + BANDAS[i].c + '" title="' + BANDAS[i].n + ': ' + v + '"></i>' : '').join('') + '</span><b class="rkp">' + fix1(f.r.prom) + '</b><span class="badge ' + f.e.k + ' rkt">' + f.e.t + '</span></button>'; }).join('') + '</div>' +
    '<div class="small muted" style="margin-top:8px">Cada barra es el 100% de los alumnos del grupo, por colores. “Refuerzo” = 20% o más reprobados, o promedio 0.4 o más por debajo del de la escuela. “Destaca” = 0.4 o más por encima y menos de 10% reprobados.</div></div>';
  return h;
}
function avMetricas() {
  const n = S.ui.met = S.ui.met || { m: 'ingles', p: 1 };
  const per = n.p === 'anual' ? 'anual' : Number(n.p), crit = critDe(n.m), gs = ordenGrupos().filter(g => matsDe(g.id).indexOf(n.m) >= 0);
  let h = '<div class="card"><div class="row sp"><div class="row"><div class="seg">' + ['ingles', 'compu'].map(m => '<button class="' + (n.m === m ? 'on' : '') + '" data-act="metSet|m|' + m + '">' + MAT_NOMBRE[m] + '</button>').join('') + '</div><div class="seg">' + S.cfg.periodos.map((p, i) => '<button class="' + (n.p === i + 1 ? 'on' : '') + '" data-act="metSet|p|' + (i + 1) + '">' + esc(p) + '</button>').join('') + '<button class="' + (n.p === 'anual' ? 'on' : '') + '" data-act="metSet|p|anual">Anual</button></div></div>' +
    '<div class="row"><button class="btn pri" data-act="analizar">Copiar resumen para Claude</button></div></div>' +
    '<div class="small muted" style="margin-top:8px">El botón copia solo promedios por grupo, sin nombres ni calificaciones individuales. Pégalo en tu chat con Claude para que analice y proponga mejoras.</div></div>';
  if (S.ui.analisis) h += '<div class="card"><h3>Análisis de Claude</h3><div>' + S.ui.analisis + '</div></div>';
  const stats = gs.map(g => ({ g, s: statsGrupo(g.id, n.m, per) }));
  if (!stats.some(x => x.s.conNota)) return h + '<div class="card empty">Aún no hay calificaciones de ' + MAT_NOMBRE[n.m] + ' en este periodo.</div>';
  h += distCard(gs, n, per);
  h += '<div class="card"><h3>Comparativo por grupo</h3><div class="scroll"><table><tr><th>Grupo</th><th>Nivel</th><th class="n">Alumnos</th>' + crit.map(c => '<th class="n">' + esc(c.nombre.replace('Examen ', 'Ex. ').replace(' en clase', '')) + '</th>').join('') + '<th class="n">Final</th><th class="n">Aprob.</th><th style="min-width:110px"></th></tr>' +
    stats.map(x => '<tr><td><b>' + gNombre(x.g.id) + '</b></td><td>' + x.g.nivel + '</td><td class="n">' + x.s.conNota + '/' + x.s.n + '</td>' + crit.map(c => '<td class="n">' + fix1(x.s[c.id]) + '</td>').join('') + '<td class="n"><b>' + fix1(x.s.final) + '</b></td><td class="n">' + (x.s.aprob == null ? '—' : x.s.aprob + '%') + '</td><td>' + barra(x.s.final, 10) + '</td></tr>').join('') + '</table></div></div>';
  h += honorCard(gs, n.m, per);
  // paralelos
  const par = [];
  [1, 2, 3, 4, 5, 6].forEach(gr => { const a = stats.find(x => x.g.grado === gr && x.g.letra === 'A'), b = stats.find(x => x.g.grado === gr && x.g.letra === 'B'); if (a && b && a.s.final != null && b.s.final != null) par.push([gr, a, b]); });
  if (par.length) h += '<div class="card"><h3>Paralelos: A contra B</h3>' + par.map(p => { const d = p[1].s.final - p[2].s.final; return '<div class="row sp" style="padding:5px 0;border-bottom:1px dashed var(--line)"><span><b>' + p[0] + 'A</b> ' + fix1(p[1].s.final) + ' <span class="muted">vs</span> <b>' + p[0] + 'B</b> ' + fix1(p[2].s.final) + '</span><span class="badge ' + (Math.abs(d) < 0.3 ? '' : d > 0 ? 'ok' : 'warn') + '">' + (d >= 0 ? '+' : '') + fix1(d) + ' a favor de ' + (Math.abs(d) < 0.05 ? 'ninguno' : d > 0 ? p[0] + 'A' : p[0] + 'B') + '</span></div>'; }).join('') + '</div>';
  // por grado y nivel
  const agr = (key, nombre) => { const m = {}; stats.forEach(x => { if (x.s.final != null) (m[x.g[key]] = m[x.g[key]] || []).push(x.s.final); }); return Object.keys(m).sort().map(k => '<div class="row" style="gap:10px;padding:3px 0"><span style="width:92px">' + nombre + ' ' + k + '</span><div class="grow">' + barra(avg(m[k]), 10, 'gold') + '</div><b style="width:36px;text-align:right">' + fix1(avg(m[k])) + '</b></div>').join(''); };
  h += '<div class="grid2"><div class="card"><h3>Por grado</h3>' + agr('grado', 'Grado') + '</div><div class="card"><h3>Por nivel de inglés</h3>' + agr('nivel', 'Nivel') + '</div></div>';
  // progreso entre periodos
  h += '<div class="card"><h3>Mejora entre periodos</h3><div class="scroll"><table><tr><th>Grupo</th>' + S.cfg.periodos.map(p => '<th class="n">' + esc(p) + '</th>').join('') + '<th class="n">Cambio</th></tr>' + gs.map(g => {
    const v = [1, 2, 3].map(p => statsGrupo(g.id, n.m, p).final), ok = v.filter(x => x != null), d = ok.length > 1 ? ok[ok.length - 1] - ok[0] : null;
    return '<tr><td><b>' + gNombre(g.id) + '</b></td>' + v.map(x => '<td class="n">' + fix1(x) + '</td>').join('') + '<td class="n">' + (d == null ? '—' : '<span class="badge ' + (d > 0.05 ? 'ok' : d < -0.05 ? 'bad' : '') + '">' + (d >= 0 ? '+' : '') + fix1(d) + '</span>') + '</td></tr>';
  }).join('') + '</table></div></div>';
  // bitácora
  h += '<div class="card"><h3>Lo que dice la bitácora</h3><div class="scroll"><table><tr><th>Grupo</th><th class="n">Registros</th><th class="n">Ánimo</th><th class="n">Participación</th><th class="n">Plan cumplido</th><th>Lo más repetido</th></tr>' + gs.map(g => {
    const b = bitStats(g.id), top = Object.keys(b.tags).sort((x, y) => b.tags[y] - b.tags[x]).slice(0, 2).map(t => t + ' (' + b.tags[t] + ')').join(', ');
    return '<tr><td><b>' + gNombre(g.id) + '</b></td><td class="n">' + b.n + '</td><td class="n">' + (b.animo ? ANIMOS[Math.round(b.animo) - 1] + ' ' + fix1(b.animo) : '—') + '</td><td class="n">' + fix1(b.part) + '</td><td class="n">' + (b.n ? b.planSi + '/' + b.n : '—') + '</td><td class="small">' + esc(top || '—') + '</td></tr>';
  }).join('') + '</table></div></div>';
  return h;
}
ACT.metSet = (el, k, v) => { S.ui.met[k] = k === 'p' && v !== 'anual' ? Number(v) : v; render(); };
ACT.metDg = (el, id) => { S.ui.met.dg = id; render(); };
const mdLite = t => {
  const L = esc(t).split(/\r?\n/), out = []; let ul = false;
  L.forEach(l => {
    const b = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    if (/^\s*[-*•]\s+/.test(l)) { if (!ul) { out.push('<ul style="margin:4px 0 4px 18px;padding:0">'); ul = true; } out.push('<li>' + b.replace(/^\s*[-*•]\s+/, '') + '</li>'); }
    else { if (ul) { out.push('</ul>'); ul = false; } if (l.trim()) out.push('<p style="margin:6px 0">' + b.replace(/^#+\s*/, '') + '</p>'); }
  });
  if (ul) out.push('</ul>'); return out.join('');
};
ACT.analizar = () => {
  const doc = metricasDoc();
  copiar('Analiza este resumen AGREGADO por grupo de mis clases de Inglés y Computación (sin nombres de alumnos): qué grupos van mejor y cuáles necesitan apoyo, comparación de paralelos (A contra B), qué criterio es más débil y qué cambios concretos propones al programa (marca cuáles son moderados y cuáles drásticos).\n\nDATOS:\n' + JSON.stringify(doc));
};

/* ---------- Cambios al programa ---------- */
function avCambios() {
  const cs = Object.values(S.cambios).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.ts || 0) - (a.ts || 0));
  let h = '<div class="note" style="margin-bottom:10px">Aquí quedan anotados los cambios al programa. Los moderados se aplican directo; los <b>drásticos</b> quedan pendientes hasta que los apruebes.</div>';
  if (!cs.length) return h + '<div class="card empty">Aún no hay cambios propuestos. Cuando haya bitácora y calificaciones, Claude los irá registrando aquí.</div>';
  return h + cs.map(c => '<div class="card"><div class="row sp"><div><span class="badge ' + (c.tipo === 'drastico' ? 'bad' : 'acc') + '">' + (c.tipo === 'drastico' ? 'Drástico' : 'Moderado') + '</span> ' + (c.grupoId ? '<span class="badge">' + esc(gNombre(c.grupoId)) + '</span> ' : '') + '<b>' + esc(c.titulo) + '</b></div><span class="badge ' + ({ pendiente: 'warn', aprobado: 'ok', aplicado: 'ok', rechazado: 'bad' }[c.estado] || '') + '">' + esc(c.estado || '') + '</span></div>' +
    (c.detalle ? '<p style="margin:6px 0 0">' + esc(c.detalle) + '</p>' : '') + '<div class="small muted" style="margin-top:4px">' + esc(c.fecha || '') + '</div>' +
    (c.estado === 'pendiente' ? '<div class="row" style="margin-top:8px"><button class="btn ok sm" data-act="camb|' + c.id + '|aprobado">Aprobar</button><button class="btn sm danger" data-act="camb|' + c.id + '|rechazado">Rechazar</button></div>' : '') + '</div>').join('');
}
ACT.camb = (el, id, est) => { const c = cl(S.cambios[id]); c.estado = est; c.resuelto = hoy(); save('cambios', id, c); render(); };

/* ---------- Reporte final por grupo ---------- */
function avReporte() {
  const gs = ordenGrupos(), r = S.ui.rep = S.ui.rep || { g: gs[0].id, nom: false };
  if (!S.grupos[r.g]) r.g = gs[0].id;
  return '<div class="card"><h3>Informe para dirección</h3><p class="muted" style="margin:0 0 10px">Dos hojas, formales y con gráficas: indicadores de toda la escuela, promedio por grado, distribución de calificaciones, avance del plan por grupo y detalle por grupo, con espacio para firmas. No incluye nombres de alumnos.</p><div class="row"><label class="f">Periodo<select data-chg="infP">' + S.cfg.periodos.map((p, i) => '<option value="' + (i + 1) + '"' + (Number(S.ui.infP || 1) === i + 1 ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '<option value="anual"' + (S.ui.infP === 'anual' ? ' selected' : '') + '>Promedio anual</option></select></label><button class="btn pri" data-act="informeDir" style="align-self:flex-end">Generar informe (PDF)</button></div></div>' +
    '<div class="card"><h3>Reporte final por grupo</h3><p class="muted" style="margin:0 0 10px">Un PDF de una o dos hojas con el avance del programa, los promedios por trimestre, la distribución y lo que registró la bitácora. No incluye nombres de alumnos, salvo que lo pidas abajo.</p>' +
    '<div class="row"><label class="f">Grupo<select data-chg="repG">' + gs.map(g => '<option value="' + g.id + '"' + (g.id === r.g ? ' selected' : '') + '>' + gNombre(g.id) + '</option>').join('') + '</select></label>' +
    '<label class="row small" style="align-self:flex-end"><input type="checkbox" data-chg="repNom"' + (r.nom ? ' checked' : '') + '> Incluir lista de alumnos con promedio menor a ' + S.cfg.esc.aprob + ' (solo para ti)</label>' +
    '<button class="btn pri" data-act="repPDF" style="align-self:flex-end">Generar PDF</button></div></div>';
}
CHG.repG = el => { S.ui.rep.g = el.value; render(); };
CHG.repNom = el => { S.ui.rep.nom = el.checked; };
ACT.repPDF = async () => {
  if (!(await asegurarPDF())) return;
  const gid = S.ui.rep.g, g = S.grupos[gid], { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const navy = [15, 27, 51], gold = [36, 87, 214], ink = [50, 54, 66], m = 18, Wd = 215.9, w = Wd - 2 * m;
  let y = 20;
  const sec = t => { y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...gold); doc.text(t.toUpperCase(), m, y); y += 1.5; doc.setDrawColor(...gold); doc.setLineWidth(0.3); doc.line(m, y, m + w, y); y += 5; };
  const txt = (t, o) => { o = o || {}; doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 9.5); doc.setTextColor(...(o.c || ink)); const ls = doc.splitTextToSize(t, o.w || w); if (y + ls.length * 4.6 > 262) { doc.addPage(); y = 20; } doc.text(ls, o.x || m, y); y += ls.length * 4.6; };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...navy); doc.text(S.cfg.escuela.toUpperCase(), Wd / 2, y, { align: 'center' }); y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...gold); doc.text('REPORTE FINAL DE GRUPO · ' + S.cfg.ciclo, Wd / 2, y, { align: 'center' }); y += 9;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...navy); doc.text(gNombre(gid), m, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ink); doc.text('Maestro: ' + S.cfg.maestro + (g.maestro ? '   ·   Titular: ' + g.maestro : ''), m + w, y, { align: 'right' }); y += 4;
  const bs = bitStats(gid);
  sec('Resumen');
  txt('Alumnos: ' + alumnosDe(gid).length + '.   Nivel de inglés: ' + g.nivel + ' (' + nomNivel('ingles', g.nivel) + ')' + '.');
  matsDe(gid).forEach(m => { const si = sigClase(gid, m); txt(MAT_NOMBRE[m] + ': nivel ' + si.nivel + ' (' + nomNivel(m, si.nivel) + '), ' + listaDadas(gid, m).length + ' clases impartidas, ' + si.pos + ' de ' + si.total + ' clases del plan completadas' + (si.fin ? '' : '; sigue la clase ' + si.n) + '.'); });
  matsDe(gid).forEach(mat => {
    sec('Resultados de ' + MAT_NOMBRE[mat]);
    const crit = critDe(mat), cols = [m, m + 40], per = [1, 2, 3, 'anual'];
    const hdr = ['Periodo'].concat(crit.map(c => c.nombre.replace('Participación en clase', 'Participación')), ['Final', 'Aprob.']);
    const cwid = [34].concat(crit.map(() => (w - 34 - 32) / crit.length), [16, 16]);
    doc.setFillColor(...navy); doc.rect(m, y - 4, w, 6.5, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(255, 255, 255);
    let x = m; hdr.forEach((t, i) => { doc.text(t, i ? x + cwid[i] / 2 : x + 2, y, { align: i ? 'center' : 'left' }); x += cwid[i]; }); y += 6;
    per.forEach(p => {
      const s = statsGrupo(gid, mat, p); if (!s.conNota) return;
      const row = [p === 'anual' ? 'Promedio anual' : S.cfg.periodos[p - 1]].concat(crit.map(c => fix1(s[c.id])), [fix1(s.final), s.aprob == null ? '—' : s.aprob + '%']);
      x = m; doc.setFont('helvetica', p === 'anual' ? 'bold' : 'normal'); doc.setFontSize(9); doc.setTextColor(...ink);
      row.forEach((t, i) => { doc.text(String(t), i ? x + cwid[i] / 2 : x + 2, y, { align: i ? 'center' : 'left' }); x += cwid[i]; });
      doc.setDrawColor(223, 228, 236); doc.setLineWidth(0.2); doc.line(m, y + 2, m + w, y + 2); y += 6.5;
    });
    const sa = statsGrupo(gid, mat, 'anual');
    if (sa.conNota) {
      y += 1; doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...gold); doc.text('DISTRIBUCIÓN DEL PROMEDIO ANUAL', m, y); y += 3;
      const mx = Math.max(1, ...Object.values(sa.dist)), bw = 22;
      Object.keys(sa.dist).forEach((k, i) => { const bx = m + i * (bw + 4), hh = 14 * sa.dist[k] / mx; doc.setFillColor(...(Number(k) < S.cfg.esc.aprob ? [192, 57, 43] : navy)); doc.rect(bx, y + 14 - hh, bw, hh, 'F'); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...ink); doc.text(k + ' (' + sa.dist[k] + ')', bx + bw / 2, y + 18, { align: 'center' }); });
      y += 22;
    }
    const par = Object.values(S.grupos).find(o => o.grado === g.grado && o.id !== g.id);
    if (par && statsGrupo(par.id, mat, 'anual').final != null && sa.final != null) txt('Comparación con ' + gNombre(par.id) + ' (anual): ' + fix1(sa.final) + ' contra ' + fix1(statsGrupo(par.id, mat, 'anual').final) + '.', { s: 9 });
    if (!sa.conNota && !statsGrupo(gid, mat, 1).conNota) txt('Todavía no hay calificaciones capturadas de esta materia.', { c: [130, 130, 130] });
    if (S.ui.rep.nom) {
      const riesgo = notasGrupo(gid, mat, 'anual').filter(x => x.fin != null && x.fin < S.cfg.esc.aprob);
      txt('Alumnos con promedio anual menor a ' + S.cfg.esc.aprob + ': ' + (riesgo.length ? riesgo.map(x => x.a.nombre + ' (' + fmtNota(x.fin) + ')').join('; ') : 'ninguno') + '.', { s: 8.5 });
    }
  });
  sec('Lo que registró la bitácora');
  if (!bs.n) txt('Sin registros de bitácora.', { c: [130, 130, 130] });
  else {
    txt('Registros: ' + bs.n + '.   Ánimo promedio: ' + fix1(bs.animo) + ' de 5.   Participación promedio: ' + fix1(bs.part) + ' de 5.   Plan cumplido: ' + bs.planSi + ' sí, ' + bs.planParcial + ' a medias, ' + bs.planNo + ' no.   Sesiones repetidas: ' + bs.repetir + '.');
    const top = Object.keys(bs.tags).sort((a, b) => bs.tags[b] - bs.tags[a]).slice(0, 5); if (top.length) txt('Lo más repetido: ' + top.map(t => t + ' (' + bs.tags[t] + ')').join(', ') + '.');
  }
  sec('Observaciones y recomendaciones para el siguiente ciclo');
  for (let i = 0; i < 4; i++) { doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2); if (y > 262) { doc.addPage(); y = 20; } doc.line(m, y + 5, m + w, y + 5); y += 8; }
  descargar('reporte-final-' + gid + '.pdf', doc.output('arraybuffer'));
};

/* ---------- Informe formal para dirección (corto, con gráficas) ---------- */
ACT.informeDir = async () => {
  if (!(await asegurarPDF())) return;
  const per = S.ui.infP === 'anual' ? 'anual' : Number(S.ui.infP || 1), perTxt = per === 'anual' ? 'Promedio anual del ciclo' : S.cfg.periodos[per - 1];
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const navy = [15, 27, 51], blue = [36, 87, 214], sky = [140, 170, 235], ink = [50, 54, 66], gris = [120, 126, 140], bajo = [192, 57, 43], fondo = [244, 246, 250];
  const m = 16, Wd = 215.9, w = Wd - 2 * m, gs = ordenGrupos(), MS = ['ingles', 'compu'], col = { ingles: blue, compu: navy };
  const T = (t, x, y, o) => { o = o || {}; doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 9); doc.setTextColor(...(o.c || ink)); doc.text(String(t), x, y, o.a ? { align: o.a } : undefined); };
  const sec = (t, x, y, ww) => { T(t.toUpperCase(), x, y, { b: 1, s: 7.5, c: blue }); doc.setDrawColor(...blue); doc.setLineWidth(0.3); doc.line(x, y + 1.5, x + ww, y + 1.5); };
  const mats = MS.filter(mt => gs.some(g => matsDe(g.id).indexOf(mt) >= 0));
  const stat = {}; gs.forEach(g => { stat[g.id] = {}; matsDe(g.id).forEach(mt => { stat[g.id][mt] = statsGrupo(g.id, mt, per); }); });
  const tot = {}; mats.forEach(mt => { tot[mt] = resumenGrupos(gs.filter(g => matsDe(g.id).indexOf(mt) >= 0), mt, per); });
  const dadas = gs.reduce((s, g) => s + matsDe(g.id).reduce((q, mt) => q + listaDadas(g.id, mt).length, 0), 0);
  const canc = Object.values(S.clases).filter(c => c.estado === 'cancelada').length;
  const pie = n => { T('Informe generado con la Libreta de Clases · página ' + n + ' de 2', Wd / 2, 272, { s: 7, c: gris, a: 'center' }); };
  // --- encabezado
  doc.setFillColor(...navy); doc.rect(0, 0, Wd, 36, 'F'); doc.setFillColor(...blue); doc.rect(0, 36, Wd, 1.6, 'F');
  T(S.cfg.escuela.toUpperCase(), m, 15, { b: 1, s: 16, c: [255, 255, 255] });
  T('INFORME DE AVANCE ACADÉMICO · INGLÉS Y COMPUTACIÓN', m, 23, { b: 1, s: 8, c: [190, 205, 240] });
  T(perTxt + ' · Ciclo ' + S.cfg.ciclo, m, 30, { s: 9.5, c: [255, 255, 255] });
  T('Elaboró: ' + S.cfg.maestro, Wd - m, 15, { s: 8.5, c: [255, 255, 255], a: 'right' }); T('Fecha: ' + fmtLargo(hoy()).toLowerCase() + ' de ' + pd(hoy()).getFullYear(), Wd - m, 21, { s: 8.5, c: [190, 205, 240], a: 'right' });
  // --- indicadores
  const kp = [[gs.length, 'grupos atendidos'], [Object.keys(S.alumnos).length, 'alumnos'], [dadas, 'clases impartidas'], [canc, 'clases canceladas']];
  mats.forEach(mt => kp.push([fix1(tot[mt].final), 'promedio ' + MAT_NOMBRE[mt].toLowerCase()]));
  const kw = (w - (kp.length - 1) * 3) / kp.length;
  kp.forEach((k, i) => { const x = m + i * (kw + 3); doc.setFillColor(...fondo); doc.roundedRect(x, 44, kw, 20, 2, 2, 'F'); T(k[0], x + kw / 2, 54, { b: 1, s: 16, c: navy, a: 'center' }); T(k[1], x + kw / 2, 60, { s: 6.8, c: gris, a: 'center' }); });
  // --- gráfica 1: promedio por grado
  const cw = (w - 8) / 2, ch = 56, gx = m, gy = 76;
  sec('Promedio por grado', gx, gy, cw);
  const ox = gx + 8, oy = gy + 8 + ch - 12, ph = ch - 14, mn = S.cfg.esc.min, mx = S.cfg.esc.max, yv = v => oy - (Math.max(mn, Math.min(mx, v)) - mn) / (mx - mn) * ph;
  doc.setDrawColor(225, 229, 238); doc.setLineWidth(0.15);
  for (let v = mn; v <= mx; v++) { doc.line(ox, yv(v), gx + cw, yv(v)); T(v, ox - 2, yv(v) + 1, { s: 6.5, c: gris, a: 'right' }); }
  doc.setDrawColor(...bajo); doc.setLineWidth(0.3); doc.setLineDashPattern([1.2, 1.2], 0); doc.line(ox, yv(S.cfg.esc.aprob), gx + cw, yv(S.cfg.esc.aprob)); doc.setLineDashPattern([], 0);
  const gw = (gx + cw - ox) / 6;
  [1, 2, 3, 4, 5, 6].forEach((gr, i) => {
    const gg = gs.filter(g => g.grado === gr);
    mats.forEach((mt, k) => { const R = resumenGrupos(gg.filter(g => matsDe(g.id).indexOf(mt) >= 0), mt, per), bw = Math.min(7, gw / 3), bx = ox + i * gw + gw / 2 - (mats.length * bw) / 2 + k * bw; if (R.final != null) { doc.setFillColor(...col[mt]); doc.rect(bx, yv(R.final), bw - 0.6, oy - yv(R.final), 'F'); T(fix1(R.final), bx + (bw - 0.6) / 2, yv(R.final) - 1, { s: 6, c: ink, a: 'center' }); } });
    T(gr + '.º', ox + i * gw + gw / 2, oy + 4.5, { s: 8, b: 1, a: 'center' });
  });
  mats.forEach((mt, k) => { doc.setFillColor(...col[mt]); doc.rect(gx + 8 + k * 22, oy + 8, 3, 3, 'F'); T(MAT_NOMBRE[mt], gx + 12 + k * 22, oy + 10.6, { s: 7.5 }); });
  T('línea roja: mínimo aprobatorio (' + S.cfg.esc.aprob + ')', gx + cw, oy + 10.6, { s: 6.5, c: bajo, a: 'right' });
  // --- gráfica 2: distribución de calificaciones
  const hx = m + cw + 8; sec('Distribución de calificaciones', hx, gy, cw);
  const dist = {}; let dm = 1; mats.forEach(mt => { dist[mt] = {}; for (let k = mn; k <= mx; k++) dist[mt][k] = 0; gs.forEach(g => { if (!stat[g.id][mt]) return; const s = stat[g.id][mt]; Object.keys(s.dist).forEach(k => { dist[mt][k] += s.dist[k]; }); }); dm = Math.max(dm, ...Object.values(dist[mt])); });
  const dx = hx + 4, dw = (cw - 4) / (mx - mn + 1), dh = ph;
  for (let k = mn; k <= mx; k++) {
    const i = k - mn; mats.forEach((mt, q) => { const bw = Math.min(6, dw / 2.4), bx = dx + i * dw + dw / 2 - (mats.length * bw) / 2 + q * bw, hh = dh * dist[mt][k] / dm; doc.setFillColor(...(k < S.cfg.esc.aprob ? bajo : col[mt])); if (k < S.cfg.esc.aprob && q === 1) doc.setFillColor(220, 120, 110); if (hh > 0) { doc.rect(bx, oy - hh, bw - 0.6, hh, 'F'); T(dist[mt][k], bx + (bw - 0.6) / 2, oy - hh - 1, { s: 6, a: 'center' }); } });
    T(k, dx + i * dw + dw / 2, oy + 4.5, { s: 8, b: 1, a: 'center' });
  }
  doc.setDrawColor(190, 195, 205); doc.setLineWidth(0.2); doc.line(dx, oy, hx + cw, oy);
  T('Número de alumnos por calificación (rojo: no aprobatoria)', hx, oy + 10.6, { s: 7, c: gris });
  // --- gráfica 3: avance del plan por grupo
  const ay = 148; sec('Avance del plan por grupo (clases completadas)', m, ay, w);
  const lw = 22, bl = w - lw - 26; let y = ay + 8;
  gs.forEach(g => {
    T(gNombre(g.id), m, y + 2.4, { b: 1, s: 8 });
    matsDe(g.id).forEach((mt, k) => {
      const si = sigClase(g.id, mt), f = Math.min(1, si.pos / si.total), by = y + k * 3.2 - 0.4;
      doc.setFillColor(232, 236, 244); doc.rect(m + lw, by, bl, 2.6, 'F'); doc.setFillColor(...col[mt]); if (f > 0) doc.rect(m + lw, by, bl * f, 2.6, 'F');
      T(si.pos + '/' + si.total, m + lw + bl + 2, by + 2.2, { s: 6.5, c: ink });
    });
    y += 8.2;
  });
  mats.forEach((mt, k) => { doc.setFillColor(...col[mt]); doc.rect(m + k * 34, y + 1, 3, 3, 'F'); T(MAT_NOMBRE[mt], m + 4 + k * 34, y + 3.6, { s: 7 }); });
  pie(1);
  // --- página 2
  doc.addPage(); T('DETALLE POR GRUPO · ' + perTxt.toUpperCase(), m, 18, { b: 1, s: 9, c: navy });
  doc.setDrawColor(...blue); doc.setLineWidth(0.5); doc.line(m, 21, m + w, 21);
  const C = [['Grupo', 14], ['Alum.', 11], ['Nivel', 10], ['Clase', 13], ['Prom.', 12], ['Aprob.', 12], ['Nivel', 10], ['Clase', 13], ['Prom.', 12], ['Aprob.', 12], ['Bloque o tema en curso (Inglés)', w - 119]];
  let x = m; doc.setFillColor(...navy); doc.rect(m, 24, w, 11, 'F');
  T('INGLÉS', m + 14 + 11 + 5, 28, { b: 1, s: 6.5, c: [190, 205, 240] }); T('COMPUTACIÓN', m + 14 + 11 + 47 + 5, 28, { b: 1, s: 6.5, c: [190, 205, 240] });
  C.forEach(c => { T(c[0], x + 1.5, 33.2, { b: 1, s: 7, c: [255, 255, 255] }); x += c[1]; });
  y = 40;
  gs.forEach((g, i) => {
    if (i % 2) { doc.setFillColor(...fondo); doc.rect(m, y - 4.2, w, 7.2, 'F'); }
    x = m; const cell = (t, k, o) => { T(t, x + 1.5, y, o || {}); x += C[k][1]; };
    cell(gNombre(g.id), 0, { b: 1, s: 8.5 }); cell(alumnosDe(g.id).length, 1, { s: 8 });
    // inglés y computación en columnas fijas
    x = m + C[0][1] + C[1][1];
    MS.forEach((mt, q) => {
      const has = matsDe(g.id).indexOf(mt) >= 0, si = has ? sigClase(g.id, mt) : null, s = has ? stat[g.id][mt] : null, o = q * 47;
      const base = m + C[0][1] + C[1][1] + o;
      if (!has) { T('—', base + 1.5, y, { c: gris }); return; }
      T(si.nivel, base + 1.5, y, { s: 8 }); T(si.ev ? 'Eval.' : si.fin ? 'Fin' : si.n, base + 11.5, y, { s: 8 });
      T(fix1(s.final), base + 24.5, y, { b: 1, s: 8.5, c: s.final != null && s.final < S.cfg.esc.aprob ? bajo : navy }); T(s.aprob == null ? '—' : s.aprob + '%', base + 36.5, y, { s: 8 });
    });
    const si = matsDe(g.id).indexOf('ingles') >= 0 ? sigClase(g.id, 'ingles') : null, bl2 = si && !si.fin && !si.ev ? bloqueDe('ingles', si.nivel, si.n) : null;
    T(si ? (si.ev ? 'Fase de evaluación' : bl2 ? bl2.tema : '—') : '—', m + w - (w - 119) + 1.5, y, { s: 7.5, c: ink });
    y += 7.2;
  });
  // criterios
  y += 6; sec('Promedio general por criterio de evaluación', m, y, w); y += 8;
  mats.forEach(mt => {
    T(MAT_NOMBRE[mt], m, y, { b: 1, s: 8.5, c: col[mt] }); y += 4.5;
    tot[mt].crit.forEach(cr => { T(cr.c.nombre + ' (' + cr.c.peso + '%)', m, y + 2.2, { s: 8 }); doc.setFillColor(232, 236, 244); doc.rect(m + 60, y, 90, 2.8, 'F'); if (cr.v != null) { doc.setFillColor(...col[mt]); doc.rect(m + 60, y, 90 * (cr.v - mn) / (mx - mn), 2.8, 'F'); } T(fix1(cr.v), m + 153, y + 2.4, { b: 1, s: 8.5 }); y += 5.6; });
    y += 2;
  });
  // lectura rápida y firmas
  const mejores = []; mats.forEach(mt => { const l = gs.filter(g => stat[g.id][mt] && stat[g.id][mt].final != null).sort((a, b) => stat[b.id][mt].final - stat[a.id][mt].final); if (l.length > 1) mejores.push(MAT_NOMBRE[mt] + ': mayor promedio ' + gNombre(l[0].id) + ' (' + fix1(stat[l[0].id][mt].final) + '); mayor oportunidad de apoyo ' + gNombre(l[l.length - 1].id) + ' (' + fix1(stat[l[l.length - 1].id][mt].final) + ').'); });
  y += 2; sec('Lectura rápida', m, y, w); y += 7;
  (mejores.length ? mejores : ['Aún no hay calificaciones capturadas en este periodo.']).forEach(t => { const ls = doc.splitTextToSize(t, w); T(ls.join('\n'), m, y, { s: 8.5 }); y += ls.length * 4.4; });
  const fy = 252; doc.setDrawColor(...ink); doc.setLineWidth(0.3); doc.line(m + 8, fy, m + 78, fy); doc.line(Wd - m - 78, fy, Wd - m - 8, fy);
  T(S.cfg.maestro, m + 43, fy + 4.5, { s: 8, a: 'center' }); T('Maestro de Inglés y Computación', m + 43, fy + 8.5, { s: 7, c: gris, a: 'center' });
  T(S.cfg.director || 'Director(a)', Wd - m - 43, fy + 4.5, { s: 8, a: 'center' }); T('Dirección escolar · Vo. Bo.', Wd - m - 43, fy + 8.5, { s: 7, c: gris, a: 'center' });
  pie(2);
  descargar('informe-direccion-' + (per === 'anual' ? 'anual' : 't' + per) + '.pdf', doc.output('arraybuffer'));
};
CHG.infP = el => { S.ui.infP = el.value; };
