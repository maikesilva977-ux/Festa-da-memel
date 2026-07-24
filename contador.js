// =========================================================
// contador.js
// Responsável apenas por calcular e mostrar o tempo restante
// até a data da festa. Não mexe em nada do Firebase ou da
// lógica de confirmação — é 100% informativo/decorativo.
// =========================================================

// Data e horário da festa (formato: ano, mês [0-11], dia, hora, minuto)
// Atenção: no JavaScript, o mês começa em 0 (Janeiro = 0),
// por isso Agosto é o número 7, não 8.
const DATA_DA_FESTA = new Date(2026, 7, 16, 16, 0, 0);

// =========================================================
// Função: atualizarContador
// Calcula a diferença entre agora e a data da festa, e
// escreve o resultado (dias, horas, minutos, segundos)
// no elemento #contador da página.
// =========================================================
function atualizarContador() {
  const elementoContador = document.getElementById("contador");

  // Se a página não tiver esse elemento, não faz nada
  if (!elementoContador) {
    return;
  }

  const agora = new Date();
  const diferencaEmMilissegundos = DATA_DA_FESTA - agora;

  // Se a data já passou, mostra uma mensagem diferente
  if (diferencaEmMilissegundos <= 0) {
    elementoContador.textContent = "🎉 A festa da Memel já começou!";
    return;
  }

  // Converte a diferença de milissegundos para dias, horas, minutos e segundos
  const segundosTotais = Math.floor(diferencaEmMilissegundos / 1000);
  const dias = Math.floor(segundosTotais / (24 * 60 * 60));
  const horas = Math.floor((segundosTotais % (24 * 60 * 60)) / (60 * 60));
  const minutos = Math.floor((segundosTotais % (60 * 60)) / 60);
  const segundos = segundosTotais % 60;

  elementoContador.textContent =
    `🎈 Faltam ${dias}d ${horas}h ${minutos}m ${segundos}s para a festa!`;
}

// Atualiza o contador assim que a página carrega...
atualizarContador();

// ...e depois atualiza de novo a cada 1 segundo, para o
// contador "andar" em tempo real.
setInterval(atualizarContador, 1000);
