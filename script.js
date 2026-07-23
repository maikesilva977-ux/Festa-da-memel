// =========================================================
// script.js
// Lógica do site principal (index.html):
// - Carrega todas as famílias/membros do Firestore
// - Busca o convidado pelo PRIMEIRO NOME + código de acesso
//   fixo (Tela 1)
// - Mostra a Tela 2 com radio buttons e salva a confirmação
//   de presença de cada membro no Firestore
// =========================================================

// Importa a instância do Firestore configurada em firebase.js
import { db } from "./firebase.js";

// Importa as funções do Firestore que vamos usar:
// collection -> referenciar uma coleção
// getDocs -> buscar todos os documentos de uma coleção
// doc -> referenciar um documento específico
// updateDoc -> atualizar campos de um documento existente
// serverTimestamp -> pega a data/hora atual do servidor do Firebase
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =========================================================
// Código de acesso fixo, enviado no convite para todos os
// convidados (ex: junto do link do site).
// Para trocar o código, basta mudar o valor abaixo.
// =========================================================
const CODIGO_ACESSO = "1608";

// Variável que vai guardar, em memória, TODAS as famílias
// e seus membros depois de carregados do Firestore.
// Formato: [{ id, nomeFamilia, membros: [{ id, Nome, Confirmou }] }]
let listaFamilias = [];

// Guarda a família encontrada na busca, para usarmos ao salvar
// a confirmação na Tela 2.
let familiaEncontrada = null;

// Elementos da Tela 1
const inputNomeCompleto = document.getElementById("inputNomeCompleto");
const inputCodigo = document.getElementById("inputCodigo");
const btnEntrar = document.getElementById("btnEntrar");
const mensagemErro = document.getElementById("mensagemErro");

// Elementos das telas (para trocar entre Tela 1 e Tela 2)
const tela1 = document.getElementById("tela1");
const tela2 = document.getElementById("tela2");

// Elementos da Tela 2
const nomeFamiliaTitulo = document.getElementById("nomeFamiliaTitulo");
const listaMembrosDiv = document.getElementById("listaMembros");
const btnConfirmar = document.getElementById("btnConfirmar");
const mensagemSucesso = document.getElementById("mensagemSucesso");

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

  // Pega todos os documentos da coleção "Familias"
  // (nome exato como está cadastrado no Firestore, com F maiúsculo)
  const familiasSnapshot = await getDocs(collection(db, "Familias"));

  // Para cada família encontrada, buscamos seus membros também
  for (const familiaDoc of familiasSnapshot.docs) {
    const dadosFamilia = familiaDoc.data();

    // Busca a subcoleção "membros" dentro desta família
    const membrosSnapshot = await getDocs(
      collection(db, "Familias", familiaDoc.id, "membros")
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
// Procura, dentro de listaFamilias, um membro cujo primeiro
// nome (normalizado) bata com o digitado. O código de
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
      (membro) => normalizarTexto(extrairPrimeiroNome(membro.Nome)) === nomeBusca
    );

    if (encontrado) {
      return familia;
    }
  }

  return null; // não encontrou em nenhuma família
}

// =========================================================
// Função: mostrarTela2
// Esconde a Tela 1, mostra a Tela 2, e gera dinamicamente
// os radio buttons "Vai" / "Não vai" para cada membro
// da família encontrada.
// =========================================================
function mostrarTela2(familia) {
  // Troca de tela
  tela1.classList.add("escondido");
  tela1.classList.remove("ativa");
  tela2.classList.remove("escondido");

  // Mostra o nome da família no título
  nomeFamiliaTitulo.textContent = familia.nomeFamilia;

  // Limpa a lista de membros antes de gerar de novo
  listaMembrosDiv.innerHTML = "";

  // Para cada membro da família, cria um bloco com o nome
  // e os 2 radio buttons (Vai / Não vai)
  familia.membros.forEach((membro) => {
    // Cria o elemento que vai conter o nome + radios desse membro
    const blocoMembro = document.createElement("div");
    blocoMembro.className = "membro-item";

    // O "name" do radio precisa ser único por membro, para que
    // cada pessoa tenha seu próprio grupo de opções (Vai/Não vai)
    // sem interferir nos outros membros.
    const nomeDoGrupoRadio = "membro_" + membro.id;

    blocoMembro.innerHTML = `
      <p class="nome-membro">${membro.Nome}</p>
      <label class="opcao-radio">
        <input type="radio" name="${nomeDoGrupoRadio}" value="vai" />
        Vai
      </label>
      <label class="opcao-radio">
        <input type="radio" name="${nomeDoGrupoRadio}" value="nao" />
        Não vai
      </label>
    `;

    listaMembrosDiv.appendChild(blocoMembro);
  });
}

