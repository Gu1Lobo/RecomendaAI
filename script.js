// ================= CONFIGURAÇÃO TMDB =================
// As chamadas ao TMDB passam pelo backend (rota /api/tmdb/*), que é quem
// guarda a chave de verdade no .env do servidor. O front-end não tem
// mais nenhuma chave de API.
const TMDB_IMG = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP = "https://image.tmdb.org/t/p/original";
const PLACEHOLDER_IMG = "https://placehold.co/500x750/2a2a2a/e50914?font=montserrat&text=Sem+P%C3%B4ster";
const LANG = "pt-BR";

const GENRES = [
    { id: 28, name: "Ação" }, { id: 12, name: "Aventura" }, { id: 16, name: "Animação" },
    { id: 35, name: "Comédia" }, { id: 80, name: "Crime" }, { id: 99, name: "Documentário" },
    { id: 18, name: "Drama" }, { id: 10751, name: "Família" }, { id: 14, name: "Fantasia" },
    { id: 36, name: "História" }, { id: 27, name: "Terror" }, { id: 10402, name: "Música" },
    { id: 9648, name: "Mistério" }, { id: 10749, name: "Romance" }, { id: 878, name: "Ficção Científica" },
    { id: 53, name: "Thriller" }, { id: 10752, name: "Guerra" }, { id: 37, name: "Faroeste" }
];

const loginScreen = document.getElementById('login-screen');
const prefsScreen = document.getElementById('preferences-screen');
const homeScreen = document.getElementById('home-screen');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const genresGrid = document.getElementById('genres-grid');
const savePrefsBtn = document.getElementById('save-preferences');
const feedbackMsg = document.getElementById('feedback-msg');
const userNamePrefs = document.getElementById('user-name-prefs');
const userNameNav = document.getElementById('user-name-nav');
const editPrefsBtn = document.getElementById('edit-prefs-btn');
const logoutBtn = document.getElementById('logout-btn');

// Elementos de busca e seções da Home
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const searchResultsSection = document.getElementById('search-results-section');
const searchMoviesContainer = document.getElementById('search-movies-container');
const clearSearchBtn = document.getElementById('clear-search-btn');
const defaultHomeContent = document.getElementById('default-home-content');

// Containers de exibição de filmes
const aiContainer = document.getElementById('ai-movies-container');
const trendingContainer = document.getElementById('trending-movies-container');
const topContainer = document.getElementById('top-movies-container');
const catalogContainer = document.getElementById('catalog-movies-container');
const favoritesContainer = document.getElementById('favorites-movies-container');
const goFavoritesBtn = document.getElementById('go-favorites-btn');
const loadMoreBtn = document.getElementById('load-more-catalog');

