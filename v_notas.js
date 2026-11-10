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
  const al = alumnosDe(n.g), crit = S.cfg.criterios, per = S.cfg.periodos;
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
  const al = alumnosDe(n.g), crit = S.cfg.criterios;
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
  const r0 = Number(el.dataset.r), c0 = Number(el.dataset.c), crit = S.cfg.criterios, al = alumnosDe(S.ui.n.g), n = S.ui.n;
  txt.trim().split(/\r?\n/).forEach((line, i) => line.split('\t').forEach((cell, j) => {
    const a = al[r0 + i], c = crit[c0 + j]; if (!a || !c) return; const v = parseNota(cell);
    if (v === undefined || (v !== '' && (v < 0 || v > 10))) return; setCrit(a.id, n.m, String(n.p), c.id, v === '' ? null : v);
  }));
  render();
});

/* ---------- Boletas ---------- */
function boletaDatos(a) {
  const g = S.grupos[a.grupoId], mats = matsDe(a.grupoId);
  return mats.map(m => {
    const d = calDoc(a.id, m), pers = [1, 2, 3].map(p => notaPeriodo(d, p));
    let obs = ''; for (let p = 3; p >= 1; p--) { if (d && d.p && d.p[p] && d.p[p].obs) { obs = d.p[p].obs; break; } }
    return { mat: m, nombre: MAT_NOMBRE[m], pers, anual: pers.every(x => x != null) ? notaAnual(d) : null, obs };
  });
}
function boletaPanel(n, al) {
  const sel = S.ui.bsel && S.alumnos[S.ui.bsel] && S.alumnos[S.ui.bsel].grupoId === n.g ? S.ui.bsel : al[0].id, a = S.alumnos[sel], g = S.grupos[n.g];
  const D = boletaDatos(a);
  let h = '<div class="card"><h3>Boletas</h3><div class="row"><label class="f">Vista previa<select data-chg="bSel">' + al.map(x => '<option value="' + x.id + '"' + (x.id === sel ? ' selected' : '') + '>' + esc(x.nombre) + '</option>').join('') + '</select></label>' +
    '<button class="btn pri" data-act="bolGrupo" style="align-self:flex-end">PDF del grupo (2 por hoja)</button><button class="btn" data-act="bolUna" style="align-self:flex-end">PDF de este alumno</button></div>';
  h += '<div class="boleta" style="margin-top:12px"><h5>' + esc(S.cfg.escuela.toUpperCase()) + '</h5><div class="sub">BOLETA DE EVALUACIÓN · ' + matsDe(n.g).map(m => MAT_NOMBRE[m].toUpperCase()).join(' Y ') + '</div><div class="sub" style="color:#0f1b33;font-weight:500">Ciclo escolar ' + esc(S.cfg.ciclo) + '</div><div class="rule"></div>' +
    '<div class="row sp"><div><div class="lab">ALUMNO</div><div style="font:700 19px var(--serif)">' + esc(a.nombre) + '</div></div><div style="text-align:right"><div class="lab">GRADO Y GRUPO</div><div style="font:700 19px var(--serif)">' + gNombre(n.g) + '</div></div></div><div class="rule"></div>' +
    '<table><tr><th>Asignatura</th>' + S.cfg.periodos.map(p => '<th>' + esc(p) + '</th>').join('') + '<th>Promedio final</th></tr>' + D.map(r => '<tr><td>' + r.nombre + '</td>' + r.pers.map(x => '<td>' + fmtNota(x) + '</td>').join('') + '<td style="font-weight:700">' + fmtNota(r.anual) + '</td></tr>').join('') + '</table>' +
    '<div class="lab" style="margin-top:10px">OBSERVACIONES</div><div class="obs">' + (D.filter(r => r.obs).map(r => '<b>' + r.nombre + ':</b> ' + esc(r.obs)).join('<br>') || '&nbsp;') + '</div>' +
    '<div class="small" style="margin-top:6px;color:#6b6a60">Escala ' + S.cfg.esc.min + ' a ' + S.cfg.esc.max + ' · Aprobatorio ' + S.cfg.esc.aprob + ' · ' + S.cfg.criterios.map(c => c.nombre + ' ' + c.peso + '%').join(', ') + '</div>' +
    '<div class="firmas"><div>' + esc(g.maestro || 'Maestro(a) de grupo') + '<br>Maestro(a) de grupo</div><div>' + esc(S.cfg.maestro) + '<br>Maestro de ' + matsDe(n.g).map(m => MAT_NOMBRE[m]).join(' y ') + '</div><div>' + esc(S.cfg.director || 'Director(a)') + '<br>Director(a)</div></div></div></div>';
  return h;
}
CHG.bSel = el => { S.ui.bsel = el.value; render(); };

