// Dados objetivos para as metas diárias
const metas = {
  calorias: 2000,
  proteinas: 50,
  carboidratos: 250,
  gorduras: 70,
  fibras: 25,
  sodio: 2000
};

// Elementos do DOM
const foodForm = document.getElementById('food-form');
const foodList = document.getElementById('food-list');
const foodTotals = document.getElementById('food-totals');
const inputAlimento = document.getElementById('alimento');
const inputQuantidade = document.getElementById('quantidade');
const selectCategoria = document.getElementById('filtro-categoria');
const selectNepa = document.getElementById('selecao-nepa');
const datalistNepa = document.getElementById('lista-alimentos-nepa');
const contadorResultados = document.getElementById('contador-resultados');
const statusBanco = document.getElementById('status-banco');
const anuncioAlimento = document.getElementById('anuncio-alimento');
const fichaConteudo = document.getElementById('ficha-conteudo');

const metaCalorias = document.getElementById('meta-calorias');
const metaProteinas = document.getElementById('meta-proteinas');
const metaCarboidratos = document.getElementById('meta-carboidratos');
const metaGorduras = document.getElementById('meta-gorduras');
const metaFibras = document.getElementById('meta-fibras');
const metaSodio = document.getElementById('meta-sodio');

// Banco de dados carregado de banco_alimentos.js
const bancoAlimentos = typeof BANCO_ALIMENTOS_NEPA !== 'undefined' ? BANCO_ALIMENTOS_NEPA : [];
let alimentoSelecionadoNepa = null;

// Estado das refeições
let refeicoes = [];

// Persistência usando localStorage
const LOCAL_STORAGE_KEY = 'refeicoes_lili';
const dadosSalvos = localStorage.getItem(LOCAL_STORAGE_KEY);
if (dadosSalvos) {
  try {
    refeicoes = JSON.parse(dadosSalvos);
  } catch (e) {
    refeicoes = [];
  }
}

// Função para remover acentos e facilitar busca
function normalizarTexto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[,.;:-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Função para formatar número com vírgula
function formatarNumero(num, casas = 1) {
  return Number(num || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

// Calcula valor proporcional à quantidade informada (base 100g)
function calcularProporcional(valorPor100g, quantidadeGramas, casas = 1) {
  const fator = (parseFloat(quantidadeGramas) || 100) / 100;
  return Number(((Number(valorPor100g) || 0) * fator).toFixed(casas));
}

// Inicializar interface do Banco de Dados NEPA/TACO
function inicializarBancoNepa() {
  if (!bancoAlimentos.length) {
    if (statusBanco) {
      statusBanco.textContent = 'Aviso: Banco de dados NEPA não encontrado.';
    }
    return;
  }

  if (statusBanco) {
    statusBanco.textContent = `Banco de dados NEPA/UNICAMP ativo: ${bancoAlimentos.length} alimentos tratados prontos para consulta automática.`;
  }

  // Extrair categorias únicas
  const categorias = [...new Set(bancoAlimentos.map(item => item.categoria))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  categorias.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    selectCategoria.appendChild(opt);
  });

  atualizarListasNepa(bancoAlimentos);
}

// Atualiza o <datalist> e o <select> com os alimentos filtrados
function atualizarListasNepa(listaFiltrada) {
  if (contadorResultados) {
    contadorResultados.textContent = listaFiltrada.length;
  }

  // Atualizar datalist
  datalistNepa.innerHTML = '';
  const fragmentDatalist = document.createDocumentFragment();
  listaFiltrada.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.alimento;
    opt.label = `${item.categoria} — ${formatarNumero(item.calorias_kcal)} kcal / 100g`;
    fragmentDatalist.appendChild(opt);
  });
  datalistNepa.appendChild(fragmentDatalist);

  // Atualizar select acessível
  selectNepa.innerHTML = '';
  const optPadrao = document.createElement('option');
  optPadrao.value = '';
  optPadrao.textContent =
    listaFiltrada.length > 0
      ? `-- Selecione entre ${listaFiltrada.length} alimento(s) encontrado(s) --`
      : '-- Nenhum alimento encontrado com esse filtro --';
  selectNepa.appendChild(optPadrao);

  const fragmentSelect = document.createDocumentFragment();
  listaFiltrada.forEach(item => {
    const opt = document.createElement('option');
    opt.value = String(item.id);
    opt.textContent = `${item.alimento} (${formatarNumero(item.calorias_kcal)} kcal | P: ${formatarNumero(item.proteinas_g)}g | C: ${formatarNumero(item.carboidratos_g)}g | G: ${formatarNumero(item.gorduras_g)}g)`;
    fragmentSelect.appendChild(opt);
  });
  selectNepa.appendChild(fragmentSelect);
}

