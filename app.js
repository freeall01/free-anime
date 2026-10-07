const ANILIST_API = 'https://graphql.anilist.co';
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const videoFrame = document.getElementById('videoFrame');
const modalTitle = document.getElementById('modalTitle');

let currentAnilistId = null;

async function fetchAnime(searchQuery = '') {
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Loading catalog...</div>';

    try {
        const graphqlQuery = `
            query ($search: String) {
                Page (page: 1, perPage: 24) {
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
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Network Error.</div>';
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
                    <span class="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                </div>
                <div class="p-3">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-1">${title}</h3>
                    <p class="text-xs text-slate-400 mb-2">Status: <span class="text-rose-400">${episodes}</span></p>
                    <button onclick="playAnime(${anime.id}, '${title.replace(/'/g, "")}')" class="block w-full text-center bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
                        ▶ Watch Video
                    </button>
                </div>
            </div>
        `;
    });
}

function playAnime(id, title) {
    currentAnilistId = id;
    modalTitle.innerText = `Streaming: ${title}`;
    
    // Default to first server
    switchServer('vidsrccc');
    videoModal.classList.remove('hidden');
}

function switchServer(serverName) {
    const btn1 = document.getElementById('btn-vidsrccc');
    const btn2 = document.getElementById('btn-smashy');
    const btn3 = document.getElementById('btn-autoembed');

    [btn1, btn2, btn3].forEach(btn => {
        if (btn) btn.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap transition';
    });

    if (serverName === 'vidsrccc') {
        videoFrame.src = `https://vidsrc.cc/v2/embed/anime/${currentAnilistId}?sub=1`;
        if (btn1) btn1.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow';
    } else if (serverName === 'smashy') {
        videoFrame.src = `https://player.smashy.stream/anime?anilist=${currentAnilistId}`;
        if (btn2) btn2.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow';
    } else if (serverName === 'autoembed') {
        videoFrame.src = `https://autoembed.co/anime/anilist/${currentAnilistId}`;
        if (btn3) btn3.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow';
    }
}

function closePlayer() {
    videoFrame.src = '';
    videoModal.classList.add('hidden
                             
