'use strict';
/* Ajustes, horario y respaldo en hoja de cálculo */

function cfgSet(fn) { const c = cl(S.cfg); fn(c); save('config', 'main', c, 500); }
VIEWS.ajustes = function () {
  const c = S.cfg;
  let h = '<h2 style="margin-bottom:10px">Ajustes</h2>';
  const pend = Object.keys(LDB.out()).length, lastS0 = SYNC.last();
  h += '<div class="card updc"><div class="row sp"><div><h3 style="margin:0 0 2px">Actualizar</h3><div class="small muted">Versión instalada: <b id="verIn">' + esc(S.ui.ver || '…') + '</b>' + (S.ui.updTxt ? ' · ' + esc(S.ui.updTxt) : '') + '</div>' +
    '<div class="small muted">' + (SYNC.on() ? (pend ? '<b style="color:var(--warn)">' + pend + ' cambio' + (pend === 1 ? '' : 's') + ' por enviar</b>' : 'Todo enviado') + (lastS0 ? ' · última sincronización ' + new Date(lastS0).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '') : 'Sin sincronización: tus datos solo están en este equipo (configúrala más abajo).') + '</div></div>' +
    '<button class="btn pri" data-act="actualizar"' + (S.ui.upd ? ' disabled' : '') + '>' + (S.ui.upd ? 'Actualizando…' : '⟳ Actualizar ahora') + '</button></div>' +
    '<div class="small muted" style="margin-top:8px">Sube lo que capturaste, descarga lo más reciente de tus otros equipos y busca una versión nueva de la app. Necesita internet.</div></div>';
  if (!S.ui.ver) verApp().then(v => { S.ui.ver = v; const e = $('#verIn'); if (e) e.textContent = v; });
  h += '<div class="card"><h3>Escuela y boleta</h3><div class="grid2"><label class="f">Escuela<input value="' + esc(c.escuela) + '" data-chg="cfg|escuela"></label><label class="f">Ciclo escolar<input value="' + esc(c.ciclo) + '" data-chg="cfg|ciclo"></label><label class="f">Tu nombre (aparece en la boleta)<input value="' + esc(c.maestro) + '" data-chg="cfg|maestro"></label><label class="f">Director(a)<input value="' + esc(c.director) + '" data-chg="cfg|director"></label></div>' +
    '<h4 style="margin:16px 0 4px">Firmas de la boleta</h4><div class="small muted" style="margin-bottom:8px">Sube una foto de cada firma hecha con pluma sobre hoja blanca, con buena luz y sin sombras. La app quita el fondo y la pone sobre la línea de firma de cada boleta. Usa solo firmas que tengas autorización de usar. Se guardan en este equipo: súbelas en cada equipo donde imprimas boletas.</div>' +
    '<div class="grid2">' + firmaBox('maestro', 'Tu firma') + firmaBox('director', 'Firma del director(a)') + '</div></div>';
  h += '<div class="card"><h3>Cobro</h3><label class="f" style="max-width:260px">Monto por niño en cada clase<input inputmode="decimal" value="' + (c.tarifa || '') + '" placeholder="0" data-chg="cfgNum|tarifa"></label><div class="small muted" style="margin-top:6px">Cada clase se cobra por el número de niños que pagan en el grupo (monto × niños). Los niños sin cobro, como hermanos gemelos, se desmarcan en Grupos con la casilla “¿Paga?”. Cada clase guarda el monto y el número de niños al impartirla, así que cambiarlos después no altera lo ya cobrado.</div></div>';
  h += '<div class="card"><h3>Evaluación</h3><div class="small muted" style="margin:0 0 8px">Cada materia se pondera por separado. Escribe el nombre del criterio y su porcentaje (deben sumar 100).</div>';
  ['ingles', 'compu'].forEach(m => {
    const cr = critDe(m), pm = cr.reduce((t, k) => t + (Number(k.peso) || 0), 0);
    h += '<div class="lab" style="margin:10px 0 6px">' + MAT_NOMBRE[m].toUpperCase() + '</div><div class="stack" style="gap:8px">' + cr.map((k, i) => '<div class="row"><input class="grow" value="' + esc(k.nombre) + '" data-chg="crit|' + m + '|' + i + '|nombre"><input style="width:80px" inputmode="numeric" value="' + k.peso + '" data-chg="crit|' + m + '|' + i + '|peso"><span class="muted">%</span></div>').join('') + '</div>' +
      '<div class="small" style="margin-top:6px;color:var(' + (pm === 100 ? '--ok' : '--bad') + ')">Suma: ' + pm + '% ' + (pm === 100 ? '✓' : '(debería sumar 100)') + '</div>';
  });
  h += '<div class="row" style="margin-top:10px"><label class="f">Redondeo<select data-chg="cfg|redondeo"><option value="entero"' + (c.redondeo === 'entero' ? ' selected' : '') + '>Número entero (8, 9, 10)</option><option value="decimal"' + (c.redondeo === 'decimal' ? ' selected' : '') + '>Un decimal (8.5)</option></select></label>' +
    '<label class="f">Mínimo<input style="width:70px" inputmode="numeric" value="' + c.esc.min + '" data-chg="escN|min"></label><label class="f">Máximo<input style="width:70px" inputmode="numeric" value="' + c.esc.max + '" data-chg="escN|max"></label><label class="f">Aprobatorio<input style="width:70px" inputmode="numeric" value="' + c.esc.aprob + '" data-chg="escN|aprob"></label></div>' +
    '<div class="small muted" style="margin-top:6px">La calificación del periodo es el promedio ponderado de los criterios capturados, llevado a la escala y redondeado. La calificación final es el promedio de los periodos con calificación.</div></div>';
  h += '<div class="card"><h3>Descripción de cada nivel (boleta)</h3><div class="small muted" style="margin:0 0 8px">Texto breve que ven los papás en la boleta. Las de inglés ya vienen redactadas; <b>las de computación son un borrador: revísalas y cámbialas a tu gusto.</b> Si borras el texto, vuelve el original.</div>' +
    ['ingles', 'compu'].map(m => '<details style="margin-bottom:8px"><summary><b>' + MAT_NOMBRE[m] + '</b></summary><div class="stack" style="gap:8px;margin-top:8px">' + NIVS.map(n => '<label class="f">Nivel ' + n + ' · ' + esc(nomNivel(m, n)) + '<textarea rows="3" data-chg="descN|' + m + '|' + n + '">' + esc(descNivel(m, n)) + '</textarea></label>').join('') + '</div></details>').join('') + '</div>';
  h += '<div class="card"><h3>Horario semanal</h3><div class="scroll"><table><tr><th>Día</th><th>Hora</th><th>Grupo</th><th>Materia</th><th></th></tr>' + Object.values(S.horario).sort((a, b) => a.dia - b.dia || a.ini.localeCompare(b.ini)).map(x => '<tr><td>' + DIAS[x.dia] + '</td><td>' + hhmm(x.ini) + ' a ' + hhmm(x.fin) + (x.extra ? ' + ' + x.extra : '') + '</td><td><b>' + gNombre(x.grupoId) + '</b></td><td>' + MAT_NOMBRE[x.materia] + '</td><td><button class="btn sm ghost danger" data-act="horDel|' + x.id + '">Quitar</button></td></tr>').join('') + '</table></div>' +
    '<h4>Agregar una clase al horario</h4><div class="row"><label class="f">Día<select id="hd">' + [1, 2, 3, 4, 5].map(d => '<option value="' + d + '">' + DIAS[d] + '</option>').join('') + '</select></label><label class="f">Inicio<input type="time" id="hi"></label><label class="f">Fin<input type="time" id="hf"></label><label class="f">Grupo<select id="hg">' + ordenGrupos().map(g => '<option value="' + g.id + '">' + gNombre(g.id) + '</option>').join('') + '</select></label><label class="f">Materia<select id="hm"><option value="ingles">Inglés</option><option value="compu">Computación</option></select></label><button class="btn pri" data-act="horAdd" style="align-self:flex-end">Agregar</button></div></div>';
  h += '<div class="card"><h3>Respaldo en hoja de cálculo</h3><p class="muted" style="margin:0 0 8px">Descarga un archivo .xlsx con grupos, alumnos, clases, bitácora, calificaciones, pagos y cambios. Se abre en Excel y en Google Sheets (súbelo a tu Drive). Contiene nombres y calificaciones: guárdalo en un lugar privado.</p><button class="btn pri" data-act="respaldo">Descargar respaldo (.xlsx)</button></div>';
  const lastS = SYNC.last();
  h += '<div class="card"><h3>Sincronización entre celular y laptop</h3><p class="muted" style="margin:0 0 10px">La libreta guarda todo en este equipo y funciona sin internet. Para que tu celular y tu laptop vean lo mismo, pega aquí el enlace de tu script de Google (termina en /exec) y la clave que pusiste en él. Hazlo en los dos equipos.</p>' +
    '<div class="grid2"><label class="f">Enlace del script de Google<input id="syUrl" value="' + esc(SYNC.get('url')) + '" placeholder="https://script.google.com/macros/s/…/exec"></label><label class="f">Clave<input id="syKey" value="' + esc(SYNC.get('key')) + '" placeholder="La misma que en el script"></label></div>' +
    '<div class="row" style="margin-top:10px"><button class="btn pri" data-act="syGuardar">Guardar y sincronizar</button>' + (SYNC.on() ? '<button class="btn" data-act="syAhora">Sincronizar ahora</button><button class="btn ghost danger" data-act="syQuitar">Desconectar</button>' : '') + '</div>' +
    '<div class="small muted" style="margin-top:8px">' + (SYNC.on() ? (lastS ? 'Última sincronización: ' + new Date(lastS).toLocaleString('es-MX') + '.' : 'Aún no se ha sincronizado.') + (SYNC.err() && SYNC.err() !== 'offline' ? ' <span style="color:var(--bad)">Error: ' + esc(SYNC.err()) + '</span>' : '') : 'Sin sincronización: los datos viven solo en este equipo. Haz respaldos seguido.') + '</div></div>';
  h += '<div class="card"><h3>Copia completa de la libreta</h3><p class="muted" style="margin:0 0 8px">Un archivo .json con todo (para pasar tus datos a otro equipo sin internet o restaurarlos). Contiene nombres y calificaciones.</p><div class="row"><button class="btn" data-act="copiaBajar">Descargar copia (.json)</button><label class="btn" style="display:inline-flex;align-items:center">Restaurar desde copia<input type="file" accept=".json" data-chg="copiaSubir" hidden></label></div></div>';
  h += '<div class="card flat"><h3>Componentes de la app</h3><p class="muted" style="margin:0 0 8px">Excel y PDF necesitan la carpeta <b>lib</b> publicada junto a la app. Si no se generan boletas o no se lee el Excel, toca Revisar.</p><button class="btn" data-act="libProbar">Revisar</button> <span id="libEstado" class="small"></span></div>';
  h += '<div class="card flat"><h3>Privacidad</h3><p class="muted" style="margin:0">Los datos de tus alumnos se guardan en este equipo y, si activas la sincronización, en tu propia hoja de Google. No se publican en internet junto con la app.</p></div>';
  return h;
};
async function verApp() {
  try { const ks = (await caches.keys()).filter(k => k.indexOf('libreta-v') === 0).sort((a, b) => Number(a.slice(9)) - Number(b.slice(9))); return ks.length ? ks[ks.length - 1] : 'sin guardar'; } catch (e) { return 'desconocida'; }
}
ACT.actualizar = async () => {
  if (S.ui.upd) return; S.ui.upd = true; S.ui.updTxt = ''; render();
  const partes = [];
  try {
    if (!navigator.onLine) { partes.push('sin internet: tus cambios siguen guardados aquí y se enviarán al volver la conexión'); }
    else {
      if (SYNC.on()) {
        SYNC.set('since', '0'); let ok = false;
        for (let i = 0; i < 12; i++) { for (let w = 0; w < 40 && SYNC.busy(); w++) await new Promise(r => setTimeout(r, 250)); ok = await SYNC.run(false); if (!ok || !Object.keys(LDB.out()).length) break; }
        partes.push(ok ? 'datos al día' : 'no se pudo sincronizar (' + (SYNC.err() || 'error') + ')');
      } else partes.push('sincronización sin configurar');
      const reg = window.SWREG || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
      if (reg) {
        const antes = await verApp(); await reg.update().catch(() => { });
        const w = reg.installing || reg.waiting;
        if (w) { partes.push('instalando versión nueva'); S.ui.updTxt = partes.join(' · '); render(); await new Promise(r => { const t = setTimeout(r, 20000); w.addEventListener('statechange', () => { if (w.state === 'activated') { clearTimeout(t); r(); } }); if (w.state === 'activated') { clearTimeout(t); r(); } }); }
        else { const v = await verApp(); partes.push(v === antes ? 'app al día (' + v + ')' : 'app actualizada'); }
      }
    }
  } catch (e) { partes.push('error: ' + (e.message || e)); }
  S.ui.upd = false; S.ui.ver = await verApp(); S.ui.updTxt = partes.join(' · '); toast(partes.join(' · '), /no se pudo|error/.test(partes.join()) ? 'bad' : 'ok'); render();
};
/* ---------- firmas de la boleta (se guardan en este equipo, junto al plan) ---------- */
const firmaDe = q => { const f = S.plan && S.plan['firma:' + q]; return f && f.img ? f : null; };
function firmaBox(q, titulo) {
  const f = firmaDe(q);
  return '<div class="firmab"><div class="small" style="font-weight:600;margin-bottom:4px">' + titulo + '</div><div class="firmaprev">' + (f ? '<img src="' + f.img + '" alt="' + esc(titulo) + '">' : '<span class="small muted">Sin firma</span>') + '</div>' +
    '<div class="row" style="gap:6px;margin-top:6px"><label class="btn sm">' + (f ? 'Cambiar foto' : 'Subir foto') + '<input type="file" accept="image/*" hidden data-chg="firmaSube|' + q + '"></label>' + (f ? '<button class="btn sm quiet danger" data-act="firmaQuita|' + q + '">Quitar</button>' : '') + '</div></div>';
}
async function firmaProcesa(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('No se pudo leer la imagen. Prueba con una foto JPG o PNG.')); i.src = url; });
    const k0 = Math.min(1, 1100 / Math.max(im.naturalWidth, im.naturalHeight)), W = Math.max(1, Math.round(im.naturalWidth * k0)), H = Math.max(1, Math.round(im.naturalHeight * k0));
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d', { willReadFrequently: true }); cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H); cx.drawImage(im, 0, 0, W, H);
    const d = cx.getImageData(0, 0, W, H), p = d.data, lum = new Uint8Array(W * H), muestra = [];
    for (let i = 0, j = 0; j < W * H; i += 4, j++) { lum[j] = (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) | 0; if (j % 7 === 0) muestra.push(lum[j]); }
    muestra.sort((a, b) => a - b); const papel = Math.max(140, muestra[Math.floor(muestra.length * 0.85)]), alto = papel * 0.86, bajo = papel * 0.5;
    let x0 = W, y0 = H, x1 = -1, y1 = -1, sr = 0, sg = 0, sb = 0, sw = 0;
    const T = new Float32Array(W * H);
    for (let j = 0; j < W * H; j++) { const t = Math.max(0, Math.min(1, (alto - lum[j]) / (alto - bajo))); T[j] = t < 0.04 ? 0 : t; if (t > 0.6) { const i = j * 4; sr += p[i] * t; sg += p[i + 1] * t; sb += p[i + 2] * t; sw += t; } }
    // color de la tinta: el promedio de lo más oscuro del trazo (azul sigue azul, negro sigue negro)
    let cr = sw ? sr / sw : 20, cg = sw ? sg / sw : 20, cb = sw ? sb / sw : 20; const mn = (cr + cg + cb) / 3;
    if (Math.max(cr, cg, cb) - Math.min(cr, cg, cb) > 22) { cr = mn + (cr - mn) * 1.3; cg = mn + (cg - mn) * 1.3; cb = mn + (cb - mn) * 1.3; const lm = cr * 0.3 + cg * 0.59 + cb * 0.11, k = lm > 95 ? 95 / lm : 1; cr *= k; cg *= k; cb *= k; }
    else { const k = mn > 45 ? 45 / mn : 1; cr *= k; cg *= k; cb *= k; }
    cr = Math.max(0, Math.min(255, Math.round(cr))); cg = Math.max(0, Math.min(255, Math.round(cg))); cb = Math.max(0, Math.min(255, Math.round(cb)));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const j = y * W + x, i = j * 4, t = T[j];
      if (!t) { p[i + 3] = 0; continue; }
      p[i] = cr; p[i + 1] = cg; p[i + 2] = cb; p[i + 3] = Math.round(255 * t);
      if (t > 0.25) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0 || (x1 - x0) < 20 || (y1 - y0) < 8) throw new Error('No encontré la firma en la foto. Usa pluma oscura sobre hoja blanca.');
    cx.putImageData(d, 0, 0); const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
    const cw = x1 - x0 + 1, chh = y1 - y0 + 1, k = Math.min(1, 520 / cw), ow = Math.max(1, Math.round(cw * k)), oh = Math.max(1, Math.round(chh * k));
    const o = document.createElement('canvas'); o.width = ow; o.height = oh; o.getContext('2d').drawImage(cv, x0, y0, cw, chh, 0, 0, ow, oh);
    return { img: o.toDataURL('image/png'), w: ow, h: oh, ts: Date.now() };
  } finally { URL.revokeObjectURL(url); }
}
CHG.firmaSube = async (el, q) => {
  const f = el.files && el.files[0]; if (!f) return;
  try { const r = await firmaProcesa(f); S.plan['firma:' + q] = r; await PLAN.apply({ ['firma:' + q]: r }, []); toast('Firma guardada ✓', 'ok'); }
  catch (e) { toast(e.message || 'No se pudo guardar la firma', 'bad'); }
  render();
};
ACT.firmaQuita = async (el, q) => { delete S.plan['firma:' + q]; await PLAN.apply({}, ['firma:' + q]); render(); };
CHG.cfg = (el, k) => { cfgSet(c => { c[k] = el.value.trim(); }); render(); };
CHG.cfgNum = (el, k) => { const v = parseNota(el.value); if (v === undefined || v < 0) { toast('Número no válido', 'bad'); render(); return; } cfgSet(c => { c[k] = v === '' ? 0 : v; }); render(); };
CHG.crit = (el, m, i, k) => {
  cfgSet(c => {
    c.crit = c.crit || {};
    if (!Array.isArray(c.crit[m]) || !c.crit[m].length) c.crit[m] = cl(critDe(m));
    const o = c.crit[m][Number(i)]; if (!o) return;
    if (k === 'peso') { const v = parseNota(el.value); if (!(v === undefined || v === '' || v < 0)) o.peso = v; } else o.nombre = el.value.trim() || o.nombre;
  });
  render(); markMetricas();
};
CHG.descN = (el, m, n) => { cfgSet(c => { c.descNivel = c.descNivel || {}; c.descNivel[m] = c.descNivel[m] || {}; const t = el.value.trim(); if (t) c.descNivel[m][n] = t; else delete c.descNivel[m][n]; }); render(); };
CHG.escN = (el, k) => { const v = parseNota(el.value); if (v === undefined || v === '') { render(); return; } cfgSet(c => { c.esc[k] = v; }); render(); };
ACT.horDel = (el, id) => ask('¿Quitar esta clase del horario?', () => { del('horario', id); render(); }, 'Quitar');
ACT.horAdd = () => {
  const d = Number($('#hd').value), ini = $('#hi').value, fin = $('#hf').value, gid = $('#hg').value, mat = $('#hm').value;
  if (!ini || !fin) { toast('Escribe la hora de inicio y de fin', 'bad'); return; }
  const id = 'd' + d + '_' + ini.replace(':', '') + '_' + gid;
  save('horario', id, { id, dia: d, ini, fin, grupoId: gid, materia: mat, extra: '' }); render();
};

