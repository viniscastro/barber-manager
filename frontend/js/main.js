// ==========================================
// 1. ATIVAÇÃO DO CALENDÁRIO
// ==========================================
// Só ativa o flatpickr se o campo de data existir na página atual
if (document.getElementById("data-hora")) {
    flatpickr("#data-hora", {
        enableTime: true,           
        dateFormat: "d/m/Y H:i",    
        minDate: "today",           
        time_24hr: true,            
        locale: "pt",               
        minTime: "08:00",           
        maxTime: "20:00",           
        disable: [
            function(date) { return (date.getDay() === 0); }
        ]
    });
}

// ==========================================
// 2. NAVEGAÇÃO DO MENU LATERAL
// ==========================================
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');

        // Só previne o recarregamento se for uma âncora (#) na mesma página
        if (href.startsWith('#')) {
            e.preventDefault();

            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            const targetId = href.substring(1);
            
            document.querySelectorAll('.tab-content').forEach(section => {
                section.classList.remove('active');
            });

            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');

            const textoLink = this.innerText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF]|[\u2600-\u2B55]\uFE0F?/g, '').trim();
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.innerText = textoLink;
        }
        // Se for um link para outro arquivo (ex: agenda.html), ele deixa o navegador ir normalmente!
    });
});


// ==========================================
// 3. LÓGICA DE SALVAR AGENDAMENTO (No dashboard.html)
// ==========================================
const formAgendamento = document.getElementById('agendamento-form');

if (formAgendamento) {
    formAgendamento.addEventListener('submit', function(e) {
        e.preventDefault(); 

        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value; // CAPTURA O TELEFONE
        const servico = document.getElementById('servico').options[document.getElementById('servico').selectedIndex].text;
        const dataHoraRaw = document.getElementById('data-hora').value; 
        const hora = dataHoraRaw.split(' ')[1] || "00:00";

        // AGORA SALVAMOS O TELEFONE TAMBÉM!
        const novoAgendamento = { nome, telefone, servico, hora }; 
        
        let agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
        agendamentosSalvos.push(novoAgendamento);
        localStorage.setItem('agendamentos_barbearia', JSON.stringify(agendamentosSalvos));

        formAgendamento.reset();
        alert(`Sucesso! Agendamento de ${nome} às ${hora} confirmado.`);
        
        window.location.href = "agenda.html";
    });
}

// ==========================================
// 4. LÓGICA DE EXIBIR E ALTERNAR A AGENDA (No agenda.html)
// ==========================================
const btnToggleAgenda = document.getElementById('toggle-agenda-view');
const viewTimeline = document.getElementById('agenda-timeline-view');
const viewTable = document.getElementById('agenda-table-view');
const tabelaAgenda = document.getElementById('tabela-agenda-body');
const timeline = document.getElementById('daily-timeline');

// Elementos do Modal de Exclusão da Agenda
const modalConfirmacaoAgenda = document.getElementById('modal-confirmacao-agenda');
const btnCancelarAgenda = document.getElementById('btn-cancelar-agenda');
const btnConfirmarAgenda = document.getElementById('btn-confirmar-agenda');
let indexAgendaParaRemover = null;

if (btnToggleAgenda) {
    btnToggleAgenda.addEventListener('click', function() {
        if (viewTimeline.style.display !== 'none') {
            viewTimeline.style.display = 'none';
            viewTable.style.display = 'block';
            this.innerText = 'Ver Agenda do Dia';
        } else {
            viewTimeline.style.display = 'block';
            viewTable.style.display = 'none';
            this.innerText = 'Ver Tabela Completa';
        }
    });
}

