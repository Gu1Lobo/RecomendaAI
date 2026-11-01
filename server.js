const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = require('./db');
const { requireAuth } = require('./auth-middleware');

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = '7d';

function gerarToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

// ================= CADASTRO =================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Preencha todos os campos.' });
        }
        if (password.length < 4) {
            return res.status(400).json({ error: 'A senha deve ter pelo menos 4 caracteres.' });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const [existentes] = await pool.execute(
            'SELECT id FROM usuarios WHERE email = ?',
            [emailNormalizado]
        );
        if (existentes.length > 0) {
            return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
        }

        const senhaHash = await bcrypt.hash(password, SALT_ROUNDS);

        const [result] = await pool.execute(
            'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
            [name.trim(), emailNormalizado, senhaHash]
        );

        const token = gerarToken(result.insertId);
        res.status(201).json({
            token,
            user: { id: result.insertId, name: name.trim(), email: emailNormalizado }
        });
    } catch (err) {
        console.error('Erro no /register:', err);
        res.status(500).json({ error: 'Erro interno ao cadastrar.' });
    }
});

// ================= LOGIN =================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Preencha e-mail e senha.' });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const [rows] = await pool.execute(
            'SELECT id, nome, senha_hash FROM usuarios WHERE email = ?',
            [emailNormalizado]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: 'E-mail não cadastrado. Crie uma conta.' });
        }

        const usuario = rows[0];
        const senhaCorreta = await bcrypt.compare(password, usuario.senha_hash);
        if (!senhaCorreta) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        const token = gerarToken(usuario.id);
        res.json({
            token,
            user: { id: usuario.id, name: usuario.nome, email: emailNormalizado }
        });
    } catch (err) {
        console.error('Erro no /login:', err);
        res.status(500).json({ error: 'Erro interno ao fazer login.' });
    }
});

// ================= DADOS DO USUÁRIO LOGADO =================
app.get('/api/me', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, nome, email FROM usuarios WHERE id = ?',
            [req.userId]
        );
        if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

        res.json({ id: rows[0].id, name: rows[0].nome, email: rows[0].email });
    } catch (err) {
        console.error('Erro no /me:', err);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// ================= BUSCAR PREFERÊNCIAS =================
app.get('/api/preferences', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT genero_id FROM usuario_generos WHERE usuario_id = ?',
            [req.userId]
        );
        res.json({ genreIds: rows.map(r => r.genero_id) });
    } catch (err) {
        console.error('Erro ao buscar preferências:', err);
        res.status(500).json({ error: 'Erro interno.' });
    }
});

// ================= SALVAR PREFERÊNCIAS =================
app.put('/api/preferences', requireAuth, async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const { genreIds } = req.body;
        if (!Array.isArray(genreIds) || genreIds.length === 0) {
            return res.status(400).json({ error: 'Selecione pelo menos um gênero.' });
        }

        await conn.beginTransaction();

        // Substitui as preferências antigas pelas novas
        await conn.execute('DELETE FROM usuario_generos WHERE usuario_id = ?', [req.userId]);

        for (const generoId of genreIds) {
            await conn.execute(
                'INSERT INTO usuario_generos (usuario_id, genero_id) VALUES (?, ?)',
                [req.userId, generoId]
            );
        }

        await conn.commit();
        res.json({ genreIds });
    } catch (err) {
        await conn.rollback();
        console.error('Erro ao salvar preferências:', err);
        res.status(500).json({ error: 'Erro interno ao salvar preferências.' });
    } finally {
        conn.release();
    }
});

// ================= FAVORITOS =================

// Lista os filmes favoritados pelo usuário logado (mais recentes primeiro)
app.get('/api/favorites', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT f.id, f.titulo, f.poster_path
               FROM favoritos fav
               JOIN filmes f ON f.id = fav.filme_id
              WHERE fav.usuario_id = ?
              ORDER BY fav.adicionado_em DESC, f.id DESC`,
            [req.userId]
        );
        res.json({
            favorites: rows.map(r => ({ id: r.id, title: r.titulo, poster_path: r.poster_path }))
        });
    } catch (err) {
        console.error('Erro ao listar favoritos:', err);
        res.status(500).json({ error: 'Erro interno ao buscar favoritos.' });
    }
});

// Favorita um filme: grava os dados do filme (se ainda não existir) e liga ao usuário
app.post('/api/favorites', requireAuth, async (req, res) => {
    const movieId = Number(req.body.movieId);
    const title = typeof req.body.title === 'string' ? req.body.title.trim().slice(0, 255) : '';
    const posterPath = typeof req.body.posterPath === 'string' && req.body.posterPath
        ? req.body.posterPath.slice(0, 255)
        : null;

    if (!Number.isInteger(movieId) || movieId <= 0 || !title) {
        return res.status(400).json({ error: 'Dados do filme inválidos.' });
    }

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // 1) garante que o filme existe na tabela "filmes" (atualiza título/pôster se já existir)
        await conn.execute(
            `INSERT INTO filmes (id, titulo, poster_path) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), poster_path = VALUES(poster_path)`,
            [movieId, title, posterPath]
        );

        // 2) liga o filme ao usuário (IGNORE evita erro se já estava favoritado)
        await conn.execute(
            'INSERT IGNORE INTO favoritos (usuario_id, filme_id) VALUES (?, ?)',
            [req.userId, movieId]
        );

        await conn.commit();
        res.status(201).json({ movieId });
    } catch (err) {
        await conn.rollback();
        console.error('Erro ao favoritar:', err);
        res.status(500).json({ error: 'Erro interno ao favoritar o filme.' });
    } finally {
        conn.release();
    }
});

// Desfavorita um filme (só remove a ligação do usuário; o filme continua em "filmes")
app.delete('/api/favorites/:movieId', requireAuth, async (req, res) => {
    try {
        const movieId = Number(req.params.movieId);
        if (!Number.isInteger(movieId) || movieId <= 0) {
            return res.status(400).json({ error: 'Filme inválido.' });
        }
        await pool.execute(
            'DELETE FROM favoritos WHERE usuario_id = ? AND filme_id = ?',
            [req.userId, movieId]
        );
        res.json({ movieId });
    } catch (err) {
        console.error('Erro ao desfavoritar:', err);
        res.status(500).json({ error: 'Erro interno ao remover dos favoritos.' });
    }
});

// ================= PROXY TMDB (esconde a TMDB_API_KEY do front-end) =================
app.get('/api/tmdb/*', async (req, res) => {
    try {
        const tmdbPath = '/' + req.params[0];
        const url = new URL(`https://api.themoviedb.org/3${tmdbPath}`);
        url.searchParams.set('api_key', process.env.TMDB_API_KEY);
        Object.entries(req.query).forEach(([key, value]) => url.searchParams.set(key, value));

        const tmdbRes = await fetch(url.toString());
        const data = await tmdbRes.json();
        res.status(tmdbRes.status).json(data);
    } catch (err) {
        console.error('Erro no proxy TMDB:', err);
        res.status(500).json({ error: 'Erro ao consultar o TMDB.' });
    }
});

// ================= PROXY GEMINI (esconde a GEMINI_API_KEY do front-end) =================
app.post('/api/chat', async (req, res) => {
    try {
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(req.body)
            }
        );
        const data = await geminiRes.json();
        res.status(geminiRes.status).json(data);
    } catch (err) {
        console.error('Erro no proxy Gemini:', err);
        res.status(500).json({ error: 'Erro ao falar com a IA.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor RecomendaAI rodando em http://localhost:${PORT}`);
});