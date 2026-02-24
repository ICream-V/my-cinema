const TMDB_KEY = 'YOUR_TMDB_API_KEY';
const TRAKT_ID = 'YOUR_TRAKT_CLIENT_ID';

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
