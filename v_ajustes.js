'use strict';
/* Ajustes, horario y respaldo en hoja de cálculo */

function cfgSet(fn) { const c = cl(S.cfg); fn(c); save('config', 'main', c, 500); }
VIEWS.ajustes = function () {
  const c = S.cfg, peso = c.criterios.reduce((s, x) => s + x.peso, 0);
  let h = '<h2 style="margin-bottom:10px">Ajustes</h2>';
  h += '<div class="card"><h3>Escuela y boleta</h3><div class="grid2"><label class="f">Escuela<input value="' + esc(c.escuela) + '" data-chg="cfg|escuela"></label><label class="f">Ciclo escolar<input value="' + esc(c.ciclo) + '" data-chg="cfg|ciclo"></label><label class="f">Tu nombre (aparece en la boleta)<input value="' + esc(c.maestro) + '" data-chg="cfg|maestro"></label><label class="f">Director(a)<input value="' + esc(c.director) + '" data-chg="cfg|director"></label></div></div>';
  h += '<div class="card"><h3>Cobro</h3><label class="f" style="max-width:260px">Monto por niño en cada clase<input inputmode="decimal" value="' + (c.tarifa || '') + '" placeholder="0" data-chg="cfgNum|tarifa"></label><div class="small muted" style="margin-top:6px">Cada clase se cobra por el número de niños que pagan en el grupo (monto × niños). Los niños sin cobro, como hermanos gemelos, se desmarcan en Grupos con la casilla “¿Paga?”. Cada clase guarda el monto y el número de niños al impartirla, así que cambiarlos después no altera lo ya cobrado.</div></div>';
  h += '<div class="card"><h3>Evaluación</h3><div class="stack" style="gap:8px">' + c.criterios.map((k, i) => '<div class="row"><input class="grow" value="' + esc(k.nombre) + '" data-chg="crit|' + i + '|nombre"><input style="width:80px" inputmode="numeric" value="' + k.peso + '" data-chg="crit|' + i + '|peso"><span class="muted">%</span></div>').join('') + '</div>' +
    '<div class="small" style="margin-top:6px;color:var(' + (peso === 100 ? '--ok' : '--bad') + ')">Suma: ' + peso + '% ' + (peso === 100 ? '✓' : '(debería sumar 100)') + '</div>' +
    '<div class="row" style="margin-top:10px"><label class="f">Redondeo<select data-chg="cfg|redondeo"><option value="entero"' + (c.redondeo === 'entero' ? ' selected' : '') + '>Número entero (8, 9, 10)</option><option value="decimal"' + (c.redondeo === 'decimal' ? ' selected' : '') + '>Un decimal (8.5)</option></select></label>' +
    '<label class="f">Mínimo<input style="width:70px" inputmode="numeric" value="' + c.esc.min + '" data-chg="escN|min"></label><label class="f">Máximo<input style="width:70px" inputmode="numeric" value="' + c.esc.max + '" data-chg="escN|max"></label><label class="f">Aprobatorio<input style="width:70px" inputmode="numeric" value="' + c.esc.aprob + '" data-chg="escN|aprob"></label></div>' +
    '<div class="small muted" style="margin-top:6px">La calificación del periodo es el promedio ponderado de los criterios capturados, llevado a la escala y redondeado. La calificación final es el promedio de los periodos con calificación.</div></div>';
  h += '<div class="card"><h3>Horario semanal</h3><div class="scroll"><table><tr><th>Día</th><th>Hora</th><th>Grupo</th><th>Materia</th><th></th></tr>' + Object.values(S.horario).sort((a, b) => a.dia - b.dia || a.ini.localeCompare(b.ini)).map(x => '<tr><td>' + DIAS[x.dia] + '</td><td>' + hhmm(x.ini) + ' a ' + hhmm(x.fin) + (x.extra ? ' + ' + x.extra : '') + '</td><td><b>' + gNombre(x.grupoId) + '</b></td><td>' + MAT_NOMBRE[x.materia] + '</td><td><button class="btn sm ghost danger" data-act="horDel|' + x.id + '">Quitar</button></td></tr>').join('') + '</table></div>' +
    '<h4>Agregar una clase al horario</h4><div class="row"><label class="f">Día<select id="hd">' + [1, 2, 3, 4, 5].map(d => '<option value="' + d + '">' + DIAS[d] + '</option>').join('') + '</select></label><label class="f">Inicio<input type="time" id="hi"></label><label class="f">Fin<input type="time" id="hf"></label><label class="f">Grupo<select id="hg">' + ordenGrupos().map(g => '<option value="' + g.id + '">' + gNombre(g.id) + '</option>').join('') + '</select></label><label class="f">Materia<select id="hm"><option value="ingles">Inglés</option><option value="compu">Computación</option></select></label><button class="btn pri" data-act="horAdd" style="align-self:flex-end">Agregar</button></div></div>';
  h += '<div class="card"><h3>Respaldo en hoja de cálculo</h3><p class="muted" style="margin:0 0 8px">Descarga un archivo .xlsx con grupos, alumnos, clases, bitácora, calificaciones, pagos y cambios. Se abre en Excel y en Google Sheets (súbelo a tu Drive). Contiene nombres y calificaciones: guárdalo en un lugar privado.</p><button class="btn pri" data-act="respaldo">Descargar respaldo (.xlsx)</button></div>';
  const lastS = SYNC.last();
  h += '<div class="card"><h3>Sincronización entre celular y laptop</h3><p class="muted" style="margin:0 0 10px">La libreta guarda todo en este equipo y funciona sin internet. Para que tu celular y tu laptop vean lo mismo, pega aquí el enlace de tu script de Google (termina en /exec) y la clave que pusiste en él. Hazlo en los dos equipos.</p>' +
    '<div class="grid2"><label class="f">Enlace del script de Google<input id="syUrl" value="' + esc(SYNC.get('url')) + '" placeholder="https://script.google.com/macros/s/…/exec"></label><label class="f">Clave<input id="syKey" value="' + esc(SYNC.get('key')) + '" placeholder="La misma que en el script"></label></div>' +
    '<div class="row" style="margin-top:10px"><button class="btn pri" data-act="syGuardar">Guardar y sincronizar</button>' + (SYNC.on() ? '<button class="btn" data-act="syAhora">Sincronizar ahora</button><button class="btn ghost danger" data-act="syQuitar">Desconectar</button>' : '') + '</div>' +
    '<div class="small muted" style="margin-top:8px">' + (SYNC.on() ? (lastS ? 'Última sincronización: ' + new Date(lastS).toLocaleString('es-MX') + '.' : 'Aún no se ha sincronizado.') + (SYNC.err() && SYNC.err() !== 'offline' ? ' <span style="color:var(--bad)">Error: ' + esc(SYNC.err()) + '</span>' : '') : 'Sin sincronización: los datos viven solo en este equipo. Haz respaldos seguido.') + '</div></div>';
  h += '<div class="card"><h3>Copia completa de la libreta</h3><p class="muted" style="margin:0 0 8px">Un archivo .json con todo (para pasar tus datos a otro equipo sin internet o restaurarlos). Contiene nombres y calificaciones.</p><div class="row"><button class="btn" data-act="copiaBajar">Descargar copia (.json)</button><label class="btn" style="display:inline-flex;align-items:center">Restaurar desde copia<input type="file" accept=".json" data-chg="copiaSubir" hidden></label></div></div>';
  h += '<div class="card flat"><h3>Privacidad</h3><p class="muted" style="margin:0">Los datos de tus alumnos se guardan en este equipo y, si activas la sincronización, en tu propia hoja de Google. No se publican en internet junto con la app.</p></div>';
  return h;
};
CHG.cfg = (el, k) => { cfgSet(c => { c[k] = el.value.trim(); }); render(); };
CHG.cfgNum = (el, k) => { const v = parseNota(el.value); if (v === undefined || v < 0) { toast('Número no válido', 'bad'); render(); return; } cfgSet(c => { c[k] = v === '' ? 0 : v; }); render(); };
CHG.crit = (el, i, k) => {
  cfgSet(c => { if (k === 'peso') { const v = parseNota(el.value); c.criterios[i].peso = (v === undefined || v === '' || v < 0) ? c.criterios[i].peso : v; } else c.criterios[i].nombre = el.value.trim() || c.criterios[i].nombre; });
  render(); markMetricas();
};
CHG.escN = (el, k) => { const v = parseNota(el.value); if (v === undefined || v === '') { render(); return; } cfgSet(c => { c.esc[k] = v; }); render(); };
ACT.horDel = (el, id) => ask('¿Quitar esta clase del horario?', () => { del('horario', id); render(); }, 'Quitar');
ACT.horAdd = () => {
  const d = Number($('#hd').value), ini = $('#hi').value, fin = $('#hf').value, gid = $('#hg').value, mat = $('#hm').value;
  if (!ini || !fin) { toast('Escribe la hora de inicio y de fin', 'bad'); return; }
  const id = 'd' + d + '_' + ini.replace(':', '') + '_' + gid;
  save('horario', id, { id, dia: d, ini, fin, grupoId: gid, materia: mat, extra: '' }); render();
};

