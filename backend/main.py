"""
Ponto de entrada da API FastAPI da Cooperativa Recicla Vila Verde (CRVV).
"""

from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

try:
    from .models import ModalidadeColeta
    from .schemas import (
        AceitarColetaRequest,
        ConcluirColetaRequest,
        LoginRequest,
        SolicitacaoCreate,
        SolicitacaoResponse,
        UsuarioResponse,
    )
    from .services import (
        ChamadoIndisponivelError,
        ChamadoNaoEncontradoError,
        ContaBloqueadaTemporariamenteError,
        CredenciaisInvalidasError,
        aceitar_solicitacao,
        autenticar_usuario,
        concluir_solicitacao,
        criar_solicitacao,
        listar_solicitacoes,
        obter_solicitacao_por_id,
    )
except ImportError:
    from models import ModalidadeColeta
    from schemas import (
        AceitarColetaRequest,
        ConcluirColetaRequest,
        LoginRequest,
        SolicitacaoCreate,
        SolicitacaoResponse,
        UsuarioResponse,
    )
    from services import (
        ChamadoIndisponivelError,
        ChamadoNaoEncontradoError,
        ContaBloqueadaTemporariamenteError,
        CredenciaisInvalidasError,
        aceitar_solicitacao,
        autenticar_usuario,
        concluir_solicitacao,
        criar_solicitacao,
        listar_solicitacoes,
        obter_solicitacao_por_id,
    )

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(
    title="Cooperativa Recicla Vila Verde (CRVV) — API",
    description="Back-end modular em FastAPI para gestão de coleta seletiva comunitária porta a porta.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/login", response_model=UsuarioResponse, tags=["Autenticação"])
def login(credenciais: LoginRequest):
    """Autentica moradores, catadores ou coordenação e aplica bloqueio após 5 falhas."""
    try:
        usuario = autenticar_usuario(credenciais.telefone, credenciais.senha)
        return usuario
    except ContaBloqueadaTemporariamenteError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    except CredenciaisInvalidasError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@app.get("/api/solicitacoes", response_model=List[SolicitacaoResponse], tags=["Coletas"])
def get_solicitacoes(
    modalidade: Optional[ModalidadeColeta] = Query(default=None),
    apenas_ativas_rua: bool = Query(default=False),
):
    """Lista os pedidos de coleta com filtros opcionais para fila da rua ou caminhão."""
    return listar_solicitacoes(modalidade=modalidade, apenas_ativas_rua=apenas_ativas_rua)


@app.get("/api/solicitacoes/{pedido_id}", response_model=SolicitacaoResponse, tags=["Coletas"])
def get_solicitacao(pedido_id: int):
    """Retorna os detalhes de um pedido específico de coleta."""
    try:
        return obter_solicitacao_por_id(pedido_id)
    except ChamadoNaoEncontradoError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@app.post(
    "/api/solicitacoes",
    response_model=SolicitacaoResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Coletas"],
)
def post_solicitacao(dados: SolicitacaoCreate):
    """Cria uma nova solicitação de coleta e atribui automaticamente a modalidade pelo porte."""
    return criar_solicitacao(dados)


@app.post("/api/solicitacoes/{pedido_id}/aceitar", response_model=SolicitacaoResponse, tags=["Coletas"])
def post_aceitar_coleta(pedido_id: int, req: AceitarColetaRequest):
    """Reserva um chamado para o catador ou caminhão e impede conflito de concorrência."""
    try:
        return aceitar_solicitacao(pedido_id, req)
    except ChamadoNaoEncontradoError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ChamadoIndisponivelError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@app.post("/api/solicitacoes/{pedido_id}/concluir", response_model=SolicitacaoResponse, tags=["Coletas"])
def post_concluir_coleta(pedido_id: int, req: Optional[ConcluirColetaRequest] = None):
    """Registra a conclusão de uma coleta em andamento."""
    try:
        horario = req.horario_conclusao if req else None
        return concluir_solicitacao(pedido_id, horario_conclusao=horario)
    except ChamadoNaoEncontradoError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


# Rotas para servir os módulos de front-end (pasta frontend/) pelo FastAPI
@app.get("/", include_in_schema=False)
def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/styles.css", include_in_schema=False)
def serve_styles():
    return FileResponse(FRONTEND_DIR / "styles.css", media_type="text/css")


@app.get("/app.js", include_in_schema=False)
def serve_app_js():
    return FileResponse(FRONTEND_DIR / "app.js", media_type="application/javascript")
