// simulacro.js — Motor de Examen 72 Preguntas + Anti-Repetición + Flashcards
import { db } from './firebase-config.js';
import { requireAuth, logout, getSession } from './auth.js';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, addDoc,
  query, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let session = null;
let todasPreguntas = [];
let preguntasExamen = [];
let respuestasAlumno = [];
let currentIndex = 0;
let timerInterval = null;
let tiempoInicio = null;
let modoCorreccion = 'final'; // 'momento' | 'final'
const TOTAL_PREGUNTAS = 72;
const TIEMPO_LIMITE = 120 * 60; // 120 minutos en segundos

// Flashcards data
const FLASHCARDS = [
  { termino: "OECE", definicion: "Organismo Especializado en Contrataciones del Estado. Ente rector del sistema de contrataciones según Art. 4 Ley 32069." },
  { termino: "PAC", definicion: "Plan Anual de Contrataciones. Instrumento de gestión que contiene las contrataciones a realizarse durante el año fiscal." },
  { termino: "Adjudicación Simplificada", definicion: "Procedimiento para bienes y servicios cuyo valor referencial sea superior a las 8 UIT y hasta 400 UIT." },
  { termino: "Licitación Pública", definicion: "Procedimiento para la contratación de bienes, suministros y obras cuando el valor referencial supere los umbrales establecidos." },
  { termino: "Concurso Público", definicion: "Procedimiento de selección para la contratación de servicios en general y consultorías, cuando el valor supere el umbral." },
  { termino: "Contratación Directa", definicion: "Modalidad excepcional que permite contratar sin proceso de selección bajo causales taxativas del Art. 28 Ley 32069." },
  { termino: "RNP", definicion: "Registro Nacional de Proveedores. Registro administrado por OECE donde se inscriben los proveedores del Estado." },
  { termino: "Expediente de Contratación", definicion: "Conjunto de documentos que sustenta el proceso desde la decisión de adquirir hasta la liquidación del contrato." },
  { termino: "Valor Referencial", definicion: "Monto determinado por la Entidad para prever el costo de la contratación y elegir el procedimiento adecuado." },
  { termino: "Garantía de Fiel Cumplimiento", definicion: "Garantía del 10% del monto del contrato que el proveedor debe presentar para asegurar el cumplimiento de sus obligaciones." },
  { termino: "Penalidad por Mora", definicion: "Sanción económica equivalente al 0.10% del monto del contrato por día de atraso, con tope del 10% del contrato." },
  { termino: "Subasta Inversa Electrónica", definicion: "Procedimiento de selección para contratar bienes y servicios comunes incluidos en el Listado de Bienes y Servicios Comunes." },
  { termino: "Convenio Marco", definicion: "Modalidad por la que OECE selecciona proveedores con quienes las Entidades pueden contratar directamente." },
  { termino: "Adicional de Obra", definicion: "Prestación no considerada en el expediente técnico, indispensable para alcanzar la meta del contrato. Máximo 15% del monto." },
  { termino: "Árbitro", definicion: "Tercero imparcial que resuelve controversias derivadas de la ejecución del contrato mediante el proceso de arbitraje." },
  { termino: "UIT", definicion: "Unidad Impositiva Tributaria. Valor de referencia usado para determinar umbrales de contratación y sanciones." },
  { termino: "Comité de Selección", definicion: "Órgano colegiado encargado de organizar, conducir y ejecutar el proceso de selección hasta su culminación." },
  { termino: "Bases Integradas", definicion: "Documento definitivo del proceso de selección que incorpora las modificaciones realizadas vía absolución de consultas y observaciones." },
];

document.addEventListener('DOMContentLoaded', () => {
  session = requireAuth('alumno');
  if (!session) return;
  initAlumno();
});

function initAlumno() {
  const nombreEl = document.getElementById('alumno-nombre');
  if (nombreEl) nombreEl.textContent = session.nombre;
  document.getElementById('btn-logout').addEventListener('click', logout);

  setupNavAlumno();
  initFlashcards();

  // Setup simulacro config
  document.getElementById('btn-iniciar-examen').addEventListener('click', iniciarExamen);
  document.getElementById('modo-correccion').addEventListener('change', e => {
    modoCorreccion = e.target.value;
  });
}

