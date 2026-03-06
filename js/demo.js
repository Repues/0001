// demo.js v3 — Demo desde Firebase, overlay 3D, lanzado desde hero
import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where, limit, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const DEMO_TOTAL = 10;

let demoNivel     = 'intermedio';
let demoPreguntas = [];
let demoIndex     = 0;
let demoRespuestas= [];
let demoActivo    = false;

// ── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Botón hero
  const btnHero = document.getElementById('btn-demo-hero');
  if (btnHero) btnHero.addEventListener('click', () => abrirOverlayDemo('intermedio'));

  // Tabs dentro del overlay
  document.getElementById('demo-tab-intermedio')?.addEventListener('click', () => cambiarNivel('intermedio'));
  document.getElementById('demo-tab-avanzado')?.addEventListener('click', () => cambiarNivel('avanzado'));

  // Cerrar overlay con ESC o click en backdrop
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarDemo(); });
  document.getElementById('demo-overlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('demo-overlay')) cerrarDemo();
  });

  // Botón cerrar X
  document.getElementById('demo-close')?.addEventListener('click', cerrarDemo);
});

// ── ABRIR OVERLAY ─────────────────────────────────────────────────────────────
async function abrirOverlayDemo(nivel) {
  const overlay = document.getElementById('demo-overlay');
  if (!overlay) return;

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  // Tabs
  document.querySelectorAll('.x-demo-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`demo-tab-${nivel}`)?.classList.add('active');

  demoNivel = nivel;
  await cargarYEmpezar(nivel);
}

function cerrarDemo() {
  const overlay = document.getElementById('demo-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  demoActivo = false;
}

async function cambiarNivel(nivel) {
  document.querySelectorAll('.x-demo-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`demo-tab-${nivel}`)?.classList.add('active');
  demoNivel = nivel;
  await cargarYEmpezar(nivel);
}

// ── CARGAR PREGUNTAS DESDE FIREBASE ──────────────────────────────────────────
async function cargarYEmpezar(nivel) {
  const container = document.getElementById('demo-pregunta-container');
  container.innerHTML = `
    <div style="text-align:center;padding:48px 20px;">
      <div style="width:32px;height:32px;border:3px solid #1F1F1F;border-top-color:#fff;
        border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 16px;"></div>
      <p style="color:#888;font-size:.85rem;">Cargando preguntas de nivel ${nivel}…</p>
    </div>
  `;
  updateDemoProgress(0);

  try {
    const snap = await getDocs(
      query(collection(db, 'preguntas'), where('nivel', '==', nivel))
    );
    let todas = [];
    snap.forEach(d => todas.push({ id: d.id, ...d.data() }));

    // Mezclar y tomar DEMO_TOTAL
    for (let i = todas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [todas[i], todas[j]] = [todas[j], todas[i]];
    }
    demoPreguntas  = todas.slice(0, DEMO_TOTAL);
    demoIndex      = 0;
    demoRespuestas = new Array(demoPreguntas.length).fill(null);
    demoActivo     = true;
    renderDemoPregunta();
    updateDemoProgress();
  } catch(e) {
    console.error('Error cargando demo desde Firebase:', e);
    container.innerHTML = `
      <div style="text-align:center;padding:32px;">
        <p style="color:#C8191E;font-size:.88rem;">⚠️ Error cargando preguntas. Verifica tu conexión.</p>
        <button onclick="window._reintentarDemo && window._reintentarDemo()" 
          style="margin-top:14px;background:#fff;color:#000;border:none;border-radius:7px;
          padding:9px 20px;font-size:.82rem;font-weight:600;cursor:pointer;">
          Reintentar
        </button>
      </div>`;
    window._reintentarDemo = () => cargarYEmpezar(nivel);
  }
}

// ── RENDER PREGUNTA ───────────────────────────────────────────────────────────
function renderDemoPregunta() {
  const p = demoPreguntas[demoIndex];
  const container = document.getElementById('demo-pregunta-container');
  if (!container || !p) return;

  // Mezclar opciones visualmente (igual que simulacro)
  const letrasOrig = ['A','B','C','D'].filter(l => p[l]);
  const letrasOrden = [...letrasOrig];
  // Si ya respondió, NO remezclar — mantener el orden guardado
  const ordenKey = `demo_orden_${demoIndex}`;
  if (!window[ordenKey]) {
    for (let i = letrasOrden.length-1; i > 0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [letrasOrden[i],letrasOrden[j]] = [letrasOrden[j],letrasOrden[i]];
    }
    window[ordenKey] = letrasOrden;
  }
  const orden = window[ordenKey];
  const etiquetas = ['A','B','C','D'];
  const respuesta = demoRespuestas[demoIndex];
  const correctaOriginal = p.correcta?.charAt(0);

  const opcionesHTML = orden.map((letraOrig, pos) => {
    const etq = etiquetas[pos];
    let cls = 'demo-opcion';
    if (respuesta) {
      if (letraOrig === correctaOriginal) cls += ' demo-correcta';
      else if (letraOrig === respuesta)   cls += ' demo-incorrecta';
    }
    return `
      <button class="${cls}" data-letra="${letraOrig}" ${respuesta?'disabled':''}
        onclick="window._responderDemo('${letraOrig}')">
        <span class="demo-letra">${etq}</span>
        <span>${p[letraOrig]}</span>
      </button>`;
  }).join('');

  const feedbackHTML = respuesta ? `
    <div class="demo-feedback ${respuesta===correctaOriginal?'demo-fb-correcto':'demo-fb-incorrecto'}">
      <strong>${respuesta===correctaOriginal?'✅ ¡Correcto!':'❌ Incorrecto'}</strong>
      <p style="margin-top:5px;font-size:.82rem;">📖 ${p.sustento||p.correcta||''}</p>
    </div>` : '';

  const esUltima = demoIndex === demoPreguntas.length - 1;

  container.innerHTML = `
    <div class="demo-header">
      <span class="demo-num">Pregunta ${demoIndex+1} / ${demoPreguntas.length}</span>
      <span class="demo-tema">${p.tema||''}</span>
    </div>
    <p class="demo-texto">${p.Pregunta}</p>
    <div class="demo-opciones">${opcionesHTML}</div>
    ${feedbackHTML}
    <div class="demo-nav">
      <button class="demo-btn-nav" onclick="window._demoNav(-1)" ${demoIndex===0?'disabled':''}>← Anterior</button>
      <button class="demo-btn-nav" onclick="window._demoNav(1)">
        ${esUltima?'Ver resultado ✓':'Siguiente →'}
      </button>
    </div>`;
}

// ── RESULTADO DEMO ────────────────────────────────────────────────────────────
function mostrarResultadoDemo() {
  const correctas = demoRespuestas.filter((r,i) => r === demoPreguntas[i].correcta?.charAt(0)).length;
  const pct = Math.round((correctas/demoPreguntas.length)*100);
  const container = document.getElementById('demo-pregunta-container');

  container.innerHTML = `
    <div style="text-align:center;padding:20px 10px;">
      <div style="font-size:2.8rem;margin-bottom:12px;">${pct>=70?'🏆':'📚'}</div>
      <div style="font-size:1.6rem;font-weight:700;letter-spacing:-.02em;color:${pct>=70?'#10B981':'#EF4444'};margin-bottom:6px;">
        ${pct>=70?'¡Buen resultado!':'Sigue practicando'}
      </div>
      <div style="font-size:2.2rem;font-weight:700;letter-spacing:-.03em;color:#fff;margin-bottom:4px;">
        ${correctas}<span style="font-size:1rem;color:#888;font-weight:400;"> / ${demoPreguntas.length}</span>
      </div>
      <div style="font-size:1rem;color:#888;margin-bottom:20px;">${pct}% de respuestas correctas</div>
      <div style="height:1px;background:#1F1F1F;margin-bottom:20px;"></div>
      <p style="font-size:.85rem;color:#888;max-width:400px;margin:0 auto 24px;line-height:1.6;">
        ${pct>=70
          ? 'Tienes una buena base. Con el simulacro completo de 72 preguntas afinarás tu puntaje con análisis por tema.'
          : 'El simulacro real te ayuda a identificar tus puntos débiles con mapa de calor y análisis por tema.'}
      </p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
        <a href="https://wa.me/51964310396?text=Hola,%20quiero%20inscribirme%20al%20simulacro%20OECE%20Ley%2032069"
           target="_blank"
           style="background:#fff;color:#000;border:none;border-radius:8px;padding:11px 22px;
                  font-family:Inter,sans-serif;font-size:.84rem;font-weight:700;
                  cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:7px;">
          💬 Inscribirme ahora
        </a>
        <button onclick="window._reintentarDemoCompleto()"
          style="background:transparent;color:#888;border:1px solid #1F1F1F;border-radius:8px;
                 padding:11px 20px;font-family:Inter,sans-serif;font-size:.84rem;cursor:pointer;">
          🔄 Reintentar
        </button>
      </div>
    </div>`;
}

// ── PROGRESS ──────────────────────────────────────────────────────────────────
function updateDemoProgress(respondidas) {
  if (respondidas === undefined) respondidas = demoRespuestas.filter(r=>r!==null).length;
  const total = demoPreguntas.length || DEMO_TOTAL;
  const pct   = total ? (respondidas/total)*100 : 0;
  const bar   = document.getElementById('demo-progress-bar');
  if (bar) bar.style.width = pct+'%';
  const label = document.getElementById('demo-progress-label');
  if (label) label.textContent = `${respondidas}/${total} respondidas`;
}

// ── HANDLERS GLOBALES ─────────────────────────────────────────────────────────
window._responderDemo = (letra) => {
  if (demoRespuestas[demoIndex]) return;
  demoRespuestas[demoIndex] = letra;
  renderDemoPregunta();
  updateDemoProgress();
};

window._demoNav = (dir) => {
  const next = demoIndex + dir;
  if (next >= 0 && next < demoPreguntas.length) {
    demoIndex = next;
    renderDemoPregunta();
  } else if (next >= demoPreguntas.length) {
    mostrarResultadoDemo();
  }
};

window._reintentarDemoCompleto = () => {
  // Limpiar órdenes guardados
  for (let i = 0; i < DEMO_TOTAL; i++) delete window[`demo_orden_${i}`];
  cargarYEmpezar(demoNivel);
};

// CSS keyframe para spinner
const style = document.createElement('style');
style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
document.head.appendChild(style);
