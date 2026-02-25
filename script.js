/* ================================
   CONFIG
================================ */
const TRAKT_ID = 'caae7a3191de89620d5a2f2955ebce640215e6a81b0cc7657b773de5edebfd40';
const TRAKT_SECRET = '35a89bd5967a9151de677fd44a4872ab93efba1cc09fee80c27b9176459ece46';
const TMDB_KEY = '37cc8cb617e62d17e6180754e7a94139';
const REDIRECT_URI = 'https://icream-v.github.io/my-cinema/';

/* ================================
   STATE & CACHE
================================ */
let wasSearchOpen = false; 
const posterCache = {};         
let currentModalPage = 1;

/* ================================
   INIT & AUTH FLOW
================================ */
init();
handleOAuthCallback();
updateAuthUI();

async function init() {
    fetchTrakt('https://api.trakt.tv/movies/trending', 'trending-movies', 'movie', 'Trending Movies');
    fetchTrakt('https://api.trakt.tv/shows/popular', 'popular-shows', 'tv', 'Popular TV Shows');
    fetchTrakt('https://api.trakt.tv/shows/anticipated', 'anticipated', 'tv', 'Most Anticipated');
}

function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('code') && !localStorage.getItem('trakt_token')) {
        exchangeTraktToken(params.get('code'));
    }
    if (params.get('approved') === 'true') {
        createTMDBSession();
    }
}

/* ================================
   CORE RENDERER (SHARED)
================================ */
async function renderCard(title, id, type, container) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="poster"></div><div class="card-title">${title}</div>`;
    card.onclick = () => showDetails(id, type);
    container.appendChild(card);

    // Check Cache first to save API hits
    if (posterCache[id]) {
        card.querySelector('.poster').outerHTML = `<img class="poster" src="${posterCache[id]}" alt="${title}">`;
        return;
    }

    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}`);
        const data = await res.json();
        if (data.poster_path) {
            posterCache[id] = `https://image.tmdb.org/t/p/w342${data.poster_path}`;
            card.querySelector('.poster').outerHTML = `<img class="poster" src="${posterCache[id]}" alt="${title}">`;
        }
    } catch (err) { console.error("TMDB Fetch Error:", err); }
}

/* ================================
   FETCHING LOGIC
================================ */
async function fetchTrakt(url, containerId, type, categoryLabel) {
    try {
        const res = await fetch(url, { headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }});
        const data = await res.json();
        const container = document.getElementById(containerId);

        data.slice(0, 15).forEach(item => {
            const media = item.movie || item.show || item;
            if (media.ids?.tmdb) renderCard(media.title || media.name, media.ids.tmdb, type, container);
        });

        // "See More" Card for horizontal scrollers
        const seeMore = document.createElement('div');
        seeMore.className = 'card see-more';
        seeMore.innerHTML = `<span>See More</span>`;
        seeMore.onclick = () => openSectionModal(url, categoryLabel, type);
        container.appendChild(seeMore);
    } catch (err) { console.error(err); }
}

/* ================================
   MODAL: SEE MORE & LOAD MORE
================================ */
async function openSectionModal(apiUrl, categoryLabel, type, page = 1) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    setScrollLock(true);
    modal.classList.remove('modal-hidden');
    
    // First time opening: build the shell
    if (page === 1) {
        currentModalPage = 1;
        body.innerHTML = `
            <h3 style="margin:10px 0;">${categoryLabel}</h3>
            <div id="modal-grid"></div>
            <button id="load-more-btn" class="action-btn" style="margin: 20px 0 40px;">Load More</button>
        `;
    }

    const grid = document.getElementById('modal-grid');
    const loadBtn = document.getElementById('load-more-btn');
    loadBtn.innerText = "Loading...";

    try {
        const pagedUrl = `${apiUrl}${apiUrl.includes('?') ? '&' : '?'}limit=30&page=${page}`;
        const res = await fetch(pagedUrl, { headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }});
        const items = await res.json();
        
        items.forEach(item => {
            const media = item.movie || item.show || item;
            if (media.ids?.tmdb) renderCard(media.title || media.name, media.ids.tmdb, type, grid);
        });

        loadBtn.innerText = "Load More";
        loadBtn.onclick = () => {
            currentModalPage++;
            openSectionModal(apiUrl, categoryLabel, type, currentModalPage);
        };
    } catch (err) { 
        loadBtn.innerText = "No more items";
    }
}