const modal = document.getElementById('movie-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalClose = document.getElementById('modal-close');
const modalBody = document.getElementById('modal-body');

let currentCatalogPage = 1;

// ================= API / BACKEND (Node + Express + MySQL) =================
// Troque pela URL onde seu backend estiver rodando (ex: em produção).
const API_BASE = 'http://localhost:3000/api';

const KEY_TOKEN = 'recomendaai_token';
const KEY_USER = 'recomendaai_user'; // cache local: { id, name, email } — NUNCA a senha

// Cache em memória das preferências do usuário logado (evita reconsultar
// o servidor a cada tela; é repopulado a partir do banco no login e no
// carregamento da página).
let currentUserPrefs = [];

// Cache em memória dos filmes favoritados pelo usuário logado
// (id do TMDB -> { id, title, poster_path }). Vem do banco de dados.
let currentUserFavorites = new Map();

// Helper central pra chamar a API já com o token JWT e tratamento de erro.
async function apiFetch(path, options = {}) {
    const token = localStorage.getItem(KEY_TOKEN);
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
    return data;
}

function showScreen(screen) {
    [loginScreen, prefsScreen, homeScreen].forEach(s => s.classList.add('hidden'));
    screen.classList.remove('hidden');
}

// Lê a sessão cacheada localmente (id/nome/e-mail — dados não sensíveis).
// A validade real de quem está logado é sempre conferida pelo backend
// via token JWT nas chamadas à API.
function getCurrentUser() {
    const token = localStorage.getItem(KEY_TOKEN);
    if (!token) return null;
    try { return JSON.parse(localStorage.getItem(KEY_USER)); } catch { return null; }
}

function saveSession(token, user) {
    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_USER, JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
    currentUserPrefs = [];
    currentUserFavorites = new Map();
}

// Preferências: retorna o cache em memória (populado via API).
function getUserPrefs() { return currentUserPrefs; }

async function refreshUserPrefs() {
    const data = await apiFetch('/preferences');
    currentUserPrefs = data.genreIds || [];
    return currentUserPrefs;
}

async function saveUserPrefs(ids) {
    const data = await apiFetch('/preferences', {
        method: 'PUT',
        body: JSON.stringify({ genreIds: ids })
    });
    currentUserPrefs = data.genreIds || ids;
    return currentUserPrefs;
}

// ================= FAVORITOS =================
function isFavorite(movieId) { return currentUserFavorites.has(Number(movieId)); }

async function refreshFavorites() {
    try {
        const data = await apiFetch('/favorites');
        currentUserFavorites = new Map((data.favorites || []).map(f => [f.id, f]));
    } catch (err) {
        // Não derruba o login se a lista de favoritos falhar
        console.error('Erro ao carregar favoritos:', err);
        currentUserFavorites = new Map();
    }
}

// Favorita/desfavorita um filme no banco de dados e atualiza a tela
async function toggleFavorite(movie) {
    const id = Number(movie.id);
    try {
        if (isFavorite(id)) {
            await apiFetch(`/favorites/${id}`, { method: 'DELETE' });
            currentUserFavorites.delete(id);
        } else {
            await apiFetch('/favorites', {
                method: 'POST',
                body: JSON.stringify({
                    movieId: id,
                    title: movie.title,
                    posterPath: movie.poster_path || null
                })
            });
            // novos favoritos aparecem primeiro: recria o Map com o novo na frente
            currentUserFavorites = new Map([
                [id, { id, title: movie.title, poster_path: movie.poster_path || null }],
                ...currentUserFavorites
            ]);
        }
        syncFavoriteButtons();
        renderFavoritesSection();
    } catch (err) {
        console.error(err);
        alert(err.message || 'Não foi possível atualizar seus favoritos. Tente novamente.');
    }
}

// Deixa todos os botões de coração (cards e modal) iguais ao estado atual
function syncFavoriteButtons() {
    document.querySelectorAll('[data-fav-id]').forEach(btn => {
        const fav = isFavorite(btn.dataset.favId);
        const isModalBtn = btn.classList.contains('modal-fav-btn');
        btn.classList.toggle('active', fav);
        btn.setAttribute('aria-pressed', String(fav));
        btn.title = fav ? 'Remover dos favoritos' : 'Favoritar';
        btn.textContent = isModalBtn ? (fav ? '♥ Favoritado' : '♡ Favoritar') : (fav ? '♥' : '♡');
    });
}

function createFavButton(movie) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fav-btn';
    btn.dataset.favId = movie.id;
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // não abre o modal do filme ao clicar no coração
        toggleFavorite(movie);
    });
    return btn;
}

// Seção "Meus Favoritos" da tela inicial
function renderFavoritesSection() {
    if (!favoritesContainer) return;
    favoritesContainer.innerHTML = '';
    if (currentUserFavorites.size === 0) {
        favoritesContainer.innerHTML = '<div class="empty-state">Você ainda não favoritou nenhum filme. Clique no ♡ de um filme para salvá-lo aqui.</div>';
        return;
    }
    currentUserFavorites.forEach(fav => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        const poster = fav.poster_path ? `${TMDB_IMG}${fav.poster_path}` : PLACEHOLDER_IMG;
        card.innerHTML = `
            <img src="${poster}" alt="Pôster de ${escapeHtml(fav.title)}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />
            <div class="movie-info"><h4>${escapeHtml(fav.title)}</h4></div>`;
        card.appendChild(createFavButton(fav));
        card.addEventListener('click', () => openMovieModal(fav.id));
        favoritesContainer.appendChild(card);
    });
    syncFavoriteButtons();
}

