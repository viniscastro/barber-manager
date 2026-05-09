if (formAgendamento) {
        formAgendamento.addEventListener('submit', async function(e) {
            e.preventDefault();

            const nome = document.getElementById('nome').value.trim();
            const telefone = document.getElementById('telefone').value.replace(/\D/g, ''); 
            const dataHoraRaw = document.getElementById('data-hora').value; 
            const servicoValue = document.getElementById('servico').value; 

            const regexData = /(\d{2,4})\D+(\d{2})\D+(\d{2,4})\D+(\d{2})\D+(\d{2})/;
            const match = dataHoraRaw.match(regexData);

            if (!match) return alert("Erro: Preencha a data e hora corretamente.");

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
                    const resServicos = await fetch(API_SERVICOS);
                    const servicosDb = await resServicos.json();
                    const servEncontrado = servicosDb.find(s => servicoValue.includes(s.nome) || s.nome === servicoValue);
                    
                    if (servEncontrado) {
                        servicoIdFinal = servEncontrado.id;
                    } else {
                        return alert("Erro: Serviço não encontrado no banco.");
                    }
                }

                let clienteId = null;
                const resClientes = await fetch(API_CLIENTES);
                const clientes = await resClientes.json();
                let cliExistente = clientes.find(c => c.telefone && c.telefone.replace(/\D/g, '') === telefone);

                if (cliExistente) {
                    clienteId = cliExistente.id;
                } else {
                    const resNovoCli = await fetch(API_CLIENTES, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nome: nome, telefone: telefone, email: `${telefone}@cliente.com` })
                    });
                    const novoCli = await resNovoCli.json();
                    clienteId = novoCli.id;
                }
                const payload = {
                    cliente_id: clienteId,
                    servico_id: servicoIdFinal,
                    data_hora: dataHoraISO,
                    status: "Pendente"
                };

                const resAgenda = await fetch(API_AGENDA, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (resAgenda.ok) {
                    alert("Agendamento salvo com sucesso!");
                    formAgendamento.reset();
                    window.location.reload(); 
                } else {
                    const erroDB = await resAgenda.text();
                    alert("Erro. Motivo:\n" + erroDB);
                }

            } catch (e) {
                console.error(e);
                alert("Erro de conexão. Docker inativo.");
            }
        });
    }