// 1. CALENDÁRIO E NAVEGAÇÃO
if (document.getElementById("data-hora")) {
    flatpickr("#data-hora", { enableTime: true, dateFormat: "d/m/Y H:i", minDate: "today", time_24hr: true, locale: "pt", minTime: "08:00", maxTime: "20:00", disable: [function(date) { return (date.getDay() === 0); }] });
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.startsWith('#')) {
            e.preventDefault();
            document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const targetId = href.substring(1);
            document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
            const targetSection = document.getElementById(targetId);
            if (targetSection) targetSection.classList.add('active');
            const textoLink = this.innerText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF]|[\u2600-\u2B55]\uFE0F?/g, '').trim();
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.innerText = textoLink;
        }
    });
});

// 2. FUNÇÕES AUXILIARES (Toasts, Horas, WhatsApp)
window.fecharNotificacao = function() {
    const toast = document.getElementById('custom-toast');
    if (toast) { toast.classList.remove('show'); if (toast.hideTimeout) clearTimeout(toast.hideTimeout); }
};

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        document.body.appendChild(toast);
    }
    if (toast.hideTimeout) clearTimeout(toast.hideTimeout);
    toast.className = `toast-notification ${tipo === 'erro' ? 'error' : ''}`;
    toast.innerHTML = `<span style="font-size: 1.5rem; line-height: 1;">${tipo === 'erro' ? '⚠️' : '✅'}</span> <div style="flex: 1;">${mensagem}</div><button class="toast-close" onclick="fecharNotificacao()" title="Fechar">&times;</button>`;
    setTimeout(() => { toast.classList.add('show'); }, 10);
    toast.hideTimeout = setTimeout(() => { toast.classList.remove('show'); }, tipo === 'erro' ? 8000 : 3000);
}

function timeToMins(timeStr) { const partes = timeStr.split(':'); return parseInt(partes[0]) * 60 + parseInt(partes[1]); }
function minsToTime(mins) { const h = Math.floor(mins / 60).toString().padStart(2, '0'); const m = (mins % 60).toString().padStart(2, '0'); return `${h}:${m}`; }
function obterDuracaoServico(nomeServico) {
    const nome = nomeServico.toLowerCase();
    if (nome.includes('combo')) return 60;
    if (nome.includes('barba')) return 30;
    if (nome.includes('sobrancelha')) return 15;
    return 45;
}
function gerarLinkWhatsApp(telefone, mensagem) {
    if (!telefone) return '#';
    let numeroLimpo = telefone.replace(/\D/g, '');
    if (numeroLimpo.length === 10 || numeroLimpo.length === 11) numeroLimpo = '55' + numeroLimpo;
    return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
}

// 3. SALVAR AGENDAMENTO E CLIENTE
const formAgendamento = document.getElementById('agendamento-form');
if (formAgendamento) {
    formAgendamento.addEventListener('submit', function(e) {
        e.preventDefault();
        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;
        const servico = document.getElementById('servico').options[document.getElementById('servico').selectedIndex].text;
        const selectProfissional = document.getElementById('profissional');
        const profissional = selectProfissional ? selectProfissional.value : 'Cassiano';
        const dataHoraRaw = document.getElementById('data-hora').value;
        const data = dataHoraRaw.split(' ')[0] || "00/00/0000";
        const hora = dataHoraRaw.split(' ')[1] || "00:00";
        
        let agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
        const duracaoNovo = obterDuracaoServico(servico);
        const novoInicioMins = timeToMins(hora);
        const novoFimMins = novoInicioMins + duracaoNovo;

        // FILTRA AGENDA PELO BARBEIRO E DIA
        const ocupadosNoDia = agendamentosSalvos.filter(a => {
            const isMesmoDia = (a.data === data || !a.data);
            const isMesmoProfissional = (a.profissional || 'Cassiano') === profissional;
            return isMesmoDia && isMesmoProfissional;
        });

        const conflito = ocupadosNoDia.find(a => {
            const aInicio = timeToMins(a.hora);
            const aFim = aInicio + (a.duracao || 45);
            return (novoInicioMins < aFim) && (novoFimMins > aInicio);
        });

        if (conflito) {
            let msgErro = `<strong style="font-size: 1.1em;">Agenda de ${profissional} Ocupada</strong><br><br>O horário das ${hora} choca com outro cliente no dia ${data}.<br>`;
            mostrarNotificacao(msgErro, 'erro');
            return;
        }

        // SALVA NA AGENDA
        agendamentosSalvos.push({ nome, telefone, servico, profissional, data, hora, duracao: duracaoNovo, status: 'pendente' });
        localStorage.setItem('agendamentos_barbearia', JSON.stringify(agendamentosSalvos));

        // SALVA NA BASE DE CLIENTES
        let clientesSalvos = JSON.parse(localStorage.getItem('clientes_barbearia')) || [];
        let clienteExistente = clientesSalvos.find(c => c.telefone === telefone);
        if (clienteExistente) {
            clienteExistente.ultimaVisita = data;
            clienteExistente.cortesTotal = (clienteExistente.cortesTotal || 1) + 1;
            clienteExistente.servicoFavorito = servico;
        } else {
            clientesSalvos.push({ nome, telefone, ultimaVisita: data, servicoFavorito: servico, cortesTotal: 1 });
        }
        localStorage.setItem('clientes_barbearia', JSON.stringify(clientesSalvos));

        formAgendamento.reset();
        mostrarNotificacao(`Agendamento com ${profissional} confirmado! ✅`);
        setTimeout(() => { window.location.href = "agenda.html"; }, 2000);
    });
}