function showError(el, msg) { el.textContent = msg; el.classList.remove('hidden'); }
function clearError(el) { el.textContent = ''; el.classList.add('hidden'); }

tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active'); tabRegister.classList.remove('active');
    loginForm.classList.remove('hidden'); registerForm.classList.add('hidden');
    clearError(loginError); clearError(registerError);
});
tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active'); tabLogin.classList.remove('active');
    registerForm.classList.remove('hidden'); loginForm.classList.add('hidden');
    clearError(loginError); clearError(registerError);
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); clearError(registerError);
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value;
    if (!name || !email || !password) return showError(registerError, 'Preencha todos os campos.');
    if (password.length < 4) return showError(registerError, 'A senha deve ter pelo menos 4 caracteres.');

    try {
        const data = await apiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });
        saveSession(data.token, data.user);
        currentUserPrefs = []; // conta nova, sem preferências ainda
        currentUserFavorites = new Map();
        routeAfterAuth();
    } catch (err) {
        showError(registerError, err.message || 'Erro ao cadastrar. Tente novamente.');
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); clearError(loginError);
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
        const data = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        saveSession(data.token, data.user);
        await refreshUserPrefs();
        await refreshFavorites();
        routeAfterAuth();
    } catch (err) {
        showError(loginError, err.message || 'Erro ao entrar. Tente novamente.');
    }
});

logoutBtn.addEventListener('click', () => {
    clearSession();
    loginForm.reset(); registerForm.reset();
    showScreen(loginScreen);
});

editPrefsBtn.addEventListener('click', () => { renderGenresGrid(); showScreen(prefsScreen); });

function renderGenresGrid() {
    const user = getCurrentUser(); if (!user) return;
    userNamePrefs.textContent = user.name;
    const currentPrefs = getUserPrefs();
    genresGrid.innerHTML = '';
    GENRES.forEach(g => {
        const checked = currentPrefs.includes(g.id) ? 'checked' : '';
        const label = document.createElement('label');
        label.className = 'genre-card';
        label.innerHTML = `<input type="checkbox" value="${g.id}" ${checked}><span class="checkmark">${g.name}</span>`;
        genresGrid.appendChild(label);
    });
}

savePrefsBtn.addEventListener('click', async () => {
    const user = getCurrentUser(); if (!user) return;
    const checked = genresGrid.querySelectorAll('input[type="checkbox"]:checked');
    const ids = Array.from(checked).map(cb => parseInt(cb.value, 10));
    if (ids.length === 0) return alert('Selecione pelo menos um gênero!');

    savePrefsBtn.disabled = true;
    try {
        await saveUserPrefs(ids);
        feedbackMsg.classList.remove('hidden');
        setTimeout(() => {
            feedbackMsg.classList.add('hidden');
            showScreen(homeScreen);
            loadHomeData();
        }, 1400);
    } catch (err) {
        alert(err.message || 'Erro ao salvar preferências. Tente novamente.');
    } finally {
        savePrefsBtn.disabled = false;
    }
});

function routeAfterAuth() {
    // Chamado logo após login/cadastro, quando currentUserPrefs já foi
    // atualizado (refreshUserPrefs / saveUserPrefs / conta nova = []).
    const user = getCurrentUser();
    if (!user) return showScreen(loginScreen);
    userNameNav.textContent = user.name;
    const prefs = getUserPrefs();
    if (prefs.length === 0) { renderGenresGrid(); showScreen(prefsScreen); }
    else { showScreen(homeScreen); loadHomeData(); }
}

