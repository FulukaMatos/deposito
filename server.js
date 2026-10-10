
const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// CONEXÃO COM O NEON
// ========================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// ========================================
// CONFIGURAÇÕES
// ========================================

app.use(express.json());
app.use(express.static("public"));

// ========================================
// VERIFICA A SENHA DE CADASTRO
// ========================================

function senhaCadastroValida(senha) {
    const senhaCorreta = process.env.SENHA_CADASTRO;

    return (
        typeof senha === "string" &&
        typeof senhaCorreta === "string" &&
        senhaCorreta.length > 0 &&
        senha === senhaCorreta
    );
}

// ========================================
// TESTE DA CONEXÃO COM O BANCO
// ========================================

app.get("/api/teste", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT NOW()");

        res.json({
            sucesso: true,
            mensagem: "Conectado ao Neon!",
            horario: resultado.rows[0].now
        });
    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao conectar ao banco."
        });
    }
});

// ========================================
// CONSULTA TODOS OS PRODUTOS
// ========================================

app.get("/api/produtos", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT codigo, descricao, caixa, lastro, palete
            FROM produtos
            ORDER BY codigo
        `);

        res.json({
            sucesso: true,
            produtos: resultado.rows
        });
    } catch (erro) {
        console.error(erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao buscar produtos."
        });
    }
});

// ========================================
// VALIDA A SENHA ANTES DE ABRIR O FORMULÁRIO
// ========================================

app.post("/api/validar-senha", (req, res) => {
    if (!process.env.SENHA_CADASTRO) {
        return res.status(503).json({
            sucesso: false,
            mensagem: "A senha de cadastro não está configurada no servidor."
        });
    }

    const { senha } = req.body || {};

    if (!senhaCadastroValida(senha)) {
        return res.status(401).json({
            sucesso: false,
            mensagem: "Senha incorreta."
        });
    }

    res.json({
        sucesso: true,
        mensagem: "Senha validada."
    });
});

// ========================================
// CADASTRA UM NOVO PRODUTO
// A SENHA É OBRIGATÓRIA EM TODA INSERÇÃO
// ========================================

app.post("/api/produtos", async (req, res) => {
    try {
        if (!process.env.SENHA_CADASTRO) {
            return res.status(503).json({
                sucesso: false,
                mensagem: "A senha de cadastro não está configurada no servidor."
            });
        }

        const {
            senhaCadastro,
            codigo,
            descricao,
            caixa,
            lastro,
            palete
        } = req.body || {};

        // Confere a senha no próprio servidor
        if (!senhaCadastroValida(senhaCadastro)) {
            return res.status(401).json({
                sucesso: false,
                mensagem: "Senha inválida. Cadastro não autorizado."
            });
        }

        // Confere a descrição
        if (
            typeof descricao !== "string" ||
            !descricao.trim()
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "A descrição do produto é obrigatória."
            });
        }

        // Confere o código
        if (
            codigo === undefined ||
            codigo === null ||
            String(codigo).trim() === ""
        ) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "O código do produto é obrigatório."
            });
        }

        const codigoNumero = Number(codigo);

        const converterOpcional = (valor) => {
            if (
                valor === "" ||
                valor === null ||
                valor === undefined
            ) {
                return null;
            }

            return Number(valor);
        };

        const caixaNumero = converterOpcional(caixa);
        const lastroNumero = converterOpcional(lastro);
        const paleteNumero = converterOpcional(palete);

        // Confere os campos numéricos
        if (!Number.isSafeInteger(codigoNumero)) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "O código deve ser um número inteiro válido."
            });
        }

        for (const [nome, valor] of [
            ["Caixa", caixaNumero],
            ["Lastro", lastroNumero],
            ["Palete", paleteNumero]
        ]) {
            if (
                valor !== null &&
                (!Number.isSafeInteger(valor) || valor < 0)
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: `${nome} deve ser um número inteiro igual ou maior que zero.`
                });
            }
        }

        // Insere o produto no Neon
        const resultado = await pool.query(
            `INSERT INTO produtos
                (codigo, descricao, caixa, lastro, palete)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING codigo, descricao, caixa, lastro, palete`,
            [
                codigoNumero,
                descricao.trim(),
                caixaNumero,
                lastroNumero,
                paleteNumero
            ]
        );

        res.status(201).json({
            sucesso: true,
            mensagem: "Produto cadastrado com sucesso!",
            produto: resultado.rows[0]
        });

    } catch (erro) {
        // Código duplicado
        if (erro.code === "23505") {
            return res.status(409).json({
                sucesso: false,
                mensagem: "Já existe um produto cadastrado com esse código."
            });
        }

        console.error("Erro ao cadastrar produto:", erro);

        res.status(500).json({
            sucesso: false,
            mensagem: "Erro ao cadastrar produto."
        });
    }
});

// ========================================
// INICIA O SERVIDOR
// ========================================

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
