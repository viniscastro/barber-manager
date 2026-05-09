                   //Calendário e navegação
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

           //funções auxiliares
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

          //salver agendamento e cliente
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

        agendamentosSalvos.push({ nome, telefone, servico, profissional, data, hora, duracao: duracaoNovo, status: 'pendente' });
        localStorage.setItem('agendamentos_barbearia', JSON.stringify(agendamentosSalvos));

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
         //agenda integrada ao docker
const API_AGENDA = "http://localhost:8002/agendamentos/";
const API_CLIENTES_AGENDA = "http://localhost:8001/clientes/";
const API_SERVICOS_AGENDA = "http://localhost:8000/servicos/";

const btnToggleAgenda = document.getElementById('toggle-agenda-view');
const viewTimeline = document.getElementById('agenda-timeline-view');
const viewTable = document.getElementById('agenda-table-view');
const tabelaAgenda = document.getElementById('tabela-agenda-body');
const timeline = document.getElementById('daily-timeline');
const displayData = document.getElementById('display-data-agenda');
const modalConfirmacaoAgenda = document.getElementById('modal-confirmacao-agenda');
const btnCancelarAgenda = document.getElementById('btn-cancelar-agenda');
const btnConfirmarAgenda = document.getElementById('btn-confirmar-agenda');
let idAgendaParaRemover = null;
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
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
}

