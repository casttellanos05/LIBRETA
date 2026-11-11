'use strict';
/* Calificaciones por grupo y boletas (PDF, dos por hoja Carta) */

function notaSel() {
  const gs = ordenGrupos(); if (!gs.length) return null;
  const n = S.ui.n = S.ui.n || {};
  if (!n.g || !S.grupos[n.g]) n.g = gs[0].id;
  const mats = matsDe(n.g); if (!n.m || mats.indexOf(n.m) < 0) n.m = mats[0];
  if (!n.p) n.p = 1;
  return n;
}
const fmtNota = v => (v == null ? '—' : (S.cfg.redondeo === 'entero' ? String(v) : Number(v).toFixed(1)));

const normBus = t => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const coincide = (nombre, q) => { const w = normBus(q).split(' ').filter(Boolean); if (!w.length) return true; const t = normBus(nombre); return w.every(x => t.indexOf(x) >= 0); };
const filaVisible = tr => tr && tr.style.display !== 'none';

VIEWS.notas = function () {
  const n = notaSel();
  if (!n) return '<div class="card empty">Primero da de alta tus grupos y alumnos en <b>Grupos</b>.</div>';
  const al = alumnosDe(n.g), crit = critDe(n.m), per = S.cfg.periodos;
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>Evaluaciones</h2><div class="muted">Escribe y se guarda solo. Enter baja al siguiente alumno; también puedes pegar una columna desde Excel. La observación de cada niño se escribe sola según su promedio.</div></div></div>';
  h += '<div class="card"><div class="row"><label class="f">Grupo<select data-chg="nSel|g">' + ordenGrupos().map(g => '<option value="' + g.id + '"' + (g.id === n.g ? ' selected' : '') + '>' + gNombre(g.id) + '</option>').join('') + '</select></label>' +
    '<div class="f">Materia<div class="seg">' + matsDe(n.g).map(m => '<button class="' + (n.m === m ? 'on' : '') + '" data-act="nSet|m|' + m + '">' + MAT_NOMBRE[m] + '</button>').join('') + '</div></div>' +
    '<div class="f">Periodo<div class="seg">' + per.map((p, i) => '<button class="' + (n.p === i + 1 ? 'on' : '') + '" data-act="nSet|p|' + (i + 1) + '">' + esc(p) + '</button>').join('') + '</div></div></div></div>';
  if (!al.length) return h + '<div class="card empty">Este grupo todavía no tiene alumnos.</div>';
  const peso = crit.reduce((s, c) => s + c.peso, 0);
  if (peso !== 100) h += '<div class="note warn" style="margin-bottom:10px">Los porcentajes de los criterios suman ' + peso + ', no 100. El promedio se calcula proporcional; ajústalos en Ajustes.</div>';
  h += '<div class="card"><div class="row sp" style="margin-bottom:8px"><span class="small muted">La observación se pone sola según el promedio. Toca 💬 para elegir otra (felicitación, apoyo o atención en clase) o escribe la tuya.</span><button class="btn sm" data-act="obsAuto">Poner observaciones automáticas</button></div>' + busHTML(n, al) + '<div class="scroll"><table class="gridn"><tr><th>Alumno</th>' + crit.map(c => '<th class="n">' + esc(c.nombre) + ' <span class="muted">' + c.peso + '%</span></th>').join('') + '<th class="n">Calif. del periodo</th><th class="n hide-s">Promedio anual</th><th>Observación</th></tr>';
  h += '<tr><td class="nm muted small">Llenar vacíos con…</td>' + crit.map(c => '<td><div class="row" style="flex-wrap:nowrap;gap:3px"><input class="gi" id="all-' + c.id + '" inputmode="decimal" style="width:52px" placeholder="10"><button class="btn sm" data-act="llenar|' + c.id + '">OK</button></div></td>').join('') + '<td></td><td class="hide-s"></td><td></td></tr>';
  al.forEach((a, r) => {
    const d = calDoc(a.id, n.m), p = (d && d.p && d.p[n.p]) || {}, fin = notaPeriodo(d, n.p), an = notaAnual(d);
    h += '<tr class="arow" data-nm="' + esc(normBus(a.nombre)) + '"' + (coincide(a.nombre, n.q) ? '' : ' style="display:none"') + '><td class="nm"><span class="muted small">' + a.num + '.</span> ' + esc(a.nombre) + '</td>' + crit.map((c, ci) => '<td><input class="gi' + (num(p[c.id]) && (p[c.id] > 10 || p[c.id] < 0) ? ' bad' : '') + '" inputmode="decimal" autocomplete="off" data-r="' + r + '" data-c="' + ci + '" data-inp="gnota|' + a.id + '|' + c.id + '" value="' + (num(p[c.id]) ? p[c.id] : '') + '"></td>').join('') +
      '<td id="fin-' + a.id + '" class="fin ' + (fin != null && fin < S.cfg.esc.aprob ? 'low' : '') + '">' + fmtNota(fin) + '</td><td id="an-' + a.id + '" class="fin hide-s" style="font-size:15px">' + fmtNota(an) + '</td>' +
      '<td><div class="row" style="flex-wrap:nowrap;gap:4px"><input class="go" id="obs-' + a.id + '" data-inp="gobs|' + a.id + '" value="' + esc(p.obs || '') + '" placeholder="Se escribe sola"><button class="btn sm" data-act="obsFrases|' + a.id + '" title="Frases">💬</button></div></td></tr>';
  });
  h += '<tr id="avgrow"></tr></table></div>' + promedioPie(n) + '</div>';
  h += listaPanel(n);
  h += boletaPanel(n, al);
  return h;
};
function busHTML(n, al) {
  const q = n.q || '', v = al.filter(a => coincide(a.nombre, q)).length;
  return '<div class="row" style="margin-bottom:8px;gap:8px;flex-wrap:nowrap;align-items:center"><input id="nq" type="search" autocomplete="off" placeholder="🔍 Buscar alumno por nombre…" value="' + esc(q) + '" data-inp="nBus" data-enter="nBusEnter" style="flex:1;min-width:0">' +
    '<button class="btn sm" id="nqx" data-act="nBusLimpia" style="' + (q ? '' : 'display:none') + '">Limpiar</button><span class="small muted nw" id="nqc">' + (q ? (v ? v + ' de ' + al.length : 'Sin resultados') : '') + '</span></div>';
}
function aplicaBus() {
  const n = S.ui.n, q = n.q || ''; let v = 0, tot = 0;
  document.querySelectorAll('tr.arow').forEach(tr => { const ok = coincide(tr.dataset.nm, q); tr.style.display = ok ? '' : 'none'; tot++; if (ok) v++; });
  const c = $('#nqc'), x = $('#nqx'); if (c) c.textContent = q ? (v ? v + ' de ' + tot : 'Sin resultados') : ''; if (x) x.style.display = q ? '' : 'none';
}
INP.nBus = el => { S.ui.n.q = el.value; aplicaBus(); };
ACT.nBusLimpia = () => { S.ui.n.q = ''; const i = $('#nq'); if (i) { i.value = ''; i.focus(); } aplicaBus(); };
ACT.nBusEnter = () => { const x = [...document.querySelectorAll('tr.arow')].find(filaVisible); const i = x && x.querySelector('input.gi'); if (i) { i.focus(); i.select(); } };
function promedioPie(n) {
  const al = alumnosDe(n.g), crit = critDe(n.m);
  const prom = c => { const v = al.map(a => { const d = calDoc(a.id, n.m); return d && d.p && d.p[n.p] ? d.p[n.p][c] : null; }).filter(num); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const fv = al.map(a => notaPeriodo(calDoc(a.id, n.m), n.p)).filter(x => x != null);
  const pf = fv.length ? fv.reduce((s, x) => s + x, 0) / fv.length : null, ap = fv.length ? Math.round(100 * fv.filter(x => x >= S.cfg.esc.aprob).length / fv.length) : null;
  return '<div class="row" id="pie" style="gap:16px;margin-top:10px">' + crit.map(c => '<div class="kpi"><b>' + fix1(prom(c.id)) + '</b><span>Prom. ' + esc(c.nombre.toLowerCase()) + '</span></div>').join('') + '<div class="kpi"><b>' + fix1(pf) + '</b><span>Prom. del periodo</span></div><div class="kpi"><b>' + (ap == null ? '—' : ap + '%') + '</b><span>Aprobados</span></div><div class="kpi"><b>' + fv.length + '/' + al.length + '</b><span>Con calificación</span></div></div>';
}
function refrescaFila(aid) {
  const n = S.ui.n, d = calDoc(aid, n.m), fin = notaPeriodo(d, n.p), an = notaAnual(d);
  const f = $('#fin-' + aid), a = $('#an-' + aid);
  if (f) { f.textContent = fmtNota(fin); f.className = 'fin ' + (fin != null && fin < S.cfg.esc.aprob ? 'low' : ''); }
  if (a) a.textContent = fmtNota(an);
  const ob = $('#obs-' + aid), pp = d && d.p && d.p[n.p]; if (ob && document.activeElement !== ob) ob.value = (pp && pp.obs) || '';
  const pie = $('#pie'); if (pie) pie.outerHTML = promedioPie(n);
}
CHG.nSel = (el, k) => { S.ui.n[k] = el.value; if (k === 'g') S.ui.n.q = ''; render(); };
ACT.nSet = (el, k, v) => { S.ui.n[k] = k === 'p' ? Number(v) : v; render(); };
function parseNota(t) {
  t = String(t).trim().replace(',', '.'); if (t === '') return '';
  const v = Number(t); return isNaN(v) ? undefined : v;
}
INP.gnota = (el, aid, crit) => {
  const v = parseNota(el.value); if (v === undefined) { el.classList.add('bad'); return; }
  el.classList.toggle('bad', v !== '' && (v < 0 || v > 10));
  if (v !== '' && (v < 0 || v > 10)) return;
  const n = S.ui.n; setCrit(aid, n.m, String(n.p), crit, v === '' ? null : v); refrescaFila(aid);
};
INP.gobs = (el, aid) => {
  const n = S.ui.n, key = aid + '_' + n.m, a = S.alumnos[aid];
  const d = cl(S.calificaciones[key]) || { alumnoId: aid, grupoId: a.grupoId, materia: n.m, p: {} };
  d.p = d.p || {}; d.p[n.p] = d.p[n.p] || {}; if (el.value.trim()) d.p[n.p].obs = el.value; else delete d.p[n.p].obs;
  d.p[n.p].obsAuto = false;
  save('calificaciones', key, d, 800);
};
ACT.llenar = (el, crit) => {
  const v = parseNota($('#all-' + crit).value); if (v === '' || v === undefined || v < 0 || v > 10) { toast('Escribe una calificación de 0 a 10', 'bad'); return; }
  const n = S.ui.n; let k = 0;
  alumnosDe(n.g).forEach(a => { const d = calDoc(a.id, n.m), p = d && d.p && d.p[n.p]; if (!p || !num(p[crit])) { setCrit(a.id, n.m, String(n.p), crit, v); k++; } });
  toast(k + ' celdas llenadas', 'ok'); render();
};
document.addEventListener('keydown', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('gi') || el.dataset.r == null) return;
  const r = Number(el.dataset.r), c = Number(el.dataset.c); let t = null;
  if (e.key === 'Enter' || e.key === 'ArrowDown') t = [r + 1, c]; else if (e.key === 'ArrowUp') t = [r - 1, c];
  else if (e.key === 'ArrowRight' && el.selectionStart === el.value.length) t = [r, c + 1]; else if (e.key === 'ArrowLeft' && el.selectionStart === 0) t = [r, c - 1];
  if (!t) return; e.preventDefault();
  const st = t[0] > r ? 1 : -1; let rr = t[0];
  for (;;) { const nx = document.querySelector('input.gi[data-r="' + rr + '"][data-c="' + t[1] + '"]'); if (!nx) break; if (filaVisible(nx.closest('tr'))) { nx.focus(); nx.select(); break; } if (t[0] === r) break; rr += st; }
});
document.addEventListener('paste', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('gi') || el.dataset.r == null) return;
  const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\n\t]/.test(txt.trim())) return;
  e.preventDefault();
  const r0 = Number(el.dataset.r), c0 = Number(el.dataset.c), crit = critDe(S.ui.n.m), al = alumnosDe(S.ui.n.g), n = S.ui.n;
  const vis = al.map((a, i) => i).filter(i => { const x = document.querySelector('input.gi[data-r="' + i + '"]'); return x && filaVisible(x.closest('tr')); }), p0 = Math.max(0, vis.indexOf(r0));
  txt.trim().split(/\r?\n/).forEach((line, i) => line.split('\t').forEach((cell, j) => {
    const a = al[vis[p0 + i]], c = crit[c0 + j]; if (!a || !c) return; const v = parseNota(cell);
    if (v === undefined || (v !== '' && (v < 0 || v > 10))) return; setCrit(a.id, n.m, String(n.p), c.id, v === '' ? null : v);
  }));
  render();
});


