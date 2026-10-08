const ANILIST_API = 'https://graphql.anilist.co';
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const epInput = document.getElementById('epInput');

// Player Variables
const nativePlayer = document.getElementById('nativePlayer');
let playerInstance;
let hlsInstance;
let currentAnilistId = null;

// --- 1. FETCH AND DISPLAY ANIME CATALOG ---
async function fetchAnime(searchQuery = '') {
    if (!animeGrid) return;
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400 font-medium animate-pulse">Loading catalog...</div>';

    try {
        const graphqlQuery = `
            query ($search: String) {
                Page (page: 1, perPage: 24) {
                    media (search: $search, status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
                        id
                        title { english romaji }
                        coverImage { large }
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
                    <button onclick="playAnime(${anime.id}, '${safeTitle}')" class="block w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
                        ▶ Watch Video
                    </button>
                </div>
            </div>
        `;
    });
}

// --- 2. PLAYER LOGIC AND ROUTING ---
function playAnime(anilistId, title) {
    currentAnilistId = anilistId;
    if (modalTitle) modalTitle.innerText = `Streaming: ${title}`;
    if (epInput) epInput.value = 1; 
    
    videoModal.classList.remove('hidden');
    fetchAndPlayStream(anilistId, 1);
}

function changeEpisode() {
    const ep = epInput ? (epInput.value || 1) : 1;
    if (currentAnilistId) {
        fetchAndPlayStream(currentAnilistId, ep);
    }
}

async function fetchAndPlayStream(anilistId, episodeNumber) {
    try {
        if (modalTitle) modalTitle.innerText = `Loading Episode ${episodeNumber}...`;

        // 1. Fetch Anime Info securely through your Vercel Backend Proxy
        const infoUrl = encodeURIComponent(`https://api.amvstr.me/api/v2/info/${anilistId}`);
        const infoRes = await fetch(`/api/proxy?target=${infoUrl}`);
        
        if (!infoRes.ok) throw new Error("Backend Proxy failed to connect.");
        const infoData = await infoRes.json();
        
        // 2. Find the correct episode ID
        const epData = infoData.episodes?.find(e => Number(e.number) === Number(episodeNumber));
        if (!epData) {
            if (modalTitle) modalTitle.innerText = `Episode ${episodeNumber} not found!`;
            return;
        }

        if (modalTitle) modalTitle.innerText = `Extracting Video File...`;

        // 3. Fetch the M3U8 stream securely through your Vercel Backend Proxy
        const streamUrl = encodeURIComponent(`https://api.amvstr.me/api/v2/stream/${epData.id}`);
        const streamRes = await fetch(`/api/proxy?target=${streamUrl}`);
        const streamData = await streamRes.json();
        
        // 4. Extract the primary M3U8 URL
        let m3u8Url = '';
        if (streamData?.stream?.multi?.main?.url) {
            m3u8Url = streamData.stream.multi.main.url;
        } else if (streamData?.stream?.multi?.backup?.url) {
            m3u8Url = streamData.stream.multi.backup.url;
        }

        if (!m3u8Url) {
            if (modalTitle) modalTitle.innerText = `Failed to load video stream.`;
            return;
        }

        // 5. Success! Feed it to the custom player
        if (modalTitle) modalTitle.innerText = `Streaming Episode ${episodeNumber}`;
        initCustomPlayer(m3u8Url);
        
    } catch (error) {
        if (modalTitle) modalTitle.innerText = "Error connecting to streaming API.";
        console.error("Fetch Error:", error);
    }
}

// --- 3. CORE HLS AND PLYR ENGINE ---
function initCustomPlayer(m3u8Url) {
    if (hlsInstance) { hlsInstance.destroy(); }
    if (playerInstance) { playerInstance.destroy(); }

    const defaultOptions = {
        controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'],
        settings: ['quality', 'speed'],
    };

    if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(m3u8Url);
        hlsInstance.attachMedia(nativePlayer);
        
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function (event, data) {
            const availableQualities = hlsInstance.levels.map((l) => l.height);
            defaultOptions.quality = {
                default: availableQualities[0],
                options: availableQualities,
                forced: true,
                onChange: (e) => updateQuality(e),
            };

            playerInstance = new Plyr(nativePlayer, defaultOptions);
            playerInstance.play(); 
        });
    } else if (nativePlayer.canPlayType('application/vnd.apple.mpegurl')) {
        nativePlayer.src = m3u8Url;
        playerInstance = new Plyr(nativePlayer, defaultOptions);
        playerInstance.play();
    }
}

function updateQuality(newQuality) {
    if (hlsInstance) {
        hlsInstance.levels.forEach((level, levelIndex) => {
            if (level.height === newQuality) {
                hlsInstance.currentLevel = levelIndex;
            }
        });
    }
}

function closePlayer() {
    if (playerInstance) { playerInstance.stop(); }
    if (hlsInstance) { hlsInstance.destroy(); }
    videoModal.classList.add('hidden');
}

// --- 4. SEARCH LISTENER ---
let searchTimer;
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        const query = e.target.value.trim();
        searchTimer = setTimeout(() => fetchAnime(query), 500);
    });
}

// Initialize Catalog
fetchAnime();
