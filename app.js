const ANILIST_API = 'https://graphql.anilist.co';
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

// Multi-API Backup System (If one goes down, the next one takes over)
const API_MIRRORS = [
    'https://api-consumet-org-six-sandy.vercel.app/meta/anilist',
    'https://consumet-api.herokuapp.com/meta/anilist',
    'https://consumet-anime-api.vercel.app/meta/anilist'
];

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
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Network Error. Check connection.</div>';
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
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg hover:border-slate-700 transition">
                <div>
                    <div class="relative h-48 sm:h-56">
                        <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                        <span class="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                    </div>
                    <div class="p-3">
                        <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-1">${title}</h3>
                        <p class="text-xs text-slate-400 mb-2">Status: <span class="text-rose-400">${episodes}</span></p>
                    </div>
                </div>
                <div class="p-3 pt-0">
                    <button onclick="openPlayer(${anime.id}, '${title.replace(/'/g, "")}')" class="block w-full text-center bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
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
    epInput.value = 1;
    videoModal.classList.remove('hidden');
    
    loadEpisode();
}

async function loadEpisode() {
    const epNumber = parseInt(epInput.value) || 1;
    modalTitle.innerText = `Streaming: ${currentTitle} (Ep ${epNumber})`;
    
    // Reset Player UI
    if (hlsInstance) { hlsInstance.destroy(); }
    nativePlayer.src = '';
    nativePlayer.classList.add('hidden');
    loadingStatus.classList.remove('hidden');
    statusText.innerText = `Extracting Episode ${epNumber}...`;

    let extractedStreamUrl = null;

    // Loop through API mirrors until one succeeds
    for (const baseUrl of API_MIRRORS) {
        try {
            statusText.innerText = `Connecting to extraction server...`;
            const infoRes = await fetch(`${baseUrl}/info/${currentAnilistId}`);
            if (!infoRes.ok) continue;
            
            const info = await infoRes.json();
            
            // Find the correct episode ID
            const episode = info.episodes.find(e => e.number === epNumber) || info.episodes[epNumber - 1] || info.episodes[0];
            if (!episode) continue;

            statusText.innerText = `Bypassing security for Episode ${epNumber}...`;
            const watchRes = await fetch(`${baseUrl}/watch/${episode.id}`);
            if (!watchRes.ok) continue;
            
            const watchData = await watchRes.json();
            
            if (watchData.sources && watchData.sources.length > 0) {
                // Find highest quality stream
                const source = watchData.sources.find(s => s.quality === '1080p' || s.quality === 'auto' || s.quality === 'default') || watchData.sources[0];
                extractedStreamUrl = source.url;
                break; // We found the video, stop looping!
            }
        } catch (error) {
            console.log(`Mirror failed, trying next...`);
        }
    }

    if (extractedStreamUrl) {
        playNativeStream(extractedStreamUrl);
    } else {
        statusText.innerText = "Error: Stream blocked or not found. Try a different anime.";
    }
}

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
        // Native support for Safari/iOS
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
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => fetchAnime(query), 500);
});

fetchAnime();
