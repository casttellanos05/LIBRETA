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
    const o = { grado: g.grado, nivel: g.nivel, nivelMeta: g.nivelMeta || null, alumnos: alumnosDe(g.id).length, avance: { sesionIngles: posicion(g.id), de: TOTAL_SESIONES, impartidasIngles: listaDadas(g.id, 'ingles').length, impartidasCompu: listaDadas(g.id, 'compu').length }, bitacora: (() => { const b = bitStats(g.id); return { registros: b.n, animo: r2(b.animo), participacion: r2(b.part), planCumplido: b.planSi, planParcial: b.planParcial, planNoCumplido: b.planNo, repeticiones: b.repetir, etiquetas: b.tags }; })() };
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
  const sub = S.ui.av || 'grupos';
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>Avance</h2><div class="muted">Dónde va cada grupo y cómo van los resultados.</div></div><div class="seg">' + [['grupos', 'Por grupo'], ['metricas', 'Métricas'], ['cambios', 'Cambios'], ['reporte', 'Reporte final']].map(x => '<button class="' + (sub === x[0] ? 'on' : '') + '" data-act="avSub|' + x[0] + '">' + x[1] + (x[0] === 'cambios' && pendientes().length ? ' (' + pendientes().length + ')' : '') + '</button>').join('') + '</div></div>';
  if (!Object.keys(S.grupos).length) return h + '<div class="card empty">Todavía no hay grupos.</div>';
  return h + ({ grupos: avGrupos, metricas: avMetricas, cambios: avCambios, reporte: avReporte }[sub])();
};
ACT.avSub = (el, s) => { S.ui.av = s; render(); };
const pendientes = () => Object.values(S.cambios).filter(c => c.estado === 'pendiente');

function avGrupos() {
  return '<div class="grid2">' + ordenGrupos().map(g => {
    const pos = posicion(g.id), I = infoSesion(pos), b = bitStats(g.id), ing = matsDe(g.id).indexOf('ingles') >= 0;
    return '<div class="card"><div class="row sp"><span class="gtitle">' + gNombre(g.id) + '</span><span class="badge acc">Nivel ' + g.nivel + (g.nivelMeta ? ' → ' + g.nivelMeta : '') + '</span></div>' +
      (ing ? '<div style="margin-top:8px"><div class="row sp small"><span>Sesión <b>' + Math.min(pos, TOTAL_SESIONES) + '</b> de ' + TOTAL_SESIONES + '</span><span class="muted">' + listaDadas(g.id, 'ingles').length + ' clases impartidas</span></div>' + barra(pos, TOTAL_SESIONES) +
        '<div style="margin-top:8px"><span class="muted">Le toca:</span> <b>' + esc(I.titulo) + '</b></div></div>' : '') +
      '<div class="small muted" style="margin-top:6px">Computación: ' + listaDadas(g.id, 'compu').length + ' clases impartidas' + (b.n ? ' · Ánimo ' + (b.animo ? ANIMOS[Math.round(b.animo) - 1] : '—') + ' · Participación ' + fix1(b.part) + '/5' : '') + '</div>' +
      (ing ? '<div class="row" style="margin-top:8px"><span class="small muted">Ajustar posición:</span><button class="btn sm" data-act="ajusta|' + g.id + '|-1">−1</button><button class="btn sm" data-act="ajusta|' + g.id + '|1">+1</button><span class="small muted">(' + (((g.ajuste || {}).ingles) || 0) + ')</span></div>' : '') + '</div>';
  }).join('') + '</div>';
}
ACT.ajusta = (el, id, d) => { const g = cl(S.grupos[id]); g.ajuste = g.ajuste || { ingles: 0 }; g.ajuste.ingles = (g.ajuste.ingles || 0) + Number(d); save('grupos', id, g); render(); };

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
ACT.repPDF = () => {
  if (!window.jspdf) { toast('No cargó el generador de PDF; revisa tu internet', 'bad'); return; }
  const gid = S.ui.rep.g, g = S.grupos[gid], { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const navy = [15, 27, 51], gold = [36, 87, 214], ink = [50, 54, 66], m = 18, Wd = 215.9, w = Wd - 2 * m;
  let y = 20;
  const sec = t => { y += 4; doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...gold); doc.text(t.toUpperCase(), m, y); y += 1.5; doc.setDrawColor(...gold); doc.setLineWidth(0.3); doc.line(m, y, m + w, y); y += 5; };
  const txt = (t, o) => { o = o || {}; doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 9.5); doc.setTextColor(...(o.c || ink)); const ls = doc.splitTextToSize(t, o.w || w); if (y + ls.length * 4.6 > 262) { doc.addPage(); y = 20; } doc.text(ls, o.x || m, y); y += ls.length * 4.6; };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...navy); doc.text(S.cfg.escuela.toUpperCase(), Wd / 2, y, { align: 'center' }); y += 6;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...gold); doc.text('REPORTE FINAL DE GRUPO · ' + S.cfg.ciclo, Wd / 2, y, { align: 'center' }); y += 9;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...navy); doc.text(gNombre(gid), m, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...ink); doc.text('Maestro: ' + S.cfg.maestro + (g.maestro ? '   ·   Titular: ' + g.maestro : ''), m + w, y, { align: 'right' }); y += 4;
  const pos = posicion(gid), I = infoSesion(pos), bs = bitStats(gid);
  sec('Resumen');
  txt('Alumnos: ' + alumnosDe(gid).length + '.   Nivel de inglés: ' + g.nivel + ' (' + NIVELES[g.nivel] + ')' + (g.nivelMeta ? ', meta ' + g.nivelMeta : '') + '.');
  txt('Clases impartidas: Inglés ' + listaDadas(gid, 'ingles').length + (matsDe(gid).indexOf('compu') >= 0 ? ', Computación ' + listaDadas(gid, 'compu').length : '') + '.   Avance del programa de inglés: sesión ' + Math.min(pos, TOTAL_SESIONES) + ' de ' + TOTAL_SESIONES + ' (' + I.titulo + ').');
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
