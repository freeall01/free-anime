export default async function handler(req, res) {
    const { target } = req.query;
    if (!target) return res.status(400).json({ error: "No target" });

    try {
        const response = await fetch(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });
        const data = await response.json();
        
        // Headers to bypass CORS on your frontend
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'application/json');
        
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Backend failed" });
    }
}