/* ---------- Respaldo xlsx ---------- */
ACT.respaldo = async () => {
  if (!(await asegurarXLSX())) { toast('No se encontró el lector de Excel. En GitHub falta la carpeta lib (lib/xlsx.full.min.js).', 'bad'); return; }
  const wb = XLSX.utils.book_new(), add = (n, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ vacio: '' }]), n);
  add('Grupos', ordenGrupos().map(g => ({ Grupo: g.id, Grado: g.grado, Letra: g.letra, Maestro_titular: g.maestro || '', Nivel_ingles: g.nivel, Nivel_computacion: nivelDe(g.id, 'compu'), Materias: matsDe(g.id).map(m => MAT_NOMBRE[m]).join(' y '), Clase_ingles: posicion(g.id, 'ingles') + 1, Clase_computacion: matsDe(g.id).indexOf('compu') >= 0 ? posicion(g.id, 'compu') + 1 : '', Ajuste_ingles: (g.ajuste && g.ajuste.ingles) || 0, Ajuste_computacion: (g.ajuste && g.ajuste.compu) || 0 })));
  add('Alumnos', Object.values(S.alumnos).sort((a, b) => a.grupoId.localeCompare(b.grupoId) || a.num - b.num).map(a => ({ Grupo: a.grupoId, Num: a.num, Nombre: a.nombre, Paga: a.paga === false ? 'no' : 'sí', Id: a.id })));
  const cal = [];
  Object.values(S.calificaciones).forEach(d => {
    const a = S.alumnos[d.alumnoId]; [1, 2, 3].forEach(p => {
      const x = d.p && d.p[p]; if (!x) return;
      const o = { Grupo: d.grupoId, Num: a ? a.num : '', Alumno: a ? a.nombre : d.alumnoId, Materia: MAT_NOMBRE[d.materia] || d.materia, Periodo: S.cfg.periodos[p - 1] };
      critDe(d.materia).forEach(c => { o[c.nombre + ' (' + c.peso + '%)'] = num(x[c.id]) ? x[c.id] : ''; });
      o['Calificación del periodo'] = notaPeriodo(d, p) == null ? '' : notaPeriodo(d, p); o['Observación'] = x.obs || ''; cal.push(o);
    });
  });
  add('Calificaciones', cal.sort((a, b) => a.Grupo.localeCompare(b.Grupo) || a.Num - b.Num));
  add('Clases', Object.values(S.clases).sort(cmpClase).map(c => ({ Fecha: c.fecha, Hora: c.ini || '', Grupo: c.grupoId, Materia: MAT_NOMBRE[c.materia], Estado: ESTADO_TXT[c.estado] || c.estado, Grupo_real: c.grupoReal || '', Motivo: c.motivo || '', Clase_del_plan: num(c.claseN) ? c.claseN : '', Tipo: c.tipo === 'eval' ? 'evaluación' : '', Ninos_que_pagan: esDada(c) ? (c.pagan != null ? c.pagan : pagan(gEf(c))) : '', Monto: esDada(c) ? tarifaDe(c) : '' })));
  add('Bitacora', Object.values(S.bitacora).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(b => ({ Fecha: b.fecha, Grupo: b.grupoId, Materia: MAT_NOMBRE[b.materia], Animo: b.animo || '', Participacion: b.part || '', Plan: b.plan || '', Repetir: b.repetir ? 'sí' : '', Etiquetas: (b.tags || []).join(', '), Nota: b.nota || '' })));
  add('Pagos', Object.values(S.pagos).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(p => ({ Fecha: p.fecha, Maestro: p.maestro, Monto: p.monto, Nota: p.nota || '' })));
  add('Cambios', Object.values(S.cambios).map(c => ({ Fecha: c.fecha, Tipo: c.tipo, Grupo: c.grupoId || '', Titulo: c.titulo, Detalle: c.detalle || '', Estado: c.estado })));
  add('Horario', Object.values(S.horario).sort((a, b) => a.dia - b.dia || a.ini.localeCompare(b.ini)).map(x => ({ Dia: DIAS[x.dia], Inicio: x.ini, Fin: x.fin, Grupo: x.grupoId, Materia: MAT_NOMBRE[x.materia] })));
  descargar('respaldo-libreta-' + hoy() + '.xlsx', XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
};

