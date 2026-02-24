const TMDB_KEY = '37cc8cb617e62d17e6180754e7a94139';
const TRAKT_ID = 'e2b666343235c45fc18f12f2f256c29e5bb5977bc6ca9ca8d6a5bef7a7d6778f';

async function loadContent() {
    // 1. Fetch from Trakt
    const traktMovies = await fetch('https://api.trakt.tv/movies/trending', {
        headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }
    }).then(res => res.json());

    const traktShows = await fetch('https://api.trakt.tv/shows/popular', {
        headers: { 'trakt-api-version': '2', 'trakt-api-key': TRAKT_ID }
    }).then(res => res.json());

    renderList(traktMovies, 'trending-movies', 'movie');
    renderList(traktShows, 'popular-shows', 'tv');
}

async function renderList(data, containerId, type) {
    const container = document.getElementById(containerId);
    
    for (const item of data.slice(0, 10)) {
        const media = item.movie || item; // Trakt trending nests inside 'movie', popular does not
        const tmdbId = media.ids.tmdb;

        // Fetch Image from TMDB
        const tmdbData = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}`).then(res => res.json());
        const posterPath = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w342${tmdbData.poster_path}` : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img class="poster" src="${posterPath}" alt="${media.title}">
            <div class="card-title">${media.title}</div>
        `;
        container.appendChild(card);
    }
}

loadContent();

// Add these to your existing script.js

async function renderList(data, containerId, type) {
    const container = document.getElementById(containerId);
    
    for (const item of data.slice(0, 10)) {
        const media = item.movie || item; 
        const tmdbId = media.ids.tmdb;

        const tmdbData = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}`).then(res => res.json());
        const posterPath = tmdbData.poster_path ? `https://image.tmdb.org/t/p/w342${tmdbData.poster_path}` : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img class="poster" src="${posterPath}" alt="${media.title}">
            <div class="card-title">${media.title}</div>
        `;
        
        // CLICK EVENT
        card.onclick = () => showDetails(tmdbId, type);
        
        container.appendChild(card);
    }
}

async function showDetails(id, type) {
    const overlay = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    
    // Fetch details + videos (for trailer)
    const data = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&append_to_response=videos`).then(res => res.json());
    
    const trailer = data.videos.results.find(v => v.type === 'Trailer');
    const trailerLink = trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '#';

    body.innerHTML = `
        <img class="details-poster" src="https://image.tmdb.org/t/p/w780${data.backdrop_path || data.poster_path}">
        <div class="details-title">${data.title || data.name}</div>
        <div style="margin-bottom:15px; color:var(--accent)">★ ${data.vote_average.toFixed(1)}</div>
        <div class="details-overview">${data.overview}</div>
        ${trailer ? `<a href="${trailerLink}" target="_blank" class="trailer-btn">▶ Play Trailer</a>` : ''}
    `;

    overlay.classList.remove('modal-hidden');
}

// Close Modal logic
document.getElementById('modal-close').onclick = () => {
    document.getElementById('modal-overlay').classList.add('modal-hidden');
};

// Close if clicking outside the content
document.getElementById('modal-overlay').onclick = (e) => {
    if(e.target.id === 'modal-overlay') {
        document.getElementById('modal-overlay').classList.add('modal-hidden');
    }
};

/* Search Overlay Styles */
#search-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: var(--bg);
    z-index: 2000;
    padding-top: env(safe-area-inset-top);
}

.search-header {
    display: flex;
    padding: 15px 20px;
    gap: 15px;
    align-items: center;
}

#search-input {
    flex: 1;
    background: #1c1c1e;
    border: none;
    border-radius: 10px;
    padding: 12px 15px;
    color: white;
    font-size: 17px;
    outline: none;
}

#search-close {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 16px;
    padding: 0;
}

/* Grid for Search Results */
.grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 10px 20px;
    overflow-y: auto;
    height: calc(100vh - 100px);
}

/* Reuse card styles for search results */
.grid .card {
    min-width: unset;
    width: 100%;
}
