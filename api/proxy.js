export default async function handler(req, res) {
    const { target } = req.query;

    if (!target) {
        return res.status(400).json({ error: "No target URL provided." });
    }

    try {
        const response = await fetch(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        // CORS বাইপাস করার জন্য হেডার
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/json');

        res.status(200).json(data);
    } catch (error) {
        console.error("Proxy Error:", error);
        res.status(500).json({ error: "Backend failed to fetch data." });
    }
}
