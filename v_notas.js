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

VIEWS.notas = function () {
  const n = notaSel();
  if (!n) return '<div class="card empty">Primero da de alta tus grupos y alumnos en <b>Grupos</b>.</div>';
  const al = alumnosDe(n.g), crit = critDe(n.m), per = S.cfg.periodos;
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>Calificaciones</h2><div class="muted">Escribe y se guarda solo. Enter baja al siguiente alumno; también puedes pegar una columna desde Excel.</div></div></div>';
  h += '<div class="card"><div class="row"><label class="f">Grupo<select data-chg="nSel|g">' + ordenGrupos().map(g => '<option value="' + g.id + '"' + (g.id === n.g ? ' selected' : '') + '>' + gNombre(g.id) + '</option>').join('') + '</select></label>' +
    '<div class="f">Materia<div class="seg">' + matsDe(n.g).map(m => '<button class="' + (n.m === m ? 'on' : '') + '" data-act="nSet|m|' + m + '">' + MAT_NOMBRE[m] + '</button>').join('') + '</div></div>' +
    '<div class="f">Periodo<div class="seg">' + per.map((p, i) => '<button class="' + (n.p === i + 1 ? 'on' : '') + '" data-act="nSet|p|' + (i + 1) + '">' + esc(p) + '</button>').join('') + '</div></div></div></div>';
  if (!al.length) return h + '<div class="card empty">Este grupo todavía no tiene alumnos.</div>';
  const peso = crit.reduce((s, c) => s + c.peso, 0);
  if (peso !== 100) h += '<div class="note warn" style="margin-bottom:10px">Los porcentajes de los criterios suman ' + peso + ', no 100. El promedio se calcula proporcional; ajústalos en Ajustes.</div>';
  h += '<div class="card"><div class="row sp" style="margin-bottom:8px"><span class="small muted">En Observación toca 💬 para elegir una frase amable, o deja que la libreta sugiera una para cada niño.</span><button class="btn sm" data-act="obsAuto">Sugerir observaciones tiernas</button></div><div class="scroll"><table class="gridn"><tr><th>Alumno</th>' + crit.map(c => '<th class="n">' + esc(c.nombre) + ' <span class="muted">' + c.peso + '%</span></th>').join('') + '<th class="n">Calif. del periodo</th><th class="n hide-s">Promedio anual</th><th>Observación</th></tr>';
  h += '<tr><td class="nm muted small">Llenar vacíos con…</td>' + crit.map(c => '<td><div class="row" style="flex-wrap:nowrap;gap:3px"><input class="gi" id="all-' + c.id + '" inputmode="decimal" style="width:52px" placeholder="10"><button class="btn sm" data-act="llenar|' + c.id + '">OK</button></div></td>').join('') + '<td></td><td class="hide-s"></td><td></td></tr>';
  al.forEach((a, r) => {
    const d = calDoc(a.id, n.m), p = (d && d.p && d.p[n.p]) || {}, fin = notaPeriodo(d, n.p), an = notaAnual(d);
    h += '<tr><td class="nm"><span class="muted small">' + a.num + '.</span> ' + esc(a.nombre) + '</td>' + crit.map((c, ci) => '<td><input class="gi' + (num(p[c.id]) && (p[c.id] > 10 || p[c.id] < 0) ? ' bad' : '') + '" inputmode="decimal" autocomplete="off" data-r="' + r + '" data-c="' + ci + '" data-inp="gnota|' + a.id + '|' + c.id + '" value="' + (num(p[c.id]) ? p[c.id] : '') + '"></td>').join('') +
      '<td id="fin-' + a.id + '" class="fin ' + (fin != null && fin < S.cfg.esc.aprob ? 'low' : '') + '">' + fmtNota(fin) + '</td><td id="an-' + a.id + '" class="fin hide-s" style="font-size:15px">' + fmtNota(an) + '</td>' +
      '<td><div class="row" style="flex-wrap:nowrap;gap:4px"><input class="go" id="obs-' + a.id + '" data-inp="gobs|' + a.id + '" value="' + esc(p.obs || '') + '" placeholder="Opcional"><button class="btn sm" data-act="obsFrases|' + a.id + '" title="Frases">💬</button></div></td></tr>';
  });
  h += '<tr id="avgrow"></tr></table></div>' + promedioPie(n) + '</div>';
  h += boletaPanel(n, al);
  return h;
};
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
  const pie = $('#pie'); if (pie) pie.outerHTML = promedioPie(n);
}
CHG.nSel = (el, k) => { S.ui.n[k] = el.value; render(); };
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
  const nx = document.querySelector('input.gi[data-r="' + t[0] + '"][data-c="' + t[1] + '"]'); if (nx) { nx.focus(); nx.select(); }
});
document.addEventListener('paste', e => {
  const el = e.target; if (!el.classList || !el.classList.contains('gi') || el.dataset.r == null) return;
  const txt = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\n\t]/.test(txt.trim())) return;
  e.preventDefault();
  const r0 = Number(el.dataset.r), c0 = Number(el.dataset.c), crit = critDe(S.ui.n.m), al = alumnosDe(S.ui.n.g), n = S.ui.n;
  txt.trim().split(/\r?\n/).forEach((line, i) => line.split('\t').forEach((cell, j) => {
    const a = al[r0 + i], c = crit[c0 + j]; if (!a || !c) return; const v = parseNota(cell);
    if (v === undefined || (v !== '' && (v < 0 || v > 10))) return; setCrit(a.id, n.m, String(n.p), c.id, v === '' ? null : v);
  }));
  render();
});

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

