const http = require('http');
const fs = require('fs');
const path = require('path');

const host = 'localhost';
const port = 8000;

const dataDir = path.resolve(__dirname, 'data');

const cache = {};

// Dev-only mock: the only legitimate cross-origin readers are Angular dev
// servers on localhost (e.g. `ng serve` on http://localhost:4200). Echo the
// request Origin only when it is http://localhost(:port); never send
// Access-Control-Allow-Credentials, since this server is unauthenticated and
// its data must not be readable in a credentialed cross-origin context.
const LOCALHOST_ORIGIN = /^http:\/\/localhost(:\d+)?$/;

const open = (filename) => {
  return new Promise((resolve, reject) => {
    fs.open(filename, (err, fd) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(fd);
    });
  });
}

const readFile = (fd) => {
  return new Promise((resolve, reject) => {
    fs.readFile(fd, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(data);
    });
  });
}

const get = (urlPath) => {
  console.log(urlPath);
  let cleanPath = urlPath.split('?')[0].split('#')[0];

  if (!cleanPath.endsWith('.json')) {
    cleanPath += '.json';
  }

  // Resolve against the data dir and enforce containment, so requests like
  // /../../../etc/passwd.json cannot escape into the rest of the filesystem.
  const filename = path.resolve(dataDir, '.' + cleanPath);

  if (!filename.startsWith(dataDir + path.sep)) {
    const err = new Error('Forbidden');
    err.statusCode = 403;
    return Promise.reject(err);
  }

  if (cache[filename]) {
    console.log('Hitting cache for:', filename);
    return Promise.resolve(cache[filename]);
  }

  return open(filename)
    .then((fd) => {
      console.log('Loading for: ', filename);
      return readFile(fd);
    })
    .then(data => {
      console.log('Putting to cache for: ', filename);
      cache[filename] = data;
      return data;
    });
}
const requestListener = function (req, res) {
  res.setHeader("Content-Type", "application/json");
  const origin = req.headers.origin;
  if (origin && LOCALHOST_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
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
      } else if(err.errno === -2) {
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
