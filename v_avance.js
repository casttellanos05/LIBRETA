'use strict';
/* Avance por grupo, métricas (sin nombres), cambios al programa y reporte final por grupo */

/* ---------- estadísticas ---------- */
const avg = arr => { const v = arr.filter(num); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
function notasGrupo(gid, mat, per) {
  return alumnosDe(gid).map(a => {
    const d = calDoc(a.id, mat), p = per === 'anual' ? null : (d && d.p && d.p[per]) || {};
    const o = { a, fin: per === 'anual' ? notaAnual(d) : notaPeriodo(d, per) };
    S.cfg.criterios.forEach(c => { o[c.id] = p ? p[c.id] : null; });
    return o;
  });
}
function statsGrupo(gid, mat, per) {
  const L = notasGrupo(gid, mat, per), fin = L.map(x => x.fin).filter(x => x != null);
  const st = { n: alumnosDe(gid).length, conNota: fin.length, final: avg(fin), aprob: fin.length ? Math.round(100 * fin.filter(x => x >= S.cfg.esc.aprob).length / fin.length) : null, dist: {} };
  S.cfg.criterios.forEach(c => { st[c.id] = avg(L.map(x => x[c.id])); });
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
  const out = { actualizado: new Date().toISOString(), ciclo: S.cfg.ciclo, criterios: S.cfg.criterios.map(c => ({ id: c.id, nombre: c.nombre, peso: c.peso })), aprobatorio: S.cfg.esc.aprob, grupos: {}, grados: {}, niveles: {} };
  const acumG = {}, acumN = {};
  ordenGrupos().forEach(g => {
    const o = { grado: g.grado, nivel: g.nivel, nivelMeta: g.nivelMeta || null, alumnos: alumnosDe(g.id).length, avance: avanceDoc(g.id), bitacora: (() => { const b = bitStats(g.id); return { registros: b.n, animo: r2(b.animo), participacion: r2(b.part), planCumplido: b.planSi, planParcial: b.planParcial, planNoCumplido: b.planNo, repeticiones: b.repetir, etiquetas: b.tags }; })() };
    matsDe(g.id).forEach(m => {
      o[m] = {};
      [1, 2, 3, 'anual'].forEach(p => {
        const s = statsGrupo(g.id, m, p); if (!s.conNota) return;
        const e = { conNota: s.conNota, final: r2(s.final), aprobadosPct: s.aprob, distribucion: s.dist }; S.cfg.criterios.forEach(c => { e[c.id] = r2(s[c.id]); });
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
VIEWS.avance = function () {
  const sub = S.ui.av || 'resumen';
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>Avance</h2><div class="muted">Dónde va cada grupo y cómo van los resultados.</div></div><div class="seg">' + [['resumen', 'Resumen'], ['grupos', 'Por grupo'], ['metricas', 'Métricas'], ['cambios', 'Cambios'], ['reporte', 'Reporte final']].map(x => '<button class="' + (sub === x[0] ? 'on' : '') + '" data-act="avSub|' + x[0] + '">' + x[1] + (x[0] === 'cambios' && pendientes().length ? ' (' + pendientes().length + ')' : '') + '</button>').join('') + '</div></div>';
  if (!Object.keys(S.grupos).length) return h + '<div class="card empty">Todavía no hay grupos.</div>';
  return h + ({ resumen: avResumen, grupos: avGrupos, metricas: avMetricas, cambios: avCambios, reporte: avReporte }[sub])();
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
      else if (abre) h += '<div class="note" style="margin-top:8px"><div class="row"><label class="f">Periodo que se evalúa<select data-chg="evalPer|' + g.id + '|' + mat + '">' + S.cfg.periodos.map((p, i) => '<option value="' + (i + 1) + '"' + (periodoSug(g.id, mat) === i + 1 ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select></label><button class="btn pri" data-act="evalIniciar|' + g.id + '|' + mat + '" style="align-self:flex-end">Iniciar fase de evaluación</button><button class="btn ghost" data-act="evalForm|' + g.id + '|' + mat + '" style="align-self:flex-end">Cancelar</button></div><div class="small muted" style="margin-top:4px">La siguiente clase de ' + MAT_NOMBRE[mat] + ' de ' + gNombre(g.id) + ' se dedica a evaluar y no avanza el plan.</div></div>';
      else h += '<div style="margin-top:8px"><button class="btn sm" data-act="evalForm|' + g.id + '|' + mat + '">Iniciar fase de evaluación</button></div>';
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
  const g = S.grupos[a.grupoId], crit = S.cfg.criterios; if (!g) return '';
  let h = '<div class="grid2">';
  matsDe(g.id).forEach(mat => {
    const d = calDoc(a.id, mat), si = sigClase(g.id, mat);
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
  const fin = [], crit = {}, crs = S.cfg.criterios; crs.forEach(c => { crit[c.id] = []; });
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

function avMetricas() {
  const n = S.ui.met = S.ui.met || { m: 'ingles', p: 1 };
  const per = n.p === 'anual' ? 'anual' : Number(n.p), crit = S.cfg.criterios, gs = ordenGrupos().filter(g => matsDe(g.id).indexOf(n.m) >= 0);
  let h = '<div class="card"><div class="row sp"><div class="row"><div class="seg">' + ['ingles', 'compu'].map(m => '<button class="' + (n.m === m ? 'on' : '') + '" data-act="metSet|m|' + m + '">' + MAT_NOMBRE[m] + '</button>').join('') + '</div><div class="seg">' + S.cfg.periodos.map((p, i) => '<button class="' + (n.p === i + 1 ? 'on' : '') + '" data-act="metSet|p|' + (i + 1) + '">' + esc(p) + '</button>').join('') + '<button class="' + (n.p === 'anual' ? 'on' : '') + '" data-act="metSet|p|anual">Anual</button></div></div>' +
    '<div class="row"><button class="btn pri" data-act="analizar">Copiar resumen para Claude</button></div></div>' +
    '<div class="small muted" style="margin-top:8px">El botón copia solo promedios por grupo, sin nombres ni calificaciones individuales. Pégalo en tu chat con Claude para que analice y proponga mejoras.</div></div>';
  if (S.ui.analisis) h += '<div class="card"><h3>Análisis de Claude</h3><div>' + S.ui.analisis + '</div></div>';
  const stats = gs.map(g => ({ g, s: statsGrupo(g.id, n.m, per) }));
  if (!stats.some(x => x.s.conNota)) return h + '<div class="card empty">Aún no hay calificaciones de ' + MAT_NOMBRE[n.m] + ' en este periodo.</div>';
  h += '<div class="card"><h3>Comparativo por grupo</h3><div class="scroll"><table><tr><th>Grupo</th><th>Nivel</th><th class="n">Alumnos</th>' + crit.map(c => '<th class="n">' + esc(c.nombre.replace('Examen ', 'Ex. ').replace(' en clase', '')) + '</th>').join('') + '<th class="n">Final</th><th class="n">Aprob.</th><th style="min-width:110px"></th></tr>' +
    stats.map(x => '<tr><td><b>' + gNombre(x.g.id) + '</b></td><td>' + x.g.nivel + '</td><td class="n">' + x.s.conNota + '/' + x.s.n + '</td>' + crit.map(c => '<td class="n">' + fix1(x.s[c.id]) + '</td>').join('') + '<td class="n"><b>' + fix1(x.s.final) + '</b></td><td class="n">' + (x.s.aprob == null ? '—' : x.s.aprob + '%') + '</td><td>' + barra(x.s.final, 10) + '</td></tr>').join('') + '</table></div></div>';
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
  // distribución
  const sg = n.dg || 'todos', ids = sg === 'todos' ? gs.map(g => g.id) : [sg], dist = {};
  for (let k = S.cfg.esc.min; k <= S.cfg.esc.max; k++) dist[k] = 0;
  ids.forEach(id => { const s = statsGrupo(id, n.m, per); Object.keys(s.dist).forEach(k => { dist[k] += s.dist[k]; }); });
  const mx = Math.max(1, ...Object.values(dist));
  h += '<div class="card"><div class="row sp"><h3 style="margin:0">Distribución de calificaciones</h3><select data-chg="metDg"><option value="todos">Todos los grupos</option>' + gs.map(g => '<option value="' + g.id + '"' + (sg === g.id ? ' selected' : '') + '>' + gNombre(g.id) + '</option>').join('') + '</select></div><div style="margin-top:10px">' +
    Object.keys(dist).map(k => '<div class="row" style="gap:10px;padding:2px 0;flex-wrap:nowrap"><b style="width:24px">' + k + '</b><div class="grow">' + barra(dist[k], mx, Number(k) < S.cfg.esc.aprob ? 'low' : 'ok') + '</div><span style="width:30px;text-align:right">' + dist[k] + '</span></div>').join('') + '</div></div>';
  // bitácora
  h += '<div class="card"><h3>Lo que dice la bitácora</h3><div class="scroll"><table><tr><th>Grupo</th><th class="n">Registros</th><th class="n">Ánimo</th><th class="n">Participación</th><th class="n">Plan cumplido</th><th>Lo más repetido</th></tr>' + gs.map(g => {
    const b = bitStats(g.id), top = Object.keys(b.tags).sort((x, y) => b.tags[y] - b.tags[x]).slice(0, 2).map(t => t + ' (' + b.tags[t] + ')').join(', ');
    return '<tr><td><b>' + gNombre(g.id) + '</b></td><td class="n">' + b.n + '</td><td class="n">' + (b.animo ? ANIMOS[Math.round(b.animo) - 1] + ' ' + fix1(b.animo) : '—') + '</td><td class="n">' + fix1(b.part) + '</td><td class="n">' + (b.n ? b.planSi + '/' + b.n : '—') + '</td><td class="small">' + esc(top || '—') + '</td></tr>';
  }).join('') + '</table></div></div>';
  return h;
}
ACT.metSet = (el, k, v) => { S.ui.met[k] = k === 'p' && v !== 'anual' ? Number(v) : v; render(); };
CHG.metDg = el => { S.ui.met.dg = el.value; render(); };
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
  return '<div class="card"><h3>Reporte final por grupo</h3><p class="muted" style="margin:0 0 10px">Un PDF de una o dos hojas con el avance del programa, los promedios por trimestre, la distribución y lo que registró la bitácora. No incluye nombres de alumnos, salvo que lo pidas abajo.</p>' +
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
  txt('Alumnos: ' + alumnosDe(gid).length + '.   Nivel de inglés: ' + g.nivel + ' (' + nomNivel('ingles', g.nivel) + ')' + (g.nivelMeta ? ', meta ' + g.nivelMeta : '') + '.');
  matsDe(gid).forEach(m => { const si = sigClase(gid, m); txt(MAT_NOMBRE[m] + ': nivel ' + si.nivel + ' (' + nomNivel(m, si.nivel) + '), ' + listaDadas(gid, m).length + ' clases impartidas, ' + si.pos + ' de ' + si.total + ' clases del plan completadas' + (si.fin ? '' : '; sigue la clase ' + si.n) + '.'); });
  matsDe(gid).forEach(mat => {
    sec('Resultados de ' + MAT_NOMBRE[mat]);
    const crit = S.cfg.criterios, cols = [m, m + 40], per = [1, 2, 3, 'anual'];
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
