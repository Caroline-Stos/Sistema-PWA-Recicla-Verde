"""
Regras de negócio e serviços operacionais da Cooperativa Recicla Vila Verde (CRVV).
"""

from datetime import datetime
from typing import Dict, List, Optional

try:
    from .models import (
        ModalidadeColeta,
        PerfilUsuario,
        PorteVolume,
        SolicitacaoColeta,
        StatusSolicitacao,
        Usuario,
    )
    from .schemas import AceitarColetaRequest, SolicitacaoCreate
except ImportError:
    from models import (
        ModalidadeColeta,
        PerfilUsuario,
        PorteVolume,
        SolicitacaoColeta,
        StatusSolicitacao,
        Usuario,
    )
    from schemas import AceitarColetaRequest, SolicitacaoCreate


class CredenciaisInvalidasError(Exception):
    """Erro lançado quando telefone ou senha estão incorretos."""


class ContaBloqueadaTemporariamenteError(Exception):
    """Erro lançado após 5 tentativas consecutivas de login com falha."""


class ChamadoNaoEncontradoError(Exception):
    """Erro lançado quando o ID da solicitação não existe."""


class ChamadoIndisponivelError(Exception):
    """Erro lançado quando outro catador já assumiu a coleta (evita duplicidade)."""


MAX_TENTATIVAS_LOGIN = 5

db_usuarios: Dict[str, Usuario] = {}
db_solicitacoes: List[SolicitacaoColeta] = []
tentativas_login_global: int = 0


def resetar_dados_demo() -> None:
    """Restaura os dados planejados da cooperativa (ideal para testes automatizados)."""
    global db_usuarios, db_solicitacoes, tentativas_login_global
    tentativas_login_global = 0

    db_usuarios = {
        "MORADOR": Usuario(
            id=1,
            nome="Ana Souza",
            telefone="(11) 98765-4321",
            papel_exibicao="Moradora",
            perfil=PerfilUsuario.MORADOR,
        ),
        "CATADOR": Usuario(
            id=2,
            nome="Carlos Alberto",
            telefone="(11) 91234-5678",
            papel_exibicao="Catador Cooperado",
            perfil=PerfilUsuario.CATADOR,
        ),
        "COORDENACAO": Usuario(
            id=3,
            nome="Galpão CRVV",
            telefone="(11) 99988-7766",
            papel_exibicao="Coordenação",
            perfil=PerfilUsuario.COORDENACAO,
        ),
    }

    db_solicitacoes = [
        SolicitacaoColeta(
            id=1,
            solicitante_id=1,
            catador_id=None,
            catador_nome=None,
            endereco="Rua das Acácias, 142",
            ponto_referencia="Portão azul",
            tipos_material="Papelão e Plástico",
            porte_volume=PorteVolume.PEQUENO_MEDIO,
            modalidade_coleta=ModalidadeColeta.CARRINHO_MANUAL,
            status=StatusSolicitacao.AGUARDANDO,
            criado_em="08:30",
            concluido_em=None,
        ),
        SolicitacaoColeta(
            id=2,
            solicitante_id=1,
            catador_id=None,
            catador_nome=None,
            endereco="Av. Central, 890",
            ponto_referencia="Ao lado da padaria",
            tipos_material="Vidro e Metal",
            porte_volume=PorteVolume.GRANDE_VOLUME,
            modalidade_coleta=ModalidadeColeta.CAMINHAO_COOPERATIVA,
            status=StatusSolicitacao.AGUARDANDO,
            criado_em="09:10",
            concluido_em=None,
        ),
        SolicitacaoColeta(
            id=3,
            solicitante_id=1,
            catador_id=None,
            catador_nome=None,
            endereco="Rua Ipê Roxo, 55",
            ponto_referencia="Em frente à praça comunitária",
            tipos_material="Papelão, Plástico e Metal",
            porte_volume=PorteVolume.PEQUENO_MEDIO,
            modalidade_coleta=ModalidadeColeta.CARRINHO_MANUAL,
            status=StatusSolicitacao.AGUARDANDO,
            criado_em="09:35",
            concluido_em=None,
        ),
        SolicitacaoColeta(
            id=4,
            solicitante_id=1,
            catador_id=2,
            catador_nome="Carlos Alberto",
            endereco="Rua das Palmeiras, 310",
            ponto_referencia="Casa de esquina com muro branco",
            tipos_material="Papelão",
            porte_volume=PorteVolume.PEQUENO_MEDIO,
            modalidade_coleta=ModalidadeColeta.CARRINHO_MANUAL,
            status=StatusSolicitacao.A_CAMINHO,
            criado_em="08:15",
            concluido_em=None,
        ),
    ]


# Inicializa o estado padrão ao carregar o módulo
resetar_dados_demo()


