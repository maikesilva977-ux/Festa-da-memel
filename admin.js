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
const cardSemConfirmacao = document.getElementById("cardSemConfirmacao");
const cardPercentual = document.getElementById("cardPercentual");
const cardCriancas = document.getElementById("cardCriancas");
const cardConfirmadosSemCriancas = document.getElementById(
  "cardConfirmadosSemCriancas"
);

// Elemento onde as linhas da tabela são inseridas
const corpoTabelaConvidados = document.getElementById("corpoTabelaConvidados");

// Elementos dos filtros e ordenação
const filtroNome = document.getElementById("filtroNome");
const filtroFamilia = document.getElementById("filtroFamilia");
const filtroStatus = document.getElementById("filtroStatus");
const ordenarPor = document.getElementById("ordenarPor");
const btnExportarExcel = document.getElementById("btnExportarExcel");
const btnExportarConfirmados = document.getElementById("btnExportarConfirmados");

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
      // "respondeu" indica se a pessoa já usou o link ao menos
      // uma vez (existe DataConfirmacao). Se nunca respondeu,
      // Confirmou pode estar "false" só por ser o valor padrão
      // cadastrado manualmente, então não confundimos os dois.
      respondeu: !!membro.DataConfirmacao,
      // Se o campo MenorDe10 não existir no Firestore, tratamos
      // como false (ou seja, conta como adulto/criança maior)
      menorDe10: membro.MenorDe10 === true,
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
    (convidado) => convidado.respondeu && convidado.confirmou === true
  ).length;

  // Não confirmados = já respondeu, mas marcou "não vai"
  const totalNaoConfirmados = todosOsConvidados.filter(
    (convidado) => convidado.respondeu && convidado.confirmou === false
  ).length;

  // Sem confirmação = ainda não usou o link nenhuma vez
  const totalSemConfirmacao = todosOsConvidados.filter(
    (convidado) => !convidado.respondeu
  ).length;

  const percentual =
    totalConvidados > 0
      ? Math.round((totalConfirmados / totalConvidados) * 100)
      : 0;

  cardTotalFamilias.textContent = totalFamilias;
  cardTotalConvidados.textContent = totalConvidados;
  cardConfirmados.textContent = totalConfirmados;
  cardNaoConfirmados.textContent = totalNaoConfirmados;
  cardSemConfirmacao.textContent = totalSemConfirmacao;
  cardPercentual.textContent = percentual + "%";

  // Quantidade de crianças menores de 10 anos (não contam para
  // o planejamento final da festa, mas ainda aparecem na tabela)
  const totalCriancas = todosOsConvidados.filter(
    (convidado) => convidado.menorDe10 === true
  ).length;

  // Confirmados que "contam de verdade": confirmaram presença
  // E não são crianças menores de 10 anos
  const totalConfirmadosSemCriancas = todosOsConvidados.filter(
    (convidado) =>
      convidado.respondeu &&
      convidado.confirmou === true &&
      convidado.menorDe10 !== true
  ).length;

  cardCriancas.textContent = totalCriancas;
  cardConfirmadosSemCriancas.textContent = totalConfirmadosSemCriancas;
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
      statusBate = convidado.respondeu && convidado.confirmou === true;
    } else if (statusEscolhido === "nao-confirmados") {
      statusBate = convidado.respondeu && convidado.confirmou === false;
    } else if (statusEscolhido === "sem-confirmacao") {
      statusBate = !convidado.respondeu;
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

    // Define o texto e a cor do status, com base nos 3 estados possíveis
    let classeStatus;
    let textoStatus;

    if (!convidado.respondeu) {
      classeStatus = "status-sem-confirmacao";
      textoStatus = "Sem confirmação";
    } else if (convidado.confirmou) {
      classeStatus = "status-confirmado";
      textoStatus = "Confirmado";
    } else {
      classeStatus = "status-nao-confirmado";
      textoStatus = "Não confirmado";
    }

    // Se for criança menor de 10 anos, adiciona a etiqueta ao lado do nome
    const etiquetaCrianca = convidado.menorDe10
      ? ' <span style="font-size:12px; color:#F9A825;">👶 Criança</span>'
      : "";

    linha.innerHTML = `
      <td>${convidado.nomeFamilia}</td>
      <td>${convidado.nome}${etiquetaCrianca}</td>
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
// Função: gerarArquivoExcel
// Recebe uma lista de convidados já pronta e gera o arquivo
// .xlsx a partir dela. Usada tanto pela exportação "normal"
// (respeitando os filtros da tela) quanto pela exportação
// "só confirmados" (que ignora os filtros da tela).
// =========================================================
function gerarArquivoExcel(lista, nomeDoArquivo) {
  const dadosDaPlanilha = lista.map((convidado) => {
    let textoStatus;
    if (!convidado.respondeu) {
      textoStatus = "Sem confirmação";
    } else if (convidado.confirmou) {
      textoStatus = "Confirmado";
    } else {
      textoStatus = "Não confirmado";
    }

    return {
      Família: convidado.nomeFamilia,
      Pessoa: convidado.nome,
      "Criança (<10)": convidado.menorDe10 ? "Sim" : "Não",
      Status: textoStatus,
      "Data confirmação": formatarData(convidado.dataConfirmacao)
    };
  });

  const planilha = XLSX.utils.json_to_sheet(dadosDaPlanilha);
  const arquivo = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(arquivo, planilha, "Convidados");

  XLSX.writeFile(arquivo, nomeDoArquivo);
}

// =========================================================
// Função: exportarParaExcel
// Exporta a lista respeitando os filtros/ordenação que
// estiverem ativos na tela no momento.
// =========================================================
function exportarParaExcel() {
  const listaParaExportar = obterListaFiltradaEOrdenada();
  gerarArquivoExcel(listaParaExportar, "confirmacoes-2-anos-da-memel.xlsx");
}

// =========================================================
// Função: exportarApenasConfirmados
// Exporta SOMENTE quem confirmou presença (Confirmou = true),
// independente do filtro de status que estiver selecionado
// na tela no momento.
// =========================================================
function exportarApenasConfirmados() {
  const apenasConfirmados = todosOsConvidados.filter(
    (convidado) => convidado.respondeu && convidado.confirmou === true
  );
  gerarArquivoExcel(apenasConfirmados, "confirmados-2-anos-da-memel.xlsx");
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

// Evento do botão de exportar apenas confirmados
btnExportarConfirmados.addEventListener("click", exportarApenasConfirmados);

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
