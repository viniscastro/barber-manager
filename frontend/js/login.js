// Configuração das rotas relativas para o Nginx (API Gateway)
const API_CLIENTES = '/api/clientes/';

// --- Funções de Máscara e Utilitários ---
document.addEventListener("DOMContentLoaded", () => {
    const inputTelefoneReg = document.getElementById('reg-telefone');
    if (inputTelefoneReg) {
        inputTelefoneReg.addEventListener('input', function (e) {
            let valor = e.target.value.replace(/\D/g, '');
            if (valor.length > 11) valor = valor.slice(0, 11);
            if (valor.length > 2) valor = `(${valor.substring(0, 2)}) ${valor.substring(2)}`;
            if (valor.length > 10) valor = `${valor.substring(0, 10)}-${valor.substring(10)}`;
            else if (valor.length > 9) valor = `${valor.substring(0, 9)}-${valor.substring(9)}`;
            e.target.value = valor;
        });
    }
});

function alternarTela(idTela) {
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    document.querySelectorAll('.message-alert').forEach(msg => { msg.className = 'message-alert'; msg.innerHTML = ''; });
    document.querySelectorAll('input').forEach(input => input.value = '');
    document.getElementById(idTela).classList.add('active');
}

function exibirMensagem(elementoId, texto, tipo) {
    const msgBox = document.getElementById(elementoId);
    if (msgBox) { msgBox.innerHTML = texto; msgBox.className = `message-alert ${tipo}`; }
}

// Variáveis globais para cadastro/recuperação
let emailEmProcesso = ""; 
let dadosCadastro = {};

// --- Lógica de Login ---
async function fazerLogin() {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value.trim();
    if (!email || !senha) {
        return exibirMensagem('msg-login', 'Preencha todos os campos.', 'error');
    }

    try {
        const resposta = await fetch(`${API_CLIENTES}login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, senha: senha })
        });
        const dados = await resposta.json();

        if (resposta.ok) {
            localStorage.setItem('access_token', dados.access_token);
            localStorage.setItem('usuario_id', dados.usuario.id);
            localStorage.setItem('usuario_nome', dados.usuario.nome);
            localStorage.setItem('is_admin', dados.usuario.is_admin);
            
            if (dados.usuario.is_admin === true) {
                window.location.href = 'dashboard.html';
            } else {
                window.location.href = 'painel_cliente.html';
            }
        } else {
            exibirMensagem('msg-login', dados.detail || 'Erro ao fazer login.', 'error');
        }
    } catch (erro) {
        console.error("Erro no login:", erro);
        exibirMensagem('msg-login', 'Erro de conexão com o servidor.', 'error');
    }
}

// --- Lógica de Cadastro ---
async function fazerCadastro() {
    const primeiroNome = document.getElementById('reg-nome').value.trim();
    const sobrenome = document.getElementById('reg-sobrenome').value.trim();
    const telefoneRaw = document.getElementById('reg-telefone').value;
    const email = document.getElementById('reg-email').value.trim();
    const senha = document.getElementById('reg-senha').value.trim();
    const senhaConfirm = document.getElementById('reg-senha-confirm').value.trim();
    const telefoneLimpo = telefoneRaw.replace(/\D/g, '');
    const codigoSecreto = document.getElementById('codigo-admin') ? document.getElementById('codigo-admin').value.trim() : "";

    if (primeiroNome === '' || sobrenome === '' || email === '' || senha === '' || senhaConfirm === '') {
        return exibirMensagem('msg-register', 'Preencha todos os campos.', 'error');
    }
    if (telefoneLimpo.length < 10) return exibirMensagem('msg-register', 'Digite um telefone válido com DDD.', 'error');
    if (senha.length < 8) return exibirMensagem('msg-register', 'A senha deve ter no mínimo 8 caracteres.', 'error');
    if (senha !== senhaConfirm) return exibirMensagem('msg-register', 'As senhas não coincidem!', 'error');

    emailEmProcesso = email;
    dadosCadastro = { nome: `${primeiroNome} ${sobrenome}`, email: email, senha: senha, telefone: telefoneLimpo, codigo_admin: codigoSecreto };

    exibirMensagem('msg-register', 'A preparar o seu registo...', 'success');

    try {
        const resposta = await fetch(`${API_CLIENTES}enviar-codigo-registro/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        if (resposta.ok) {
            alternarTela('form-verify-reg');
            exibirMensagem('msg-verify-reg', 'Enviámos um código para o seu e-mail.', 'success');
        } else {
            exibirMensagem('msg-register', 'Erro ao enviar código.', 'error');
        }
    } catch (erro) {
        exibirMensagem('msg-register', 'Erro de conexão com o servidor.', 'error');
    }
}

async function verificarCodigoRegistro() {
    const codigo = document.getElementById('verify-reg-code').value.trim();
    if (codigo.length < 6) return exibirMensagem('msg-verify-reg', 'Introduza os 6 dígitos.', 'error');

    try {
        const resposta = await fetch(`${API_CLIENTES}verificar-codigo/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailEmProcesso, codigo: codigo })
        });
        if (resposta.ok) {
            exibirMensagem('msg-verify-reg', 'Código validado! Criando conta...', 'success');
            const respostaDb = await fetch(`${API_CLIENTES}clientes/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadosCadastro)
            });
            if (respostaDb.ok) {
                exibirMensagem('msg-verify-reg', 'Conta criada! Redirecionando...', 'success');
                setTimeout(() => { alternarTela('form-login'); }, 2000);
            } else {
                const erroDb = await respostaDb.json();
                exibirMensagem('msg-verify-reg', erroDb.detail || 'Erro ao gravar.', 'error');
            }
        } else {
            exibirMensagem('msg-verify-reg', 'Código incorreto ou expirado.', 'error');
        }
    } catch (erro) {
        exibirMensagem('msg-verify-reg', 'Erro de conexão.', 'error');
    }
}

