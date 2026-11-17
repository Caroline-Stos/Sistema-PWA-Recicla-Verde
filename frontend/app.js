/**
 * ============================================================================
 * LÓGICA DO APLICATIVO (NAVEGAÇÃO, VALIDAÇÃO E ESTADO NO NAVEGADOR)
 * Cooperativa Recicla Vila Verde (CRVV)
 * ============================================================================
 */

/**
 * Perfis Cadastrados na Cooperativa
 */
const dbUsuarios = {
  MORADOR: {
    id: 1,
    nome: 'Ana Souza',
    telefone: '(11) 98765-4321',
    papelExibicao: 'Moradora',
    perfil: 'MORADOR'
  },
  CATADOR: {
    id: 2,
    nome: 'Carlos Alberto',
    telefone: '(11) 91234-5678',
    papelExibicao: 'Catador Cooperado',
    perfil: 'CATADOR'
  },
  COORDENACAO: {
    id: 3,
    nome: 'Galpão CRVV',
    telefone: '(11) 99988-7766',
    papelExibicao: 'Coordenação',
    perfil: 'COORDENACAO'
  }
};

/**
 * Pedidos de Demonstração Planejados
 */
let dbSolicitacoes = [
  {
    id: 1,
    solicitante_id: 1,
    catador_id: null,
    catador_nome: null,
    endereco: 'Rua das Acácias, 142',
    ponto_referencia: 'Portão azul',
    tipos_material: 'Papelão e Plástico',
    porte_volume: 'Pequeno / Médio',
    modalidade_coleta: 'Carrinho Manual',
    status: 'AGUARDANDO',
    criado_em: '08:30',
    concluido_em: null
  },
  {
    id: 2,
    solicitante_id: 1,
    catador_id: null,
    catador_nome: null,
    endereco: 'Av. Central, 890',
    ponto_referencia: 'Ao lado da padaria',
    tipos_material: 'Vidro e Metal',
    porte_volume: 'Grande Volume',
    modalidade_coleta: 'Caminhão da Cooperativa',
    status: 'AGUARDANDO',
    criado_em: '09:10',
    concluido_em: null
  },
  {
    id: 3,
    solicitante_id: 1,
    catador_id: null,
    catador_nome: null,
    endereco: 'Rua Ipê Roxo, 55',
    ponto_referencia: 'Em frente à praça comunitária',
    tipos_material: 'Papelão, Plástico e Metal',
    porte_volume: 'Pequeno / Médio',
    modalidade_coleta: 'Carrinho Manual',
    status: 'AGUARDANDO',
    criado_em: '09:35',
    concluido_em: null
  },
  {
    id: 4,
    solicitante_id: 1,
    catador_id: 2,
    catador_nome: 'Carlos Alberto',
    endereco: 'Rua das Palmeiras, 310',
    ponto_referencia: 'Casa de esquina com muro branco',
    tipos_material: 'Papelão',
    porte_volume: 'Pequeno / Médio',
    modalidade_coleta: 'Carrinho Manual',
    status: 'A_CAMINHO',
    criado_em: '08:15',
    concluido_em: null
  }
];

let currentUser = null;
let currentRoleView = 'CATADOR';
let loginAttempts = 0;
let lastAffectedOrderId = 1;

/**
 * Funções puras auxiliares de validação e regra de negócio (facilitam testes automatizados)
 */
function formatPhoneString(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length > 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  } else if (digits.length > 2) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return digits;
}

function definirModalidadePorPorte(porteVolume) {
  return porteVolume === 'Grande Volume' ? 'Caminhão da Cooperativa' : 'Carrinho Manual';
}

function contemPayloadInvalido(texto) {
  return /<script|<\/script|javascript:/i.test(String(texto || ''));
}

/**
 * Formatação automática da máscara de telefone (11) 98765-4321
 */
function formatPhoneInput(input) {
  input.value = formatPhoneString(input.value);
}

/**
 * Alterna visibilidade da senha (botão >= 48x48px)
 */
function togglePasswordVisibility() {
  const passInput = document.getElementById('loginPassword');
  const btn = document.getElementById('btnTogglePass');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    btn.textContent = 'Ocultar';
  } else {
    passInput.type = 'password';
    btn.textContent = 'Mostrar';
  }
}