function dibujaBoleta(doc, a, y0) {
  const Wd = 215.9, H = 139.7, m = 14, w = Wd - 2 * m;
  const navy = [15, 27, 51], gold = [36, 87, 214], ink = [60, 60, 70];
  const D = boletaDatos(a), g = S.grupos[a.grupoId], per = S.cfg.periodos;
  doc.setLineWidth(0.6); doc.setDrawColor(...navy); doc.rect(m - 6, y0 + 6, w + 12, H - 12);
  doc.setLineWidth(0.25); doc.setDrawColor(...gold); doc.rect(m - 4.2, y0 + 7.8, w + 8.4, H - 15.6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...navy); doc.text(S.cfg.escuela.toUpperCase(), Wd / 2, y0 + 18, { align: 'center' });
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...gold);
  const sub = 'BOLETA DE EVALUACIÓN · ' + D.map(r => r.nombre.toUpperCase()).join(' Y ');
  if (doc.setCharSpace) { const sw = doc.getTextWidth(sub) + 1 * (sub.length - 1); doc.setCharSpace(1); doc.text(sub, (Wd - sw) / 2, y0 + 24); doc.setCharSpace(0); }
  else doc.text(sub, Wd / 2, y0 + 24, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...navy); doc.text('Ciclo escolar ' + S.cfg.ciclo, Wd / 2, y0 + 28.5, { align: 'center' });
  doc.setDrawColor(...gold); doc.setLineWidth(0.4); doc.line(m, y0 + 32, m + w, y0 + 32);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...gold); doc.text('ALUMNO', m, y0 + 38);
  doc.text('GRADO Y GRUPO', m + w, y0 + 38, { align: 'right' });
  let fs = 14; doc.setFont('helvetica', 'bold'); doc.setTextColor(...navy);
  do { doc.setFontSize(fs); fs -= 0.5; } while (doc.getTextWidth(a.nombre) > w - 50 && fs > 8);
  doc.text(a.nombre, m, y0 + 44.5);
  doc.setFontSize(14); doc.text(g.grado + '.º ' + g.letra, m + w, y0 + 44.5, { align: 'right' });
  doc.setDrawColor(...gold); doc.setLineWidth(0.2); doc.line(m, y0 + 48, m + w, y0 + 48);
  // tabla
  const cw = [58, 30, 30, 30, w - 58 - 90], ty = y0 + 54, rh = 10;
  doc.setFillColor(...navy); doc.rect(m, ty, w, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  let x = m; const hd = ['ASIGNATURA'].concat(per.map(p => p.toUpperCase()), ['PROMEDIO FINAL']);
  hd.forEach((t, i) => { if (i === 0) doc.text(t, x + 3, ty + 5.3); else doc.text(t, x + cw[i] / 2, ty + 5.3, { align: 'center' }); x += cw[i]; });
  D.forEach((r, k) => {
    const y = ty + 8 + k * rh;
    if (k % 2 === 1) { doc.setFillColor(238, 241, 246); doc.rect(m, y, w, rh, 'F'); }
    doc.setDrawColor(223, 228, 236); doc.setLineWidth(0.2); doc.line(m, y + rh, m + w, y + rh);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...navy); doc.text(r.nombre, m + 3, y + 6.5);
    let xx = m + cw[0];
    r.pers.concat([r.anual]).forEach((v, i) => {
      const last = i === 3; doc.setFont(last ? 'helvetica' : 'helvetica', 'bold'); doc.setFontSize(last ? 13 : 10.5);
      if (v == null) doc.setTextColor(170, 170, 170); else if (last && v < S.cfg.esc.aprob) doc.setTextColor(176, 58, 42); else doc.setTextColor(...navy);
      doc.text(fmtNota(v), xx + cw[i + 1] / 2, y + 6.8, { align: 'center' }); xx += cw[i + 1];
    });
  });
  const ey = ty + 8 + D.length * rh;
  doc.setDrawColor(...navy); doc.setLineWidth(0.4); doc.line(m, ey, m + w, ey);
  // observaciones
  const oy = ey + 6; doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...gold); doc.text('OBSERVACIONES', m, oy);
  doc.setFillColor(238, 241, 246); doc.roundedRect(m, oy + 1.5, w, 21, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...ink);
  const ob = D.filter(r => r.obs).map(r => r.nombre + ': ' + r.obs).join('   '); if (ob) doc.text(doc.splitTextToSize(ob, w - 6).slice(0, 4), m + 3, oy + 6.5);
  // pie
  doc.setFontSize(6.5); doc.setTextColor(120, 120, 120);
  doc.text('Escala ' + S.cfg.esc.min + ' a ' + S.cfg.esc.max + '. Calificación aprobatoria: ' + S.cfg.esc.aprob + '. Evaluación: ' + S.cfg.criterios.map(c => c.nombre + ' ' + c.peso + '%').join(', ') + '.', m, oy + 27.5);
  const fy = y0 + 124; doc.setDrawColor(...navy); doc.setLineWidth(0.3);
  const fw = (w - 16) / 3, fl = [[g.maestro || '', 'Maestro(a) de grupo'], [S.cfg.maestro, 'Maestro de ' + D.map(r => r.nombre).join(' y ')], [S.cfg.director || '', 'Director(a)']];
  fl.forEach((f, i) => {
    const fx = m + i * (fw + 8); doc.line(fx, fy, fx + fw, fy);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...navy); doc.text(f[0] || ' ', fx + fw / 2, fy + 3.3, { align: 'center', maxWidth: fw });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 120, 120); doc.text(f[1], fx + fw / 2, fy + 6.6, { align: 'center', maxWidth: fw });
  });
}
function boletasPDF(lista) {
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'letter' });
  lista.forEach((a, i) => {
    if (i > 0 && i % 2 === 0) doc.addPage();
    dibujaBoleta(doc, a, (i % 2) * 139.7);
    if (i % 2 === 0) { doc.setLineDashPattern([2, 2], 0); doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2); doc.line(5, 139.7, 210.9, 139.7); doc.setLineDashPattern([], 0); }
  });
  return doc.output('arraybuffer');
}
ACT.bolGrupo = () => {
  if (!window.jspdf) { toast('No cargó el generador de PDF; revisa tu internet', 'bad'); return; }
  const n = S.ui.n, al = alumnosDe(n.g); descargar('boletas-' + n.g + '.pdf', boletasPDF(al));
};
ACT.bolUna = () => {
  if (!window.jspdf) { toast('No cargó el generador de PDF; revisa tu internet', 'bad'); return; }
  const n = S.ui.n, a = S.alumnos[S.ui.bsel && S.alumnos[S.ui.bsel] ? S.ui.bsel : alumnosDe(n.g)[0].id]; descargar('boleta-' + a.id + '.pdf', boletasPDF([a]));
};

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
  obsGuarda(aid, cur ? cur.replace(/[.\s]+$/, '') + '. ' + f : f); ACT.askno(); render();
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
