// =========================================================
// admin.js
// Lógica da página admin.html:
// - Login com e-mail e senha (Firebase Authentication)
// - Logout
// - Dashboard (cards com números gerais)
// - Tabela de convidados, com filtros, ordenação e exportação
//   para Excel
//
// IMPORTANTE: as senhas dos administradores NÃO ficam neste
// arquivo. Elas são cadastradas no console do Firebase, em
// Authentication > Users. Este código apenas ENVIA o que foi
// digitado para o Firebase conferir.
// =========================================================

// Importa a instância de Authentication e Firestore configuradas em firebase.js
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

// Elemento onde as linhas da tabela são inseridas
const corpoTabelaConvidados = document.getElementById("corpoTabelaConvidados");

// Elementos dos filtros e ordenação
const filtroNome = document.getElementById("filtroNome");
const filtroFamilia = document.getElementById("filtroFamilia");
const filtroStatus = document.getElementById("filtroStatus");
const ordenarPor = document.getElementById("ordenarPor");
const btnExportarExcel = document.getElementById("btnExportarExcel");

// Guarda, em memória, todas as famílias e membros carregados
// do Firestore (formato igual ao usado no script.js)
let listaFamilias = [];

// Guarda a lista "achatada" de convidados (um item por pessoa,
// já juntando o nome da família), para facilitar filtro/ordenação
let todosOsConvidados = [];

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
// Função: montarListaDeConvidados
// Transforma listaFamilias (que tem famílias com membros
// dentro) numa lista "achatada", um item por pessoa, para
// facilitar filtrar, ordenar e exportar.
// =========================================================
function montarListaDeConvidados() {
  todosOsConvidados = listaFamilias.flatMap((familia) =>
    familia.membros.map((membro) => ({
      nomeFamilia: familia.nomeFamilia,
      nome: membro.Nome,
      confirmou: membro.Confirmou === true,
      // Converte o Timestamp do Firestore para um objeto Date
      // do JavaScript (ou null, se ainda não confirmou)
      dataConfirmacao: membro.DataConfirmacao
        ? membro.DataConfirmacao.toDate()
        : null
    }))
  );
}

// =========================================================
// Função: atualizarDashboard
// Calcula os números gerais (total de famílias, convidados,
// confirmados, não confirmados e percentual) e escreve nos
// cards da tela.
// =========================================================
function atualizarDashboard() {
  const totalFamilias = listaFamilias.length;
  const totalConvidados = todosOsConvidados.length;

  const totalConfirmados = todosOsConvidados.filter(
    (convidado) => convidado.confirmou === true
  ).length;

  const totalNaoConfirmados = totalConvidados - totalConfirmados;

  const percentual =
    totalConvidados > 0
      ? Math.round((totalConfirmados / totalConvidados) * 100)
      : 0;

  cardTotalFamilias.textContent = totalFamilias;
  cardTotalConvidados.textContent = totalConvidados;
  cardConfirmados.textContent = totalConfirmados;
  cardNaoConfirmados.textContent = totalNaoConfirmados;
  cardPercentual.textContent = percentual + "%";
}