/* ---------- Lista de calificaciones para maestros (PDF Carta, una hoja por grupo) ---------- */
function listaPanel(n) {
  const per = S.cfg.periodos[n.p - 1] || ('Trimestre ' + n.p);
  return '<div class="card"><h3>Lista de calificaciones para maestros</h3><div class="muted" style="margin:0 0 10px">Una hoja con la calificación de cada alumno en Inglés y Computación, solo del trimestre elegido arriba (<b>' + esc(per) + '</b>). Sirve para que el maestro titular la copie o tenga un resumen de sus niños.</div>' +
    '<div class="row"><button class="btn pri" data-act="listaPDF|g">PDF de ' + gNombre(n.g) + '</button><button class="btn" data-act="listaPDF|t">PDF de todos los grupos (una hoja por grupo)</button></div></div>';
}
function dibujaLista(doc, gid, p) {
  const g = S.grupos[gid], al = alumnosDe(gid), mats = matsDe(gid), per = S.cfg.periodos[p - 1] || ('Trimestre ' + p);
  const Wd = 215.9, M = 18, W = Wd - 2 * M, bottom = 258, cw = 34, nw = 12, nameW = W - nw - cw * mats.length, chartH = 36;
  const navy = [15, 27, 51], ink = [50, 54, 66], gris = [128, 134, 148], rojo = [192, 57, 43], linea = [222, 227, 237], blanco = [255, 255, 255];
  /* color por materia: Inglés azul, Computación lila */
  const MC = { ingles: { fuerte: [36, 87, 214], tinta: [38, 72, 140], tinte: [238, 243, 253], claro: [169, 189, 240] }, compu: { fuerte: [106, 66, 196], tinta: [92, 66, 146], tinte: [243, 238, 251], claro: [201, 185, 238] } };
  const fill = c => doc.setFillColor(...c), draw = c => doc.setDrawColor(...c);
  const T = (t, x, y, o) => { o = o || {}; doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 10); doc.setTextColor(...(o.c || ink)); doc.text(String(t), x, y, o.a ? { align: o.a } : undefined); };
  const wide = (t, x, y, o) => { const sp = o.sp || 0.8; doc.setFont('helvetica', 'bold'); doc.setFontSize(o.s); doc.setTextColor(...o.c); doc.text(t, x, y, { charSpace: sp }); };
  const titulo = 'REPORTE DE CALIFICACIONES · ' + mats.map(m => MAT_NOMBRE[m].toUpperCase()).join(' Y ');
  // cabecera
  fill(BAR); doc.rect(0, 0, Wd, 15, 'F');
  T(S.cfg.escuela.toUpperCase(), Wd / 2, 9.4, { b: 1, s: 12, c: blanco, a: 'center' });
  wide(titulo, M, 28, { s: 8.2, c: TINK[p - 1] });
  T(gNombre(gid), M, 41, { b: 1, s: 26, c: navy });
  const pw = Math.max(40, doc.setFontSize(10).getTextWidth(per.toUpperCase()) + 12);
  fill(TCOL[p - 1]); doc.roundedRect(Wd - M - pw, 33, pw, 10, 2.4, 2.4, 'F'); T(per.toUpperCase(), Wd - M - pw / 2, 39.4, { b: 1, s: 10, c: TINK[p - 1], a: 'center' });
  T('Ciclo ' + S.cfg.ciclo, Wd - M, 24.4, { s: 8.5, c: gris, a: 'right' });
  T('Maestro de ' + mats.map(m => MAT_NOMBRE[m]).join(' y ') + ': ', M, 48.6, { s: 9.5, c: gris });
  const lw = doc.setFontSize(9.5).getTextWidth('Maestro de ' + mats.map(m => MAT_NOMBRE[m]).join(' y ') + ': ');
  T(S.cfg.maestro || '—', M + lw, 48.6, { b: 1, s: 10, c: navy });
  if (g && g.maestro) T('Maestro(a) titular: ' + g.maestro, Wd - M, 48.6, { s: 8.5, c: gris, a: 'right' });
  let y = 54;
  const encabezado = yy => {
    fill(BAR); doc.rect(M, yy, W, 8, 'F');
    T('#', M + nw / 2, yy + 5.4, { b: 1, s: 8.5, c: blanco, a: 'center' }); T('ALUMNO', M + nw + 2, yy + 5.4, { b: 1, s: 8.5, c: blanco });
    mats.forEach((m, i) => { const x = M + nw + nameW + cw * i; fill(MC[m].fuerte); doc.rect(x, yy, cw, 8, 'F'); T(MAT_NOMBRE[m].toUpperCase(), x + cw / 2, yy + 5.4, { b: 1, s: 8.5, c: blanco, a: 'center' }); });
    return yy + 8;
  };
  y = encabezado(y);
  const n = al.length, rh = Math.max(4.6, Math.min(8.2, (bottom - y - 9 - chartH - 4) / Math.max(1, n))), fs = rh < 5.2 ? 8 : rh < 5.8 ? 8.5 : rh < 7 ? 9.5 : 10.5;
  const vals = mats.map(() => []);
  al.forEach((a, i) => {
    if (y + rh > bottom) {
      doc.addPage(); fill(BAR); doc.rect(0, 0, Wd, 10, 'F'); T(S.cfg.escuela.toUpperCase() + ' · ' + gNombre(gid) + ' · ' + per, Wd / 2, 6.6, { b: 1, s: 8.5, c: blanco, a: 'center' });
      y = encabezado(16);
    }
    if (i % 2 === 0) { fill(TTINT[p - 1]); doc.rect(M, y, W, rh, 'F'); }
    mats.forEach((m, k) => { fill(MC[m].tinte); doc.rect(M + nw + nameW + cw * k, y, cw, rh, 'F'); });
    draw(linea); doc.setLineWidth(0.15); doc.line(M, y + rh, M + W, y + rh);
    const base = y + rh / 2 + fs * 0.12;
    T(a.num, M + nw / 2, base, { s: fs - 1.5, c: gris, a: 'center' });
    let f = fs; doc.setFont('helvetica', 'normal'); doc.setFontSize(f); while (f > 6.5 && doc.getTextWidth(a.nombre) > nameW - 4) { f -= 0.5; doc.setFontSize(f); }
    T(a.nombre, M + nw + 2, base, { s: f, c: ink });
    mats.forEach((m, k) => {
      const v = notaPeriodo(calDoc(a.id, m), p), cx = M + nw + nameW + cw * k + cw / 2;
      if (v == null) T('—', cx, base, { s: fs, c: gris, a: 'center' });
      else { vals[k].push(v); T(fmtNota(v), cx, base, { b: 1, s: fs + 0.5, c: v < S.cfg.esc.aprob ? rojo : MC[m].tinta, a: 'center' }); }
    });
    y += rh;
  });
  // promedio del grupo
  if (y + 9 > bottom + 6) { doc.addPage(); y = 16; }
  fill(TCOL[p - 1]); doc.rect(M, y + 1, W, 8, 'F');
  T('Promedio del grupo', M + nw + 2, y + 6.4, { b: 1, s: 9.5, c: TINK[p - 1] });
  mats.forEach((m, k) => { const v = vals[k].length ? vals[k].reduce((s, x) => s + x, 0) / vals[k].length : null; T(fix1(v), M + nw + nameW + cw * k + cw / 2, y + 6.4, { b: 1, s: 10.5, c: MC[m].tinta, a: 'center' }); });
  y += 9;
  // gráficas discretas: (1) cuántos alumnos hay en cada calificación (curva de distribución) y (2) cómo va el promedio por trimestre
  if (y + chartH + 2 > bottom + 10) { doc.addPage(); y = 18; }
  y += 6;
  const cnt = vals.map(vs => { const c = [0, 0, 0, 0, 0, 0]; vs.forEach(v => { c[Math.max(0, Math.min(5, Math.floor(v + 1e-9) - 5))]++; }); return c; });
  const mx = Math.max(1, ...cnt.map(c => Math.max(...c))), gh = chartH - 17, base0 = y + 9 + gh;
  const gx = M + 4, gw = 98, step = gw / 5, px = i => gx + 3 + i * (step - 1.2), py = (c, k) => base0 - (gh - 3) * c / mx;
  const poly = (pts, color, op) => {
    try { doc.setGState(new doc.GState({ opacity: op })); fill(color); const seg = []; for (let i = 1; i < pts.length; i++) seg.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]); doc.lines(seg, pts[0][0], pts[0][1], [1, 1], 'F', true); doc.setGState(new doc.GState({ opacity: 1 })); } catch (e) { }
  };
  wide('¿CÓMO ESTÁ EL GRUPO?', M, y + 1.5, { s: 7, c: gris, sp: 0.7 });
  // leyenda con porcentaje de aprobados
  let lx = M;
  mats.forEach((m, k) => {
    const t = vals[k].length, ap = t ? Math.round(100 * vals[k].filter(v => v >= S.cfg.esc.aprob).length / t) : null;
    fill(MC[m].fuerte); doc.rect(lx, y + 2.4, 3, 3, 'F'); const lab = MAT_NOMBRE[m] + (ap == null ? '' : ' · ' + ap + '% aprobados'); T(lab, lx + 4.5, y + 5, { s: 7, c: gris }); lx += 4.5 + doc.setFontSize(7).getTextWidth(lab) + 6;
  });
  draw(linea); doc.setLineWidth(0.15); doc.setLineDashPattern([0.6, 0.8], 0); doc.line(gx, base0 - (gh - 3) / 2, gx + gw, base0 - (gh - 3) / 2); doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.25); draw(gris); doc.line(gx, base0, gx + gw, base0);
  // áreas, líneas y puntos (se dibuja primero la materia con menos alumnos para que ninguna tape a la otra)
  mats.forEach((m, k) => { const pts = [[px(0), base0]].concat(cnt[k].map((c, i) => [px(i), py(c, k)])).concat([[px(5), base0]]); poly(pts, MC[m].fuerte, 0.12); });
  mats.forEach((m, k) => {
    draw(MC[m].fuerte); doc.setLineWidth(0.55);
    for (let i = 1; i < 6; i++) doc.line(px(i - 1), py(cnt[k][i - 1], k), px(i), py(cnt[k][i], k));
    cnt[k].forEach((c, i) => { fill(MC[m].fuerte); doc.circle(px(i), py(c, k), 0.95, 'F'); fill(blanco); doc.circle(px(i), py(c, k), 0.4, 'F'); });
  });
  /* números: el valor más alto va arriba del punto; el otro abajo si cabe, o a un lado si está pegado al eje */
  mats.forEach((m, k) => cnt[k].forEach((c, i) => {
    if (!c) return; const o = mats.length > 1 ? cnt[1 - k][i] : -1; let dx = 0, dy = -2;
    if (o === c) dx = k ? 2.2 : -2.2; else if (o > c && py(c, k) < base0 - 5.5) dy = 3.6; else if (o > c) dx = k ? 2.6 : -2.6;
    T(c, px(i) + dx, py(c, k) + dy, { s: 6.3, c: MC[m].tinta, a: 'center' });
  }));
  ['5 o menos', '6', '7', '8', '9', '10'].forEach((t, i) => T(t, px(i), base0 + 3.8, { s: 6.5, c: gris, a: 'center' }));
  T('calificación', gx + gw, base0 + 7.4, { s: 6, c: gris, a: 'right' });
  // tendencia por trimestre (promedio del grupo en cada materia)
  const tx = M + 116, tw = W - 116 - 4, th = gh - 3, tb = base0, ty = v => tb - th * (Math.max(5, Math.min(10, v)) - 5) / 5, tpx = i => tx + 6 + i * ((tw - 12) / 2);
  wide('PROMEDIO POR TRIMESTRE', tx - 2, y + 1.5, { s: 6.5, c: gris, sp: 0.5 });
  draw(linea); doc.setLineWidth(0.15); doc.setLineDashPattern([0.6, 0.8], 0); doc.line(tx, ty(S.cfg.esc.aprob), tx + tw, ty(S.cfg.esc.aprob)); doc.setLineDashPattern([], 0);
  doc.setLineWidth(0.25); draw(gris); doc.line(tx, tb, tx + tw, tb);
  [1, 2, 3].forEach((q, i) => T(q + (q === 1 ? '.er' : q === 2 ? '.º' : '.er'), tpx(i), tb + 3.8, { s: 6.5, c: gris, a: 'center' }));
  const prom = mats.map(m => [1, 2, 3].map(q => { const v = al.map(a => notaPeriodo(calDoc(a.id, m), q)).filter(x => x != null); return v.length ? v.reduce((s2, x) => s2 + x, 0) / v.length : null; }));
  mats.forEach((m, k) => {
    const pr = prom[k];
    draw(MC[m].fuerte); doc.setLineWidth(0.55);
    for (let i = 1; i < 3; i++) if (pr[i - 1] != null && pr[i] != null) doc.line(tpx(i - 1), ty(pr[i - 1]), tpx(i), ty(pr[i]));
    pr.forEach((v, i) => { if (v == null) return; fill(MC[m].fuerte); doc.circle(tpx(i), ty(v), 0.95, 'F'); fill(blanco); doc.circle(tpx(i), ty(v), 0.4, 'F'); const o = mats.length > 1 ? prom[1 - k][i] : null; T(fix1(v), tpx(i), ty(v) + (o != null && o > v ? 3.8 : -2), { s: 6.3, b: 1, c: MC[m].tinta, a: 'center' }); });
  });
}
function listaPDF(gids, p) {
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'letter' });
  gids.forEach((gid, i) => { if (i > 0) doc.addPage(); dibujaLista(doc, gid, p); });
  const N = doc.getNumberOfPages(), f = hoy().split('-').reverse().join('/');
  for (let i = 1; i <= N; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(128, 134, 148); doc.text('Libreta de Clases · generado el ' + f, 18, 272); doc.text('Página ' + i + ' de ' + N, 197.9, 272, { align: 'right' }); }
  return doc.output('arraybuffer');
}
ACT.listaPDF = async (el, q) => {
  if (!(await asegurarPDF())) return; const n = S.ui.n;
  const gids = q === 'g' ? [n.g] : ordenGrupos().filter(g => alumnosDe(g.id).length).map(g => g.id);
  if (!gids.length) { toast('No hay alumnos para imprimir', 'bad'); return; }
  descargar('calificaciones-' + (q === 'g' ? n.g : 'todos-los-grupos') + '-' + n.p + 'trim.pdf', listaPDF(gids, n.p));
};

