// admin.js — Panel de Administración OECE
import { db } from './firebase-config.js';
import { requireAuth, logout } from './auth.js';
import {
  collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, writeBatch, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let session = null;

document.addEventListener('DOMContentLoaded', () => {
  session = requireAuth('admin');
  if (!session) return;
  initAdmin();
});

function initAdmin() {
  setupNav();
  loadDashboard();
  setupUsuariosTab();
  setupCargaTab();
}

// ── NAVEGACIÓN ──────────────────────────────────────────────────────────────
function setupNav() {
  document.getElementById('btn-logout').addEventListener('click', logout);
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const [usuariosSnap, preguntasSnap, resultadosSnap] = await Promise.all([
      getDocs(collection(db, 'Usuarios')),
      getDocs(collection(db, 'Preguntas')),
      getDocs(collection(db, 'resultados'))
    ]);

    document.getElementById('stat-usuarios').textContent = usuariosSnap.size;
    document.getElementById('stat-preguntas').textContent = preguntasSnap.size;
    document.getElementById('stat-simulacros').textContent = resultadosSnap.size;

    // Calcular promedio
    let totalPct = 0;
    resultadosSnap.forEach(d => { totalPct += (d.data().porcentaje || 0); });
    const avg = resultadosSnap.size > 0 ? (totalPct / resultadosSnap.size).toFixed(1) : '—';
    document.getElementById('stat-promedio').textContent = avg + (resultadosSnap.size > 0 ? '%' : '');

    // Últimos resultados
    loadRecentResults(resultadosSnap);
  } catch (e) {
    console.error('Error cargando dashboard:', e);
  }
}

