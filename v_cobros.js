'use strict';
/* Cobros: lo que toca cobrar a cada grupo por semana, pagos recibidos y saldo por maestro */

const tarifaDe = c => (c.pagan != null ? c.pagan : pagan(gEf(c))) * (c.tarifa || S.cfg.tarifa || 0);
const maestroDe = gid => ((S.grupos[gid] && S.grupos[gid].maestro) || '').trim() || '(sin maestro asignado)';
function dadasEntre(ini, fin) {
  return Object.values(S.clases).filter(c => esDada(c) && c.fecha >= ini && c.fecha <= fin);
}
function maestros() {
  const s = new Set(); Object.values(S.grupos).forEach(g => s.add(maestroDe(g.id)));
  Object.values(S.pagos).forEach(p => { if (p.maestro) s.add(p.maestro); });
  return Array.from(s).sort();
}
function resumenSemana(m) {
  const fin = addD(m, 6), dadas = dadasEntre(m, fin), filas = [];
  ordenGrupos().forEach(g => {
    const cs = dadas.filter(c => gEf(c) === g.id), esp = matsDe(g.id).length;
    filas.push({ gid: g.id, maestro: maestroDe(g.id), esp, dadas: cs.length, monto: cs.reduce((s, c) => s + tarifaDe(c), 0), ing: cs.filter(c => c.materia === 'ingles').length, comp: cs.filter(c => c.materia === 'compu').length });
  });
  return filas;
}
function saldoHasta(mae, fin) { // cobrado − pagado hasta una fecha (positivo = el maestro debe; negativo = a favor)
  const gs = Object.values(S.grupos).filter(g => maestroDe(g.id) === mae).map(g => g.id);
  const cobrado = Object.values(S.clases).filter(c => esDada(c) && c.fecha <= fin && gs.indexOf(gEf(c)) >= 0).reduce((s, c) => s + tarifaDe(c), 0);
  const pagado = Object.values(S.pagos).filter(p => p.maestro === mae && p.fecha <= fin).reduce((s, p) => s + (p.monto || 0), 0);
  return cobrado - pagado;
}
/* Cada cobro se aplica a las clases ya impartidas, de la más antigua a la más reciente.
   Lo que sobra (todavía no hay clases dadas que cubra) es un adelanto; en cuanto se dan las clases, queda pagado. */
function adelantoPagos() {
  const res = {};
  maestros().forEach(mae => {
    const gs = Object.values(S.grupos).filter(g => maestroDe(g.id) === mae).map(g => g.id);
    let cobrado = Object.values(S.clases).filter(c => esDada(c) && gs.indexOf(gEf(c)) >= 0).reduce((s, c) => s + tarifaDe(c), 0), acum = 0;
    Object.values(S.pagos).filter(p => p.maestro === mae).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.ts || 0) - (b.ts || 0)).forEach(p => {
      const m = p.monto || 0, aplicado = Math.max(0, Math.min(m, cobrado - acum)); acum += m; res[p.id] = { aplicado, adelanto: m - aplicado };
    });
  });
  return res;
}
function estadoPago(p) {
  const r = adelantoPagos()[p.id]; if (!r) return '';
  return r.adelanto <= 0.005 ? '<span class="badge ok">Pagada</span>' : r.aplicado <= 0.005 ? '<span class="badge fav">Adelanto</span>' : '<span class="badge fav">Adelanto ' + money(r.adelanto) + '</span>';
}
const saldoMaestro = mae => { const sd = saldoHasta(mae, '9999-12-31'); return { saldo: sd }; };
const saldoTxt = v => v < -0.005 ? '<span class="badge fav">A favor ' + money(-v) + '</span>' : '<b>' + money(v) + '</b>';

