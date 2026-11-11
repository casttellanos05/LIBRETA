'use strict';
/* Hoy / Mañana (preparación), clases, bitácora y vista semana/mes */

const ESTADO_TXT = { impartida: 'Completada', cancelada: 'Cancelada', cambiada: 'Cambiada de grupo', pendiente: 'Por registrar' };
const ESTADO_CLS = { impartida: 'ok', cancelada: 'bad', cambiada: 'warn', pendiente: 'acc' };
const gNombre = id => (S.grupos[id] ? S.grupos[id].grado + '.º ' + S.grupos[id].letra : id);

function bitacoraHTML(c) {
  const gid = gEf(c), id = c.fecha + '_' + gid + '_' + c.materia, b = S.bitacora[id] || {};
  const sc = (campo, vals, labels) => '<div class="scale">' + vals.map((v, i) => '<button data-act="bit|' + id + '|' + campo + '|' + v + '" class="' + (b[campo] === v ? 'on' : '') + '" title="' + (labels ? labels[i] : v) + '">' + (labels ? labels[i] : v) + '</button>').join('') + '</div>';
  const tags = b.tags || [];
  return '<details open><summary>Bitácora de ' + gNombre(gid) + (b.ts ? ' · guardada' : '') + '</summary><div class="stack" style="margin-top:8px;gap:10px">' +
    '<div><div class="small muted">Ánimo del grupo</div>' + sc('animo', [1, 2, 3, 4, 5], ANIMOS) + '</div>' +
    '<div><div class="small muted">Participación (1 poca, 5 mucha)</div>' + sc('part', [1, 2, 3, 4, 5]) + '</div>' +
    '<div><div class="small muted">¿Se cumplió el plan?</div><div class="chips">' + [['si', 'Sí'], ['parcial', 'A medias'], ['no', 'No']].map(o => '<button class="chip ' + (b.plan === o[0] ? 'on' : '') + '" data-act="bit|' + id + '|plan|' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>' +
    ('<div><div class="small muted">La próxima clase de este grupo…</div><div class="chips"><button class="chip ' + (!b.repetir ? 'on' : '') + '" data-act="bitrep|' + id + '|0">Avanzar a la siguiente clase</button><button class="chip ' + (b.repetir ? 'on' : '') + '" data-act="bitrep|' + id + '|1">Repetir esta clase</button></div></div>') +
    '<div><div class="small muted">¿Qué pasó? (toca los que apliquen)</div><div class="chips">' + TAGS_BIT.map((t, i) => '<button class="chip ' + (tags.indexOf(t) >= 0 ? 'on' : '') + '" data-act="bittag|' + id + '|' + i + '">' + esc(t) + '</button>').join('') + '</div></div>' +
    '<div><div class="small muted">Nota corta (qué funcionó, qué cambiarías)</div><textarea data-inp="bitnota|' + id + '" placeholder="Ej.: el juego de memoria funcionó, faltó tiempo para la tarea…">' + esc(b.nota || '') + '</textarea></div>' +
    '</div></details>';
}
function bitBase(id, c) {
  const [fecha, gid, mat] = id.split('_');
  return cl(S.bitacora[id]) || { id, fecha, grupoId: gid, materia: mat, sesion: mat === 'ingles' ? null : null };
}
ACT.bit = (el, id, campo, val) => {
  const b = bitBase(id); b[campo] = (campo === 'plan') ? (b.plan === val ? null : val) : (b[campo] === Number(val) ? null : Number(val));
  b.ts = Date.now(); save('bitacora', id, b); markMetricas(); render();
};
ACT.bitrep = (el, id, v) => { const b = bitBase(id); b.repetir = v === '1'; b.ts = Date.now(); save('bitacora', id, b); render(); };
ACT.bittag = (el, id, i) => {
  const b = bitBase(id), t = TAGS_BIT[Number(i)]; b.tags = b.tags || [];
  const k = b.tags.indexOf(t); if (k >= 0) b.tags.splice(k, 1); else b.tags.push(t);
  b.ts = Date.now(); save('bitacora', id, b); markMetricas(); render();
};
INP.bitnota = (el, id) => { const b = bitBase(id); b.nota = el.value; b.ts = Date.now(); save('bitacora', id, b, 800); };


function diaFormHTML(f) {
  const pend = clasesDelDia(f).filter(c => c.estado === 'pendiente' && String(c.slotId).indexOf('x') !== 0).length;
  return '<div class="card note warn"><div class="row"><label class="f">Motivo<select id="dmot"><option value="escuela">La escuela canceló (no se cobra)</option><option value="maestro">Yo cancelé</option><option value="otro">Otro</option></select></label><label class="row small"><input type="checkbox" id="drep"> Reponer las clases</label></div><div class="row" style="margin-top:8px"><button class="btn danger" data-act="diaOk">Cancelar las ' + pend + ' clases del ' + fmtLargo(f).toLowerCase() + '</button><button class="btn ghost" data-act="diaX">Volver</button></div></div>';
}
function extraFormHTML() {
  return '<div class="card"><div class="row"><label class="f">Grupo<select id="xg">' + ordenGrupos().map(g => '<option value="' + g.id + '">' + gNombre(g.id) + '</option>').join('') + '</select></label><label class="f">Materia<select id="xm"><option value="ingles">Inglés</option><option value="compu">Computación</option></select></label><label class="f">Hora (opcional)<input type="time" id="xi"></label><button class="btn pri" data-act="extraOk" style="align-self:flex-end">Agregar</button><button class="btn ghost" data-act="extraForm" style="align-self:flex-end">Cerrar</button></div></div>';
}

function claseCard(c, f) {
  const gid = gEf(c), esFut = f > hoy(), e = c.estado, g = S.grupos[c.grupoId], mov = e === 'cancelada' && c.motivo === 'cambio';
  const nivel = (S.grupos[gid] && S.grupos[gid].nivel) || 1, ing = c.materia === 'ingles';
  const hora = c.ini ? '<div class="hora">' + hhmm(c.ini) + '<small>' + hhmm(c.fin) + (c.extra ? ' + ' + c.extra : '') + '</small></div>' : '<div class="hora">Extra<small>' + (c.cambio ? 'cambio' : c.repone ? 'reposición' : '') + '</small></div>';
  let plan = '';
  {
    const mat = c.materia, dado = esDada(c);
    if (dado && c.tipo === 'eval') {
      plan = '<div style="margin-top:8px">Se dio: <b>Clase de evaluación · ' + esc(S.cfg.periodos[(c.periodo || 1) - 1]) + '</b></div>' + '<div style="margin-top:6px"><button class="btn sm" data-act="irNotas|' + gid + '|' + mat + '|' + (c.periodo || 1) + '">Capturar calificaciones →</button></div>';
    } else {
      let si = sigClase(gid, mat);
      if (dado && c.claseN) { const nv = c.nivel || si.nivel; si = Object.assign({}, si, { ev: null, nivel: nv, n: c.claseN, doc: claseN(mat, nv, c.claseN), fin: false }); }
      const bl = !si.ev && !si.fin ? bloqueDe(mat, si.nivel, si.n) : null;
      plan = '<div style="margin-top:8px">' + (dado ? 'Se dio: ' : '<span class="muted">Toca:</span> ') + '<b>' + esc(tituloSig(si)) + '</b> <span class="badge acc">Nivel ' + si.nivel + ' · ' + esc(nomNivel(mat, si.nivel)) + '</span>' + (si.doc && si.doc.borrador ? ' <span class="badge warn">borrador</span>' : '') + (si.ev ? ' <span class="badge warn">evaluación</span>' : '') + '</div>' +
        (bl ? '<div class="small muted">Bloque ' + bl.i + ' de ' + bl.de + ': ' + esc(bl.tema) + (si.doc && si.doc.fase ? ' · ' + esc(si.doc.fase) : '') + '</div>' : '') +
        ((e === 'pendiente' || dado) ? '<details><summary>Ver la clase completa</summary>' + planHTML(gid, mat, si) + '</details>' : '');
    }
  }
  let acc = '';
  if (e === 'pendiente') {
    if (S.ui.cancel === c.key) {
      acc = '<div class="note warn" style="margin-top:10px"><div class="row"><label class="f">Motivo<select id="mot">' +
        '<option value="escuela">La escuela canceló (no se cobra)</option><option value="maestro">Yo la cancelé</option><option value="otro">Otro motivo</option></select></label>' +
        '<label class="row small"><input type="checkbox" id="rep"> Hay que reponerla</label></div><div class="row" style="margin-top:8px"><button class="btn danger" data-act="cancelok|' + c.key + '">Cancelar esta clase</button><button class="btn ghost" data-act="cancelx">Volver</button></div></div>';
    } else if (S.ui.mover === c.key) {
      const mOpts = ['ingles', 'compu'].map(m => '<option value="' + m + '"' + (m === c.materia ? ' selected' : '') + '>' + MAT_NOMBRE[m] + '</option>').join('');
      const orig = c.intercambio || { grupoId: c.grupoId, materia: c.materia };
      acc = '<div class="note warn" style="margin-top:10px"><b>Cambiar esta clase por otra</b><div class="small muted" style="margin:2px 0 8px">La clase nueva toma este mismo lugar del horario (' + DIAS[dow(c.fecha)] + ' ' + hhmm(c.ini) + ') solo en esta semana. Se cobra hasta que la des por dada.' + (c.intercambio ? ' Ahora está: ' + gNombre(c.grupoId) + ' ' + MAT_NOMBRE[c.materia] + ' (antes: ' + gNombre(orig.grupoId) + ' ' + MAT_NOMBRE[orig.materia] + ').' : '') + '</div>' +
        '<div class="row"><label class="f">Cambiar por…<select id="mm" data-chg="movMat">' + mOpts + '</select></label><label class="f">Grupo<select id="mg">' + movGrupoOpts(c.materia, c) + '</select></label></div>' +
        (c.intercambio ? '' : '<label class="row small" style="margin-top:8px"><input type="checkbox" id="mrep" checked> Hay que reponerle su clase a ' + gNombre(c.grupoId) + ' (' + MAT_NOMBRE[c.materia] + ')</label>') +
        '<div class="row" style="margin-top:8px"><button class="btn pri" data-act="intok|' + c.key + '">Confirmar cambio</button><button class="btn ghost" data-act="cancelx">Volver</button></div></div>';
    } else if (S.ui.swap === c.key && !esFut) {
      const opts = ordenGrupos().filter(x => x.id !== c.grupoId && (x.materias || ['ingles']).indexOf(c.materia) >= 0).map(x => '<option value="' + x.id + '">' + gNombre(x.id) + '</option>').join('');
      acc = '<div class="note warn" style="margin-top:10px"><div class="row"><label class="f">Se la di a<select id="gsw">' + opts + '</select></label>' +
        '<label class="row small"><input type="checkbox" id="rep" checked> Hay que reponerle su clase a ' + gNombre(c.grupoId) + '</label></div><div class="small muted" style="margin-top:4px">La clase cuenta para el grupo al que se la diste (avance y cobro).</div><div class="row" style="margin-top:8px"><button class="btn pri" data-act="cambiook|' + c.key + '">Confirmar cambio</button><button class="btn ghost" data-act="cancelx">Volver</button></div></div>';
    } else if (esFut) {
      acc = '<div class="row" style="margin-top:8px;gap:2px"><button class="btn sm quiet" data-act="cancelar|' + c.key + '">Cancelar clase</button>' + (String(c.slotId).indexOf('x') !== 0 ? '<button class="btn sm quiet" data-act="mover|' + c.key + '">Cambiar clase</button>' : '') + (c.intercambio ? '<button class="btn sm quiet" data-act="intDesh|' + c.key + '">Deshacer intercambio</button>' : '') + (String(c.slotId).indexOf('x') === 0 ? '<button class="btn sm quiet" data-act="deshacer|' + c.key + '">Quitar</button>' : '') + '</div>';
    } else {
      acc = '<div style="margin-top:12px"><button class="btn ok big" data-act="marcar|' + c.key + '">✓ Completado</button><div class="row" style="margin-top:6px;gap:2px"><button class="btn sm quiet" data-act="cancelar|' + c.key + '">Cancelar clase</button>' + (String(c.slotId).indexOf('x') !== 0 ? '<button class="btn sm quiet" data-act="mover|' + c.key + '">Cambiar clase</button>' : '') + (c.intercambio ? '<button class="btn sm quiet" data-act="intDesh|' + c.key + '">Deshacer intercambio</button>' : '') + '<button class="btn sm quiet" data-act="cambiar|' + c.key + '">Se la di a otro grupo</button>' + (evalActiva(gid, c.materia) ? '<button class="btn sm quiet" data-act="evalCancelar|' + gid + '|' + c.materia + '">Quitar examen</button>' : '<button class="btn sm quiet" data-act="evalIniciar|' + gid + '|' + c.materia + '|1">Aplicar examen</button>') + (String(c.slotId).indexOf('x') === 0 ? '<button class="btn sm quiet" data-act="deshacer|' + c.key + '">Quitar</button>' : '') + '</div></div>';
    }
  } else {
    const extra = mov ? ' · ' + (c.cambioA ? 'ahora: ' + gNombre(c.cambioA.grupoId) + ', ' + DIAS[dow(c.cambioA.fecha)].toLowerCase() + ' ' + pd(c.cambioA.fecha).getDate() + (c.cambioA.ini ? ' a las ' + hhmm(c.cambioA.ini) : '') : 'cambiada') : e === 'cancelada' ? ' · ' + ({ escuela: 'la escuela', maestro: 'yo', otro: 'otro motivo' }[c.motivo] || '') + (c.reponer && !c.repuesta ? ' · por reponer' : '') :
      e === 'cambiada' ? ' · se la di a ' + gNombre(c.grupoReal) : '';
    acc = '<div class="row" style="margin-top:10px"><span class="small muted">' + esc(extra.replace(/^ · /, '')) + '</span><button class="btn sm ghost" data-act="deshacer|' + c.key + '">Deshacer</button></div>';
  }
  const bit = (esDada(c) && !esFut) ? bitacoraHTML(c) : '';
  return '<div class="cls m-' + c.materia + ' e-' + e + (mov ? ' mov' : '') + '"><div class="row" style="gap:14px;align-items:flex-start">' + hora +
    '<div class="grow"><div class="row sp"><div><span class="gtitle">' + gNombre(c.grupoId) + '</span> <span class="badge b-' + c.materia + '">' + MAT_NOMBRE[c.materia] + '</span>' + (c.intercambio ? ' <span class="small muted">· intercambiada (antes: ' + gNombre(c.intercambio.grupoId) + ' ' + MAT_NOMBRE[c.intercambio.materia] + ')</span>' : '') + '</div><span class="badge ' + (mov ? 'warn' : ESTADO_CLS[e]) + '">' + (mov ? 'Clase cambiada' : e === 'pendiente' && f < hoy() ? 'Sin registrar' : ESTADO_TXT[e]) + '</span></div>' +
    ((e === 'pendiente' || esDada(c)) ? plan : '') + acc + '</div></div>' + bit + '</div>';
}

function claseBase(c) {
  const o = { fecha: c.fecha, slotId: c.slotId, grupoId: c.grupoId, materia: c.materia, ini: c.ini || '', fin: c.fin || '', extra: c.extra || '', repone: c.repone || null };
  if (c.intercambio) { o.intercambio = c.intercambio; o.repKey = c.repKey || null; }
  return o;
}
function recDeKey(key) { return clasesDelDia(S.fecha).find(x => x.key === key); }
function datosAvance(gid, mat) {
  const ev = evalActiva(gid, mat), si = sigClase(gid, mat);
  return ev ? { tipo: 'eval', periodo: ev.periodo, nivel: si.nivel, sesion: null, claseN: null } : { tipo: 'clase', nivel: si.nivel, claseN: si.n, sesion: si.pos };
}
function cierraEval(gid, mat) { const g = cl(S.grupos[gid]); if (g && g.evalFase && g.evalFase[mat]) { delete g.evalFase[mat]; save('grupos', gid, g); } }
ACT.marcar = (el, key) => {
  const c = recDeKey(key); if (!c) return;
  const av = datosAvance(c.grupoId, c.materia);
  const d = Object.assign(claseBase(c), av, { estado: 'impartida', tarifa: S.cfg.tarifa || 0, pagan: pagan(c.grupoId) || null, ts: Date.now() });
  save('clases', key, d);
  if (av.tipo === 'eval') { cierraEval(c.grupoId, c.materia); toast('Evaluación registrada. Captura las calificaciones en Evaluaciones.', 'ok'); }
  render();
};
ACT.irNotas = (el, gid, mat, per) => { S.ui.n = Object.assign(S.ui.n || {}, { g: gid, m: mat, p: Number(per) }); ir('notas'); };
ACT.evalIniciar = (el, gid, mat) => {
  const g = cl(S.grupos[gid]); g.evalFase = g.evalFase || {}; g.evalFase[mat] = { periodo: Number(S.ui.evalPer && S.ui.evalPer[gid + mat]) || periodoSug(gid, mat), desde: hoy() };
  save('grupos', gid, g); S.ui.evalForm = null; toast(gNombre(gid) + ': su siguiente clase de ' + MAT_NOMBRE[mat] + ' será de evaluación', 'ok'); render();
};
ACT.evalCancelar = (el, gid, mat) => { cierraEval(gid, mat); S.ui.evalForm = null; render(); };
ACT.evalForm = (el, gid, mat) => { S.ui.evalForm = (S.ui.evalForm === gid + '|' + mat) ? null : gid + '|' + mat; render(); };
CHG.evalPer = (el, gid, mat) => { S.ui.evalPer = S.ui.evalPer || {}; S.ui.evalPer[gid + mat] = el.value; };
ACT.cancelar = (el, key) => { S.ui.cancel = key; S.ui.swap = null; S.ui.mover = null; render(); };
ACT.cambiar = (el, key) => { S.ui.swap = key; S.ui.cancel = null; S.ui.mover = null; render(); };
ACT.mover = (el, key) => { S.ui.mover = key; S.ui.cancel = null; S.ui.swap = null; render(); };
ACT.cancelx = () => { S.ui.cancel = null; S.ui.swap = null; S.ui.mover = null; render(); };
/* Cambiar una clase por otra (materia y grupo): la nueva toma el mismo lugar del horario, solo en esa semana. */
function movGrupoOpts(mat, c) {
  return ordenGrupos().filter(x => matsDe(x.id).indexOf(mat) >= 0 && !(x.id === c.grupoId && mat === c.materia)).map(x => '<option value="' + x.id + '">' + gNombre(x.id) + '</option>').join('');
}
CHG.movMat = el => { const c = S.ui.mover && recDeKey(S.ui.mover); const g = $('#mg'); if (c && g) g.innerHTML = movGrupoOpts(el.value, c); };
ACT.intok = (el, key) => {
  const c = recDeKey(key); if (!c) return;
  const mat = $('#mm').value, gr = $('#mg').value;
  if (!gr) { toast('No hay otro grupo con esa materia', 'bad'); return; }
  const orig = c.intercambio || { grupoId: c.grupoId, materia: c.materia };
  let repKey = c.repKey || null;
  const chk = $('#mrep');
  if (!c.intercambio && chk && chk.checked) {
    const slotId = 'xo' + Date.now().toString(36); repKey = c.fecha + '_' + slotId;
    save('clases', repKey, { fecha: c.fecha, slotId, grupoId: c.grupoId, materia: c.materia, ini: '', fin: '', extra: '', estado: 'cancelada', motivo: 'otro', reponer: true, repuesta: false, oculta: true, ts: Date.now() });
  }
  save('clases', key, { fecha: c.fecha, slotId: c.slotId, grupoId: gr, materia: mat, ini: c.ini || '', fin: c.fin || '', extra: c.extra || '', estado: 'pendiente', intercambio: orig, repKey, ts: Date.now() });
  S.ui.mover = null; toast('Listo: ' + MAT_NOMBRE[mat] + ' con ' + gNombre(gr) + ' en este horario, solo esta semana.', 'ok'); render();
};
ACT.intDesh = (el, key) => {
  const r = S.clases[key]; if (!r) return;
  if (r.repKey && S.clases[r.repKey]) { if (S.clases[r.repKey].repuesta) { toast('Ya agendaste la reposición del otro grupo: quítala primero', 'bad'); return; } del('clases', r.repKey); }
  del('clases', key); toast('La clase regresó a como estaba en tu horario', 'ok'); render();
};
ACT.cancelok = (el, key) => {
  const c = recDeKey(key); if (!c) return;
  const d = Object.assign(claseBase(c), { estado: 'cancelada', motivo: $('#mot').value, reponer: $('#rep').checked, repuesta: false, ts: Date.now() });
  S.ui.cancel = null; save('clases', key, d); render();
};
ACT.cambiook = (el, key) => {
  const c = recDeKey(key); if (!c) return; const gr = $('#gsw').value;
  const d = Object.assign(claseBase(c), { estado: 'cambiada', grupoReal: gr, reponer: $('#rep').checked, repuesta: false, tarifa: S.cfg.tarifa || 0, pagan: pagan(gr) || null, ts: Date.now() });
  Object.assign(d, datosAvance(gr, c.materia));
  if (d.tipo === 'eval') cierraEval(gr, c.materia);
  S.ui.swap = null; save('clases', key, d); render();
};
ACT.deshacer = (el, key) => {
  const r = S.clases[key];
  if (r && r.intercambio && r.estado && r.estado !== 'pendiente') { save('clases', key, { fecha: r.fecha, slotId: r.slotId, grupoId: r.grupoId, materia: r.materia, ini: r.ini || '', fin: r.fin || '', extra: r.extra || '', estado: 'pendiente', intercambio: r.intercambio, repKey: r.repKey || null, ts: Date.now() }); render(); return; }
  if (r && r.cambioKey && S.clases[r.cambioKey]) { if ((S.clases[r.cambioKey].estado || 'pendiente') !== 'pendiente') { toast('La clase nueva ya está registrada: deshazla primero', 'bad'); return; } del('clases', r.cambioKey); }
  if (r && r.repone && S.clases[r.repone]) { const o = cl(S.clases[r.repone]); if (o.cambioKey === key) del('clases', r.repone); else { o.repuesta = false; save('clases', r.repone, o); } }
  if (r) del('clases', key); render();
};

/* Día completo */
ACT.diaCancelar = () => { S.ui.diaForm = true; render(); };
ACT.diaX = () => { S.ui.diaForm = false; render(); };
ACT.diaOk = () => {
  const mot = $('#dmot').value, f = S.fecha;
  clasesDelDia(f).filter(c => c.estado === 'pendiente').forEach(c => {
    save('clases', c.key, Object.assign(claseBase(c), { estado: 'cancelada', motivo: mot, reponer: $('#drep').checked, repuesta: false, dia: true, ts: Date.now() }));
  });
  S.ui.diaForm = false; toast('Día cancelado', 'ok'); render();
};
ACT.diaDeshacer = () => {
  Object.keys(S.clases).forEach(k => { const c = S.clases[k]; if (c.fecha === S.fecha && c.dia) del('clases', k); });
  render();
};

/* Clase extra y reposición */
ACT.extraForm = () => { S.ui.extra = !S.ui.extra; render(); };
ACT.extraOk = () => {
  const gid = $('#xg').value, mat = $('#xm').value, ini = $('#xi').value || '';
  const slotId = 'x' + Date.now().toString(36);
  save('clases', S.fecha + '_' + slotId, { fecha: S.fecha, slotId, grupoId: gid, materia: mat, ini, fin: '', extra: '', estado: 'pendiente', ts: Date.now() });
  S.ui.extra = false; render();
};
ACT.reponerHoy = (el, key) => {
  const o = S.clases[key]; if (!o) return;
  const slotId = 'x' + Date.now().toString(36);
  save('clases', S.fecha + '_' + slotId, { fecha: S.fecha, slotId, grupoId: o.estado === 'cambiada' ? o.grupoId : o.grupoId, materia: o.materia, ini: '', fin: '', extra: '', estado: 'pendiente', repone: key, ts: Date.now() });
  const n = cl(o); n.repuesta = true; save('clases', key, n); render();
};
ACT.noRepone = (el, key) => { const o = cl(S.clases[key]); o.reponer = false; save('clases', key, o); render(); };

/* Fecha */
ACT.dia = (el, f) => { S.fecha = f; S.ui.cancel = S.ui.swap = S.ui.mover = null; render(); };
ACT.diaHoy = () => ACT.dia(null, hoy());
ACT.diaMan = () => ACT.dia(null, sigHabil(hoy()));
ACT.diaMas = (el, n) => { let f = S.fecha; f = Number(n) > 0 ? sigHabil(f) : antHabil(f); ACT.dia(null, f); };
CHG.fechaSel = el => { if (el.value) ACT.dia(null, el.value); };

const RE_IMPRESO = /impres|hoja|tarjeta|flashcard|memorama|cartel|póster|poster|tablero|examen|copia|recort|cuadernill|ficha|lotería|loteria|bingo|worksheet|diploma|etiqueta|imagen|dibujo|mapa|carta|cuadro|tabla|rompecabezas|lámina|lamina|pictograma|sopa de letras|crucigrama/i;
const matTipo = (k, d) => RE_IMPRESO.test(k + ' ' + (d || '')) ? 'imp' : 'obj';
function prepHTML(f, items) {
  const pend = items.filter(c => c.estado === 'pendiente'); if (!pend.length) return '';
  const imp = {}, obj = {}, orden = pend.slice().sort((a, b) => (a.ini || 'zz').localeCompare(b.ini || 'zz'));
  const anota = (T, k, t, gn, n) => { const m = T[k] = T[k] || { g: [], t: t || '', n: 0 }; if (m.g.indexOf(gn) < 0) { m.g.push(gn); m.n += n || 0; } if (!m.t && t) m.t = t; };
  const tarjetas = orden.map(c => {
    const gid = gEf(c), gn = gNombre(gid), si = sigClase(gid, c.materia), bl = !si.ev && !si.fin ? bloqueDe(c.materia, si.nivel, si.n) : null;
    if (si.ev) anota(imp, 'Examen de ' + MAT_NOMBRE[c.materia] + ' (' + S.cfg.periodos[si.ev.periodo - 1] + ')', '', gn, alumnosDe(gid).length);
    else if (si.doc) { const ml = matLineas(si.doc); Object.keys(ml).forEach(k => anota(matTipo(k, ml[k]) === 'imp' ? imp : obj, k, ml[k], gn, 0)); }
    return '<div class="pc m-' + c.materia + '"><div class="pc-h"><b>' + (c.ini ? hhmm(c.ini) : 'Extra') + '</b>' + (c.fin ? '<small>' + hhmm(c.fin) + '</small>' : '') + '</div><div class="pc-b"><div class="pc-g">' + gn + ' <span class="badge b-' + c.materia + '">' + MAT_NOMBRE[c.materia] + '</span></div><div class="pc-t">' + esc(tituloSig(si)) + '</div><div class="small muted">Nivel ' + si.nivel + ' · ' + esc(nomNivel(c.materia, si.nivel)) + (bl ? ' · bloque ' + bl.i + '/' + bl.de : '') + '</div></div></div>';
  });
  const lista = T => { const ks = Object.keys(T); return ks.length ? '<ul>' + ks.map(k => '<li><b>' + esc(k) + '</b>' + (T[k].t ? ' · ' + esc(T[k].t) : '') + (T[k].n ? ' · ' + T[k].n + ' copias en total' : '') + ' <span class="muted">(' + T[k].g.join(', ') + ')</span></li>').join('') + '</ul>' : '<div class="small muted">Nada especial.</div>'; };
  return '<div class="card"><h3>Preparar para ' + (f === sigHabil(hoy()) ? 'mañana' : fmtLargo(f)) + '</h3><div class="prepg">' + tarjetas.join('') + '</div>' +
    '<div class="matg"><div class="mcard imp"><h4>Material impreso</h4>' + lista(imp) + '</div><div class="mcard obj"><h4>Instrumentos y objetos</h4>' + lista(obj) + '</div></div>' +
    '<div class="small muted" style="margin-top:10px">Antes de salir: bocina cargada · material impreso y recortado · plumones y cinta</div></div>';
}

VIEWS.hoy = function () {
  const f = S.fecha, t = hoy(), items = clasesDelDia(f), fds = dow(f) > 5;
  const titulo = f === t ? 'Hoy' : f === sigHabil(t) ? 'Mañana' : f > t ? 'Preparación' : 'Registro';
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>' + titulo + '</h2><div class="muted">' + fmtLargo(f) + '</div></div>' +
    '<div class="row"><button class="btn sm" data-act="diaMas|-1">◀</button><button class="btn sm ' + (f === t ? 'pri' : '') + '" data-act="diaHoy">Hoy</button><button class="btn sm ' + (f === sigHabil(t) && f !== t ? 'pri' : '') + '" data-act="diaMan">Mañana</button><button class="btn sm" data-act="diaMas|1">▶</button><input type="date" value="' + f + '" data-chg="fechaSel" style="min-height:30px;padding:2px 6px"></div></div>';
  if (!Object.keys(S.grupos).length && S.loaded.grupos) h += '<div class="card note warn">Todavía no hay grupos. Ve a <b>Grupos</b> para darlos de alta (o pídele a Claude que cargue tu horario).</div>';
  // sin registrar
  if (f === t) {
    let sin = 0, ult = null;
    for (let i = 1; i <= 7; i++) { const d = addD(t, -i); if (dow(d) > 5) continue; const n = clasesDelDia(d).filter(c => c.estado === 'pendiente').length; if (n) { sin += n; if (!ult) ult = d; } }
    if (sin) h += '<div class="card note warn row sp"><span>Tienes <b>' + sin + '</b> clase' + (sin > 1 ? 's' : '') + ' de los últimos días sin registrar.</span><button class="btn sm" data-act="dia|' + ult + '">Ir a ' + fmtCorto(ult) + '</button></div>';
    // por reponer
    const rep = Object.keys(S.clases).filter(k => { const c = S.clases[k]; return (c.estado === 'cancelada' || c.estado === 'cambiada') && c.reponer && !c.repuesta; }).sort();
    if (rep.length) h += '<div class="card"><h3>Por reponer (' + rep.length + ')</h3>' + rep.map(k => { const c = S.clases[k]; return '<div class="row sp" style="padding:4px 0"><span><b>' + gNombre(c.grupoId) + '</b> ' + MAT_NOMBRE[c.materia] + ' <span class="muted small">del ' + fmtCorto(c.fecha) + '</span></span><span class="row"><button class="btn sm" data-act="reponerHoy|' + k + '">Agendar hoy</button><button class="btn sm ghost" data-act="noRepone|' + k + '">Ya no</button></span></div>'; }).join('') + '</div>';
  }
  if (fds) { h += '<div class="card empty">Fin de semana: sin clases. <div style="margin-top:10px"><button class="btn pri" data-act="diaMan">Ver el siguiente día de clases</button></div></div>'; return h; }
  if (f >= t) h += prepHTML(f, items);
  // acciones del día
  if (f <= t) {
    const pend = items.filter(c => c.estado === 'pendiente' && String(c.slotId).indexOf('x') !== 0).length, dia = items.some(c => c.dia);
    h += '<div class="row" style="margin-bottom:10px">';
    if (dia) h += '<button class="btn" data-act="diaDeshacer">Deshacer “día cancelado”</button>';
    else if (pend) h += '<button class="btn" data-act="diaCancelar">Cancelar el día completo</button>';
    h += '<button class="btn" data-act="extraForm">+ Clase extra o reposición</button></div>';
    if (S.ui.diaForm) h += diaFormHTML(f);
    if (S.ui.extra) h += extraFormHTML();
  }
  if (!items.length) h += '<div class="card empty">No hay clases en tu horario para este día.</div>';
  if (items.length) h += '<h3 style="margin:14px 0 8px">Clases del día</h3><div class="clsg">' + items.map(c => claseCard(c, f)).join('') + '</div>';
  if (f <= t && items.some(c => esDada(c))) h += '<div class="note small">Tip: la bitácora se guarda sola. Si en un grupo toca repetir la sesión, márcalo y la siguiente clase no avanzará.</div>';
  return h;
};

/* ---------- Semana y mes ---------- */
VIEWS.semana = function () {
  const modo = S.ui.cal || 'semana', ref = S.ui.calRef || hoy(), t = hoy();
  let h = '<div class="row sp" style="margin-bottom:10px"><h2>' + (modo === 'semana' ? 'Semana' : 'Mes') + '</h2><div class="row"><div class="seg"><button class="' + (modo === 'semana' ? 'on' : '') + '" data-act="calModo|semana">Semana</button><button class="' + (modo === 'mes' ? 'on' : '') + '" data-act="calModo|mes">Mes</button></div>' +
    '<button class="btn sm" data-act="calMov|-1">◀</button><button class="btn sm" data-act="calMov|0">Hoy</button><button class="btn sm" data-act="calMov|1">▶</button></div></div>';
  const dotCls = (c, f) => c.estado === 'pendiente' ? (f < t ? 'sinreg' : 'pendiente') : c.estado;
  const stats = lst => {
    const s = { impartida: 0, cancelada: 0, cambiada: 0, pendiente: 0 }; lst.forEach(c => { if (c.estado === 'cancelada' && c.motivo === 'cambio') return; s[c.estado === 'pendiente' && c.fecha < t ? 'pendiente' : c.estado]++; }); return s;
  };
  let all = [];
  if (modo === 'semana') {
    const m = lunes(ref), sel = S.ui.celda;
    h += '<div class="muted" style="margin:-6px 0 10px">Semana del ' + fmtCorto(m) + ' al ' + fmtCorto(addD(m, 4)) + '. Toca una clase para registrarla, cancelarla o cambiarla.</div><div class="semg">';
    for (let i = 0; i < 5; i++) {
      const f = addD(m, i), it = clasesDelDia(f); all = all.concat(it);
      const base = it.filter(c => String(c.slotId).indexOf('x') !== 0), extras = it.filter(c => String(c.slotId).indexOf('x') === 0);
      const cells = [];
      if (i === 0) cells.push({ hon: true, ini: '08:00', fin: '08:50' });
      base.forEach(c => { cells.push(c); if (c.extra) cells.push(Object.assign({}, c, { cont: true, ini: c.extra.split('–')[0].trim().padStart(5, '0'), fin: (c.extra.split('–')[1] || '').trim() })); });
      cells.sort((a, b) => (a.ini || '').localeCompare(b.ini || ''));
      const dia = it.some(c => c.dia), pend = base.filter(c => c.estado === 'pendiente').length;
      h += '<div class="semd"><div class="semh ' + (f === t ? 'hoy' : '') + '"><b>' + DIAS[i + 1] + ' ' + pd(f).getDate() + '</b><div class="row" style="gap:4px;margin-top:4px">' +
        (dia ? '<button class="btn sm" data-act="semDeshDia|' + f + '">Deshacer día</button>' : (pend ? '<button class="btn sm" data-act="semDia|' + f + '">Cancelar día</button>' : '')) +
        '<button class="btn sm ghost" data-act="semExtra|' + f + '">+ Extra</button></div></div>';
      let recDone = false;
      cells.forEach(c => {
        if (!recDone && !c.hon && (c.ini || '') >= '11:00') { h += '<div class="rec">Recreo</div>'; recDone = true; }
        if (c.hon) { h += '<div class="cel hon"><b>Honores</b><small>8:00 – 8:50</small></div>'; return; }
        const e = c.estado, past = f < t, sin = e === 'pendiente' && past;
        h += '<div class="cel m-' + c.materia + ' e-' + (sin ? 'sinreg' : e) + (c.motivo === 'cambio' ? ' mov' : '') + (sel === c.key && !c.cont ? ' sel' : '') + (c.cont ? ' cont' : '') + '" data-act="celda|' + c.key + '"><div class="row sp" style="flex-wrap:nowrap;gap:4px"><b>' + gNombre(c.grupoId) + '</b><span class="mk">' + ({ impartida: '✓', cancelada: c.motivo === 'cambio' ? '↪' : '✕', cambiada: '⇄', pendiente: sin ? '!' : '○' }[e]) + '</span></div><span class="muted">' + (c.materia === 'ingles' ? 'Inglés' : 'Computación') + (c.cont ? ' (2.ª parte)' : '') + '</span><small>' + hhmm(c.ini) + ' – ' + hhmm(c.fin) + (e === 'cambiada' ? ' · a ' + gNombre(c.grupoReal) : '') + (e === 'cancelada' && c.motivo === 'cambio' && c.cambioA ? ' · pasó al ' + DIAS[dow(c.cambioA.fecha)].slice(0, 3).toLowerCase() + (c.cambioA.grupoId !== c.grupoId ? ' (' + gNombre(c.cambioA.grupoId) + ')' : '') : '') + (c.intercambio ? ' · intercambiada' : '') + '</small></div>';
      });
      extras.forEach(c => { h += '<div class="cel m-' + c.materia + ' e-' + c.estado + (sel === c.key ? ' sel' : '') + '" data-act="celda|' + c.key + '"><div class="row sp" style="flex-wrap:nowrap"><b>' + gNombre(c.grupoId) + '</b><span class="mk">' + ({ impartida: '✓', cancelada: '✕', cambiada: '⇄', pendiente: '○' }[c.estado]) + '</span></div><span class="muted">Extra · ' + (c.materia === 'ingles' ? 'Inglés' : 'Computación') + (c.cambio ? ' (cambio)' : c.repone ? ' (reposición)' : '') + '</span><small>' + (c.ini ? hhmm(c.ini) : 'sin hora') + '</small></div>'; });
      if (!cells.length && !extras.length) h += '<div class="small muted">Sin clases</div>';
      h += '</div>';
    }
    h += '</div>';
    // panel de acciones de la clase o del día elegido
    const f2 = S.fecha;
    if (S.ui.diaForm) h += '<div style="margin-top:12px">' + diaFormHTML(f2) + '</div>';
    else if (S.ui.extra) h += '<div style="margin-top:12px"><div class="small muted" style="margin-bottom:4px">Clase extra o reposición para el ' + fmtLargo(f2) + '</div>' + extraFormHTML() + '</div>';
    else if (sel && S.clases && clasesDelDia(f2).some(c => c.key === sel)) {
      const c = clasesDelDia(f2).find(x => x.key === sel);
      h += '<div style="margin-top:12px"><div class="row sp" style="margin-bottom:6px"><b>' + fmtLargo(f2) + '</b><button class="btn sm ghost" data-act="dia|' + f2 + '|go">Abrir el día</button></div>' + claseCard(c, f2) + '</div>';
    }
  } else {
    const d0 = pd(ref), y = d0.getFullYear(), mo = d0.getMonth(), prim = new Date(y, mo, 1), dias = new Date(y, mo + 1, 0).getDate(), off = (prim.getDay() + 6) % 7;
    h += '<div class="muted" style="margin:-6px 0 10px">' + MESES[mo] + ' ' + y + '</div><div class="calm">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => '<div class="h">' + x + '</div>').join('');
    for (let i = 0; i < off; i++) h += '<div class="d off"></div>';
    for (let d = 1; d <= dias; d++) {
      const f = y + '-' + z2(mo + 1) + '-' + z2(d), wk = dow(f) > 5;
      if (wk) { h += '<div class="d off"><b>' + d + '</b></div>'; continue; }
      const it = clasesDelDia(f); all = all.concat(it);
      h += '<div class="d ' + (f === t ? 'hoy' : '') + '" data-act="dia|' + f + '|go"><b>' + d + '</b><div class="dots">' + it.map(c => '<span class="dot ' + dotCls(c, f) + '"></span>').join('') + '</div></div>';
    }
    h += '</div>';
  }
  const s = stats(all);
  h += '<div class="card" style="margin-top:12px"><div class="row" style="gap:18px"><div class="kpi"><b>' + s.impartida + '</b><span><span class="dot impartida" style="display:inline-block"></span> impartidas</span></div><div class="kpi"><b>' + s.cambiada + '</b><span><span class="dot cambiada" style="display:inline-block"></span> cambiadas</span></div><div class="kpi"><b>' + s.cancelada + '</b><span><span class="dot cancelada" style="display:inline-block"></span> canceladas</span></div><div class="kpi"><b>' + s.pendiente + '</b><span><span class="dot sinreg" style="display:inline-block"></span> sin registrar</span></div></div></div>';
  return h;
};
ACT.calModo = (el, m) => { S.ui.cal = m; render(); };
ACT.calMov = (el, n) => {
  const m = S.ui.cal || 'semana', ref = S.ui.calRef || hoy(); n = Number(n);
  if (!n) S.ui.calRef = hoy();
  else if (m === 'semana') S.ui.calRef = addD(ref, 7 * n);
  else { const d = pd(ref); d.setMonth(d.getMonth() + n, 1); S.ui.calRef = ymd(d); }
  render();
};
const _dia = ACT.dia;
ACT.dia = (el, f, go) => { _dia(el, f); if (go) ir('hoy'); };

/* Acciones desde el horario semanal */
ACT.celda = (el, key) => { S.fecha = key.slice(0, 10); S.ui.celda = key; S.ui.diaForm = false; S.ui.extra = false; S.ui.cancel = null; S.ui.swap = null; S.ui.mover = null; render(); };
ACT.semDia = (el, f) => { S.fecha = f; S.ui.diaForm = true; S.ui.extra = false; S.ui.celda = null; render(); };
ACT.semExtra = (el, f) => { S.fecha = f; S.ui.extra = true; S.ui.diaForm = false; S.ui.celda = null; render(); };
ACT.semDeshDia = (el, f) => { S.fecha = f; ACT.diaDeshacer(); };
