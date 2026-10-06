const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Conexão com o Neon
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Permite receber JSON
app.use(express.json());

// Arquivos da interface
app.use(express.static("public"));

// Teste da conexão com o banco
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

// Consulta todos os produtos
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

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});