/* ---------- Boletas: una hoja Carta por alumno, con ambas materias ---------- */
function boletaDatos(a) {
  return matsDe(a.grupoId).map(m => {
    const d = calDoc(a.id, m), crit = critDe(m), pers = [1, 2, 3].map(p => notaPeriodo(d, p));
    return {
      mat: m, nombre: MAT_NOMBRE[m], nivel: nivelDe(a.grupoId, m), crit, pers, anual: pers.every(x => x != null) ? notaAnual(d) : null,
      vals: crit.map(c => [1, 2, 3].map(p => { const v = d && d.p && d.p[p] ? d.p[p][c.id] : null; return num(v) ? v : null; })),
      obs: [1, 2, 3].map(p => (d && d.p && d.p[p] && d.p[p].obs) || '')
    };
  });
}
const TH = ['#d9e5f7', '#e6def4', '#f6ebc8'], TB = ['#f3f7fd', '#f7f4fc', '#fdfbf1'];
function boletaPanel(n, al) {
  const sel = S.ui.bsel && S.alumnos[S.ui.bsel] && S.alumnos[S.ui.bsel].grupoId === n.g ? S.ui.bsel : al[0].id, a = S.alumnos[sel];
  const D = boletaDatos(a), r2p = S.ui.rep2 || 2, imp = S.cfg.imp || { x: 0, y: 0 };
  let h = '<div class="card"><h3>Boletas</h3><div class="muted" style="margin:0 0 10px">Una hoja tamaño Carta por alumno, con Inglés y Computación, calificaciones desglosadas, observaciones y firmas de los tres trimestres.</div><div class="row"><label class="f">Vista previa<select data-chg="bSel">' + al.map(x => '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') + '</select></label>' +
    '<button class="btn pri" data-act="bolGrupo" style="align-self:flex-end">PDF del grupo</button><button class="btn" data-act="bolUna" style="align-self:flex-end">PDF de este alumno</button></div>';
  h += '<div class="boleta" style="margin-top:12px"><h5>' + esc(S.cfg.escuela.toUpperCase()) + '</h5><div class="sub">BOLETA DE EVALUACIÓN · ' + D.map(r => r.nombre.toUpperCase()).join(' Y ') + '</div><div class="rule"></div>' +
    '<div class="row sp" style="flex-wrap:nowrap"><div style="min-width:0"><div class="lab">ALUMNO</div><div style="font:700 15px var(--serif)">' + esc(a.nombre) + '</div></div><div style="text-align:right;flex:none"><div class="lab">GRADO Y GRUPO</div><div style="font:700 15px var(--serif)">' + gNombre(n.g) + '</div></div></div>' +
    D.map(r => '<div class="lab" style="margin-top:12px">' + r.nombre.toUpperCase() + ' · NIVEL ' + r.nivel + ' ' + esc(nomNivel(r.mat, r.nivel)).toUpperCase() + '</div><table><tr><th>Criterio</th>' + ['1.er', '2.º', '3.er'].map((p, i) => '<th style="color:#0f1b33;background:' + TH[i] + '">' + p + ' trim</th>').join('') + '<th>Final</th></tr>' +
      r.crit.map((c, i) => '<tr><td>' + esc(c.nombre) + ' <span style="font-weight:400;color:#6b6a60">' + c.peso + '%</span></td>' + r.vals[i].map((x, j) => '<td style="background:' + TB[j] + '">' + fmtNota(x) + '</td>').join('') + '<td></td></tr>').join('') +
      '<tr><td><b>Calificación del trimestre</b></td>' + r.pers.map((x, j) => '<td style="background:' + TB[j] + '"><b>' + fmtNota(x) + '</b></td>').join('') + '<td><b>' + fmtNota(r.anual) + '</b></td></tr></table>').join('') + '</div></div>';
  h += '<div class="card"><h3>Reimprimir sobre la hoja ya impresa</h3><p class="muted" style="margin:0 0 10px">Para el 2.º y 3.er trimestre: el PDF trae solo lo nuevo (calificaciones y observaciones del trimestre) en su lugar exacto. Mete en la impresora la hoja que ya imprimiste, con la misma orientación, e imprime al <b>100 % (tamaño real)</b>, sin “ajustar a la página”.</p>' +
    '<div class="row"><label class="f">Trimestre a agregar<select data-chg="rep2"><option value="2"' + (r2p === 2 ? ' selected' : '') + '>2.º trimestre</option><option value="3"' + (r2p === 3 ? ' selected' : '') + '>3er trimestre (incluye promedio final)</option></select></label>' +
    '<button class="btn pri" data-act="bolSolo|g" style="align-self:flex-end">Solo lo nuevo · grupo</button><button class="btn" data-act="bolSolo|a" style="align-self:flex-end">Solo lo nuevo · este alumno</button><button class="btn ghost" data-act="bolPrueba" style="align-self:flex-end">Hoja de prueba</button></div>' +
    '<div class="small muted" style="margin-top:8px">La hoja de prueba dibuja solo recuadros punteados: imprímela sobre una boleta vieja y revisa que caigan dentro de las casillas. Si no, corrige aquí (en milímetros; positivo mueve a la derecha o hacia abajo): <span class="row" style="display:inline-flex;gap:6px;vertical-align:middle"><input style="width:64px" inputmode="decimal" value="' + (imp.x || 0) + '" data-chg="impOff|x"> horizontal <input style="width:64px" inputmode="decimal" value="' + (imp.y || 0) + '" data-chg="impOff|y"> vertical</span></div></div>';
  return h;
}
CHG.bSel = el => { S.ui.bsel = el.value; render(); };
CHG.rep2 = el => { S.ui.rep2 = Number(el.value); render(); };
CHG.impOff = (el, k) => { const v = parseFloat(String(el.value).replace(',', '.')); cfgSet(c => { c.imp = Object.assign({ x: 0, y: 0 }, c.imp); c.imp[k] = isNaN(v) ? 0 : Math.max(-20, Math.min(20, v)); }); render(); };