async function checkSession() {
    // Chamado ao carregar a página. Se houver um token salvo, confirma
    // com o backend que ele ainda é válido e busca as preferências.
    const user = getCurrentUser();
    if (!user) return showScreen(loginScreen);

    userNameNav.textContent = user.name;
    try {
        const prefs = await refreshUserPrefs();
        await refreshFavorites();
        if (prefs.length === 0) { renderGenresGrid(); showScreen(prefsScreen); }
        else { showScreen(homeScreen); loadHomeData(); }
    } catch (err) {
        // Token expirado/inválido, ou backend fora do ar: volta pro login.
        console.error('Sessão inválida:', err);
        clearSession();
        showScreen(loginScreen);
    }
}

async function tmdbFetch(path, params = {}) {
    // Chama o backend (/api/tmdb/*), que repassa pro TMDB já com a chave.
    const url = new URL(`${API_BASE}/tmdb${path}`);
    url.searchParams.set('language', LANG);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`TMDB error ${res.status}`);
    return res.json();
}

function getGenreNames(ids) { return ids.map(id => GENRES.find(g => g.id === id)?.name).filter(Boolean); }

async function fetchRecommendedForUser(genreIds) {
    const data = await tmdbFetch('/discover/movie', {
        with_genres: genreIds.join('|'),
        sort_by: 'popularity.desc',
        'vote_count.gte': 200,
        include_adult: 'false',
        page: Math.floor(Math.random() * 3) + 1
    });
    return (data.results || []).slice(0, 12);
}
async function fetchTrending() { const d = await tmdbFetch('/trending/movie/week'); return (d.results || []).slice(0, 12); }
async function fetchTopRated() { const d = await tmdbFetch('/movie/top_rated', { page: 1 }); return (d.results || []).slice(0, 12); }
async function fetchCatalog(page = 1) {
    const data = await tmdbFetch('/discover/movie', {
        sort_by: 'popularity.desc',
        include_adult: 'false',
        page: page
    });
    return data.results || [];
}
async function searchMovies(query, year) {
    const params = { query: query, include_adult: 'false' };
    if (year) params.year = year;
    const data = await tmdbFetch('/search/movie', params);
    return data.results || [];
}

function calcMatch(movie, userGenreIds) {
    if (!userGenreIds || userGenreIds.length === 0) return null;
    const movieGenres = movie.genre_ids || [];
    const overlap = movieGenres.filter(id => userGenreIds.includes(id)).length;
    if (overlap === 0) return null;
    const base = 80 + Math.min(18, overlap * 6);
    const ratingBonus = movie.vote_average ? Math.round(movie.vote_average / 5) : 0;
    return Math.min(99, base + ratingBonus);
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderMovies(movies, container, opts = {}) {
    const { showMatch = false, userGenreIds = [], append = false } = opts;
    
    if (!append) container.innerHTML = ''; 
    
    if (!movies || movies.length === 0) {
        if (!append) container.innerHTML = '<div class="empty-state">Nenhum filme encontrado.</div>'; 
        return;
    }
    
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : PLACEHOLDER_IMG;
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '—';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const genreNames = getGenreNames(movie.genre_ids || []).slice(0, 2).join(' • ') || 'Filme';
        const match = showMatch ? calcMatch(movie, userGenreIds) : null;
        const badge = match ? `<span class="badge">Match: ${match}%</span>` : '';
        
        card.innerHTML = `
            ${badge}
            <img src="${poster}" alt="Pôster de ${movie.title}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" />
            <div class="movie-info">
                <h4>${escapeHtml(movie.title)}</h4>
                <div class="movie-meta">
                    <span class="rating">⭐ ${rating}</span>
                    <span class="year">${year}</span>
                </div>
                <p class="desc">${escapeHtml(movie.overview || 'Sinopse não disponível.')}</p>
                <p style="margin-top:8px;font-size:0.78rem;color:#888;">${genreNames}</p>
            </div>`;
        card.appendChild(createFavButton(movie));
        card.addEventListener('click', () => openMovieModal(movie.id));
        container.appendChild(card);
    });
    syncFavoriteButtons();
}

