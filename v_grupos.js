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
    '<label class="f">Nivel de inglés<select data-chg="gCampo|' + sel + '|nivel">' + [1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + (g.nivel === n ? ' selected' : '') + '>' + n + ' · ' + NIVELES[n] + '</option>').join('') + '</select></label>' +
    '<label class="f">Meta de nivel<select data-chg="gCampo|' + sel + '|nivelMeta"><option value="">—</option>' + [1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + (g.nivelMeta === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label>' +
    '<div class="f">Materias<div class="row"><label class="row small"><input type="checkbox" data-chg="gMat|' + sel + '|ingles"' + (matsDe(sel).indexOf('ingles') >= 0 ? ' checked' : '') + '> Inglés</label><label class="row small"><input type="checkbox" data-chg="gMat|' + sel + '|compu"' + (matsDe(sel).indexOf('compu') >= 0 ? ' checked' : '') + '> Computación</label></div></div></div></div>';
  h += '<div class="card"><div class="row sp"><h3 style="margin:0">Lista de alumnos (' + al.length + ')</h3><span class="muted small">' + pagan(sel) + ' pagan · ' + (al.length - pagan(sel)) + ' sin cobro</span></div>';
  h += '<div class="row" style="margin:10px 0"><input id="nuevoAlu" placeholder="Nombre completo del alumno" class="grow" data-enter="aluAdd"><button class="btn pri" data-act="aluAdd">Agregar</button></div>';
  if (al.length) h += '<div class="scroll"><table><tr><th>#</th><th>Nombre completo</th><th style="text-align:center">¿Paga?</th><th></th></tr>' + al.map(a => '<tr><td>' + a.num + '</td><td><input style="width:100%;min-width:200px" value="' + esc(a.nombre) + '" data-chg="aluNombre|' + a.id + '"></td><td style="text-align:center"><input type="checkbox" style="min-height:0;width:20px;height:20px" data-chg="aluPaga|' + a.id + '"' + (a.paga === false ? '' : ' checked') + '></td><td><button class="btn sm ghost danger" data-act="aluDel|' + a.id + '">Quitar</button></td></tr>').join('') + '</table></div>';
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
  if (campo === 'nivel' || campo === 'nivelMeta') v = v === '' ? null : Number(v);
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
function parseGrupo(txt) { const m = String(txt || '').match(/(\d)\s*[°º.o]?\s*([A-Za-z])\b/); return m ? { grado: Number(m[1]), letra: m[2].toUpperCase() } : null; }
CHG.impArchivo = async el => {
  const f = el.files && el.files[0]; if (!f) return;
  try {
    if (typeof XLSX === 'undefined') { toast('No cargó el lector de Excel; revisa tu internet', 'bad'); return; }
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
    const rows = [], avisos = [];
    wb.SheetNames.forEach(sn => {
      const aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' }).filter(r => r.some(c => String(c).trim()));
      if (!aoa.length) return;
      const head = aoa[0].map(normTxt);
      const ix = re => head.findIndex(h => re.test(h));
      let cG = ix(/^grado/), cL = ix(/^grupo|^seccion|^letra/), cN = ix(/^nombre completo|^alumno|^nombre/), cA = ix(/apellido/);
      const tieneHead = cN >= 0 || cA >= 0 || cG >= 0;
      let data = tieneHead ? aoa.slice(1) : aoa; if (!tieneHead) { cN = 0; }
      if (cA >= 0 && cN >= 0 && /apellido/.test(head[cN])) cN = head.findIndex((h, i) => /^nombre/.test(h) && i !== cA);
      const gSheet = parseGrupo(sn);
      data.forEach(r => {
        let g = null;
        if (cG >= 0 && cL >= 0 && String(r[cG]).trim()) g = { grado: parseInt(r[cG], 10), letra: String(r[cL]).trim().toUpperCase().slice(0, 2) };
        else if (cL >= 0) g = parseGrupo(r[cL]);
        if (!g && cG >= 0) g = parseGrupo(r[cG]);
        if (!g) g = gSheet || (S.ui.gsel && S.grupos[S.ui.gsel] ? { grado: S.grupos[S.ui.gsel].grado, letra: S.grupos[S.ui.gsel].letra } : null);
        let nom = '';
        if (cA >= 0) nom = titulo(String(r[cA]) + ' ' + (cN >= 0 ? r[cN] : '')); else nom = titulo(r[cN >= 0 ? cN : 0]);
        if (!nom || !g || !(g.grado >= 1 && g.grado <= 6) || !g.letra) { if (nom) avisos.push(nom); return; }
        rows.push({ gid: g.grado + g.letra, grado: g.grado, letra: g.letra, nombre: nom });
      });
    });
    S.ui.imp = { rows, avisos, archivo: f.name };
    render();
  } catch (e) { console.error(e); toast('No pude leer ese archivo: ' + e.message, 'bad'); }
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
  return '<div class="card"><h3>Vista previa: ' + esc(I.archivo) + '</h3>' + (ids.length ? '<div class="scroll"><table>' + filas + '</table></div>' : '<p class="muted">No encontré alumnos. Revisa que las columnas se llamen Grado, Grupo y Nombre.</p>') +
    (I.avisos.length ? '<div class="note warn" style="margin-top:8px">' + I.avisos.length + ' renglones sin grupo reconocido (se omiten): ' + esc(I.avisos.slice(0, 4).join(', ')) + (I.avisos.length > 4 ? '…' : '') + '</div>' : '') +
    '<div class="row" style="margin-top:10px"><button class="btn pri" data-act="impOk"' + (total ? '' : ' disabled') + '>Importar ' + total + ' alumnos</button><button class="btn ghost" data-act="impCerrar">Cancelar</button></div></div>';
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
