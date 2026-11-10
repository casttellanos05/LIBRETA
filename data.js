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

const CRIT_C_DEF = [{ id: 'escrito', nombre: 'Manejo de programas', peso: 40 }, { id: 'oral', nombre: 'Razonamiento lógico', peso: 40 }, { id: 'part', nombre: 'Participación en clase', peso: 20 }];
const DESC_NIVEL = {
  ingles: {
    1: 'Primer acercamiento al inglés: vocabulario cotidiano, canciones y juegos que despiertan la curiosidad y la confianza para comunicarse con palabras sencillas.',
    2: 'Los alumnos combinan palabras para formar frases cortas y expresar ideas básicas sobre sí mismos, su familia y su entorno, con pronunciación clara.',
    3: 'Construcción de oraciones completas para describir, preguntar y responder en situaciones cotidianas, fortaleciendo la comprensión auditiva y la expresión oral.',
    4: 'Los alumnos participan en conversaciones breves y guiadas: aprenden a escuchar, preguntar y responder con naturalidad en situaciones reales.',
    5: 'Inicio de la escritura organizada: redacción de párrafos sencillos y primeras reglas gramaticales que dan solidez y claridad a lo que expresan.',
    6: 'Lectura y escritura de textos breves con ideas conectadas, ampliando vocabulario y comprensión para comunicar información con mayor precisión.',
    7: 'Uso de conectores y estructuras variadas para enlazar ideas, lo que permite explicaciones más fluidas, ordenadas y completas en inglés.',
    8: 'Los alumnos hablan y escriben sobre hábitos, rutinas y comparaciones, desarrollando mayor precisión gramatical y seguridad al expresarse.',
    9: 'Narración de experiencias y cuentos en pasado: comprenden y relatan secuencias de hechos con vocabulario amplio y estructuras más ricas.',
    10: 'Dominio funcional del inglés: los alumnos comprenden, conversan y escriben con autonomía, preparados para comunicarse con confianza en nuevos contextos.'
  },
  compu: {
    1: 'Primeros pasos con la computadora: partes del equipo, uso del mouse y del teclado y hábitos de cuidado, mediante actividades guiadas y divertidas.',
    2: 'Manejo básico de programas de dibujo y escritura: los alumnos aprenden a abrir, guardar y organizar sus trabajos con seguridad.',
    3: 'Procesador de texto y presentaciones: los alumnos crean documentos sencillos y aprenden a dar formato con orden y creatividad.',
    4: 'Uso responsable de internet y búsqueda de información, junto con el desarrollo del pensamiento lógico mediante retos.',
    5: 'Hojas de cálculo y organización de datos: los alumnos aprenden a ordenar información, hacer operaciones y presentar resultados.',
    6: 'Pensamiento computacional: secuencias, patrones y algoritmos que desarrollan el razonamiento lógico y la resolución de problemas.',
    7: 'Introducción a la programación por bloques: los alumnos crean historias, juegos y animaciones aplicando lógica y creatividad.',
    8: 'Proyectos integradores con varios programas: los alumnos planean, diseñan y presentan trabajos propios de forma autónoma.',
    9: 'Programación y automatización de tareas con mayor complejidad, fortaleciendo la lógica, la persistencia y el trabajo en equipo.',
    10: 'Dominio funcional de herramientas digitales: los alumnos planean y desarrollan proyectos completos con autonomía y responsabilidad digital.'
  }
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