if (tabelaAgenda && timeline) {
    function carregarAgendamentos() {
        let agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
        
        tabelaAgenda.innerHTML = '';
        timeline.innerHTML = '';

        if (agendamentosSalvos.length === 0) {
            timeline.innerHTML = '<p style="color: var(--text-muted); font-style: italic;">Nenhum agendamento para hoje.</p>';
            tabelaAgenda.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; font-style: italic; color: var(--text-muted);">Nenhum agendamento cadastrado.</td></tr>';
        } else {
            // Reparar no "index" aqui, é ele que diz qual item apagar
            agendamentosSalvos.forEach((agendamento, index) => {
                
                // TABELA: Adicionamos a lixeira na última coluna (junto com o Tempo)
                const novaLinha = `
                    <tr>
                        <td>${agendamento.hora}</td>
                        <td>${agendamento.nome}</td>
                        <td>${agendamento.servico}</td>
                        <td>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--text-muted);">45 min</span>
                                <button onclick="abrirModalExclusaoAgenda(${index})" class="btn-delete-icon" title="Cancelar Agendamento">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
                tabelaAgenda.innerHTML += novaLinha;

                // TIMELINE: Adicionamos a lixeira no final do cartão
                const novoSlot = `
                    <div class="timeline-slot">
                        <div class="slot-time">${agendamento.hora}</div>
                        <div class="slot-content">
                            <div class="appointment-card">
                                <div>
                                    <span class="client-name">${agendamento.nome}</span>
                                    <span class="service-tag" style="margin-left: 10px;">${agendamento.servico}</span>
                                </div>
                                <button onclick="abrirModalExclusaoAgenda(${index})" class="btn-delete-icon" title="Cancelar Agendamento">🗑️</button>
                            </div>
                        </div>
                    </div>
                `;
                timeline.innerHTML += novoSlot;
            });
        }
    }

    // FUNÇÕES DO MODAL DE EXCLUSÃO DA AGENDA
    window.abrirModalExclusaoAgenda = function(index) {
        indexAgendaParaRemover = index;
        modalConfirmacaoAgenda.classList.add('active');
    };

    function fecharModalAgenda() {
        if (modalConfirmacaoAgenda) {
            modalConfirmacaoAgenda.classList.remove('active');
            indexAgendaParaRemover = null;
        }
    }

    if (btnCancelarAgenda) {
        btnCancelarAgenda.addEventListener('click', fecharModalAgenda);
    }

    if (btnConfirmarAgenda) {
        btnConfirmarAgenda.addEventListener('click', function() {
            if (indexAgendaParaRemover !== null) {
                let agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
                
                // Remove o agendamento específico
                agendamentosSalvos.splice(indexAgendaParaRemover, 1);
                
                // Salva a nova lista no navegador
                localStorage.setItem('agendamentos_barbearia', JSON.stringify(agendamentosSalvos));
                
                // Recarrega a tela
                carregarAgendamentos();
                fecharModalAgenda();
            }
        });
    }

    carregarAgendamentos();
}

// ==========================================
// 5. LÓGICA PARA PÁGINA DE CLIENTES
// ==========================================
const tabelaClientes = document.getElementById('tabela-clientes-body');
const buscaCliente = document.getElementById('busca-cliente');

if (tabelaClientes) {
    function carregarClientes() {
        let agendamentos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
        
        // Remove duplicados para ter uma lista de clientes únicos
        let clientesUnicos = [];
        agendamentos.forEach(a => {
            if (!clientesUnicos.find(c => c.nome === a.nome)) {
                clientesUnicos.push(a);
            }
        });

        tabelaClientes.innerHTML = clientesUnicos.map(c => `
            <tr>
                <td>${c.nome}</td>
                <td>${c.telefone || '(81) 90000-0000'}</td>
                <td>28/04/2026</td>
                <td><button class="btn-check" style="background: none; border: none; cursor: pointer;">✏️</button></td>
            </tr>
        `).join('');
    }
    carregarClientes();
}

// ==========================================
// 6. LÓGICA PARA PÁGINA DE SERVIÇOS (COM MODAL)
// ==========================================
const gridServicos = document.getElementById('grid-servicos-container');
const btnAddServico = document.querySelector('#servicos-page .btn-toggle');

// Elementos do Pop-up (Modal)
const modalServico = document.getElementById('modal-servico');
const modalTitle = document.getElementById('modal-title');
const inputNomeServico = document.getElementById('input-nome-servico');
const inputPrecoServico = document.getElementById('input-preco-servico');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const btnSalvarModal = document.getElementById('btn-salvar-modal');

// Elementos do Modal de Confirmação (Exclusão)
const modalConfirmacao = document.getElementById('modal-confirmacao');
const btnCancelarExclusao = document.getElementById('btn-cancelar-exclusao');
const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');

let servicoEditandoIndex = null; // Ajuda a saber se estamos a criar ou a editar
let indexParaRemover = null; // Armazena temporariamente qual item será apagado

if (gridServicos && modalServico) {
    let servicos = JSON.parse(localStorage.getItem('servicos_barbearia')) || [
        { nome: "Corte Clássico", preco: "R$ 40,00" },
        { nome: "Barba Terapia", preco: "R$ 30,00" },
        { nome: "Combo (Corte + Barba)", preco: "R$ 60,00" },
        { nome: "Sobrancelha", preco: "R$ 15,00" }
    ];

    // RENDERIZA A LISTA NA TELA
    function carregarServicos() {
        gridServicos.innerHTML = servicos.map((s, index) => `
            <div class="card-servico">
                <strong style="font-size: 1.3rem; margin-bottom: 8px;">${s.nome}</strong>
                <span style="color: var(--primary-color); font-weight: bold; font-size: 1.1rem;">${s.preco}</span>
                <div class="card-actions">
                    <button onclick="abrirModalEditar(${index})" class="btn-editar-servico">Editar</button>
                    <button onclick="removerServico(${index})" class="btn-remover-servico">Remover</button>
                </div>
            </div>
        `).join('');
        localStorage.setItem('servicos_barbearia', JSON.stringify(servicos));
    }

    // FUNÇÕES DO MODAL DE EDIÇÃO/ADIÇÃO
    function abrirModal() {
        modalServico.classList.add('active');
    }

    function fecharModal() {
        modalServico.classList.remove('active');
        inputNomeServico.value = '';
        inputPrecoServico.value = '';
        servicoEditandoIndex = null; // Reseta o estado
    }

    // CLIQUE NO BOTÃO EDITAR
    window.abrirModalEditar = function(index) {
        servicoEditandoIndex = index;
        const servico = servicos[index];
        modalTitle.innerText = "Editar Serviço"; // Muda o título do pop-up
        inputNomeServico.value = servico.nome;   // Preenche com o nome atual
        inputPrecoServico.value = servico.preco; // Preenche com o preço atual
        abrirModal();
    };

    // CLIQUE NO BOTÃO REMOVER (Abre o modal de confirmação)
    window.removerServico = function(index) {
        indexParaRemover = index;
        modalConfirmacao.classList.add('active'); 
    };

    // FUNÇÕES DO MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
    function fecharModalConfirmacao() {
        if(modalConfirmacao) {
            modalConfirmacao.classList.remove('active');
            indexParaRemover = null;
        }
    }

    if(btnCancelarExclusao) {
        btnCancelarExclusao.addEventListener('click', fecharModalConfirmacao);
    }

    if(btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener('click', function() {
            if (indexParaRemover !== null) {
                servicos.splice(indexParaRemover, 1);
                carregarServicos();
                
                // Atualiza o select do dashboard se necessário
                if (typeof atualizarSelectDashboard === "function") {
                    atualizarSelectDashboard();
                }
                
                fecharModalConfirmacao();
            }
        });
    }

    // CLIQUE NO BOTÃO "+ ADICIONAR SERVIÇO"
    if (btnAddServico) {
        btnAddServico.addEventListener('click', function() {
            servicoEditandoIndex = null;
            modalTitle.innerText = "Adicionar Novo Serviço";
            abrirModal();
        });
    }

    // BOTÕES DE DENTRO DO POP-UP (Editar/Salvar)
    btnCancelarModal.addEventListener('click', fecharModal);

    btnSalvarModal.addEventListener('click', function() {
        const nome = inputNomeServico.value.trim();
        const preco = inputPrecoServico.value.trim();

        if (!nome || !preco) {
            alert("Por favor, preencha o nome e o preço do serviço.");
            return;
        }

        if (servicoEditandoIndex !== null) {
            // Se tinha um index, ele atualiza o serviço existente
            servicos[servicoEditandoIndex] = { nome, preco };
        } else {
            // Se for null, é porque está a criar um novo
            servicos.push({ nome, preco });
        }

        carregarServicos();
        fecharModal();
        
        // Atualiza o select do dashboard se necessário
        if (typeof atualizarSelectDashboard === "function") {
            atualizarSelectDashboard();
        }
    });

    carregarServicos();
}

// ==========================================
// 7. SINCRONIZAÇÃO DE SERVIÇOS COM O DASHBOARD
// ==========================================
const selectServicoDashboard = document.getElementById('servico');

function atualizarSelectDashboard() {
    // Só executa se estivermos na tela que tem o campo de seleção (Dashboard)
    if (selectServicoDashboard) {
        const servicosCadastrados = JSON.parse(localStorage.getItem('servicos_barbearia')) || [];
        
        // Mantém apenas a primeira opção ("Escolha o serviço...")
        selectServicoDashboard.innerHTML = '<option value="" disabled selected>Escolha o serviço...</option>';

        // Adiciona cada serviço cadastrado como uma nova opção
        servicosCadastrados.forEach(s => {
            const option = document.createElement('option');
            option.value = s.nome.toLowerCase().replace(/\s+/g, '-'); // Cria um valor slug (ex: "corte-classico")
            option.textContent = `${s.nome} (${s.preco})`;
            selectServicoDashboard.appendChild(option);
        });
    }
}

// Chama a função ao carregar a página para garantir que o select esteja atualizado
atualizarSelectDashboard();

// ==========================================
// 8. MÁSCARA DE TELEFONE (Formatação Automática)
// ==========================================
const inputTelefone = document.getElementById('telefone');

if (inputTelefone) {
    inputTelefone.addEventListener('input', function(e) {
        // Remove tudo o que não for número da digitação
        let value = e.target.value.replace(/\D/g, ''); 
        
        // Limita a digitação a no máximo 11 números (2 do DDD + 9 do celular)
        if (value.length > 11) {
            value = value.substring(0, 11);
        }

        // Aplica a formatação mágica
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); // Coloca parênteses no DDD
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');    // Coloca o hífen antes dos últimos 4 dígitos
        
        // Atualiza o valor do campo na tela
        e.target.value = value;
    });
}