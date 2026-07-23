// =========================================================
// firebase.js
// Responsável por inicializar o Firebase e exportar as
// instâncias do Firestore (banco de dados) e do Authentication
// (login do admin) para serem usadas em outros arquivos
// (script.js e admin.js).
// =========================================================

// Importa a função de inicialização do app Firebase (via CDN, SDK v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Importa as funções do Firestore (banco de dados) que vamos precisar
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Importa as funções de Authentication (login do admin)
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Configuração do projeto Firebase (gerada no console do Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyDT4eVydSqaxXY26IeKCRF9zc0tZUBlaFc",
  authDomain: "memel-e0552.firebaseapp.com",
  projectId: "memel-e0552",
  storageBucket: "memel-e0552.firebasestorage.app",
  messagingSenderId: "582363573473",
  appId: "1:582363573473:web:da3d280f363edbc9051ba0",
  measurementId: "G-8RC4TDP2KX"
};

// Inicializa o app do Firebase com as configurações acima
const app = initializeApp(firebaseConfig);

// Cria a instância do Firestore (banco de dados onde ficam
// as famílias e os membros)
const db = getFirestore(app);

// Cria a instância do Authentication (usada apenas na
// página admin.html para login por email e senha)
const auth = getAuth(app);

// Exporta as instâncias para que outros arquivos JS
// (script.js e admin.js) possam importar e usar:
// import { db, auth } from "./firebase.js";
export { db, auth };
