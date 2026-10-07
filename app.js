const ANILIST_API = 'https://graphql.anilist.co';
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const routingButtons = document.getElementById('routingButtons');

async function fetchAnime(searchQuery = '') {
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Loading catalog...</div>';

    try {
        const graphqlQuery = `
            query ($search: String) {
                Page (page: 1, perPage: 25) {
                    media (search: $search, status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
                        id
                        title {
                            english
                            romaji
                        }
                        coverImage {
                            large
                        }
                        averageScore
                        episodes
                    }
                }
            }
        `;

        const response = await fetch(ANILIST_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                query: graphqlQuery,
                variables: { search: searchQuery ? searchQuery : null }
            })
        });

        const result = await response.json();
        displayAnime(result.data.Page.media);
    } catch (error) {
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Failed to connect to database. Check network.</div>';
    }
}

function displayAnime(animeList) {
    animeGrid.innerHTML = '';
    if (!animeList || animeList.length === 0) {
        animeGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10">No anime found.</div>';
        return;
    }

    animeList.forEach(anime => {
        const title = anime.title.english || anime.title.romaji;
        const imageUrl = anime.coverImage.large;
        const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
        const episodes = anime.episodes ? `${anime.episodes} Eps` : 'Ongoing';
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg">
                <div class="relative h-48 sm:h-56">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                    <span class="absolute top-2 right-2 bg-slate-900/90 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                </div>
                <div class="p-3">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-1">${title}</h3>
                    <p class="text-xs text-slate-400 mb-3">Status: <span class="text-rose-400 font-medium">${episodes}</span></p>
                    <button onclick="openRoutingModal('${title.replace(/'/g, "")}')" class="block w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
                        ▶ Find Streams
                    </button>
                </div>
            </div>
        `;
    });
}

function openRoutingModal(title) {
    modalTitle.innerText = title;
    
    // Clean title for URL generation
    const cleanTitle = encodeURIComponent(title);
    
    // 1. DuckDuckGo (Does not filter out piracy sites like Google does)
    const ddgUrl = `https://duckduckgo.com/?q=watch+${cleanTitle}+anime+free+online`;
    
    // 2. Yandex Search (Completely ignores DMCA takedowns)
    const yandexUrl = `https://yandex.com/search/?text=watch+${cleanTitle}+anime+free`;
    
    // 3. Crunchyroll (Legal fallback)
    const crunchyUrl = `https://www.crunchyroll.com/search?q=${cleanTitle}`;

    routingButtons.innerHTML = `
        <a href="${ddgUrl}" target="_blank" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition">
            <span>▶ Web Search (Uncensored)</span> <span class="text-xs opacity-75">⧉</span>
        </a>
        <a href="${yandexUrl}" target="_blank" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 transition">
            <span>▶ Deep Search (Bypass Blocks)</span> <span class="text-xs opacity-75">⧉</span>
        </a>
        <a href="${crunchyUrl}" target="_blank" class="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 rounded-lg text-sm border border-orange-400 flex items-center justify-center gap-2 transition">
            <span>▶ Check Crunchyroll</span> <span class="text-xs opacity-75">⧉</span>
        </a>
    `;
    
    videoModal.classList.remove('hidden');
}

function closeModal() {
    videoModal.classList.add('hidden');
}

let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => fetchAnime(query), 500);
});

fetchAnime();
