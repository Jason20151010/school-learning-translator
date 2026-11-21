const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { getKey } = require('../server/keygen');
const { askAI } = require('./server/ai-client');

const PORT = Number(process.env.PORT || 4173);
const publicDir = path.join(__dirname, 'public');

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 10000) req.destroy(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleAI(req, res) {
  try {
    const input = JSON.parse(await readBody(req));
    if (!input.text || !['explain', 'translate', 'quiz'].includes(input.action)) {
      return json(res, 400, { error: { message: 'Please choose a learning activity and enter some text.', fix: 'Choose Explain, Translate, or Quiz and try again.' } });
    }
    const prompt = input.action === 'explain'
      ? `Explain this school word for a young learner. Give a short meaning and one example sentence. Word: ${input.text}`
      : input.action === 'translate'
        ? `Translate this school text into ${input.language || 'the student’s home language'}. Show the translation and one short explanation of an important word. Text: ${input.text}`
        : `Make a short three-question quiz from these school words. Give one question at a time and wait for the student's answer. Words: ${input.text}`;
    const key = await getKey();
    const answer = await askAI(key, prompt);
    return json(res, 200, { answer });
  } catch (error) {
    console.error(error.fix || 'The AI request failed.');
    return json(res, 500, { error: { message: error.message || 'Please check the internet and try again.', fix: error.fix || 'Check the server connection and try again.' } });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/ai') return handleAI(req, res);
  if (req.method !== 'GET') return json(res, 405, { error: { message: 'That action is not available.', fix: 'Use the learning buttons on the page.' } });
  const requested = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const file = path.normalize(path.join(publicDir, requested));
  if (!file.startsWith(publicDir)) return json(res, 404, { error: { message: 'Page not found.', fix: 'Return to the home page.' } });
  fs.readFile(file, (error, data) => {
    if (error) return json(res, 404, { error: { message: 'Page not found.', fix: 'Return to the home page.' } });
    const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`School Learning Translator running at http://localhost:${PORT}`));