// 4. LÓGICA DA AGENDA (Datas, Status e Múltiplos)
const btnToggleAgenda = document.getElementById('toggle-agenda-view');
const viewTimeline = document.getElementById('agenda-timeline-view');
const viewTable = document.getElementById('agenda-table-view');
const tabelaAgenda = document.getElementById('tabela-agenda-body');
const timeline = document.getElementById('daily-timeline');
const displayData = document.getElementById('display-data-agenda');
const modalConfirmacaoAgenda = document.getElementById('modal-confirmacao-agenda');
const btnCancelarAgenda = document.getElementById('btn-cancelar-agenda');
const btnConfirmarAgenda = document.getElementById('btn-confirmar-agenda');
let indexAgendaParaRemover = null;
let dataSelecionada = new Date();

if (btnToggleAgenda) {
    btnToggleAgenda.addEventListener('click', function() {
        if (viewTimeline.style.display !== 'none') {
            viewTimeline.style.display = 'none'; viewTable.style.display = 'block'; this.innerText = 'Ver Agenda do Dia';
        } else {
            viewTimeline.style.display = 'block'; viewTable.style.display = 'none'; this.innerText = 'Ver Tabela Completa';
        }
    });
}

function formatarDataParaDisplay(date) {
    const hoje = new Date();
    const prefixo = date.toDateString() === hoje.toDateString() ? "Hoje - " : "";
    return prefixo + date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function formatarDataParaFiltro(date) {
    return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
}

if (tabelaAgenda && timeline) {
    function carregarAgendamentos() {
        let agendamentos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
        let agendamentosComIndex = agendamentos.map((ag, index) => ({ ...ag, indexOriginal: index }));
        const filtro = formatarDataParaFiltro(dataSelecionada);
        if (displayData) displayData.innerText = formatarDataParaDisplay(dataSelecionada);

        let agendamentosDoDia = agendamentosComIndex.filter(a => a.data === filtro);
        agendamentosDoDia.sort((a, b) => a.hora.localeCompare(b.hora));

        tabelaAgenda.innerHTML = ''; timeline.innerHTML = '';

        if (agendamentosDoDia.length === 0) {
            timeline.innerHTML = '<p style="color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Nenhum agendamento para este dia.</p>';
            tabelaAgenda.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; font-style: italic; color: var(--text-muted);">Nenhum agendamento para este dia.</td></tr>';
        } else {
            agendamentosDoDia.forEach(ag => {
                const duracao = ag.duracao || 45;
                const msgLembrete = `Olá ${ag.nome}, passando para confirmar o seu horário às ${ag.hora} para o serviço de ${ag.servico} com ${ag.profissional || 'Cassiano'} na Dom Barbershop!`;
                const linkWhats = gerarLinkWhatsApp(ag.telefone, msgLembrete);
                
                let botoesAcao = ''; let statusText = ''; let borderStyle = ''; let opacityStyle = '';

                if (ag.status === 'concluido') {
                    opacityStyle = 'opacity: 0.7;'; borderStyle = 'border-left: 4px solid var(--success-color);';
                    statusText = '<span style="color: var(--success-color); font-size: 0.8rem; font-weight: bold; margin-top: 5px; display: inline-block;">✅ CONCLUÍDO</span>';
                    botoesAcao = `<button onclick="abrirModalExclusaoAgenda(${ag.indexOriginal})" class="btn-delete-icon" title="Excluir Histórico">🗑️</button>`;
                } else if (ag.status === 'faltou') {
                    opacityStyle = 'opacity: 0.6;'; borderStyle = 'border-left: 4px solid var(--danger-color);';
                    statusText = '<span style="color: var(--danger-color); font-size: 0.8rem; font-weight: bold; margin-top: 5px; display: inline-block;">❌ FALTOU</span>';
                    botoesAcao = `<button onclick="abrirModalExclusaoAgenda(${ag.indexOriginal})" class="btn-delete-icon" title="Excluir Histórico">🗑️</button>`;
                } else {
                    botoesAcao = `
                        <a href="${linkWhats}" target="_blank" style="text-decoration: none; font-size: 1.2rem; transition: 0.3s;" title="Enviar Lembrete">💬</a>
                        <button onclick="alterarStatusAgendamento(${ag.indexOriginal}, 'concluido')" style="background:none; border:none; cursor:pointer; font-size: 1.2rem;" title="Marcar Concluído">✅</button>
                        <button onclick="alterarStatusAgendamento(${ag.indexOriginal}, 'faltou')" style="background:none; border:none; cursor:pointer; font-size: 1.2rem;" title="Cliente Faltou">❌</button>
                        <button onclick="abrirModalExclusaoAgenda(${ag.indexOriginal})" class="btn-delete-icon" title="Cancelar Horário">🗑️</button>
                    `;
                }
                
                tabelaAgenda.innerHTML += `
                    <tr style="${opacityStyle}">
                        <td>${ag.hora}</td>
                        <td>${ag.nome} <br> ${statusText}</td>
                        <td>${ag.servico} <br> <small style="color: var(--primary-color); font-weight: bold;">💈 ${ag.profissional || 'Cassiano'}</small></td>
                        <td>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="color: var(--text-muted);">${duracao} min</span>
                                <div style="display: flex; gap: 10px; align-items: center;">${botoesAcao}</div>
                            </div>
                        </td>
                    </tr>`;

                timeline.innerHTML += `
                    <div class="timeline-slot" style="${opacityStyle}">
                        <div class="slot-time">${ag.hora}</div>
                        <div class="slot-content">
                            <div class="appointment-card" style="${borderStyle}">
                                <div>
                                    <span class="client-name">${ag.nome}</span>
                                    <span class="service-tag" style="margin-left: 10px;">${ag.servico}</span>
                                    <span class="service-tag" style="margin-left: 5px; background: var(--bg-body); color: var(--text-color); border: 1px solid var(--border-color);">💈 ${ag.profissional || 'Cassiano'}</span>
                                    <br>${statusText}
                                </div>
                                <div style="display: flex; gap: 10px; align-items: center;">${botoesAcao}</div>
                            </div>
                        </div>
                    </div>`;
            });
        }
    }

    window.alterarStatusAgendamento = function(index, status) {
        let agendamentos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
        let ag = agendamentos[index];
        if (!ag) return;
        ag.status = status;
        
        if (status === 'faltou') {
            let clientes = JSON.parse(localStorage.getItem('clientes_barbearia')) || [];
            let cIndex = clientes.findIndex(c => c.telefone === ag.telefone);
            if (cIndex !== -1 && clientes[cIndex].cortesTotal > 0) {
                clientes[cIndex].cortesTotal -= 1;
                localStorage.setItem('clientes_barbearia', JSON.stringify(clientes));
            }
        }
        localStorage.setItem('agendamentos_barbearia', JSON.stringify(agendamentos));
        mostrarNotificacao(`Status alterado: ${status === 'concluido' ? 'Concluído ✅' : 'Faltou ❌'}`, status === 'faltou' ? 'erro' : 'sucesso');
        carregarAgendamentos();
    };

    window.abrirModalExclusaoAgenda = function(index) { indexAgendaParaRemover = index; modalConfirmacaoAgenda.classList.add('active'); };
    function fecharModalAgenda() { if (modalConfirmacaoAgenda) { modalConfirmacaoAgenda.classList.remove('active'); indexAgendaParaRemover = null; } }
    if (btnCancelarAgenda) btnCancelarAgenda.addEventListener('click', fecharModalAgenda);
    if (btnConfirmarAgenda) {
        const cloneBtn = btnConfirmarAgenda.cloneNode(true);
        btnConfirmarAgenda.parentNode.replaceChild(cloneBtn, btnConfirmarAgenda);
        cloneBtn.addEventListener('click', function() {
            if (indexAgendaParaRemover !== null) {
                let agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
                let agParaRemover = agendamentosSalvos[indexAgendaParaRemover];
                
                if (agParaRemover && (!agParaRemover.status || agParaRemover.status === 'pendente')) {
                    let clientes = JSON.parse(localStorage.getItem('clientes_barbearia')) || [];
                    let cIndex = clientes.findIndex(c => c.telefone === agParaRemover.telefone);
                    if (cIndex !== -1 && clientes[cIndex].cortesTotal > 0) {
                        clientes[cIndex].cortesTotal -= 1;
                        localStorage.setItem('clientes_barbearia', JSON.stringify(clientes));
                    }
                }
                agendamentosSalvos.splice(indexAgendaParaRemover, 1);
                localStorage.setItem('agendamentos_barbearia', JSON.stringify(agendamentosSalvos));
                carregarAgendamentos();
                fecharModalAgenda();
            }
        });
    }

    if (displayData) {
        document.getElementById('btn-prev-day').addEventListener('click', () => { dataSelecionada.setDate(dataSelecionada.getDate() - 1); carregarAgendamentos(); });
        document.getElementById('btn-next-day').addEventListener('click', () => { dataSelecionada.setDate(dataSelecionada.getDate() + 1); carregarAgendamentos(); });
        const picker = flatpickr("#datepicker-agenda", { locale: "pt", dateFormat: "d/m/Y", disableMobile: "true", onChange: function(selectedDates) { dataSelecionada = selectedDates[0]; carregarAgendamentos(); } });
        document.getElementById('container-datepicker-agenda').addEventListener('click', () => picker.open());
    }

    carregarAgendamentos();
}

// 5. CLIENTES E PERFIL
const tabelaClientes = document.getElementById('tabela-clientes-body');
const modalPerfil = document.getElementById('modal-perfil-cliente');
let telefoneClienteAtivo = null;

if (tabelaClientes) {
    function carregarClientes() {
        let clientes = JSON.parse(localStorage.getItem('clientes_barbearia')) || [];
        tabelaClientes.innerHTML = '';
        if (clientes.length === 0) {
            tabelaClientes.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; font-style: italic; color: var(--text-muted);">Nenhum cliente cadastrado ainda.</td></tr>';
            return;
        }
        clientes.sort((a, b) => {
            const dataA = a.ultimaVisita ? a.ultimaVisita.split('/').reverse().join('') : '0';
            const dataB = b.ultimaVisita ? b.ultimaVisita.split('/').reverse().join('') : '0';
            return dataB.localeCompare(dataA);
        });
        tabelaClientes.innerHTML = clientes.map(c => {
            const linkWhats = gerarLinkWhatsApp(c.telefone, `Olá ${c.nome}, tudo bem? Aqui é da Dom Barbershop!`);
            return `
            <tr>
                <td style="font-weight: bold; color: var(--text-color);">${c.nome}</td>
                <td><a href="${linkWhats}" target="_blank" style="color: var(--success-color); text-decoration: none; font-weight: bold;">💬 ${c.telefone}</a></td>
                <td>${c.ultimaVisita || 'Sem registo'}</td>
                <td>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span><strong style="color: var(--primary-color);">${c.cortesTotal || 0}</strong> cortes</span>
                        <button onclick="abrirPerfilCliente('${c.telefone}')" class="btn-check" style="background: none; border: none; cursor: pointer;">✏️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    window.abrirPerfilCliente = function(telefone) {
        let clientes = JSON.parse(localStorage.getItem('clientes_barbearia')) || [];
        const cliente = clientes.find(c => c.telefone === telefone);
        if (cliente) {
            telefoneClienteAtivo = telefone;
            document.getElementById('perfil-nome-cliente').innerText = cliente.nome;
            document.getElementById('perfil-telefone').innerText = cliente.telefone;
            document.getElementById('perfil-visita').innerText = cliente.ultimaVisita || 'Nenhuma visita';
            document.getElementById('perfil-servico').innerText = cliente.servicoFavorito || '---';
            const totalCortes = cliente.cortesTotal || 0;
            document.getElementById('perfil-cortes').innerText = totalCortes;
            const btnPremio = document.getElementById('btn-resgatar-premio');
            if (btnPremio) btnPremio.style.display = totalCortes >= 10 ? 'block' : 'none';
            modalPerfil.classList.add('active');
        }
    };

    window.fecharPerfilCliente = function() { modalPerfil.classList.remove('active'); telefoneClienteAtivo = null; };
    
    window.zerarCortes = function() {
        let clientes = JSON.parse(localStorage.getItem('clientes_barbearia')) || [];
        const index = clientes.findIndex(c => c.telefone === telefoneClienteAtivo);
        if (index !== -1) {
            clientes[index].cortesTotal = 0;
            localStorage.setItem('clientes_barbearia', JSON.stringify(clientes));
            mostrarNotificacao("Prêmio resgatado! Contador zerado.");
            carregarClientes(); fecharPerfilCliente();
        }
    };
    
    window.excluirCliente = function() {
        let clientes = JSON.parse(localStorage.getItem('clientes_barbearia')) || [];
        const novaLista = clientes.filter(c => c.telefone !== telefoneClienteAtivo);
        localStorage.setItem('clientes_barbearia', JSON.stringify(novaLista));
        mostrarNotificacao("Cliente removido.");
        carregarClientes(); fecharPerfilCliente();
    };

    carregarClientes();
}

// 6. SERVIÇOS E DASHBOARD CARDS
const gridServicos = document.getElementById('grid-servicos-container');
const btnAddServico = document.querySelector('#servicos-page .btn-toggle');
const modalServico = document.getElementById('modal-servico');
const modalTitle = document.getElementById('modal-title');
const inputNomeServico = document.getElementById('input-nome-servico');
const inputPrecoServico = document.getElementById('input-preco-servico');
const btnCancelarModal = document.getElementById('btn-cancelar-modal');
const btnSalvarModal = document.getElementById('btn-salvar-modal');
const modalConfirmacao = document.getElementById('modal-confirmacao');
const btnCancelarExclusao = document.getElementById('btn-cancelar-exclusao');
const btnConfirmarExclusao = document.getElementById('btn-confirmar-exclusao');
let servicoEditandoIndex = null; let indexParaRemover = null;

if (gridServicos && modalServico) {
    let servicos = JSON.parse(localStorage.getItem('servicos_barbearia')) || [
        { nome: "Corte Clássico", preco: "R$ 40,00" }, { nome: "Barba Terapia", preco: "R$ 30,00" },
        { nome: "Combo (Corte + Barba)", preco: "R$ 60,00" }, { nome: "Sobrancelha", preco: "R$ 15,00" }
    ];

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

    function abrirModal() { modalServico.classList.add('active'); }
    function fecharModal() { modalServico.classList.remove('active'); inputNomeServico.value = ''; inputPrecoServico.value = ''; servicoEditandoIndex = null; }

    window.abrirModalEditar = function(index) {
        servicoEditandoIndex = index; modalTitle.innerText = "Editar Serviço";
        inputNomeServico.value = servicos[index].nome; inputPrecoServico.value = servicos[index].preco;
        abrirModal();
    };

    window.removerServico = function(index) { indexParaRemover = index; modalConfirmacao.classList.add('active'); };
    function fecharModalConfirmacao() { if(modalConfirmacao) { modalConfirmacao.classList.remove('active'); indexParaRemover = null; } }
    
    if(btnCancelarExclusao) btnCancelarExclusao.addEventListener('click', fecharModalConfirmacao);
    if(btnConfirmarExclusao) {
        btnConfirmarExclusao.addEventListener('click', function() {
            if (indexParaRemover !== null) {
                servicos.splice(indexParaRemover, 1); carregarServicos();
                if (typeof atualizarSelectDashboard === "function") atualizarSelectDashboard();
                fecharModalConfirmacao();
            }
        });
    }

    if (btnAddServico) { btnAddServico.addEventListener('click', function() { servicoEditandoIndex = null; modalTitle.innerText = "Adicionar Novo Serviço"; abrirModal(); }); }
    btnCancelarModal.addEventListener('click', fecharModal);
    btnSalvarModal.addEventListener('click', function() {
        const nome = inputNomeServico.value.trim(); const preco = inputPrecoServico.value.trim();
        if (!nome || !preco) return alert("Preencha nome e preço.");
        if (servicoEditandoIndex !== null) servicos[servicoEditandoIndex] = { nome, preco };
        else servicos.push({ nome, preco });
        carregarServicos(); fecharModal();
        if (typeof atualizarSelectDashboard === "function") atualizarSelectDashboard();
    });
    carregarServicos();
}

const selectServicoDashboard = document.getElementById('servico');
function atualizarSelectDashboard() {
    if (selectServicoDashboard) {
        const servicosCadastrados = JSON.parse(localStorage.getItem('servicos_barbearia')) || [];
        selectServicoDashboard.innerHTML = '<option value="" disabled selected>Escolha o serviço...</option>';
        servicosCadastrados.forEach(s => {
            const option = document.createElement('option');
            option.value = s.nome.toLowerCase().replace(/\s+/g, '-');
            option.textContent = `${s.nome} (${s.preco})`;
            selectServicoDashboard.appendChild(option);
        });
    }
}
atualizarSelectDashboard();

const inputTelefone = document.getElementById('telefone');
if (inputTelefone) {
    inputTelefone.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, ''); 
        if (value.length > 11) value = value.substring(0, 11);
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2'); value = value.replace(/(\d)(\d{4})$/, '$1-$2');    
        e.target.value = value;
    });
}

function atualizarDashboardCards() {
    const cardsNumbers = document.querySelectorAll('.dashboard-cards .card .number');
    const cardProximoCliente = document.querySelector('.dashboard-cards .card .next-client');
    const cardFaturamento = document.getElementById('faturamento-hoje');

    if (cardsNumbers.length > 0 && cardProximoCliente) {
        let agendamentos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
        const agora = new Date();
        const diaAtual = String(agora.getDate()).padStart(2, '0') + '/' + String(agora.getMonth() + 1).padStart(2, '0') + '/' + agora.getFullYear();
        const horaAtual = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');

        let agendamentosHoje = agendamentos.filter(a => a.data === diaAtual || !a.data);
        cardsNumbers[0].innerText = agendamentosHoje.filter(a => a.status !== 'faltou').length;

        if (cardFaturamento) {
            let totalFaturamento = 0;
            agendamentosHoje.forEach(ag => {
                if (ag.status !== 'faltou') {
                    const match = ag.servico.match(/R\$\s*(\d+(?:,\d{2})?)/);
                    if (match) totalFaturamento += parseFloat(match[1].replace(',', '.'));
                }
            });
            cardFaturamento.innerText = `R$ ${totalFaturamento.toFixed(2).replace('.', ',')}`;
        }

        if (agendamentosHoje.length > 0) {
            agendamentosHoje.sort((a, b) => a.hora.localeCompare(b.hora));
            const proximo = agendamentosHoje.find(ag => ag.hora >= horaAtual && (!ag.status || ag.status === 'pendente'));
            cardProximoCliente.innerText = proximo ? `${proximo.nome} (${proximo.hora})` : "Sem mais clientes pendentes"; 
        } else {
            cardProximoCliente.innerText = "Agenda Livre"; 
        }
    }
}
atualizarDashboardCards();

function verificarLembretesUrgentes() {
    let agendamentos = JSON.parse(localStorage.getItem('agendamentos_barbearia')) || [];
    const agora = new Date();
    let teveAlteracao = false;

    agendamentos.forEach(ag => {
        if (ag.status === 'faltou' || ag.status === 'concluido') return;
        const dataAg = ag.data || ""; if (!dataAg.includes('/')) return;
        const [dia, mes, ano] = dataAg.split('/'); const [horas, mins] = ag.hora.split(':');
        const dataAgendamento = new Date(ano, mes - 1, dia, horas, mins);
        const diffHoras = (dataAgendamento - agora) / (1000 * 60 * 60);

        if (diffHoras > 0 && diffHoras <= 6 && !ag.lembreteMostrado) {
            const msg = `Olá ${ag.nome}, confirmamos o seu horário na Dom Barbershop daqui a pouco, às ${ag.hora}. Até já!`;
            const link = typeof gerarLinkWhatsApp === 'function' ? gerarLinkWhatsApp(ag.telefone, msg) : '#';
            mostrarNotificacao(`🕒 <strong>Lembrete Urgente:</strong> ${ag.nome} às ${ag.hora}. <br><a href="${link}" target="_blank" onclick="fecharNotificacao()" style="color: #fff; text-decoration: underline; font-weight: bold;">ENVIAR WHATSAPP</a>`, 'erro');
            ag.lembreteMostrado = true; teveAlteracao = true;
        }
    });
    if (teveAlteracao) localStorage.setItem('agendamentos_barbearia', JSON.stringify(agendamentos));
}

if (document.getElementById('dashboard-page')) {
    setTimeout(verificarLembretesUrgentes, 1000);
    setInterval(verificarLembretesUrgentes, 300000);
}