function bolLay(nm) {
  const one = nm === 1, L = { m: 14, w: 187.9, labW: 74 };
  L.colW = (L.w - L.labW) / 4; L.tit = one ? 8 : 6.5; L.desc = one ? 17 : 8.5; L.th = one ? 7.5 : 6.5; L.cr = one ? 9.5 : 6.6; L.pr = one ? 9.5 : 7.4; L.gap = 3; L.ob = one ? 30 : 9.4;
  L.hb = L.tit + L.desc + L.th + 3 * L.cr + L.pr + L.gap + 3 * L.ob; L.y0 = 58; L.sep = 3;
  return L;
}
/* colores de trimestre: azul, lila, ámbar */
const TCOL = [[217, 229, 247], [230, 222, 244], [246, 235, 200]], TTINT = [[243, 247, 253], [247, 244, 252], [253, 251, 241]], TINK = [[38, 72, 140], [92, 66, 146], [126, 98, 28]], BAR = [27, 58, 125];
/* solo = null (hoja completa) | 2 | 3 (solo lo nuevo de ese trimestre); prueba = recuadros punteados de ese trimestre */
function dibujaBoleta(doc, a, solo, prueba) {
  const D = boletaDatos(a), g = S.grupos[a.grupoId], nm = D.length, L = bolLay(nm), Wd = 215.9, per = S.cfg.periodos, imp = S.cfg.imp || {};
  const ox = solo ? Number(imp.x) || 0 : 0, oy = solo ? Number(imp.y) || 0 : 0, st = !solo;
  const navy = [15, 27, 51], blue = [36, 87, 214], ink = [50, 54, 66], gris = [128, 134, 148], rojo = [192, 57, 43], linea = [222, 227, 237], blanco = [255, 255, 255];
  const fill = c => doc.setFillColor(...c), draw = c => doc.setDrawColor(...c);
  const R = (x, y, w, h, s) => doc.rect(x + ox, y + oy, w, h, s), LN = (x1, y1, x2, y2) => doc.line(x1 + ox, y1 + oy, x2 + ox, y2 + oy);
  const T = (t, x, y, o) => { o = o || {}; doc.setFont('helvetica', o.i ? 'italic' : o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 9); doc.setTextColor(...(o.c || ink)); doc.text(String(t), x + ox, y + oy, o.a ? { align: o.a } : undefined); };
  const col = p => L.m + L.labW + (p - 1) * L.colW, mid = p => col(p) + L.colW / 2;
  if (st) {
    doc.setLineWidth(0.5); draw(navy); R(8, 8, Wd - 16, 263.4);
    T(S.cfg.escuela.toUpperCase(), Wd / 2, 21, { b: 1, s: 17, c: navy, a: 'center' });
    const sub = 'BOLETA DE EVALUACIÓN · ' + D.map(r => r.nombre.toUpperCase()).join(' Y ');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...blue);
    if (doc.setCharSpace) { const sw = doc.getTextWidth(sub) + (sub.length - 1) * 0.8; doc.setCharSpace(0.8); doc.text(sub, (Wd - sw) / 2 + ox, 27.5 + oy); doc.setCharSpace(0); } else T(sub, Wd / 2, 27.5, { b: 1, s: 8, c: blue, a: 'center' });
    T('Ciclo escolar ' + S.cfg.ciclo, Wd / 2, 32.5, { s: 8.5, c: gris, a: 'center' });
    T('ALUMNO', L.m, 42, { b: 1, s: 7, c: blue }); T(a.nombre, L.m, 49.5, { b: 1, s: 14, c: navy });
    T('GRADO Y GRUPO', L.m + L.w, 42, { b: 1, s: 7, c: blue, a: 'right' }); T(gNombre(a.grupoId), L.m + L.w, 49.5, { b: 1, s: 14, c: navy, a: 'right' });
    if (g && g.maestro) T('Maestro(a) de grupo: ' + g.maestro, L.m, 54.5, { s: 7.5, c: gris });
  }
  D.forEach((r, bi) => {
    const y = L.y0 + bi * (L.hb + L.sep);
    const yT = y, yD = y + L.tit, yH = yD + L.desc, yC = yH + L.th, yP = yC + 3 * L.cr, yO = yP + L.pr + L.gap;
    if (st) {
      fill(BAR); R(L.m, yT, L.w, L.tit, 'F'); T(r.nombre.toUpperCase(), L.m + 3, yT + L.tit / 2 + 1.4, { b: 1, s: L.tit > 7 ? 10.5 : 9, c: blanco });
      T('Nivel ' + r.nivel + ' · ' + nomNivel(r.mat, r.nivel), L.m + L.w - 3, yT + L.tit / 2 + 1.4, { s: L.tit > 7 ? 9.5 : 8.5, c: [190, 205, 240], a: 'right' });
      const fs = nm === 1 ? 9 : 7.8, ls = doc.setFontSize(fs).splitTextToSize(descNivel(r.mat, r.nivel), L.w - 6).slice(0, nm === 1 ? 4 : 2);
      ls.forEach((t, i) => T(t, L.m + 3, yD + 4.2 + i * (fs * 0.42), { i: 1, s: fs, c: gris }));
      // columnas de trimestre con su color
      [1, 2, 3].forEach(p => {
        fill(TTINT[p - 1]); R(col(p), yH, L.colW, yP + L.pr - yH, 'F');
        fill(TCOL[p - 1]); R(col(p), yH, L.colW, L.th, 'F'); T(per[p - 1], mid(p), yH + L.th / 2 + 1.3, { b: 1, s: 7.5, c: TINK[p - 1], a: 'center' });
      });
      fill([246, 248, 251]); R(col(4), yH, L.colW, yP + L.pr - yH, 'F'); fill([222, 228, 238]); R(col(4), yH, L.colW, L.th, 'F'); T('Promedio final', mid(4), yH + L.th / 2 + 1.3, { b: 1, s: 7.5, c: navy, a: 'center' });
      T('Criterio de evaluación', L.m + 3, yH + L.th / 2 + 1.3, { b: 1, s: 7.5, c: navy });
      r.crit.forEach((c, i) => { const cy = yC + i * L.cr; T(c.nombre, L.m + 3, cy + L.cr / 2 + 1.3, { s: 8.5 }); T(c.peso + '%', L.m + L.labW - 3, cy + L.cr / 2 + 1.3, { s: 7, c: gris, a: 'right' }); });
      T('Calificación del trimestre', L.m + 3, yP + L.pr / 2 + 1.4, { b: 1, s: 8.5, c: navy });
      draw([170, 180, 200]); doc.setLineWidth(0.25); LN(L.m, yP, L.m + L.w, yP);
      // observaciones: una franja por trimestre
      [1, 2, 3].forEach(p => { const oyy = yO + (p - 1) * L.ob, hh = L.ob - 1; fill(TTINT[p - 1]); R(L.m, oyy, L.w, hh, 'F'); fill(TCOL[p - 1]); R(L.m, oyy, 1.6, hh, 'F'); T(per[p - 1], L.m + 5, oyy + hh / 2 + 1.1, { b: 1, s: 7, c: TINK[p - 1] }); });
    }
    // contenido que cambia en cada trimestre
    [1, 2, 3].forEach(p => {
      if (solo && p !== solo) return;
      if (prueba) { draw(TCOL[p - 1]); doc.setLineWidth(0.3); doc.setLineDashPattern([1.2, 1.2], 0); r.crit.forEach((c, i) => R(col(p) + 1, yC + i * L.cr + 0.8, L.colW - 2, L.cr - 1.6)); R(col(p) + 1, yP + 0.8, L.colW - 2, L.pr - 1.6); R(L.m + 26, yO + (p - 1) * L.ob + 1.4, L.w - 27, L.ob - 3.2); doc.setLineDashPattern([], 0); return; }
      r.crit.forEach((c, i) => { const v = r.vals[i][p - 1]; if (v != null) T(fmtNota(v), mid(p), yC + i * L.cr + L.cr / 2 + 1.4, { s: 9.5, a: 'center' }); });
      const np = r.pers[p - 1]; if (np != null) T(fmtNota(np), mid(p), yP + L.pr / 2 + 1.9, { b: 1, s: 11, c: np < S.cfg.esc.aprob ? rojo : TINK[p - 1], a: 'center' });
      const ob = (r.obs[p - 1] || '').trim();
      if (ob) {
        const maxW = L.w - 31, hh = L.ob - 3.2; let ok = null;
        const lim = nm === 1 ? [[10, 5], [9.5, 5], [9, 5]] : [[8.5, 2], [8, 2], [7.5, 3], [7, 3], [6.5, 4]];
        for (const [fs, mx] of lim) { const ls = doc.setFontSize(fs).splitTextToSize(ob, maxW), lh = fs * 0.42; if (ls.length <= mx && ls.length * lh <= hh) { ok = { fs, ls, lh }; break; } }
        if (!ok) { const fs = 6.5, lh = fs * 0.42, mx = Math.max(1, Math.floor(hh / lh)); ok = { fs, ls: doc.setFontSize(fs).splitTextToSize(ob, maxW).slice(0, mx), lh }; }
        const oyy = yO + (p - 1) * L.ob, h0 = ok.ls.length * ok.lh, y1 = oyy + 1.4 + (hh - h0) / 2 + ok.fs * 0.3;
        ok.ls.forEach((t, i) => T(t, L.m + 27, y1 + i * ok.lh, { s: ok.fs }));
      }
    });
    if ((!solo || solo === 3) && !prueba && r.anual != null) T(fmtNota(r.anual), mid(4), yP + L.pr / 2 + 1.9, { b: 1, s: 11.5, c: r.anual < S.cfg.esc.aprob ? rojo : navy, a: 'center' });
    if (prueba && solo === 3) { draw(navy); doc.setLineDashPattern([1.2, 1.2], 0); doc.setLineWidth(0.3); R(col(4) + 1, yP + 0.8, L.colW - 2, L.pr - 1.6); doc.setLineDashPattern([], 0); }
  });
  if (st) {
    const sy = L.y0 + nm * L.hb + (nm - 1) * L.sep + 4;
    T('Nombre del padre, madre o tutor:', L.m, sy + 3, { b: 1, s: 8, c: navy }); draw(navy); doc.setLineWidth(0.25); LN(L.m + 52, sy + 3.3, L.m + L.w, sy + 3.3);
    const bw = (L.w - 8) / 3;
    [1, 2, 3].forEach(p => {
      const bx = L.m + (p - 1) * (bw + 4);
      fill(TTINT[p - 1]); R(bx, sy + 7, bw, 19, 'F'); fill(TCOL[p - 1]); R(bx, sy + 7, bw, 5.5, 'F'); T(per[p - 1].toUpperCase(), bx + bw / 2, sy + 11, { b: 1, s: 7, c: TINK[p - 1], a: 'center' });
      draw(gris); doc.setLineWidth(0.25); LN(bx + 5, sy + 21, bx + bw - 5, sy + 21); T('Firma de enterado(a)', bx + bw / 2, sy + 24, { s: 6.5, c: gris, a: 'center' });
    });
    const ty = sy + 36, fw = (L.w - 16) / 2; draw(navy); doc.setLineWidth(0.3);
    [[S.cfg.maestro, 'Maestro de ' + D.map(r => r.nombre).join(' y '), L.m + 4], [S.cfg.director || '', 'Director(a) de la escuela', L.m + L.w - fw - 4]].forEach(f => { LN(f[2], ty, f[2] + fw, ty); T(f[0], f[2] + fw / 2, ty + 4, { s: 8, a: 'center' }); T(f[1], f[2] + fw / 2, ty + 8, { s: 6.8, c: gris, a: 'center' }); });
    T('Escala de ' + S.cfg.esc.min + ' a ' + S.cfg.esc.max + '. Calificación aprobatoria: ' + S.cfg.esc.aprob + '.', Wd / 2, 266.2, { s: 6.5, c: gris, a: 'center' });
  }
}
function boletasPDF(lista, solo, prueba) {
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'letter' });
  lista.forEach((a, i) => { if (i > 0) doc.addPage(); dibujaBoleta(doc, a, solo, prueba); });
  return doc.output('arraybuffer');
}
ACT.bolGrupo = async () => { if (!(await asegurarPDF())) return; const n = S.ui.n; descargar('boletas-' + n.g + '.pdf', boletasPDF(alumnosDe(n.g))); };
const alumnoSel = () => { const n = S.ui.n; return S.alumnos[S.ui.bsel && S.alumnos[S.ui.bsel] && S.alumnos[S.ui.bsel].grupoId === n.g ? S.ui.bsel : alumnosDe(n.g)[0].id]; };
ACT.bolUna = async () => { if (!(await asegurarPDF())) return; const a = alumnoSel(); descargar('boleta-' + a.id + '.pdf', boletasPDF([a])); };
ACT.bolSolo = async (el, quien) => {
  if (!(await asegurarPDF())) return; const p = S.ui.rep2 || 2, n = S.ui.n, lista = quien === 'a' ? [alumnoSel()] : alumnosDe(n.g);
  descargar('boletas-solo-' + p + 'trim-' + (quien === 'a' ? lista[0].id : n.g) + '.pdf', boletasPDF(lista, p));
};
ACT.bolPrueba = async () => { if (!(await asegurarPDF())) return; descargar('hoja-de-prueba-' + (S.ui.rep2 || 2) + 'trim.pdf', boletasPDF([alumnoSel()], S.ui.rep2 || 2, true)); };

