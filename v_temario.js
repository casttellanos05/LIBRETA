'use strict';
/* Temario: carga del programa de Inglés (JSON) y consulta por ciclo y sesión */
const TEM_DEF = { ciclos: cl(CICLOS), niveles: cl(NIVELES), diag: cl(DIAGNOSTICO), total: TOTAL_SESIONES };
const lista = v => (Array.isArray(v) ? v.join(', ') : String(v || ''));
function aplicaTemario() {
  const M = S.temario.meta;
  CICLOS.length = 0;
  if (M && Array.isArray(M.ciclos) && M.ciclos.length) {
    M.ciclos.slice().sort((a, b) => a.n - b.n).forEach(c => CICLOS.push({ n: c.n, tema: c.tema || ('Ciclo ' + c.n), palabras: lista(c.vocabulario), recicla: lista(c.recicla), producto: c.producto || '', estructuras: c.estructuras || null, evaluacion: c.evaluacion || null }));
    TOTAL_SESIONES = 1 + 3 * CICLOS.length;
    [1, 2, 3, 4, 5].forEach(n => { NIVELES[n] = (M.niveles && M.niveles[n] && M.niveles[n].nombre) || TEM_DEF.niveles[n]; });
    if (M.diagnostico && Array.isArray(M.diagnostico.bloques) && M.diagnostico.bloques.length) { DIAGNOSTICO.titulo = M.diagnostico.titulo || TEM_DEF.diag.titulo; DIAGNOSTICO.material = M.diagnostico.material || ''; DIAGNOSTICO.partes = M.diagnostico.bloques.map(b => (b.nombre || '') + (b.min ? ' (' + b.min + ' min)' : '') + ': ' + (b.instrucciones || '')); }
    else Object.assign(DIAGNOSTICO, cl(TEM_DEF.diag));
  } else {
    TEM_DEF.ciclos.forEach(c => CICLOS.push(cl(c))); TOTAL_SESIONES = TEM_DEF.total; Object.assign(NIVELES, cl(TEM_DEF.niveles)); Object.assign(DIAGNOSTICO, cl(TEM_DEF.diag));
  }
}
/* Acepta: el objeto completo, {ciclos:[...]}, un solo ciclo o una lista de ciclos. Se fusiona con lo ya cargado. */
function leeTemario(txt) {
  let t = String(txt).trim(); const m = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) t = m[1].trim();
  t = t.replace(/[“”]/g, '"');
  const o = JSON.parse(t); let ciclos = [], extra = {};
  if (Array.isArray(o)) ciclos = o; else if (Array.isArray(o.ciclos)) { ciclos = o.ciclos; extra = o; } else if (o.n && (o.semanas || o.tema)) ciclos = [o]; else extra = o;
  const meta = cl(S.temario.meta) || { version: 1, ciclos: [] }; const ses = [], avisos = [];
  if (extra.niveles) meta.niveles = extra.niveles;
  if (extra.diagnostico) meta.diagnostico = extra.diagnostico;
  ciclos.forEach(c => {
    if (!c || !num(Number(c.n))) { avisos.push('Un ciclo no trae número (n)'); return; }
    c.n = Number(c.n); const sem = c.semanas || [], base = Object.assign({}, c); delete base.semanas;
    const i = meta.ciclos.findIndex(x => x.n === c.n); if (i >= 0) meta.ciclos[i] = Object.assign({}, meta.ciclos[i], base); else meta.ciclos.push(base);
    sem.forEach((w, k) => {
      const fase = FASES.indexOf(w.fase) >= 0 ? FASES.indexOf(w.fase) : k, s = (c.n - 1) * 3 + fase + 1;
      if (num(Number(w.sesion)) && Number(w.sesion) !== s) avisos.push('Ciclo ' + c.n + ': la sesión ' + w.sesion + ' se acomodó como sesión ' + s + ' (' + FASES[fase] + ')');
      const tn = w.tareas_por_nivel || {}; [1, 2, 3, 4, 5].forEach(n => { if (!tn[n]) avisos.push('Sesión ' + s + ': falta la tarea del nivel ' + n); });
      ses.push({ id: 's' + s, data: Object.assign({}, w, { sesion: s, ciclo: c.n, fase: FASES[fase] }) });
    });
  });
  meta.ciclos.sort((a, b) => a.n - b.n); meta.cargado = hoy();
  return { meta, ses, avisos, nCiclos: ciclos.length };
}
function cargaTemario(txt) {
  let r; try { r = leeTemario(txt); } catch (e) { toast('No es un JSON válido: ' + e.message, 'bad'); return; }
  if (!r.nCiclos && !r.meta.niveles && !r.meta.diagnostico) { toast('No encontré ciclos, niveles ni diagnóstico en ese texto', 'bad'); return; }
  save('temario', 'meta', r.meta); r.ses.forEach(x => save('temario', x.id, x.data));
  S.ui.temAvisos = r.avisos; aplicaTemario(); toast('Temario cargado: ' + r.nCiclos + ' ciclo(s), ' + r.ses.length + ' sesión(es)', 'ok'); render();
}
CHG.temArchivo = async el => { const fs = Array.from(el.files || []); for (const f of fs) cargaTemario(await f.text()); el.value = ''; };
ACT.temPegar = () => { const t = $('#temTxt').value; if (!t.trim()) { toast('Pega primero el JSON del temario', 'bad'); return; } cargaTemario(t); };
ACT.temBorrar = () => ask('¿Quitar el temario cargado y volver al programa base de la libreta? El avance de los grupos no se borra.', () => { Object.keys(S.temario).forEach(id => del('temario', id)); S.ui.temAvisos = null; aplicaTemario(); render(); }, 'Quitar');
ACT.temVer = (el, n) => { S.ui.temC = S.ui.temC === Number(n) ? null : Number(n); render(); };
ACT.temBajar = () => { const M = cl(S.temario.meta); if (!M) return; M.ciclos.forEach(c => { c.semanas = [1, 2, 3].map(k => S.temario['s' + ((c.n - 1) * 3 + k)]).filter(Boolean); }); descargar('temario-ingles.json', JSON.stringify(M, null, 2)); };

