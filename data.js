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
/* Observaciones de la boleta: automáticas según el promedio del periodo (tono profesional y cálido). */
const OBS_BANDA = {
  ingles: {
    bajo: [
      'Necesita reforzar los contenidos de inglés de este periodo. Le recomendamos un repaso diario de unos minutos en casa y acercarse al maestro para resolver sus dudas.',
      'Su desempeño en inglés requiere mayor atención. Con práctica constante en casa y más concentración en clase podrá mejorar notablemente.',
      'Es importante reforzar el vocabulario y las estructuras vistas en clase. Con apoyo en casa y disposición, estamos seguros de que avanzará.'
    ],
    apoyo: [
      'Va avanzando en inglés. Con un breve repaso diario en casa y mayor atención en clase podrá alcanzar un mejor desempeño.',
      'Le recomendamos apoyarle en casa repasando el vocabulario y motivarle a poner más atención durante la clase.',
      'Tiene buen potencial en inglés; con más constancia en casa y concentración en clase mejorará sus resultados.',
      'Su esfuerzo es visible, pero necesita reforzar lo aprendido. El apoyo en casa y la atención en clase serán la clave.'
    ],
    moderada: [
      'Buen trabajo en este periodo, ¡felicidades! Para seguir creciendo, anímele a practicar inglés en casa con canciones, juegos o videos.',
      'Muestra un desempeño satisfactorio en inglés. Platicar en casa sobre lo que aprende en clase le ayudará a afianzar su vocabulario.',
      'Felicitamos su esfuerzo constante. Motivarle a practicar en casa le ayudará a llegar aún más lejos.',
      'Buen desempeño y buena actitud en clase. Un pequeño repaso en casa le impulsará a alcanzar la excelencia.'
    ],
    buena: [
      '¡Felicidades! Muestra un muy buen desempeño en inglés y participa con entusiasmo en clase. ¡Que siga así!',
      'Excelente trabajo en este periodo. Su dedicación y su participación se reflejan en sus resultados.',
      'Reconocemos su esfuerzo y compromiso: su desempeño en inglés es muy destacado.',
      'Gran desempeño en la clase de inglés. ¡Felicidades por su constancia y su buena actitud!'
    ],
    excelente: [
      '¡Felicitaciones! Su desempeño en inglés es sobresaliente: destaca por su comprensión, su participación y su gran facilidad para comunicarse.',
      'Reconocemos con gran orgullo su excelente desempeño: domina los temas con seguridad y es un ejemplo para sus compañeros.',
      '¡Excelente! Muestra una habilidad extraordinaria en inglés y un compromiso admirable. Lo invitamos a seguir explorando nuevos retos.',
      'Un desempeño brillante en inglés: aprende con rapidez, participa con confianza y supera las expectativas. ¡Muchas felicidades!'
    ]
  },
  compu: {
    bajo: [
      'Necesita reforzar el manejo de los programas vistos en este periodo. Le recomendamos practicar en casa cuando sea posible y acercarse al maestro para resolver sus dudas.',
      'Su desempeño en computación requiere mayor atención. Con práctica constante y más concentración en clase podrá mejorar notablemente.',
      'Es importante reforzar el razonamiento lógico y el uso de las herramientas vistas. Con apoyo en casa y disposición, estamos seguros de que avanzará.'
    ],
    apoyo: [
      'Va avanzando en computación. Con un poco más de práctica y mayor atención en clase podrá alcanzar un mejor desempeño.',
      'Le recomendamos apoyarle en casa repasando lo visto en clase y motivarle a poner más atención durante las actividades.',
      'Tiene buen potencial en computación; con más constancia y concentración en clase mejorará sus resultados.',
      'Su esfuerzo es visible, pero necesita reforzar el manejo de los programas. El apoyo en casa y la atención en clase serán la clave.'
    ],
    moderada: [
      'Buen trabajo en este periodo, ¡felicidades! Para seguir creciendo, anímele a platicar en casa sobre lo que aprende y a practicar cuando tenga oportunidad.',
      'Muestra un desempeño satisfactorio en computación. Pedirle que explique en casa lo que hizo en clase le ayudará a afianzar su aprendizaje.',
      'Felicitamos su esfuerzo constante. Motivarle a seguir explorando y practicando le ayudará a llegar aún más lejos.',
      'Buen desempeño y buena actitud en clase. Un poco más de práctica le impulsará a alcanzar la excelencia.'
    ],
    buena: [
      '¡Felicidades! Muestra un muy buen manejo de los programas y un razonamiento lógico destacado. ¡Que siga así!',
      'Excelente trabajo en este periodo. Su dedicación y su participación se reflejan en sus resultados.',
      'Reconocemos su esfuerzo y compromiso: su desempeño en computación es muy destacado.',
      'Gran desempeño en la clase de computación. ¡Felicidades por su constancia y su buena actitud!'
    ],
    excelente: [
      '¡Felicitaciones! Su desempeño en computación es sobresaliente: maneja los programas con seguridad y razona con gran claridad.',
      'Reconocemos con gran orgullo su excelente desempeño: domina las herramientas con soltura y es un ejemplo para sus compañeros.',
      '¡Excelente! Muestra una habilidad extraordinaria en computación y un compromiso admirable. Lo invitamos a seguir explorando nuevos retos.',
      'Un desempeño brillante en computación: aprende con rapidez, resuelve con lógica y supera las expectativas. ¡Muchas felicidades!'
    ]
  }
};
/* Menú de frases para elegir a mano (tres grupos) */
const OBS_CONDUCTA = [
  'Se distrae con facilidad durante la clase. Le invitamos a conversar en casa sobre la importancia de la atención.',
  'Platica con frecuencia durante la clase, lo que afecta su concentración y la de sus compañeros.',
  'Necesita seguir las indicaciones del maestro con mayor disposición y respeto.',
  'No presta atención a las explicaciones, por lo que le cuesta realizar las actividades. Agradecemos su apoyo para motivar mayor atención.',
  'Requiere trabajar con más orden y disciplina dentro del aula.',
  'Se le dificulta respetar los turnos y escuchar a sus compañeros; trabajaremos juntos en ello.',
  'No concluye las actividades en clase; requiere un mayor compromiso con su trabajo.',
  'Con frecuencia no trae el material solicitado, lo que limita su participación. Agradecemos su apoyo.',
  'Muestra poco interés en las actividades; le animamos a participar más.',
  'Necesita mostrar mayor respeto hacia sus compañeros y hacia el maestro.',
  'Participa poco en clase; le motivamos a atreverse a hablar y a preguntar sus dudas.',
  'Se le invita a cuidar el equipo y los materiales de trabajo.',
  'Ha mostrado una actitud de mejora en las últimas clases; seguiremos apoyándole.'
];
const OBS_MENU = {
  ingles: [
    { t: 'Felicitaciones', l: OBS_BANDA.ingles.buena.concat(OBS_BANDA.ingles.excelente, ['Participa con entusiasmo y alegría en cada clase de inglés.', 'Cada clase suma: su progreso en inglés es notable.', 'Es un gran compañero(a) de equipo y apoya a los demás en clase.']) },
    { t: 'Apoyo y motivación', l: OBS_BANDA.ingles.moderada.concat(OBS_BANDA.ingles.apoyo, OBS_BANDA.ingles.bajo, ['Le ayudará mucho repasar el vocabulario en casa con juegos o tarjetas.', 'Un repaso breve en casa, de unos 10 minutos, será un gran impulso para seguir avanzando.']) },
    { t: 'Atención y conducta', l: OBS_CONDUCTA }
  ],
  compu: [
    { t: 'Felicitaciones', l: OBS_BANDA.compu.buena.concat(OBS_BANDA.compu.excelente, ['Explora con curiosidad en computación y aprende muy rápido.', 'Cada clase suma: está desarrollando habilidades que le servirán toda la vida.', 'Es un gran compañero(a) de equipo y apoya a los demás en clase.']) },
    { t: 'Apoyo y motivación', l: OBS_BANDA.compu.moderada.concat(OBS_BANDA.compu.apoyo, OBS_BANDA.compu.bajo, ['Practicar unos minutos en casa lo que vemos en clase le dará más seguridad.', 'Platicar sobre lo que aprendió en clase le ayudará a recordarlo.']) },
    { t: 'Atención y conducta', l: OBS_CONDUCTA }
  ]
};
const uneObs = (a, b) => { a = String(a || '').trim(); return a ? a + (/[.!?]$/.test(a) ? ' ' : '. ') + b : b; };
const hashStr = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };
/* Observación automática: banda según el promedio y variante estable por alumno/periodo */
function obsAutoTexto(mat, nota, semilla) {
  if (nota == null) return '';
  const B = OBS_BANDA[mat] || OBS_BANDA.ingles;
  const lst = nota < 6 ? B.bajo : nota < 8 ? B.apoyo : nota < 9 ? B.moderada : nota < 9.5 ? B.buena : B.excelente;
  return lst[hashStr(String(semilla || '')) % lst.length];
}

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ANIMOS = ['😟', '🙁', '😐', '🙂', '😄'];
const TAGS_BIT = ['Muy inquietos', 'Se aburrieron', 'Les gustó el juego', 'Faltó tiempo', 'Sobró tiempo', 'Les costó hablar', 'Funcionó el trabajo en parejas', 'Faltó material', 'Mucho ruido', 'Gran avance'];
const MAT_NOMBRE = { ingles: 'Inglés', compu: 'Computación' };
