const API_BASE = {
    servicos: "http://localhost:8000/servicos/",
    clientes: "http://localhost:8001/clientes/",
    agendamentos: "http://localhost:8002/agendamentos/"
};

const API = {
    getServicos: async () => {
        const res = await fetch(API_BASE.servicos);
        if (!res.ok) throw new Error("Erro ao buscar serviços");
        return res.json();
    },

    getClientes: async () => {
        const res = await fetch(API_BASE.clientes);
        if (!res.ok) throw new Error("Erro ao buscar clientes");
        return res.json();
    },
    
    criarCliente: async (clienteData) => {
        const res = await fetch(API_BASE.clientes, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clienteData)
        });
        if (!res.ok) throw new Error("Erro ao criar cliente");
        return res.json();
    },

    atualizarCliente: async (id, dados) => {
        const res = await fetch(`${API_CLIENTES}${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    getAgendamentos: async () => {
        const res = await fetch(API_BASE.agendamentos);
        if (!res.ok) throw new Error("Erro ao buscar agendamentos");
        return res.json();
    },
    
    getAgendamentoPorId: async (id) => {
        const res = await fetch(`${API_BASE.agendamentos}${id}`);
        if (!res.ok) throw new Error("Erro ao buscar o agendamento específico");
        return res.json();
    },

    criarAgendamento: async (agendaData) => {
        const res = await fetch(API_BASE.agendamentos, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agendaData)
        });
        if (!res.ok) {
            const erro = await res.text();
            throw new Error(erro);
        }
        return res.json();
    },

    atualizarAgendamento: async (id, agendaData) => {
        const res = await fetch(`${API_BASE.agendamentos}${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agendaData)
        });
        if (!res.ok) throw new Error("Erro ao atualizar o status do agendamento");
        return res.json();
    },

    deletarAgendamento: async (id) => {
        const res = await fetch(`${API_BASE.agendamentos}${id}`, {
            method: 'DELETE'
        });
        if (!res.ok) throw new Error("Erro ao deletar o agendamento");
        return true; 
    }
};