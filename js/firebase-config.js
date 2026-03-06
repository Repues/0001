// Firebase Configuration — OECE Simulacro
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAepFznoLoOQ6qkwviWZ5TqFPQsQZPlNuk",
  authDomain: "examen-oece.firebaseapp.com",
  projectId: "examen-oece",
  storageBucket: "examen-oece.firebasestorage.app",
  messagingSenderId: "1001016739766",
  appId: "1:1001016739766:web:bf54a11fd634e7c17fa317",
  measurementId: "G-4JJ17G14RQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