VIEWS.temario = function () {
  const M = S.temario.meta, nSes = Object.keys(S.temario).filter(k => /^s\d+$/.test(k)).length;
  let h = '<div class="row sp" style="margin-bottom:12px"><div><h2>Temario</h2><div class="muted">El programa de Inglés que la libreta usa para decirte qué toca en cada grupo.</div></div>' + (M ? '<div class="row"><button class="btn sm" data-act="temBajar">Descargar</button><button class="btn sm danger" data-act="temBorrar">Quitar</button></div>' : '') + '</div>';
  h += '<div class="card"><div class="row" style="gap:22px"><div class="kpi"><b>' + CICLOS.length + '</b><span>ciclos</span></div><div class="kpi"><b>' + TOTAL_SESIONES + '</b><span>sesiones (con diagnóstico)</span></div><div class="kpi"><b>' + nSes + '/' + (CICLOS.length * 3) + '</b><span>sesiones con plan detallado</span></div></div><div class="small muted" style="margin-top:8px">' + (M ? 'Temario propio cargado el ' + esc(M.cargado || '') + '.' : 'Estás usando el programa base (7 ciclos). Carga tu temario para reemplazarlo.') + '</div></div>';
  if (S.ui.temAvisos && S.ui.temAvisos.length) h += '<div class="card note warn"><b>Revisa estos detalles del archivo:</b><ul style="margin:6px 0 0 18px;padding:0">' + S.ui.temAvisos.slice(0, 12).map(a => '<li>' + esc(a) + '</li>').join('') + '</ul>' + (S.ui.temAvisos.length > 12 ? '<div class="small">y ' + (S.ui.temAvisos.length - 12) + ' más…</div>' : '') + '</div>';
  h += '<div class="card"><h3>Cargar temario</h3><p class="muted" style="margin:0 0 10px">Sube el archivo .json que te entregó el otro chat, o pega el texto. Puedes cargarlo por partes (un ciclo a la vez): cada carga se suma a lo anterior y reemplaza los ciclos con el mismo número.</p><div class="row"><input type="file" accept=".json,.txt,application/json" multiple data-chg="temArchivo"></div><details><summary>Pegar el JSON</summary><textarea id="temTxt" rows="7" placeholder=\'{ "ciclos": [ { "n": 1, "tema": "...", "semanas": [ ... ] } ] }\' style="margin-top:8px;font-family:ui-monospace,monospace;font-size:12.5px"></textarea><div style="margin-top:8px"><button class="btn pri" data-act="temPegar">Cargar</button></div></details></div>';
  h += '<div class="stack" style="gap:8px">' + CICLOS.map(c => {
    const ab = S.ui.temC === c.n;
    let d = '';
    if (ab) {
      d = '<div style="margin-top:10px"><div class="small"><b>Vocabulario:</b> ' + esc(c.palabras) + '<br><b>Recicla:</b> ' + esc(c.recicla) + '<br><b>Producto:</b> ' + esc(c.producto) + '</div>' +
        (c.estructuras ? '<h4>Estructuras por nivel</h4><table>' + [1, 2, 3, 4, 5].map(n => '<tr><td style="white-space:nowrap"><b>' + n + '</b> ' + esc(NIVELES[n]) + '</td><td>' + esc(lista(c.estructuras[n])) + '</td></tr>').join('') + '</table>' : '') +
        (c.evaluacion ? '<h4>Evaluación</h4><div class="small">Escrito: ' + esc(c.evaluacion.escrito || '—') + '<br>Oral: ' + esc(c.evaluacion.oral || '—') + '<br>Participación: ' + esc(c.evaluacion.participacion || '—') + '</div>' : '') +
        [0, 1, 2].map(f => { const s = (c.n - 1) * 3 + f + 1, T = S.temario['s' + s]; return '<h4>Sesión ' + s + ' · ' + FASES[f] + '</h4>' + (T ? sesionHTML(T) : '<div class="small muted">Material: ' + esc(materialDe(c.n, f)) + '<br>Sin plan detallado: se usa la guía general por nivel.</div>'); }).join('') + '</div>';
    }
    return '<div class="card" style="margin:0"><div class="row sp" data-act="temVer|' + c.n + '" style="cursor:pointer"><div><span class="badge acc">Ciclo ' + c.n + '</span> <b>' + esc(c.tema) + '</b><div class="small muted">Sesiones ' + ((c.n - 1) * 3 + 1) + ' a ' + (c.n * 3) + ' · ' + esc(c.producto) + '</div></div><span class="muted">' + (ab ? '▾' : '▸') + '</span></div>' + d + '</div>';
  }).join('') + '</div>';
  return h;
};
function sesionHTML(T) {
  return '<div class="small">' + (T.objetivo ? '<b>Objetivo:</b> ' + esc(T.objetivo) + '<br>' : '') + (T.material ? '<b>Material:</b> ' + esc(T.material) + (T.copias ? ' · Copias: ' + esc(T.copias) : '') + '<br>' : '') + '</div>' +
    (Array.isArray(T.actividades) && T.actividades.length ? '<table style="margin-top:4px">' + T.actividades.map(a => '<tr><td style="white-space:nowrap;vertical-align:top">' + esc(a.min != null ? a.min + ' min' : '') + '</td><td><b>' + esc(a.nombre || '') + '</b>' + (a.descripcion ? ': ' + esc(a.descripcion) : '') + '</td></tr>').join('') + '</table>' : '') +
    (T.tareas_por_nivel ? '<table style="margin-top:4px">' + [1, 2, 3, 4, 5].map(n => '<tr><td style="white-space:nowrap;vertical-align:top"><b>' + n + '</b> ' + esc(NIVELES[n]) + '</td><td>' + esc(T.tareas_por_nivel[n] || '—') + '</td></tr>').join('') + '</table>' : '') +
    (T.evidencia_o_producto ? '<div class="small" style="margin-top:4px"><b>Evidencia:</b> ' + esc(T.evidencia_o_producto) + '</div>' : '');
}
