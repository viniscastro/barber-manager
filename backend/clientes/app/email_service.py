import smtplib
from email.message import EmailMessage

EMAIL_REMETENTE = "vinislad17@gmail.com"
SENHA_APP = "hfodfpethcbcqevc"

def enviar_email_codigo_registro(email_destino, codigo_verificacao):
    msg = EmailMessage()
    msg['Subject'] = 'Código de Verificação - Dom Barbershop'
    msg['From'] = EMAIL_REMETENTE
    msg['To'] = email_destino
    msg.set_content(f"""
    Olá!
    
    Bem-vindo ao sistema Dom Barbershop.
    Para concluir o seu registo, utilize o código de verificação abaixo:
    
    CÓDIGO: {codigo_verificacao}
    
    Um abraço,
    Equipa Dom Barbershop
    """)
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMETENTE, SENHA_APP)
            smtp.send_message(msg)
    except Exception as e:
        print(f"Erro: {e}")

def enviar_email_recuperacao(email_destino, codigo_recuperacao):
    msg = EmailMessage()
    msg['Subject'] = 'Recuperação de Senha - Dom Barbershop'
    msg['From'] = EMAIL_REMETENTE
    msg['To'] = email_destino
    msg.set_content(f"""
    Olá!
    
    Solicitou a recuperação da sua senha no Barber Manager.
    O seu código de segurança é: {codigo_recuperacao}
    
    Se não solicitou esta alteração, ignore este e-mail.
    """)
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(EMAIL_REMETENTE, SENHA_APP)
            smtp.send_message(msg)
    except Exception as e:
        print(f"Erro: {e}")