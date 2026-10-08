export default async function handler(req, res) {
    const { target } = req.query;

    if (!target) {
        return res.status(400).json({ error: "No target URL provided." });
    }

    // CORS বাইপাস করার জন্য
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // আসল ব্রাউজারের মতো রিকোয়েস্ট পাঠানোর জন্য Headers
        const response = await fetch(target, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://api.amvstr.me/',
                'Origin': 'https://api.amvstr.me'
            }
        });

        // যদি API ব্লক করে দেয় (JSON না দেয়), তবে ক্র্যাশ ঠেকানোর লজিক
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const data = await response.json();
            return res.status(200).json(data);
        } else {
            const text = await response.text();
            return res.status(502).json({ error: "API blocked the Vercel request.", details: text.substring(0, 100) });
        }

    } catch (error) {
        return res.status(500).json({ error: "Vercel Backend execution failed.", details: error.message });
    }
}