VIEWS.cobros = function () {
  const m = S.ui.cobSem || lunes(hoy()), fin = addD(m, 4), filas = resumenSemana(m), t = S.cfg.tarifa || 0, maes = maestros();
  const totDadas = filas.reduce((s, f) => s + f.dadas, 0), totMonto = filas.reduce((s, f) => s + f.monto, 0);
  const pagosSem = Object.values(S.pagos).filter(p => p.fecha >= m && p.fecha <= addD(m, 6));
  const recibido = pagosSem.reduce((s, p) => s + (p.monto || 0), 0);
  let h = '<div class="row sp" style="margin-bottom:10px"><div><h2>Cobros</h2><div class="muted">Semana del ' + fmtCorto(m) + ' al ' + fmtCorto(fin) + '</div></div><div class="row"><button class="btn sm" data-act="cobMov|-1">◀</button><button class="btn sm" data-act="cobMov|0">Esta semana</button><button class="btn sm" data-act="cobMov|1">▶</button></div></div>';
  if (!t) h += '<div class="card note warn row sp"><span>Falta el <b>monto por niño</b> (por clase) para calcular los cobros.</span><span class="row"><input id="tarifaIn" inputmode="decimal" placeholder="Ej. 10" style="width:110px"><button class="btn pri sm" data-act="tarifaOk">Guardar</button></span></div>';
  // 1) registrar un cobro
  h += '<div class="card"><h3>Registrar un cobro</h3><div class="row"><label class="f">Maestro(a)<select id="pm" data-chg="cobPrev">' + maes.map(x => '<option>' + esc(x) + '</option>').join('') + '</select></label><label class="f">Monto<input id="pmo" inputmode="decimal" style="width:110px" placeholder="0" data-inp="cobPrev"></label><label class="f">Fecha<input type="date" id="pf" value="' + hoy() + '"></label><label class="f grow">Nota<input id="pn" placeholder="Opcional"></label></div>' +
    '<div class="row sp" style="margin-top:10px"><span class="small muted">Si el maestro no debe clases, se registra solo como adelanto.</span><button class="btn pri" data-act="pagoOk">Guardar cobro</button></div>' +
    '<div id="pprev" class="small muted" style="margin-top:6px"></div>' +
    '<details style="margin-top:10px"><summary>Cobros recientes</summary>' + (Object.keys(S.pagos).length ? '<div class="scroll"><table>' + Object.values(S.pagos).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.ts || 0) - (a.ts || 0)).slice(0, 15).map(p => '<tr><td>' + fmtCorto(p.fecha) + '</td><td>' + esc(p.maestro) + '</td><td class="n"><b>' + money(p.monto) + '</b></td><td>' + estadoPago(p) + '</td><td class="muted small">' + esc(p.nota || '') + '</td><td><button class="btn sm ghost danger" data-act="pagoDel|' + p.id + '">Quitar</button></td></tr>').join('') + '</table></div>' : '<div class="muted small" style="margin-top:6px">Aún no hay cobros registrados.</div>') + '</details></div>';
  // 2) por maestro
  let tA = 0, tS = 0, tT = 0;
  const filasM = maes.map(mae => {
    const gs = filas.filter(f => f.maestro === mae), sem = gs.reduce((s, f) => s + f.monto, 0), atr = saldoHasta(mae, addD(m, -1)), tot = saldoHasta(mae, addD(m, 6));
    const pag = pagosSem.filter(p => p.maestro === mae).reduce((s, p) => s + (p.monto || 0), 0); tA += atr; tS += sem; tT += tot;
    return '<tr><td><b>' + esc(mae) + '</b><div class="small muted" style="max-width:130px">' + (gs.filter(f => f.dadas).map(f => gNombre(f.gid) + ' (' + f.dadas + ')').join(' · ') || 'Sin clases esta semana') + '</div></td><td class="n nw">' + saldoTxt(atr) + '</td><td class="n nw"><b>' + money(sem) + '</b></td><td class="n"><span class="nw">' + saldoTxt(tot) + '</span>' + (pag ? '<div class="small muted" style="max-width:110px;margin-left:auto;white-space:normal">pagó ' + money(pag) + ' esta semana</div>' : '') + '</td></tr>';
  });
  h += '<div class="card"><h3>Por maestro(a)</h3><div class="scroll"><table class="tmae"><tr><th>Maestro(a)</th><th class="n">Pagos atrasados</th><th class="n">Esta semana</th><th class="n">Pago total</th></tr>' + filasM.join('') +
    '<tr><td><b>Total de la semana</b></td><td></td><td class="n"><b>' + money(tS) + '</b></td><td></td></tr></table></div>' +
    '<div class="small muted" style="margin-top:8px"><b>Pagos atrasados</b>: lo que quedó pendiente de semanas anteriores. <b>Pago total</b>: atrasados + esta semana − lo que ya pagó. <b>A favor</b>: pagó por adelantado; se va descontando conforme das las clases y llega a $0.</div></div>';
  // 3) qué cobrar a cada grupo
  h += '<div class="card"><h3>Qué cobrar a cada grupo</h3><div class="scroll"><table><tr><th>Maestro(a)</th><th>Grupo</th><th class="n">Niños que pagan</th><th class="n">Esperadas</th><th class="n">Impartidas</th><th>Se cobra</th><th class="n">Monto</th></tr>' +
    filas.map(f => '<tr><td>' + esc(f.maestro) + '</td><td><b>' + gNombre(f.gid) + '</b></td><td class="n">' + pagan(f.gid) + '</td><td class="n">' + f.esp + '</td><td class="n">' + f.dadas + '</td><td>' + (f.dadas === 0 ? '<span class="badge bad">Ninguna</span>' : f.dadas >= f.esp ? '<span class="badge ok">' + (f.esp === 2 ? 'Las dos' : 'La clase') + '</span>' : '<span class="badge warn">Solo una</span>') + '</td><td class="n"><b>' + money(f.monto) + '</b></td></tr>').join('') +
    '<tr><td colspan="4"><b>Total</b></td><td class="n"><b>' + totDadas + '</b></td><td></td><td class="n"><b>' + money(totMonto) + '</b></td></tr></table></div></div>';
  // 4) resumen
  const porCobrar = maes.reduce((s, x) => s + Math.max(0, saldoHasta(x, '9999-12-31')), 0), aFavor = maes.reduce((s, x) => s + Math.max(0, -saldoHasta(x, '9999-12-31')), 0);
  h += '<div class="card"><h3>Resumen</h3><div class="row" style="gap:22px"><div class="kpi"><b>' + totDadas + '</b><span>clases impartidas</span></div><div class="kpi"><b>' + money(totMonto) + '</b><span>ganado en la semana</span></div><div class="kpi"><b>' + money(recibido) + '</b><span>cobrado esta semana</span></div><div class="kpi"><b>' + money(porCobrar) + '</b><span>por cobrar en total</span></div>' + (aFavor ? '<div class="kpi"><b>' + money(aFavor) + '</b><span>a favor (adelantos)</span></div>' : '') + '</div>' +
    '<div class="small muted" style="margin-top:8px">Monto por niño en cada clase: <b>' + money(t) + '</b> (cámbialo en Ajustes). Cada clase se cobra por los niños que pagan en ese grupo (se marca en Grupos). Las clases canceladas no se cobran; las cambiadas se cobran al grupo que las recibió.</div></div>';
  return h;
};
function cobPrev() {
  const el = $('#pprev'); if (!el) return; const mae = $('#pm').value, v = parseNota($('#pmo').value);
  if (v === '' || v === undefined || v <= 0) { el.textContent = ''; return; }
  const sd = saldoHasta(mae, '9999-12-31') - v;
  el.innerHTML = 'Después de este cobro, ' + esc(mae) + ' quedará ' + (sd < -0.005 ? '<b>a favor ' + money(-sd) + '</b> (se descuenta al dar sus clases)' : sd > 0.005 ? 'debiendo <b>' + money(sd) + '</b>' : '<b>al corriente ($0)</b>') + '.';
}
INP.cobPrev = () => cobPrev(); CHG.cobPrev = () => cobPrev();
ACT.cobMov = (el, n) => { n = Number(n); S.ui.cobSem = n ? addD(S.ui.cobSem || lunes(hoy()), 7 * n) : lunes(hoy()); render(); };
ACT.tarifaOk = () => { const v = parseNota($('#tarifaIn').value); if (v === '' || v === undefined || v < 0) { toast('Escribe un monto válido', 'bad'); return; } const c = cl(S.cfg); c.tarifa = v; save('config', 'main', c); render(); };
ACT.pagoOk = () => {
  const v = parseNota($('#pmo').value); if (v === '' || v === undefined || v <= 0) { toast('Escribe el monto recibido', 'bad'); return; }
  const id = 'p' + Date.now().toString(36);
  save('pagos', id, { id, maestro: $('#pm').value, monto: v, fecha: $('#pf').value || hoy(), nota: $('#pn').value.trim(), ts: Date.now() }); toast('Cobro guardado', 'ok'); render();
};
ACT.pagoDel = (el, id) => ask('¿Quitar este cobro?', () => { del('pagos', id); render(); }, 'Quitar');
ACT.msg = (el, mae) => {
  const m = S.ui.cobSem || lunes(hoy()), filas = resumenSemana(m).filter(f => f.maestro === mae), tot = filas.reduce((s, f) => s + f.monto, 0), sd = saldoMaestro(mae);
  const txt = 'Hola ' + mae + ', resumen de Inglés y Computación de la semana del ' + fmtCorto(m) + ' al ' + fmtCorto(addD(m, 4)) + ':\n' +
    filas.map(f => '• ' + gNombre(f.gid) + ': ' + f.dadas + ' de ' + f.esp + ' clases (' + money(f.monto) + ')').join('\n') + '\nTotal de la semana: ' + money(tot) + (sd.saldo ? '\nSaldo pendiente acumulado: ' + money(sd.saldo) : '') + '\n¡Gracias!';
  copiar(txt);
};