// Busca inteligente na Tabela NEPA por nome/termos e categoria
function buscarAlimentosNepa(termoBusca, categoriaFiltro) {
  const termoNorm = normalizarTexto(termoBusca);
  const palavras = termoNorm ? termoNorm.split(' ').filter(Boolean) : [];

  const resultados = bancoAlimentos.filter(item => {
    if (categoriaFiltro && item.categoria !== categoriaFiltro) {
      return false;
    }
    if (!palavras.length) {
      return true;
    }
    const textoItem = normalizarTexto(`${item.alimento} ${item.categoria}`);
    return palavras.every(p => textoItem.includes(p));
  });

  // Ordenar priorizando correspondência exata ou início do nome
  if (termoNorm) {
    resultados.sort((a, b) => {
      const nomeA = normalizarTexto(a.alimento);
      const nomeB = normalizarTexto(b.alimento);
      if (nomeA === termoNorm && nomeB !== termoNorm) return -1;
      if (nomeB === termoNorm && nomeA !== termoNorm) return 1;
      const iniA = nomeA.startsWith(termoNorm);
      const iniB = nomeB.startsWith(termoNorm);
      if (iniA && !iniB) return -1;
      if (iniB && !iniA) return 1;
      return a.alimento.localeCompare(b.alimento, 'pt-BR');
    });
  }

  return resultados;
}

// Preenche todos os campos do formulário e a Ficha Nutricional Completa
function aplicarAlimentoNepa(itemNepa, atualizarCampoTexto = false) {
  if (!itemNepa) return;
  alimentoSelecionadoNepa = itemNepa;

  if (atualizarCampoTexto) {
    inputAlimento.value = itemNepa.alimento;
  }
  selectNepa.value = String(itemNepa.id);

  const qtd = parseFloat(inputQuantidade.value) || 100;

  const cal = calcularProporcional(itemNepa.calorias_kcal, qtd, 1);
  const prot = calcularProporcional(itemNepa.proteinas_g, qtd, 1);
  const carb = calcularProporcional(itemNepa.carboidratos_g, qtd, 1);
  const gord = calcularProporcional(itemNepa.gorduras_g, qtd, 1);
  const fib = calcularProporcional(itemNepa.fibras_g, qtd, 1);
  const sod = calcularProporcional(itemNepa.sodio_mg, qtd, 1);
  const calMg = calcularProporcional(itemNepa.calcio_mg, qtd, 1);
  const fer = calcularProporcional(itemNepa.ferro_mg, qtd, 2);

  document.getElementById('calorias').value = cal;
  document.getElementById('proteinas').value = prot;
  document.getElementById('carboidratos').value = carb;
  document.getElementById('gorduras').value = gord;
  document.getElementById('fibras').value = fib;
  document.getElementById('sodio').value = sod;
  document.getElementById('calcio').value = calMg;
  document.getElementById('ferro').value = fer;

  if (anuncioAlimento) {
    anuncioAlimento.textContent =
      `Dados preenchidos pela Tabela NEPA para ${itemNepa.alimento} (${qtd}g): ` +
      `${formatarNumero(cal)} kcal, ${formatarNumero(prot)}g proteínas, ` +
      `${formatarNumero(carb)}g carboidratos, ${formatarNumero(gord)}g gorduras, ` +
      `${formatarNumero(fib)}g fibras e ${formatarNumero(sod)}mg sódio.`;
  }

  renderizarFichaCompleta(itemNepa, qtd);
}

