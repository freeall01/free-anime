const ANILIST_API = 'https://graphql.anilist.co';
// High-speed direct extraction API
const EXTRACTION_API = 'https://api.amvstr.ml/api/v2/stream';

const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const nativeVideo = document.getElementById('nativeVideo');
const loadingStatus = document.getElementById('loadingStatus');
const statusText = document.getElementById('statusText');
const fallbackStatus = document.getElementById('fallbackStatus');
const fallbackButtons = document.getElementById('fallbackButtons');

let hlsInstance = null;

async function fetchAnime(searchQuery = '') {
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Loading catalog...</div>';

    try {
        const graphqlQuery = `
            query ($search: String) {
                Page (page: 1, perPage: 25) {
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
        const malId = anime.idMal || anime.id;
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg">
                <div class="relative h-48 sm:h-56">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                    <span class="absolute top-2 right-2 bg-slate-900/90 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                </div>
                <div class="p-3">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-1">${title}</h3>
                    <p class="text-xs text-slate-400 mb-3">Status: <span class="text-emerald-400 font-medium">${episodes}</span></p>
                    <button onclick="startStream(${anime.id}, ${malId}, '${title.replace(/'/g, "")}')" class="block w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
                        ▶ Play Video
                    </button>
                </div>
            </div>
        `;
    });
}

async function startStream(anilistId, malId, title) {
    modalTitle.innerText = `Playing: ${title}`;
    videoModal.classList.remove('hidden');
    
    // Reset UI
    if (hlsInstance) { hlsInstance.destroy(); }
    nativeVideo.src = '';
    nativeVideo.classList.add('hidden');
    fallbackStatus.classList.add('hidden');
    loadingStatus.classList.remove('hidden');
    statusText.innerText = "Extracting raw stream...";

    try {
        // Step 1: Fetch raw .m3u8 URL from extraction API
        const response = await fetch(`${EXTRACTION_API}/${anilistId}`);
        if (!response.ok) throw new Error("API Blocked");
        
        const data = await response.json();
        if (!data.stream || !data.stream.multi || !data.stream.multi.main) throw new Error("Stream missing");

        const streamUrl = data.stream.multi.main.url;

        // Step 2: Initialize Native Video Player
        loadingStatus.classList.add('hidden');
        nativeVideo.classList.remove('hidden');

        if (Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(streamUrl);
            hlsInstance.attachMedia(nativeVideo);
            
            // Listen for fatal network errors (ISP blocking the video chunks)
            hlsInstance.on(Hls.Events.ERROR, function (event, data) {
                if (data.fatal) {
                    triggerFallback(title, malId);
                }
            });

            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => nativeVideo.play());
        } else if (nativeVideo.canPlayType('application/vnd.apple.mpegurl')) {
            nativeVideo.src = streamUrl;
            nativeVideo.play();
        }

    } catch (error) {
        triggerFallback(title, malId);
    }
}

function triggerFallback(title, malId) {
    // If the native stream fails due to ISP network blocking, show Unblocked External Links
    if (hlsInstance) { hlsInstance.destroy(); }
    nativeVideo.pause();
    nativeVideo.classList.add('hidden');
    loadingStatus.classList.add('hidden');
    fallbackStatus.classList.remove('hidden');
    fallbackStatus.classList.add('flex');

    const cleanTitle = encodeURIComponent(title);
    
    // These domains are specifically chosen because they currently evade Airtel/Jio blocking
    fallbackButtons.innerHTML = `
        <a href="https://anitaku.pe/search.html?keyword=${cleanTitle}" target="_blank" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2">
            <span>▶ Watch on Anitaku (Unblocked)</span> <span class="text-xs opacity-75">⧉</span>
        </a>
        <a href="https://www.miruro.tv/watch?id=${malId}" target="_blank" class="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg text-sm flex items-center justify-center gap-2">
            <span>▶ Watch on Miruro (Ad-Free)</span> <span class="text-xs opacity-75">⧉</span>
        </a>
    `;
}

function closePlayer() {
    if (hlsInstance) { hlsInstance.destroy(); }
    nativeVideo.pause();
    nativeVideo.src = '';
    videoModal.classList.add('hidden');
    fallbackStatus.classList.add('hidden');
    fallbackStatus.classList.remove('flex');
}

let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => fetchAnime(query), 500);
});

fetchAnime();
