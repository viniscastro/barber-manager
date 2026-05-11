document.addEventListener("DOMContentLoaded", () => {
    const formAgendamento = document.getElementById('agendamento-form');
    const inputTelefone = document.getElementById('telefone');

    // Máscara automática do whatsapp
    if (inputTelefone) {
        inputTelefone.addEventListener('input', function (e) {
            let valor = e.target.value.replace(/\D/g, ''); 
            if (valor.length > 11) valor = valor.slice(0, 11); 
            if (valor.length > 2) valor = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
            if (valor.length > 10) valor = `${valor.substring(0, 10)}-${valor.substring(10)}`;
            else if (valor.length > 9) valor = `${valor.substring(0, 9)}-${valor.substring(9)}`;
            e.target.value = valor;
        });
    }

    if (formAgendamento) {
        formAgendamento.addEventListener('submit', async function(e) {
            e.preventDefault(); 

            const nome = document.getElementById('nome').value.trim();
            const telefone = inputTelefone.value.replace(/\D/g, ''); 
            const dataHoraRaw = document.getElementById('data-hora').value; 
            const servicoValue = document.getElementById('servico').value; 
            
            const selectProfissional = document.getElementById('profissional');
            const profissionalValue = selectProfissional ? selectProfissional.value : 'Cassiano'; 

            if (telefone.length < 10) {
                mostrarNotificacao("Erro: Digite um telefone válido com DDD.", "erro");
                return;
            }

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

                // Trava com o truque de cortar o status
                const resAgendaCheck = await fetch(API_AGENDA, { cache: 'no-store' });
                const agendaAtual = await resAgendaCheck.json();
                
                const dataAparada = `${ano}-${mes}-${dia}T${hora}:${minuto}`; 
                const profSelecionado = profissionalValue.toLowerCase().trim();

                const barbeiroOcupado = agendaAtual.find(ag => {
                    if (!ag.data_hora) return false;
                    const agDataAparada = ag.data_hora.substring(0, 16); 
                    
                    // Puxa o nome do barbeiro no campo de Status
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
                
                let cliExistente = clientes.find(c => 
                    (c.telefone && String(c.telefone).replace(/\D/g, '') === telefone) ||
                    (c.nome && c.nome.trim().toLowerCase() === nome.toLowerCase())
                );

                if (cliExistente) {
                    clienteId = cliExistente.id;
                } else {
                    const resNovoCli = await fetch(API_CLIENTES, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            nome: nome, 
                            telefone: telefone, 
                            email: `${telefone}@cliente.com`,
                            cortes_total: 0,
                            ultima_visita: `${dia}/${mes}/${ano}`
                        })
                    });
                    if (!resNovoCli.ok) throw new Error("Erro ao criar novo cliente.");
                    const novoCli = await resNovoCli.json();
                    clienteId = novoCli.id;
                }

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