ACT.syGuardar = () => {
  const u = $('#syUrl').value.trim(), k = $('#syKey').value.trim();
  if (u && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) { toast('El enlace debe ser el de tu script de Google y terminar en /exec', 'bad'); return; }
  SYNC.set('url', u); SYNC.set('key', k); SYNC.set('since', '0');
  if (u) { Object.keys(LDB.exportAll()).forEach(p => { const r = LDB.mem.get(p); if (r && r.u > 1) LDB.out()[p] = r.u; }); SYNC.run(true).then(() => render()); } else render();
};
ACT.syAhora = () => { SYNC.run(true).then(() => render()); };
ACT.syQuitar = () => ask('¿Desconectar la sincronización en este equipo? Tus datos se quedan aquí.', () => { SYNC.set('url', ''); render(); updSync(); }, 'Desconectar');
ACT.copiaBajar = () => descargar('libreta-copia-' + hoy() + '.json', JSON.stringify({ libreta: 1, fecha: new Date().toISOString(), docs: LDB.exportAll() }));
CHG.copiaSubir = async el => {
  const f = el.files && el.files[0]; if (!f) return;
  try { const o = JSON.parse(await f.text()); if (!o.docs) throw new Error('no es una copia de la libreta'); const n = Object.keys(o.docs).length;
    ask('¿Restaurar ' + n + ' registros de la copia del ' + esc(String(o.fecha || '').slice(0, 10)) + '? Lo que esté en la copia reemplaza lo que hay en este equipo.', () => { LDB.importAll(o.docs); toast('Copia restaurada', 'ok'); }, 'Restaurar');
  } catch (e) { toast('No pude leer la copia: ' + e.message, 'bad'); }
  el.value = '';
};

ACT.libProbar = async () => {
  const el = $('#libEstado'); if (el) el.textContent = 'Revisando…';
  const r = await estadoLibs();
  if (el) el.innerHTML = Object.keys(r).map(k => (r[k] ? '✓ ' : '✗ falta ') + k).join(' · ') + (Object.values(r).every(Boolean) ? ' · todo en orden' : ' · sube la carpeta lib a GitHub');
};