/* ---------- Respaldo xlsx ---------- */
ACT.respaldo = () => {
  if (typeof XLSX === 'undefined') { toast('No cargó el lector de Excel; revisa tu internet', 'bad'); return; }
  const wb = XLSX.utils.book_new(), add = (n, rows) => XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ vacio: '' }]), n);
  add('Grupos', ordenGrupos().map(g => ({ Grupo: g.id, Grado: g.grado, Letra: g.letra, Maestro_titular: g.maestro || '', Nivel_ingles: g.nivel, Meta_nivel: g.nivelMeta || '', Materias: matsDe(g.id).map(m => MAT_NOMBRE[m]).join(' y '), Ajuste_sesion: (g.ajuste && g.ajuste.ingles) || 0, Sesion_actual: posicion(g.id) })));
  add('Alumnos', Object.values(S.alumnos).sort((a, b) => a.grupoId.localeCompare(b.grupoId) || a.num - b.num).map(a => ({ Grupo: a.grupoId, Num: a.num, Nombre: a.nombre, Paga: a.paga === false ? 'no' : 'sí', Id: a.id })));
  const cal = [];
  Object.values(S.calificaciones).forEach(d => {
    const a = S.alumnos[d.alumnoId]; [1, 2, 3].forEach(p => {
      const x = d.p && d.p[p]; if (!x) return;
      const o = { Grupo: d.grupoId, Num: a ? a.num : '', Alumno: a ? a.nombre : d.alumnoId, Materia: MAT_NOMBRE[d.materia] || d.materia, Periodo: S.cfg.periodos[p - 1] };
      S.cfg.criterios.forEach(c => { o[c.nombre + ' (' + c.peso + '%)'] = num(x[c.id]) ? x[c.id] : ''; });
      o['Calificación del periodo'] = notaPeriodo(d, p) == null ? '' : notaPeriodo(d, p); o['Observación'] = x.obs || ''; cal.push(o);
    });
  });
  add('Calificaciones', cal.sort((a, b) => a.Grupo.localeCompare(b.Grupo) || a.Num - b.Num));
  add('Clases', Object.values(S.clases).sort(cmpClase).map(c => ({ Fecha: c.fecha, Hora: c.ini || '', Grupo: c.grupoId, Materia: MAT_NOMBRE[c.materia], Estado: ESTADO_TXT[c.estado] || c.estado, Grupo_real: c.grupoReal || '', Motivo: c.motivo || '', Sesion: num(c.sesion) ? c.sesion : '', Ninos_que_pagan: esDada(c) ? (c.pagan != null ? c.pagan : pagan(gEf(c))) : '', Monto: esDada(c) ? tarifaDe(c) : '' })));
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
