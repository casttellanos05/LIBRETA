'use strict';
/* Constantes de la libreta (no son datos del usuario). El contenido de las clases viene del Excel del plan académico. */
const NIVS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const NIVELES = { 1: 'Descubro', 2: 'Frases', 3: 'Oraciones', 4: 'Diálogos', 5: 'Párrafos y reglas', 6: 'Textos cortos', 7: 'Conectores', 8: 'Rutinas y comparaciones', 9: 'Cuentos y pasado', 10: 'Autonomía' };
const NIVELES_C = {}; NIVS.forEach(n => { NIVELES_C[n] = 'Nivel ' + n; });
const CLASES_POR_NIVEL = 25;

const NIVEL_POR_GRADO = { 1: 1, 2: 2, 3: 3, 4: 3, 5: 3, 6: 3 };

const CFG_DEF = {
  escuela: 'Primaria Benito Juárez García',
  ciclo: '2026-2027',
  maestro: 'Crhistian N. Castellanos Aguilar',
  director: '',
  tarifa: 0,
  esc: { min: 5, max: 10, aprob: 6 },
  redondeo: 'entero',
  periodos: ['1er trimestre', '2.º trimestre', '3er trimestre'],
  criterios: [
    { id: 'escrito', nombre: 'Examen escrito', peso: 40 },
    { id: 'oral', nombre: 'Examen oral', peso: 40 },
    { id: 'part', nombre: 'Participación en clase', peso: 20 }
  ]
};

/* Observaciones de la boleta: tono cálido, pensado para que las familias las reciban como una invitación y no como un reproche. */
const OBS_FELIC = {
  ingles: [
    'Participa con entusiasmo y alegría en cada clase de inglés',
    'Excelente avance en este periodo: ¡felicidades por su esfuerzo!',
    'Cada clase suma: su progreso en inglés es notable'
  ],
  compu: [
    'Explora con curiosidad en computación y aprende muy rápido',
    'Excelente avance en este periodo: ¡felicidades por su esfuerzo!',
    'Cada clase suma: está desarrollando habilidades que le servirán toda la vida'
  ]
};
const OBS_SUG = {
  ingles: [
    'Le ayudará mucho repasar el vocabulario en casa con juegos o tarjetas',
    'Un repaso breve en casa, de unos 10 minutos, será un gran impulso para seguir avanzando',
    'Poco a poco se anima más a participar; sigamos motivándole con cariño'
  ],
  compu: [
    'Practicar unos minutos en casa lo que vemos en clase le dará más seguridad',
    'Platicar sobre lo que aprendió en clase le ayudará a recordarlo',
    'Poco a poco se anima más a participar; sigamos motivándole con cariño'
  ]
};
const FRASES_OBS = OBS_FELIC.ingles.concat(OBS_SUG.ingles);
/* Sugerencia automática según la calificación del periodo: siempre abre con algo bonito. */
const uneObs = (a, b) => { a = String(a || '').trim(); return a ? a + (/[.!?]$/.test(a) ? ' ' : '. ') + b : b; };
function obsSugerida(mat, nota, i) {
  const F = OBS_FELIC[mat] || OBS_FELIC.ingles, G = OBS_SUG[mat] || OBS_SUG.ingles, k = i || 0;
  if (nota == null) return '';
  if (nota >= 9) return F[k % F.length];
  if (nota >= 8) return uneObs(F[(k + 3) % F.length], G[k % G.length]);
  return uneObs(F[(k + 5) % F.length], G[(k + 1) % G.length]);
}

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ANIMOS = ['😟', '🙁', '😐', '🙂', '😄'];
const TAGS_BIT = ['Muy inquietos', 'Se aburrieron', 'Les gustó el juego', 'Faltó tiempo', 'Sobró tiempo', 'Les costó hablar', 'Funcionó el trabajo en parejas', 'Faltó material', 'Mucho ruido', 'Gran avance'];
const MAT_NOMBRE = { ingles: 'Inglés', compu: 'Computación' };
