// auth.js — Login, Sesión y Guard de Rutas
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Admin credenciales (ofuscadas, no en Firestore)
const _a = atob('YWRtaW4=');           // 'admin'
const _p = atob('T0VDRUBBZG1pbjIwMjUk'); // 'OECE@Admin2025$'

export async function loginUser(dni, password) {
  // Check admin
  if (dni === _a && password === _p) {
    const session = { dni: 'admin', nombre: 'Administrador', nivel: 'admin', isAdmin: true };
    sessionStorage.setItem('oece_session', JSON.stringify(session));
    return { success: true, role: 'admin' };
  }

  // Check alumno en Firestore
  try {
    const ref = doc(db, 'Usuarios', dni);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { success: false, error: 'DNI no registrado.' };

    const data = snap.data();
    if (data.activo !== 'true') return { success: false, error: 'Cuenta inactiva. Contacta al administrador.' };

    // Verificar vencimiento por fecha
    if (data.fechaFin) {
      const hoy = new Date(); hoy.setHours(0,0,0,0);
      const fin = new Date(data.fechaFin); fin.setHours(0,0,0,0);
      if (fin < hoy) {
        // Marcar como inactivo automáticamente
        try {
          const { updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
          await updateDoc(ref, { activo: 'false' });
        } catch(_) {}
        return { success: false, error: `Tu plan venció el ${data.fechaFin.split('-').reverse().join('/')}. Contacta al administrador para renovar.` };
      }
    }

    if (data.password !== password) return { success: false, error: 'Contraseña incorrecta.' };

    const session = {
      dni: data.dni,
      nombre: data.nombre,
      nivel: data.nivel,
      plan: data.plan,
      telefono: data.telefono,
      isAdmin: false
    };
    sessionStorage.setItem('oece_session', JSON.stringify(session));
    return { success: true, role: 'alumno' };
  } catch (e) {
    return { success: false, error: 'Error de conexión. Intenta nuevamente.' };
  }
}

export function getSession() {
  const s = sessionStorage.getItem('oece_session');
  return s ? JSON.parse(s) : null;
}

export function logout() {
  sessionStorage.removeItem('oece_session');
  window.location.href = 'login.html';
}

// Guard: llama esto en páginas protegidas
export function requireAuth(role = 'alumno') {
  const session = getSession();
  if (!session) { window.location.href = 'login.html'; return null; }
  if (role === 'admin' && !session.isAdmin) { window.location.href = 'alumno.html'; return null; }
  if (role === 'alumno' && session.isAdmin) { window.location.href = 'admin.html'; return null; }
  return session;
}
