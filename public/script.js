const campoBusca = document.getElementById("campoBusca");
const botaoEnviar = document.getElementById("botaoEnviar");
const resultado = document.getElementById("resultado");

// Guarda os produtos carregados do Neon
let produtos = [];

// Carrega os produtos do banco
async function carregarProdutos() {
    try {
        const resposta = await fetch("/api/produtos");
        const dados = await resposta.json();

        if (dados.sucesso) {
            produtos = dados.produtos;
            console.log("Produtos carregados:", produtos.length);
        } else {
            console.error("Erro ao carregar produtos.");
        }

    } catch (erro) {
        console.error("Erro de conexão:", erro);
    }
}

// Faz a pesquisa
function pesquisar() {

    const texto = campoBusca.value.trim();

    if (!texto) {
        return;
    }

    const busca = texto.toLowerCase();

    // Procura pelo código ou pela descrição
    const encontrados = produtos.filter(produto => {

        const codigo = String(produto.codigo);

        const descricao = produto.descricao.toLowerCase();

        return codigo === texto || descricao.includes(busca);
    });

    // Nenhum produto encontrado
    if (encontrados.length === 0) {

        resultado.innerHTML = `
            <div class="mensagem bot">
                Não encontrei nenhum produto para:
                <strong>${texto}</strong>
            </div>
        `;

        campoBusca.value = "";
        return;
    }

    // Mostra os produtos encontrados
    resultado.innerHTML = encontrados.map(produto => `
        <div class="mensagem bot produto">

            <strong>${produto.descricao}</strong>

            <br><br>

            <strong>Código:</strong> ${produto.codigo}<br>
            <strong>Caixa:</strong> ${produto.caixa}<br>
            <strong>Lastro:</strong> ${produto.lastro}<br>
            <strong>Palete:</strong> ${produto.palete}

        </div>
    `).join("");

    campoBusca.value = "";
}

// Botão Enviar
botaoEnviar.addEventListener("click", pesquisar);

// Tecla Enter
campoBusca.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        pesquisar();
    }

});

// Carrega os produtos quando a página abre
carregarProdutos();