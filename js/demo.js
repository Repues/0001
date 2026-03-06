// demo.js — Demo Pública con 10 Intermedio + 10 Avanzado (sin Firebase)

const DEMO_PREGUNTAS = {
  intermedio: [
    {
      Pregunta: "¿Qué organismo es el ente rector del sistema de contrataciones del Estado según la Ley 32069?",
      A: "Ministerio de Economía y Finanzas (MEF)",
      B: "Contraloría General de la República (CGR)",
      C: "Organismo Especializado en Contrataciones del Estado (OECE)",
      D: "Presidencia del Consejo de Ministros (PCM)",
      correcta: "C",
      sustento: "Según el Art. 4 de la Ley 32069, la OECE es el organismo técnico especializado, adscrito al MEF, encargado de supervisar y promover las contrataciones eficientes.",
      tema: "generalidades"
    },
    {
      Pregunta: "¿Cuánto tiempo tiene la Entidad para convocar un proceso de selección desde la aprobación del expediente de contratación?",
      A: "15 días hábiles",
      B: "30 días hábiles",
      C: "45 días hábiles",
      D: "60 días hábiles",
      correcta: "B",
      sustento: "El Art. 31 de la Ley 32069 establece que la convocatoria debe realizarse dentro de los 30 días hábiles siguientes a la aprobación del expediente de contratación.",
      tema: "procedimientos"
    },
    {
      Pregunta: "¿Qué es el Plan Anual de Contrataciones (PAC)?",
      A: "Un documento que lista solo los procesos de licitación pública",
      B: "El instrumento de gestión que contiene todas las contrataciones programadas para el año fiscal",
      C: "Un registro de los contratos firmados durante el año anterior",
      D: "Un reglamento interno de la OECE para supervisar compras",
      correcta: "B",
      sustento: "Según el Art. 15 de la Ley 32069, el PAC es el instrumento de gestión logística que contiene las contrataciones a realizarse durante el año fiscal, vinculado al POI institucional.",
      tema: "PAC"
    },
    {
      Pregunta: "¿Cuál es el umbral mínimo para aplicar una Licitación Pública para bienes?",
      A: "Más de 8 UIT",
      B: "Más de 200 UIT",
      C: "Más de 400 UIT",
      D: "Más de 1,200 UIT",
      correcta: "C",
      sustento: "El Art. 22 de la Ley 32069 establece que la Licitación Pública se aplica para bienes y suministros cuyo valor referencial supere las 400 UIT vigentes.",
      tema: "procedimientos"
    },
    {
      Pregunta: "¿Quiénes están impedidos de ser participantes, postores o contratistas según la Ley 32069?",
      A: "Solo los funcionarios del área de logística",
      B: "Los funcionarios y servidores públicos con poder de decisión en la contratación",
      C: "Todos los empleados públicos del Estado",
      D: "Solo el titular de la entidad",
      correcta: "B",
      sustento: "El Art. 11 de la Ley 32069 establece impedimentos para personas naturales y jurídicas vinculadas a funcionarios con poder de decisión en el proceso de contratación.",
      tema: "impedimentos"
    },
    {
      Pregunta: "¿Qué documento emite el Comité de Selección para responder a las consultas y observaciones de los postores?",
      A: "Bases Administrativas",
      B: "Pliego Absolutorio",
      C: "Bases Integradas",
      D: "Acta de Evaluación",
      correcta: "B",
      sustento: "El Pliego Absolutorio es el documento mediante el cual el Comité de Selección da respuesta oficial a las consultas y observaciones presentadas por los participantes, según el Reglamento de la Ley 32069.",
      tema: "comite_seleccion"
    },
    {
      Pregunta: "¿Cuál es la penalidad por mora aplicable en los contratos de la Ley 32069?",
      A: "0.05% del monto del contrato por día, con tope del 5%",
      B: "0.10% del monto del contrato por día, con tope del 10%",
      C: "0.20% del monto del contrato por día, con tope del 15%",
      D: "1% del monto del contrato por día, con tope del 10%",
      correcta: "B",
      sustento: "El Art. 162 del Reglamento de la Ley 32069 establece que la penalidad por mora es de 0.10% por día de atraso, con un tope máximo del 10% del monto del contrato vigente.",
      tema: "penalidades"
    },
    {
      Pregunta: "¿Qué es el Registro Nacional de Proveedores (RNP)?",
      A: "Un registro voluntario para empresas que desean vender al Estado",
      B: "El sistema de información administrado por OECE donde se inscriben los proveedores habilitados para contratar con el Estado",
      C: "Un listado de empresas sancionadas por incumplimiento",
      D: "Un registro de contratos adjudicados mayor a 100 UIT",
      correcta: "B",
      sustento: "El Art. 46 de la Ley 32069 establece que el RNP es el sistema administrado por OECE que registra y habilita a los proveedores para participar en contrataciones con el Estado.",
      tema: "RNP"
    },
    {
      Pregunta: "¿Cuándo se puede resolver un contrato por causa atribuible al contratista?",
      A: "Solo cuando la penalidad por mora supere el 5% del contrato",
      B: "Cuando la penalidad acumulada supere el 10% del monto del contrato",
      C: "Inmediatamente después del primer incumplimiento",
      D: "Solo mediante resolución judicial",
      correcta: "B",
      sustento: "Según el Art. 164 del Reglamento, la Entidad puede resolver el contrato cuando la penalidad por mora o por otras infracciones supere el 10% del monto del contrato.",
      tema: "resolucion_contrato"
    },
    {
      Pregunta: "¿Qué garantía debe presentar el contratista para asegurar el cumplimiento de sus obligaciones?",
      A: "Garantía de seriedad de oferta por el 5% del valor referencial",
      B: "Garantía de fiel cumplimiento por el 10% del monto del contrato",
      C: "Garantía de adelanto por el 20% del monto del contrato",
      D: "Póliza de seguro por el 15% del monto del contrato",
      correcta: "B",
      sustento: "El Art. 148 del Reglamento de la Ley 32069 establece que la garantía de fiel cumplimiento es equivalente al 10% del monto total del contrato, salvo excepciones establecidas.",
      tema: "garantias"
    }
  ],
  avanzado: [
    {
      Pregunta: "¿Cuál es el monto máximo para una Adjudicación Simplificada de bienes y servicios?",
      A: "Hasta 8 UIT",
      B: "Hasta 200 UIT",
      C: "Hasta 400 UIT",
      D: "Hasta 1,200 UIT",
      correcta: "C",
      sustento: "El Art. 23 de la Ley 32069 establece que la Adjudicación Simplificada aplica cuando el valor referencial es superior a 8 UIT y hasta 400 UIT para bienes y servicios en general.",
      tema: "procedimientos"
    },
    {
      Pregunta: "En una Subasta Inversa Electrónica, ¿quién determina el precio inicial del proceso?",
      A: "El postor con mayor experiencia en el rubro",
      B: "La OECE mediante el Listado de Bienes y Servicios Comunes",
      C: "La Entidad en función a su valor referencial",
      D: "El Comité de Selección según cotizaciones previas",
      correcta: "C",
      sustento: "Según el Art. 97 del Reglamento de la Ley 32069, en la SIE la Entidad establece el precio inicial basado en el valor referencial determinado previo al proceso; los postores pujan a la baja.",
      tema: "subasta_inversa"
    },
    {
      Pregunta: "¿Cuál es el porcentaje máximo permitido para prestaciones adicionales en contratos de obra?",
      A: "Hasta el 10% del monto original del contrato",
      B: "Hasta el 15% del monto original del contrato",
      C: "Hasta el 25% del monto original del contrato",
      D: "Hasta el 50% del monto original del contrato",
      correcta: "B",
      sustento: "El Art. 207 del Reglamento de la Ley 32069 establece que el límite para prestaciones adicionales de obra es el 15% del monto del contrato original. Superar este límite requiere autorización de la CGR.",
      tema: "adicionales_obra"
    },
    {
      Pregunta: "¿Qué mecanismo de solución de controversias es obligatorio para contratos de ejecución de obra?",
      A: "Conciliación únicamente",
      B: "Arbitraje institucional obligatorio ante el OECE",
      C: "La Junta de Resolución de Disputas (JRD) para obras mayores a ciertos umbrales",
      D: "Proceso judicial ante el Poder Judicial",
      correcta: "C",
      sustento: "El Art. 220 del Reglamento de la Ley 32069 introduce la JRD (Dispute Board) como mecanismo obligatorio para contratos de obra que superen el umbral establecido por OECE, resolviendo controversias en ejecución.",
      tema: "soluciones_controversias"
    },
    {
      Pregunta: "¿Cuándo procede una Contratación Directa bajo la causal de 'Situación de Emergencia'?",
      A: "Cuando el proceso regular demoraría más de 60 días",
      B: "Ante situaciones extraordinarias e imprevisibles que afecten la continuidad de servicios esenciales",
      C: "Cuando el postor ganador renuncia a la buena pro",
      D: "Para contratar a ex funcionarios con experiencia especializada",
      correcta: "B",
      sustento: "El Art. 28, literal a) de la Ley 32069 establece que la Contratación Directa por emergencia procede ante situaciones extraordinarias e imprevisibles que comprometan la defensa nacional, el orden interno o la continuidad de servicios esenciales.",
      tema: "contratacion_directa"
    },
    {
      Pregunta: "¿Qué sucede si ningún postor califica técnicamente en un Concurso Público?",
      A: "Se adjudica al postor con mayor puntaje económico",
      B: "El proceso se declara desierto y debe convocarse nuevamente",
      C: "Se amplia el plazo para que los postores mejoren su propuesta técnica",
      D: "La Entidad puede contratar directamente con el mejor postor",
      correcta: "B",
      sustento: "Según el Art. 73 del Reglamento de la Ley 32069, cuando ningún postor alcanza el puntaje técnico mínimo, el proceso se declara desierto. La Entidad debe analizar las causas y puede modificar bases antes de convocar nuevamente.",
      tema: "procedimientos"
    },
    {
      Pregunta: "¿Cuál es la consecuencia principal de ser incluido en el Registro de Proveedores Inhabilitados para contratar con el Estado?",
      A: "Solo se suspende la participación en procesos por 6 meses",
      B: "Se impone una multa económica equivalente al valor del contrato",
      C: "Quedan impedidos de participar en cualquier contratación pública durante el período de sanción",
      D: "Se cancela su inscripción en el RNP permanentemente",
      correcta: "C",
      sustento: "El Art. 50 de la Ley 32069 establece que los proveedores sancionados con inhabilitación quedan impedidos de participar en procesos de selección y suscribir contratos con el Estado durante el período que dure la sanción.",
      tema: "infracciones"
    },
    {
      Pregunta: "En el Convenio Marco, ¿cómo realizan las Entidades sus compras una vez publicado el catálogo?",
      A: "Mediante un proceso de comparación de precios entre los proveedores del catálogo",
      B: "A través de una orden de compra directamente a cualquier proveedor del catálogo sin proceso de selección",
      C: "Convocando un proceso de Adjudicación Simplificada entre los proveedores del catálogo",
      D: "Solicitando cotizaciones a mínimo 3 proveedores del catálogo",
      correcta: "B",
      sustento: "El Art. 109 del Reglamento de la Ley 32069 establece que en el Convenio Marco, las Entidades adquieren directamente a través del catálogo electrónico mediante orden de compra, sin necesidad de realizar proceso de selección.",
      tema: "convenio_marco"
    },
    {
      Pregunta: "¿Qué requisito debe cumplir el árbitro de parte en el arbitraje derivado de contratos estatales según la Ley 32069?",
      A: "Ser abogado con mínimo 5 años de ejercicio profesional",
      B: "Estar inscrito en el Registro de Árbitros de OECE",
      C: "Tener especialización en derecho administrativo",
      D: "Ser designado exclusivamente por instituciones arbitrales autorizadas",
      correcta: "B",
      sustento: "El Art. 222 del Reglamento de la Ley 32069 exige que los árbitros que resuelvan controversias en contrataciones estatales estén inscritos en el Registro de Árbitros administrado por OECE, garantizando idoneidad e imparcialidad.",
      tema: "soluciones_controversias"
    },
    {
      Pregunta: "¿Cuál es el plazo máximo para que la Entidad devuelva la garantía de fiel cumplimiento al contratista?",
      A: "Al día siguiente de la firma del contrato",
      B: "Dentro de los 30 días de la conformidad de la última prestación",
      C: "Al vencimiento del plazo de responsabilidad por vicios ocultos",
      D: "Inmediatamente después de la liquidación del contrato",
      correcta: "B",
      sustento: "El Art. 152 del Reglamento de la Ley 32069 establece que la Entidad debe devolver las garantías dentro de los 30 días hábiles siguientes a la conformidad de la última prestación o liquidación final del contrato.",
      tema: "garantias"
    }
  ]
};

