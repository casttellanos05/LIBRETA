'use strict';
/* Programa de Inglés por niveles: constantes del programa (no son datos del usuario). */
const NIVELES = { 1: 'Descubro', 2: 'Frases', 3: 'Oraciones', 4: 'Diálogos', 5: 'Párrafos y reglas' };
const FASES = ['Presentar', 'Reciclar', 'Aplicar'];
let TOTAL_SESIONES = 22; // sesión 0 = diagnóstico + 7 ciclos x 3 semanas

const CICLOS_BASE = null; const CICLOS = [
  { n: 1, tema: 'Family & Feelings', palabras: 'mom, dad, brother, sister, grandma, grandpa, happy, sad, tired, hungry', recicla: 'saludos, colores, números', producto: 'Póster “My Family”' },
  { n: 2, tema: 'Animals', palabras: 'dog, cat, cow, duck, pig, lion, monkey, shark, elephant, dolphin', recicla: 'familia, colores, números', producto: 'Mini zoológico con tarjetas' },
  { n: 3, tema: 'Food & Preferences', palabras: 'apple, banana, milk, bread, water, breakfast, lunch, dinner, like, don’t like', recicla: 'animales, familia', producto: 'Tiendita o menú' },
  { n: 4, tema: 'Body & Clothes', palabras: 'head, eyes, hands, feet, shirt, pants, dress, shoes, hat, jacket', recicla: 'colores, números, animales, familia', producto: 'Personaje inventado: dibujo y descripción' },
  { n: 5, tema: 'School & My Day', palabras: 'pencil, book, ruler, notebook, Math, English, Monday to Friday, time', recicla: 'números, colores, cuerpo, comida', producto: 'Mi horario ideal' },
  { n: 6, tema: 'My Town & House', palabras: 'park, bank, school, bakery, kitchen, bedroom, next to, behind, turn left, turn right', recicla: 'familia, comida, escuela', producto: 'Mapa “Our Town”' },
  { n: 7, tema: 'My World', palabras: 'sunny, rainy, hot, cold, can, can’t, swim, run, play, read', recicla: 'todos los ciclos anteriores', producto: 'Show final y grabación final' }
];

/* Ciclo 1 detallado: tarea por nivel y semana (índice 0..2 = Presentar, Reciclar, Aplicar) */
const MATERIAL_C1 = [
  'Baraja de 6 tarjetas de familia y la canción en la bocina',
  'Las mismas tarjetas, tarjetas de sentimientos y un tablero de juego con dado',
  'Hoja imprimible con espacio para el póster “My Family”'
];
const TAREAS_C1 = {
  1: ['Toca y repite las 6 palabras con TPR (“Touch mom”)', 'Nombra la tarjeta que le sale en el tablero y mima happy / sad', 'Pega 3 miembros de su familia y dice “Mom”, “Dad”…'],
  2: ['“This is my mom” con tarjetas, en parejas', '“My mom is happy” con el tablero', 'Póster con 4 miembros y una frase por cada uno'],
  3: ['Pregunta y respuesta: “Who is this?” / “This is my brother”', '“How is your dad?” / “He is tired”', 'Póster con 4 oraciones del banco de palabras: “My dad is tall and happy”'],
  4: ['Entrevista: “Do you have a sister?” / “Yes, I do”', 'Diálogo en parejas con vacío de información sobre una familia ficticia', 'Presenta su familia en 5 a 6 oraciones; dictado de 5 palabras'],
  5: ['Preguntas y respuestas con is / has: “She is my aunt”, “He has two sisters”', 'Dictado y corrección de errores en oraciones sobre familias', 'Párrafo “My Family” de 6 oraciones con exposición oral']
};

const DIAGNOSTICO = {
  titulo: 'Diagnóstico y línea base',
  material: 'Seis tarjetas de comandos, cuatro tarjetas de preguntas y una hoja de escritura. Graba un minuto del bloque oral.',
  partes: [
    'A. Escucha y señala (3 min): “Touch something blue”, “Point to the dog”, “Stand up”, “Show me three fingers”',
    'B. Oral en parejas (4 min): “What’s your name?”, “What color is this?”, “What do you like?”, “Tell me about your family”',
    'C. Escritura (3 min): 3 palabras que conozca, una oración sobre su animal favorito y un dictado de 5 palabras'
  ]
};

const RUTINA_CLASE = [
  ['0 a 6', 'Rutina fija', 'Saludo, fecha, clima y la misma canción de siempre'],
  ['6 a 14', 'Recuperar sin mirar', '“¿Qué recuerdas?”: tarjetas volteadas, memoria, adivinanzas del ciclo anterior'],
  ['14 a 24', 'Presentar o reciclar', 'Según la semana del ciclo: TPR, cuento corto o tarjetas'],
  ['24 a 34', 'Juego en movimiento', 'Simon Says, carrera de tarjetas, “Find something…”'],
  ['34 a 46', 'Tarea escalonada', 'Parejas o equipos; cada nivel con su tarea del ciclo'],
  ['46 a 50', 'Cierre', 'Una frase de salida por niño y guardar en portafolio']
];

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

const FRASES_OBS = [
  'Participa con entusiasmo', 'Excelente avance en el periodo', 'Necesita reforzar el vocabulario',
  'Requiere apoyo en casa con el repaso', 'Muestra seguridad al hablar', 'Debe mejorar su participación en clase'
];

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* Tarea genérica por nivel y fase para los ciclos 2 a 7 (el ciclo 1 tiene detalle propio) */
const TAREA_GEN = {
  1: ['Señala y repite las palabras (TPR)', 'Nombra la tarjeta que le toca en el juego', 'Elige y pega 3 palabras en su producto'],
  2: ['Dice la palabra con su color o cantidad: “two red apples”', 'Frases cortas con el tablero: “I see a …”', 'Su producto con una frase por elemento'],
  3: ['Oraciones con apoyo de tarjetas: “I like …”', 'Pregunta y respuesta en parejas con el tablero', 'Su producto con 4 oraciones del banco de palabras'],
  4: ['Mini diálogo guiado en parejas (pregunta y respuesta)', 'Diálogo con vacío de información', 'Presenta su producto en 5 a 6 oraciones; dictado de 5 palabras'],
  5: ['Preguntas y respuestas aplicando la regla del ciclo', 'Dictado y corrección de errores', 'Párrafo corto del producto y exposición oral']
};
const ANIMOS = ['😟', '🙁', '😐', '🙂', '😄'];
const TAGS_BIT = ['Muy inquietos', 'Se aburrieron', 'Les gustó el juego', 'Faltó tiempo', 'Sobró tiempo', 'Les costó hablar', 'Funcionó el trabajo en parejas', 'Faltó material', 'Mucho ruido', 'Gran avance'];
const MAT_NOMBRE = { ingles: 'Inglés', compu: 'Computación' };
