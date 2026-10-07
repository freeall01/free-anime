const ANILIST_API = 'https://graphql.anilist.co';
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const videoFrame = document.getElementById('videoFrame');
const modalTitle = document.getElementById('modalTitle');
const epInput = document.getElementById('epInput');

let currentAnilistId = null;
let currentMalId = null;
let currentServer = 'vidsrccc';

async function fetchAnime(searchQuery = '') {
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Loading catalog...</div>';

    try {
        const graphqlQuery = `
            query ($search: String) {
                Page (page: 1, perPage: 24) {
                    media (search: $search, status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
                        id
                        idMal
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
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Failed to connect to database.</div>';
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
        const malId = anime.idMal || anime.id;
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg">
                <div class="relative h-48 sm:h-56">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                    <span class="absolute top-2 right-2 bg-slate-900/90 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                </div>
                <div class="p-3">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-1">${title}</h3>
                    <p class="text-xs text-slate-400 mb-3">Status: <span class="text-rose-400 font-medium">${episodes}</span></p>
                    <button onclick="playAnime(${anime.id}, ${malId}, '${title.replace(/'/g, "")}')" class="block w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
                        ▶ Watch Video
                    </button>
                </div>
            </div>
        `;
    });
}

function playAnime(anilistId, malId, title) {
    currentAnilistId = anilistId;
    currentMalId = malId;
    modalTitle.innerText = `Streaming: ${title}`;
    epInput.value = 1; 
    
    switchServer('vidsrccc');
    videoModal.classList.remove('hidden');
}

function updateStream() {
    if (currentAnilistId) {
        switchServer(currentServer);
    }
}

function switchServer(serverName) {
    currentServer = serverName;
    const ep = epInput.value || 1;
    
    const btn1 = document.getElementById('btn-vidsrccc');
    const btn2 = document.getElementById('btn-vidsrcxyz');
    const btn3 = document.getElementById('btn-autoembed');

    [btn1, btn2, btn3].forEach(btn => {
        if (btn) btn.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap transition shrink-0';
    });

    if (serverName === 'vidsrccc') {
        videoFrame.src = `https://vidsrc.cc/v2/embed/anime/${currentAnilistId}?ep=${ep}&sub=1`;
        if (btn1) btn1.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow shrink-0';
    } else if (serverName === 'vidsrcxyz') {
        videoFrame.src = `https://vidsrc.xyz/embed/anime?anilist=${currentAnilistId}&ep=${ep}`;
        if (btn2) btn2.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow shrink-0';
    } else if (serverName === 'autoembed') {
        // AutoEmbed specifically prefers MAL IDs for accuracy
        videoFrame.src = `https://player.autoembed.cc/embed/anime/mal/${currentMalId}/${ep}`;
        if (btn3) btn3.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow shrink-0';
    }
}

function closePlayer() {
    videoFrame.src = '';
    videoModal.classList.add('hidden');
}

let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => fetchAnime(query), 500);
});

fetchAnime();
