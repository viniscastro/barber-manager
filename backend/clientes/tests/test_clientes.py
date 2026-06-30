import httpx
import pytest
import time

BASE_URL = "http://127.0.0.1:9001"

@pytest.mark.asyncio
async def test_criar_e_logar_cliente():
    async with httpx.AsyncClient() as client:
        # Gera um email único baseado nos milissegundos atuais
        email_unico = f"teste_{int(time.time())}@dombarbershop.com"
        
        # 1. TESTE DE CRIAÇÃO
        payload_cadastro = {
            "nome": "Cliente de Teste",
            "email": email_unico,
            "telefone": "81900000000",
            "senha": "senha_super_segura"
        }
        
        res_cadastro = await client.post(f"{BASE_URL}/clientes/", json=payload_cadastro)
        assert res_cadastro.status_code in [200, 201]
        
        dados_cliente = res_cadastro.json()
        assert dados_cliente["email"] == email_unico
        assert dados_cliente["is_admin"] == False

        # 2. TESTE DE LOGIN
        payload_login = {
            "email": email_unico,
            "senha": "senha_super_segura"
        }
        
        res_login = await client.post(f"{BASE_URL}/login/", json=payload_login)
        assert res_login.status_code == 200
        
        dados_login = res_login.json()
        assert "access_token" in dados_login