// ── NAVEGACIÓN ALUMNO ─────────────────────────────────────────────────────────
function setupNavAlumno() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ── FLASHCARDS ────────────────────────────────────────────────────────────────
function initFlashcards() {
  let currentCard = 0;
  let flipped = false;
  renderFlashcard(currentCard);

  document.getElementById('btn-flip').addEventListener('click', () => {
    flipped = !flipped;
    document.getElementById('flashcard').classList.toggle('flipped', flipped);
  });
  document.getElementById('btn-prev-card').addEventListener('click', () => {
    currentCard = (currentCard - 1 + FLASHCARDS.length) % FLASHCARDS.length;
    flipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    renderFlashcard(currentCard);
  });
  document.getElementById('btn-next-card').addEventListener('click', () => {
    currentCard = (currentCard + 1) % FLASHCARDS.length;
    flipped = false;
    document.getElementById('flashcard').classList.remove('flipped');
    renderFlashcard(currentCard);
  });
  document.getElementById('flashcard').addEventListener('click', () => {
    flipped = !flipped;
    document.getElementById('flashcard').classList.toggle('flipped', flipped);
  });
}

function renderFlashcard(idx) {
  const card = FLASHCARDS[idx];
  document.getElementById('card-front-text').textContent = card.termino;
  document.getElementById('card-back-text').textContent = card.definicion;
  document.getElementById('card-counter').textContent = `${idx + 1} / ${FLASHCARDS.length}`;
}

// ── SIMULACRO ENGINE ──────────────────────────────────────────────────────────

/*
  LÓGICA DE PLANES:
  - INTERMEDIO: 60% preguntas intermedio + 40% avanzado (fijo, sin opción)
  - AVANZADO:   El alumno elige el modo antes de iniciar:
                  · "100% Avanzado"
                  · "Mixto" (60% avanzado + 40% intermedio, sin porcentajes fijos visibles)
*/

