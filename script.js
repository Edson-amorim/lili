// Dados objetivos para as metas diárias
const metas = {
  calorias: 2000,
  proteinas: 50,
  carboidratos: 250,
  gorduras: 70
};

// Elementos do DOM
const foodForm = document.getElementById('food-form');
const foodList = document.getElementById('food-list');
const metaCalorias = document.getElementById('meta-calorias');
const metaProteinas = document.getElementById('meta-proteinas');
const metaCarboidratos = document.getElementById('meta-carboidratos');
const metaGorduras = document.getElementById('meta-gorduras');

// Estado das refeições
let refeicoes = [];

// Persistência usando localStorage
const LOCAL_STORAGE_KEY = 'refeicoes_lili';
const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY);
if (dadosSalvos) {
  refeicoes = JSON.parse(dadosSalvos);
}

// Função para formatar número com vírgula
function formatarNumero(num) {
  return Number(num).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// Função para adicionar refeição
function adicionarRefeicao(event) {
  event.preventDefault();

  const alimento = document.getElementById('alimento').value.trim();
  const calorias = parseFloat(document.getElementById('calorias').value) || 0;
  const proteinas = parseFloat(document.getElementById('proteinas').value) || 0;
  const carboidratos = parseFloat(document.getElementById('carboidratos').value) || 0;
  const gorduras = parseFloat(document.getElementById('gorduras').value) || 0;

  if (!alimento) {
    alert('Por favor, digite o nome do alimento.');
    return;
  }

  const refeicao = {
    id: Date.now(),
    alimento,
    calorias,
    proteinas,
    carboidratos,
    gorduras
  };

  refeicoes.push(refeicao);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refeicoes));
  renderizarRefeicoes();
  foodForm.reset();

  // Foco de retorno após adicionar
  document.getElementById('alimento').focus();
}

// Função para remover refeição
function removerRefeicao(id) {
  refeicoes = refeicoes.filter(r => r.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refeicoes));
  renderizarRefeicoes();
}

// Função para renderizar a lista de refeições
function renderizarRefeicoes() {
  // Atualizar tabela
  let rows = '';
  let totalCalorias = 0;
  let totalProteinas = 0;
  let totalCarboidratos = 0;
  let totalGorduras = 0;

  refeicoes.forEach(r => {
    totalCalorias += r.calorias;
    totalProteinas += r.proteinas;
    totalCarboidratos += r.carboidratos;
    totalGorduras += r.gorduras;

    rows += `
      <tr role="row" aria-rowindex="${r.id}" aria-label="Refeição: ${r.alimento}">
        <td>${r.alimento}</td>
        <td>${formatarNumero(r.calorias)} kcal</td>
        <td>${formatarNumero(r.proteinas)} g</td>
        <td>${formatarNumero(r.carboidratos)} g</td>
        <td>${formatarNumero(r.gorduras)} g</td>
        <td>
          <button class="btn-remover" aria-label="Remover refeição ${r.alimento}" data-id="${r.id}">Remover</button>
        </td>
      </tr>
    `;
  });

  foodList.innerHTML = rows;

  // Adicionar eventos de remoção
  document.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', () => removerRefeicao(parseInt(btn.dataset.id)));
  });

  // Atualizar totais e porcentagem de metas
  // (elementos de total removidos para simplicidade)
  atualizarProgressoMeta(totalCalorias, totalProteinas, totalCarboidratos, totalGorduras);
}

// Função para atualizar barra de progresso das metas
function atualizarProgressoMeta(caloriasConsumidas, proteinasConsumidas, carboidratosConsumidos, gordurasConsumidas) {
  function porcMetas(consumido, objetivo) {
    if (objetivo === 0) return 0;
    return Math.min((consumido / objetivo) * 100, 100);
  }

  const pcCalorias = porcMetas(caloriasConsumidas, metas.calorias);
  const pcProteinas = porcMetas(proteinasConsumidas, metas.proteinas);
  const pcCarboidratos = porcMetas(carboidratosConsumidos, metas.carboidratos);
  const pcGorduras = porcMetas(gordurasConsumidas, metas.gorduras);

  // Atualizar barras (elementos que você pode adicionar no HTML se quiser)
  // Aqui apenas log para exemplo
  console.log(`Progresso: ${pcCalorias}% calorias, ${pcProteinas}% proteínas, ${pcCarboidratos}% carboidratos, ${pcGorduras}% gorduras`);
}

function salvarProjeto() {
  const dados = {
    metas,
    refeicoes: refeicoes.map(r => ({
      id: r.id,
      alimento: r.alimento,
      calorias: r.calorias,
      proteinas: r.proteinass,
      carboidratos: r.carboidratos,
      gorduras: r.gorduras
    }))
  };
  const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lili_projeto.json';
  a.click();
  URL.revokeObjectURL(url);
}

// Escutar envio do formulário
foodForm.addEventListener('submit', adicionarRefeicao);

// Inicializar
renderizarRefeicoes();