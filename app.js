const API_URL = 'https://api.jikan.moe/v4/top/anime?filter=airing';
const SEARCH_URL = 'https://api.jikan.moe/v4/anime?q=';
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');

async function fetchAnime(url) {
    try {
        animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-500">Fetching shows...</div>';
        const response = await fetch(url);
        const data = await response.json();
        displayAnime(data.data);
    } catch (error) {
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Failed to load content.</div>';
    }
}

function displayAnime(animeList) {
    animeGrid.innerHTML = '';
    if (!animeList || animeList.length === 0) {
        animeGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10">No anime found.</div>';
        return;
    }
    animeList.forEach(anime => {
        const title = anime.title_english || anime.title;
        const score = anime.score ? anime.score : 'N/A';
        const episodes = anime.episodes ? `${anime.episodes} Eps` : 'Ongoing';
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg">
                <div>
                    <div class="relative h-48 sm:h-56">
                        <img src="${anime.images.jpg.image_url}" alt="${title}" class="w-full h-full object-cover">
                        <span class="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs font-semibold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                    </div>
                    <div class="p-3">
                        <h3 class="text-sm font-bold text-slate-100 line-clamp-1">${title}</h3>
                        <p class="text-xs text-gray-400 mt-1">Status: <span class="text-rose-400">${episodes}</span></p>
                    </div>
                </div>
                <div class="p-3 pt-0">
                    <a href="${anime.url}" target="_blank" class="block w-full text-center bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 rounded-lg">View Details</a>
                </div>
            </div>
        `;
    });
}

let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => {
        if (query.length > 2) fetchAnime(`${SEARCH_URL}${encodeURIComponent(query)}&limit=16`);
        else if (query.length === 0) fetchAnime(API_URL);
    }, 500);
});

fetchAnime(API_URL);
