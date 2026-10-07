const ANILIST_API = 'https://graphql.anilist.co';

const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');
const videoModal = document.getElementById('videoModal');
const videoFrame = document.getElementById('videoFrame');
const modalTitle = document.getElementById('modalTitle');

let currentAnilistId = null;
let currentMalId = null;
let searchTimer = null;

/* =========================
   ANILIST GRAPHQL QUERY
========================= */

const GRAPHQL_QUERY = `
query ($search: String) {
    Page(page: 1, perPage: 20) {
        media(
            search: $search,
            type: ANIME,
            sort: POPULARITY_DESC
        ) {
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
            status
        }
    }
}
`;

/* =========================
   FETCH ANIME
========================= */

async function fetchAnime(searchQuery = '') {

    animeGrid.innerHTML = `
        <div class="col-span-full text-center py-20 text-slate-400">
            <div class="text-3xl mb-3">⏳</div>
            Loading anime...
        </div>
    `;

    try {

        const response = await fetch(ANILIST_API, {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },

            body: JSON.stringify({
                query: GRAPHQL_QUERY,
                variables: {
                    search: searchQuery || null
                }
            })
        });

        if (!response.ok) {
            throw new Error(`AniList HTTP error: ${response.status}`);
        }

        const result = await response.json();

        if (result.errors) {
            console.error('AniList error:', result.errors);
            throw new Error('AniList API error');
        }

        const animeList = result?.data?.Page?.media || [];

        displayAnime(animeList);

    } catch (error) {

        console.error('Anime loading error:', error);

        animeGrid.innerHTML = `
            <div class="col-span-full text-center py-16">
                <div class="text-4xl mb-3">⚠️</div>

                <p class="text-rose-400 font-semibold">
                    Failed to load anime
                </p>

                <p class="text-slate-500 text-sm mt-2">
                    Check your internet connection and try again.
                </p>

                <button
                    onclick="fetchAnime()"
                    class="mt-5 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-lg text-sm font-semibold"
                >
                    Retry
                </button>
            </div>
        `;
    }
}

/* =========================
   DISPLAY ANIME
========================= */

function displayAnime(animeList) {

    animeGrid.innerHTML = '';

    if (!animeList || animeList.length === 0) {

        animeGrid.innerHTML = `
            <div class="col-span-full text-center text-slate-400 py-16">
                No anime found.
            </div>
        `;

        return;
    }

    animeList.forEach(anime => {

        const title =
            anime?.title?.english ||
            anime?.title?.romaji ||
            'Unknown Anime';

        const imageUrl =
            anime?.coverImage?.large ||
            'https://via.placeholder.com/600x900?text=No+Image';

        const score =
            anime?.averageScore
                ? (anime.averageScore / 10).toFixed(1)
                : 'N/A';

        let episodes = 'Ongoing';

        if (anime?.episodes) {
            episodes = `${anime.episodes} Eps`;
        }

        /*
         IMPORTANT:
         Only use the real MAL ID.
         Do NOT use AniList ID as MAL ID.
        */

        const malId = anime?.idMal || null;

        const card = document.createElement('div');

        card.className = `
            bg-slate-900
            rounded-xl
            overflow-hidden
            border
            border-slate-800
            flex
            flex-col
            justify-between
            shadow-lg
            hover:border-slate-700
            transition
        `;

        card.innerHTML = `
            <div>

                <div class="relative h-48 sm:h-56">

                    <img
                        src="${imageUrl}"
                        alt=""
                        class="w-full h-full object-cover"
                        loading="lazy"
                        onerror="this.src='https://via.placeholder.com/600x900?text=No+Image'"
                    >

                    <span
                        class="absolute top-2 right-2 bg-slate-900/80 backdrop-blur text-xs font-semibold px-2 py-0.5 rounded text-amber-400"
                    >
                        ⭐ ${score}
                    </span>

                </div>

                <div class="p-3">

                    <h3
                        class="text-sm font-bold text-slate-100 line-clamp-1"
                    >
                        ${escapeHTML(title)}
                    </h3>

                    <p class="text-xs text-slate-400 mt-1">
                        Status:
                        <span class="text-rose-400">
                            ${episodes}
                        </span>
                    </p>

                </div>

            </div>

            <div class="p-3 pt-0">

                <button
                    class="watch-btn block w-full text-center bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2.5 rounded-lg transition shadow"
                >
                    ▶ Watch Video
                </button>

            </div>
        `;

        const watchButton = card.querySelector('.watch-btn');

        watchButton.addEventListener('click', () => {
            playAnime(anime.id, malId, title);
        });

        animeGrid.appendChild(card);
    });
}

/* =========================
   PLAY ANIME
========================= */

function playAnime(anilistId, malId, title) {

    currentAnilistId = anilistId;
    currentMalId = malId;

    modalTitle.textContent = `Streaming: ${title}`;

    videoModal.classList.remove('hidden');

    document.body.style.overflow = 'hidden';

    /*
       Start with Server 1
    */

    switchServer('server1');
}

/* =========================
   SERVER SWITCH
========================= */

function switchServer(serverName) {

    const btn1 = document.getElementById('btn-server1');
    const btn2 = document.getElementById('btn-server2');

    if (btn1) {
        btn1.className =
            'px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap transition';
    }

    if (btn2) {
        btn2.className =
            'px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 whitespace-nowrap transition';
    }

    /*
       Server 1
    */

    if (serverName === 'server1') {

        if (!currentAnilistId) {
            showPlayerError('Anime ID is missing.');
            return;
        }

        /*
           External embed.
           If the provider is unavailable, use Server 2.
        */

        videoFrame.src =
            `https://vidsrc.me/embed/anime?anilist=${currentAnilistId}`;

        if (btn1) {
            btn1.className =
                'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow';
        }

    }

    /*
       Server 2
    */

    else if (serverName === 'server2') {

        if (!currentMalId) {

            showPlayerError(
                'This anime does not have a MyAnimeList ID.'
            );

            return;
        }

        videoFrame.src =
            `https://embed.su/embed/anime/${currentMalId}`;

        if (btn2) {
            btn2.className =
                'px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold whitespace-nowrap transition shadow';
        }
    }
}

/* =========================
   PLAYER ERROR
========================= */

function showPlayerError(message) {

    videoFrame.src = 'about:blank';

    videoFrame.insertAdjacentHTML(
        'afterend',
        `
        <div
            id="playerError"
            class="absolute inset-0 flex items-center justify-center bg-black text-center p-6"
        >
            <div>
                <div class="text-4xl mb-3">⚠️</div>

                <p class="text-rose-400 font-semibold">
                    ${escapeHTML(message)}
                </p>

                <p class="text-slate-500 text-xs mt-2">
                    Try another server.
                </p>
            </div>
        </div>
        `
    );
}

/* =========================
   CLOSE PLAYER
========================= */

function closePlayer() {

    videoFrame.src = '';

    videoModal.classList.add('hidden');

    document.body.style.overflow = '';

    const playerError = document.getElementById('playerError');

    if (playerError) {
        playerError.remove();
    }
}

/* =========================
   SEARCH
========================= */

if (searchInput) {

    searchInput.addEventListener('input', event => {

        clearTimeout(searchTimer);

        const query = event.target.value.trim();

        searchTimer = setTimeout(() => {

            fetchAnime(query);

        }, 500);
    });
}

/* =========================
   ESC KEY
========================= */

document.addEventListener('keydown', event => {

    if (event.key === 'Escape') {
        closePlayer();
    }

});

/* =========================
   SAFE HTML
========================= */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/* =========================
   START APP
========================= */

fetchAnime();
