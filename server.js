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
// TESTE DA CONEXÃO COM O BANCO
// ========================================

app.get("/api/teste", async (req, res) => {

    try {

        const resultado =
            await pool.query("SELECT NOW()");

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
// CADASTRA UM NOVO PRODUTO
// ========================================

app.post("/api/produtos", async (req, res) => {

    try {

        const {
            codigo,
            descricao,
            caixa,
            lastro,
            palete
        } = req.body;

        // --------------------------------
        // VERIFICA DESCRIÇÃO
        // --------------------------------

        if (!descricao || !String(descricao).trim()) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "A descrição do produto é obrigatória."
            });
        }

        // --------------------------------
        // VERIFICA CÓDIGO
        // --------------------------------

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

        // --------------------------------
        // CONVERTE OS CAMPOS NUMÉRICOS
        // --------------------------------

        const codigoNumero =
            Number(codigo);

        const caixaNumero =
            caixa === "" ||
            caixa === null ||
            caixa === undefined
                ? null
                : Number(caixa);

        const lastroNumero =
            lastro === "" ||
            lastro === null ||
            lastro === undefined
                ? null
                : Number(lastro);

        const paleteNumero =
            palete === "" ||
            palete === null ||
            palete === undefined
                ? null
                : Number(palete);

        // --------------------------------
        // VERIFICA SE OS NÚMEROS SÃO VÁLIDOS
        // --------------------------------

        if (!Number.isInteger(codigoNumero)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O código deve ser um número inteiro."
            });
        }

        if (
            caixaNumero !== null &&
            !Number.isInteger(caixaNumero)
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "A caixa deve ser um número inteiro."
            });
        }

        if (
            lastroNumero !== null &&
            !Number.isInteger(lastroNumero)
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O lastro deve ser um número inteiro."
            });
        }

        if (
            paleteNumero !== null &&
            !Number.isInteger(paleteNumero)
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "O palete deve ser um número inteiro."
            });
        }

        // --------------------------------
        // INSERE NO NEON
        // --------------------------------

        const resultado = await pool.query(
            `
            INSERT INTO produtos
            (codigo, descricao, caixa, lastro, palete)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING codigo, descricao, caixa, lastro, palete
            `,
            [
                codigoNumero,
                String(descricao).trim(),
                caixaNumero,
                lastroNumero,
                paleteNumero
            ]
        );

        // --------------------------------
        // RESPOSTA DE SUCESSO
        // --------------------------------

        res.status(201).json({
            sucesso: true,
            mensagem: "Produto cadastrado com sucesso!",
            produto: resultado.rows[0]
        });

    } catch (erro) {

        console.error(
            "Erro ao cadastrar produto:",
            erro
        );

        // Código duplicado
        if (erro.code === "23505") {

            return res.status(409).json({
                sucesso: false,
                mensagem:
                    "Já existe um produto cadastrado com esse código."
            });
        }

        res.status(500).json({
            sucesso: false,
            mensagem:
                "Erro ao cadastrar produto."
        });
    }
});

// ========================================
// INICIA O SERVIDOR
// ========================================

app.listen(PORT, () => {

    console.log(
        `Servidor rodando na porta ${PORT}`
    );

});
