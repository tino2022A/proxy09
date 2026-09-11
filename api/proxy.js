export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).send('URL missing');
    
    try {
        const response = await fetch(decodeURIComponent(url));
        const data = await response.arrayBuffer();
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers.get('content-type'));
        res.send(Buffer.from(data));
    } catch (e) {
        res.status(500).send('Proxy error');
    }
}