async function iniciarExamen() {
  const btn = document.getElementById('btn-iniciar-examen');
  btn.disabled = true; btn.textContent = 'Cargando preguntas...';

  const modoExamen = session.nivel === 'avanzado'
    ? (document.getElementById('modo-examen')?.value || '100avanzado')
    : 'mixto_intermedio'; // intermedio siempre es 50/50

  try {
    // 1. Obtener sesión anti-repetición
    const sesionRef = doc(db, 'sesiones', session.dni);
    const sesionSnap = await getDoc(sesionRef);
    const sesionData = sesionSnap.exists() ? sesionSnap.data() : {};
    let usadasInt = sesionData.usadasIntermedio || [];
    let usadasAdv = sesionData.usadasAvanzado   || [];

    // 2. Cargar banco de preguntas según lo que necesitamos
    const necesitaInt = modoExamen === 'mixto_intermedio' || modoExamen === 'mixto_avanzado';
    const necesitaAdv = true; // todos los modos necesitan banco avanzado

    let bancoInt = [], bancoAdv = [];

    if (modoExamen === 'mixto_intermedio' || necesitaInt) {
      const snapI = await getDocs(query(collection(db, 'Preguntas'), where('nivel', '==', 'intermedio')));
      snapI.forEach(d => bancoInt.push({ id: d.id, ...d.data() }));
    }
    if (necesitaAdv || modoExamen === '100avanzado') {
      const snapA = await getDocs(query(collection(db, 'Preguntas'), where('nivel', '==', 'avanzado')));
      snapA.forEach(d => bancoAdv.push({ id: d.id, ...d.data() }));
    }

    // 3. Determinar cantidades según plan y modo
    let cantInt = 0, cantAdv = 0;

    if (modoExamen === 'mixto_intermedio') {
      // Plan Intermedio: 50% intermedio + 50% avanzado
      cantInt = Math.round(TOTAL_PREGUNTAS * 0.50); // 36
      cantAdv = TOTAL_PREGUNTAS - cantInt;           // 36
    } else if (modoExamen === '100avanzado') {
      // Plan Avanzado modo puro: 100% avanzado
      cantInt = 0;
      cantAdv = TOTAL_PREGUNTAS; // 72
    } else if (modoExamen === 'mixto_avanzado') {
      // Plan Avanzado modo mixto: ~60% avanzado + ~40% intermedio (aleatorio dentro del rango)
      const pctAdv = 0.55 + Math.random() * 0.15; // entre 55% y 70%, varía cada vez
      cantAdv = Math.round(TOTAL_PREGUNTAS * pctAdv);
      cantInt = TOTAL_PREGUNTAS - cantAdv;
    }

    // 4. Función de selección anti-repetición con reset automático
    function seleccionar(banco, usadas, cantidad) {
      if (cantidad === 0) return { seleccionadas: [], nuevasUsadas: usadas };
      let disponibles = banco.filter(p => !usadas.includes(p.id));
      if (disponibles.length < cantidad) {
        // Reset: ya vio todas, reiniciar ciclo
        disponibles = banco;
        usadas = [];
      }
      const seleccionadas = shuffleArray(disponibles).slice(0, Math.min(cantidad, disponibles.length));
      const nuevasUsadas = [...new Set([...usadas, ...seleccionadas.map(p => p.id)])];
      return { seleccionadas, nuevasUsadas };
    }

    const resInt = seleccionar(bancoInt, usadasInt, cantInt);
    const resAdv = seleccionar(bancoAdv, usadasAdv, cantAdv);

    if (resInt.seleccionadas.length + resAdv.seleccionadas.length < 10) {
      showToast('No hay suficientes preguntas cargadas. Contacta al administrador.', 'error');
      btn.disabled = false; btn.textContent = 'Iniciar Simulacro';
      return;
    }

    // 5. Mezclar todas las preguntas seleccionadas aleatoriamente
    preguntasExamen = shuffleArray([...resInt.seleccionadas, ...resAdv.seleccionadas]);
    respuestasAlumno = new Array(preguntasExamen.length).fill(null);
    currentIndex = 0;
    tiempoInicio = Date.now();

    // 6. Guardar IDs usados en Firestore
    await setDoc(sesionRef, {
      usadasIntermedio: resInt.nuevasUsadas,
      usadasAvanzado:   resAdv.nuevasUsadas,
      nivel: session.nivel,
      ultimaActualizacion: serverTimestamp()
    });

    // 7. Mostrar examen con overlay
    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('panel-examen').style.display = 'block';
    const overlay = document.getElementById('examen-overlay');
    if (overlay) overlay.style.display = 'flex';
    document.getElementById('examen-total').textContent = preguntasExamen.length;

    renderPregunta(currentIndex);
    startTimer();

  } catch (e) {
    console.error(e);
    showToast('Error al cargar preguntas: ' + e.message, 'error');
    btn.disabled = false; btn.textContent = 'Iniciar Simulacro';
  }
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function renderPregunta(idx) {
  // Reset feedback y timers
  const feedbackEl = document.getElementById('feedback-momento');
  feedbackEl.style.display = 'none';
  feedbackEl.innerHTML = '';
  if (window._autoAvanceTimer) { clearTimeout(window._autoAvanceTimer); window._autoAvanceTimer = null; }

  // Animación de entrada en la tarjeta
  const card = document.getElementById('examen-card');
  if (card) {
    card.style.animation = 'none';
    card.offsetHeight; // reflow
    card.style.animation = 'cardIn 0.32s cubic-bezier(0.34,1.56,0.64,1)';
  }

  const p = preguntasExamen[idx];

  // Contador y progreso
  document.getElementById('num-pregunta').textContent = idx + 1;
  document.getElementById('tema-pregunta').textContent = p.tema || '';
  document.getElementById('texto-pregunta').textContent = p.Pregunta;
  document.getElementById('progreso-bar').style.width = `${((idx + 1) / preguntasExamen.length) * 100}%`;

  // Contador omitidas
  const omitidas = respuestasAlumno.filter(r => r === null).length;
  const omEl = document.getElementById('omitidas-count');
  if (omEl) omEl.textContent = omitidas;

  // Opciones — mezclar orden aleatoriamente para evitar memorización por posición
  const opcionesContainer = document.getElementById('opciones-container');
  opcionesContainer.innerHTML = '';

  // Construir array de opciones disponibles con su letra original
  const letrasOriginales = ['A', 'B', 'C', 'D'].filter(l => p[l]);
  // Mezclar Fisher-Yates
  const letrasOrden = [...letrasOriginales];
  for (let i = letrasOrden.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letrasOrden[i], letrasOrden[j]] = [letrasOrden[j], letrasOrden[i]];
  }
  // Etiquetas visuales A/B/C/D para el orden mezclado
  const etiquetasVisuales = ['A', 'B', 'C', 'D'];

  letrasOrden.forEach((letraOriginal, posicion) => {
    const etiquetaVisual = etiquetasVisuales[posicion];
    const btn = document.createElement('button');
    btn.className = 'opcion-btn';
    btn.dataset.letra = letraOriginal; // letra real para validación Firebase
    btn.dataset.visual = etiquetaVisual; // etiqueta que ve el alumno
    btn.innerHTML = `<span class="opcion-letra">${etiquetaVisual}</span><span class="opcion-texto">${p[letraOriginal]}</span>`;

    const respuesta = respuestasAlumno[idx];
    if (respuesta) {
      btn.disabled = true;
      if (respuesta === letraOriginal) btn.classList.add('selected');
      if (modoCorreccion === 'momento') {
        const correctaLetra = p.correcta?.charAt(0);
        if (letraOriginal === correctaLetra) btn.classList.add('correcta');
        if (respuesta === letraOriginal && respuesta !== correctaLetra) btn.classList.add('incorrecta');
      }
    }
    btn.addEventListener('click', () => seleccionarRespuesta(idx, letraOriginal, btn));
    opcionesContainer.appendChild(btn);
  });

  if (modoCorreccion === 'momento' && respuestasAlumno[idx]) mostrarFeedbackMomento(idx);

  // Navegación
  const btnAnt = document.getElementById('btn-anterior');
  const btnSig = document.getElementById('btn-siguiente');

  btnAnt.disabled = idx === 0;
  btnSig.textContent = idx === preguntasExamen.length - 1 ? 'Finalizar ✓' : 'Siguiente →';

  btnSig.onclick = () => {
    if (idx === preguntasExamen.length - 1) {
      finalizarExamen();
      return;
    }
    // Aviso si no respondió esta pregunta
    if (!respuestasAlumno[idx]) {
      const continuar = confirm('⚠️ No has respondido esta pregunta.\n\nAl hacer clic en "Aceptar" la estarás omitiendo y pasará como sin respuesta.\n\n¿Deseas continuar?');
      if (!continuar) return;
    }
    currentIndex++;
    renderPregunta(currentIndex);
  };

  btnAnt.onclick = () => {
    if (idx > 0) { currentIndex--; renderPregunta(currentIndex); }
  };
}

