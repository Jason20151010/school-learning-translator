// Server-only helper. Never import this file from browser code.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');

let cached = null;

function loadEnvFile() {
  const file = path.join(process.cwd(), '.env');
  if (!fs.existsSync(file)) return;

  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) continue;
    const name = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[name]) process.env[name] = value;
  }
}

function keygenError(message, fix, cause) {
  const error = new Error(message, cause ? { cause } : undefined);
  error.fix = fix;
  return error;
}

function requestKey(urlString, token) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL('/api/lookup-key', `${urlString.replace(/\/$/, '')}/`);
    } catch (error) {
      reject(keygenError('The key service URL is invalid.', 'Set KEYGEN_URL to the MindDo server URL.', error));
      return;
    }

    const client = url.protocol === 'http:' ? http : https;
    const request = client.request(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Length': '0',
        Accept: 'application/json',
      },
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => {
        let data;
        try {
          data = JSON.parse(body);
        } catch (error) {
          reject(keygenError('The key service returned invalid JSON.', 'Check the MindDo key service response.', error));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(keygenError('The key service could not provide an API key.', 'Check KEYGEN_URL and KEYGEN_TOKEN, then try again.', data));
          return;
        }
        if (!data.apiKey || !data.expiresAt) {
          reject(keygenError('The key service response is missing apiKey or expiresAt.', 'Update the MindDo key service response to include both fields.'));
          return;
        }
        resolve(data);
      });
    });
    request.on('error', error => reject(keygenError('The key service request failed.', 'Check the server network connection and KEYGEN_URL.', error)));
    request.end();
  });
}

async function getKey({ forceRefresh = false } = {}) {
  loadEnvFile();
  if (!forceRefresh && cached && Date.now() < cached.expiresAt) return cached.apiKey;

  const keygenUrl = process.env.KEYGEN_URL;
  const keygenToken = process.env.KEYGEN_TOKEN;
  if (!keygenUrl || keygenUrl === 'paste-here' || !keygenToken || keygenToken === 'paste-here') {
    throw keygenError('The MindDo key service settings are missing.', 'Set KEYGEN_URL and KEYGEN_TOKEN in the server environment.');
  }

  const data = await requestKey(keygenUrl, keygenToken);
  const expiresAt = Date.parse(data.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    cached = null;
    throw keygenError('The key service returned an expired API key.', 'Ask MindDo for a fresh key with a future expiresAt value.');
  }
  cached = { apiKey: data.apiKey, expiresAt };
  return cached.apiKey;
}

// Call this once when OpenAI reports that the cached key is invalid.
function invalidateKey() {
  cached = null;
}

module.exports = { getKey, invalidateKey };
