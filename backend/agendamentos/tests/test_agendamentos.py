import httpx
import pytest
import time

URL_SERVICOS = "http://127.0.0.1:9000"
URL_CLIENTES = "http://127.0.0.1:9001"
URL_AGENDAMENTOS = "http://127.0.0.1:9002"

@pytest.mark.asyncio
async def test_fluxo_completo_agendamento():
    async with httpx.AsyncClient() as client:
        # ==========================================
        # 1. CRIAR CLIENTE E OBTER TOKEN
        # ==========================================
        email = f"cliente_{int(time.time())}@teste.com"
        await client.post(f"{URL_CLIENTES}/clientes/", json={
            "nome": "Cliente Teste", 
            "email": email, 
            "telefone": "81900000000", 
            "senha": "123"
        })
        
        res_login = await client.post(f"{URL_CLIENTES}/login/", json={"email": email, "senha": "123"})
        token = res_login.json()["access_token"]
        cliente_id = res_login.json()["usuario"]["id"]
        headers = {"Authorization": f"Bearer {token}"}

        # ==========================================
        # 2. CRIAR UM SERVIÇO
        # ==========================================
        nome_serv = f"Corte VIP {int(time.time())}"
        res_serv = await client.post(f"{URL_SERVICOS}/servicos/", json={
            "nome": nome_serv, 
            "preco": 50.0, 
            "descricao": "Teste"
        }, headers=headers)
        servico_id = res_serv.json()["id"]

        # ==========================================
        # 3. CRIAR O AGENDAMENTO
        # ==========================================
        # Marcando um horário de teste
        data_hora_teste = "2026-10-24T14:00:00"
        payload_ag = {
            "cliente_id": cliente_id,
            "servico_id": servico_id,
            "data_hora": data_hora_teste,
            "status": "Pendente|Elton Emanuel"
        }
        
        res_ag = await client.post(f"{URL_AGENDAMENTOS}/agendamentos/", json=payload_ag, headers=headers)
        assert res_ag.status_code in [200, 201]

        # ==========================================
        # 4. SIMULAR A VERIFICAÇÃO DO BLOQUEADOR
        # ==========================================
        # O teste puxa a agenda para confirmar se o JavaScript do Front-End vai conseguir achar o conflito
        res_lista = await client.get(f"{URL_AGENDAMENTOS}/agendamentos/", headers=headers)
        agenda = res_lista.json()

        # O Python simula o que o seu cliente.js faz: buscar barbeiros ocupados na mesma hora
        conflito = next((ag for ag in agenda if ag["data_hora"] == data_hora_teste and "Elton Emanuel" in ag["status"]), None)

        # Se o teste passar nesta linha, significa que o sistema está a expor os dados perfeitamente 
        # para a sua trava de segurança bloquear agendamentos duplos!
        assert conflito is not None
        assert conflito["cliente_id"] == cliente_id