// Eventos de Busca
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (!query) return;

    searchMoviesContainer.innerHTML = '<div class="loader">Buscando filmes...</div>';
    searchResultsSection.classList.remove('hidden');
    defaultHomeContent.classList.add('hidden');

    try {
        const results = await searchMovies(query);
        const user = getCurrentUser();
        const prefs = user ? getUserPrefs() : [];
        renderMovies(results, searchMoviesContainer, { showMatch: true, userGenreIds: prefs });
    } catch (err) {
        console.error(err);
        searchMoviesContainer.innerHTML = '<div class="empty-state">Erro ao buscar filmes.</div>';
    }
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchResultsSection.classList.add('hidden');
    searchMoviesContainer.innerHTML = '';
    defaultHomeContent.classList.remove('hidden');
});

async function loadCatalog() {
    try {
        if (currentCatalogPage === 1) {
            catalogContainer.innerHTML = '<div class="loader">Carregando catálogo...</div>';
            loadMoreBtn.classList.add('hidden');
        }
        
        const movies = await fetchCatalog(currentCatalogPage);
        
        if (currentCatalogPage === 1) catalogContainer.innerHTML = ''; 
        
        renderMovies(movies, catalogContainer, { append: true });
        loadMoreBtn.classList.remove('hidden');
    } catch (err) {
        console.error("Erro ao carregar catálogo:", err);
        if (currentCatalogPage === 1) {
            catalogContainer.innerHTML = '<div class="empty-state">Erro ao carregar o catálogo.</div>';
        }
    }
}

loadMoreBtn.addEventListener('click', () => {
    currentCatalogPage++;
    loadMoreBtn.textContent = "Carregando...";
    loadMoreBtn.disabled = true;
    
    loadCatalog().then(() => {
        loadMoreBtn.textContent = "Carregar Mais Filmes";
        loadMoreBtn.disabled = false;
    });
});

async function openMovieModal(movieId) {
    modal.classList.remove('hidden');
    modalBody.innerHTML = '<div class="loader" style="padding:60px;">Carregando detalhes...</div>';
    try {
        const movie = await tmdbFetch(`/movie/${movieId}`, { append_to_response: 'credits' });
        const backdrop = movie.backdrop_path ? `${TMDB_BACKDROP}${movie.backdrop_path}`
            : (movie.poster_path ? `${TMDB_BACKDROP}${movie.poster_path}` : PLACEHOLDER_IMG);
        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '—';
        const runtime = movie.runtime ? `${movie.runtime} min` : '';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
        const director = movie.credits?.crew?.find(c => c.job === 'Director')?.name || '';
        const cast = (movie.credits?.cast || []).slice(0, 5).map(c => c.name).join(', ');
        const genres = (movie.genres || []).map(g => `<span>${escapeHtml(g.name)}</span>`).join('');
        modalBody.innerHTML = `
            <div class="modal-backdrop" style="background-image:url('${backdrop}')"></div>
            <div class="modal-info">
                <h2>${escapeHtml(movie.title)}</h2>
                <div class="meta-row">
                    <span class="rating">⭐ ${rating}</span>
                    <span>${year}</span>
                    ${runtime ? `<span>${runtime}</span>` : ''}
                    ${movie.original_language ? `<span>${movie.original_language.toUpperCase()}</span>` : ''}
                </div>
                <div class="genres">${genres}</div>
                <button type="button" class="modal-fav-btn" data-fav-id="${movie.id}"></button>
                <p class="overview">${escapeHtml(movie.overview || 'Sinopse não disponível.')}</p>
                ${director ? `<p style="margin-top:14px;"><strong>Direção:</strong> ${escapeHtml(director)}</p>` : ''}
                ${cast ? `<p style="margin-top:6px;"><strong>Elenco:</strong> ${escapeHtml(cast)}</p>` : ''}
            </div>`;
        const modalFavBtn = modalBody.querySelector('.modal-fav-btn');
        modalFavBtn.addEventListener('click', () => toggleFavorite({
            id: movie.id, title: movie.title, poster_path: movie.poster_path
        }));
        syncFavoriteButtons();
    } catch (err) {
        modalBody.innerHTML = `<div class="empty-state" style="margin:40px;">Erro ao carregar detalhes.</div>`;
        console.error(err);
    }
}

