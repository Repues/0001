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
  document.getElementById('alumno-nombre').textContent = session.nombre;
  document.getElementById('alumno-nivel').textContent = session.nivel.charAt(0).toUpperCase() + session.nivel.slice(1);
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
async function iniciarExamen() {
  const btn = document.getElementById('btn-iniciar-examen');
  btn.disabled = true; btn.textContent = 'Cargando preguntas...';

  try {
    // 1. Obtener preguntas usadas (anti-repetición)
    const sesionRef = doc(db, 'sesiones', session.dni);
    const sesionSnap = await getDoc(sesionRef);
    let preguntasUsadas = sesionSnap.exists() ? (sesionSnap.data().preguntasUsadas || []) : [];

    // 2. Obtener TODAS las preguntas del nivel
    const q = query(collection(db, 'Preguntas'), where('nivel', '==', session.nivel));
    const snap = await getDocs(q);
    todasPreguntas = [];
    snap.forEach(d => todasPreguntas.push({ id: d.id, ...d.data() }));

    if (todasPreguntas.length < 10) {
      showToast('No hay suficientes preguntas cargadas para tu nivel. Contacta al administrador.', 'error');
      btn.disabled = false; btn.textContent = 'Iniciar Simulacro';
      return;
    }

    // 3. Algoritmo anti-repetición
    let disponibles = todasPreguntas.filter(p => !preguntasUsadas.includes(p.id));

    // Si no hay suficientes disponibles, resetear y usar todas
    if (disponibles.length < TOTAL_PREGUNTAS) {
      disponibles = todasPreguntas;
      preguntasUsadas = [];
      await setDoc(sesionRef, { preguntasUsadas: [], nivel: session.nivel, ultimaActualizacion: serverTimestamp() });
    }

    // 4. Selección aleatoria sin duplicados
    preguntasExamen = shuffleArray(disponibles).slice(0, Math.min(TOTAL_PREGUNTAS, disponibles.length));
    respuestasAlumno = new Array(preguntasExamen.length).fill(null);
    currentIndex = 0;
    tiempoInicio = Date.now();

    // 5. Mostrar pantalla de examen
    document.getElementById('panel-config').style.display = 'none';
    document.getElementById('panel-examen').style.display = 'block';
    document.getElementById('examen-total').textContent = preguntasExamen.length;

    renderPregunta(currentIndex);
    startTimer();
    renderMapa();

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
  const p = preguntasExamen[idx];
  document.getElementById('num-pregunta').textContent = idx + 1;
  document.getElementById('tema-pregunta').textContent = p.tema || '';
  document.getElementById('texto-pregunta').textContent = p.Pregunta;

  const opcionesContainer = document.getElementById('opciones-container');
  opcionesContainer.innerHTML = '';

  ['A', 'B', 'C', 'D'].forEach(letra => {
    if (!p[letra]) return;
    const btn = document.createElement('button');
    btn.className = 'opcion-btn';
    btn.dataset.letra = letra;
    btn.innerHTML = `<span class="opcion-letra">${letra}</span><span class="opcion-texto">${p[letra]}</span>`;

    // Si ya respondió
    const respuesta = respuestasAlumno[idx];
    if (respuesta) {
      btn.disabled = true;
      if (respuesta === letra) btn.classList.add('selected');

      if (modoCorreccion === 'momento') {
        const correctaLetra = p.correcta?.charAt(0);
        if (letra === correctaLetra) btn.classList.add('correcta');
        if (respuesta === letra && respuesta !== correctaLetra) btn.classList.add('incorrecta');
      }
    }

    btn.addEventListener('click', () => seleccionarRespuesta(idx, letra, btn));
    opcionesContainer.appendChild(btn);
  });

  // Feedback inmediato si ya respondió en modo momento
  if (modoCorreccion === 'momento' && respuestasAlumno[idx]) {
    mostrarFeedbackMomento(idx);
  }

  // Navegación
  document.getElementById('btn-anterior').disabled = idx === 0;
  document.getElementById('btn-siguiente').textContent =
    idx === preguntasExamen.length - 1 ? 'Finalizar' : 'Siguiente →';
  document.getElementById('btn-siguiente').onclick = () => {
    if (idx === preguntasExamen.length - 1) finalizarExamen();
    else { currentIndex++; renderPregunta(currentIndex); renderMapa(); }
  };
  document.getElementById('btn-anterior').onclick = () => {
    if (idx > 0) { currentIndex--; renderPregunta(currentIndex); renderMapa(); }
  };

  // Progreso
  document.getElementById('progreso-bar').style.width = `${((idx + 1) / preguntasExamen.length) * 100}%`;
}

function seleccionarRespuesta(idx, letra, btnClicked) {
  if (respuestasAlumno[idx]) return; // ya respondió

  respuestasAlumno[idx] = letra;

  // Deshabilitar todas las opciones
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

  renderMapa();

  // Auto-avanzar después de 1.5s si hay siguiente
  if (modoCorreccion === 'momento' && currentIndex < preguntasExamen.length - 1) {
    setTimeout(() => { currentIndex++; renderPregunta(currentIndex); renderMapa(); }, 2000);
  }
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

function renderMapa() {
  const mapa = document.getElementById('mapa-preguntas');
  mapa.innerHTML = preguntasExamen.map((_, i) => {
    let cls = 'mapa-item';
    if (i === currentIndex) cls += ' mapa-actual';
    else if (respuestasAlumno[i]) cls += ' mapa-respondida';
    return `<button class="${cls}" onclick="irPregunta(${i})">${i + 1}</button>`;
  }).join('');
}

window.irPregunta = (idx) => { currentIndex = idx; renderPregunta(idx); renderMapa(); };

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
    timerEl.className = restante <= 600 ? 'timer timer-warning' : 'timer';
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

function mostrarResultados(correctas, total, porcentaje, tiempoUsado, detalle) {
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

  // Análisis por tema
  const porTema = {};
  detalle.forEach(d => {
    if (!porTema[d.tema]) porTema[d.tema] = { correctas: 0, total: 0 };
    porTema[d.tema].total++;
    if (d.correcto) porTema[d.tema].correctas++;
  });

  const temasHtml = Object.entries(porTema).map(([tema, stats]) => {
    const pct = Math.round((stats.correctas / stats.total) * 100);
    return `
      <div class="tema-stat">
        <span class="tema-nombre">${tema}</span>
        <div class="tema-bar-container">
          <div class="tema-bar" style="width:${pct}%; background:${pct >= 70 ? 'var(--verde-correcto)' : 'var(--rojo-incorrecto)'}"></div>
        </div>
        <span class="tema-pct">${pct}%</span>
      </div>
    `;
  }).join('');
  document.getElementById('analisis-temas').innerHTML = temasHtml;

  // Revisión de respuestas (solo modo final)
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
    document.getElementById('btn-iniciar-examen').textContent = 'Iniciar Simulacro';
  });
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}
