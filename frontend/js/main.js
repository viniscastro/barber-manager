// variáveis
if (document.getElementById("data-hora")) {
    flatpickr("#data-hora", { enableTime: true, dateFormat: "d/m/Y H:i", minDate: "today", time_24hr: true, locale: "pt", minTime: "08:00", maxTime: "20:00", disable: [date => date.getDay() === 0] });
}

document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href.startsWith('#')) {
            e.preventDefault();
            document.querySelectorAll('.nav-links a, .tab-content').forEach(el => el.classList.remove('active'));
            this.classList.add('active');
            const targetSection = document.getElementById(href.substring(1));
            if (targetSection) targetSection.classList.add('active');
            const pageTitle = document.getElementById('page-title');
            if (pageTitle) pageTitle.innerText = this.innerText.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F\uDE80-\uDEFF]|[\u2600-\u2B55]\uFE0F?/g, '').trim();
        }
    });
});

window.fecharNotificacao = () => {
    const toast = document.getElementById('custom-toast');
    if (toast) { toast.classList.remove('show'); clearTimeout(toast.hideTimeout); }
};

function mostrarNotificacao(mensagem, tipo = 'sucesso') {
    let toast = document.getElementById('custom-toast') || Object.assign(document.createElement('div'), { id: 'custom-toast' });
    if (!toast.parentNode) document.body.appendChild(toast);
    clearTimeout(toast.hideTimeout);
    toast.className = `toast-notification ${tipo === 'erro' ? 'error' : ''}`;
    toast.innerHTML = `<span class="toast-icon">${tipo === 'erro' ? '⚠️' : '✅'}</span> <div class="toast-message">${mensagem}</div><button class="toast-close" onclick="fecharNotificacao()" title="Fechar">&times;</button>`;
    setTimeout(() => toast.classList.add('show'), 10);
    toast.hideTimeout = setTimeout(() => toast.classList.remove('show'), tipo === 'erro' ? 8000 : 3000);
}

function gerarLinkWhatsApp(telefone, mensagem) {
    if (!telefone) return '#';
    let num = telefone.replace(/\D/g, '');
    if (num.length === 10 || num.length === 11) num = '55' + num;
    return `https://wa.me/${num}?text=${encodeURIComponent(mensagem)}`;
}
const API_AGENDA = "http://localhost:8002/agendamentos/";
const API_CLIENTES = "http://localhost:8001/clientes/";
const API_SERVICOS = "http://localhost:8000/servicos/";

const parseStatus = (st) => {
    const parts = (st || 'pendente|Cassiano').split('|');
    return { status: parts[0].toLowerCase(), prof: parts[1] || 'Cassiano' };
};

const fetchWithFallback = async (url, options) => {
    let res = await fetch(url, options);
    if (!res.ok && res.status !== 200) res = await fetch(url.replace(/\/$/, ''), options);
    if (!res.ok && res.status !== 200) throw new Error(`API Error: ${res.status}`);
    return res;
};

const fetchAllData = async () => {
    const [agRes, cliRes, servRes] = await Promise.all([fetch(API_AGENDA, {cache:'no-store'}), fetch(API_CLIENTES, {cache:'no-store'}), fetch(API_SERVICOS, {cache:'no-store'})]);
    return { agendamentos: await agRes.json(), clientes: await cliRes.json(), servicos: await servRes.json() };
};

const formatDataFiltro = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

// Agenda
const toggleAgenda = document.getElementById('toggle-agenda-view');
const viewTimeline = document.getElementById('agenda-timeline-view');
const viewTable = document.getElementById('agenda-table-view');
let dataSelecionada = new Date();

if (toggleAgenda) {
    toggleAgenda.addEventListener('click', function() {
        const isTimeline = viewTimeline.style.display !== 'none';
        viewTimeline.style.display = isTimeline ? 'none' : 'block';
        viewTable.style.display = isTimeline ? 'block' : 'none';
        this.innerText = isTimeline ? 'Ver Agenda do Dia' : 'Ver Tabela Completa';
    });
}