// Renderiza a Ficha Nutricional Completa com todos os nutrientes da Tabela NEPA
function renderizarFichaCompleta(item, qtd) {
  if (!fichaConteudo || !item) return;

  const p = (val, casas = 1) => formatarNumero(calcularProporcional(val, qtd, casas), casas);

  fichaConteudo.innerHTML = `
    <div class="ficha-cabecalho">
      <h3>${item.alimento} (Código NEPA #${item.id})</h3>
      <p><strong>Categoria:</strong> ${item.categoria} | <strong>Porção calculada:</strong> ${qtd} g (Base de referência NEPA: 100 g)</p>
    </div>
    <div class="ficha-grade">
      <div class="ficha-bloco">
        <h4>Macronutrientes e Energia</h4>
        <dl>
          <dt>Energia (kcal):</dt><dd>${p(item.calorias_kcal, 1)} kcal (${p(item.energia_kj, 1)} kJ)</dd>
          <dt>Proteínas:</dt><dd>${p(item.proteinas_g, 1)} g</dd>
          <dt>Carboidratos totais:</dt><dd>${p(item.carboidratos_g, 1)} g</dd>
          <dt>Fibras alimentares:</dt><dd>${p(item.fibras_g, 1)} g</dd>
          <dt>Lipídeos / Gorduras totais:</dt><dd>${p(item.gorduras_g, 1)} g</dd>
          <dt>Umidade:</dt><dd>${formatarNumero(item.umidade_pct, 1)} %</dd>
          <dt>Cinzas (resíduo mineral):</dt><dd>${p(item.cinzas_g, 2)} g</dd>
        </dl>
      </div>

      <div class="ficha-bloco">
        <h4>Perfil Lipídico</h4>
        <dl>
          <dt>Colesterol:</dt><dd>${p(item.colesterol_mg, 1)} mg</dd>
          <dt>Gordura Saturada:</dt><dd>${p(item.gordura_saturada_g, 2)} g</dd>
          <dt>Gordura Monoinsaturada:</dt><dd>${p(item.gordura_monoinsaturada_g, 2)} g</dd>
          <dt>Gordura Poli-insaturada:</dt><dd>${p(item.gordura_poliinsaturada_g, 2)} g</dd>
        </dl>
      </div>

      <div class="ficha-bloco">
        <h4>Minerais</h4>
        <dl>
          <dt>Cálcio (Ca):</dt><dd>${p(item.calcio_mg, 1)} mg</dd>
          <dt>Ferro (Fe):</dt><dd>${p(item.ferro_mg, 2)} mg</dd>
          <dt>Sódio (Na):</dt><dd>${p(item.sodio_mg, 1)} mg</dd>
          <dt>Potássio (K):</dt><dd>${p(item.potassio_mg, 1)} mg</dd>
          <dt>Magnésio (Mg):</dt><dd>${p(item.magnesio_mg, 1)} mg</dd>
          <dt>Fósforo (P):</dt><dd>${p(item.fosforo_mg, 1)} mg</dd>
          <dt>Zinco (Zn):</dt><dd>${p(item.zinco_mg, 2)} mg</dd>
          <dt>Manganês (Mn):</dt><dd>${p(item.manganes_mg, 2)} mg</dd>
          <dt>Cobre (Cu):</dt><dd>${p(item.cobre_mg, 2)} mg</dd>
        </dl>
      </div>

      <div class="ficha-bloco">
        <h4>Vitaminas</h4>
        <dl>
          <dt>Vitamina C (Ácido ascórbico):</dt><dd>${p(item.vitamina_c_mg, 1)} mg</dd>
          <dt>Retinol (Vitamina A):</dt><dd>${p(item.retinol_mcg, 1)} mcg</dd>
          <dt>Tiamina (Vitamina B1):</dt><dd>${p(item.tiamina_mg, 2)} mg</dd>
          <dt>Riboflavina (Vitamina B2):</dt><dd>${p(item.riboflavina_mg, 2)} mg</dd>
          <dt>Piridoxina (Vitamina B6):</dt><dd>${p(item.piridoxina_mg, 2)} mg</dd>
          <dt>Niacina (Vitamina B3):</dt><dd>${p(item.niacina_mg, 2)} mg</dd>
        </dl>
      </div>
    </div>
  `;
}

