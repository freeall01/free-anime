const ANILIST_API = 'https://graphql.anilist.co';
const BASE_CONSUMET_API = 'https://api-consumet-org-six-sandy.vercel.app/meta/anilist';

const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const epInput = document.getElementById('epInput');
const nativePlayer = document.getElementById('nativePlayer');
const loadingStatus = document.getElementById('loadingStatus');
const statusText = document.getElementById('statusText');

let currentAnilistId = null;
let currentTitle = '';
let hlsInstance = null;

// 1. Fetch Anime Catalog
async function fetchAnime(searchQuery = '') {
    if (!animeGrid) return;
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400 animate-pulse">Loading catalog...</div>';

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
            body: JSON.stringify({ query: graphqlQuery, variables: { search: searchQuery ? searchQuery : null } })
        });

        const result = await response.json();
        if (result.data && result.data.Page && result.data.Page.media) {
            displayAnime(result.data.Page.media);
        } else {
            throw new Error("No data found");
        }
    } catch (error) {
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Failed to connect to database.</div>';
    }
}

// 2. Display Catalog
function displayAnime(animeList) {
    animeGrid.innerHTML = '';
    if (!animeList || animeList.length === 0) {
        animeGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10">No anime found.</div>';
        return;
    }

    animeList.forEach(anime => {
        const title = anime.title.english || anime.title.romaji || "Unknown Title";
        const imageUrl = anime.coverImage ? anime.coverImage.large : '';
        const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A';
        const episodes = anime.episodes ? `${anime.episodes} Eps` : 'Ongoing';
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg">
                <div class="relative h-48 sm:h-56">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                    <span class="absolute top-2 right-2 bg-slate-900/90 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                </div>
                <div class="p-3">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-1">${title}</h3>
                    <p class="text-xs text-slate-400 mb-3">Status: <span class="text-rose-400 font-medium">${episodes}</span></p>
                    <button onclick="openPlayer(${anime.id}, '${safeTitle}')" class="block w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
                        ▶ Extract & Play
                    </button>
                </div>
            </div>
        `;
    });
}

function openPlayer(id, title) {
    currentAnilistId = id;
    currentTitle = title;
    if (epInput) epInput.value = 1;
    if (videoModal) videoModal.classList.remove('hidden');
    loadEpisode();
}

// 3. Extract Video via Backend Proxy
async function loadEpisode() {
    const epNumber = parseInt(epInput.value) || 1;
    if (modalTitle) modalTitle.innerText = `Streaming: ${currentTitle} (Ep ${epNumber})`;
    
    // Reset Player UI
    if (hlsInstance) { hlsInstance.destroy(); }
    nativePlayer.src = '';
    nativePlayer.classList.add('hidden');
    loadingStatus.classList.remove('hidden');
    statusText.innerText = `Fetching Episode ${epNumber} via Proxy...`;

    try {
        // Step A: Fetch Episode ID using our Vercel Backend Proxy
        const infoTarget = encodeURIComponent(`${BASE_CONSUMET_API}/info/${currentAnilistId}`);
        const infoRes = await fetch(`/api/proxy?target=${infoTarget}`);
        const infoStr = await infoRes.text();
        const infoData = JSON.parse(infoStr);

        const episode = infoData.episodes.find(e => e.number === epNumber) || infoData.episodes[epNumber - 1];
        if (!episode) throw new Error("Episode not found in API.");

        // Step B: Fetch Stream Links using our Vercel Backend Proxy
        statusText.innerText = `Bypassing ISP to extract video...`;
        const watchTarget = encodeURIComponent(`${BASE_CONSUMET_API}/watch/${episode.id}`);
        const watchRes = await fetch(`/api/proxy?target=${watchTarget}`);
        const watchStr = await watchRes.text();
        const watchData = JSON.parse(watchStr);
        
        if (!watchData.sources || watchData.sources.length === 0) throw new Error("No video sources found.");

        const source = watchData.sources.find(s => s.quality === '1080p' || s.quality === 'auto' || s.quality === 'default') || watchData.sources[0];
        playNativeStream(source.url);

    } catch (error) {
        console.error(error);
        statusText.innerText = "Error: Stream blocked or API offline. Try another anime.";
    }
}

// 4. Play Extracted Video
function playNativeStream(streamUrl) {
    loadingStatus.classList.add('hidden');
    nativePlayer.classList.remove('hidden');

    if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(nativePlayer);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function () {
            nativePlayer.play();
        });
    } else if (nativePlayer.canPlayType('application/vnd.apple.mpegurl')) {
        nativePlayer.src = streamUrl;
        nativePlayer.play();
    }
}

function closePlayer() {
    if (hlsInstance) { hlsInstance.destroy(); }
    nativePlayer.pause();
    nativePlayer.src = '';
    videoModal.classList.add('hidden');
}

let searchTimer;
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        const query = e.target.value.trim();
        searchTimer = setTimeout(() => fetchAnime(query), 500);
    });
}

fetchAnime();
