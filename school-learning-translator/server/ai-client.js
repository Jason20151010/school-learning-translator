const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { invalidateKey } = require('../../server/keygen');

function readInstructions() {
  const brief = fs.readFileSync(path.join(__dirname, '..', '..', 'BRIEF.md'), 'utf8');
  const start = brief.indexOf('## My AI’s instructions');
  return start >= 0 ? brief.slice(start) : 'Answer in friendly, simple, age-appropriate language and protect children’s privacy.';
}

function askAI(apiKey, message, { maxOutputTokens = 700, imageData } = {}) {
  const input = imageData
    ? [{ role: 'user', content: [{ type: 'input_text', text: message }, { type: 'input_image', image_url: imageData }] }]
    : message;
  const requestBody = JSON.stringify({ model: 'gpt-5.6-luna', instructions: readInstructions(), input, max_output_tokens: maxOutputTokens });
  return new Promise((resolve, reject) => {
    const request = https.request('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(requestBody) },
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        let data = {};
        try { data = JSON.parse(body); } catch {}
        if (response.statusCode === 401) invalidateKey();
        if (response.statusCode < 200 || response.statusCode >= 300) {
          const error = new Error(data.error?.message || 'The AI could not answer right now.');
          error.statusCode = response.statusCode;
          reject(error);
          return;
        }
        const text = data.output_text || data.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
        resolve(text || 'I could not find a clear answer. Please try a shorter question.');
      });
    });
    request.on('error', reject);
    request.write(requestBody);
    request.end();
  });
}

module.exports = { askAI };