if (document.getElementById('tabela-agenda-body')) {
    window.carregarAgendamentos = async function() {
        try {
            const { agendamentos, clientes, servicos } = await fetchAllData();
            const filtro = formatDataFiltro(dataSelecionada);
            const displayData = document.getElementById('display-data-agenda');
            if (displayData) {
                const prefixo = dataSelecionada.toDateString() === new Date().toDateString() ? "Hoje - " : "";
                displayData.innerText = prefixo + dataSelecionada.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
            }
            const agDia = agendamentos.filter(a => a.data_hora?.startsWith(filtro)).sort((a, b) => a.data_hora.localeCompare(b.data_hora));
            const tabela = document.getElementById('tabela-agenda-body'), timeline = document.getElementById('daily-timeline');
            tabela.innerHTML = ''; timeline.innerHTML = '';
            
            if (agDia.length === 0) {
                timeline.innerHTML = '<p class="text-muted text-center p-20">Nenhum agendamento.</p>';
                tabela.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum agendamento.</td></tr>';
                return;
            }
            
            agDia.forEach(ag => {
                const cli = clientes.find(c => c.id == ag.cliente_id) || { nome: 'Desconhecido' }, serv = servicos.find(s => s.id == ag.servico_id) || { nome: 'Removido' };
                const hora = ag.data_hora.split('T')[1].substring(0, 5), { status, prof } = parseStatus(ag.status);
                let stClass = '', borderClass = '', stText = '';
                if (status === 'concluido') { stClass = 'status-concluido'; borderClass = 'border-concluido'; stText = '<span class="text-success font-bold">✅ CONCLUÍDO</span>'; }
                else if (status === 'faltou') { stClass = 'status-faltou'; borderClass = 'border-faltou'; stText = '<span class="text-danger font-bold">❌ FALTOU</span>'; }
                else if (status === 'resgatado') { stClass = 'status-resgatado'; borderClass = 'border-resgatado'; stText = '<span class="text-warning font-bold">🎁 RESGATADO</span>'; }
                
                tabela.innerHTML += `<tr class="${stClass}"><td>${hora}</td><td>${cli.nome}<br><small class="text-muted">com ${prof}</small><br>${stText}</td><td>${serv.nome}</td><td><button onclick="abrirModalExclusaoAgenda(${ag.id})" class="btn-icon">🗑️</button></td></tr>`;
                timeline.innerHTML += `<div class="timeline-slot ${stClass}"><div class="slot-time">${hora}</div><div class="appointment-card ${borderClass}"><div><span class="client-name">${cli.nome}</span> <span class="service-tag">${serv.nome}</span><br><small class="text-muted">Barbeiro: ${prof}</small><br>${stText}</div><button onclick="abrirModalExclusaoAgenda(${ag.id})" class="btn-icon">🗑️</button></div></div>`;
            });
        } catch (e) { console.error(e); }
    };
    
    window.alterarStatusAgendamento = async (id, novoStatus) => {
        try {
            const ag = await (await fetch(`${API_AGENDA}${id}/`, { cache: 'no-store' })).json();
            await fetchWithFallback(`${API_AGENDA}${id}/`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ag, status: `${novoStatus}|${parseStatus(ag.status).prof}` }) });
            mostrarNotificacao(`Status alterado com sucesso!`); carregarAgendamentos();
            if (typeof carregarClientes === 'function') carregarClientes();
            if (typeof atualizarDashboardCards === 'function') atualizarDashboardCards();
        } catch (e) { mostrarNotificacao("Erro ao atualizar status.", "erro"); }
    };
    let idAgendaParaRemover = null;
    window.abrirModalExclusaoAgenda = id => { idAgendaParaRemover = id; document.getElementById('modal-confirmacao-agenda').classList.add('active'); };
    window.fecharModalAgenda = () => { document.getElementById('modal-confirmacao-agenda').classList.remove('active'); idAgendaParaRemover = null; };
    document.getElementById('btn-cancelar-agenda')?.addEventListener('click', fecharModalAgenda);
    const btnConfAgenda = document.getElementById('btn-confirmar-agenda');
    if (btnConfAgenda) {
        btnConfAgenda.replaceWith(btnConfAgenda.cloneNode(true));
        document.getElementById('btn-confirmar-agenda').addEventListener('click', async () => {
            if (idAgendaParaRemover) {
                try { await fetchWithFallback(`${API_AGENDA}${idAgendaParaRemover}/`, { method: 'DELETE' }); carregarAgendamentos(); fecharModalAgenda(); mostrarNotificacao("Removido da agenda."); } 
                catch (e) { mostrarNotificacao("Erro ao deletar.", "erro"); }
            }
        });
    }
    document.getElementById('btn-prev-day')?.addEventListener('click', () => { dataSelecionada.setDate(dataSelecionada.getDate() - 1); carregarAgendamentos(); });
    document.getElementById('btn-next-day')?.addEventListener('click', () => { dataSelecionada.setDate(dataSelecionada.getDate() + 1); carregarAgendamentos(); });
    if(document.getElementById("datepicker-agenda")) {
        const picker = flatpickr("#datepicker-agenda", { locale: "pt", dateFormat: "Y-m-d", disableMobile: "true", onChange: d => { dataSelecionada = d[0]; carregarAgendamentos(); } });
        document.getElementById('container-datepicker-agenda')?.addEventListener('click', () => picker.open());
    }
    carregarAgendamentos();
}

