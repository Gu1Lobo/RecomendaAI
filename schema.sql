-- ================================================================
-- RecomendaAI - Schema do banco de dados
-- Compatível com MySQL 8+ (para PostgreSQL: troque AUTO_INCREMENT
-- por SERIAL/GENERATED ALWAYS AS IDENTITY)
-- ================================================================

CREATE DATABASE IF NOT EXISTS recomendaai
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE recomendaai;

-- Cadastro do usuário (nome, e-mail, senha em hash)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Catálogo de gêneros (usa os MESMOS ids do TMDB que já existem no
-- array GENRES do script.js, pra não precisar mapear id-a-id depois)
CREATE TABLE IF NOT EXISTS generos (
    id INT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL UNIQUE
);

-- Relação N:N entre usuários e gêneros preferidos
CREATE TABLE IF NOT EXISTS usuario_generos (
    usuario_id INT NOT NULL,
    genero_id INT NOT NULL,
    PRIMARY KEY (usuario_id, genero_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE
);

-- Seed com os gêneros do TMDB já usados no front-end (GENRES em script.js)
INSERT INTO generos (id, nome) VALUES
    (28, 'Ação'), (12, 'Aventura'), (16, 'Animação'),
    (35, 'Comédia'), (80, 'Crime'), (99, 'Documentário'),
    (18, 'Drama'), (10751, 'Família'), (14, 'Fantasia'),
    (36, 'História'), (27, 'Terror'), (10402, 'Música'),
    (9648, 'Mistério'), (10749, 'Romance'), (878, 'Ficção Científica'),
    (53, 'Thriller'), (10752, 'Guerra'), (37, 'Faroeste')
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

-- ================= FAVORITOS =================
-- Dados básicos do filme (o id é o MESMO id do TMDB).
-- Fica separado de "favoritos" para não repetir título/pôster para cada
-- usuário que favorita o mesmo filme (2ª e 3ª Forma Normal).
CREATE TABLE IF NOT EXISTS filmes (
    id INT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    poster_path VARCHAR(255) NULL
);

-- Tabela associativa: quais filmes cada usuário favoritou.
CREATE TABLE IF NOT EXISTS favoritos (
    usuario_id INT NOT NULL,
    filme_id INT NOT NULL,
    adicionado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, filme_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (filme_id) REFERENCES filmes(id) ON DELETE CASCADE
);
