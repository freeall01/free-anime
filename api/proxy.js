export default async function handler(req, res) {
    const { target } = req.query;
    if (!target) return res.status(400).json({ error: "No target URL provided." });

    try {
        const response = await fetch(target);
        const contentType = response.headers.get("content-type");
        
        // CORS Bypass Headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return res.status(200).json(data);
        } else {
            return res.status(502).json({ error: "Target API did not return valid JSON data." });
        }
    } catch (error) {
        return res.status(500).json({ error: "Vercel Proxy Server Error." });
    }
}