/**
 * Abre/fecha o quadro de cadastro rápido de morador na Tela 1
 */
function toggleQuickRegisterBox() {
  const box = document.getElementById('quickRegisterBox');
  box.classList.toggle('hidden');
}

/**
 * Preenche os dados planejados nos campos da Tela 1
 */
function fillDemoLogin(roleKey) {
  const user = dbUsuarios[roleKey];
  if (!user) return;
  document.getElementById('loginPhone').value = user.telefone;
  document.getElementById('loginPassword').value = 'Recicla2026';
  document.getElementById('loginErrorBox').classList.add('hidden');
  currentRoleView = roleKey;
}

/**
 * Simula tentativa de login inválida e bloqueio temporário após 5 erros seguidos
 */
function simulateInvalidLogin() {
  document.getElementById('loginPassword').value = '123';
  handleLoginSubmit(new Event('submit'));
}

/**
 * Processa o envio do formulário de login na Tela 1
 */
function handleLoginSubmit(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  const phone = document.getElementById('loginPhone').value.trim();
  const pass = document.getElementById('loginPassword').value;
  const errBox = document.getElementById('loginErrorBox');
  const errTitle = document.getElementById('loginErrorTitle');
  const errText = document.getElementById('loginErrorText');

  if (loginAttempts >= 5) {
    errBox.classList.remove('hidden');
    errTitle.textContent = '[!] Acesso temporariamente pausado';
    errText.textContent = 'Você realizou 5 tentativas seguidas com senha incorreta. Por segurança, aguarde 5 minutos antes de tentar novamente.';
    return;
  }

  if (!phone || pass.length < 8) {
    loginAttempts++;
    errBox.classList.remove('hidden');
    errTitle.textContent = '[!] Dados de acesso incorretos';
    errText.textContent = `Confira o número de telefone e digite sua senha de pelo menos 8 caracteres (Tentativa ${loginAttempts} de 5).`;
    return;
  }

  let matchedRole = 'CATADOR';
  if (phone.includes('98765')) matchedRole = 'MORADOR';
  else if (phone.includes('91234')) matchedRole = 'CATADOR';
  else if (phone.includes('99988')) matchedRole = 'COORDENACAO';
  else matchedRole = currentRoleView || 'MORADOR';

  loginAttempts = 0;
  errBox.classList.add('hidden');
  setSessionUser(matchedRole);

  if (matchedRole === 'MORADOR') switchDemoMode('TELA_2_MORADOR');
  else if (matchedRole === 'CATADOR') switchDemoMode('TELA_2_CATADOR');
  else switchDemoMode('TELA_2_COORD');
}

/**
 * Atualiza o cabeçalho com o usuário autenticado
 */
function setSessionUser(roleKey) {
  currentUser = dbUsuarios[roleKey];
  currentRoleView = roleKey;
  const sessionBox = document.getElementById('headerSessionBox');
  const nameEl = document.getElementById('headerUserName');
  const roleEl = document.getElementById('headerUserRole');

  sessionBox.classList.remove('hidden');
  sessionBox.classList.add('flex');
  nameEl.textContent = currentUser.nome;
  roleEl.textContent = currentUser.papelExibicao;
}

/**
 * Encerra a sessão e limpa o estado ativo
 */
function handleLogout() {
  currentUser = null;
  const sessionBox = document.getElementById('headerSessionBox');
  sessionBox.classList.add('hidden');
  sessionBox.classList.remove('flex');
  switchDemoMode('TELA_1');
}

/**
 * Alterna destaque visual dos blocos de material reciclável
 */
function toggleMaterialCard(checkbox, cardId) {
  const card = document.getElementById(cardId);
  if (checkbox.checked) {
    card.classList.add('selected');
  } else {
    card.classList.remove('selected');
  }
}

/**
 * Atualiza em tempo real o aviso de atendimento conforme o porte do volume
 */
