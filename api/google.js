// Backend Vercel — proxy Google APIs pour SEO Cockpit Riviera Nuisibles
// Évite les restrictions CSP de l'artifact Claude

const ALLOWED_APIS = [
  'searchconsole.googleapis.com',
  'analyticsdata.googleapis.com',
  'analyticsadmin.googleapis.com',
  'www.googleapis.com',
];

export default async function handler(req, res) {
  // CORS — autoriser depuis n'importe où (artifact Claude, fichier local, etc.)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url param required' });

  // Vérifier que l'URL cible est bien une API Google autorisée
  let targetUrl;
  try {
    targetUrl = new URL(decodeURIComponent(url));
  } catch {
    return res.status(400).json({ error: 'invalid url' });
  }

  const isAllowed = ALLOWED_APIS.some(api => targetUrl.hostname === api);
  if (!isAllowed) {
    return res.status(403).json({ error: 'API non autorisée' });
  }

  // Récupérer le token Authorization depuis les headers
  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Authorization header requis' });

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
      },
    };

    if (req.method === 'POST' && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const apiRes = await fetch(targetUrl.toString(), fetchOptions);
    const data = await apiRes.json();

    return res.status(apiRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
