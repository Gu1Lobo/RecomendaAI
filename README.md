# 🎬 RecomendaAI

Plataforma web de recomendação de filmes que combina o catálogo real da API do **TMDB** com um **chatbot de IA (Google Gemini)**. Cada usuário cria uma conta, escolhe seus gêneros favoritos e recebe recomendações personalizadas, além de poder favoritar filmes e conversar com o assistente para descobrir o que assistir.

Projeto acadêmico desenvolvido na **Universidade Cruzeiro do Sul – Campus Villa Lobos**.

---

## ✨ Funcionalidades

- **Cadastro e login** com senha protegida por hash (bcrypt) e sessão por token JWT
- **Preferências de gêneros** editáveis, salvas no banco de dados
- **Recomendações personalizadas** com base nos gêneros escolhidos
- **Catálogo real** com filmes em alta, mais bem avaliados e catálogo completo (dados do TMDB)
- **Busca por título** e janela com detalhes do filme (sinopse, nota, elenco)
- **Favoritos por usuário**: marque filmes com o coração (♡/♥) e veja a seção "Meus Favoritos"; tudo fica salvo no MySQL
- **Chatbot com IA (Gemini)** que recomenda filmes e mostra cards com pôster, ano, nota e botão de favoritar
- **Chaves de API protegidas**: o navegador nunca vê as chaves do TMDB e do Gemini, todas as chamadas passam pelo back-end (proxy)

---