function loadRecentResults(snap) {
  const tbody = document.getElementById('tabla-resultados');
  if (!tbody) return;
  const rows = [];
  snap.forEach(d => rows.push(d.data()));
  rows.sort((a, b) => (b.fecha?.seconds || 0) - (a.fecha?.seconds || 0));
  tbody.innerHTML = rows.slice(0, 10).map(r => `
    <tr>
      <td>${r.dni || '—'}</td>
      <td>${r.nivel || '—'}</td>
      <td>${r.puntaje || 0}/${r.total || 72}</td>
      <td>
        <span class="badge ${r.porcentaje >= 70 ? 'badge-green' : 'badge-red'}">
          ${(r.porcentaje || 0).toFixed(1)}%
        </span>
      </td>
      <td>${r.fecha ? new Date(r.fecha.seconds * 1000).toLocaleDateString('es-PE') : '—'}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="empty-row">Sin resultados aún</td></tr>';
}

// ── GESTIÓN DE USUARIOS ───────────────────────────────────────────────────────
function setupUsuariosTab() {
  loadUsuarios();
  document.getElementById('btn-nuevo-usuario').addEventListener('click', () => openModal());
  document.getElementById('form-usuario').addEventListener('submit', saveUsuario);
  document.getElementById('btn-cancelar').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', closeModal);
  document.getElementById('input-buscar').addEventListener('input', filterUsuarios);
}

let allUsuarios = [];

async function loadUsuarios() {
  const snap = await getDocs(collection(db, 'Usuarios'));
  allUsuarios = [];
  snap.forEach(d => allUsuarios.push(d.data()));
  renderUsuarios(allUsuarios);
}

function renderUsuarios(list) {
  const tbody = document.getElementById('tabla-usuarios');
  tbody.innerHTML = list.map(u => `
    <tr>
      <td><strong>${u.dni}</strong></td>
      <td>${u.nombre}</td>
      <td><span class="badge badge-nivel-${u.nivel}">${u.nivel}</span></td>
      <td>${u.plan}</td>
      <td>${u.telefono || '—'}</td>
      <td>
        <span class="badge ${u.activo === 'true' ? 'badge-green' : 'badge-red'}">
          ${u.activo === 'true' ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td class="actions-cell">
        <button class="btn-icon btn-edit" onclick="editUsuario('${u.dni}')">✏️</button>
        <button class="btn-icon btn-toggle" onclick="toggleUsuario('${u.dni}', '${u.activo}')">
          ${u.activo === 'true' ? '🔒' : '🔓'}
        </button>
        <button class="btn-icon btn-delete" onclick="deleteUsuario('${u.dni}')">🗑️</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="7" class="empty-row">Sin usuarios registrados</td></tr>';
}

function filterUsuarios(e) {
  const q = e.target.value.toLowerCase();
  renderUsuarios(allUsuarios.filter(u =>
    u.dni.includes(q) || u.nombre.toLowerCase().includes(q)
  ));
}

function openModal(data = null) {
  const modal = document.getElementById('modal-usuario');
  const form = document.getElementById('form-usuario');
  form.reset();
  document.getElementById('modal-title').textContent = data ? 'Editar Usuario' : 'Nuevo Usuario';
  document.getElementById('campo-dni').disabled = !!data;

  if (data) {
    document.getElementById('u-dni').value = data.dni;
    document.getElementById('u-nombre').value = data.nombre;
    document.getElementById('u-nivel').value = data.nivel;
    document.getElementById('u-plan').value = data.plan;
    document.getElementById('u-telefono').value = data.telefono || '';
    document.getElementById('u-activo').value = data.activo;
    // password vacío = no cambiar
  }

  modal.classList.add('active');
  document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-usuario').classList.remove('active');
  document.getElementById('modal-overlay').classList.remove('active');
}

async function saveUsuario(e) {
  e.preventDefault();
  const dni = document.getElementById('u-dni').value.trim();
  const nombre = document.getElementById('u-nombre').value.trim();
  const nivel = document.getElementById('u-nivel').value;
  const plan = document.getElementById('u-plan').value;
  const telefono = document.getElementById('u-telefono').value.trim();
  const activo = document.getElementById('u-activo').value;
  const password = document.getElementById('u-password').value.trim();

  if (!dni || !nombre || !nivel || !plan) {
    showToast('Completa todos los campos obligatorios', 'error'); return;
  }

  const btnSave = document.getElementById('btn-save-usuario');
  btnSave.disabled = true; btnSave.textContent = 'Guardando...';

  try {
    const ref = doc(db, 'Usuarios', dni);
    const existing = await getDoc(ref);
    const dataToSave = { dni, nombre, nivel, plan, telefono, activo };

    if (password) dataToSave.password = password;
    else if (!existing.exists()) { showToast('Contraseña requerida para nuevo usuario', 'error'); return; }

    await setDoc(ref, dataToSave, { merge: true });
    showToast('Usuario guardado exitosamente ✓', 'success');
    closeModal();
    loadUsuarios();
    loadDashboard();
  } catch (err) {
    showToast('Error al guardar: ' + err.message, 'error');
  } finally {
    btnSave.disabled = false; btnSave.textContent = 'Guardar';
  }
}

window.editUsuario = async (dni) => {
  const snap = await getDoc(doc(db, 'Usuarios', dni));
  if (snap.exists()) openModal(snap.data());
};

window.toggleUsuario = async (dni, activo) => {
  const nuevoEstado = activo === 'true' ? 'false' : 'true';
  await updateDoc(doc(db, 'Usuarios', dni), { activo: nuevoEstado });
  showToast(`Usuario ${nuevoEstado === 'true' ? 'activado' : 'desactivado'}`, 'success');
  loadUsuarios();
};

window.deleteUsuario = async (dni) => {
  if (!confirm(`¿Eliminar usuario con DNI ${dni}? Esta acción no se puede deshacer.`)) return;
  await deleteDoc(doc(db, 'Usuarios', dni));
  showToast('Usuario eliminado', 'success');
  loadUsuarios();
  loadDashboard();
};

// ── CARGA MASIVA JSON ────────────────────────────────────────────────────────
function setupCargaTab() {
  const dropzone = document.getElementById('dropzone');
  const inputFile = document.getElementById('input-json');

  dropzone.addEventListener('click', () => inputFile.click());
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
  inputFile.addEventListener('change', e => handleFile(e.target.files[0]));
  document.getElementById('btn-cargar').addEventListener('click', uploadToFirestore);
  document.getElementById('btn-limpiar').addEventListener('click', clearPreview);
}

let jsonData = null;

function handleFile(file) {
  if (!file || !file.name.endsWith('.json')) {
    showToast('Solo se aceptan archivos .json', 'error'); return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      jsonData = JSON.parse(e.target.result);
      if (!Array.isArray(jsonData)) throw new Error('El JSON debe ser un array []');
      renderPreview(jsonData);
    } catch (err) {
      showToast('JSON inválido: ' + err.message, 'error');
      jsonData = null;
    }
  };
  reader.readAsText(file);
}

function renderPreview(data) {
  const container = document.getElementById('preview-container');
  const stats = document.getElementById('preview-stats');
  const intermedio = data.filter(q => q.nivel === 'intermedio').length;
  const avanzado = data.filter(q => q.nivel === 'avanzado').length;
  const temas = [...new Set(data.map(q => q.tema))];

  stats.innerHTML = `
    <div class="preview-stat"><span class="ps-num">${data.length}</span><span class="ps-label">Total preguntas</span></div>
    <div class="preview-stat"><span class="ps-num">${intermedio}</span><span class="ps-label">Intermedio</span></div>
    <div class="preview-stat"><span class="ps-num">${avanzado}</span><span class="ps-label">Avanzado</span></div>
    <div class="preview-stat"><span class="ps-num">${temas.length}</span><span class="ps-label">Temas</span></div>
  `;

  const tbody = document.getElementById('preview-tabla');
  tbody.innerHTML = data.slice(0, 5).map((q, i) => `
    <tr>
      <td>${q.id || 'auto_' + i}</td>
      <td class="pregunta-cell">${q.Pregunta?.substring(0, 60)}...</td>
      <td><span class="badge badge-nivel-${q.nivel}">${q.nivel}</span></td>
      <td>${q.tema}</td>
      <td>${q.correcta?.substring(0, 30)}...</td>
    </tr>
  `).join('');

  if (data.length > 5) {
    tbody.innerHTML += `<tr><td colspan="5" class="empty-row">... y ${data.length - 5} preguntas más</td></tr>`;
  }

  container.style.display = 'block';
  document.getElementById('btn-cargar').disabled = false;
}

async function uploadToFirestore() {
  if (!jsonData) return;
  const btn = document.getElementById('btn-cargar');
  const progress = document.getElementById('upload-progress');
  btn.disabled = true;
  progress.style.display = 'block';

  let success = 0, errors = 0;
  const batchSize = 499; // Firestore límite por batch

  // Dividir en chunks
  for (let i = 0; i < jsonData.length; i += batchSize) {
    const chunk = jsonData.slice(i, i + batchSize);
    const batch = writeBatch(db);

    chunk.forEach((q, idx) => {
      const id = q.id || `pregunta_${String(i + idx + 1).padStart(3, '0')}`;
      const ref = doc(db, 'Preguntas', id);
      const { id: _id, ...rest } = q; // quitar campo id del objeto
      batch.set(ref, rest, { merge: true });
    });

    try {
      await batch.commit();
      success += chunk.length;
    } catch (e) {
      errors += chunk.length;
      console.error('Batch error:', e);
    }

    // Actualizar progress bar
    const pct = Math.round(((i + chunk.length) / jsonData.length) * 100);
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('progress-text').textContent = `Cargando... ${pct}%`;
  }

  document.getElementById('progress-text').textContent =
    `✅ Completado: ${success} preguntas cargadas${errors > 0 ? `, ${errors} con errores` : ''}`;
  showToast(`${success} preguntas sembradas en Firestore ✓`, 'success');
  loadDashboard();
  btn.disabled = false;
}

function clearPreview() {
  jsonData = null;
  document.getElementById('preview-container').style.display = 'none';
  document.getElementById('upload-progress').style.display = 'none';
  document.getElementById('btn-cargar').disabled = true;
  document.getElementById('input-json').value = '';
  document.getElementById('progress-bar').style.width = '0%';
}

// ── TOAST NOTIFICATIONS ───────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}
