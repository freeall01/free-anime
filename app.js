const ANILIST_API = 'https://graphql.anilist.co';
const AMVSTR_API = 'https://api.amvstr.ml/api/v2/stream';

const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const nativeVideo = document.getElementById('nativeVideo');
const loadingState = document.getElementById('loadingState');
const loadingText = document.getElementById('loadingText');
const fallbackState = document.getElementById('fallbackState');
const fallbackButtons = document.getElementById('fallbackButtons');

let hlsInstance = null;

// 1. Fetch Anime from AniList
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
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Network error. Please check your connection.</div>';
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
        const malId = anime.idMal || anime.id;
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg">
                <div class="relative h-56">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                </div>
                <div class="p-3">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-2">${title}</h3>
                    <button onclick="attemptStream(${anime.id}, ${malId}, '${title.replace(/'/g, "")}')" class="block w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition">
                        ▶ Watch
                    </button>
                </div>
            </div>
        `;
    });
}

// 2. Attempt Native Playback -> Fallback to New Tab
async function attemptStream(anilistId, malId, title) {
    modalTitle.innerText = `Playing: ${title}`;
    videoModal.classList.remove('hidden');
    
    // Reset UI
    if (hlsInstance) { hlsInstance.destroy(); }
    nativeVideo.src = '';
    nativeVideo.classList.add('hidden');
    fallbackState.classList.add('hidden');
    loadingState.classList.remove('hidden');
    loadingText.innerText = "Attempting native connection...";

    try {
        // Try fetching a direct stream from AMVSTR API
        const response = await fetch(`${AMVSTR_API}/${anilistId}`);
        if (!response.ok) throw new Error("API Blocked or Offline");
        
        const data = await response.json();
        if (!data.stream || !data.stream.multi || !data.stream.multi.main) throw new Error("No stream found");

        const streamUrl = data.stream.multi.main.url;

        loadingState.classList.add('hidden');
        nativeVideo.classList.remove('hidden');

        if (Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(streamUrl);
            hlsInstance.attachMedia(nativeVideo);
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => nativeVideo.play());
        } else if (nativeVideo.canPlayType('application/vnd.apple.mpegurl')) {
            nativeVideo.src = streamUrl;
            nativeVideo.play();
        }

    } catch (error) {
        // GUARANTEED FALLBACK: Triggers if ISP blocks the API or CORS fails.
        // It injects highly reliable servers that open in a NEW TAB to prevent black screens.
        loadingState.classList.add('hidden');
        fallbackState.classList.remove('hidden');

        const cleanTitle = encodeURIComponent(title);
        
        fallbackButtons.innerHTML = `
            <a href="https://vidsrc.net/embed/anime?anilist=${anilistId}" target="_blank" class="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                <span>▶ Server 1 (VidSrc Network)</span> <span class="text-xs opacity-75">⧉</span>
            </a>
            <a href="https://autoembed.cc/embed/anime/mal/${malId}/1" target="_blank" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2">
                <span>▶ Server 2 (AutoEmbed)</span> <span class="text-xs opacity-75">⧉</span>
            </a>
            <a href="https://hianime.to/search?keyword=${cleanTitle}" target="_blank" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2 border border-slate-600">
                <span>▶ Server 3 (HiAnime Direct)</span> <span class="text-xs opacity-75">⧉</span>
            </a>
        `;
    }
}

function closePlayer() {
    if (hlsInstance) { hlsInstance.destroy(); }
    nativeVideo.pause();
    nativeVideo.src = '';
    videoModal.classList.add('hidden');
}

let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => fetchAnime(query), 500);
});

fetchAnime();
