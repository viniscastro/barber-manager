from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse # IMPORT NOVO AQUI
from sqlalchemy.orm import Session
from pydantic import BaseModel
import random

from . import models, schemas, database
from .email_service import enviar_email_codigo_registro, enviar_email_recuperacao 

models.Base.metadata.create_all(bind=database.engine)
app = FastAPI(title="Barber Manager - API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmailRequest(BaseModel):
    email: str

class ValidarCodigoRequest(BaseModel):
    email: str
    codigo: str

class LoginRequest(BaseModel):
    email: str
    senha: str

codigos_seguranca = {}

@app.post("/login/")
def rota_login(request: LoginRequest, db: Session = Depends(database.get_db)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.email == request.email).first()
    
    if not db_cliente:
        return JSONResponse(status_code=400, content={"detail": "E-mail não cadastrado no sistema."})
    
    if db_cliente.senha != request.senha:
        return JSONResponse(status_code=400, content={"detail": "Senha incorreta."})
        
    return {
        "mensagem": "Login efetuado com sucesso!", 
        "usuario": {"nome": db_cliente.nome, "email": db_cliente.email}
    }

@app.post("/enviar-codigo-registro/")
def rota_codigo_registro(request: EmailRequest, background_tasks: BackgroundTasks):
    codigo = str(random.randint(100000, 999999))
    codigos_seguranca[request.email] = codigo
    background_tasks.add_task(enviar_email_codigo_registro, request.email, codigo)
    return {"mensagem": "Código de registo enviado."}

@app.post("/recuperar-senha/")
def rota_recuperar_senha(request: EmailRequest, background_tasks: BackgroundTasks):
    codigo = str(random.randint(100000, 999999))
    codigos_seguranca[request.email] = codigo
    background_tasks.add_task(enviar_email_recuperacao, request.email, codigo)
    return {"mensagem": "Instruções de recuperação enviadas."}

@app.post("/verificar-codigo/")
def verificar_codigo(request: ValidarCodigoRequest):
    codigo_salvo = codigos_seguranca.get(request.email)
    if codigo_salvo and codigo_salvo == request.codigo:
        del codigos_seguranca[request.email]
        return {"mensagem": "Código validado com sucesso!"}
    
    return JSONResponse(status_code=400, content={"detail": "Código incorreto ou expirado."})

@app.post("/clientes/", response_model=schemas.ClienteResponse, status_code=201)
def create_cliente(cliente: schemas.ClienteCreate, db: Session = Depends(database.get_db)):
    db_cliente = db.query(models.Cliente).filter(models.Cliente.email == cliente.email).first()
    if db_cliente: 
        return JSONResponse(status_code=400, content={"detail": "Email já cadastrado no banco."})
    
    novo_cliente = models.Cliente(**cliente.dict())
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente

@app.get("/clientes/", response_model=list[schemas.ClienteResponse])
def read_clientes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return db.query(models.Cliente).offset(skip).limit(limit).all()

@app.delete("/clientes/{cliente_id}", status_code=204)
def delete_cliente(cliente_id: int, db: Session = Depends(database.get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente: 
        return JSONResponse(status_code=404, content={"detail": "Não encontrado"})
    db.delete(cliente)
    db.commit()
    return None

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def update_cliente(cliente_id: int, cliente_updated: schemas.ClienteCreate, db: Session = Depends(database.get_db)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente: 
        return JSONResponse(status_code=404, content={"detail": "Não encontrado"})
    
    for key, value in cliente_updated.dict().items(): 
        setattr(cliente, key, value)
    db.commit()
    db.refresh(cliente)
    return cliente