function closeModal() { modal.classList.add('hidden'); modalBody.innerHTML = ''; }
modalOverlay.addEventListener('click', closeModal);
modalClose.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal(); });

async function loadHomeData() {
    const user = getCurrentUser(); if (!user) return;
    const prefs = getUserPrefs();
    
    // Reseta o estado da pesquisa ao carregar a página
    searchInput.value = '';
    searchResultsSection.classList.add('hidden');
    defaultHomeContent.classList.remove('hidden');

    renderFavoritesSection();

    aiContainer.innerHTML = '<div class="loader">Carregando recomendações...</div>';
    trendingContainer.innerHTML = '<div class="loader">Carregando filmes em alta...</div>';
    topContainer.innerHTML = '<div class="loader">Carregando...</div>';
    
    try {
        const [recommended, trending, top] = await Promise.all([
            prefs.length ? fetchRecommendedForUser(prefs) : Promise.resolve([]),
            fetchTrending(), 
            fetchTopRated()
        ]);
        
        if (recommended.length > 0) renderMovies(recommended, aiContainer, { showMatch: true, userGenreIds: prefs });
        else aiContainer.innerHTML = '<div class="empty-state">Selecione gêneros em "Editar Gêneros".</div>';
        
        renderMovies(trending, trendingContainer);
        renderMovies(top, topContainer);
        
        currentCatalogPage = 1;
        loadCatalog();
        
    } catch (err) {
        console.error(err);
        const errMsg = '<div class="empty-state">Erro ao carregar filmes do TMDB.</div>';
        aiContainer.innerHTML = errMsg; trendingContainer.innerHTML = errMsg; topContainer.innerHTML = errMsg;
    }
}

// Botão "Favoritos" da barra superior: sai da busca (se estiver nela) e rola até a seção
goFavoritesBtn.addEventListener('click', () => {
    if (defaultHomeContent.classList.contains('hidden')) clearSearchBtn.click();
    document.getElementById('favorites-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.addEventListener('DOMContentLoaded', checkSession);
if (document.readyState !== 'loading') checkSession();

// ================= CONFIG CHAT =================
// A chamada à IA passa pelo backend (/api/chat), que guarda a
// GEMINI_API_KEY no .env do servidor — o front-end não vê a chave.

// ================= ELEMENTOS CHAT =================

const chatToggle = document.getElementById('chat-toggle');
const chatContainer = document.getElementById('chat-container');
const chatClose = document.getElementById('chat-close');

const chatMessages = document.getElementById('chat-messages');

const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');

// ================= ESTADO CHAT =================

let chatHistory = [];

// ================= EVENTOS =================

chatToggle.addEventListener('click', () => {
    chatContainer.classList.toggle('hidden');

    if (!chatContainer.classList.contains('hidden')) {
        chatInput.focus();
    }
});

chatClose.addEventListener('click', () => {
    chatContainer.classList.add('hidden');
});

chatSend.addEventListener('click', sendChatMessage);

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
    }
});

// ================= INICIALIZAÇÃO =================

function initializeChat() {

    if (chatMessages.children.length > 0) return;

    addMessageToChat(
        'bot',
        '🎬 Oi! Eu sou o RecomendaAI Bot.\n\nMe diga o que você quer assistir hoje.\n\nExemplos:\n• "Quero filmes parecidos com Interestelar"\n• "Me recomenda um terror psicológico"\n• "Quero um filme emocionante"'
    );
}

// ================= ADICIONAR MENSAGEM =================

function addMessageToChat(sender, text, asHtml = false) {

    const message = document.createElement('div');

    message.className = `chat-message ${sender}`;

    // asHtml só é usado com texto já escapado por formatChatText()
    if (asHtml) message.innerHTML = text;
    else message.innerText = text;

    chatMessages.appendChild(message);

    scrollChatToBottom();

    return message;
}

// ================= SCROLL =================

function scrollChatToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ================= DIGITANDO =================

function showTyping() {

    const typing = document.createElement('div');

    typing.className = 'chat-message bot typing';

    typing.id = 'typing-message';

    typing.innerText = '🎬 Digitando...';

    chatMessages.appendChild(typing);

    scrollChatToBottom();
}