if (tabelaAgenda && timeline) {
    window.carregarAgendamentos = async function() {
        try {
            const [resAgenda, resClientes, resServicos] = await Promise.all([
                fetch(API_AGENDA),
                fetch(API_CLIENTES_AGENDA),
                fetch(API_SERVICOS_AGENDA)
            ]);

            let agendamentos = await resAgenda.json();
            let clientes = await resClientes.json();
            let servicos = await resServicos.json();
            const filtro = formatarDataParaFiltro(dataSelecionada);
            if (displayData) displayData.innerText = formatarDataParaDisplay(dataSelecionada);

            let agendamentosDoDia = agendamentos.filter(a => a.data_hora && a.data_hora.startsWith(filtro));
            agendamentosDoDia.sort((a, b) => a.data_hora.localeCompare(b.data_hora));
            tabelaAgenda.innerHTML = ''; timeline.innerHTML = '';

            if (agendamentosDoDia.length === 0) {
                timeline.innerHTML = '<p style="color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Nenhum agendamento para este dia.</p>';
                tabelaAgenda.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; font-style: italic; color: var(--text-muted);">Nenhum agendamento para este dia.</td></tr>';
            } else {
                agendamentosDoDia.forEach(ag => {
                    const clienteObj = clientes.find(c => c.id === ag.cliente_id) || { nome: 'Cliente Antigo', telefone: '' };
                    const servicoObj = servicos.find(s => s.id === ag.servico_id) || { nome: 'Serviço Removido' };
                    const horaDisplay = ag.data_hora.split('T')[1].substring(0, 5);
                    const duracao = ag.duracao || 45;
                    const msgLembrete = `Olá ${clienteObj.nome}, confirmamos seu horário às ${horaDisplay}...`;
                    const linkWhats = gerarLinkWhatsApp(clienteObj.telefone, msgLembrete);
                    
                    let statusText = ''; let borderStyle = ''; let opacityStyle = '';
                    let statusLower = ag.status ? ag.status.toLowerCase() : 'pendente';

                    if (statusLower === 'concluido') {
                        opacityStyle = 'opacity: 0.7;'; borderStyle = 'border-left: 4px solid var(--success-color);';
                        statusText = '<span style="color: var(--success-color); font-weight: bold;">✅ CONCLUÍDO</span>';
                    } else if (statusLower === 'faltou') {
                        opacityStyle = 'opacity: 0.6;'; borderStyle = 'border-left: 4px solid var(--danger-color);';
                        statusText = '<span style="color: var(--danger-color); font-weight: bold;">❌ FALTOU</span>';
                    }
                    tabelaAgenda.innerHTML += `
                        <tr style="${opacityStyle}">
                            <td>${horaDisplay}</td>
                            <td>${clienteObj.nome} <br> ${statusText}</td>
                            <td>${servicoObj.nome}</td>
                            <td><button onclick="abrirModalExclusaoAgenda(${ag.id})">🗑️</button></td>
                        </tr>`;
                    timeline.innerHTML += `
                        <div class="timeline-slot" style="${opacityStyle}">
                            <div class="slot-time">${horaDisplay}</div>
                            <div class="appointment-card" style="${borderStyle}">
                                <div>
                                    <span class="client-name">${clienteObj.nome}</span>
                                    <span class="service-tag">${servicoObj.nome}</span>
                                    <br>${statusText}
                                </div>
                                <button onclick="abrirModalExclusaoAgenda(${ag.id})">🗑️</button>
                            </div>
                        </div>`;
                });
            }
        } catch (erro) {
            console.error("Erro ao carregar a Agenda:", erro);
        }
    }

    window.alterarStatusAgendamento = async function(id, status) {
        try {
            const res = await fetch(`${API_AGENDA}${id}`);
            const ag = await res.json();
            await fetch(`${API_AGENDA}${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...ag, status: status })
            });

            mostrarNotificacao(`Status alterado: ${status === 'concluido' ? 'Concluído ✅' : 'Faltou ❌'}`, status === 'faltou' ? 'erro' : 'sucesso');
            carregarAgendamentos();
        } catch (e) {
            mostrarNotificacao("Erro ao atualizar status.", "erro");
        }
    };

    window.abrirModalExclusaoAgenda = function(id) { idAgendaParaRemover = id; modalConfirmacaoAgenda.classList.add('active'); };
    function fecharModalAgenda() { if (modalConfirmacaoAgenda) { modalConfirmacaoAgenda.classList.remove('active'); idAgendaParaRemover = null; } }
    
    if (btnCancelarAgenda) btnCancelarAgenda.addEventListener('click', fecharModalAgenda);
    
    if (btnConfirmarAgenda) {
        const cloneBtn = btnConfirmarAgenda.cloneNode(true);
        btnConfirmarAgenda.parentNode.replaceChild(cloneBtn, btnConfirmarAgenda);
        cloneBtn.addEventListener('click', async function() {
            if (idAgendaParaRemover !== null) {
                try {
                    await fetch(`${API_AGENDA}${idAgendaParaRemover}`, { method: 'DELETE' });
                    carregarAgendamentos();
                    fecharModalAgenda();
                    mostrarNotificacao("Horário removido da agenda.");
                } catch (e) {
                    mostrarNotificacao("Erro ao deletar do banco.", "erro");
                }
            }
        });
    }

    if (displayData) {
        document.getElementById('btn-prev-day').addEventListener('click', () => { dataSelecionada.setDate(dataSelecionada.getDate() - 1); carregarAgendamentos(); });
        document.getElementById('btn-next-day').addEventListener('click', () => { dataSelecionada.setDate(dataSelecionada.getDate() + 1); carregarAgendamentos(); });
        const picker = flatpickr("#datepicker-agenda", { locale: "pt", dateFormat: "Y-m-d", disableMobile: "true", onChange: function(selectedDates) { dataSelecionada = selectedDates[0]; carregarAgendamentos(); } });
        document.getElementById('container-datepicker-agenda').addEventListener('click', () => picker.open());
    }

    carregarAgendamentos();
}
         //clientes e perfil
const API_CLIENTES = "http://localhost:8001/clientes/";

const tabelaClientes = document.getElementById('tabela-clientes-body');
const modalPerfil = document.getElementById('modal-perfil-cliente');
const inputBuscaCliente = document.getElementById('busca-cliente');

let clienteAtivoId = null;
let listaDeClientes = [];

if (tabelaClientes) {
    window.carregarClientes = async function() {
        try {
            const resposta = await fetch(API_CLIENTES);
            if (!resposta.ok) throw new Error("Erro na resposta da API");
            listaDeClientes = await resposta.json();
            renderizarTabelaClientes(listaDeClientes);
        } catch (erro) {
            console.error("Erro ao puxar dados da porta 8001:", erro);
            tabelaClientes.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger-color); padding: 30px;">Erro ao conectar com o banco de dados. O Docker tá rodando?</td></tr>';
        }
    }

    function renderizarTabelaClientes(clientes) {
        tabelaClientes.innerHTML = '';
        if (clientes.length === 0) {
            tabelaClientes.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 30px; font-style: italic; color: var(--text-muted);">Nenhum cliente cadastrado no banco ainda.</td></tr>';
            return;
        }
        clientes.sort((a, b) => (b.cortes_total || 0) - (a.cortes_total || 0));

        tabelaClientes.innerHTML = clientes.map(c => {
            const linkWhats = gerarLinkWhatsApp(c.telefone, `Olá ${c.nome}, tudo bem? Aqui é da Dom Barbershop!`);
            const cortes = c.cortes_total || 0;
            const ultimaVisita = c.ultima_visita || 'Sem registro';

            return `
            <tr>
                <td style="font-weight: bold; color: var(--text-color);">${c.nome}</td>
                <td><a href="${linkWhats}" target="_blank" style="color: var(--success-color); text-decoration: none; font-weight: bold;">💬 ${c.telefone || '---'}</a></td>
                <td>${ultimaVisita}</td>
                <td>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span><strong style="color: var(--primary-color);">${cortes}</strong> cortes</span>
                        <button onclick="abrirPerfilCliente(${c.id})" class="btn-check" style="background: none; border: none; cursor: pointer;" title="Ver Perfil">✏️</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    }
    if (inputBuscaCliente) {
        inputBuscaCliente.addEventListener('input', (e) => {
            const termo = e.target.value.toLowerCase();
            const filtrados = listaDeClientes.filter(c => 
                c.nome.toLowerCase().includes(termo) || 
                (c.telefone && c.telefone.includes(termo))
            );
            renderizarTabelaClientes(filtrados);
        });
    }
    window.abrirPerfilCliente = function(id) {
        const cliente = listaDeClientes.find(c => c.id === id);
        if (cliente) {
            clienteAtivoId = id;
            document.getElementById('perfil-nome-cliente').innerText = cliente.nome;
            document.getElementById('perfil-telefone').innerText = cliente.telefone || '---';
            document.getElementById('perfil-visita').innerText = cliente.ultima_visita || 'Nenhuma visita';
            document.getElementById('perfil-servico').innerText = cliente.servico_favorito || '---';
            
            const totalCortes = cliente.cortes_total || 0;
            document.getElementById('perfil-cortes').innerText = totalCortes;
            
            const btnPremio = document.getElementById('btn-resgatar-premio');
            if (btnPremio) btnPremio.style.display = totalCortes >= 10 ? 'block' : 'none';
            
            modalPerfil.classList.add('active');
        }
    };

    window.fecharPerfilCliente = function() { 
        modalPerfil.classList.remove('active'); 
        clienteAtivoId = null; 
    };

    window.zerarCortes = async function() {
        if (!clienteAtivoId) return;
        const cliente = listaDeClientes.find(c => c.id === clienteAtivoId);
        
        try {
            const resposta = await fetch(`${API_CLIENTES}${clienteAtivoId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...cliente, cortes_total: 0 }) 
            });

            if (resposta.ok) {
                mostrarNotificacao("Prêmio resgatado! Contador zerado no banco.");
                carregarClientes(); 
                fecharPerfilCliente();
            } else {
                mostrarNotificacao("Erro ao atualizar o banco.", "erro");
            }
        } catch(e) {
            mostrarNotificacao("Erro de conexão.", "erro");
        }
    };

    window.excluirCliente = async function() {
        if (!clienteAtivoId) return;
        if (!confirm("Tem certeza que deseja excluir DEFINITIVAMENTE este cliente do banco de dados?")) return;

        try {
            const resposta = await fetch(`${API_CLIENTES}${clienteAtivoId}`, { method: 'DELETE' });

            if (resposta.ok) {
                mostrarNotificacao("Cliente apagado do banco de dados.");
                carregarClientes(); 
                fecharPerfilCliente();
            } else {
                mostrarNotificacao("Erro ao deletar.", "erro");
            }
        } catch(e) {
            mostrarNotificacao("Erro de conexão.", "erro");
        }
    };

    carregarClientes();
}

          //serviços e dashboard card integrados ao docker
const API_SERVICOS = "http://localhost:8000/servicos/";

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

let servicoEditandoId = null; 
let idParaRemover = null;

async function carregarServicos() {
    if (!gridServicos) return;

    try {
        const resposta = await fetch(API_SERVICOS);
        const servicos = await resposta.json();
        
        gridServicos.innerHTML = '';
        
        if (servicos.length === 0) {
            gridServicos.innerHTML = "<p style='color: var(--text-muted); font-style: italic; text-align: center; grid-column: 1 / -1; padding: 40px;'>Nenhum serviço cadastrado.</p>";
            return;
        }

        gridServicos.innerHTML = servicos.map(s => `
            <div class="card-servico">
                <strong style="font-size: 1.3rem; margin-bottom: 8px;">${s.nome}</strong>
                <span style="color: var(--primary-color); font-weight: bold; font-size: 1.1rem;">
                    R$ ${s.preco.toFixed(2).replace('.', ',')}
                </span>
                <div class="card-actions">
                    <button onclick="abrirModalEditar(${s.id}, '${s.nome}', ${s.preco})" class="btn-editar-servico">Editar</button>
                    <button onclick="prepararRemoverServico(${s.id})" class="btn-remover-servico">Remover</button>
                </div>
            </div>
        `).join('');

        if (typeof atualizarSelectDashboard === "function") atualizarSelectDashboard();

    } catch (erro) {
        console.error("Erro ao conectar com a API:", erro);
        gridServicos.innerHTML = "<p style='color: var(--danger-color); text-align: center; grid-column: 1 / -1;'>Erro ao conectar com o servidor. O Docker está rodando?</p>";
    }
}

function abrirModal() { modalServico.classList.add('active'); }

function fecharModal() { 
    modalServico.classList.remove('active'); 
    inputNomeServico.value = ''; 
    inputPrecoServico.value = ''; 
    servicoEditandoId = null; 
}

window.abrirModalEditar = function(id, nome, preco) {
    servicoEditandoId = id; 
    modalTitle.innerText = "Editar Serviço";
    inputNomeServico.value = nome; 
    inputPrecoServico.value = preco.toFixed(2).replace('.', ',');
    abrirModal();
};

if (btnAddServico) { 
    btnAddServico.addEventListener('click', function() { 
        servicoEditandoId = null; 
        modalTitle.innerText = "Adicionar Novo Serviço"; 
        abrirModal(); 
    }); 
}

if (btnCancelarModal) btnCancelarModal.addEventListener('click', fecharModal);
if (btnSalvarModal) {
    const cloneBtnSalvar = btnSalvarModal.cloneNode(true);
    btnSalvarModal.parentNode.replaceChild(cloneBtnSalvar, btnSalvarModal);
    
    cloneBtnSalvar.addEventListener('click', async function() {
        const nome = inputNomeServico.value.trim(); 
        const precoText = inputPrecoServico.value.trim().replace(',', '.'); 
        const preco = parseFloat(precoText);

        if (!nome || isNaN(preco)) return mostrarNotificacao("Preencha o nome e um preço válido.", "erro");

        try {
    
            const respostaChecagem = await fetch(API_SERVICOS);
            const listaAtual = await respostaChecagem.json();
            const servicoDuplicado = listaAtual.find(s => s.nome.toLowerCase() === nome.toLowerCase());

            if (servicoDuplicado && !servicoEditandoId) {
                return mostrarNotificacao(`O serviço "${nome}" já existe no sistema!`, "erro");
            }
        } catch (e) {
            console.error("Erro ao checar duplicatas:", e);
        }

        const metodoHttp = servicoEditandoId ? "PUT" : "POST";
        const urlDestino = servicoEditandoId ? `${API_SERVICOS}${servicoEditandoId}` : API_SERVICOS;

        try {
            const resposta = await fetch(urlDestino, {
                method: metodoHttp,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nome: nome, preco: preco, descricao: "Sem descrição" })
            });

            if (resposta.ok) {
                mostrarNotificacao(servicoEditandoId ? "Serviço atualizado!" : "Serviço criado!");
                carregarServicos(); 
                fecharModal();
            } else {
                mostrarNotificacao("Erro ao salvar no banco.", "erro");
            }
        } catch (erro) {
            console.error(erro);
            mostrarNotificacao("Erro de conexão com o banco.", "erro");
        }
    });
}

window.prepararRemoverServico = function(id) { 
    idParaRemover = id; 
    modalConfirmacao.classList.add('active'); 
};

function fecharModalConfirmacao() { 
    if(modalConfirmacao) modalConfirmacao.classList.remove('active'); 
    idParaRemover = null; 
}

if(btnCancelarExclusao) btnCancelarExclusao.addEventListener('click', fecharModalConfirmacao);

if(btnConfirmarExclusao) {
    const cloneBtnConfirmar = btnConfirmarExclusao.cloneNode(true);
    btnConfirmarExclusao.parentNode.replaceChild(cloneBtnConfirmar, btnConfirmarExclusao);
    
    cloneBtnConfirmar.addEventListener('click', async function() {
        if (idParaRemover !== null) {
            try {
                const resposta = await fetch(`${API_SERVICOS}${idParaRemover}`, {
                    method: 'DELETE'
                });

                if (resposta.ok) {
                    mostrarNotificacao("Serviço removido com sucesso!");
                    carregarServicos();
                    fecharModalConfirmacao();
                } else {
                    mostrarNotificacao("Erro ao deletar no banco.", "erro");
                }
            } catch (erro) {
                mostrarNotificacao("Erro de conexão.", "erro");
            }
        }
    });
}
carregarServicos();

       //atualizar dashboards e utilidades
const selectServicoDashboard = document.getElementById('servico');
async function atualizarSelectDashboard() {
    if (selectServicoDashboard) {
        try {
            const resposta = await fetch("http://localhost:8000/servicos/");
            const servicosCadastrados = await resposta.json();
            
            selectServicoDashboard.innerHTML = '<option value="" disabled selected>Escolha o serviço...</option>';
            servicosCadastrados.forEach(s => {
                const option = document.createElement('option');
                option.value = s.nome;
                option.textContent = `${s.nome} (R$ ${s.preco.toFixed(2).replace('.', ',')})`;
                selectServicoDashboard.appendChild(option);
            });
        } catch (e) {
            console.error("Erro ao puxar serviços para o dashboard:", e);
        }
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