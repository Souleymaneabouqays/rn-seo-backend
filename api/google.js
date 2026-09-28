const https = require('https');

const ALLOWED_APIS = [
  'searchconsole.googleapis.com',
  'analyticsdata.googleapis.com',
  'analyticsadmin.googleapis.com',
  'www.googleapis.com',
];

module.exports = function handler(req, res) {
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

  const afterScheme = rawUrl.indexOf('//') + 2;
  const pathStart = rawUrl.indexOf('/', afterScheme);
  const rawPath = pathStart === -1 ? '/' : rawUrl.slice(pathStart);

  const reqBody = (req.method === 'POST' && req.body) ? JSON.stringify(req.body) : null;

  const options = {
    hostname: hostname,
    path: rawPath,
    method: req.method,
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(reqBody ? { 'Content-Length': Buffer.byteLength(reqBody) } : {})
    }
  };

  return new Promise((resolve) => {
    const apiReq = https.request(options, (apiRes) => {
      if (apiRes.statusCode >= 300 && apiRes.statusCode < 400) {
        res.status(401).json({ error: 'Token expire (Google redirige vers login)', status: apiRes.statusCode });
        return resolve();
      }
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          res.status(apiRes.statusCode).json(JSON.parse(data));
        } catch(e) {
          res.status(500).json({ error: 'Reponse non-JSON', status: apiRes.statusCode, preview: data.slice(0, 300), url: rawUrl });
        }
        resolve();
      });
    });
    apiReq.on('error', err => { res.status(500).json({ error: err.message }); resolve(); });
    if (reqBody) apiReq.write(reqBody);
    apiReq.end();
  });
};
