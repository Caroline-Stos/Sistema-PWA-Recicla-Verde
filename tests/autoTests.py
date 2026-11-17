"""
Testes automatizados (Unitários, Integração FastAPI e Integridade Front-End)
Cooperativa Recicla Vila Verde (CRVV)
"""

from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from backend.main import app
from backend.models import ModalidadeColeta, PerfilUsuario, PorteVolume, StatusSolicitacao
from backend.schemas import AceitarColetaRequest, SolicitacaoCreate
from backend.services import (
    ChamadoIndisponivelError,
    ContaBloqueadaTemporariamenteError,
    CredenciaisInvalidasError,
    aceitar_solicitacao,
    autenticar_usuario,
    concluir_solicitacao,
    criar_solicitacao,
    definir_modalidade_coleta,
    resetar_dados_demo,
)

ROOT_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = ROOT_DIR / "frontend"

client = TestClient(app)


@pytest.fixture(autouse=True)
def restaurar_estado_banco():
    """Garante que cada teste comece com os dados limpos do protótipo."""
    resetar_dados_demo()
    yield
    resetar_dados_demo()


# ============================================================================
# 1. TESTES DE ARQUITETURA E MÓDULOS FRONT-END (HTML, CSS E JS)
# ============================================================================
def test_arquivos_frontend_separados_existem():
    assert (FRONTEND_DIR / "index.html").is_file(), "index.html deve existir em frontend/"
    assert (FRONTEND_DIR / "styles.css").is_file(), "styles.css deve existir em frontend/"
    assert (FRONTEND_DIR / "app.js").is_file(), "app.js deve existir em frontend/"


def test_index_html_referencia_modulos_externos():
    conteudo_html = (FRONTEND_DIR / "index.html").read_text(encoding="utf-8")
    assert '<link rel="stylesheet" href="styles.css" />' in conteudo_html
    assert '<script src="app.js"></script>' in conteudo_html
    assert "<style>" not in conteudo_html, "O CSS deve estar isolado no styles.css"
    assert "<aside" not in conteudo_html, "A barra <aside> de navegação do protótipo foi removida"


def test_styles_css_contem_regras_alto_contraste_e_botoes():
    conteudo_css = (FRONTEND_DIR / "styles.css").read_text(encoding="utf-8")
    assert "--green-primary: #0F5132;" in conteudo_css
    assert ".touch-target-lg" in conteudo_css
    assert ".btn-primary-hc" in conteudo_css
    assert ".card-hc" in conteudo_css


# ============================================================================
# 2. TESTES UNITÁRIOS DE REGRAS DE NEGÓCIO E VALIDAÇÃO (SERVICES E SCHEMAS)
# ============================================================================
def test_atribuicao_automatica_modalidade_por_porte():
    assert definir_modalidade_coleta(PorteVolume.PEQUENO_MEDIO) == ModalidadeColeta.CARRINHO_MANUAL
    assert definir_modalidade_coleta(PorteVolume.GRANDE_VOLUME) == ModalidadeColeta.CAMINHAO_COOPERATIVA


def test_autenticacao_perfis_cooperativa():
    morador = autenticar_usuario("(11) 98765-4321", "Recicla2026")
    assert morador.perfil == PerfilUsuario.MORADOR
    assert morador.nome == "Ana Souza"

    catador = autenticar_usuario("(11) 91234-5678", "Recicla2026")
    assert catador.perfil == PerfilUsuario.CATADOR
    assert catador.nome == "Carlos Alberto"

    coord = autenticar_usuario("(11) 99988-7766", "Recicla2026")
    assert coord.perfil == PerfilUsuario.COORDENACAO


def test_bloqueio_temporario_apos_5_tentativas_invalidas():
    for _ in range(5):
        with pytest.raises(CredenciaisInvalidasError):
            autenticar_usuario("(11) 91234-5678", " senha_errada ")

    with pytest.raises(ContaBloqueadaTemporariamenteError):
        autenticar_usuario("(11) 91234-5678", "Recicla2026")


def test_bloqueio_xss_no_cadastro_de_solicitacao():
    with pytest.raises(ValidationError):
        SolicitacaoCreate(
            endereco="<script>alert(1)</script> Rua A, 10",
            ponto_referencia="Portão azul",
            materiais=["Papelão"],
            porte_volume=PorteVolume.PEQUENO_MEDIO,
        )


def test_impede_conflito_de_dois_catadores_no_mesmo_chamado():
    # Pedido 1 começa AGUARDANDO -> Primeiro aceite deve funcionar
    pedido = aceitar_solicitacao(1, AceitarColetaRequest(is_caminhao=False))
    assert pedido.status == StatusSolicitacao.A_CAMINHO
    assert pedido.catador_nome == "Carlos Alberto"

    # Segundo catador tentando aceitar o mesmo Pedido 1 deve receber erro de conflito
    with pytest.raises(ChamadoIndisponivelError):
        aceitar_solicitacao(1, AceitarColetaRequest(catador_id=99, catador_nome="Outro Catador"))


def test_conclusao_de_coleta_registra_horario():
    concluido = concluir_solicitacao(4, horario_conclusao="10:45")
    assert concluido.status == StatusSolicitacao.CONCLUIDO
    assert concluido.concluido_em == "10:45"


# ============================================================================
# 3. TESTES DE INTEGRAÇÃO DA API FASTAPI (ENDPOINTS HTTP)
# ============================================================================
def test_endpoint_login_sucesso_e_falha():
    resp_ok = client.post(
        "/api/auth/login",
        json={"telefone": "(11) 91234-5678", "senha": "Recicla2026"},
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["perfil"] == "CATADOR"

    resp_erro = client.post(
        "/api/auth/login",
        json={"telefone": "(11) 91234-5678", "senha": "SenhaIncorreta"},
    )
    assert resp_erro.status_code == 401


def test_endpoint_criar_solicitacao_grande_volume_atribui_caminhao():
    resp = client.post(
        "/api/solicitacoes",
        json={
            "solicitante_id": 1,
            "endereco": "Av. das Nações, 500",
            "ponto_referencia": "Galpão comercial",
            "materiais": ["Papelão", "Metal"],
            "porte_volume": "Grande Volume",
        },
    )
    assert resp.status_code == 201
    corpo = resp.json()
    assert corpo["modalidade_coleta"] == "Caminhão da Cooperativa"
    assert corpo["status"] == "AGUARDANDO"
    assert corpo["tipos_material"] == "Papelão e Metal"


def test_endpoint_aceitar_coleta_retorna_409_quando_indisponivel():
    # Pedido 4 já está A_CAMINHO nos dados iniciais
    resp = client.post("/api/solicitacoes/4/aceitar", json={"is_caminhao": False})
    assert resp.status_code == 409
    assert "já foi aceito por outro catador" in resp.json()["detail"]


def test_servir_arquivos_estaticos_frontend():
    assert client.get("/").status_code == 200
    assert client.get("/styles.css").status_code == 200
    assert client.get("/app.js").status_code == 200
