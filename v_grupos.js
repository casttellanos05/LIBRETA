'use strict';
/* Grupos y alumnos, importación desde Excel */

const normTxt = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const titulo = s => String(s || '').replace(/\s+/g, ' ').trim();
const aluId = (gid, n) => gid + '-' + z2(n);

VIEWS.grupos = function () {
  const gs = ordenGrupos(), sel = S.ui.gsel && S.grupos[S.ui.gsel] ? S.ui.gsel : (gs[0] && gs[0].id);
  S.ui.gsel = sel;
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>Grupos y alumnos</h2><div class="muted">Tus listas, por grado y grupo. ' + Object.keys(S.alumnos).length + ' alumnos en total.</div></div><div class="row"><button class="btn" data-act="gNuevo">+ Nuevo grupo</button><button class="btn pri" data-act="impAbrir">Importar desde Excel</button></div></div>';
  if (S.ui.gNuevo) {
    h += '<div class="card"><h3>Nuevo grupo</h3><div class="row"><label class="f">Grado<select id="ng">' + [1, 2, 3, 4, 5, 6].map(n => '<option>' + n + '</option>').join('') + '</select></label><label class="f">Grupo (letra)<input id="nl" maxlength="2" style="width:70px" value="A"></label><label class="f">Maestro(a) titular<input id="nm" placeholder="Nombre"></label><button class="btn pri" data-act="gCrear" style="align-self:flex-end">Crear</button></div></div>';
  }
  if (S.ui.imp) h += impPreview();
  else if (S.ui.impAbierto) h += impPanel();
  h += '<div class="chips" style="margin-bottom:12px">' + gs.map(g => '<button class="chip ' + (g.id === sel ? 'on' : '') + '" data-act="gSel|' + g.id + '">' + gNombre(g.id) + ' <span class="muted">' + alumnosDe(g.id).length + '</span></button>').join('') + '</div>';
  if (!gs.length) return h + '<div class="card empty">Aún no tienes grupos. Crea uno con “Nuevo grupo” o importa tu lista desde Excel (los grupos se crean solos).</div>';
  const g = S.grupos[sel], al = alumnosDe(sel);
  h += '<div class="card"><div class="row sp"><h3 style="margin:0">' + gNombre(sel) + '</h3><button class="btn sm danger" data-act="gBorrar|' + sel + '">Eliminar grupo</button></div>' +
    '<div class="row" style="margin-top:10px"><label class="f">Maestro(a) titular<input value="' + esc(g.maestro || '') + '" data-chg="gCampo|' + sel + '|maestro"></label>' +
    '<label class="f">Nivel de inglés<select data-chg="gCampo|' + sel + '|nivel">' + NIVS.map(n => '<option value="' + n + '"' + (g.nivel === n ? ' selected' : '') + '>' + n + ' · ' + esc(nomNivel('ingles', n)) + '</option>').join('') + '</select></label>' +
    (matsDe(sel).indexOf('compu') >= 0 ? '<label class="f">Nivel de computación<select data-chg="gCampo|' + sel + '|nivelCompu">' + NIVS.map(n => '<option value="' + n + '"' + (nivelDe(sel, 'compu') === n ? ' selected' : '') + '>' + n + ' · ' + esc(nomNivel('compu', n)) + '</option>').join('') + '</select></label>' : '') +
    '<label class="f">Meta de nivel (inglés)<select data-chg="gCampo|' + sel + '|nivelMeta"><option value="">—</option>' + NIVS.map(n => '<option value="' + n + '"' + (g.nivelMeta === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
    '<div class="f">Materias<div class="row"><label class="row small"><input type="checkbox" data-chg="gMat|' + sel + '|ingles"' + (matsDe(sel).indexOf('ingles') >= 0 ? ' checked' : '') + '> Inglés</label><label class="row small"><input type="checkbox" data-chg="gMat|' + sel + '|compu"' + (matsDe(sel).indexOf('compu') >= 0 ? ' checked' : '') + '> Computación</label></div></div></div></div>';
  h += '<div class="card"><div class="row sp"><h3 style="margin:0">Lista de alumnos (' + al.length + ')</h3><span class="muted small">' + pagan(sel) + ' pagan · ' + (al.length - pagan(sel)) + ' sin cobro</span></div>';
  h += '<div class="row" style="margin:10px 0"><input id="nuevoAlu" placeholder="Nombre completo del alumno" class="grow" data-enter="aluAdd"><button class="btn pri" data-act="aluAdd">Agregar</button></div>';
  if (al.length) h += '<div class="scroll"><table><tr><th>#</th><th>Nombre completo</th><th style="text-align:center">¿Paga?</th><th></th></tr>' + al.map(a => {
    const ab = (S.ui.aluAb || {})[a.id];
    return '<tr><td>' + a.num + '</td><td><input style="width:100%;min-width:200px" value="' + esc(a.nombre) + '" data-chg="aluNombre|' + a.id + '"></td><td style="text-align:center"><input type="checkbox" style="min-height:0;width:20px;height:20px" data-chg="aluPaga|' + a.id + '"' + (a.paga === false ? '' : ' checked') + '></td><td style="white-space:nowrap"><button class="btn sm' + (ab ? ' pri' : '') + '" data-act="aluAbre|' + a.id + '">Métricas ' + (ab ? '▾' : '▸') + '</button> <button class="btn sm ghost danger" data-act="aluDel|' + a.id + '">Quitar</button></td></tr>' +
      (ab ? '<tr><td></td><td colspan="3" style="padding-bottom:14px">' + aluMetricasHTML(a) + '</td></tr>' : '');
  }).join('') + '</table></div>';
  else h += '<div class="empty">Este grupo no tiene alumnos. Agrégalos arriba, pega una lista o importa el Excel.</div>';
  h += '<details><summary>Pegar una lista (un nombre por renglón)</summary><textarea id="pegaLista" rows="5" placeholder="Pega aquí los nombres desde Excel o Word"></textarea><div style="margin-top:6px"><button class="btn" data-act="pegaOk">Agregar a ' + gNombre(sel) + '</button></div></details></div>';
  return h;
};

ACT.gSel = (el, id) => { S.ui.gsel = id; render(); };
ACT.gNuevo = () => { S.ui.gNuevo = !S.ui.gNuevo; render(); };
function nuevoGrupoDoc(grado, letra, maestro) {
  letra = String(letra || 'A').toUpperCase().trim().slice(0, 2);
  const id = grado + letra;
  return { id, grado: Number(grado), letra, nivel: NIVEL_POR_GRADO[grado] || 1, nivelMeta: null, maestro: maestro || '', materias: grado === 1 ? ['ingles'] : ['ingles', 'compu'], ajuste: { ingles: 0 } };
}
ACT.gCrear = () => {
  const d = nuevoGrupoDoc(Number($('#ng').value), $('#nl').value, $('#nm').value.trim());
  if (S.grupos[d.id]) { toast('Ese grupo ya existe', 'bad'); return; }
  save('grupos', d.id, d); S.ui.gNuevo = false; S.ui.gsel = d.id; render();
};
ACT.gBorrar = (el, id) => ask('¿Eliminar el grupo <b>' + gNombre(id) + '</b> y sus ' + alumnosDe(id).length + ' alumnos? Sus calificaciones también se borrarán.', () => {
  alumnosDe(id).forEach(a => { del('alumnos', a.id); ['ingles', 'compu'].forEach(m => { if (S.calificaciones[a.id + '_' + m]) del('calificaciones', a.id + '_' + m); }); });
  del('grupos', id); S.ui.gsel = null; render();
}, 'Eliminar');
CHG.gCampo = (el, id, campo) => {
  const g = cl(S.grupos[id]); let v = el.value;
  if (campo === 'nivel' || campo === 'nivelMeta' || campo === 'nivelCompu') v = v === '' ? null : Number(v);
  g[campo] = v; save('grupos', id, g); render();
};
CHG.gMat = (el, id, mat) => {
  const g = cl(S.grupos[id]), m = new Set(matsDe(id)); if (el.checked) m.add(mat); else m.delete(mat);
  if (!m.size) { toast('Deja al menos una materia', 'bad'); render(); return; }
  g.materias = ['ingles', 'compu'].filter(x => m.has(x)); save('grupos', id, g); render();
};
function agregaAlumnos(gid, nombres) {
  const ex = alumnosDe(gid), vistos = new Set(ex.map(a => normTxt(a.nombre)));
  let n = ex.reduce((m, a) => Math.max(m, a.num), 0), items = [], dup = 0;
  nombres.forEach(x => {
    const nom = titulo(x); if (!nom) return;
    if (vistos.has(normTxt(nom))) { dup++; return; }
    vistos.add(normTxt(nom)); n++;
    items.push({ id: aluId(gid, n), data: { id: aluId(gid, n), grupoId: gid, num: n, nombre: nom } });
  });
  return { items, dup };
}
ACT.aluAdd = () => {
  const inp = $('#nuevoAlu'); if (!inp || !inp.value.trim()) return;
  const r = agregaAlumnos(S.ui.gsel, [inp.value]);
  if (!r.items.length) { toast('Ese alumno ya está en la lista', 'bad'); return; }
  save('alumnos', r.items[0].id, r.items[0].data); render(); setTimeout(() => { const i = $('#nuevoAlu'); if (i) i.focus(); }, 30);
};
ACT.pegaOk = () => {
  const t = $('#pegaLista').value.split(/\r?\n/).map(x => x.replace(/^\s*\d+[\.\)\-\s]+/, '')).filter(x => x.trim());
  const r = agregaAlumnos(S.ui.gsel, t); if (!r.items.length) { toast('No hay nombres nuevos', 'bad'); return; }
  putMany('alumnos', r.items, 'Alumnos'); if (r.dup) toast(r.dup + ' repetidos omitidos');
};
ACT.aluAbre = (el, id) => { S.ui.aluAb = S.ui.aluAb || {}; S.ui.aluAb[id] = !S.ui.aluAb[id]; render(); };
CHG.aluPaga = (el, id) => { const a = cl(S.alumnos[id]); a.paga = el.checked; save('alumnos', id, a); render(); };
CHG.aluNombre = (el, id) => { const a = cl(S.alumnos[id]); a.nombre = titulo(el.value); save('alumnos', id, a); };
ACT.aluDel = (el, id) => ask('¿Quitar a <b>' + esc(S.alumnos[id].nombre) + '</b>? Se borran también sus calificaciones.', () => {
  del('alumnos', id); ['ingles', 'compu'].forEach(m => { if (S.calificaciones[id + '_' + m]) del('calificaciones', id + '_' + m); }); render();
}, 'Quitar');

/* ---------- Importación Excel ---------- */
const PLANTILLA = [['Grado', 'Grupo', 'Nombre completo'], [1, 'A', 'PÉREZ LÓPEZ ANA SOFÍA'], [1, 'A', 'GARCÍA RUIZ LUIS ÁNGEL'], [2, 'B', 'HERNÁNDEZ MORA VALERIA']];
function impPanel() {
  return '<div class="card"><h3>Importar desde Excel</h3><p class="muted" style="margin:0 0 8px">Una hoja con las columnas <b>Grado</b>, <b>Grupo</b> y <b>Nombre completo</b> (también acepta “Apellidos” y “Nombre” por separado). Si tu archivo trae una hoja por grupo (1A, 1B…), usa el nombre de la hoja. Los grupos que no existan se crean solos.</p>' +
    '<div class="row"><input type="file" id="xfile" accept=".xlsx,.xls,.csv" data-chg="impArchivo"><button class="btn" data-act="plantilla">Descargar plantilla</button><button class="btn ghost" data-act="impCerrar">Cerrar</button></div></div>';
}
ACT.impAbrir = () => { S.ui.impAbierto = true; render(); };
ACT.impCerrar = () => { S.ui.impAbierto = false; S.ui.imp = null; render(); };
ACT.plantilla = () => {
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(PLANTILLA), 'Alumnos');
  descargar('plantilla-alumnos.xlsx', XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
};
const GRADO_PAL = { primero: 1, primer: 1, segundo: 2, tercero: 3, tercer: 3, cuarto: 4, quinto: 5, sexto: 6 };
function parseGrupo(txt) {
  let t = normTxt(txt).replace(/[“”"'`´]/g, ' ');
  Object.keys(GRADO_PAL).forEach(k => { t = t.replace(new RegExp('\\b' + k + '\\b', 'g'), String(GRADO_PAL[k])); });
  t = t.replace(/\b(grado|grupo|gpo|grp|seccion)\b\.?/g, ' ').replace(/[°º\.\-_:,]/g, ' ').replace(/\s+/g, ' ').trim();
  const m = t.match(/^([1-6])\s*(?:ro|do|er|to|mo|vo|o|a)?\s*([a-h])$/) || t.match(/^([1-6])([a-h])$/);
  return m ? { grado: Number(m[1]), letra: m[2].toUpperCase() } : null;
}
async function asegurarXLSX() {
  if (typeof XLSX !== 'undefined') return true;
  for (const src of ['lib/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js']) {
    try {
      await new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
      if (typeof XLSX !== 'undefined') return true;
    } catch (e) { }
  }
  return false;
}
function leerArchivo(f) {
  return new Promise((ok, no) => {
    const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => no(fr.error || new Error('lectura'));
    try { fr.readAsArrayBuffer(f); } catch (e) { no(e); }
  });
}
/* Lee un libro de Excel con casi cualquier acomodo: una hoja con columnas, una hoja por grupo, o bloques con título "1° A" */
function leeLibro(wb) {
  const rows = [], avisos = [], hojas = [];
  const UI_G = S.ui.gsel && S.grupos[S.ui.gsel] ? { grado: S.grupos[S.ui.gsel].grado, letra: S.grupos[S.ui.gsel].letra } : null;
  wb.SheetNames.forEach(sn => {
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: false, blankrows: false }).map(r => r.map(c => String(c == null ? '' : c).trim()));
    if (!aoa.length) return;
    // fila de encabezados: la primera (en las 30 primeras) que tenga columna de nombre o apellido
    let hi = -1, cG = -1, cL = -1, cGL = -1, cN = -1, cAp = [], cNom = -1;
    for (let i = 0; i < Math.min(30, aoa.length) && hi < 0; i++) {
      const hd = aoa[i].map(normTxt);
      const iN = hd.findIndex(h => /^(nombre completo|nombre del alumno|nombre de alumno|alumno|alumna|alumnos|nombre y apellidos?|estudiante)/.test(h));
      const iNom = hd.findIndex(h => /^(nombres?|nombre\(s\)|nombre s)$/.test(h));
      const iAp = hd.map((h, k) => (/apellido/.test(h) ? k : -1)).filter(k => k >= 0);
      if (iN >= 0 || iNom >= 0 || iAp.length) {
        hi = i; cN = iN; cNom = iNom; cAp = iAp;
        cGL = hd.findIndex(h => /(grado.*grupo|grupo.*grado)/.test(h));
        cG = hd.findIndex(h => /^(grado|grd|gdo)$/.test(h) || /^grado/.test(h) && cGL < 0);
        cL = hd.findIndex((h, k) => k !== cGL && /^(grupo|grp|gpo|seccion|letra)/.test(h));
      }
    }
    const data = hi >= 0 ? aoa.slice(hi + 1) : aoa;
    const gHoja = parseGrupo(sn);
    let ctx = null, cuenta = 0, desc = 0;
    const nombreDe = r => {
      if (hi < 0) { // sin encabezado: la celda de texto más larga que no sea solo un número
        const c = r.filter(x => x && !/^\d+$/.test(x) && !parseGrupo(x)).sort((a, b) => b.length - a.length)[0]; return titulo(c || '');
      }
      if (cN >= 0 && r[cN]) return titulo(r[cN]);
      const partes = cAp.map(k => r[k]).filter(Boolean).concat(cNom >= 0 && r[cNom] ? [r[cNom]] : []);
      return titulo(partes.join(' '));
    };
    data.forEach(r => {
      if (!r.some(Boolean)) return;
      const llenas = r.filter(Boolean);
      // fila de título de bloque: "1° A"
      if (llenas.length <= 2 && llenas.some(x => parseGrupo(x)) && !llenas.some(x => /[a-z]{4,}/i.test(x) && !parseGrupo(x))) { ctx = parseGrupo(llenas.find(x => parseGrupo(x))); return; }
      let g = null;
      if (cGL >= 0) g = parseGrupo(r[cGL]);
      if (!g && cG >= 0 && cL >= 0 && r[cG] && r[cL]) { const gr = parseInt(r[cG], 10) || (GRADO_PAL[normTxt(r[cG])] || 0); g = { grado: gr, letra: String(r[cL]).trim().toUpperCase().slice(0, 2) }; }
      if (!g && cL >= 0 && r[cL]) { g = parseGrupo(r[cL]); if (!g && /^[A-Za-z]$/.test(r[cL])) { const gr = (cG >= 0 && (parseInt(r[cG], 10) || GRADO_PAL[normTxt(r[cG])])) || (ctx && ctx.grado) || (gHoja && gHoja.grado) || (UI_G && UI_G.grado) || 0; if (gr) g = { grado: gr, letra: r[cL].toUpperCase() }; } }
      if (!g && cG >= 0 && r[cG]) g = parseGrupo(r[cG]);
      if (!g) g = ctx || gHoja || UI_G;
      const nom = nombreDe(r);
      if (!nom || /^(total|nombre|alumno|no\.?|num|numero|n°)$/i.test(normTxt(nom)) || /^\d+$/.test(nom)) return;
      if (!g || !(g.grado >= 1 && g.grado <= 6) || !g.letra) { avisos.push(nom); return; }
      rows.push({ gid: g.grado + g.letra, grado: g.grado, letra: g.letra, nombre: nom.replace(/^\d+[\.\)\-\s]+/, '') }); cuenta++;
    });
    hojas.push(sn + ': ' + (hi >= 0 ? 'encabezados en el renglón ' + (hi + 1) : 'sin encabezados') + ', ' + cuenta + ' alumnos');
  });
  return { rows, avisos, hojas };
}
CHG.impArchivo = async el => {
  const f = el.files && el.files[0]; if (!f) return;
  try {
    if (!(await asegurarXLSX())) { toast('No se pudo abrir el lector de Excel. Cierra y abre la app una vez con internet para actualizarla; mientras tanto usa “Pegar una lista”.', 'bad'); el.value = ''; return; }
    let buf;
    try { buf = await leerArchivo(f); }
    catch (e) { toast('El teléfono no pudo leer el archivo. Si está en Google Drive, descárgalo primero al dispositivo (Drive → ⋮ → Descargar) y elígelo desde Descargas.', 'bad'); el.value = ''; return; }
    if (!buf || !buf.byteLength) { toast('El archivo está vacío (0 bytes). Si está en la nube, descárgalo primero al dispositivo.', 'bad'); el.value = ''; return; }
    let wb;
    try { wb = XLSX.read(new Uint8Array(buf), { type: 'array' }); }
    catch (e) { toast('No pude abrir ese archivo como Excel. Guárdalo como .xlsx (Archivo → Guardar como) e inténtalo de nuevo.', 'bad'); el.value = ''; return; }
    const r = leeLibro(wb);
    S.ui.imp = { rows: r.rows, avisos: r.avisos, hojas: r.hojas, archivo: f.name };
    el.value = ''; render();
  } catch (e) { console.error(e); toast('No pude leer ese archivo: ' + (e && e.message ? e.message : 'error desconocido'), 'bad'); }
};
function impPreview() {
  const I = S.ui.imp, por = {};
  I.rows.forEach(r => { (por[r.gid] = por[r.gid] || []).push(r); });
  const ids = Object.keys(por).sort();
  let total = 0, dup = 0;
  const filas = ids.map(id => {
    const nuevo = !S.grupos[id], r = agregaAlumnos(id, por[id].map(x => x.nombre)); total += r.items.length; dup += r.dup;
    return '<tr><td><b>' + id + '</b></td><td>' + (nuevo ? '<span class="badge acc">grupo nuevo</span>' : '') + '</td><td class="n">' + r.items.length + ' nuevos</td><td class="n muted">' + r.dup + ' ya existían</td></tr>';
  }).join('');
  return '<div class="card"><h3>Vista previa: ' + esc(I.archivo) + '</h3>' + (ids.length ? '<div class="scroll"><table>' + filas + '</table></div>' : '<p class="muted">No encontré alumnos. Revisa que haya una columna de nombres (Nombre, Alumno, o Apellidos y Nombre) y que el grupo venga en una columna, en el nombre de la hoja (1A) o en un título (1° A).</p>') +
    (I.avisos.length ? '<div class="note warn" style="margin-top:8px">' + I.avisos.length + ' renglones sin grupo reconocido (se omiten): ' + esc(I.avisos.slice(0, 4).join(', ')) + (I.avisos.length > 4 ? '…' : '') + '</div>' : '') +
    (I.hojas && I.hojas.length ? '<details style="margin-top:8px"><summary>Cómo leí el archivo</summary><div class="small muted">' + I.hojas.map(esc).join('<br>') + '</div></details>' : '') + '<div class="row" style="margin-top:10px"><button class="btn pri" data-act="impOk"' + (total ? '' : ' disabled') + '>Importar ' + total + ' alumnos</button><button class="btn ghost" data-act="impCerrar">Cancelar</button></div></div>';
}
ACT.impOk = () => {
  const I = S.ui.imp, por = {}; I.rows.forEach(r => { (por[r.gid] = por[r.gid] || []).push(r); });
  const items = [], gnew = [];
  Object.keys(por).forEach(id => {
    if (!S.grupos[id]) { const d = nuevoGrupoDoc(por[id][0].grado, por[id][0].letra); gnew.push({ id, data: d }); S.grupos[id] = d; }
    const r = agregaAlumnos(id, por[id].map(x => x.nombre)); r.items.forEach(it => { items.push(it); S.alumnos[it.id] = it.data; });
  });
  S.ui.imp = null; S.ui.impAbierto = false;
  (async () => { if (gnew.length) await putMany('grupos', gnew, 'Grupos'); await putMany('alumnos', items, 'Alumnos'); render(); })();
};
