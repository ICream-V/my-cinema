/* ================================
    CONFIG
================================ */
const TRAKT_ID = 'caae7a3191de89620d5a2f2955ebce640215e6a81b0cc7657b773de5edebfd40';
const TRAKT_SECRET = '35a89bd5967a9151de677fd44a4872ab93efba1cc09fee80c27b9176459ece46';
const TMDB_KEY = 'e2b666343235c45fc18f12f2f256c29e5bb5977bc6ca9ca8d6a5bef7a7d6778f';
const REDIRECT_URI = 'https://w2znkdg7zz-del.github.io/my-cinema/';

/* ================================
    STATE & INIT
================================ */
let pendingAction = null;

init();
handleOAuthCallback();

async function init() {
    // We pass the explicit type 'movie' or 'tv' so TMDB knows which database to search
    fetchTrakt('https://api.trakt.tv/movies/trending', 'trending-movies', 'movie');
    fetchTrakt('https://api.trakt.tv/shows/popular', 'popular-shows', 'tv');
    fetchTrakt('https://api.trakt.tv/shows/anticipated', 'anticipated', 'tv');
}

/* ================================
    TRAKT FETCH & RENDER
================================ */
async function fetchTrakt(url, containerId, type) {
    try {
        const res = await fetch(url, { 
            headers: { 
                'trakt-api-version': '2', 
                'trakt-api-key': TRAKT_ID 
            }
        });
        const data = await res.json();
        const container = document.getElementById(containerId);
        
        data.slice(0, 15).forEach(item => {
            // FIX: Handle different Trakt nesting (Trending has .movie, Popular is flat)
            const media = item.movie || item.show || item;
            
            // FIX: We MUST use media.ids.tmdb to talk to TMDB
            if (media.ids && media.ids.tmdb) {
                renderCard(media.title || media.name, media.ids.tmdb, type, container);
            }
        });
    } catch (err) {
        console.error("Error fetching Trakt data:", err);
    }
}

async function renderCard(title, id, type, container) {
    if (!id) return;
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="poster" style="background:#2c2c2e;"></div><div class="card-title">${title}</div>`;
    
    // Pass the TMDB ID and the Type (movie/tv) to the details modal
    card.onclick = () => showDetails(id, type);
    container.appendChild(card);

    try {
        // FIX: Fetch images using the TMDB ID and specific type
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}`);
        const data = await res.json();
        
        if (data.poster_path) {
            const posterDiv = card.querySelector('.poster');
            posterDiv.outerHTML = `<img class="poster" src="https://image.tmdb.org/t/p/w342${data.poster_path}" alt="${title}">`;
        }
    } catch (err) {
        console.error("Error loading poster:", err);
    }
}

/* ================================
    SHOW DETAILS MODAL
================================ */
async function showDetails(id, type) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    modal.classList.remove('modal-hidden');
    body.innerHTML = '<p style="text-align:center; padding-top:50px;">Loading...</p>';

    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=videos`);
        const data = await res.json();
        
        const trailer = data.videos?.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        const displayTitle = data.title || data.name || "Unknown Title";
        const rating = data.vote_average ? data.vote_average.toFixed(1) : "N/A";
        const overview = data.overview || "No description available.";
        const backdrop = data.backdrop_path || data.poster_path;

        body.innerHTML = `
            <img class="details-poster" src="https://image.tmdb.org/t/p/w780${backdrop}">
            <div class="details-title">${displayTitle}</div>
            <div style="color:var(--accent); margin:10px 0;">★ ${rating}</div>
            <div class="details-overview">${overview}</div>

            ${trailer ? `<a href="https://youtube.com/watch?v=${trailer.key}" target="_blank" class="trailer-btn">Watch Trailer</a>` : ''}

            <div style="margin-top:20px;">
                <button class="action-btn" onclick="addToTrakt(${id}, '${type}')">Add to Trakt List</button>
                ${type === 'movie' ? `<button class="action-btn" onclick="addToTMDB(${id})">Add to TMDB List</button>` : ''}
            </div>
        `;
    } catch (err) {
        body.innerHTML = '<p style="text-align:center;">Error loading details.</p>';
    }
}

/* ================================
    SEARCH LOGIC
================================ */
let timer;
document.getElementById('search-input').oninput = (e) => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
        const query = e.target.value.trim();
        if (query.length < 3) return;

        try {
            const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            const results = document.getElementById('search-results');
            results.innerHTML = '';

            data.results.forEach(item => {
                // TMDB search results provide 'id' and 'media_type' (movie/tv) directly
                if (item.poster_path && (item.media_type === 'movie' || item.media_type === 'tv')) {
                    renderCard(item.title || item.name, item.id, item.media_type, results);
                }
            });
        } catch (err) {
            console.error("Search failed:", err);
        }
    }, 500);
};

/* ================================
    OAUTH & UTILITIES (Keep your existing auth functions below)
================================ */
function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const tmdbApproved = params.get('approved');
    if (code && !localStorage.getItem('trakt_token')) exchangeTraktToken(code);
    if (tmdbApproved === 'true') createTMDBSession();
}

async function exchangeTraktToken(code) {
    const res = await fetch('https://api.trakt.tv/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            code, client_id: TRAKT_ID, client_secret: TRAKT_SECRET,
            redirect_uri: REDIRECT_URI, grant_type: 'authorization_code'
        })
    });
    const data = await res.json();
    localStorage.setItem('trakt_token', data.access_token);
    cleanURL();
}

function loginTrakt() {
    window.location.href = `https://api.trakt.tv/oauth/authorize?response_type=code&client_id=${TRAKT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
}

async function loginTMDB() {
    const res = await fetch(`https://api.themoviedb.org/3/authentication/token/new?api_key=${TMDB_KEY}`);
    const data = await res.json();
    localStorage.setItem('tmdb_request_token', data.request_token);
    window.location.href = `https://www.themoviedb.org/authenticate/${data.request_token}?redirect_to=${encodeURIComponent(REDIRECT_URI)}`;
}

async function createTMDBSession() {
    const request_token = localStorage.getItem('tmdb_request_token');
    const res = await fetch(`https://api.themoviedb.org/3/authentication/session/new?api_key=${TMDB_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token })
    });
    const data = await res.json();
    localStorage.setItem('tmdb_session', data.session_id);
    cleanURL();
}

function addToTrakt(id, type) {
    const token = localStorage.getItem('trakt_token');
    if (!token) { loginTrakt(); return; }
    // List logic follows...
}

function cleanURL() { window.history.replaceState({}, document.title, window.location.pathname); }
document.getElementById('nav-search').onclick = () => document.getElementById('search-overlay').classList.remove('modal-hidden');
document.getElementById('search-close').onclick = () => document.getElementById('search-overlay').classList.add('modal-hidden');
document.getElementById('modal-close').onclick = () => document.getElementById('modal-overlay').classList.add('modal-hidden');