// ── ESTADO DE LA DEMO ────────────────────────────────────────────────────────
let demoNivel = 'intermedio';
let demoPreguntas = [];
let demoIndex = 0;
let demoRespuestas = [];

document.addEventListener('DOMContentLoaded', () => {
  setupDemoTabs();
  startDemo('intermedio');
});

function setupDemoTabs() {
  document.getElementById('demo-tab-intermedio')?.addEventListener('click', () => startDemo('intermedio'));
  document.getElementById('demo-tab-avanzado')?.addEventListener('click', () => startDemo('avanzado'));
}

function startDemo(nivel) {
  demoNivel = nivel;
  demoPreguntas = DEMO_PREGUNTAS[nivel];
  demoIndex = 0;
  demoRespuestas = new Array(demoPreguntas.length).fill(null);

  // Update tabs
  document.querySelectorAll('.demo-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`demo-tab-${nivel}`)?.classList.add('active');

  renderDemoPregunta();
  updateDemoProgress();
}

function renderDemoPregunta() {
  const p = demoPreguntas[demoIndex];
  const container = document.getElementById('demo-pregunta-container');
  if (!container) return;

  const respuesta = demoRespuestas[demoIndex];

  container.innerHTML = `
    <div class="demo-header">
      <span class="demo-num">Pregunta ${demoIndex + 1} de ${demoPreguntas.length}</span>
      <span class="demo-tema">${p.tema}</span>
    </div>
    <p class="demo-texto">${p.Pregunta}</p>
    <div class="demo-opciones">
      ${['A', 'B', 'C', 'D'].map(l => `
        <button class="demo-opcion ${respuesta ? (l === p.correcta ? 'demo-correcta' : (l === respuesta ? 'demo-incorrecta' : 'demo-disabled')) : ''}"
          data-letra="${l}"
          ${respuesta ? 'disabled' : ''}
          onclick="responderDemo('${l}')">
          <span class="demo-letra">${l}</span>
          <span>${p[l]}</span>
        </button>
      `).join('')}
    </div>
    ${respuesta ? `
      <div class="demo-feedback ${respuesta === p.correcta ? 'demo-fb-correcto' : 'demo-fb-incorrecto'}">
        <strong>${respuesta === p.correcta ? '✅ ¡Correcto!' : '❌ Incorrecto'}</strong>
        <p>📖 ${p.sustento}</p>
      </div>
    ` : ''}
    <div class="demo-nav">
      <button class="demo-btn-nav" onclick="demoNavegar(-1)" ${demoIndex === 0 ? 'disabled' : ''}>← Anterior</button>
      <button class="demo-btn-nav demo-btn-primary" onclick="demoNavegar(1)">
        ${demoIndex === demoPreguntas.length - 1 ? 'Ver Resultado' : 'Siguiente →'}
      </button>
    </div>
  `;
}

window.responderDemo = (letra) => {
  demoRespuestas[demoIndex] = letra;
  renderDemoPregunta();
  updateDemoProgress();
};

window.demoNavegar = (dir) => {
  const newIndex = demoIndex + dir;
  if (newIndex >= 0 && newIndex < demoPreguntas.length) {
    demoIndex = newIndex;
    renderDemoPregunta();
  } else if (newIndex >= demoPreguntas.length) {
    mostrarResultadoDemo();
  }
};

function updateDemoProgress() {
  const respondidas = demoRespuestas.filter(r => r !== null).length;
  const pct = (respondidas / demoPreguntas.length) * 100;
  const bar = document.getElementById('demo-progress-bar');
  if (bar) bar.style.width = pct + '%';
  const label = document.getElementById('demo-progress-label');
  if (label) label.textContent = `${respondidas}/${demoPreguntas.length} respondidas`;
}

function mostrarResultadoDemo() {
  const correctas = demoRespuestas.filter((r, i) => r === demoPreguntas[i].correcta).length;
  const pct = Math.round((correctas / demoPreguntas.length) * 100);
  const container = document.getElementById('demo-pregunta-container');

  container.innerHTML = `
    <div class="demo-resultado">
      <div class="demo-resultado-icon">${pct >= 70 ? '🏆' : '📚'}</div>
      <h3 class="demo-resultado-titulo ${pct >= 70 ? 'texto-aprobado' : 'texto-desaprobado'}">
        ${pct >= 70 ? '¡Buen resultado!' : 'Sigue practicando'}
      </h3>
      <div class="demo-resultado-puntaje">${correctas} / ${demoPreguntas.length}</div>
      <div class="demo-resultado-pct">${pct}%</div>
      <p class="demo-resultado-msg">
        ${pct >= 70
          ? 'Tienes una buena base. Con nuestro simulacro completo de 72 preguntas afinarás tu puntaje.'
          : 'El simulacro real te ayudará a identificar tus puntos débiles con análisis por tema.'}
      </p>
      <div class="demo-resultado-cta">
        <a href="https://wa.me/51964310396?text=Hola,%20quiero%20inscribirme%20al%20simulacro%20OECE%20Ley%2032069"
           target="_blank" class="btn-whatsapp-demo">
          💬 Inscríbete y practica las 72 preguntas reales
        </a>
        <button class="demo-btn-reiniciar" onclick="startDemo('${demoNivel}')">🔄 Reintentar demo</button>
      </div>
    </div>
  `;
}
