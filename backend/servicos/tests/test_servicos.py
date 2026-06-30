import httpx
import pytest
import time

URL_SERVICOS = "http://127.0.0.1:9000"
URL_CLIENTES = "http://127.0.0.1:9001"

@pytest.mark.asyncio
async def test_criar_e_listar_servicos():
    async with httpx.AsyncClient() as client:
        # ==========================================
        # 1. OBTER O TOKEN JWT
        # ==========================================
        email_admin_unico = f"admin_{int(time.time())}@teste.com"
        
        await client.post(f"{URL_CLIENTES}/clientes/", json={
            "nome": "Admin Teste",
            "email": email_admin_unico,
            "telefone": "81999999999",
            "senha": "123"
        })
        
        res_login = await client.post(f"{URL_CLIENTES}/login/", json={
            "email": email_admin_unico,
            "senha": "123"
        })
        
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # ==========================================
        # 2. TESTE DE CRIAÇÃO (POST)
        # ==========================================
        nome_servico_unico = f"Corte Teste {int(time.time())}"
        payload = {
            "nome": nome_servico_unico,
            "preco": 35.0,
            "descricao": "Corte gerado automaticamente"
        }
        
        res_post = await client.post(f"{URL_SERVICOS}/servicos/", json=payload, headers=headers)
        assert res_post.status_code in [200, 201]
        assert res_post.json()["nome"] == nome_servico_unico

        # ==========================================
        # 3. TESTE DE LISTAGEM (GET)
        # ==========================================
        res_get = await client.get(f"{URL_SERVICOS}/servicos/", headers=headers)
        assert res_get.status_code == 200
        
        lista_servicos = res_get.json()
        assert len(lista_servicos) > 0