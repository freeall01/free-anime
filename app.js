const ANILIST_API = 'https://graphql.anilist.co';
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const modalTitle = document.getElementById('modalTitle');
const nativeVideoPlayer = document.getElementById('nativeVideoPlayer');
const playerMessage = document.getElementById('playerMessage');

let hlsInstance = null;

async function fetchAnime(searchQuery = '') {
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Loading anime catalog...</div>';

    try {
        const graphqlQuery = `
            query ($search: String) {
                Page (page: 1, perPage: 20) {
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
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Failed to connect to anime database.</div>';
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
                <div>
                    <div class="relative h-48 sm:h-56">
                        <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                        <span class="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs font-semibold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                    </div>
                    <div class="p-3">
                        <h3 class="text-sm font-bold text-slate-100 line-clamp-1">${title}</h3>
                        <p class="text-xs text-slate-400 mt-1">Status: <span class="text-rose-400">${episodes}</span></p>
                    </div>
                </div>
                <div class="p-3 pt-0">
                    <button onclick="playNativeAnime(${anime.id}, '${title.replace(/'/g, "")}', '${imageUrl}')" class="block w-full text-center bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 rounded-lg transition">
                        ▶ Watch Video
                    </button>
                </div>
            </div>
        `;
    });
}

function playNativeAnime(id, title, posterUrl) {
    modalTitle.innerText = `Now Playing: ${title}`;
    videoModal.classList.remove('hidden');
    nativeVideoPlayer.poster = posterUrl;
    playerMessage.innerText = "Connecting to stream server...";

    const streamUrl = `https://corsproxy.io/?https://anime-k-api.vercel.app/watch/${id}-episode-1`;

    if (hlsInstance) {
        hlsInstance.destroy();
    }

    if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(streamUrl);
        hlsInstance.attachMedia(nativeVideoPlayer);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
            playerMessage.innerText = "";
            nativeVideoPlayer.play().catch(e => {
                playerMessage.innerText = "Tap play button to start video.";
            });
        });
        hlsInstance.on(Hls.Events.ERROR, function(event, data) {
            playerMessage.innerText = "Stream playback error. Try another anime.";
        });
    } else if (nativeVideoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
        nativeVideoPlayer.src = streamUrl;
        playerMessage.innerText = "";
        nativeVideoPlayer.play();
    }
}

function closePlayer() {
    if (hlsInstance) {
        hlsInstance.destroy();
    }
    nativeVideoPlayer.pause();
    nativeVideoPlayer.src = '';
    videoModal.classList.add('hidden');
}

let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => {
        fetchAnime(query);
    }, 500);
});

fetchAnime();
