import { fetchTrakt } from './api.js';
import { renderCard } from './ui.js';
import { handleOAuthCallback } from './auth.js';

// Initial fetch
export async function init() {
    fetchTrakt('https://api.trakt.tv/movies/trending').then(data => {
        const container = document.getElementById('trending-movies');
        data.slice(0, 15).forEach(item => renderCard(item.movie?.title || item.show?.name, item.movie?.ids?.tmdb || item.show?.ids?.tmdb, item.movie ? 'movie' : 'tv', container));
    });

    fetchTrakt('https://api.trakt.tv/shows/popular').then(data => {
        const container = document.getElementById('popular-shows');
        data.slice(0, 15).forEach(item => renderCard(item.show?.name, item.show?.ids?.tmdb, 'tv', container));
    });

    fetchTrakt('https://api.trakt.tv/shows/anticipated').then(data => {
        const container = document.getElementById('anticipated');
        data.slice(0, 15).forEach(item => renderCard(item.show?.name, item.show?.ids?.tmdb, 'tv', container));
    });
}

// Event bindings
document.getElementById('nav-search').onclick = () => document.getElementById('search-overlay').classList.remove('modal-hidden');
document.getElementById('search-close').onclick = () => document.getElementById('search-overlay').classList.add('modal-hidden');
document.getElementById('modal-close').onclick = () => document.getElementById('modal-overlay').classList.add('modal-hidden');

init();
handleOAuthCallback();
