const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Dynamic import for node-fetch
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// MIME types mapped for static files
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname;

  // Handle all /api/* routes first
  if (pathname.startsWith('/api/')) {
    try {
      res.setHeader('Content-Type', 'application/json');
      
      // CORS headers, just in case
      res.setHeader('Access-Control-Allow-Origin', '*');

      if (pathname.startsWith('/api/pokemon/species/')) {
        const name = pathname.split('/').pop().toLowerCase();
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`);
        if (!response.ok) {
           res.writeHead(404);
           return res.end(JSON.stringify({ error: 'Species not found' }));
        }
        const data = await response.json();
        res.writeHead(200);
        return res.end(JSON.stringify(data));
      }
      
      if (pathname.startsWith('/api/pokemon/')) {
        const name = pathname.split('/').pop().toLowerCase();
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`);
        if (!response.ok) {
           res.writeHead(404);
           return res.end(JSON.stringify({ error: 'Pokémon not found' }));
        }
        const data = await response.json();
        res.writeHead(200);
        return res.end(JSON.stringify(data));
      }

      if (pathname.startsWith('/api/type/')) {
        const name = pathname.split('/').pop().toLowerCase();
        const response = await fetch(`https://pokeapi.co/api/v2/type/${name}`);
        if (!response.ok) {
           res.writeHead(404);
           return res.end(JSON.stringify({ error: 'Type not found' }));
        }
        const data = await response.json();
        res.writeHead(200);
        return res.end(JSON.stringify(data));
      }

      if (pathname.startsWith('/api/move/')) {
        const name = pathname.split('/').pop().toLowerCase();
        const response = await fetch(`https://pokeapi.co/api/v2/move/${name}`);
        if (!response.ok) {
           res.writeHead(404);
           return res.end(JSON.stringify({ error: 'Move not found' }));
        }
        const data = await response.json();
        res.writeHead(200);
        return res.end(JSON.stringify(data));
      }

      if (pathname === '/api/pokemon-list') {
        const limit = parsedUrl.query.limit || 20;
        const offset = parsedUrl.query.offset || 0;
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
        if (!response.ok) {
           res.writeHead(500);
           return res.end(JSON.stringify({ error: 'Failed to fetch list' }));
        }
        const data = await response.json();
        res.writeHead(200);
        return res.end(JSON.stringify(data));
      }

      // If no API route matches fallback to 404
      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'API route not found' }));

    } catch (err) {
      console.error(err);
      res.writeHead(500);
      return res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  }

  // Handle Static Files requests for everything not starting with /api/
  if (pathname === '/') {
    pathname = '/index.html'; // Default target file
  }

  let filePath = path.join(PUBLIC_DIR, pathname);

  // Security layer: Prevent directory traversal (e.g. going up the file tree using ../../)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('403 Forbidden');
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  // Read and serve the file manually
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // As a safeguard, if index.html doesn't exist but game.html does, serve game.html instead
        if (pathname === '/index.html') {
            fs.readFile(path.join(PUBLIC_DIR, 'game.html'), (err2, content2) => {
                if (err2) {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('<h1>404 Not Found</h1>', 'utf-8');
                } else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content2, 'utf-8');
                }
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        // Any other type of error
        res.writeHead(500);
        res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🎮 PokéDex 3D Server running natively at http://localhost:${PORT}\n`);
});
