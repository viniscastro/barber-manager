// Rotas relativas passando pelo API Gateway (Nginx)
const API_SERVICOS = '/api/servicos/servicos/';
const API_CLIENTES = '/api/clientes/clientes/';
const API_AGENDA = '/api/agendamentos/agendamentos/';

document.addEventListener("DOMContentLoaded", function() {
    const usuarioLogado = localStorage.getItem('usuario_nome');

    if (!usuarioLogado) {
        window.location.href = 'login.html';
        return; 
    }

    const elementoNome = document.getElementById('nome-usuario-logado');
    if (elementoNome) {
        elementoNome.innerText = usuarioLogado;
    }
});

function fazerLogout() {
    localStorage.removeItem('usuario_nome');
    window.location.href = 'login.html';
}

document.addEventListener("DOMContentLoaded", () => {
    const formAgendamento = document.getElementById('agendamento-form');

    if (formAgendamento) {
        formAgendamento.addEventListener('submit', async function(e) {
            e.preventDefault(); 

            // Puxa o nome do cliente que está logado diretamente da memória
            const nomeLogado = localStorage.getItem('usuario_nome');
            if (!nomeLogado) {
                mostrarNotificacao("Erro de sessão: Faça login novamente.", "erro");
                return;
            }

            const dataHoraRaw = document.getElementById('data-hora').value; 
            const servicoValue = document.getElementById('servico').value; 
            const selectProfissional = document.getElementById('profissional');
            const profissionalValue = selectProfissional ? selectProfissional.value : 'Cassiano'; 

            const regexData = /(\d{2,4})\D+(\d{2})\D+(\d{2,4})\D+(\d{2})\D+(\d{2})/;
            const match = dataHoraRaw.match(regexData);

            if (!match) {
                mostrarNotificacao("Erro: Preencha a data e hora corretamente.", "erro");
                return;
            }

            let ano, mes, dia, hora, minuto;
            if (match[1].length === 4) { ano = match[1]; mes = match[2]; dia = match[3]; } 
            else { dia = match[1]; mes = match[2]; ano = match[3]; }
            hora = match[4]; minuto = match[5];
            
            const dataHoraISO = `${ano}-${mes}-${dia}T${hora}:${minuto}:00`;

            try {
                let servicoIdFinal = parseInt(servicoValue);

                if (isNaN(servicoIdFinal)) {
                    const resServicos = await fetch(API_SERVICOS, { cache: 'no-store' });
                    const servicosDb = await resServicos.json();
                    const servEncontrado = servicosDb.find(s => servicoValue.includes(s.nome) || s.nome === servicoValue);
                    
                    if (servEncontrado) { servicoIdFinal = servEncontrado.id; } 
                    else { mostrarNotificacao("Erro: Serviço não encontrado.", "erro"); return; }
                }
                
                const resAgendaCheck = await fetch(API_AGENDA, { cache: 'no-store' });
                const agendaAtual = await resAgendaCheck.json();
                
                const dataAparada = `${ano}-${mes}-${dia}T${hora}:${minuto}`; 
                const profSelecionado = profissionalValue.toLowerCase().trim();

                const barbeiroOcupado = agendaAtual.find(ag => {
                    if (!ag.data_hora) return false;
                    const agDataAparada = ag.data_hora.substring(0, 16); 
                    const partesStatus = (ag.status || 'pendente|Cassiano').split('|');
                    const agStatus = partesStatus[0].toLowerCase();
                    const agProf = (partesStatus[1] || 'Cassiano').toLowerCase().trim();

                    return (agDataAparada === dataAparada) && (agProf === profSelecionado) && (agStatus !== 'faltou');
                });

                if (barbeiroOcupado) {
                    mostrarNotificacao(`Atenção: O barbeiro ${profissionalValue} já está ocupado às ${hora}:${minuto}! ❌`, "erro");
                    return;
                }

                let clienteId = null;
                const resClientes = await fetch(API_CLIENTES, { cache: 'no-store' });
                const clientes = await resClientes.json();
                
                // Procura na tabela o cliente que tem o mesmo nome do login
                let cliExistente = clientes.find(c => c.nome && c.nome.trim().toLowerCase() === nomeLogado.toLowerCase());

                if (cliExistente) {
                    clienteId = cliExistente.id;
                } else {
                    mostrarNotificacao("Erro: A sua conta não foi encontrada no banco de dados.", "erro");
                    return;
                }

                // Cria o agendamento ligado ao ID do cliente
                const payload = {
                    cliente_id: clienteId,
                    servico_id: servicoIdFinal,
                    data_hora: dataHoraISO,
                    status: `Pendente|${profissionalValue}` 
                };

                const resAgenda = await fetch(API_AGENDA, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (resAgenda.ok) {
                    mostrarNotificacao("Agendamento guardado com sucesso! ✅", "sucesso");
                    formAgendamento.reset();
                    if (typeof atualizarDashboardCards === 'function') atualizarDashboardCards();
                } else {
                    const erroDB = await resAgenda.text();
                    mostrarNotificacao(`Erro ao agendar: ${erroDB}`, "erro");
                }

            } catch (e) {
                console.error("Erro interno no agendamento:", e);
                mostrarNotificacao(`Erro de conexão: ${e.message}`, "erro");
            }
        });
    }
});