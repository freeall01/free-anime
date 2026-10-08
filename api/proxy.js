export default async function handler(req, res) {
    const { target } = req.query;

    if (!target) {
        return res.status(400).json({ error: "No target URL provided." });
    }

    try {
        const response = await fetch(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        const data = await response.text();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        res.status(200).send(data);
    } catch (error) {
        console.error("Backend Proxy Error:", error);
        res.status(500).json({ error: "Backend failed to fetch the data." });
    }
}