function removeTyping() {

    const typing = document.getElementById('typing-message');

    if (typing) typing.remove();
}

// ================= PREFERÊNCIAS USUÁRIO =================

function getUserGenreNames() {

    const user = getCurrentUser();

    if (!user) return [];

    const genreIds = getUserPrefs();

    return genreIds
        .map(id => GENRES.find(g => g.id === id)?.name)
        .filter(Boolean);
}

// ================= MONTAR PROMPT =================

function buildPrompt(userMessage) {

    const user = getCurrentUser();

    const favoriteGenres = getUserGenreNames();

    return `
Você é um especialista em cinema chamado RecomendaAI.

O usuário se chama: ${user?.name || 'Usuário'}

Gêneros favoritos:
${favoriteGenres.join(', ')}

REGRAS:
- Seja amigável
- Recomende filmes reais
- Explique rapidamente porque recomendou
- Sugira filmes populares e bem avaliados
- Sempre que possível cite:
  - nome do filme
  - gênero
  - ano
- Respostas curtas e organizadas
- Nunca invente filmes

FORMATO DA RESPOSTA (muito importante):
- Escreva em texto simples. Pode usar **negrito** apenas no nome dos filmes.
- Não use tabelas nem títulos com #.
- Se você recomendou ou citou filmes, termine a resposta com UMA última linha, exatamente neste formato e sem nada depois dela:
[[FILMES: Título do Filme (ano) ; Outro Filme (ano)]]
- Use o nome mais conhecido no Brasil, no máximo 5 filmes, separados por ponto e vírgula.
- Se você não citou nenhum filme, não escreva essa linha.

Pergunta do usuário:
"${userMessage}"
`;
}

// ================= ENVIAR MENSAGEM =================

async function sendChatMessage() {

    const message = chatInput.value.trim();

    if (!message) return;

    addMessageToChat('user', message);

    chatInput.value = '';

    showTyping();

    try {

        const prompt = buildPrompt(message);

        chatHistory.push({
            role: 'user',
            parts: [{ text: prompt }]
        });

        const response = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                contents: chatHistory,
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1500
                }
            })
        });

        const data = await response.json();

        removeTyping();

        console.log(data);

        if (!response.ok) {
            // desfaz a pergunta que não foi respondida, para não bagunçar o histórico
            chatHistory.pop();

            let friendly = '❌ Não consegui falar com a IA agora. Tente novamente em instantes.';
            if (response.status === 429) friendly = '⏳ Muitas mensagens em pouco tempo. Aguarde uns 15 segundos e tente de novo.';
            else if (response.status === 503) friendly = '⏳ A IA está sobrecarregada no momento. Tente novamente em alguns instantes.';

            addMessageToChat('bot', friendly);
            return;
        }

        const botText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            'Desculpe, não consegui responder agora.';

        // separa o texto que o usuário vê da lista de filmes citados
        const reply = parseBotReply(botText);

        addMessageToChat('bot', formatChatText(reply.text), true);

        // salva resposta no histórico
        chatHistory.push({
            role: 'model',
            parts: [{ text: botText }]
        });

        // ================= CARDS DOS FILMES (TMDB) =================

        if (reply.items.length > 0) {

            const movies = await fetchMoviesByTitles(reply.items);

            if (movies.length > 0) {
                renderChatMovieCards(movies);
            }
        }

    } catch (error) {

        console.error(error);

        removeTyping();

        addMessageToChat(
            'bot',
            '❌ Ocorreu um erro ao falar com a IA.'
        );
    }
}

// ================= FORMATAR TEXTO DO BOT =================

// Escapa o HTML (segurança) e transforma **negrito** e listas em algo legível
function formatChatText(text) {
    return escapeHtml(text)
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
        .replace(/^\s*[*•-]\s+/gm, '• ');
}

// ================= EXTRAIR FILMES =================