// --- Lógica de Senha ---
async function recuperarSenha() {
    const email = document.getElementById('forgot-email').value.trim();
    if (email === '') return exibirMensagem('msg-forgot', 'Insira o seu e-mail.', 'error');
    emailEmProcesso = email;

    try {
        const resposta = await fetch(`${API_CLIENTES}recuperar-senha/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        });
        if (resposta.ok) {
            alternarTela('form-verify-forgot');
            exibirMensagem('msg-verify-forgot', 'Instruções enviadas.', 'success');
        } else {
            exibirMensagem('msg-forgot', 'Erro ao processar.', 'error');
        }
    } catch (erro) {
        exibirMensagem('msg-forgot', 'Erro de conexão.', 'error');
    }
}

async function verificarCodigoRecuperacao() {
    const codigo = document.getElementById('verify-forgot-code').value.trim();
    if (codigo.length < 6) return exibirMensagem('msg-verify-forgot', 'Introduza os 6 dígitos.', 'error');

    try {
        const resposta = await fetch(`${API_CLIENTES}verificar-codigo/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailEmProcesso, codigo: codigo })
        });
        if (resposta.ok) alternarTela('form-reset-password');
        else exibirMensagem('msg-verify-forgot', 'Código incorreto ou expirado.', 'error');
    } catch (erro) {
        exibirMensagem('msg-verify-forgot', 'Erro de conexão.', 'error');
    }
}

function redefinirSenha() {
    const senha = document.getElementById('reset-senha').value.trim();
    const senhaConfirm = document.getElementById('reset-senha-confirm').value.trim();
    if (senha !== senhaConfirm) return exibirMensagem('msg-reset-password', 'Senhas não coincidem!', 'error');
    exibirMensagem('msg-reset-password', 'Senha alterada!', 'success');
    setTimeout(() => { alternarTela('form-login'); }, 2000);
}

// --- Eventos ---
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const telas = {
            'form-login': fazerLogin, 'form-register': fazerCadastro, 'form-forgot': recuperarSenha,
            'form-verify-reg': verificarCodigoRegistro, 'form-verify-forgot': verificarCodigoRecuperacao, 'form-reset-password': redefinirSenha
        };
        for (const [id, func] of Object.entries(telas)) {
            const el = document.getElementById(id);
            if (el && el.classList.contains('active')) { func(); break; }
        }
    }
});

function toggleCodigoAdmin() {
    const checkbox = document.getElementById('check-funcionario');
    const divCodigo = document.getElementById('div-codigo-admin');
    divCodigo.style.display = checkbox.checked ? 'block' : 'none';
    if(!checkbox.checked) document.getElementById('codigo-admin').value = '';
}