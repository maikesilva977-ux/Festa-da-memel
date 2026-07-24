// =========================================================
// confete.js
// Responsável apenas pelo efeito visual de confetes caindo
// na tela. Não mexe em nada do Firebase ou da lógica de
// confirmação de presença — é 100% decorativo.
// =========================================================

// Cores dos confetes, inspiradas na paleta da Magali
const CORES_CONFETE = ["#E53935", "#FDD835", "#43A047"];

// Quantidade de confetes na tela ao mesmo tempo.
// Um número baixo para manter o visual leve, sem exagero.
const QUANTIDADE_CONFETES = 18;

// =========================================================
// Função: criarConfetes
// Cria os elementos visuais dos confetes e adiciona dentro
// do container #confete-container, cada um com uma posição,
// cor, velocidade e atraso (delay) aleatórios, para o efeito
// parecer mais natural (não todos caindo "no mesmo compasso").
// =========================================================
function criarConfetes() {
  const container = document.getElementById("confete-container");

  // Se a página não tiver esse container, não faz nada
  // (evita erro caso o elemento não exista em alguma tela)
  if (!container) {
    return;
  }

  for (let i = 0; i < QUANTIDADE_CONFETES; i++) {
    const confete = document.createElement("div");
    confete.className = "confete-item";

    // Posição horizontal aleatória (0% a 100% da largura da tela)
    const posicaoHorizontal = Math.random() * 100;

    // Duração aleatória da queda (entre 4 e 8 segundos)
    const duracaoQueda = 4 + Math.random() * 4;

    // Atraso aleatório para não começarem todos juntos
    const atraso = Math.random() * 5;

    // Cor aleatória dentre as cores da Magali
    const cor = CORES_CONFETE[Math.floor(Math.random() * CORES_CONFETE.length)];

    confete.style.left = posicaoHorizontal + "%";
    confete.style.animationDuration = duracaoQueda + "s";
    confete.style.animationDelay = atraso + "s";
    confete.style.backgroundColor = cor;

    container.appendChild(confete);
  }
}

// Assim que a página carregar, cria os confetes
criarConfetes();
