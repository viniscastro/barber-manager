from fastapi import FastAPI, Depends, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
import random
import jwt
from datetime import datetime, timedelta

from passlib.context import CryptContext

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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "chave_super_secreta_da_dom_barbershop"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def obter_usuario_atual(token: str = Depends(oauth2_scheme), db: Session = Depends(database.get_db)):
    excecao_credenciais = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Sessão inválida ou expirada. Faça login novamente.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise excecao_credenciais
    except jwt.PyJWTError:
        raise excecao_credenciais
        
    usuario = db.query(models.Cliente).filter(models.Cliente.email == email).first()
    if usuario is None:
        raise excecao_credenciais
    
    return usuario

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
    if not verify_password(request.senha, db_cliente.senha):
        return JSONResponse(status_code=400, content={"detail": "Senha incorreta."})
        
    access_token = create_access_token(data={"sub": db_cliente.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "usuario": {"id": db_cliente.id, "nome": db_cliente.nome, "email": db_cliente.email}
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
    
    cliente_dados = cliente.dict()
    cliente_dados["senha"] = get_password_hash(cliente_dados["senha"]) 
    
    novo_cliente = models.Cliente(**cliente_dados)
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente

@app.get("/clientes/", response_model=list[schemas.ClienteResponse])
def read_clientes(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), usuario_atual: models.Cliente = Depends(obter_usuario_atual)):
    return db.query(models.Cliente).offset(skip).limit(limit).all()

@app.delete("/clientes/{cliente_id}", status_code=204)
def delete_cliente(cliente_id: int, db: Session = Depends(database.get_db), usuario_atual: models.Cliente = Depends(obter_usuario_atual)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente: 
        return JSONResponse(status_code=404, content={"detail": "Não encontrado"})
    db.delete(cliente)
    db.commit()
    return None

@app.put("/clientes/{cliente_id}", response_model=schemas.ClienteResponse)
def update_cliente(cliente_id: int, cliente_updated: schemas.ClienteCreate, db: Session = Depends(database.get_db), usuario_atual: models.Cliente = Depends(obter_usuario_atual)):
    cliente = db.query(models.Cliente).filter(models.Cliente.id == cliente_id).first()
    if not cliente: 
        return JSONResponse(status_code=404, content={"detail": "Não encontrado"})
    
    dados_atualizados = cliente_updated.dict()
    if "senha" in dados_atualizados and dados_atualizados["senha"]:
        dados_atualizados["senha"] = get_password_hash(dados_atualizados["senha"])
        
    for key, value in dados_atualizados.items(): 
        setattr(cliente, key, value)
    db.commit()
    db.refresh(cliente)
    return cliente