// Clientes
let clienteAtivoId = null, listaDeClientes = [];
if (document.getElementById('tabela-clientes-body')) {
    window.carregarClientes = async () => {
        try {
            const { clientes, agendamentos } = await fetchAllData();
            listaDeClientes = clientes.map(c => {
                const agsCli = agendamentos.filter(a => a.cliente_id == c.id);
                const concluidos = agsCli.filter(a => parseStatus(a.status).status === 'concluido');
                const visitas = agsCli.filter(a => ['concluido', 'resgatado'].includes(parseStatus(a.status).status)).sort((a,b) => new Date(b.data_hora) - new Date(a.data_hora));
                const pendentes = agsCli.filter(a => parseStatus(a.status).status === 'pendente').sort((a,b) => a.data_hora.localeCompare(b.data_hora));
                return { ...c, cortes_total: concluidos.length, ultima_visita: visitas.length ? new Date(visitas[0].data_hora).toLocaleDateString('pt-BR') : 'Sem registro', proximo_horario: pendentes.length && pendentes[0].data_hora.includes('T') ? pendentes[0].data_hora.split('T')[1].substring(0,5) : null, profissionalResp: pendentes.length ? parseStatus(pendentes[0].status).prof : null };
            });
            renderizarTabelaClientes(listaDeClientes);
        } catch (e) { console.error(e); }
    };
    window.renderizarTabelaClientes = (clientes) => {
        const tbody = document.getElementById('tabela-clientes-body');
        if (!clientes.length) return tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Nenhum cliente.</td></tr>';
        tbody.innerHTML = clientes.sort((a,b) => (b.cortes_total||0) - (a.cortes_total||0)).map(c => {
            const msg = c.proximo_horario ? `Olá, tudo bem, ${c.nome}? Hoje às ${c.proximo_horario} você tem um corte com o barbeiro ${c.profissionalResp||'nossa equipe'}! Até logo!` : `Olá ${c.nome}, tudo bem? Aqui é da Dom Barbershop!`;
            return `<tr><td class="font-bold">${c.nome}</td><td><a href="${gerarLinkWhatsApp(c.telefone, msg)}" target="_blank" class="text-success font-bold">💬 ${c.telefone||'---'}</a></td><td>${c.ultima_visita}</td><td><div class="flex-between-center"><span><strong class="text-primary">${c.cortes_total}</strong> cortes</span><button onclick="abrirPerfilCliente(${c.id})" class="btn-icon">✏️</button></div></td></tr>`;
        }).join('');
    };
    document.getElementById('busca-cliente')?.addEventListener('input', e => {
        const t = e.target.value.toLowerCase();
        renderizarTabelaClientes(listaDeClientes.filter(c => c.nome.toLowerCase().includes(t) || c.telefone?.includes(t)));
    });
    window.abrirPerfilCliente = async (id) => {
        const c = listaDeClientes.find(x => x.id == id); if (!c) return;
        clienteAtivoId = id; document.getElementById('perfil-nome-cliente').innerText = c.nome; document.getElementById('perfil-telefone').innerText = c.telefone || '---'; document.getElementById('perfil-visita').innerText = c.ultima_visita; document.getElementById('perfil-cortes').innerText = c.cortes_total; document.getElementById('btn-resgatar-premio').style.display = c.cortes_total >= 10 ? 'block' : 'none';
        const divAg = document.getElementById('status-agendamento-cliente'); divAg.style.display = 'none';
        try {
            const ags = await (await fetch(API_AGENDA, {cache:'no-store'})).json();
            const pendentes = ags.filter(a => a.cliente_id == id && parseStatus(a.status).status === 'pendente').sort((a,b) => a.data_hora.localeCompare(b.data_hora));
            if (pendentes[0]?.data_hora) {
                divAg.style.display = 'block'; const [ano, mes, dia] = pendentes[0].data_hora.split('T')[0].split('-');
                document.getElementById('horario-agendamento-cliente').parentNode.innerHTML = `🕒 <strong>Agendado para:</strong> <span id="horario-agendamento-cliente" class="text-large text-primary">${dia}/${mes} às ${pendentes[0].data_hora.split('T')[1].substring(0,5)}</span>`;
                document.getElementById('btn-confirmar-cliente').onclick = () => resolverAgendamentoCliente(pendentes[0].id, 'Concluido', id);
                document.getElementById('btn-faltou-cliente').onclick = () => resolverAgendamentoCliente(pendentes[0].id, 'Faltou', id);
            }
        } catch(e) {}
        document.getElementById('modal-perfil-cliente').classList.add('active');
    };
    window.fecharPerfilCliente = () => { document.getElementById('modal-perfil-cliente').classList.remove('active'); clienteAtivoId = null; };
    window.resolverAgendamentoCliente = async (agId, status, cliId) => {
        try {
            const ag = (await (await fetch(API_AGENDA, {cache:'no-store'})).json()).find(a => a.id == agId); if (!ag) throw new Error("Não encontrado.");
            await fetchWithFallback(`${API_AGENDA}${agId}/`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...ag, status: `${status}|${parseStatus(ag.status).prof}`}) });
            if (status.toLowerCase() === 'concluido') {
                const cli = listaDeClientes.find(c => c.id == cliId);
                if (cli) { cli.cortes_total++; cli.ultima_visita = new Date().toLocaleDateString('pt-BR'); renderizarTabelaClientes(listaDeClientes); document.getElementById('perfil-cortes').innerText = cli.cortes_total; if(cli.cortes_total >= 10) document.getElementById('btn-resgatar-premio').style.display = 'block'; mostrarNotificacao(`Confirmado! Total: ${cli.cortes_total} cortes.`); }
            } else mostrarNotificacao("Desmarcado.", "erro");
            document.getElementById('status-agendamento-cliente').style.display = 'none';
            if(typeof atualizarDashboardCards === 'function') atualizarDashboardCards();
        } catch(e) { mostrarNotificacao(`Erro: ${e.message}`, "erro"); }
    };
    window.zerarCortes = async () => {
        if (!clienteAtivoId) return;
        try {
            const ags = await (await fetch(API_AGENDA, {cache:'no-store'})).json();
            for (let ag of ags.filter(a => a.cliente_id == clienteAtivoId && parseStatus(a.status).status === 'concluido')) {
                await fetchWithFallback(`${API_AGENDA}${ag.id}/`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({...ag, status: `Resgatado|${parseStatus(ag.status).prof}`}) });
            }
            mostrarNotificacao("Prêmio resgatado! Contagem zerada. 🎁"); carregarClientes(); fecharPerfilCliente();
            if(typeof atualizarDashboardCards === 'function') atualizarDashboardCards();
        } catch (e) { mostrarNotificacao("Erro ao resgatar.", "erro"); }
    };
    window.excluirCliente = () => document.getElementById('modal-confirmacao-exclusao-cliente')?.classList.add('active');
    window.fecharModalExclusaoCliente = () => document.getElementById('modal-confirmacao-exclusao-cliente')?.classList.remove('active');
    window.confirmarExclusaoCliente = async () => {
        if (!clienteAtivoId) return;
        try {
            const ags = await (await fetch(API_AGENDA, {cache:'no-store'})).json();
            for (let ag of ags.filter(a => a.cliente_id == clienteAtivoId)) await fetchWithFallback(`${API_AGENDA}${ag.id}/`, { method: 'DELETE' });
            await fetchWithFallback(`${API_CLIENTES}${clienteAtivoId}/`, { method: 'DELETE' });
            mostrarNotificacao("Cliente apagado.", "erro"); 
            carregarClientes(); fecharPerfilCliente(); fecharModalExclusaoCliente();
        } catch(e) { mostrarNotificacao("Erro de conexão.", "erro"); }
    };
    carregarClientes();
}