function updateModalidadePreview() {
  const selectedPorte = document.querySelector('input[name="porte_volume"]:checked').value;
  const cardPeq = document.getElementById('porteCardPequeno');
  const cardGra = document.getElementById('porteCardGrande');
  const previewBox = document.getElementById('modalidadePreviewBox');
  const previewText = document.getElementById('modalidadePreviewText');

  if (selectedPorte === 'Pequeno / Médio') {
    cardPeq.classList.add('selected');
    cardGra.classList.remove('selected');
    previewBox.className = 'p-3.5 rounded-lg border-2 border-[#0F5132] bg-[#ECFDF5] text-[#0F5132] text-xs sm:text-sm font-extrabold flex items-center gap-2.5';
    previewText.textContent = 'Atendimento por Carrinho Manual: seu pedido entrará imediatamente na fila dos catadores da rua.';
  } else {
    cardGra.classList.add('selected');
    cardPeq.classList.remove('selected');
    previewBox.className = 'p-3.5 rounded-lg border-2 border-[#78350F] bg-[#FEF3C7] text-[#78350F] text-xs sm:text-sm font-extrabold flex items-center gap-2.5';
    previewText.textContent = 'Atendimento por Caminhão da Cooperativa: seu pedido será encaminhado ao painel de cargas pesadas do galpão.';
  }
}

/**
 * Registra uma nova solicitação de coleta pelo Morador
 */
function handleCreateRequest(event) {
  if (event && typeof event.preventDefault === 'function') {
    event.preventDefault();
  }
  const enderecoInput = document.getElementById('inputEndereco');
  const refInput = document.getElementById('inputReferencia');
  const checkedMats = Array.from(document.querySelectorAll('input[name="material"]:checked')).map(cb => cb.value);
  const porte = document.querySelector('input[name="porte_volume"]:checked').value;

  const errBox = document.getElementById('formMoradorError');
  const errText = document.getElementById('formMoradorErrorText');

  const enderecoClean = enderecoInput.value.trim();
  const refClean = refInput.value.trim();

  if (!enderecoClean || enderecoClean.length < 5) {
    errBox.classList.remove('hidden');
    errText.textContent = 'Por favor, informe o nome da rua e o número da residência para a retirada.';
    enderecoInput.focus();
    return;
  }

  if (checkedMats.length === 0) {
    errBox.classList.remove('hidden');
    errText.textContent = 'Selecione pelo menos um tipo de material reciclável (Papelão, Plástico, Vidro ou Metal).';
    return;
  }

  if (contemPayloadInvalido(enderecoClean) || contemPayloadInvalido(refClean)) {
    errBox.classList.remove('hidden');
    errText.textContent = 'Caracteres inválidos detectados no endereço. Utilize apenas letras e números.';
    return;
  }

  errBox.classList.add('hidden');

  const modalidadeAuto = definirModalidadePorPorte(porte);
  const now = new Date();
  const horaAtual = now.toTimeString().slice(0, 5);
  const novoId = dbSolicitacoes.length > 0 ? Math.max(...dbSolicitacoes.map(s => s.id)) + 1 : 1;

  const novaSolicitacao = {
    id: novoId,
    solicitante_id: 1,
    catador_id: null,
    catador_nome: null,
    endereco: enderecoClean,
    ponto_referencia: refClean || 'Sem ponto de referência',
    tipos_material: checkedMats.join(' e '),
    porte_volume: porte,
    modalidade_coleta: modalidadeAuto,
    status: 'AGUARDANDO',
    criado_em: horaAtual,
    concluido_em: null
  };

  dbSolicitacoes.unshift(novaSolicitacao);
  lastAffectedOrderId = novoId;

  switchDemoMode('TELA_3', 'PEDIDO_CRIADO');
}

/**
 * Cria badge visual multissensorial (Cor + Símbolo + Texto explícito)
 */
function createStatusBadgeElement(status) {
  const span = document.createElement('span');
  span.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold border-2 ';

  if (status === 'AGUARDANDO') {
    span.className += 'bg-[#FEF3C7] text-[#78350F] border-[#B45309]';
    span.textContent = '[●] Aguardando Coleta';
  } else if (status === 'A_CAMINHO') {
    span.className += 'bg-blue-100 text-[#1E3A8A] border-[#1E3A8A]';
    span.textContent = '[✓] A caminho';
  } else if (status === 'CONCLUIDO') {
    span.className += 'bg-[#ECFDF5] text-[#0F5132] border-[#0F5132]';
    span.textContent = '[★] Coleta Concluída';
  } else {
    span.className += 'bg-slate-200 text-slate-800 border-slate-600';
    span.textContent = status;
  }
  return span;
}

