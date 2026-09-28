const ALLOWED_APIS = [
  'searchconsole.googleapis.com',
  'analyticsdata.googleapis.com',
  'analyticsadmin.googleapis.com',
  'www.googleapis.com',
];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url param required' });

  const rawUrl = decodeURIComponent(url);
  let hostname;
  try { hostname = new URL(rawUrl).hostname; }
  catch (e) { return res.status(400).json({ error: 'invalid url: ' + e.message }); }

  const isAllowed = ALLOWED_APIS.some(api => hostname === api);
  if (!isAllowed) return res.status(403).json({ error: 'hostname non autorise: ' + hostname });

  const auth = req.headers['authorization'];
  if (!auth) return res.status(401).json({ error: 'Authorization header requis' });

  try {
    const fetchOptions = {
      method: req.method,
      headers: {
        'Authorization': auth,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      redirect: 'manual',
    };

    if (req.method === 'POST') {
      const body = req.body ? JSON.stringify(req.body) : null;
      if (body) fetchOptions.body = body;
    }

    const apiRes = await fetch(rawUrl, fetchOptions);

    if (apiRes.status >= 300 && apiRes.status < 400) {
      return res.status(401).json({
        error: 'Token expire ou invalide (Google redirige vers login)',
        status: apiRes.status,
        location: apiRes.headers.get('location')
      });
    }

    const text = await apiRes.text();

    try {
      const data = JSON.parse(text);
      return res.status(apiRes.status).json(data);
    } catch(e) {
      return res.status(500).json({
        error: 'Reponse non-JSON de Google',
        status: apiRes.status,
        preview: text.substring(0, 300),
        url: rawUrl
      });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