// =========================================================
// Evento: clique no botão "Entrar"
// =========================================================
btnEntrar.addEventListener("click", () => {
  const nomeDigitado = inputNomeCompleto.value;
  const codigoDigitado = inputCodigo.value;

  // Validação simples: campos vazios
  if (nomeDigitado.trim() === "") {
    mensagemErro.textContent = "Digite seu primeiro nome.";
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
    // Encontrado: guarda a família encontrada e mostra a Tela 2
    familiaEncontrada = resultado;
    mensagemErro.classList.add("escondido");
    mostrarTela2(familiaEncontrada);
  } else {
    // Não encontrado: mostra mensagem de erro padrão
    mensagemErro.textContent = "Nome não encontrado na lista de convidados.";
    mensagemErro.classList.remove("escondido");
  }
});

// =========================================================
// Evento: clique no botão "Confirmar presença" (Tela 2)
// =========================================================
btnConfirmar.addEventListener("click", async () => {
  // Primeiro, verifica se TODOS os membros têm uma opção
  // marcada (Vai ou Não vai). Se faltar algum, avisa e para.
  for (const membro of familiaEncontrada.membros) {
    const nomeDoGrupoRadio = "membro_" + membro.id;
    const opcaoMarcada = document.querySelector(
      `input[name="${nomeDoGrupoRadio}"]:checked`
    );

    if (!opcaoMarcada) {
      alert(
        "Por favor, marque 'Vai' ou 'Não vai' para todos os membros da família."
      );
      return; // para a execução, não salva nada ainda
    }
  }

  // Desabilita o botão enquanto salva, para evitar cliques duplicados
  btnConfirmar.disabled = true;
  btnConfirmar.textContent = "Salvando...";

  try {
    // Para cada membro, salva a escolha no Firestore
    for (const membro of familiaEncontrada.membros) {
      const nomeDoGrupoRadio = "membro_" + membro.id;
      const opcaoMarcada = document.querySelector(
        `input[name="${nomeDoGrupoRadio}"]:checked`
      );

      // Referência do documento desse membro no Firestore
      const referenciaDoMembro = doc(
        db,
        "Familias",
        familiaEncontrada.id,
        "membros",
        membro.id
      );

      // Atualiza o documento com a confirmação e a data/hora atual
      await updateDoc(referenciaDoMembro, {
        Confirmou: opcaoMarcada.value === "vai",
        DataConfirmacao: serverTimestamp()
      });
    }

    // Depois de salvar tudo, esconde o formulário e mostra sucesso
    listaMembrosDiv.classList.add("escondido");
    btnConfirmar.classList.add("escondido");
    mensagemSucesso.classList.remove("escondido");
  } catch (erro) {
    // Se der erro ao salvar, avisa o usuário e reabilita o botão
    alert("Ocorreu um erro ao salvar sua confirmação: " + erro.message);
    btnConfirmar.disabled = false;
    btnConfirmar.textContent = "Confirmar presença";
  }
});

// =========================================================
// Ao carregar a página, já buscamos as famílias no Firestore
// para que a busca do usuário seja instantânea (sem esperar
// o Firestore no momento do clique).
// =========================================================
carregarFamilias().catch((erro) => {
  console.error("Erro ao carregar famílias do Firestore:", erro);
});