/* Observaciones: automáticas por promedio, con menú para elegir otras */
function obsGuarda(aid, texto, auto) {
  const n = S.ui.n, key = aid + '_' + n.m, a = S.alumnos[aid];
  const d = cl(S.calificaciones[key]) || { alumnoId: aid, grupoId: a.grupoId, materia: n.m, p: {} };
  d.p = d.p || {}; d.p[n.p] = d.p[n.p] || {};
  if (texto.trim()) d.p[n.p].obs = texto; else delete d.p[n.p].obs;
  d.p[n.p].obsAuto = auto === true;
  save('calificaciones', key, d);
}
const obsActual = aid => { const d = calDoc(aid, S.ui.n.m), p = (d && d.p && d.p[S.ui.n.p]) || {}; return { txt: (p.obs || '').trim(), auto: p.obsAuto === true }; };
ACT.obsFrases = (el, aid) => {
  const m = S.ui.n.m, d = calDoc(aid, m), fin = d ? notaPeriodo(d, S.ui.n.p) : null, M = OBS_MENU[m] || OBS_MENU.ingles;
  const chips = (lst, gi) => '<div class="chips" style="margin:6px 0 12px">' + lst.map((f, i) => '<button class="chip" data-act="obsPon|' + aid + '|' + gi + '|' + i + '">' + esc(f) + '</button>').join('') + '</div>';
  modal('<h3 style="margin:0 0 4px">Observaciones para ' + esc(S.alumnos[aid].nombre) + '</h3><div class="small muted">Toca una frase para ponerla. Si ya hay un texto escrito por ti, la frase se agrega al final.</div>' +
    '<div style="max-height:58vh;overflow:auto;margin-top:8px">' + (fin != null ? '<div class="chips" style="margin:8px 0"><button class="chip on" data-act="obsUsaAuto|' + aid + '">Usar la automática según su promedio (' + fmtNota(fin) + ')</button></div>' : '') +
    M.map((g, gi) => '<h4>' + g.t + '</h4>' + chips(g.l, gi)).join('') + '</div>');
};
ACT.obsPon = (el, aid, gi, i) => {
  const m = S.ui.n.m, f = (OBS_MENU[m] || OBS_MENU.ingles)[Number(gi)].l[Number(i)], cur = obsActual(aid);
  obsGuarda(aid, cur.auto ? f : uneObs(cur.txt, f), false); ACT.askno(); render();
};
ACT.obsUsaAuto = (el, aid) => {
  const n = S.ui.n, key = aid + '_' + n.m, a = S.alumnos[aid], d = cl(S.calificaciones[key]) || { alumnoId: aid, grupoId: a.grupoId, materia: n.m, p: {} };
  d.p = d.p || {}; d.p[n.p] = d.p[n.p] || {}; aplicaObsAuto(d, aid, n.m, n.p, true); save('calificaciones', key, d); ACT.askno(); render();
};
ACT.obsAuto = () => {
  const n = S.ui.n; let hechas = 0;
  alumnosDe(n.g).forEach(a => {
    const key = a.id + '_' + n.m, d = cl(S.calificaciones[key]); if (!d) return; const antes = d.p && d.p[n.p] ? d.p[n.p].obs : null;
    aplicaObsAuto(d, a.id, n.m, n.p); if (d.p[n.p] && d.p[n.p].obs !== antes) { save('calificaciones', key, d); hechas++; }
  });
  toast(hechas ? 'Observaciones puestas en ' + hechas + ' alumnos (las que escribiste tú no se tocan).' : 'Todo está al día', hechas ? 'ok' : '');
  render();
};
