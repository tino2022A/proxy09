export default async function handler(req, res) {
  const { url: targetUrl } = req.query;
  if (!targetUrl) return res.status(400).send('URL missing');

  try {
    const response = await fetch(decodeURIComponent(targetUrl), {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    });

    if (!response.ok) throw new Error(`Origin error: ${response.status}`);

    const contentType = response.headers.get('content-type') || "";
    
    // Si es una lista de reproducción (m3u8), reescribimos las rutas para que pasen por el proxy
    if (contentType.includes('mpegurl') || contentType.includes('application/vnd.apple.mpegurl') || targetUrl.includes('m3u8')) {
      let manifestText = await response.text();
      const originBase = new URL(decodeURIComponent(targetUrl));
      const proxyBase = `https://${req.headers.host}/api/proxy?url=`;

      const rewritten = manifestText.split('\n').map(line => {
        line = line.trim();
        if (!line || line.startsWith('#')) return line;
        // Resolvemos rutas relativas a absolutas y las enviamos al proxy
        try {
          const absolute = new URL(line, originBase).href;
          return `${proxyBase}${encodeURIComponent(absolute)}`;
        } catch(e) { return line; }
      }).join('\n');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(200).send(rewritten);
    }

    // Si es un segmento de video (.ts) o cualquier otro binario
    const buffer = await response.arrayBuffer();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType || 'video/mp2t');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(Buffer.from(buffer));

  } catch (e) {
    console.error(e);
    res.status(500).send('Proxy error: ' + e.message);
  }
}
