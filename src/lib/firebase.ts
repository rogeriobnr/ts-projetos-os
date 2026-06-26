// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Substitua este objeto pelas SUAS chaves que o Firebase gerou
const firebaseConfig = {
  apiKey: "AIzaSyC-GxWorHKx4RJy94RuscxIzp1F7nhQlxs",
  authDomain: "ts-projetos-os.firebaseapp.com",
  projectId: "ts-projetos-os",
  storageBucket: "ts-projetos-os.firebasestorage.app",
  messagingSenderId: "44575118686",
  appId: "1:44575118686:web:a05f13307d9d15cc7aabcf",
  measurementId: "G-HR59T8GXJ9",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa e exporta o Banco de Dados (Firestore)
export const db = getFirestore(app);
