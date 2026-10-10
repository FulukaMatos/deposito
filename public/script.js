
const campoBusca = document.getElementById("campoBusca");
const botaoEnviar = document.getElementById("botaoEnviar");
const botaoVoz = document.getElementById("botaoVoz");
const resultado = document.getElementById("resultado");

// Elementos do cadastro
const botaoCadastrar = document.getElementById("botaoCadastrar");
const areaSenhaCadastro = document.getElementById("areaSenhaCadastro");
const formularioSenha = document.getElementById("formularioSenha");
const campoSenhaCadastro = document.getElementById("campoSenhaCadastro");
const botaoCancelarSenha = document.getElementById("botaoCancelarSenha");
const mensagemSenha = document.getElementById("mensagemSenha");

const areaFormularioCadastro = document.getElementById("areaFormularioCadastro");
const formularioCadastro = document.getElementById("formularioCadastro");
const botaoCancelarCadastro = document.getElementById("botaoCancelarCadastro");
const botaoSalvarProduto = document.getElementById("botaoSalvarProduto");
const mensagemCadastro = document.getElementById("mensagemCadastro");

// Produtos carregados do Neon
let produtos = [];

// Senha mantida somente enquanto o cadastro estiver autorizado
let senhaAutorizada = null;

// ========================================
// NORMALIZA TEXTO
// ========================================

function normalizar(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// ========================================
// PROTEÇÃO DO HTML
// ========================================

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ========================================
// CARREGA PRODUTOS DO SERVIDOR
// ========================================

async function carregarProdutos() {
    try {
        const resposta = await fetch("/api/produtos");

        if (!resposta.ok) {
            throw new Error(`Erro HTTP ${resposta.status}`);
        }

        const dados = await resposta.json();

        if (dados.sucesso) {
            produtos = dados.produtos || [];

            console.log("Produtos carregados:", produtos.length);
        } else {
            console.error("Erro ao carregar produtos.");
        }
    } catch (erro) {
        console.error("Erro de conexão:", erro);
    }
}

// ========================================
// RESPOSTA POR VOZ
// ========================================

function falar(texto) {
    if (!("speechSynthesis" in window)) {
        return;
    }

    window.speechSynthesis.cancel();

    const fala = new SpeechSynthesisUtterance(texto);

    fala.lang = "pt-BR";
    fala.rate = 1;
    fala.pitch = 1;

    window.speechSynthesis.speak(fala);
}

// ========================================
// FORMATAÇÃO DOS DADOS DE ESTOQUE
// ========================================

function formatarQuantidade(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "Não informado";
    }

    return escaparHTML(valor);
}

function textoQuantidade(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return "não informado";
    }

    return String(valor);
}

// ========================================
// PESQUISA DE PRODUTOS
// ========================================

function pesquisar() {
    const texto = campoBusca.value.trim();

    if (!texto) {
        return;
    }

    const busca = normalizar(texto);

    // Primeiro: código exato
    let encontrados = produtos.filter(produto => {
        return normalizar(produto.codigo) === busca;
    });

    // Segundo: busca flexível por palavras
    if (encontrados.length === 0) {
        const palavras = busca
            .split(/\s+/)
            .filter(palavra => palavra.length > 0);

        encontrados = produtos.filter(produto => {
            const descricao = normalizar(produto.descricao);

            return palavras.every(palavra =>
                descricao.includes(palavra)
            );
        });
    }

    // Nenhum resultado
    if (encontrados.length === 0) {
        resultado.innerHTML = `
            <div class="mensagem bot">
                Não encontrei nenhum produto para:
                <strong>${escaparHTML(texto)}</strong>
            </div>
        `;

        falar(`Não encontrei nenhum produto para ${texto}.`);

        campoBusca.value = "";
        return;
    }

    // Mostra os resultados
    resultado.innerHTML = encontrados.map(produto => `
        <div class="mensagem bot produto">
            <strong>${escaparHTML(produto.descricao)}</strong>

            <br><br>

            <strong>Código:</strong>
            ${formatarQuantidade(produto.codigo)}

            <br>

            <strong>Caixa (unidades):</strong>
            ${formatarQuantidade(produto.caixa)}

            <br>

            <strong>Lastro (caixas):</strong>
            ${formatarQuantidade(produto.lastro)}

            <br>

            <strong>Palete (caixas):</strong>
            ${formatarQuantidade(produto.palete)}
        </div>
    `).join("");

    // Resposta por voz
    if (encontrados.length === 1) {
        const produto = encontrados[0];

        const mensagem =
            `${produto.descricao}. ` +
            `Código ${produto.codigo}. ` +
            `Caixa: ${textoQuantidade(produto.caixa)} unidades. ` +
            `Lastro: ${textoQuantidade(produto.lastro)} caixas. ` +
            `Palete: ${textoQuantidade(produto.palete)} caixas.`;

        falar(mensagem);
    } else {
        falar(`Encontrei ${encontrados.length} produtos para ${texto}.`);
    }

    campoBusca.value = "";
}

// ========================================
// BOTÃO ENVIAR E TECLA ENTER
// ========================================

botaoEnviar.addEventListener("click", pesquisar);

campoBusca.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        pesquisar();
    }
});

// ========================================
// RECONHECIMENTO DE VOZ
// ========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let reconhecimento = null;

