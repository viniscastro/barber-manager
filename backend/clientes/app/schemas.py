from pydantic import BaseModel
from typing import Optional

class ClienteBase(BaseModel):
    nome: str
    email: str
    telefone: Optional[str] = None

class ClienteCreate(ClienteBase):
    senha: str
    codigo_admin: Optional[str] = None 

class ClienteResponse(ClienteBase):
    id: int
    is_admin: bool 

    class Config:
        orm_mode = True