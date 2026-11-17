"""
Schemas de validação e serialização (Pydantic) para a API da CRVV.
"""

import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

try:
    from .models import ModalidadeColeta, PerfilUsuario, PorteVolume, StatusSolicitacao
except ImportError:
    from models import ModalidadeColeta, PerfilUsuario, PorteVolume, StatusSolicitacao

PADRAO_XSS_INVALIDO = re.compile(r"<script|</script|javascript:", re.IGNORECASE)
MATERIAIS_PERMITIDOS = {"Papelão", "Plástico", "Vidro", "Metal"}


class LoginRequest(BaseModel):
    telefone: str = Field(..., min_length=8, max_length=15, examples=["(11) 91234-5678"])
    senha: str = Field(..., min_length=8, max_length=64, examples=["Recicla2026"])


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    telefone: str
    papel_exibicao: str
    perfil: PerfilUsuario


class SolicitacaoCreate(BaseModel):
    solicitante_id: int = Field(default=1, ge=1)
    endereco: str = Field(..., min_length=5, max_length=200, examples=["Rua das Acácias, 142"])
    ponto_referencia: Optional[str] = Field(default="", max_length=100, examples=["Portão azul"])
    materiais: List[str] = Field(..., min_length=1, examples=[["Papelão", "Plástico"]])
    porte_volume: PorteVolume = Field(default=PorteVolume.PEQUENO_MEDIO)

    @field_validator("endereco")
    @classmethod
    def validar_endereco(cls, v: str) -> str:
        limpo = v.strip()
        if len(limpo) < 5:
            raise ValueError("Informe o nome da rua e o número da residência para a retirada.")
        if PADRAO_XSS_INVALIDO.search(limpo):
            raise ValueError("Caracteres inválidos detectados no endereço. Utilize apenas letras e números.")
        return limpo

    @field_validator("ponto_referencia")
    @classmethod
    def validar_referencia(cls, v: Optional[str]) -> str:
        if not v:
            return "Sem ponto de referência"
        limpo = v.strip()
        if PADRAO_XSS_INVALIDO.search(limpo):
            raise ValueError("Caracteres inválidos detectados no ponto de referência.")
        return limpo or "Sem ponto de referência"

    @field_validator("materiais")
    @classmethod
    def validar_materiais(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("Selecione pelo menos um tipo de material reciclável.")
        for item in v:
            if item not in MATERIAIS_PERMITIDOS:
                raise ValueError(f"Material inválido: {item}. Permitidos: {', '.join(sorted(MATERIAIS_PERMITIDOS))}.")
        return v


class AceitarColetaRequest(BaseModel):
    catador_id: Optional[int] = None
    catador_nome: Optional[str] = None
    is_caminhao: bool = False


class ConcluirColetaRequest(BaseModel):
    horario_conclusao: Optional[str] = None


class SolicitacaoResponse(BaseModel):
    id: int
    solicitante_id: int
    catador_id: Optional[int] = None
    catador_nome: Optional[str] = None
    endereco: str
    ponto_referencia: str
    tipos_material: str
    porte_volume: PorteVolume
    modalidade_coleta: ModalidadeColeta
    status: StatusSolicitacao
    criado_em: str
    concluido_em: Optional[str] = None
