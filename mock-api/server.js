const http = require('http');
const fs = require('fs');

const host = 'localhost';
const port = 8000;

const cache = {};

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

const get = (path) => {
  console.log(path);
  let filename = __dirname + '/data' + path;
  filename = filename.replace(/\?.*/gi, '');

  if (!filename.endsWith('.json')) {
    filename += '.json';
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  const path = req.url;

  get(path)
    .then(fileContents => {
      res.writeHead(200);
      res.end(fileContents);
    }).catch(err => {
      if(err.errno === -2) {
        res.writeHead(404);
      } else { 
        res.writeHead(500)
      }
      res.end(err.message);
    })
};

const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});