// Eventos de busca e preenchimento automático quando o nutricionista informa o alimento
if (inputAlimento) {
  inputAlimento.addEventListener('input', () => {
    const valor = inputAlimento.value.trim();
    const cat = selectCategoria ? selectCategoria.value : '';
    const filtrados = buscarAlimentosNepa(valor, cat);
    atualizarListasNepa(filtrados);

    // Verificar correspondência exata pelo nome ou único resultado encontrado
    const valorNorm = normalizarTexto(valor);
    const exato = bancoAlimentos.find(
      item => item.alimento.toLowerCase() === valor.toLowerCase() || normalizarTexto(item.alimento) === valorNorm
    );

    if (exato) {
      aplicarAlimentoNepa(exato, false);
    } else if (valor.length >= 3 && filtrados.length > 0) {
      // Preenche automaticamente com o alimento mais relevante encontrado enquanto digita
      aplicarAlimentoNepa(filtrados[0], false);
    }
  });

  inputAlimento.addEventListener('change', () => {
    const valor = inputAlimento.value.trim();
    if (!valor) return;
    const cat = selectCategoria ? selectCategoria.value : '';
    const filtrados = buscarAlimentosNepa(valor, cat);
    if (filtrados.length > 0) {
      aplicarAlimentoNepa(filtrados[0], false);
    }
  });
}

if (selectCategoria) {
  selectCategoria.addEventListener('change', () => {
    const filtrados = buscarAlimentosNepa(inputAlimento.value.trim(), selectCategoria.value);
    atualizarListasNepa(filtrados);
  });
}

if (selectNepa) {
  selectNepa.addEventListener('change', () => {
    const idEscolhido = parseInt(selectNepa.value, 10);
    if (!idEscolhido) return;
    const item = bancoAlimentos.find(a => a.id === idEscolhido);
    if (item) {
      aplicarAlimentoNepa(item, true);
    }
  });
}

if (inputQuantidade) {
  inputQuantidade.addEventListener('input', () => {
    if (alimentoSelecionadoNepa) {
      aplicarAlimentoNepa(alimentoSelecionadoNepa, false);
    }
  });
}

// Função para adicionar refeição
function adicionarRefeicao(event) {
  event.preventDefault();

  const alimento = inputAlimento.value.trim();
  const quantidade = parseFloat(inputQuantidade.value) || 100;
  const calorias = parseFloat(document.getElementById('calorias').value) || 0;
  const proteinas = parseFloat(document.getElementById('proteinas').value) || 0;
  const carboidratos = parseFloat(document.getElementById('carboidratos').value) || 0;
  const gorduras = parseFloat(document.getElementById('gorduras').value) || 0;
  const fibras = parseFloat(document.getElementById('fibras').value) || 0;
  const sodio = parseFloat(document.getElementById('sodio').value) || 0;
  const calcio = parseFloat(document.getElementById('calcio').value) || 0;
  const ferro = parseFloat(document.getElementById('ferro').value) || 0;

  if (!alimento) {
    alert('Por favor, digite ou selecione o nome do alimento.');
    return;
  }

  const refeicao = {
    id: Date.now(),
    codigoNepa: alimentoSelecionadoNepa ? alimentoSelecionadoNepa.id : null,
    categoria: alimentoSelecionadoNepa ? alimentoSelecionadoNepa.categoria : 'Personalizado',
    alimento,
    quantidade,
    calorias,
    proteinas,
    carboidratos,
    gorduras,
    fibras,
    sodio,
    calcio,
    ferro
  };

  refeicoes.push(refeicao);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refeicoes));
  renderizarRefeicoes();
  foodForm.reset();
  inputQuantidade.value = 100;
  alimentoSelecionadoNepa = null;
  atualizarListasNepa(buscarAlimentosNepa('', selectCategoria ? selectCategoria.value : ''));

  // Foco de retorno após adicionar
  inputAlimento.focus();
}