function seleccionarRespuesta(idx, letra, btnClicked) {
  if (respuestasAlumno[idx]) return;
  respuestasAlumno[idx] = letra;

  document.querySelectorAll('.opcion-btn').forEach(b => {
    b.disabled = true;
    if (b.dataset.letra === letra) b.classList.add('selected');
  });

  if (modoCorreccion === 'momento') {
    const p = preguntasExamen[idx];
    const correctaLetra = p.correcta?.charAt(0);
    document.querySelectorAll('.opcion-btn').forEach(b => {
      if (b.dataset.letra === correctaLetra) b.classList.add('correcta');
    });
    if (letra !== correctaLetra) btnClicked.classList.add('incorrecta');
    mostrarFeedbackMomento(idx);
  }

  // Actualizar contador omitidas
  const omitidas = respuestasAlumno.filter(r => r === null).length;
  const omEl = document.getElementById('omitidas-count');
  if (omEl) omEl.textContent = omitidas;
}

function mostrarFeedbackMomento(idx) {
  const p = preguntasExamen[idx];
  const correctaLetra = p.correcta?.charAt(0);
  const esCorrecto = respuestasAlumno[idx] === correctaLetra;
  const feedbackEl = document.getElementById('feedback-momento');
  feedbackEl.className = `feedback-box ${esCorrecto ? 'feedback-correcto' : 'feedback-incorrecto'}`;
  feedbackEl.innerHTML = `
    <div class="feedback-header">${esCorrecto ? '✅ ¡Correcto!' : '❌ Incorrecto'}</div>
    <div class="feedback-sustento">${p.correcta}</div>
  `;
  feedbackEl.style.display = 'block';
}