/**
 * Renderiza a Fila de Coletas da Rua para o Catador (usando textContent)
 */
function renderCatadorQueue() {
  const container = document.getElementById('catadorQueueContainer');
  container.innerHTML = '';

  const filaRua = dbSolicitacoes.filter(
    s => s.modalidade_coleta === 'Carrinho Manual' && (s.status === 'AGUARDANDO' || s.status === 'A_CAMINHO')
  );

  if (filaRua.length === 0) {
    const emptyCard = document.createElement('div');
    emptyCard.className = 'card-hc p-6 text-center space-y-2';
    const msg = document.createElement('p');
    msg.className = 'text-base font-extrabold text-[#111111]';
    msg.textContent = 'Não há pedidos pendentes para carrinho manual neste momento.';
    emptyCard.appendChild(msg);
    container.appendChild(emptyCard);
    return;
  }

  filaRua.forEach(pedido => {
    const card = document.createElement('article');
    card.className = 'card-hc p-4 space-y-3.5 bg-white';

    // Cabeçalho do Card
    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between flex-wrap gap-2 border-b-2 border-slate-200 pb-2.5';

    const idTag = document.createElement('span');
    idTag.className = 'font-mono text-xs font-extrabold px-2.5 py-1 rounded bg-slate-900 text-white';
    idTag.textContent = `Pedido ${pedido.id} • ${pedido.criado_em}`;

    const badge = createStatusBadgeElement(pedido.status);
    topRow.appendChild(idTag);
    topRow.appendChild(badge);

    // Endereço e Referência via textContent
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'space-y-1';

    const addrTitle = document.createElement('h3');
    addrTitle.className = 'text-lg sm:text-xl font-extrabold text-[#111111] leading-snug';
    addrTitle.textContent = `${pedido.endereco} (${pedido.ponto_referencia})`;

    const respInfo = document.createElement('p');
    respInfo.className = 'text-xs sm:text-sm font-bold text-slate-700';
    respInfo.textContent = pedido.catador_nome
      ? `Coletor responsável: ${pedido.catador_nome}`
      : 'Disponível para retirada imediata na rua';

    bodyDiv.appendChild(addrTitle);
    bodyDiv.appendChild(respInfo);

    // Blocos de Material e Porte
    const metaRow = document.createElement('div');
    metaRow.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1';

    const matBox = document.createElement('div');
    matBox.className = 'p-2.5 rounded bg-slate-100 border border-slate-400 text-xs sm:text-sm font-extrabold text-[#111111]';
    matBox.textContent = `Material: ${pedido.tipos_material}`;

    const volBox = document.createElement('div');
    volBox.className = 'p-2.5 rounded bg-emerald-50 border border-[#0F5132] text-xs sm:text-sm font-extrabold text-[#0F5132]';
    volBox.textContent = `Porte: ${pedido.porte_volume} (${pedido.modalidade_coleta})`;

    metaRow.appendChild(matBox);
    metaRow.appendChild(volBox);

    // Botão de Ação Única (52px de altura e largura total)
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';

    if (pedido.status === 'AGUARDANDO') {
      actionBtn.className = 'touch-target-lg w-full btn-primary-hc text-base tracking-wide gap-2 mt-2';
      actionBtn.textContent = 'Aceitar Coleta';
      actionBtn.onclick = () => handleAcceptOrder(pedido.id, false);
    } else if (pedido.status === 'A_CAMINHO') {
      actionBtn.className = 'touch-target-lg w-full btn-blue-hc text-base tracking-wide gap-2 mt-2';
      actionBtn.textContent = 'Concluir Coleta';
      actionBtn.onclick = () => handleCompleteOrder(pedido.id);
    }

    card.appendChild(topRow);
    card.appendChild(bodyDiv);
    card.appendChild(metaRow);
    card.appendChild(actionBtn);

    container.appendChild(card);
  });
}

/**
 * Renderiza o Painel de Cargas Pesadas para a Coordenação (Caminhão)
 */