// Serviços
if (document.getElementById('grid-servicos-container')) {
    window.carregarServicos = async () => {
        const grid = document.getElementById('grid-servicos-container');
        try {
            const servicos = await (await fetch(API_SERVICOS, {cache:'no-store'})).json();
            if (!servicos.length) return grid.innerHTML = "<p class='text-muted text-center empty-service'>Nenhum serviço.</p>";
            grid.innerHTML = servicos.map(s => `<div class="card-servico"><strong class="service-name">${s.nome}</strong><span class="text-primary font-bold text-large">R$ ${s.preco.toFixed(2).replace('.', ',')}</span><div class="card-actions"><button onclick="abrirModalEditar('${s.id}', '${s.nome}', ${s.preco})" class="btn-editar-servico">Editar</button><button onclick="prepararRemoverServico('${s.id}')" class="btn-remover-servico">Remover</button></div></div>`).join('');
            if(typeof atualizarSelectDashboard === 'function') atualizarSelectDashboard();
        } catch (e) { grid.innerHTML = "<p class='text-danger text-center w-100'>Erro API.</p>"; }
    };
    const modalServ = document.getElementById('modal-servico');
    const fModalServ = () => { modalServ.classList.remove('active'); document.getElementById('input-nome-servico').value=''; document.getElementById('input-preco-servico').value=''; servicoEditandoId=null; };
    window.abrirModalEditar = (id, nome, preco) => { servicoEditandoId = id; document.getElementById('modal-title').innerText = "Editar"; document.getElementById('input-nome-servico').value = nome; document.getElementById('input-preco-servico').value = preco.toFixed(2).replace('.',','); modalServ.classList.add('active'); };
    document.querySelector('#servicos-page .btn-toggle')?.addEventListener('click', () => { servicoEditandoId=null; document.getElementById('modal-title').innerText="Novo Serviço"; modalServ.classList.add('active'); });
    document.getElementById('btn-cancelar-modal')?.addEventListener('click', fModalServ);
    const btnSalvar = document.getElementById('btn-salvar-modal');
    if (btnSalvar) {
        btnSalvar.replaceWith(btnSalvar.cloneNode(true));
        document.getElementById('btn-salvar-modal').addEventListener('click', async () => {
            const nome = document.getElementById('input-nome-servico').value.trim(), preco = parseFloat(document.getElementById('input-preco-servico').value.replace(',','.'));
            if (!nome || isNaN(preco)) return mostrarNotificacao("Dados inválidos.", "erro");
            try {
                const dup = (await (await fetch(API_SERVICOS, {cache:'no-store'})).json()).find(s => s.nome.toLowerCase() === nome.toLowerCase());
                if (dup && !servicoEditandoId) return mostrarNotificacao(`O serviço "${nome}" já existe!`, "erro");
                await fetchWithFallback(servicoEditandoId ? `${API_SERVICOS}${servicoEditandoId}/` : API_SERVICOS, { method: servicoEditandoId ? "PUT" : "POST", headers: {'Content-Type':'application/json'}, body: JSON.stringify({nome, preco, descricao:"-"}) });
                mostrarNotificacao(servicoEditandoId ? "Atualizado!" : "Criado!"); carregarServicos(); fModalServ();
            } catch (e) { mostrarNotificacao("Erro ao salvar.", "erro"); }
        });
    }
    window.prepararRemoverServico = id => { idParaRemover = id; document.getElementById('modal-confirmacao').classList.add('active'); };
    const fModalConf = () => { document.getElementById('modal-confirmacao').classList.remove('active'); idParaRemover = null; };
    document.getElementById('btn-cancelar-exclusao')?.addEventListener('click', fModalConf);
    const btnConfEx = document.getElementById('btn-confirmar-exclusao');
    if (btnConfEx) {
        btnConfEx.replaceWith(btnConfEx.cloneNode(true));
        document.getElementById('btn-confirmar-exclusao').addEventListener('click', async () => {
            if (!idParaRemover) return;
            try {
                for (let ag of (await (await fetch(API_AGENDA, {cache:'no-store'})).json()).filter(a => a.servico_id == idParaRemover)) await fetchWithFallback(`${API_AGENDA}${ag.id}/`, { method:'DELETE' });
                await fetchWithFallback(`${API_SERVICOS}${idParaRemover}/`, { method:'DELETE' });
                mostrarNotificacao("Removido!"); carregarServicos(); fModalConf();
            } catch (e) { mostrarNotificacao("Erro.", "erro"); }
        });
    }
    carregarServicos();
}

