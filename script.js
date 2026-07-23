// =========================================================
// script.js
// Lógica do site principal (index.html):
// - Carrega todas as famílias/membros do Firestore
// - Busca o convidado pelo NOME COMPLETO + código de acesso
//   fixo (Tela 1)
// - (Etapa 3) Vai exibir e salvar a confirmação (Tela 2)
// =========================================================

// Importa a instância do Firestore configurada em firebase.js
import { db } from "./firebase.js";

// Importa as funções do Firestore que vamos usar:
// collection -> referenciar uma coleção
// getDocs -> buscar todos os documentos de uma coleção
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================================
// Código de acesso fixo, enviado no convite para todos os
// convidados (ex: junto do link do site).
// Para trocar o código, basta mudar o valor abaixo.
// =========================================================
const CODIGO_ACESSO = "1608";

// Variável que vai guardar, em memória, TODAS as famílias
// e seus membros depois de carregados do Firestore.
// Formato: [{ id, nomeFamilia, membros: [{ id, nome, confirmou, dataConfirmacao }] }]
let listaFamilias = [];

// Guarda a família encontrada na busca, para usarmos na Tela 2 (próxima etapa)
let familiaEncontrada = null;

// Elementos da Tela 1
const inputNomeCompleto = document.getElementById("inputNomeCompleto");
const inputCodigo = document.getElementById("inputCodigo");
const btnEntrar = document.getElementById("btnEntrar");
const mensagemErro = document.getElementById("mensagemErro");
const diagnostico = document.getElementById("diagnostico");

// =========================================================
// Função: normalizarTexto
// Remove acentos e transforma em minúsculo, para que a busca
// funcione mesmo se o convidado digitar "joão" ou "JOAO" etc.
// =========================================================
function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD") // separa letras de seus acentos
    .replace(/[\u0300-\u036f]/g, ""); // remove os acentos separados
}

// =========================================================
// Função: extrairPrimeiroNome
// Pega só a primeira palavra de um nome completo.
// Ex: "Maria Silva" -> "Maria"
// =========================================================
function extrairPrimeiroNome(nomeCompleto) {
  return (nomeCompleto || "").trim().split(" ")[0];
}

// =========================================================
// Função: carregarFamilias
// Busca no Firestore todas as famílias e, para cada uma,
// busca também os membros da subcoleção "membros".
// Guarda tudo na variável listaFamilias.
// =========================================================
async function carregarFamilias() {
  listaFamilias = []; // zera a lista antes de carregar

  // Pega todos os documentos da coleção "familias"
  const familiasSnapshot = await getDocs(collection(db, "familias"));

  // Para cada família encontrada, buscamos seus membros também
  for (const familiaDoc of familiasSnapshot.docs) {
    const dadosFamilia = familiaDoc.data();

    // Busca a subcoleção "membros" dentro desta família
    const membrosSnapshot = await getDocs(
      collection(db, "familias", familiaDoc.id, "membros")
    );

    // Monta a lista de membros dessa família
    const membros = membrosSnapshot.docs.map((membroDoc) => ({
      id: membroDoc.id,
      ...membroDoc.data()
    }));

    // Adiciona a família (com seus membros) na lista geral
    listaFamilias.push({
      id: familiaDoc.id,
      nomeFamilia: dadosFamilia.nomeFamilia,
      membros: membros
    });
  }
}

// =========================================================
// Função: buscarConvidado
// Procura, dentro de listaFamilias, um membro cujo nome
// completo (normalizado) bata com o digitado. O código de
// acesso é o mesmo para todos, então é comparado à parte,
// com a constante CODIGO_ACESSO.
// Retorna a família correspondente, ou null se não achar.
// =========================================================
function buscarConvidado(nomeDigitado, codigoDigitado) {
  // Se o código digitado não bater com o código fixo,
  // nem precisa procurar o nome.
  if (codigoDigitado.trim() !== CODIGO_ACESSO) {
    return null;
  }

  const nomeBusca = normalizarTexto(nomeDigitado);

  for (const familia of listaFamilias) {
    const encontrado = familia.membros.some(
      (membro) => normalizarTexto(extrairPrimeiroNome(membro.nome)) === nomeBusca
    );

    if (encontrado) {
      return familia;
    }
  }

  return null; // não encontrou em nenhuma família
}

// =========================================================
// Evento: clique no botão "Entrar"
// =========================================================
btnEntrar.addEventListener("click", () => {
  const nomeDigitado = inputNomeCompleto.value;
  const codigoDigitado = inputCodigo.value;

  // Validação simples: campos vazios
  if (nomeDigitado.trim() === "") {
    mensagemErro.textContent = "Digite seu nome completo.";
    mensagemErro.classList.remove("escondido");
    return;
  }

  if (codigoDigitado.trim() === "") {
    mensagemErro.textContent = "Digite o código de acesso.";
    mensagemErro.classList.remove("escondido");
    return;
  }

  // Busca o convidado na lista carregada em memória
  const resultado = buscarConvidado(nomeDigitado, codigoDigitado);

  if (resultado) {
    // Encontrado: guarda a família encontrada
    familiaEncontrada = resultado;
    mensagemErro.classList.add("escondido");

    // TEMPORÁRIO: por enquanto só avisamos no console.
    // Na Etapa 3 vamos trocar isso por: mostrar a Tela 2
    // com os membros da família em radio buttons.
    console.log("Família encontrada:", familiaEncontrada);
    alert(
      "Família encontrada: " +
        familiaEncontrada.nomeFamilia +
        " (Tela 2 será construída na próxima etapa)"
    );
  } else {
    // Não encontrado: mostra mensagem de erro padrão
    mensagemErro.textContent = "Nome não encontrado na lista de convidados.";
    mensagemErro.classList.remove("escondido");
  }
});

// =========================================================
// Ao carregar a página, já buscamos as famílias no Firestore
// para que a busca do usuário seja instantânea (sem esperar
// o Firestore no momento do clique).
// =========================================================
carregarFamilias()
  .then(() => {
    // DIAGNÓSTICO TEMPORÁRIO: mostra na tela o que foi carregado
    const detalhes = listaFamilias
      .map((f) => {
        const nomesDosMembros = f.membros
          .map((m) => `"${m.nome}"`)
          .join(", ");
        return `Família "${f.nomeFamilia}": ${nomesDosMembros}`;
      })
      .join("\n");

    diagnostico.textContent =
      "DIAGNÓSTICO:\n" +
      "Famílias carregadas: " + listaFamilias.length + "\n" +
      (detalhes || "(nenhuma família encontrada)");
  })
  .catch((erro) => {
    diagnostico.textContent = "ERRO ao carregar do Firestore: " + erro.message;
    diagnostico.style.color = "#e53935";
  });
