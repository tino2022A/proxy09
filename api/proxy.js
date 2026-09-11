export default async function handler(req, res) {
  const { url: targetUrl } = req.query;
  if (!targetUrl) return res.status(400).send('URL missing');

  try {
    const response = await fetch(decodeURIComponent(targetUrl), {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) throw new Error('Origin error');

    const contentType = response.headers.get('content-type');
    
    // SI ES UN ARCHIVO DE TEXTO (M3U8), REESCRIBIMOS LAS RUTAS
    if (contentType && (contentType.includes('mpegurl') || contentType.includes('application/x-mpegURL'))) {
      let manifestText = await response.text();
      const originBase = new URL(decodeURIComponent(targetUrl));
      const proxyBase = `https://${req.headers.host}/api/proxy?url=`;

      const rewritten = manifestText.split('\n').map(line => {
        line = line.trim();
        if (!line) return line;
        if (!line.startsWith('#')) {
          // Convertimos ruta relativa en absoluta y la pasamos por el proxy
          const absolute = new URL(line, originBase).href;
          return `${proxyBase}${encodeURIComponent(absolute)}`;
        }
        return line;
      }).join('\n');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      return res.status(200).send(rewritten);
    }

    // SI ES UN SEGMENTO DE VIDEO (TS), LO ENVIAMOS DIRECTO
    const data = await response.arrayBuffer();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(data));

  } catch (e) {
    res.status(500).send('Proxy error: ' + e.message);
  }
}