async function showDetails(id, type) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    const searchOverlay = document.getElementById('search-overlay');

    wasSearchOpen = !searchOverlay.classList.contains('modal-hidden');
    if (wasSearchOpen) searchOverlay.classList.add('modal-hidden');

    modal.classList.remove('modal-hidden');
    setScrollLock(true);
    body.innerHTML = '<p style="text-align:center; padding-top:50px;">Loading...</p>';

    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=videos`);
        const data = await res.json();
        const trailer = data.videos?.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');

        body.innerHTML = `
            <img class="details-poster" src="https://image.tmdb.org/t/p/w780${data.backdrop_path || data.poster_path}">
            <div class="details-title">${data.title || data.name}</div>
            <div style="color:var(--accent); margin:10px 0;">★ ${data.vote_average?.toFixed(1) || 'N/A'}</div>
            <div class="details-overview">${data.overview || 'No description available.'}</div>
            ${trailer ? `<a href="https://youtube.com/watch?v=${trailer.key}" target="_blank" class="trailer-btn">Watch Trailer</a>` : ''}
            <div style="margin-top:20px;">
                <button class="action-btn" onclick="addToTrakt(${id}, '${type}')">Add to Trakt List</button>
                ${type === 'movie' ? `<button class="action-btn" onclick="addToTMDB(${id})">Add to TMDB List</button>` : ''}
            </div>
        `;
    } catch (err) { body.innerHTML = '<p>Error.</p>'; }
}

/* ================================
   AUTH & ACTIONS
================================ */
async function exchangeTraktToken(code) {
    const res = await fetch('https://api.trakt.tv/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, client_id: TRAKT_ID, client_secret: TRAKT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' })
    });
    const data = await res.json();
    if (data.access_token) { localStorage.setItem('trakt_token', data.access_token); updateAuthUI(); cleanURL(); }
}

async function createTMDBSession() {
    const res = await fetch(`https://api.themoviedb.org/3/authentication/session/new?api_key=${TMDB_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: localStorage.getItem('tmdb_request_token') })
    });
    const data = await res.json();
    if (data.session_id) { localStorage.setItem('tmdb_session', data.session_id); updateAuthUI(); cleanURL(); }
}

function updateAuthUI() {
    if (localStorage.getItem('trakt_token')) { 
        const b = document.getElementById('login-trakt'); b.textContent = "Trakt ✓"; b.style.background = "#34c759"; b.disabled = true; 
    }
    if (localStorage.getItem('tmdb_session')) { 
        const b = document.getElementById('login-tmdb'); b.textContent = "TMDB ✓"; b.style.background = "#34c759"; b.disabled = true; 
    }
}

function loginTrakt() { window.location.href = `https://api.trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`; }

async function loginTMDB() {
    const res = await fetch(`https://api.themoviedb.org/3/authentication/token/new?api_key=${TMDB_KEY}`);
    const data = await res.json();
    localStorage.setItem('tmdb_request_token', data.request_token);
    window.location.href = `https://www.themoviedb.org/authenticate/${data.request_token}?redirect_to=${encodeURIComponent(REDIRECT_URI)}`;
}

/* ================================
   CONTROLS & SEARCH
================================ */
function setScrollLock(lock) {
    if (lock) {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
    } else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
    }
}

function cleanURL() {
    window.history.replaceState({}, document.title, window.location.pathname);
}

document.getElementById('modal-close').onclick = () => {
    document.getElementById('modal-overlay').classList.add('modal-hidden');
    if (wasSearchOpen) { 
        document.getElementById('search-overlay').classList.remove('modal-hidden'); 
        wasSearchOpen = false; 
    } else {
        setScrollLock(false);
    }
};

document.getElementById('nav-search').onclick = () => { 
    document.getElementById('search-overlay').classList.remove('modal-hidden'); 
    setScrollLock(true); 
};

document.getElementById('search-close').onclick = () => { 
    document.getElementById('search-overlay').classList.add('modal-hidden'); 
    setScrollLock(false); 
    wasSearchOpen = false; 
};

document.getElementById('login-trakt').onclick = loginTrakt;
document.getElementById('login-tmdb').onclick = loginTMDB;

let searchTimer;
document.getElementById('search-input').oninput = (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length < 3) return;
        
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        const results = document.getElementById('search-results');
        results.innerHTML = '';
        
        data.results.forEach(item => {
            if (item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv')) {
                renderCard(item.title || item.name, item.id, item.media_type, results);
            }
        });
    }, 500);
};

// Placeholder functions for the list actions to avoid errors
async function addToTrakt(id, type) { 
    const token = localStorage.getItem('trakt_token');
    if(!token) return loginTrakt();
    alert("Functionality to select list and add is active. Ensure showListSelector is present if needed.");
}

async function addToTMDB(id) { 
    const session = localStorage.getItem('tmdb_session');
    if(!session) return loginTMDB();
    alert("TMDB list addition triggered.");
}
