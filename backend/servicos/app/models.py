from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class Cliente(Base):
    __tablename__ = "clientes"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    telefone = Column(String, nullable=False)

    agendamentos = relationship("Agendamento", back_populates="cliente")
class Servico(Base):
    __tablename__ = "servicos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, index=True, nullable=False)
    preco = Column(Float, nullable=False)
    agendamentos = relationship("Agendamento", back_populates="servico")
class Agendamento(Base):
    __tablename__ = "agendamentos"

    id = Column(Integer, primary_key=True, index=True)
    data_hora = Column(DateTime, nullable=False)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    servico_id = Column(Integer, ForeignKey("servicos.id"), nullable=False)

    cliente = relationship("Cliente", back_populates="agendamentos")
    servico = relationship("Servico", back_populates="agendamentos")