document.addEventListener('DOMContentLoaded', function() {
    const selectServico = document.getElementById('servico');
    const formAgendamento = document.getElementById('agendamento-form');

    async function carregarServicos() {
        if (!selectServico) return;
        try {
            const servicos = await API.getServicos();
            
            selectServico.innerHTML = '<option value="" disabled selected>Escolha o serviço...</option>';
            servicos.forEach(s => {
                const option = document.createElement('option');
                option.value = s.id; 
                option.textContent = `${s.nome} - R$ ${parseFloat(s.preco).toFixed(2).replace('.', ',')}`;
                selectServico.appendChild(option);
            });
        } catch (e) {
            console.error(e);
        }
    }
    carregarServicos();

    if (formAgendamento) {
        formAgendamento.addEventListener('submit', async function(e) {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const telefone = document.getElementById('telefone').value.replace(/\D/g, ''); 
            
            let dataHoraRaw = document.getElementById('data-hora').value.trim(); 
            const servicoValue = document.getElementById('servico').value; 

            if (!dataHoraRaw.includes(':')) {
                dataHoraRaw += " 00:00"; 
            }

            const regexData = /(\d{2,4})\D+(\d{2})\D+(\d{2,4})\D+(\d{2})\D+(\d{2})/;
            const match = dataHoraRaw.match(regexData);

            if (!match) return alert("Erro: O formato da data está irreconhecível. Tente selecionar novamente pelo calendário.");

            let ano, mes, dia, hora, minuto;
            if (match[1].length === 4) {
                ano = match[1]; mes = match[2]; dia = match[3];
            } else {
                dia = match[1]; mes = match[2]; ano = match[3];
            }
            hora = match[4]; minuto = match[5];
            const dataHoraISO = `${ano}-${mes}-${dia}T${hora}:${minuto}:00`;

            try {
                let servicoIdFinal = parseInt(servicoValue);

                if (isNaN(servicoIdFinal)) {
                    const servicosDb = await API.getServicos();
                    const servEncontrado = servicosDb.find(s => servicoValue.includes(s.nome) || s.nome === servicoValue);
                    
                    if (servEncontrado) {
                        servicoIdFinal = servEncontrado.id;
                    } else {
                        return alert("Erro: Serviço não encontrado no banco.");
                    }
                }

                let clienteId = null;
                const clientes = await API.getClientes();
                let cliExistente = clientes.find(c => c.telefone && c.telefone.replace(/\D/g, '') === telefone);

                if (cliExistente) {
                    clienteId = cliExistente.id;
                    if (cliExistente.nome !== nome) {
                        await API.atualizarCliente(clienteId, { 
                            ...cliExistente, 
                            nome: nome 
                        });
                    }
                } else {
                    const novoCli = await API.criarCliente({ 
                        nome: nome, 
                        telefone: telefone, 
                        email: `${telefone}@cliente.com` 
                    });
                    clienteId = novoCli.id;
                }
                
                const payload = {
                    cliente_id: clienteId,
                    servico_id: servicoIdFinal,
                    data_hora: dataHoraISO,
                    status: "Pendente"
                };

                await API.criarAgendamento(payload);

                alert("Agendamento salvo com sucesso!");
                formAgendamento.reset();
                window.location.reload(); 

            } catch (e) {
                console.error(e);
                alert("Erro na operação. Motivo ou falha de conexão:\n" + e.message);
            }
        });
    }

    async function carregarEstatisticasDashboard() {
        try {
            const [agendamentos, servicos] = await Promise.all([
                API.getAgendamentos(),
                API.getServicos()
            ]);

            const hoje = new Date();
            const hojeFiltro = hoje.getFullYear() + '-' + 
                               String(hoje.getMonth() + 1).padStart(2, '0') + '-' + 
                               String(hoje.getDate()).padStart(2, '0');

            const cortesHoje = agendamentos.filter(a => a.data_hora && a.data_hora.startsWith(hojeFiltro));

            let faturamentoHoje = 0;
            cortesHoje.forEach(ag => {
                const servicoRealizado = servicos.find(s => s.id === ag.servico_id);
                if (servicoRealizado && servicoRealizado.preco) {
                    faturamentoHoje += parseFloat(servicoRealizado.preco);
                }
            });

            const displayCortes = document.getElementById('total-cortes'); 
            const displayFaturamento = document.getElementById('faturamento-hoje'); 

            if (displayCortes) {
                displayCortes.innerText = cortesHoje.length;
            }
            
            if (displayFaturamento) {
                displayFaturamento.innerText = `R$ ${faturamentoHoje.toFixed(2).replace('.', ',')}`; 
            }

        } catch(e) {
            console.error(e);
        }
    }
    
    carregarEstatisticasDashboard();
});