// Dashboard e lembretes
window.atualizarSelectDashboard = async () => {
    const sel = document.getElementById('servico'); if (!sel) return;
    try { sel.innerHTML = '<option value="" disabled selected>Escolha o serviço...</option>' + (await (await fetch(API_SERVICOS, {cache:'no-store'})).json()).map(s => `<option value="${s.nome}">${s.nome} (R$ ${s.preco.toFixed(2).replace('.',',')})</option>`).join(''); } catch (e) { sel.innerHTML = '<option disabled>Erro</option>'; }
};

window.atualizarDashboardCards = async () => {
    const cardsN = document.querySelectorAll('.dashboard-cards .card .number'), cardProx = document.querySelector('.dashboard-cards .card .next-client');
    if (!cardsN.length || !cardProx) return;
    try {
        const { agendamentos, clientes, servicos } = await fetchAllData();
        const hj = new Date(), hjMins = hj.getHours()*60 + hj.getMinutes(), agHj = agendamentos.filter(a => a.data_hora?.includes(formatDataFiltro(hj)));
        cardsN[0].innerText = agHj.filter(a => parseStatus(a.status).status !== 'faltou').length;
        let fat = 0; agHj.filter(a => ['concluido','resgatado'].includes(parseStatus(a.status).status)).forEach(ag => { const s = servicos.find(x => x.id == ag.servico_id); if (s?.preco) fat += parseFloat(s.preco); });
        const cFat = document.getElementById('faturamento-hoje'); if (cFat) cFat.innerText = `R$ ${fat.toFixed(2).replace('.',',')}`;
        const pendentes = agHj.filter(a => parseStatus(a.status).status === 'pendente').sort((a,b) => a.data_hora.localeCompare(b.data_hora));
        const prox = pendentes.find(ag => { if(!ag.data_hora.includes('T')) return true; const [h,m] = ag.data_hora.split('T')[1].substring(0,5).split(':').map(Number); return (h*60+m) >= hjMins - 15; });
        cardProx.innerText = prox ? `${(clientes.find(c => c.id == prox.cliente_id))?.nome||'Cliente'} (${prox.data_hora.includes('T') ? prox.data_hora.split('T')[1].substring(0,5) : '--:--'})` : "Agenda Livre";
    } catch (e) { console.error(e); }
};

