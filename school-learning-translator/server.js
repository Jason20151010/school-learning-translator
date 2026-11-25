const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { handleAI } = require('./server/ai-handler');

const PORT = Number(process.env.PORT || 4173);
const publicDir = path.join(__dirname, 'public');

const server = http.createServer(async (req, res) => {
  if (req.url === '/api/ai') return handleAI(req, res);
  if (req.method !== 'GET') return res.writeHead(405).end();
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.normalize(path.join(publicDir, requested));
  if (!file.startsWith(publicDir)) return res.writeHead(404).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`School Learning Translator running at http://localhost:${PORT}`));
