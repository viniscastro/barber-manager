from pydantic import BaseModel, ConfigDict
from datetime import datetime
class ServicoBase(BaseModel):
    nome: str
    preco: float

class ServicoCreate(ServicoBase):
    pass
class ServicoResponse(ServicoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
class ClienteBase(BaseModel):
    nome: str
    telefone: str

class ClienteCreate(ClienteBase):
    pass

class ClienteResponse(ClienteBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
class AgendamentoBase(BaseModel):
    data_hora: datetime
    cliente_id: int
    servico_id: int

class AgendamentoCreate(AgendamentoBase):
    pass

class AgendamentoResponse(AgendamentoBase):
    id: int
    model_config = ConfigDict(from_attributes=True)