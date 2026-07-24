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
import { auth, db } from "./firebase.js";

// Importa as funções de autenticação que vamos usar:
// signInWithEmailAndPassword -> faz login com e-mail/senha
// signOut -> faz logout
// onAuthStateChanged -> "escuta" se o usuário está logado ou não
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Importa as funções do Firestore para buscar as famílias e membros
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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

// Elementos dos cards do dashboard
const cardTotalFamilias = document.getElementById("cardTotalFamilias");
const cardTotalConvidados = document.getElementById("cardTotalConvidados");
const cardConfirmados = document.getElementById("cardConfirmados");
const cardNaoConfirmados = document.getElementById("cardNaoConfirmados");
const cardPercentual = document.getElementById("cardPercentual");

// Guarda, em memória, todas as famílias e membros carregados
// do Firestore (formato igual ao usado no script.js)
let listaFamilias = [];

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
// Função: carregarFamilias
// Busca no Firestore todas as famílias e seus membros,
// igual o site principal faz, e guarda em listaFamilias.
// =========================================================
async function carregarFamilias() {
  listaFamilias = [];

  const familiasSnapshot = await getDocs(collection(db, "Familias"));

  for (const familiaDoc of familiasSnapshot.docs) {
    const dadosFamilia = familiaDoc.data();

    const membrosSnapshot = await getDocs(
      collection(db, "Familias", familiaDoc.id, "membros")
    );

    const membros = membrosSnapshot.docs.map((membroDoc) => ({
      id: membroDoc.id,
      ...membroDoc.data()
    }));

    listaFamilias.push({
      id: familiaDoc.id,
      nomeFamilia: dadosFamilia.nomeFamilia,
      membros: membros
    });
  }
}

// =========================================================
// Função: atualizarDashboard
// Calcula os números gerais (total de famílias, convidados,
// confirmados, não confirmados e percentual) e escreve nos
// cards da tela.
// =========================================================
function atualizarDashboard() {
  const totalFamilias = listaFamilias.length;

  // Junta todos os membros de todas as famílias numa lista só,
  // para facilitar a contagem
  const todosOsMembros = listaFamilias.flatMap((familia) => familia.membros);

  const totalConvidados = todosOsMembros.length;

  // Confirmados = quem tem Confirmou igual a true
  const totalConfirmados = todosOsMembros.filter(
    (membro) => membro.Confirmou === true
  ).length;

  // Não confirmados = todo o resto (marcou "não vai" OU ainda
  // não respondeu nada)
  const totalNaoConfirmados = totalConvidados - totalConfirmados;

  // Percentual de confirmação (evita dividir por zero se não
  // houver nenhum convidado cadastrado ainda)
  const percentual =
    totalConvidados > 0
      ? Math.round((totalConfirmados / totalConvidados) * 100)
      : 0;

  // Escreve os valores calculados em cada card
  cardTotalFamilias.textContent = totalFamilias;
  cardTotalConvidados.textContent = totalConvidados;
  cardConfirmados.textContent = totalConfirmados;
  cardNaoConfirmados.textContent = totalNaoConfirmados;
  cardPercentual.textContent = percentual + "%";
}

// =========================================================
// onAuthStateChanged: fica "escutando" se existe alguém logado.
// Isso roda automaticamente:
// - Assim que a página carrega (para saber se já tinha login salvo)
// - Toda vez que alguém faz login ou logout
// =========================================================
onAuthStateChanged(auth, async (usuario) => {
  if (usuario) {
    // Existe alguém logado: mostra o painel, esconde o login
    telaLogin.classList.add("escondido");
    telaLogin.classList.remove("ativa");
    telaPainel.classList.remove("escondido");

    // Busca os dados do Firestore e atualiza os cards
    try {
      await carregarFamilias();
      atualizarDashboard();
    } catch (erro) {
      alert("Erro ao carregar os dados do painel: " + erro.message);
    }
  } else {
    // Ninguém logado: mostra o login, esconde o painel
    telaPainel.classList.add("escondido");
    telaLogin.classList.remove("escondido");
    telaLogin.classList.add("ativa");
  }
});