// renderMapa eliminado — ya no se usa el mapa de preguntas
function renderMapa() {} // no-op, mantenido por compatibilidad

window.irPregunta = (idx) => { currentIndex = idx; renderPregunta(idx); };

// Exponer finalizarExamen para el botón superior
window._finalizarExamen = () => finalizarExamen();

// ── TIMER ─────────────────────────────────────────────────────────────────────
function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - tiempoInicio) / 1000);
    const restante = TIEMPO_LIMITE - elapsed;

    if (restante <= 0) { clearInterval(timerInterval); finalizarExamen(); return; }

    const min = Math.floor(restante / 60).toString().padStart(2, '0');
    const seg = (restante % 60).toString().padStart(2, '0');
    const timerEl = document.getElementById('timer');
    timerEl.textContent = `${min}:${seg}`;
    timerEl.className = restante <= 600 ? 'card-timer warn' : 'card-timer';
  }, 1000);
}

// ── FINALIZAR ─────────────────────────────────────────────────────────────────
async function finalizarExamen() {
  clearInterval(timerInterval);
  const tiempoUsado = Math.floor((Date.now() - tiempoInicio) / 1000);

  // Calcular resultados
  let correctas = 0;
  const detalle = preguntasExamen.map((p, i) => {
    const correctaLetra = p.correcta?.charAt(0);
    const respuesta = respuestasAlumno[i];
    const esCorrecto = respuesta === correctaLetra;
    if (esCorrecto) correctas++;
    return { id: p.id, respuesta: respuesta || 'S/R', correcta: correctaLetra, correcto: esCorrecto, tema: p.tema };
  });

  const porcentaje = parseFloat(((correctas / preguntasExamen.length) * 100).toFixed(2));

  // Guardar resultado en Firestore
  try {
    await addDoc(collection(db, 'resultados'), {
      dni: session.dni,
      nivel: session.nivel,
      puntaje: correctas,
      total: preguntasExamen.length,
      porcentaje,
      tiempoUsado,
      fecha: serverTimestamp(),
      respuestas: detalle
    });

    // Actualizar sesión anti-repetición
    const sesionRef = doc(db, 'sesiones', session.dni);
    const sesionSnap = await getDoc(sesionRef);
    const usadas = sesionSnap.exists() ? (sesionSnap.data().preguntasUsadas || []) : [];
    const nuevasUsadas = [...new Set([...usadas, ...preguntasExamen.map(p => p.id)])];
    await setDoc(sesionRef, { preguntasUsadas: nuevasUsadas, nivel: session.nivel, ultimaActualizacion: serverTimestamp() });
  } catch (e) { console.error('Error guardando resultado:', e); }

  // Mostrar resultados
  mostrarResultados(correctas, preguntasExamen.length, porcentaje, tiempoUsado, detalle);
}

