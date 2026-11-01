# RecomendaAI — como rodar com banco SQL

Agora o projeto tem duas partes: o **front-end** (os arquivos `.html/.css/.js` que você já tinha) e um **backend** novo (`server/`) que fala com o banco MySQL. O navegador não acessa o SQL diretamente — ele só sabe conversar com o backend por HTTP, e é o backend que consulta o banco.

## 1. Criar o banco de dados

Com o MySQL instalado e rodando, execute o script pronto:

```bash
mysql -u root -p < server/schema.sql
```

Isso cria o banco `recomendaai`, as 3 tabelas (`usuarios`, `generos`, `usuario_generos`) e já popula a tabela de gêneros com os mesmos IDs do TMDB que o front-end usa.

## 2. Configurar e instalar o backend

```bash
cd server
cp .env.example .env
# edite o .env com o usuário/senha do seu MySQL e um JWT_SECRET aleatório
npm install
npm start
```

Se tudo der certo, aparece: `✅ Servidor RecomendaAI rodando em http://localhost:3000`

## 3. Rodar o front-end

Abra o `index.html` normalmente (dois cliques, ou uma extensão tipo Live Server). Ele já está configurado em `script.js` (`const API_BASE = 'http://localhost:3000/api'`) para conversar com o backend rodando localmente.

> Se for hospedar o front-end em outro domínio depois, lembre de trocar `API_BASE` para a URL pública do seu backend, e o `FRONTEND_ORIGIN` no `.env` do backend para o domínio do front (o CORS bloqueia por padrão qualquer origem diferente do que está configurado).

## O que mudou no front-end

- `script.js`: as funções de cadastro/login/preferências não usam mais `localStorage` para dados sensíveis — elas chamam a API (`/api/auth/register`, `/api/auth/login`, `/api/preferences`). O `localStorage` agora guarda só o **token de sessão (JWT)** e o nome/e-mail em cache, nunca a senha.
- A senha nunca trafega nem fica salva em texto puro: o backend usa `bcrypt` para gerar o hash antes de gravar no banco.

## Observação sobre as outras chaves de API

Reparei que `TMDB_API_KEY` e `GEMINI_API_KEY` estão escritas direto no `script.js` — isso significa que qualquer pessoa que abrir o "Ver código-fonte" da página consegue ver e usar suas chaves. Isso é normal em protótipos/projetos de estudo, mas se este site for para produção de verdade, o ideal é o backend que criamos também fazer de proxy para essas chamadas (o front pede pro seu backend, e é o backend que guarda a chave e chama o TMDB/Gemini). Posso te ajudar a montar isso também, se quiser.