function renderCoordQueue() {
  const container = document.getElementById('coordQueueContainer');
  container.innerHTML = '';

  const filaCaminhao = dbSolicitacoes.filter(s => s.modalidade_coleta === 'Caminhão da Cooperativa');

  filaCaminhao.forEach(pedido => {
    const card = document.createElement('article');
    card.className = 'card-hc p-4 space-y-3.5 bg-white';

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between flex-wrap gap-2 border-b-2 border-slate-200 pb-2.5';

    const idTag = document.createElement('span');
    idTag.className = 'font-mono text-xs font-extrabold px-2.5 py-1 rounded bg-[#78350F] text-white';
    idTag.textContent = `Pedido ${pedido.id} • ${pedido.criado_em}`;

    const badge = createStatusBadgeElement(pedido.status);
    topRow.appendChild(idTag);
    topRow.appendChild(badge);

    const addrTitle = document.createElement('h3');
    addrTitle.className = 'text-lg sm:text-xl font-extrabold text-[#111111]';
    addrTitle.textContent = `${pedido.endereco} (${pedido.ponto_referencia})`;

    const detailsText = document.createElement('p');
    detailsText.className = 'text-sm font-bold text-slate-800';
    detailsText.textContent = `${pedido.tipos_material} — ${pedido.porte_volume}`;

    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';

    if (pedido.status === 'AGUARDANDO') {
      actionBtn.className = 'touch-target-lg w-full btn-primary-hc text-sm sm:text-base gap-2';
      actionBtn.textContent = 'Despachar Caminhão';
      actionBtn.onclick = () => handleAcceptOrder(pedido.id, true);
    } else if (pedido.status === 'A_CAMINHO') {
      actionBtn.className = 'touch-target-lg w-full btn-blue-hc text-sm sm:text-base gap-2';
      actionBtn.textContent = 'Registrar Conclusão';
      actionBtn.onclick = () => handleCompleteOrder(pedido.id);
    } else {
      actionBtn.className = 'touch-target w-full btn-secondary-hc text-sm opacity-75 cursor-not-allowed';
      actionBtn.disabled = true;
      actionBtn.textContent = `Coleta concluída às ${pedido.concluido_em || '10:45'}`;
    }

    card.appendChild(topRow);
    card.appendChild(addrTitle);
    card.appendChild(detailsText);
    card.appendChild(actionBtn);
    container.appendChild(card);
  });
}

/**
 * Aceita um chamado de coleta e evita duplicidade
 */
function handleAcceptOrder(orderId, isTruck = false) {
  const pedido = dbSolicitacoes.find(s => s.id === orderId);
  if (!pedido) return;

  if (pedido.status !== 'AGUARDANDO') {
    lastAffectedOrderId = orderId;
    switchDemoMode('TELA_3', 'CHAMADO_INDISPONIVEL');
    return;
  }

  pedido.status = 'A_CAMINHO';
  pedido.catador_id = isTruck ? 3 : 2;
  pedido.catador_nome = isTruck ? 'Equipe do Caminhão CRVV' : 'Carlos Alberto';
  lastAffectedOrderId = orderId;

  switchDemoMode('TELA_3', 'ACEITE_SUCESSO');
}

/**
 * Registra a conclusão da coleta
 */
function handleCompleteOrder(orderId) {
  const pedido = dbSolicitacoes.find(s => s.id === orderId);
  if (!pedido) return;

  pedido.status = 'CONCLUIDO';
  pedido.concluido_em = '10:45';
  lastAffectedOrderId = orderId;

  switchDemoMode('TELA_3', 'CONCLUIDO_SUCESSO');
}

/**
 * Simula o aviso de chamado já aceito por outro colega
 */
function triggerConflictDemo() {
  lastAffectedOrderId = 4;
  switchDemoMode('TELA_3', 'CHAMADO_INDISPONIVEL');
}

/**
 * Recarrega a fila do catador
 */
function refreshCatadorQueue() {
  renderCatadorQueue();
}

/**
 * Renderiza os 4 cenários de confirmação e alerta na Tela 3
 */