// Função para remover refeição
function removerRefeicao(id) {
  refeicoes = refeicoes.filter(r => r.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(refeicoes));
  renderizarRefeicoes();
}

// Função para renderizar a lista de refeições
function renderizarRefeicoes() {
  let rows = '';
  let totalQuantidade = 0;
  let totalCalorias = 0;
  let totalProteinas = 0;
  let totalCarboidratos = 0;
  let totalGorduras = 0;
  let totalFibras = 0;
  let totalSodio = 0;

  refeicoes.forEach(r => {
    const qtd = Number(r.quantidade) || 100;
    const fib = Number(r.fibras) || 0;
    const sod = Number(r.sodio) || 0;

    totalQuantidade += qtd;
    totalCalorias += Number(r.calorias) || 0;
    totalProteinas += Number(r.proteinas) || 0;
    totalCarboidratos += Number(r.carboidratos) || 0;
    totalGorduras += Number(r.gorduras) || 0;
    totalFibras += fib;
    totalSodio += sod;

    rows += `
      <tr role="row" aria-rowindex="${r.id}" aria-label="Refeição: ${r.alimento}">
        <td>${r.alimento}</td>
        <td>${formatarNumero(qtd, 0)} g</td>
        <td>${formatarNumero(r.calorias)} kcal</td>
        <td>${formatarNumero(r.proteinas)} g</td>
        <td>${formatarNumero(r.carboidratos)} g</td>
        <td>${formatarNumero(r.gorduras)} g</td>
        <td>${formatarNumero(fib)} g</td>
        <td>${formatarNumero(sod)} mg</td>
        <td>
          <button type="button" class="btn-remover" aria-label="Remover refeição ${r.alimento}" data-id="${r.id}">Remover</button>
        </td>
      </tr>
    `;
  });

  foodList.innerHTML = rows;

  if (foodTotals) {
    if (refeicoes.length > 0) {
      foodTotals.innerHTML = `
        <tr class="linha-totais">
          <th>Total Acumulado</th>
          <th>${formatarNumero(totalQuantidade, 0)} g</th>
          <th>${formatarNumero(totalCalorias)} kcal</th>
          <th>${formatarNumero(totalProteinas)} g</th>
          <th>${formatarNumero(totalCarboidratos)} g</th>
          <th>${formatarNumero(totalGorduras)} g</th>
          <th>${formatarNumero(totalFibras)} g</th>
          <th>${formatarNumero(totalSodio)} mg</th>
          <th></th>
        </tr>
      `;
    } else {
      foodTotals.innerHTML = '';
    }
  }

  // Adicionar eventos de remoção
  document.querySelectorAll('.btn-remover').forEach(btn => {
    btn.addEventListener('click', () => removerRefeicao(parseInt(btn.dataset.id, 10)));
  });

  atualizarProgressoMeta(
    totalCalorias,
    totalProteinas,
    totalCarboidratos,
    totalGorduras,
    totalFibras,
    totalSodio
  );
}