def definir_modalidade_coleta(porte_volume: PorteVolume) -> ModalidadeColeta:
    """Define automaticamente a modalidade de coleta com base no porte do volume."""
    if porte_volume == PorteVolume.GRANDE_VOLUME:
        return ModalidadeColeta.CAMINHAO_COOPERATIVA
    return ModalidadeColeta.CARRINHO_MANUAL


def autenticar_usuario(telefone: str, senha: str) -> Usuario:
    """Valida credenciais e controla o bloqueio após 5 tentativas inválidas."""
    global tentativas_login_global

    if tentativas_login_global >= MAX_TENTATIVAS_LOGIN:
        raise ContaBloqueadaTemporariamenteError(
            "Você realizou 5 tentativas seguidas com senha incorreta. "
            "Por segurança, aguarde 5 minutos antes de tentar novamente."
        )

    telefone_limpo = (telefone or "").strip()
    if not telefone_limpo or len(senha or "") < 8 or senha != "Recicla2026":
        tentativas_login_global += 1
        raise CredenciaisInvalidasError(
            f"Confira o número de telefone e digite sua senha de pelo menos 8 caracteres "
            f"(Tentativa {tentativas_login_global} de {MAX_TENTATIVAS_LOGIN})."
        )

    if "98765" in telefone_limpo:
        chave_perfil = "MORADOR"
    elif "91234" in telefone_limpo:
        chave_perfil = "CATADOR"
    elif "99988" in telefone_limpo:
        chave_perfil = "COORDENACAO"
    else:
        chave_perfil = "MORADOR"

    tentativas_login_global = 0
    return db_usuarios[chave_perfil]


def listar_solicitacoes(
    modalidade: Optional[ModalidadeColeta] = None,
    apenas_ativas_rua: bool = False,
) -> List[SolicitacaoColeta]:
    """Retorna a lista de solicitações filtrada conforme a visão operacional."""
    resultado = list(db_solicitacoes)

    if modalidade:
        resultado = [s for s in resultado if s.modalidade_coleta == modalidade]

    if apenas_ativas_rua:
        resultado = [
            s
            for s in resultado
            if s.modalidade_coleta == ModalidadeColeta.CARRINHO_MANUAL
            and s.status in (StatusSolicitacao.AGUARDANDO, StatusSolicitacao.A_CAMINHO)
        ]

    return resultado


def obter_solicitacao_por_id(pedido_id: int) -> SolicitacaoColeta:
    """Busca uma solicitação pelo ID ou lança ChamadoNaoEncontradoError."""
    for pedido in db_solicitacoes:
        if pedido.id == pedido_id:
            return pedido
    raise ChamadoNaoEncontradoError(f"Pedido #{pedido_id} não encontrado.")


def criar_solicitacao(dados: SolicitacaoCreate, horario_atual: Optional[str] = None) -> SolicitacaoColeta:
    """Registra uma nova solicitação de coleta com atribuição automática de modalidade."""
    modalidade = definir_modalidade_coleta(dados.porte_volume)
    hora = horario_atual or datetime.now().strftime("%H:%M")
    novo_id = max((s.id for s in db_solicitacoes), default=0) + 1

    nova = SolicitacaoColeta(
        id=novo_id,
        solicitante_id=dados.solicitante_id,
        catador_id=None,
        catador_nome=None,
        endereco=dados.endereco,
        ponto_referencia=dados.ponto_referencia or "Sem ponto de referência",
        tipos_material=" e ".join(dados.materiais),
        porte_volume=dados.porte_volume,
        modalidade_coleta=modalidade,
        status=StatusSolicitacao.AGUARDANDO,
        criado_em=hora,
        concluido_em=None,
    )
    db_solicitacoes.insert(0, nova)
    return nova


def aceitar_solicitacao(pedido_id: int, req: AceitarColetaRequest) -> SolicitacaoColeta:
    """Assume uma coleta pendente e impede que dois catadores aceitem o mesmo chamado."""
    pedido = obter_solicitacao_por_id(pedido_id)

    if pedido.status != StatusSolicitacao.AGUARDANDO:
        raise ChamadoIndisponivelError(
            "Este chamado já foi aceito por outro catador. Volte para atualizar a fila."
        )

    pedido.status = StatusSolicitacao.A_CAMINHO
    if req.is_caminhao:
        pedido.catador_id = req.catador_id or 3
        pedido.catador_nome = req.catador_nome or "Equipe do Caminhão CRVV"
    else:
        pedido.catador_id = req.catador_id or 2
        pedido.catador_nome = req.catador_nome or "Carlos Alberto"

    return pedido


def concluir_solicitacao(pedido_id: int, horario_conclusao: Optional[str] = None) -> SolicitacaoColeta:
    """Finaliza a coleta e registra o horário de conclusão."""
    pedido = obter_solicitacao_por_id(pedido_id)
    pedido.status = StatusSolicitacao.CONCLUIDO
    pedido.concluido_em = horario_conclusao or "10:45"
    return pedido