function renderScreen3Scenario(scenarioKey) {
  const banner = document.getElementById('resultAlertBanner');
  const iconBox = document.getElementById('resultAlertIconBox');
  const tagEl = document.getElementById('resultAlertTag');
  const titleEl = document.getElementById('screen3Title');
  const msgEl = document.getElementById('resultAlertMessage');

  const pedido = dbSolicitacoes.find(s => s.id === lastAffectedOrderId) || dbSolicitacoes[0];

  if (scenarioKey === 'ACEITE_SUCESSO') {
    banner.className = 'card-hc p-5 space-y-3 bg-[#ECFDF5] border-[#0F5132] text-[#0F5132]';
    iconBox.className = 'w-12 h-12 rounded-lg border-2 border-[#0F5132] bg-[#0F5132] text-white flex items-center justify-center shrink-0';
    iconBox.innerHTML = `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    tagEl.textContent = '[✓] Atendimento Confirmado';
    titleEl.textContent = 'Coleta aceita pelo cooperado Carlos Alberto — A caminho';
    msgEl.textContent = `Você assumiu a retirada em ${pedido.endereco}. O morador já foi avisado e este chamado foi reservado exclusivamente para você.`;
  } else if (scenarioKey === 'CHAMADO_INDISPONIVEL') {
    banner.className = 'card-hc p-5 space-y-3 bg-[#FEF3C7] border-[#B45309] text-[#78350F]';
    iconBox.className = 'w-12 h-12 rounded-lg border-2 border-[#78350F] bg-[#B45309] text-white flex items-center justify-center shrink-0';
    iconBox.innerHTML = `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    tagEl.textContent = '[!] Chamado Indisponível';
    titleEl.textContent = 'Este chamado já foi aceito por outro catador. Volte para atualizar a fila.';
    msgEl.textContent = 'Outro cooperado assumiu esta coleta instantes antes. Isso evita que dois catadores se desloquem para o mesmo endereço.';
  } else if (scenarioKey === 'CONCLUIDO_SUCESSO') {
    banner.className = 'card-hc p-5 space-y-3 bg-blue-50 border-[#1E3A8A] text-[#1E3A8A]';
    iconBox.className = 'w-12 h-12 rounded-lg border-2 border-[#1E3A8A] bg-[#1E3A8A] text-white flex items-center justify-center shrink-0';
    iconBox.innerHTML = `<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;
    tagEl.textContent = '[★] Retirada Finalizada';
    titleEl.textContent = `Coleta concluída às ${pedido.concluido_em || '10:45'} — Material recolhido com sucesso`;
    msgEl.textContent = `O atendimento em ${pedido.endereco} foi encerrado e contabilizado na produção diária da cooperativa.`;
  } else {
    banner.className = 'card-hc p-5 space-y-3 bg-[#ECFDF5] border-[#0F5132] text-[#0F5132]';
    iconBox.className = 'w-12 h-12 rounded-lg border-2 border-[#0F5132] bg-[#0F5132] text-white flex items-center justify-center shrink-0';
    iconBox.innerHTML = `<svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    tagEl.textContent = '[✓] Pedido Registrado';
    titleEl.textContent = 'Solicitação enviada! Modalidade atribuída automaticamente.';
    msgEl.textContent = `Seu pedido foi encaminhado para atendimento via ${pedido.modalidade_coleta}. Você será avisado assim que um cooperado estiver a caminho.`;
  }

  // Preenchimento seguro via textContent
  document.getElementById('resultOrderId').textContent = `Pedido #${pedido.id}`;
  const statusCell = document.getElementById('resultStatusBadge');
  statusCell.innerHTML = '';
  statusCell.appendChild(createStatusBadgeElement(pedido.status));

  document.getElementById('resultModalidade').textContent = pedido.modalidade_coleta;
  document.getElementById('resultEndereco').textContent = pedido.endereco;
  document.getElementById('resultReferencia').textContent = `Ponto de referência: ${pedido.ponto_referencia}`;
  document.getElementById('resultMaterial').textContent = `${pedido.tipos_material} — ${pedido.porte_volume}`;
  document.getElementById('resultCatador').textContent = pedido.catador_nome || 'Aguardando cooperado disponível';
  document.getElementById('resultTimestamps').textContent =
    `Solicitado às ${pedido.criado_em} • Concluído às ${pedido.concluido_em || 'Em andamento'}`;

  renderAllOrdersSummary();
}