// Função para atualizar barra de progresso e textos das metas
function atualizarProgressoMeta(
  caloriasConsumidas,
  proteinasConsumidas,
  carboidratosConsumidos,
  gordurasConsumidas,
  fibrasConsumidas = 0,
  sodioConsumido = 0
) {
  function porcMetas(consumido, objetivo) {
    if (objetivo === 0) return 0;
    return Math.min((consumido / objetivo) * 100, 100);
  }

  const pcCalorias = porcMetas(caloriasConsumidas, metas.calorias);
  const pcProteinas = porcMetas(proteinasConsumidas, metas.proteinas);
  const pcCarboidratos = porcMetas(carboidratosConsumidos, metas.carboidratos);
  const pcGorduras = porcMetas(gordurasConsumidas, metas.gorduras);
  const pcFibras = porcMetas(fibrasConsumidas, metas.fibras);
  const pcSodio = porcMetas(sodioConsumido, metas.sodio);

  if (metaCalorias) {
    metaCalorias.textContent = `${formatarNumero(caloriasConsumidas)} / ${metas.calorias} kcal (${formatarNumero(pcCalorias, 0)}%)`;
  }
  if (metaProteinas) {
    metaProteinas.textContent = `${formatarNumero(proteinasConsumidas)} / ${metas.proteinas} g (${formatarNumero(pcProteinas, 0)}%)`;
  }
  if (metaCarboidratos) {
    metaCarboidratos.textContent = `${formatarNumero(carboidratosConsumidos)} / ${metas.carboidratos} g (${formatarNumero(pcCarboidratos, 0)}%)`;
  }
  if (metaGorduras) {
    metaGorduras.textContent = `${formatarNumero(gordurasConsumidas)} / ${metas.gorduras} g (${formatarNumero(pcGorduras, 0)}%)`;
  }
  if (metaFibras) {
    metaFibras.textContent = `${formatarNumero(fibrasConsumidas)} / ${metas.fibras} g (${formatarNumero(pcFibras, 0)}%)`;
  }
  if (metaSodio) {
    metaSodio.textContent = `${formatarNumero(sodioConsumido)} / ${metas.sodio} mg (${formatarNumero(pcSodio, 0)}%)`;
  }
}

// Exportar relatório nutricional em arquivo de texto (.txt)
function exportarTexto() {
  let conteudo = 'RELATÓRIO NUTRICIONAL - PROJETO LILI (BASE NEPA/UNICAMP)\n';
  conteudo += '=========================================================\n\n';

  if (refeicoes.length === 0) {
    conteudo += 'Nenhuma refeição registrada até o momento.\n';
  } else {
    let tCal = 0, tProt = 0, tCarb = 0, tGord = 0, tFib = 0, tSod = 0;
    refeicoes.forEach((r, idx) => {
      const qtd = Number(r.quantidade) || 100;
      const fib = Number(r.fibras) || 0;
      const sod = Number(r.sodio) || 0;
      tCal += Number(r.calorias) || 0;
      tProt += Number(r.proteinas) || 0;
      tCarb += Number(r.carboidratos) || 0;
      tGord += Number(r.gorduras) || 0;
      tFib += fib;
      tSod += sod;

      conteudo += `${idx + 1}. ${r.alimento} (${qtd}g)\n`;
      conteudo += `   Calorias: ${formatarNumero(r.calorias)} kcal | Proteínas: ${formatarNumero(r.proteinas)} g | Carboidratos: ${formatarNumero(r.carboidratos)} g | Gorduras: ${formatarNumero(r.gorduras)} g | Fibras: ${formatarNumero(fib)} g | Sódio: ${formatarNumero(sod)} mg\n\n`;
    });

    conteudo += '---------------------------------------------------------\n';
    conteudo += `TOTAL: ${formatarNumero(tCal)} kcal | Proteínas: ${formatarNumero(tProt)} g | Carboidratos: ${formatarNumero(tCarb)} g | Gorduras: ${formatarNumero(tGord)} g | Fibras: ${formatarNumero(tFib)} g | Sódio: ${formatarNumero(tSod)} mg\n`;
  }

  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio_nutricional_lili.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// Fazer backup dos dados registrados
function fazerBackup() {
  const backupData = {
    dataBackup: new Date().toISOString(),
    sistema: 'Lili - Rastreamento Nutricional (Base NEPA/TACO)',
    metas,
    refeicoes
  };
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'backup_lili.txt';
  a.click();
  URL.revokeObjectURL(url);
}

// Salvar projeto completo em JSON
function salvarProjeto() {
  const dados = {
    metas,
    refeicoes: refeicoes.map(r => ({
      id: r.id,
      codigoNepa: r.codigoNepa || null,
      categoria: r.categoria || '',
      alimento: r.alimento,
      quantidade: r.quantidade || 100,
      calorias: r.calorias,
      proteinas: r.proteinas,
      carboidratos: r.carboidratos,
      gorduras: r.gorduras,
      fibras: r.fibras || 0,
      sodio: r.sodio || 0,
      calcio: r.calcio || 0,
      ferro: r.ferro || 0
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
inicializarBancoNepa();
renderizarRefeicoes();