if (SpeechRecognition) {
    reconhecimento = new SpeechRecognition();

    reconhecimento.lang = "pt-BR";
    reconhecimento.continuous = false;
    reconhecimento.interimResults = false;

    reconhecimento.onstart = function() {
        botaoVoz.textContent = "🔴";
        botaoVoz.title = "Ouvindo...";
    };

    reconhecimento.onresult = function(event) {
        const textoFalado = event.results[0][0].transcript;

        console.log("Voz reconhecida:", textoFalado);

        campoBusca.value = textoFalado;
        pesquisar();
    };

    reconhecimento.onerror = function(event) {
        console.error("Erro no reconhecimento de voz:", event.error);

        botaoVoz.textContent = "🎤";
        botaoVoz.title = "Pesquisa por voz";
    };

    reconhecimento.onend = function() {
        botaoVoz.textContent = "🎤";
        botaoVoz.title = "Pesquisa por voz";
    };

    botaoVoz.addEventListener("click", function() {
        try {
            reconhecimento.start();
        } catch (erro) {
            console.log("Reconhecimento já iniciado.");
        }
    });
} else {
    console.warn("Reconhecimento de voz não suportado neste navegador.");
    botaoVoz.disabled = true;
}

// ========================================
// ABRE A SOLICITAÇÃO DE SENHA
// ========================================

function abrirAreaSenha() {
    areaFormularioCadastro.hidden = true;
    areaSenhaCadastro.hidden = false;

    mensagemSenha.textContent = "";
    campoSenhaCadastro.value = "";

    campoSenhaCadastro.focus();
}

function limparAutorizacao() {
    senhaAutorizada = null;
    campoSenhaCadastro.value = "";
}

function fecharCadastro() {
    areaSenhaCadastro.hidden = true;
    areaFormularioCadastro.hidden = true;

    formularioCadastro.reset();

    mensagemSenha.textContent = "";
    mensagemCadastro.textContent = "";

    limparAutorizacao();
}

botaoCadastrar.addEventListener("click", abrirAreaSenha);

botaoCancelarSenha.addEventListener("click", fecharCadastro);

botaoCancelarCadastro.addEventListener("click", fecharCadastro);

// ========================================
// VALIDA A SENHA NO SERVIDOR
// ========================================

formularioSenha.addEventListener("submit", async function(event) {
    event.preventDefault();

    const senha = campoSenhaCadastro.value;

    if (!senha) {
        mensagemSenha.textContent = "Digite a senha.";
        return;
    }

    const botaoOriginal = document.getElementById("botaoValidarSenha");

    botaoOriginal.disabled = true;
    mensagemSenha.textContent = "Verificando senha...";

    try {
        const resposta = await fetch("/api/validar-senha", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ senha })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            senhaAutorizada = null;

            mensagemSenha.textContent =
                dados.mensagem || "Não foi possível validar a senha.";

            campoSenhaCadastro.value = "";
            campoSenhaCadastro.focus();

            return;
        }

        senhaAutorizada = senha;

        areaSenhaCadastro.hidden = true;
        areaFormularioCadastro.hidden = false;

        mensagemSenha.textContent = "";
        mensagemCadastro.textContent = "";

        document.getElementById("cadastroDescricao").focus();

    } catch (erro) {
        console.error("Erro ao validar senha:", erro);

        mensagemSenha.textContent =
            "Erro de conexão. Tente novamente.";
    } finally {
        botaoOriginal.disabled = false;
    }
});

// ========================================
// ENVIA NOVO PRODUTO AO NEON
// ========================================

formularioCadastro.addEventListener("submit", async function(event) {
    event.preventDefault();

    if (!senhaAutorizada) {
        mensagemCadastro.textContent =
            "A autorização expirou. Digite a senha novamente.";

        areaFormularioCadastro.hidden = true;
        areaSenhaCadastro.hidden = false;

        return;
    }

    const produto = {
        senhaCadastro: senhaAutorizada,
        descricao: document.getElementById("cadastroDescricao").value.trim(),
        codigo: document.getElementById("cadastroCodigo").value,
        caixa: document.getElementById("cadastroCaixa").value,
        lastro: document.getElementById("cadastroLastro").value,
        palete: document.getElementById("cadastroPalete").value
    };

    botaoSalvarProduto.disabled = true;
    mensagemCadastro.textContent = "Salvando produto...";

    try {
        const resposta = await fetch("/api/produtos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(produto)
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            mensagemCadastro.textContent =
                dados.mensagem || "Não foi possível cadastrar o produto.";

            return;
        }

        // Atualiza a lista local sem recarregar a página
        const produtoSalvo = dados.produto;

        const indiceExistente = produtos.findIndex(item =>
            String(item.codigo) === String(produtoSalvo.codigo)
        );

        if (indiceExistente >= 0) {
            produtos[indiceExistente] = produtoSalvo;
        } else {
            produtos.push(produtoSalvo);
        }

        mensagemCadastro.textContent =
            "Produto cadastrado com sucesso!";

        formularioCadastro.reset();

        // Fecha o formulário e limpa a senha após salvar
        setTimeout(() => {
            fecharCadastro();

            resultado.innerHTML = `
                <div class="mensagem bot">
                    <strong>Produto cadastrado com sucesso!</strong><br>
                    ${escaparHTML(produtoSalvo.descricao)}<br>
                    Código: ${escaparHTML(produtoSalvo.codigo)}
                </div>
            `;
        }, 1200);

    } catch (erro) {
        console.error("Erro ao cadastrar produto:", erro);

        mensagemCadastro.textContent =
            "Erro de conexão ao salvar. Verifique a conexão e tente novamente.";
    } finally {
        botaoSalvarProduto.disabled = false;
    }
});

// ========================================
// INICIA O SISTEMA
// ========================================

carregarProdutos();