// =========================================================
// Função: formatarData
// Converte um objeto Date (ou null) para um texto de data/hora
// legível, no formato brasileiro. Se for null, retorna "-".
// =========================================================
function formatarData(data) {
  if (!data) {
    return "-";
  }

  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// =========================================================
// Função: normalizarTexto
// Remove acentos e transforma em minúsculo, para os campos
// de busca funcionarem mesmo digitando diferente (ex: "joao"
// encontra "João").
// =========================================================
function normalizarTexto(texto) {
  return (texto || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// =========================================================
// Função: obterListaFiltradaEOrdenada
// Aplica os filtros de nome, família e status, e depois
// ordena de acordo com o critério escolhido. Retorna uma
// NOVA lista (não mexe na lista original todosOsConvidados).
// =========================================================
function obterListaFiltradaEOrdenada() {
  const textoBuscaNome = normalizarTexto(filtroNome.value);
  const textoBuscaFamilia = normalizarTexto(filtroFamilia.value);
  const statusEscolhido = filtroStatus.value; // "todos" | "confirmados" | "nao-confirmados"
  const criterioOrdenacao = ordenarPor.value; // "familia" | "nome" | "data"

  // 1) Filtra
  let listaFiltrada = todosOsConvidados.filter((convidado) => {
    const nomeBate = normalizarTexto(convidado.nome).includes(textoBuscaNome);
    const familiaBate = normalizarTexto(convidado.nomeFamilia).includes(
      textoBuscaFamilia
    );

    let statusBate = true;
    if (statusEscolhido === "confirmados") {
      statusBate = convidado.confirmou === true;
    } else if (statusEscolhido === "nao-confirmados") {
      statusBate = convidado.confirmou !== true;
    }

    return nomeBate && familiaBate && statusBate;
  });

  // 2) Ordena (usamos [...listaFiltrada] para não alterar a ordem original)
  listaFiltrada = [...listaFiltrada].sort((a, b) => {
    if (criterioOrdenacao === "nome") {
      return normalizarTexto(a.nome).localeCompare(normalizarTexto(b.nome));
    }

    if (criterioOrdenacao === "data") {
      // Quem ainda não confirmou (data = null) fica sempre por último
      if (!a.dataConfirmacao && !b.dataConfirmacao) return 0;
      if (!a.dataConfirmacao) return 1;
      if (!b.dataConfirmacao) return -1;
      return a.dataConfirmacao - b.dataConfirmacao;
    }

    // Padrão: ordenar por família
    return normalizarTexto(a.nomeFamilia).localeCompare(
      normalizarTexto(b.nomeFamilia)
    );
  });

  return listaFiltrada;
}

// =========================================================
// Função: renderizarTabela
// Monta as linhas da tabela de convidados a partir de uma
// lista já filtrada/ordenada, com a cor verde (confirmado)
// ou vermelha (não confirmado).
// =========================================================
function renderizarTabela(lista) {
  corpoTabelaConvidados.innerHTML = "";

  lista.forEach((convidado) => {
    const linha = document.createElement("tr");

    const classeStatus = convidado.confirmou
      ? "status-confirmado"
      : "status-nao-confirmado";
    const textoStatus = convidado.confirmou ? "Confirmado" : "Não confirmado";

    linha.innerHTML = `
      <td>${convidado.nomeFamilia}</td>
      <td>${convidado.nome}</td>
      <td class="${classeStatus}">${textoStatus}</td>
      <td>${formatarData(convidado.dataConfirmacao)}</td>
    `;

    corpoTabelaConvidados.appendChild(linha);
  });
}

// =========================================================
// Função: aplicarFiltrosEOrdenacao
// Função "central" chamada sempre que algum filtro ou a
// ordenação muda: recalcula a lista filtrada/ordenada e
// atualiza a tabela na tela.
// =========================================================
function aplicarFiltrosEOrdenacao() {
  const listaFiltrada = obterListaFiltradaEOrdenada();
  renderizarTabela(listaFiltrada);
}

// =========================================================
// Função: exportarParaExcel
// Gera um arquivo .xlsx com a lista atualmente filtrada/
// ordenada na tela, usando a biblioteca SheetJS (XLSX).
// =========================================================
function exportarParaExcel() {
  const listaParaExportar = obterListaFiltradaEOrdenada();

  // Monta os dados no formato de planilha: um array de objetos,
  // onde cada chave vira uma coluna
  const dadosDaPlanilha = listaParaExportar.map((convidado) => ({
    Família: convidado.nomeFamilia,
    Pessoa: convidado.nome,
    Status: convidado.confirmou ? "Confirmado" : "Não confirmado",
    "Data confirmação": formatarData(convidado.dataConfirmacao)
  }));

  // Cria a planilha e o arquivo Excel
  const planilha = XLSX.utils.json_to_sheet(dadosDaPlanilha);
  const arquivo = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(arquivo, planilha, "Convidados");

  // Faz o download do arquivo no celular/computador do admin
  XLSX.writeFile(arquivo, "confirmacoes-2-anos-da-memel.xlsx");
}

// =========================================================
// Eventos dos filtros e ordenação: toda vez que o admin
// digita ou muda uma opção, atualiza a tabela na hora.
// =========================================================
filtroNome.addEventListener("input", aplicarFiltrosEOrdenacao);
filtroFamilia.addEventListener("input", aplicarFiltrosEOrdenacao);
filtroStatus.addEventListener("change", aplicarFiltrosEOrdenacao);
ordenarPor.addEventListener("change", aplicarFiltrosEOrdenacao);

// Evento do botão de exportar
btnExportarExcel.addEventListener("click", exportarParaExcel);

// =========================================================
// Evento: clique no botão "Entrar" (login)
// =========================================================
btnLogin.addEventListener("click", async () => {
  const email = inputEmail.value.trim();
  const senha = inputSenha.value;

  if (email === "" || senha === "") {
    mensagemErroLogin.textContent = "Preencha e-mail e senha.";
    mensagemErroLogin.classList.remove("escondido");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Entrando...";

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    mensagemErroLogin.classList.add("escondido");
  } catch (erro) {
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
});

// =========================================================
// onAuthStateChanged: fica "escutando" se existe alguém logado.
// Isso roda automaticamente:
// - Assim que a página carrega (para saber se já tinha login salvo)
// - Toda vez que alguém faz login ou logout
// =========================================================
onAuthStateChanged(auth, async (usuario) => {
  if (usuario) {
    telaLogin.classList.add("escondido");
    telaLogin.classList.remove("ativa");
    telaPainel.classList.remove("escondido");

    try {
      await carregarFamilias();
      montarListaDeConvidados();
      atualizarDashboard();
      aplicarFiltrosEOrdenacao();
    } catch (erro) {
      alert("Erro ao carregar os dados do painel: " + erro.message);
    }
  } else {
    telaPainel.classList.add("escondido");
    telaLogin.classList.remove("escondido");
    telaLogin.classList.add("ativa");
  }
});