/* Observaciones amables para la boleta */
function obsGuarda(aid, texto) {
  const n = S.ui.n, key = aid + '_' + n.m, a = S.alumnos[aid];
  const d = cl(S.calificaciones[key]) || { alumnoId: aid, grupoId: a.grupoId, materia: n.m, p: {} };
  d.p = d.p || {}; d.p[n.p] = d.p[n.p] || {}; if (texto.trim()) d.p[n.p].obs = texto; else delete d.p[n.p].obs;
  save('calificaciones', key, d);
}
ACT.obsFrases = (el, aid) => {
  const m = S.ui.n.m, chips = (lst, tipo) => '<div class="chips" style="margin:6px 0 12px">' + lst.map((f, i) => '<button class="chip" data-act="obsPon|' + aid + '|' + tipo + '|' + i + '">' + esc(f) + '</button>').join('') + '</div>';
  modal('<h3 style="margin:0 0 4px">Frases para ' + esc(S.alumnos[aid].nombre) + '</h3><div class="small muted">Toca una para agregarla. Puedes combinar una felicitación con una sugerencia.</div><h4>Felicitaciones</h4>' + chips(OBS_FELIC[m] || OBS_FELIC.ingles, 'f') + '<h4>Sugerencias cariñosas</h4>' + chips(OBS_SUG[m] || OBS_SUG.ingles, 's'));
};
ACT.obsPon = (el, aid, tipo, i) => {
  const m = S.ui.n.m, f = ((tipo === 'f' ? OBS_FELIC : OBS_SUG)[m] || (tipo === 'f' ? OBS_FELIC : OBS_SUG).ingles)[Number(i)];
  const d = calDoc(aid, m), cur = ((d && d.p && d.p[S.ui.n.p] && d.p[S.ui.n.p].obs) || '').trim();
  obsGuarda(aid, uneObs(cur, f)); ACT.askno(); render();
};
ACT.obsAuto = () => {
  const n = S.ui.n; let k = 0, hechas = 0;
  alumnosDe(n.g).forEach((a, i) => {
    const d = calDoc(a.id, n.m), p = (d && d.p && d.p[n.p]) || {}, fin = notaPeriodo(d, n.p);
    if (fin == null || (p.obs || '').trim()) return;
    obsGuarda(a.id, obsSugerida(n.m, fin, i)); hechas++;
  });
  toast(hechas ? 'Listo: ' + hechas + ' observaciones sugeridas. Léelas y cámbialas si quieres.' : 'No hay niños con calificación y observación vacía', hechas ? 'ok' : '');
  render();
};
