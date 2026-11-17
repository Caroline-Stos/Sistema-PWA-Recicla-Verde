"""
Modelos de domínio e entidades da Cooperativa Recicla Vila Verde (CRVV).
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class PerfilUsuario(str, Enum):
    MORADOR = "MORADOR"
    CATADOR = "CATADOR"
    COORDENACAO = "COORDENACAO"


class PorteVolume(str, Enum):
    PEQUENO_MEDIO = "Pequeno / Médio"
    GRANDE_VOLUME = "Grande Volume"


class ModalidadeColeta(str, Enum):
    CARRINHO_MANUAL = "Carrinho Manual"
    CAMINHAO_COOPERATIVA = "Caminhão da Cooperativa"


class StatusSolicitacao(str, Enum):
    AGUARDANDO = "AGUARDANDO"
    A_CAMINHO = "A_CAMINHO"
    CONCLUIDO = "CONCLUIDO"


@dataclass
class Usuario:
    id: int
    nome: str
    telefone: str
    papel_exibicao: str
    perfil: PerfilUsuario
    senha_hash: str = "Recicla2026"
    tentativas_falhas: int = 0


@dataclass
class SolicitacaoColeta:
    id: int
    solicitante_id: int
    endereco: str
    ponto_referencia: str
    tipos_material: str
    porte_volume: PorteVolume
    modalidade_coleta: ModalidadeColeta
    status: StatusSolicitacao
    criado_em: str
    catador_id: Optional[int] = None
    catador_nome: Optional[str] = None
    concluido_em: Optional[str] = None
