# 🎬 RecomendaAI — Instruções para executar

Plataforma de recomendação de filmes com catálogo real (API do TMDB), chatbot de IA (Google Gemini), cadastro/login de usuários e favoritos salvos em banco de dados MySQL.

Este guia explica como instalar e rodar o projeto, e como testar todas as funcionalidades.

---

## 1. O que é preciso ter instalado

| Item | Versão | Para quê |
|---|---|---|
| [Node.js](https://nodejs.org/) | 18 ou superior | Executar o servidor (back-end) |
| [MySQL](https://dev.mysql.com/downloads/) | 8 ou superior | Banco de dados |
| MySQL Workbench | qualquer | Executar o script do banco (opcional, mas facilita) |
| Navegador | Chrome, Edge ou Firefox atualizados | Abrir o site |
| Internet | — | Baixar as dependências e consultar as APIs do TMDB e do Gemini |

## 2. Chaves de API (obrigatórias)

Por segurança, **as chaves de API não estão neste repositório**. São duas, e ambas são gratuitas:

- **TMDB:** crie uma conta em <https://www.themoviedb.org>, vá em *Configurações → API* e copie a **Chave da API** (o código curto, e não o "Token de Acesso de Leitura").
- **Gemini:** acesse <https://aistudio.google.com/apikey> e crie uma chave.

Se preferir, peça as chaves aos autores.

---

## 3. Passo a passo

### Passo 1 — Baixar o projeto

Use **Code → Download ZIP** na página do repositório e extraia a pasta (ou rode `git clone https://github.com/Gu1Lobo/RecomendaAI.git`).

### Passo 2 — Criar o banco de dados

1. Abra o **MySQL Workbench** e conecte no seu servidor local.
2. Vá em *File → Open SQL Script* e escolha o arquivo **`schema.sql`** da pasta do projeto.
3. Clique no **raio** (Execute) para rodar o script inteiro.

Isso cria o banco `recomendaai`, as 5 tabelas e os 18 gêneros de filme.

### Passo 3 — Criar o arquivo `.env`

Abra um terminal **dentro da pasta do projeto** (no VS Code: *Terminal → New Terminal*; no Windows, prefira o **Prompt de Comando** ao PowerShell) e rode:

```
copy .env.example .env
```

*(Mac/Linux: `cp .env.example .env`)*

Abra o arquivo `.env` criado e preencha:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root                      ← usuário do seu MySQL
DB_PASSWORD=sua_senha_do_mysql    ← senha do seu MySQL
DB_NAME=recomendaai
JWT_SECRET=qualquer_texto_longo_e_aleatorio
PORT=3000
FRONTEND_ORIGIN=*
TMDB_API_KEY=sua_chave_do_tmdb
GEMINI_API_KEY=sua_chave_do_gemini
```

> Sem aspas e sem espaços antes ou depois do `=`.

### Passo 4 — Instalar e ligar o servidor

No mesmo terminal:

```
npm install
npm start
```

Quando aparecer a mensagem abaixo, o servidor está no ar. **Deixe esse terminal aberto.**

```
✅ Servidor RecomendaAI rodando em http://localhost:3000
```

### Passo 5 — Abrir o site

Abra o arquivo **`index.html`** no navegador (dois cliques, ou botão direito → *Open with Live Server* no VS Code).

---

## 4. Roteiro de teste

1. **Cadastro:** na aba *Cadastrar*, crie uma conta (nome, e-mail e senha).
2. **Preferências:** escolha seus gêneros favoritos e clique em *Salvar Preferências*.
3. **Recomendações:** na tela inicial, veja a seção *Recomendado para Você*, baseada nos gêneros escolhidos.
4. **Busca:** pesquise um filme pelo título (ex.: `Matrix`) e clique em um card para ver os detalhes.
5. **Favoritos:** clique no coração (♡) de um filme. Ele aparece em *Meus Favoritos*.
6. **Chatbot:** clique no botão 🎬 no canto da tela e peça, por exemplo, *"Me recomenda filmes de terror"*. O bot responde e mostra cards dos filmes, que também podem ser favoritados.
7. **Persistência:** clique em *Sair*, entre de novo com o mesmo e-mail e senha, e confira que gêneros e favoritos continuam lá.
8. **Banco de dados:** no MySQL Workbench, rode:

```sql
USE recomendaai;
SELECT id, nome, email, senha_hash FROM usuarios;   -- a senha aparece como hash (bcrypt)
SELECT * FROM usuario_generos;
SELECT * FROM favoritos;
```

---

## 5. Se algo der errado

| Mensagem ou sintoma | Causa | Solução |
|---|---|---|
| `Access denied for user` | Usuário ou senha do MySQL errados | Corrija `DB_USER` e `DB_PASSWORD` no `.env` e reinicie o `npm start` |
| `Unknown database 'recomendaai'` | O `schema.sql` não foi executado | Refaça o Passo 2 |
| `EADDRINUSE` | A porta 3000 já está em uso | Feche o outro servidor ou mude `PORT` no `.env` |
| Os filmes não carregam (erro 401) | `TMDB_API_KEY` errada | Use a *Chave da API* do TMDB e reinicie o servidor |
| O chat demora ou dá erro 429 | Limite gratuito do Gemini | Aguarde ~15 segundos entre as mensagens |
| O chat dá erro 503 ou 504 | Modelo do Gemini sobrecarregado | O servidor já tenta de novo sozinho; se persistir, tente em instantes |
| `npm` bloqueado no PowerShell | Política de scripts do Windows | Use o Prompt de Comando em vez do PowerShell |
| Tela de login não responde | O servidor não está rodando | Confira se o terminal do `npm start` continua aberto |

Depois de qualquer mudança no `.env`, **reinicie o servidor** (`Ctrl+C` e `npm start` de novo).

---

## 6. Tecnologias

HTML, CSS e JavaScript puro (front-end) · Node.js + Express (back-end) · MySQL (banco de dados) · bcrypt e JWT (segurança) · API do TMDB (filmes) · API do Google Gemini (chatbot).

As senhas são salvas com hash (bcrypt), as chaves de API ficam só no `.env` do servidor e o navegador nunca as vê.

---

## 7. Autores

- Guilherme Lobo de Souza Duque
- Leonardo Lima Nascimento
- Guilherme Augusto de Souza Fraga

Universidade Cruzeiro do Sul – Campus Villa Lobos

---

*Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.*
