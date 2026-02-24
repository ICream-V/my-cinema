import { fetchTMDBDetails } from './api.js';
import { addToTrakt, addToTMDB } from './lists.js';

export async function renderCard(title, id, type, container) {
    if (!id) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="poster"></div><div class="card-title">${title}</div>`;
    card.onclick = () => showDetails(id, type);
    container.appendChild(card);

    try {
        const data = await fetchTMDBDetails(type, id);
        if (data.poster_path) {
            const posterDiv = card.querySelector('.poster');
            posterDiv.outerHTML = `<img class="poster" src="https://image.tmdb.org/t/p/w342${data.poster_path}" alt="${title}">`;
        }
    } catch (err) {
        console.error("Error fetching poster:", err);
    }
}

export async function showDetails(id, type) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    modal.classList.remove('modal-hidden');
    body.innerHTML = '<p style="text-align:center; padding-top:50px;">Loading...</p>';

    try {
        const data = await fetchTMDBDetails(type, id);
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
    } catch (err) {
        body.innerHTML = '<p>Error loading details.</p>';
    }
}

export function showListSelector(lists, callback) {
    const body = document.getElementById('modal-body');
    body.innerHTML = '<h3>Select List</h3>';
    lists.forEach(list => {
        const btn = document.createElement('button');
        btn.className = 'list-btn';
        btn.textContent = list.name;
        btn.onclick = () => callback(list.ids?.slug || list.id);
        body.appendChild(btn);
    });
}
