const ANILIST_API = 'https://graphql.anilist.co';
const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const videoFrame = document.getElementById('videoFrame');
const modalTitle = document.getElementById('modalTitle');
const epInput = document.getElementById('epInput');
const externalLinkBtn = document.getElementById('externalLinkBtn');

let currentAnilistId = null;
let currentMalId = null;
let currentServer = 'vidsrcxyz';

// Fetch Anime from AniList API
async function fetchAnime(searchQuery = '') {
    if (!animeGrid) return;
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400 font-medium animate-pulse">Loading catalog...</div>';

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
        
        if (result.data && result.data.Page && result.data.Page.media) {
            displayAnime(result.data.Page.media);
        } else {
            throw new Error("No data found");
        }
    } catch (error) {
        console.error("API Error:", error);
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">Failed to connect to database. Please check your internet connection.</div>';
    }
}

// Display Anime Cards
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
        const malId = anime.idMal || anime.id;
        const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg">
                <div class="relative h-48 sm:h-56">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-full object-cover">
                    <span class="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs font-bold px-2 py-0.5 rounded text-amber-400">⭐ ${score}</span>
                </div>
                <div class="p-3">
                    <h3 class="text-sm font-bold text-slate-100 line-clamp-1 mb-1">${title}</h3>
                    <p class="text-xs text-slate-400 mb-3">Status: <span class="text-rose-400 font-medium">${episodes}</span></p>
                    <button onclick="playAnime(${anime.id}, ${malId}, '${safeTitle}')" class="block w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-lg transition shadow">
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
    
    if (modalTitle) modalTitle.innerText = `Streaming: ${title}`;
    if (epInput) epInput.value = 1; 
    
    switchServer('vidsrcxyz');
    if (videoModal) videoModal.classList.remove('hidden');
}

function updateStream() {
    if (currentAnilistId) {
        switchServer(currentServer);
    }
}

function switchServer(serverName) {
    currentServer = serverName;
    const ep = epInput ? (epInput.value || 1) : 1;
    
    const btn1 = document.getElementById('btn-vidsrccc');
    const btn2 = document.getElementById('btn-autoembed');

    if (btn1) {
        btn1.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap transition shrink-0';
        btn1.innerText = 'Server 1 (XYZ)';
    }
    if (btn2) {
        btn2.className = 'px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap transition shrink-0';
        btn2.innerText = 'Server 2 (SU)';
    }

    let targetUrl = '';

    // Using fresh domains that actively evade Indian ISP blocks
    if (serverName === 'vidsrcxyz') {
        targetUrl = `https://vidsrc.xyz/embed/anime?anilist=${currentAnilistId}&ep=${ep}`;
        if (btn1) btn1.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow shrink-0';
    } else if (serverName === 'autoembed') {
        // Switching from autoembed to embed.su as a highly resilient backup
        targetUrl = `https://embed.su/embed/anime/${currentMalId}?episode=${ep}`;
        if (btn2) btn2.className = 'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow shrink-0';
    }

    if (videoFrame) {
        videoFrame.src = targetUrl;
    }
    if (externalLinkBtn) {
        externalLinkBtn.href = targetUrl;
    }
}

function closePlayer() {
    if (videoFrame) videoFrame.src = '';
    if (videoModal) videoModal.classList.add('hidden');
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