const lembretesEnviados = new Set();
const verificarLembretes = async () => {
    try {
        const [ags, clis] = await Promise.all([ (await fetch(API_AGENDA,{cache:'no-store'})).json(), (await fetch(API_CLIENTES,{cache:'no-store'})).json() ]);
        const agora = new Date();
        ags.forEach(ag => {
            const { status, prof } = parseStatus(ag.status);
            if (status !== 'pendente' || !ag.data_hora) return;
            const dAg = new Date(ag.data_hora), diff = (dAg - agora) / 3600000;
            if (diff > 0 && diff <= 2 && !lembretesEnviados.has(ag.id)) {
                const cli = clis.find(c => c.id == ag.cliente_id) || { nome:'Cliente', telefone:'' };
                const hr = dAg.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
                const msg = `Olá, tudo bem, ${cli.nome}? Hoje às ${hr} você tem um corte com o barbeiro ${prof}! Até logo!`;
                mostrarNotificacao(`🕒 Lembrete: ${cli.nome} com ${prof} às ${hr}. <br><br><a href="${gerarLinkWhatsApp(cli.telefone,msg)}" target="_blank" onclick="fecharNotificacao()" class="toast-link">ENVIAR WHATSAPP</a>`, 'erro');
                lembretesEnviados.add(ag.id);
            }
        });
    } catch (e) {}
};

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById('dashboard-page')) {
        window.atualizarSelectDashboard(); window.atualizarDashboardCards();
        setTimeout(verificarLembretes, 1000); setInterval(verificarLembretes, 300000);
    }
});