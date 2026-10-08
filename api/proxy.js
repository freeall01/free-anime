export default async function handler(req, res) {
    // 1. Get the blocked URL that the frontend wants to access
    const { target } = req.query;

    if (!target) {
        return res.status(400).json({ error: "No target URL provided." });
    }

    try {
        // 2. The Vercel Server (in the USA) fetches the blocked URL securely
        const response = await fetch(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                // Many anime servers require a fake referer to allow the connection
                'Referer': new URL(target).origin 
            }
        });

        // 3. Grab the raw data (JSON, text, or m3u8 playlists)
        const data = await response.text();

        // 4. Attach CORS headers so your frontend is allowed to read this data
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        // Pass along the correct content type
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // 5. Send the unblocked data back to the Indian user's phone
        res.status(200).send(data);

    } catch (error) {
        console.error("Backend Proxy Error:", error);
        res.status(500).json({ error: "Backend failed to fetch the data." });
    }
}
