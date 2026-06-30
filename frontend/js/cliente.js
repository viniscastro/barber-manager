document.addEventListener('DOMContentLoaded', () => {
    carregarServicos();
    carregarBarbeiros(); 
    carregarMeusAgendamentos();
});

const URL_SERVICOS = 'http://127.0.0.1:8000/servicos/'; 
const URL_AGENDAMENTOS = 'http://127.0.0.1:8002/agendamentos/';

async function carregarServicos() {
    const selectServico = document.getElementById('cliente-servico');
    try {
        const resposta = await fetch(URL_SERVICOS);
        
        if (resposta.ok) {
            const servicos = await resposta.json();
            
            if (servicos.length === 0) {
                selectServico.innerHTML = '<option value="">Nenhum serviço cadastrado pelo Admin</option>';
                return;
            }

            selectServico.innerHTML = '<option value="">Selecione um serviço...</option>';
            servicos.forEach(servico => {
                selectServico.innerHTML += `<option value="${servico.id}">${servico.nome} - R$ ${servico.preco.toFixed(2)}</option>`;
            });
        } else {
            selectServico.innerHTML = '<option value="">Erro na API de Serviços</option>';
        }
    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro);
        selectServico.innerHTML = '<option value="">Erro de conexão</option>';
    }
}

async function carregarBarbeiros() {
    const selectBarbeiro = document.getElementById('cliente-barbeiro');
    
    try {
        const profissionais = [
            { id: 1, nome: "Elton Emanuel" },
            { id: 2, nome: "David Ezequiel" },
            { id: 3, nome: "Enderson Carvalho" },
            { id: 4, nome: "Jefferson Felipe" }
        ];

        selectBarbeiro.innerHTML = '<option value="">Qualquer profissional</option>';
        
        profissionais.forEach(barbeiro => {
            selectBarbeiro.innerHTML += `<option value="${barbeiro.nome}">${barbeiro.nome}</option>`;
        });
    } catch (erro) {
        console.error("Erro ao carregar barbeiros:", erro);
        selectBarbeiro.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

async function solicitarAgendamento() {
    const servicoId = document.getElementById('cliente-servico').value;
    const barbeiroNome = document.getElementById('cliente-barbeiro').value; 
    const data = document.getElementById('cliente-data').value;
    const hora = document.getElementById('cliente-hora').value;
    const msgBox = document.getElementById('msg-agendamento');
    
    if (!servicoId || !data || !hora || !barbeiroNome) {
        msgBox.innerHTML = '<span style="color: #ff4444;">Preencha todos os campos e escolha um profissional.</span>';
        return;
    }

    const clienteId = localStorage.getItem('usuario_id');
    const token = localStorage.getItem('access_token');
    const dataHoraStr = `${data}T${hora}:00`; 
    
    msgBox.innerHTML = '<span style="color: #cfaa5e;">A verificar disponibilidade...</span>';

    try {
        const resVerificacao = await fetch(URL_AGENDAMENTOS, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (resVerificacao.ok) {
            const agendaCompleta = await resVerificacao.json();

            const conflito = agendaCompleta.find(ag => {
                const statusAg = ag.status.toLowerCase();
                
                if (statusAg.includes('cancelado') || statusAg.includes('faltou')) return false;

                const mesmaHora = ag.data_hora.substring(0, 16) === dataHoraStr.substring(0, 16);
                
                const mesmoBarbeiro = ag.status.includes(barbeiroNome);

                return mesmaHora && mesmoBarbeiro;
            });

            if (conflito) {
                msgBox.innerHTML = `<span style="color: #ffbb33;">O barbeiro <strong>${barbeiroNome}</strong> já está em serviço na hora selecionada. Escolha outro horário ou profissional.</span>`;
                return; 
            }
        }

        const payload = {
            cliente_id: parseInt(clienteId),
            servico_id: parseInt(servicoId),
            data_hora: dataHoraStr, 
            status: `Pendente|${barbeiroNome}`
        };

        msgBox.innerHTML = '<span style="color: #cfaa5e;">A confirmar agendamento...</span>';

        const resposta = await fetch(URL_AGENDAMENTOS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (resposta.ok) {
            msgBox.innerHTML = '<span style="color: #00C851;">Agendamento confirmado com sucesso!</span>';
            document.getElementById('cliente-data').value = '';
            document.getElementById('cliente-hora').value = '';
            document.getElementById('cliente-barbeiro').value = '';
            carregarMeusAgendamentos(); 
        } else {
            const erro = await resposta.json();
            msgBox.innerHTML = `<span style="color: #ff4444;">Erro: ${erro.detail || 'Não foi possível agendar'}</span>`;
        }
    } catch (erro) {
        console.error("Erro ao agendar:", erro);
        msgBox.innerHTML = '<span style="color: #ff4444;">Erro de conexão com o servidor.</span>';
    }
}

async function carregarMeusAgendamentos() {
    const tabela = document.getElementById('tabela-meus-agendamentos');
    const clienteId = localStorage.getItem('usuario_id');
    const token = localStorage.getItem('access_token');

    try {
        const resposta = await fetch(URL_AGENDAMENTOS, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (resposta.ok) {
            const todosAgendamentos = await resposta.json();
            const meusAgendamentos = todosAgendamentos.filter(a => a.cliente_id == clienteId);

            tabela.innerHTML = '';

            if (meusAgendamentos.length === 0) {
                tabela.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">Você ainda não possui agendamentos.</td></tr>';
                return;
            }

            meusAgendamentos.reverse().forEach(agendamento => {
                const dataObj = new Date(agendamento.data_hora);
                const dataFormatada = dataObj.toLocaleDateString('pt-BR');
                const horaFormatada = dataObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                const nomeServico = agendamento.servico ? agendamento.servico.nome : `Serviço #${agendamento.servico_id}`;
                
                const statusReal = agendamento.status.split('|')[0];
                
                let corStatus = '#ffbb33';
                if (statusReal.toLowerCase() === 'confirmado' || statusReal.toLowerCase() === 'concluido') corStatus = '#00C851';
                if (statusReal.toLowerCase() === 'cancelado' || statusReal.toLowerCase() === 'faltou') corStatus = '#ff4444';

                tabela.innerHTML += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${horaFormatada}</td>
                        <td>${nomeServico}</td>
                        <td><span class="status-badge" style="color: ${corStatus}; border: 1px solid ${corStatus}; text-transform: capitalize;">${statusReal || 'Pendente'}</span></td>
                    </tr>
                `;
            });
        }
    } catch (erro) {
        console.error("Erro ao carregar agenda:", erro);
        tabela.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #ff4444;">Erro de conexão ao buscar histórico.</td></tr>';
    }
}