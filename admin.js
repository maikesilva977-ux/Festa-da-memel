// =========================================================
// admin.js
// Lógica da página admin.html:
// - Login com e-mail e senha (Firebase Authentication)
// - Logout
// - Controle de qual tela mostrar (login ou painel)
//
// IMPORTANTE: as senhas dos administradores NÃO ficam neste
// arquivo. Elas são cadastradas no console do Firebase, em
// Authentication > Users. Este código apenas ENVIA o que foi
// digitado para o Firebase conferir.
// =========================================================

// Importa a instância de Authentication configurada em firebase.js
import { auth } from "./firebase.js";

// Importa as funções de autenticação que vamos usar:
// signInWithEmailAndPassword -> faz login com e-mail/senha
// signOut -> faz logout
// onAuthStateChanged -> "escuta" se o usuário está logado ou não
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Elementos da tela de login
const inputEmail = document.getElementById("inputEmail");
const inputSenha = document.getElementById("inputSenha");
const btnLogin = document.getElementById("btnLogin");
const mensagemErroLogin = document.getElementById("mensagemErroLogin");

// Elementos das telas (para trocar entre login e painel)
const telaLogin = document.getElementById("telaLogin");
const telaPainel = document.getElementById("telaPainel");

// Botão de sair (dentro do painel)
const btnSair = document.getElementById("btnSair");

// =========================================================
// Evento: clique no botão "Entrar" (login)
// =========================================================
btnLogin.addEventListener("click", async () => {
  const email = inputEmail.value.trim();
  const senha = inputSenha.value;

  // Validação simples: campos vazios
  if (email === "" || senha === "") {
    mensagemErroLogin.textContent = "Preencha e-mail e senha.";
    mensagemErroLogin.classList.remove("escondido");
    return;
  }

  // Desabilita o botão enquanto tenta logar, para evitar cliques duplicados
  btnLogin.disabled = true;
  btnLogin.textContent = "Entrando...";

  try {
    // Tenta fazer login no Firebase Authentication.
    // Se der certo, o onAuthStateChanged (lá embaixo) detecta
    // sozinho e troca para a tela do painel.
    await signInWithEmailAndPassword(auth, email, senha);
    mensagemErroLogin.classList.add("escondido");
  } catch (erro) {
    // Se o e-mail ou senha estiverem errados, o Firebase retorna
    // um erro, que mostramos de forma amigável para o usuário.
    mensagemErroLogin.textContent = "E-mail ou senha inválidos.";
    mensagemErroLogin.classList.remove("escondido");
  } finally {
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
  }
});

// =========================================================
// Evento: clique no botão "Sair" (logout)
// =========================================================
btnSair.addEventListener("click", async () => {
  await signOut(auth);
  // O onAuthStateChanged detecta sozinho e volta para a tela de login
});

// =========================================================
// onAuthStateChanged: fica "escutando" se existe alguém logado.
// Isso roda automaticamente:
// - Assim que a página carrega (para saber se já tinha login salvo)
// - Toda vez que alguém faz login ou logout
// =========================================================
onAuthStateChanged(auth, (usuario) => {
  if (usuario) {
    // Existe alguém logado: mostra o painel, esconde o login
    telaLogin.classList.add("escondido");
    telaLogin.classList.remove("ativa");
    telaPainel.classList.remove("escondido");
  } else {
    // Ninguém logado: mostra o login, esconde o painel
    telaPainel.classList.add("escondido");
    telaLogin.classList.remove("escondido");
    telaLogin.classList.add("ativa");
  }
});