async function mostrarResultados(correctas, total, porcentaje, tiempoUsado, detalle) {
  // Ocultar overlay del examen
  const overlay = document.getElementById('examen-overlay');
  if (overlay) overlay.style.display = 'none';
  document.getElementById('panel-examen').style.display = 'none';
  document.getElementById('panel-resultados').style.display = 'block';

  const aprobado = porcentaje >= 70;
  document.getElementById('resultado-icon').textContent = aprobado ? '🏆' : '📚';
  document.getElementById('resultado-titulo').textContent = aprobado ? '¡Aprobado!' : 'Sigue practicando';
  document.getElementById('resultado-titulo').className = aprobado ? 'resultado-aprobado' : 'resultado-desaprobado';
  document.getElementById('resultado-puntaje').textContent = `${correctas} / ${total}`;
  document.getElementById('resultado-porcentaje').textContent = `${porcentaje}%`;
  const min = Math.floor(tiempoUsado / 60), seg = tiempoUsado % 60;
  document.getElementById('resultado-tiempo').textContent = `${min}m ${seg}s`;

  // ── ANÁLISIS POR TEMA (sesión actual) ────────────────────────────────────────
  const porTemaActual = {};
  detalle.forEach(d => {
    if (!porTemaActual[d.tema]) porTemaActual[d.tema] = { correctas: 0, total: 0 };
    porTemaActual[d.tema].total++;
    if (d.correcto) porTemaActual[d.tema].correctas++;
  });

  const temasHtml = Object.entries(porTemaActual).map(([tema, stats]) => {
    const pct = Math.round((stats.correctas / stats.total) * 100);
    return `
      <div class="tema-stat">
        <span class="tema-nombre">${tema}</span>
        <div class="tema-bar-container">
          <div class="tema-bar" style="width:${pct}%; background:${pct >= 70 ? 'var(--verde)' : pct >= 40 ? 'var(--amarillo)' : 'var(--rojo-error)'}"></div>
        </div>
        <span class="tema-pct">${pct}%</span>
      </div>
    `;
  }).join('');
  document.getElementById('analisis-temas').innerHTML = temasHtml;

  // ── MAPA DE CALOR COMBINADO ───────────────────────────────────────────────────
  renderMapaCalorCombinado(porTemaActual);

  // ── REVISIÓN DE RESPUESTAS (solo modo final) ──────────────────────────────────
  if (modoCorreccion === 'final') {
    const revisionHtml = detalle.map((d, i) => {
      const p = preguntasExamen[i];
      return `
        <div class="revision-item ${d.correcto ? 'revision-correcta' : 'revision-incorrecta'}">
          <div class="revision-num">Pregunta ${i + 1} — ${p.tema}</div>
          <div class="revision-pregunta">${p.Pregunta}</div>
          <div class="revision-respuesta">Tu respuesta: <strong>${d.respuesta}</strong> ${d.correcto ? '✅' : '❌'}</div>
          ${!d.correcto ? `<div class="revision-correcta-label">Respuesta correcta: <strong>${p.correcta}</strong></div>` : ''}
        </div>
      `;
    }).join('');
    document.getElementById('revision-respuestas').innerHTML = revisionHtml;
  }

  document.getElementById('btn-nuevo-examen').addEventListener('click', () => {
    document.getElementById('panel-resultados').style.display = 'none';
    document.getElementById('panel-config').style.display = 'block';
    document.getElementById('btn-iniciar-examen').disabled = false;
    document.getElementById('btn-iniciar-examen').textContent = '🚀 Iniciar Simulacro';
    // Resetear overlay por si acaso
    const overlay = document.getElementById('examen-overlay');
    if (overlay) overlay.style.display = 'none';
  });
}

