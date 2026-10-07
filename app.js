// Primary API: Jikan (MyAnimeList)
const JIKAN_API = 'https://api.jikan.moe/v4/seasons/now';
const JIKAN_SEARCH = 'https://api.jikan.moe/v4/anime?q=';

const animeGrid = document.getElementById('animeGrid');
const searchInput = document.getElementById('searchInput');

// Fallback API: AniList (GraphQL) - অত্যন্ত শক্তিশালী এবং ব্যাকআপ হিসেবে দারুণ কাজ করে
const ANILIST_API = 'https://graphql.anilist.co';

async function fetchAnime(query = '') {
    animeGrid.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">Loading live anime feed from multi-sources...</div>';

    // ১. প্রথমে প্রাইমারি Jikan API দিয়ে ট্রাই করব
    try {
        let url = query ? `${JIKAN_SEARCH}${encodeURIComponent(query)}&limit=16` : JIKAN_API;
        let response = await fetch(url);
        
        if (!response.ok) throw new Error('Jikan API failed');
        
        let data = await response.json();
        if (data.data && data.data.length > 0) {
            displayAnime(data.data, 'jikan');
            return;
        }
    } catch (jikanError) {
        console.warn('Jikan API error, switching to backup AniList API...', jikanError);
    }

    // ২. প্রাইমারি ফেইল করলে ব্যাকআপ হিসেবে AniList API ব্যবহার করব (যাতে সাইট বন্ধ না হয়)
    try {
        const graphqlQuery = `
            query {
                Page (page: 1, perPage: 16) {
                    media (status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
                        title {
                            english
                            romaji
                        }
                        coverImage {
                            large
                        }
                        averageScore
                        episodes
                        siteUrl
                    }
                }
            }
        `;

        let response = await fetch(ANILIST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query: graphqlQuery })
        });

        let result = await response.json();
        let animeList = result.data.Page.media.map(anime => ({
            title: anime.title.english || anime.title.romaji,
            images: { jpg: { image_url: anime.coverImage.large } },
            score: anime.averageScore ? (anime.averageScore / 10).toFixed(1) : 'N/A',
            episodes: anime.episodes || 'Ongoing',
            url: anime.siteUrl
        }));

        displayAnime(animeList, 'anilist');
    } catch (backupError) {
        console.error('All APIs failed:', backupError);
        animeGrid.innerHTML = '<div class="col-span-full text-center text-rose-500 py-10">⚠️ All streaming data sources are currently busy. Please refresh in a moment!</div>';
    }
}

function displayAnime(animeList, source) {
    animeGrid.innerHTML = '';
    
    if (!animeList || animeList.length === 0) {
        animeGrid.innerHTML = '<div class="col-span-full text-center text-slate-400 py-10">No anime found.</div>';
        return;
    }

    animeList.forEach(anime => {
        let title, imageUrl, score, episodes, siteUrl;

        if (source === 'jikan') {
            title = anime.title_english || anime.title;
            imageUrl = anime.images.jpg.image_url;
            score = anime.score ? anime.score : 'N/A';
            episodes = anime.episodes ? `${anime.episodes} Eps` : 'Ongoing';
            siteUrl = anime.url;
        } else {
            title = anime.title;
            imageUrl = anime.images.jpg.image_url;
            score = anime.score;
            episodes = anime.episodes;
            siteUrl = anime.url;
        }
        
        animeGrid.innerHTML += `
            <div class="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex flex-col justify-between shadow-lg hover:border-slate-700 transition">
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
                    <a href="${siteUrl}" target="_blank" class="block w-full text-center bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold py-2 rounded-lg transition">Watch / Details</a>
                </div>
            </div>
        `;
    });
}

// Search handling with delay
let searchTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const query = e.target.value.trim();
    searchTimer = setTimeout(() => {
        if (query.length > 2) {
            fetchAnime(query);
        } else if (query.length === 0) {
            fetchAnime('');
        }
    }, 500);
});

// Initial load
fetchAnime('');