## 🧱 Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML, CSS e JavaScript puro |
| Back-end | Node.js + Express |
| Banco de dados | MySQL |
| Autenticação | JWT (`jsonwebtoken`) + `bcrypt` |
| APIs externas | [TMDB](https://www.themoviedb.org/) (filmes) e Google Gemini (chatbot) |

---

## 🏗️ Arquitetura

```
 Navegador (index.html + script.js)
        │  HTTP / JSON
        ▼
 Back-end Node.js + Express (server.js)
   ├── /api/auth/*        cadastro e login (bcrypt + JWT)
   ├── /api/preferences   gêneros favoritos        ──┐
   ├── /api/favorites     filmes favoritos           ├──► MySQL
   ├── /api/tmdb/*        proxy → API do TMDB      ──┘
   └── /api/chat          proxy → API do Gemini
```

O front-end só conversa com o back-end. As chaves de API ficam apenas no arquivo `.env` do servidor.

---

## 🗄️ Banco de dados

O script `schema.sql` cria o banco `recomendaai` com 5 tabelas e já popula os gêneros:

| Tabela | Descrição |
|---|---|
| `usuarios` | Cadastro: `id`, `nome`, `email` (único), `senha_hash`, `criado_em` |
| `generos` | Catálogo de gêneros (mesmos IDs do TMDB) |
| `usuario_generos` | Relação N:N entre usuários e seus gêneros preferidos |
| `filmes` | Dados básicos dos filmes favoritados (`id` do TMDB, `titulo`, `poster_path`) |
| `favoritos` | Relação N:N entre usuários e filmes favoritados (com `adicionado_em`) |

As tabelas seguem a 3ª Forma Normal: o título e o pôster ficam só em `filmes`, sem repetição para cada usuário.

---

## 🚀 Como rodar o projeto

### Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [MySQL](https://dev.mysql.com/downloads/) 8 ou superior (e, de preferência, o MySQL Workbench)
- Uma chave da API do **TMDB** (gratuita): <https://www.themoviedb.org/settings/api>
- Uma chave da API do **Gemini** (gratuita): <https://aistudio.google.com/apikey>

### Passo a passo

**1. Baixe o projeto**

```bash
git clone https://github.com/Gu1Lobo/RecomendaAI.git
cd RecomendaAI
```

Ou use *Code → Download ZIP* no GitHub e extraia a pasta.

**2. Crie o banco de dados**

Abra o MySQL Workbench, abra o arquivo `schema.sql` e execute o script inteiro (ícone do raio). Ou, pelo terminal:

```bash
mysql -u root -p < schema.sql
```

**3. Configure o arquivo `.env`**

Copie o modelo e preencha com os seus dados:

```bash
# Windows (Prompt de Comando)
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Variáveis do `.env`:

| Variável | O que é |
|---|---|
| `DB_HOST` | Endereço do MySQL (normalmente `localhost`) |
| `DB_PORT` | Porta do MySQL (normalmente `3306`) |
| `DB_USER` | Usuário do MySQL |
| `DB_PASSWORD` | Senha do MySQL |
| `DB_NAME` | Nome do banco (`recomendaai`) |
| `JWT_SECRET` | Texto longo e aleatório usado para assinar os tokens de login |
| `PORT` | Porta do servidor (padrão `3000`) |
| `FRONTEND_ORIGIN` | Origem permitida pelo CORS (`*` para desenvolvimento) |
| `TMDB_API_KEY` | Sua chave da API do TMDB |
| `GEMINI_API_KEY` | Sua chave da API do Gemini |

Variáveis opcionais do chatbot: `GEMINI_THINKING_LEVEL` (velocidade da resposta) e `GEMINI_FALLBACK_MODELS` (modelos de reserva quando o principal está sobrecarregado). Veja os comentários no `.env.example`.

> ⚠️ O arquivo `.env` contém segredos e **nunca deve ser enviado ao GitHub** (já está no `.gitignore`).

**4. Instale as dependências e ligue o servidor**

```bash
npm install
npm start
```

Quando aparecer `✅ Servidor RecomendaAI rodando em http://localhost:3000`, o back-end está no ar. Deixe esse terminal aberto.

**5. Abra o site**

Abra o `index.html` no navegador (dois cliques ou a extensão *Live Server* do VS Code), crie uma conta e escolha seus gêneros favoritos.

> O front-end acessa o back-end em `http://localhost:3000/api` (constante `API_BASE` no início do `script.js`). Se for hospedar o back-end em outro endereço, altere essa constante.

---

## 📁 Estrutura do projeto

```
RecomendaAI/
├── index.html           Interface (telas de login, gêneros e home)
├── style.css            Estilos
├── script.js            Lógica do front-end (login, filmes, favoritos, chatbot)
├── server.js            API Express (autenticação, favoritos, proxies)
├── db.js                Conexão com o MySQL (pool de conexões)
├── auth-middleware.js   Verificação do token JWT
├── schema.sql           Criação do banco, tabelas e gêneros
├── package.json         Dependências e script de inicialização
├── .env.example         Modelo do arquivo de configuração
└── .gitignore           Arquivos que não vão para o Git (.env, node_modules)
```

---

## 🔌 Rotas da API

| Método | Rota | Descrição | Login |
|---|---|---|---|
| POST | `/api/auth/register` | Cria uma conta | Não |
| POST | `/api/auth/login` | Entra e recebe o token | Não |
| GET | `/api/me` | Dados do usuário logado | Sim |
| GET / PUT | `/api/preferences` | Busca / salva os gêneros favoritos | Sim |
| GET | `/api/favorites` | Lista os filmes favoritados | Sim |
| POST | `/api/favorites` | Favorita um filme | Sim |
| DELETE | `/api/favorites/:movieId` | Remove um filme dos favoritos | Sim |
| GET | `/api/tmdb/*` | Proxy para a API do TMDB | Não |
| POST | `/api/chat` | Proxy para a API do Gemini | Não |

As rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`.

---

## 🔐 Segurança

- Senhas **nunca** são salvas em texto puro: o back-end gera um hash com **bcrypt** e o login compara os hashes.
- A sessão usa **token JWT** com validade de 7 dias.
- As chaves do TMDB e do Gemini ficam só no `.env` do servidor; o navegador chama o proxy do back-end.
- Todas as consultas ao banco usam parâmetros (`?`), o que evita SQL Injection.
- Cada usuário só acessa os próprios favoritos e preferências: o `usuario_id` vem do token, não da requisição.

---

## 🛠️ Problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Access denied for user` | Usuário ou senha do MySQL errados no `.env` | Corrija `DB_USER` / `DB_PASSWORD` e reinicie o `npm start` |
| `Unknown database 'recomendaai'` | O `schema.sql` não foi executado | Execute o `schema.sql` no MySQL |
| `EADDRINUSE` (porta 3000) | Já existe um servidor rodando | Feche o outro terminal com `npm start` ou mude `PORT` no `.env` |
| Filmes não carregam (erro 401 do TMDB) | `TMDB_API_KEY` errada ou o `.env` não foi recarregado | Confira a chave (use a *Chave da API*, não o token de leitura) e reinicie o servidor |
| Chat com erro 429 | Limite do plano gratuito do Gemini | Aguarde cerca de 15 segundos entre as mensagens |
| Chat com erro 503 ou 504 | Modelo do Gemini sobrecarregado | O servidor já tenta de novo e usa um modelo de reserva; se persistir, tente novamente em instantes |
| `npm` bloqueado no PowerShell | Política de execução de scripts do Windows | Use o Prompt de Comando, ou rode `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |
| Erro de chave estrangeira ao salvar gêneros | Sessão antiga de um usuário que não existe mais no banco | Saia da conta (ou rode `localStorage.clear()` no console do navegador) e entre de novo |

---

## 🗺️ Próximos passos

- Hospedar o back-end e o banco de dados na nuvem para o sistema ficar acessível pela internet
- Refinar o chatbot para recomendações ainda melhores

---

## 👥 Autores

- Guilherme Lobo de Souza Duque
- Leonardo Lima Nascimento
- Guilherme Augusto de Souza Fraga

Universidade Cruzeiro do Sul – Campus Villa Lobos

---

## 📄 Créditos

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB. Dados e imagens de filmes fornecidos por [The Movie Database (TMDB)](https://www.themoviedb.org/).