// "Matrix (1999)" -> { title: 'Matrix', year: '1999' }
function parseTitleItem(raw) {
    const clean = raw.replace(/^[-*•\s]+/, '').replace(/\*\*/g, '').trim();
    const y = clean.match(/^(.*?)\s*\((\d{4})\)\s*$/);
    return y ? { title: y[1].trim(), year: y[2] } : { title: clean };
}

// Plano B (se a IA esquecer o marcador): pega nomes em negrito ou entre aspas
function extractMovieTitles(text) {
    const found = [];
    const patterns = [/\*\*([^*\n]{2,80})\*\*/g, /“([^”\n]{2,80})”/g, /"([^"\n]{2,80})"/g, /«([^»\n]{2,80})»/g];
    patterns.forEach(re => {
        let m;
        while ((m = re.exec(text)) !== null) {
            const t = m[1].trim();
            if (!t.endsWith(':')) found.push(parseTitleItem(t));
        }
    });
    return found;
}

// Lê a resposta crua do Gemini: devolve o texto limpo + os filmes citados
function parseBotReply(rawText) {
    let items = [];

    const marker = rawText.match(/\[\[\s*FILMES\s*:([\s\S]*?)\]\]/i);
    if (marker) {
        items = marker[1].split(/[;\n]/).map(x => x.trim()).filter(Boolean).map(parseTitleItem);
    }

    // remove o marcador do texto exibido (inclusive se vier cortado no final)
    const text = rawText.replace(/\[\[\s*FILMES\s*:[\s\S]*?(\]\]|$)/i, '').trim();

    if (items.length === 0) items = extractMovieTitles(text);

    // sem repetidos, no máximo 5
    const seen = new Set();
    items = items.filter(i => {
        const k = i.title.toLowerCase();
        if (!i.title || seen.has(k)) return false;
        seen.add(k);
        return true;
    }).slice(0, 5);

    return { text, items };
}

// ================= BUSCAR FILMES TMDB =================

function normalizeTitle(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Evita card errado: o resultado do TMDB precisa ter o nome parecido com o pedido
function titlesMatch(query, movie) {
    const q = normalizeTitle(query);
    if (!q) return false;
    return [movie.title, movie.original_title].some(t => {
        const n = normalizeTitle(t);
        if (!n) return false;
        if (n === q) return true;
        const [short, long] = n.length <= q.length ? [n, q] : [q, n];
        return short.length >= 4 && long.includes(short);
    });
}

async function fetchMoviesByTitles(items) {

    const found = await Promise.all(items.map(async ({ title, year }) => {
        try {
            let results = await searchMovies(title, year);
            if ((!results || results.length === 0) && year) results = await searchMovies(title);
            return (results || []).find(m => titlesMatch(title, m)) || null;
        } catch (err) {
            console.error(err);
            return null;
        }
    }));

    const seen = new Set();
    return found.filter(m => m && !seen.has(m.id) && seen.add(m.id));
}

// ================= RENDER CARDS CHAT =================

function renderChatMovieCards(movies) {

    const wrapper = document.createElement('div');

    wrapper.className = 'chat-movie-suggestions';

    movies.forEach(movie => {

        const card = document.createElement('div');

        card.className = 'chat-movie-card';

        const poster = movie.poster_path
            ? `${TMDB_IMG}${movie.poster_path}`
            : PLACEHOLDER_IMG;

        const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
        const rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
        const meta = [year, rating ? `⭐ ${rating}` : ''].filter(Boolean).join(' • ');

        card.innerHTML = `
            <img src="${poster}" alt="Pôster de ${escapeHtml(movie.title)}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'">
            <p>${escapeHtml(movie.title)}</p>
            ${meta ? `<span class="chat-movie-meta">${meta}</span>` : ''}
        `;

        card.appendChild(createFavButton(movie));

        card.addEventListener('click', () => {
            openMovieModal(movie.id);
        });

        wrapper.appendChild(card);
    });

    chatMessages.appendChild(wrapper);

    syncFavoriteButtons();

    scrollChatToBottom();
}

// ================= AUTO START =================

document.addEventListener('DOMContentLoaded', () => {
    initializeChat();
});