// ── MAPA DE CALOR COMBINADO ───────────────────────────────────────────────────
async function renderMapaCalorCombinado(porTemaActual) {
  const contenedor = document.getElementById('mapa-calor-container');
  if (!contenedor) return;
  contenedor.innerHTML = '<p style="color:var(--gris-suave); font-size:0.85rem;">Cargando historial...</p>';

  // 1. Traer historial de Firestore (últimas 8 sesiones del alumno)
  let historial = [];
  try {
    const { getDocs: gd, collection: col, query: q, where: w, orderBy: ob, limit: lim } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await gd(q(
      col(db, 'resultados'),
      w('dni', '==', session.dni),
      ob('fecha', 'desc'),
      lim(8)
    ));
    snap.forEach(d => historial.push(d.data()));
    historial.reverse(); // cronológico: más antiguo primero
  } catch (e) {
    console.warn('No se pudo cargar historial:', e);
  }

  // 2. Recopilar todos los temas que aparecen en la sesión actual
  const temas = Object.keys(porTemaActual).sort();
  if (temas.length === 0) { contenedor.innerHTML = ''; return; }

  // 3. Función para obtener pct de un tema en una sesión histórica
  function pctTemaSesion(sesion, tema) {
    if (!sesion?.respuestas) return null;
    const delTema = sesion.respuestas.filter(r => r.tema === tema);
    if (delTema.length === 0) return null;
    const ok = delTema.filter(r => r.correcto).length;
    return Math.round((ok / delTema.length) * 100);
  }

  // 4. Función color según porcentaje
  function colorCalor(pct) {
    if (pct === null) return { bg: 'rgba(255,255,255,0.04)', text: 'var(--gris-suave)', label: '—' };
    if (pct >= 85) return { bg: 'rgba(16,185,129,0.75)',  text: '#fff', label: `${pct}%` };
    if (pct >= 70) return { bg: 'rgba(16,185,129,0.40)',  text: '#fff', label: `${pct}%` };
    if (pct >= 50) return { bg: 'rgba(245,158,11,0.55)',  text: '#fff', label: `${pct}%` };
    if (pct >= 30) return { bg: 'rgba(239,68,68,0.45)',   text: '#fff', label: `${pct}%` };
    return           { bg: 'rgba(239,68,68,0.80)',         text: '#fff', label: `${pct}%` };
  }

  // 5. Calcular promedios históricos por tema (excluyendo sesión actual)
  function promedioHistorico(tema) {
    const vals = historial.map(s => pctTemaSesion(s, tema)).filter(v => v !== null);
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }

  // 6. Determinar tendencia (↑ ↓ → )
  function tendencia(tema, pctActual) {
    const hist = historial.map(s => pctTemaSesion(s, tema)).filter(v => v !== null);
    if (hist.length < 2) return { icon: '🆕', color: 'var(--gris-suave)', label: 'Primera vez' };
    const promAnterior = Math.round(hist.slice(-2).reduce((a,b) => a+b, 0) / Math.min(2, hist.length));
    const diff = pctActual - promAnterior;
    if (diff >= 10) return { icon: '↑', color: 'var(--verde)', label: `+${diff}%` };
    if (diff <= -10) return { icon: '↓', color: 'var(--rojo-error)', label: `${diff}%` };
    return { icon: '→', color: 'var(--amarillo)', label: `${diff > 0 ? '+' : ''}${diff}%` };
  }

  // 7. Columnas: historial (hasta 8) + sesión actual
  const colsHistorial = historial.map((s, i) => ({
    label: `S${i + 1}`,
    fecha: s.fecha ? new Date(s.fecha.seconds * 1000).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit' }) : `#${i+1}`
  }));

  // 8. Render HTML
  const totalCols = colsHistorial.length + 1; // +1 para "Actual"

  let html = `
    <style>
      .heatmap-wrap { overflow-x: auto; }
      .heatmap-table { border-collapse: separate; border-spacing: 3px; width: 100%; min-width: 520px; }
      .hm-th { font-size: 0.72rem; color: var(--gris-suave); text-align: center;
                padding: 4px 6px; white-space: nowrap; font-weight: 600; }
      .hm-th.actual-col { color: var(--dorado); }
      .hm-tema { font-size: 0.78rem; color: rgba(255,255,255,0.8); padding: 4px 8px;
                 white-space: nowrap; text-transform: capitalize; }
      .hm-cell { border-radius: 6px; text-align: center; padding: 7px 4px;
                 font-size: 0.75rem; font-weight: 700; transition: transform 0.15s;
                 cursor: default; position: relative; }
      .hm-cell:hover { transform: scale(1.08); z-index: 2; }
      .hm-cell.actual { box-shadow: 0 0 0 2px var(--dorado); }
      .tend-badge { display: inline-flex; align-items: center; gap: 3px;
                    font-size: 0.72rem; font-weight: 700; padding: 2px 7px;
                    border-radius: 12px; background: rgba(255,255,255,0.08); }
      .hm-legend { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px;
                   align-items: center; font-size: 0.78rem; color: var(--gris-suave); }
      .hm-legend-item { display: flex; align-items: center; gap: 5px; }
      .hm-legend-dot { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; }
      .hm-section-title { font-size: 0.78rem; color: var(--gris-suave); text-transform: uppercase;
                           letter-spacing: 0.08em; margin-bottom: 6px; }
    </style>

    <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px;" class="hm-top-grid">
      <!-- Tarjetas resumen -->
      <div style="background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius); padding:16px;">
        <div class="hm-section-title">✅ Temas dominados (≥70%)</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${temas.filter(t => {
              const p = Math.round((porTemaActual[t].correctas/porTemaActual[t].total)*100);
              return p >= 70;
            }).map(t => `<span style="background:rgba(16,185,129,0.2);color:#34D399;padding:3px 10px;border-radius:20px;font-size:0.78rem;">${t}</span>`).join('')
            || '<span style="color:var(--gris-suave);font-size:0.82rem;">Ninguno aún</span>'}
        </div>
      </div>
      <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius); padding:16px;">
        <div class="hm-section-title">🔴 Temas a reforzar (&lt;50%)</div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${temas.filter(t => {
              const p = Math.round((porTemaActual[t].correctas/porTemaActual[t].total)*100);
              return p < 50;
            }).map(t => `<span style="background:rgba(239,68,68,0.2);color:#FC8181;padding:3px 10px;border-radius:20px;font-size:0.78rem;">${t}</span>`).join('')
            || '<span style="color:var(--gris-suave);font-size:0.82rem;">¡Ninguno! 💪</span>'}
        </div>
      </div>
    </div>

    <div class="heatmap-wrap">
      <table class="heatmap-table">
        <thead>
          <tr>
            <th class="hm-th" style="text-align:left;">Tema</th>
            ${colsHistorial.map(c => `<th class="hm-th" title="${c.fecha}">${c.label}<br><span style="font-weight:400;opacity:0.7;">${c.fecha}</span></th>`).join('')}
            <th class="hm-th actual-col">⭐ Actual</th>
            <th class="hm-th" style="min-width:70px;">Tendencia</th>
            <th class="hm-th">Promedio</th>
          </tr>
        </thead>
        <tbody>
          ${temas.map(tema => {
            const pctActual = Math.round((porTemaActual[tema].correctas / porTemaActual[tema].total) * 100);
            const colorAct = colorCalor(pctActual);
            const tend = tendencia(tema, pctActual);
            const promHist = promedioHistorico(tema);
            const colorProm = colorCalor(promHist);

            const celdaHistorial = colsHistorial.map((_, i) => {
              const pct = pctTemaSesion(historial[i], tema);
              const c = colorCalor(pct);
              return `<td><div class="hm-cell" style="background:${c.bg};color:${c.text};">${c.label}</div></td>`;
            }).join('');

            return `
              <tr>
                <td class="hm-tema">${tema.replace(/_/g,' ')}</td>
                ${celdaHistorial}
                <td><div class="hm-cell actual" style="background:${colorAct.bg};color:${colorAct.text};">${colorAct.label}</div></td>
                <td style="text-align:center;"><span class="tend-badge" style="color:${tend.color};">${tend.icon} ${tend.label}</span></td>
                <td><div class="hm-cell" style="background:${colorProm.bg};color:${colorProm.text};">${colorProm.label}</div></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <div class="hm-legend">
      <span>Escala de colores:</span>
      <div class="hm-legend-item"><div class="hm-legend-dot" style="background:rgba(16,185,129,0.75);"></div> ≥85% Excelente</div>
      <div class="hm-legend-item"><div class="hm-legend-dot" style="background:rgba(16,185,129,0.40);"></div> 70–84% Aprobado</div>
      <div class="hm-legend-item"><div class="hm-legend-dot" style="background:rgba(245,158,11,0.55);"></div> 50–69% Regular</div>
      <div class="hm-legend-item"><div class="hm-legend-dot" style="background:rgba(239,68,68,0.45);"></div> 30–49% Débil</div>
      <div class="hm-legend-item"><div class="hm-legend-dot" style="background:rgba(239,68,68,0.80);"></div> &lt;30% Crítico</div>
      <div class="hm-legend-item"><div class="hm-legend-dot" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);"></div> Sin datos</div>
    </div>
  `;

  contenedor.innerHTML = html;

  // Ajustar grid de tarjetas en móvil
  const topGrid = contenedor.querySelector('.hm-top-grid');
  if (topGrid && window.innerWidth < 600) topGrid.style.gridTemplateColumns = '1fr';
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}