/**
 * Renderiza o resumo dos pedidos do dia no rodapé da Tela 3
 */
function renderAllOrdersSummary() {
  const listEl = document.getElementById('allOrdersSummaryList');
  listEl.innerHTML = '';
  dbSolicitacoes.forEach(item => {
    const row = document.createElement('div');
    row.className = 'p-2.5 rounded border border-slate-400 bg-slate-50 flex items-center justify-between flex-wrap gap-2';

    const left = document.createElement('span');
    left.className = 'font-bold text-[#111111]';
    left.textContent = `Pedido ${item.id}: ${item.endereco} (${item.ponto_referencia}) — ${item.modalidade_coleta}`;

    const right = createStatusBadgeElement(item.status);
    row.appendChild(left);
    row.appendChild(right);
    listEl.appendChild(row);
  });
}

/**
 * Retorna da Tela 3 para a Tela 2 na visão do usuário atual
 */
function returnToOperationalScreen() {
  if (currentRoleView === 'MORADOR') switchDemoMode('TELA_2_MORADOR');
  else if (currentRoleView === 'COORDENACAO') switchDemoMode('TELA_2_COORD');
  else switchDemoMode('TELA_2_CATADOR');
}

/**
 * Alterna entre as 3 Telas Principais da Plataforma
 */
function switchDemoMode(mode, alertScenario = 'ACEITE_SUCESSO') {
  const s1 = document.getElementById('screen1');
  const s2 = document.getElementById('screen2');
  const s3 = document.getElementById('screen3');

  const vMorador = document.getElementById('viewMorador');
  const vCatador = document.getElementById('viewCatador');
  const vCoord = document.getElementById('viewCoord');

  s1.classList.add('hidden');
  s2.classList.add('hidden');
  s3.classList.add('hidden');

  vMorador.classList.add('hidden');
  vCatador.classList.add('hidden');
  vCoord.classList.add('hidden');

  if (mode === 'TELA_1') {
    s1.classList.remove('hidden');
  } else if (mode === 'TELA_2_MORADOR') {
    setSessionUser('MORADOR');
    s2.classList.remove('hidden');
    vMorador.classList.remove('hidden');
    highlightRoleTab('MORADOR');
  } else if (mode === 'TELA_2_CATADOR') {
    setSessionUser('CATADOR');
    s2.classList.remove('hidden');
    vCatador.classList.remove('hidden');
    renderCatadorQueue();
    highlightRoleTab('CATADOR');
  } else if (mode === 'TELA_2_COORD') {
    setSessionUser('COORDENACAO');
    s2.classList.remove('hidden');
    vCoord.classList.remove('hidden');
    renderCoordQueue();
    highlightRoleTab('COORDENACAO');
  } else if (mode === 'TELA_3') {
    if (!currentUser) setSessionUser('CATADOR');
    s3.classList.remove('hidden');
    renderScreen3Scenario(alertScenario);
  }

  if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function highlightRoleTab(role) {
  const tM = document.getElementById('tabRoleMorador');
  const tC = document.getElementById('tabRoleCatador');
  const tG = document.getElementById('tabRoleCoord');

  const baseClass = 'touch-target px-2 py-2 rounded-md border-2 border-[#0F172A] bg-white text-[#111111] font-extrabold text-xs sm:text-sm text-center';
  const activeClass = 'touch-target px-2 py-2 rounded-md border-2 border-[#0F172A] bg-[#0F5132] text-white font-extrabold text-xs sm:text-sm text-center shadow';

  tM.className = role === 'MORADOR' ? activeClass : baseClass;
  tC.className = role === 'CATADOR' ? activeClass : baseClass;
  tG.className = role === 'COORDENACAO' ? activeClass : baseClass;
}

if (typeof window !== 'undefined') {
  window.onload = function () {
    switchDemoMode('TELA_1');
  };
}

// Exportação opcional para testes automatizados em ambiente Node.js / Jest / Vitest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    dbUsuarios,
    dbSolicitacoes,
    formatPhoneString,
    definirModalidadePorPorte,
    contemPayloadInvalido,
    handleAcceptOrder,
    handleCompleteOrder
  };
}
