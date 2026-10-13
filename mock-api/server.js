const http = require('http');
const fs = require('fs');
const path = require('path');

const host = 'localhost';
const port = 8000;

const dataDir = path.resolve(__dirname, 'data');
// Symlinks inside data/ are resolved before the containment check (see get()).
const realDataDir = fs.realpathSync(dataDir);

const cache = {};

// Dev-only mock: the only legitimate cross-origin readers are Angular dev
// servers on localhost (e.g. `ng serve` on http://localhost:4200). Echo the
// request Origin only when it is http://localhost(:port); never send
// Access-Control-Allow-Credentials, since this server is unauthenticated and
// its data must not be readable in a credentialed cross-origin context.
const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/;

// DNS rebinding: a page on another domain that resolves to 127.0.0.1 can send
// requests here with its own Host header, which the CORS check never sees.
// Serving only requests whose Host names this machine closes that path.
const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

const forbidden = () => {
  const err = new Error('Forbidden');
  err.statusCode = 403;
  return err;
};

const get = async (urlPath) => {
  console.log(urlPath);
  let cleanPath = urlPath.split('?')[0].split('#')[0];

  if (!cleanPath.endsWith('.json')) {
    cleanPath += '.json';
  }

  // Two containment checks, both required. The lexical one rejects ../ before
  // touching the disk. The real-path one rejects symlinks inside data/ that
  // point elsewhere, since path.resolve does not follow links.
  const filename = path.resolve(dataDir, '.' + cleanPath);
  if (!filename.startsWith(dataDir + path.sep)) {
    throw forbidden();
  }
  // A missing file fails here with ENOENT and is answered with 404.
  const realFile = await fs.promises.realpath(filename);
  if (!realFile.startsWith(realDataDir + path.sep)) {
    throw forbidden();
  }

  if (cache[realFile]) {
    console.log('Hitting cache for:', realFile);
    return cache[realFile];
  }

  console.log('Loading for: ', realFile);
  const data = await fs.promises.readFile(realFile);
  console.log('Putting to cache for: ', realFile);
  cache[realFile] = data;
  return data;
};

const requestListener = function (req, res) {
  res.setHeader("Content-Type", "application/json");
  // The Access-Control-Allow-Origin value depends on Origin, so caches must key
  // on it for every response, not only for the responses that echo it.
  res.setHeader('Vary', 'Origin');
  if (!LOCAL_HOST.test(req.headers.host || '')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const origin = req.headers.origin;
  if (origin && LOCALHOST_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  const urlPath = req.url;

  get(urlPath)
    .then(fileContents => {
      res.writeHead(200);
      res.end(fileContents);
    }).catch(err => {
      // Generic bodies only: err.message for fs errors embeds the absolute
      // server path (e.g. "ENOENT: no such file or directory, open
      // '/home/.../mock-api/data/x.json'") and must never reach the client.
      if (err.statusCode === 403) {
        res.writeHead(403);
        res.end('Forbidden');
      } else if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
        res.writeHead(404);
        res.end('Not found');
      } else { 
        res.writeHead(500)
        res.end('Internal server error');
      }
    })
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
