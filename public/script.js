const campoBusca = document.getElementById("campoBusca");
const botaoEnviar = document.getElementById("botaoEnviar");
const botaoVoz = document.getElementById("botaoVoz");
const resultado = document.getElementById("resultado");

// Produtos carregados do Neon
let produtos = [];

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

            console.log(
                "Produtos carregados:",
                produtos.length
            );

        } else {

            console.error(
                "Erro ao carregar produtos."
            );
        }

    } catch (erro) {

        console.error(
            "Erro de conexão:",
            erro
        );
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

    const fala =
        new SpeechSynthesisUtterance(texto);

    fala.lang = "pt-BR";
    fala.rate = 1;
    fala.pitch = 1;

    window.speechSynthesis.speak(fala);
}

// ========================================
// PESQUISA
// ========================================
function pesquisar() {

    const texto = campoBusca.value.trim();

    if (!texto) {
        return;
    }

    const busca = normalizar(texto);

    // ====================================
    // PRIMEIRO: PROCURA PELO CÓDIGO EXATO
    // ====================================

    let encontrados = produtos.filter(produto => {

        const codigo =
            normalizar(produto.codigo);

        return codigo === busca;
    });

    // ====================================
    // SEGUNDO: BUSCA FLEXÍVEL
    // ====================================

    if (encontrados.length === 0) {

        const palavras =
            busca
                .split(/\s+/)
                .filter(palavra => palavra.length > 0);

        encontrados = produtos.filter(produto => {

            const descricao =
                normalizar(produto.descricao);

            // Todas as palavras precisam
            // aparecer na descrição.
            return palavras.every(palavra =>
                descricao.includes(palavra)
            );
        });
    }

    // ====================================
    // NENHUM RESULTADO
    // ====================================

    if (encontrados.length === 0) {

        resultado.innerHTML = `
            <div class="mensagem bot">
                Não encontrei nenhum produto para:
                <strong>${escaparHTML(texto)}</strong>
            </div>
        `;

        falar(
            `Não encontrei nenhum produto para ${texto}.`
        );

        campoBusca.value = "";

        return;
    }

    // ====================================
    // MOSTRA OS RESULTADOS
    // ====================================

    resultado.innerHTML =
        encontrados.map(produto => `

        <div class="mensagem bot produto">

            <strong>
                ${escaparHTML(produto.descricao)}
            </strong>

            <br><br>

            <strong>Código:</strong>
            ${escaparHTML(produto.codigo)}

            <br>

            <strong>Caixa:</strong>
            ${escaparHTML(produto.caixa)}

            <br>

            <strong>Lastro:</strong>
            ${escaparHTML(produto.lastro)}

            <br>

            <strong>Palete:</strong>
            ${escaparHTML(produto.palete)}

        </div>

    `).join("");

    // ====================================
    // RESPOSTA POR VOZ
    // ====================================

    if (encontrados.length === 1) {

        const produto = encontrados[0];

        const mensagem =
            `${produto.descricao}. ` +
            `Código ${produto.codigo}. ` +
            `Caixa ${produto.caixa}. ` +
            `Lastro ${produto.lastro}. ` +
            `Palete ${produto.palete}.`;

        falar(mensagem);

    } else {

        falar(
            `Encontrei ${encontrados.length} produtos para ${texto}.`
        );
    }

    campoBusca.value = "";
}

// ========================================
// BOTÃO ENVIAR
// ========================================
botaoEnviar.addEventListener(
    "click",
    pesquisar
);

// ========================================
// TECLA ENTER
// ========================================
campoBusca.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            pesquisar();
        }
    }
);

// ========================================
// RECONHECIMENTO DE VOZ
// ========================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

let reconhecimento = null;

if (SpeechRecognition) {

    reconhecimento =
        new SpeechRecognition();

    reconhecimento.lang = "pt-BR";

    reconhecimento.continuous = false;

    reconhecimento.interimResults = false;

    reconhecimento.onstart = function() {

        botaoVoz.textContent = "🔴";

        botaoVoz.title =
            "Ouvindo...";
    };

    reconhecimento.onresult = function(event) {

        const textoFalado =
            event.results[0][0].transcript;

        console.log(
            "Voz reconhecida:",
            textoFalado
        );

        campoBusca.value =
            textoFalado;

        pesquisar();
    };

    reconhecimento.onerror = function(event) {

        console.error(
            "Erro no reconhecimento de voz:",
            event.error
        );

        botaoVoz.textContent = "🎤";

        botaoVoz.title =
            "Pesquisa por voz";
    };

    reconhecimento.onend = function() {

        botaoVoz.textContent = "🎤";

        botaoVoz.title =
            "Pesquisa por voz";
    };

    botaoVoz.addEventListener(
        "click",
        function() {

            try {

                reconhecimento.start();

            } catch (erro) {

                console.log(
                    "Reconhecimento já iniciado."
                );
            }
        }
    );

} else {

    console.warn(
        "Reconhecimento de voz não suportado neste navegador."
    );

    botaoVoz.disabled = true;
}

// ========================================
// INICIA O SISTEMA
// ========================================
carregarProdutos();
