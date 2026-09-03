const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const sessions = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');

function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function passwordsMatch(password, user) {
  const derived = crypto.scryptSync(password, user.salt, 64);
  const stored = Buffer.from(user.hash, 'hex');
  return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
}

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function sendJson(response, status, body, cookies = []) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Set-Cookie': cookies
  });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10000) request.destroy();
    });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { reject(new Error('JSON invalido')); }
    });
    request.on('error', reject);
  });
}

function sessionCookie(token, maxAge = 60 * 60 * 24 * 7) {
  return `cybernox_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function currentUser(request) {
  const token = parseCookies(request).cybernox_session;
  const session = token && sessions.get(token);
  if (!session || session.expiresAt < Date.now()) return null;
  return readUsers().find((user) => user.id === session.userId) || null;
}

async function handleApi(request, response) {
  const body = await readBody(request);
  const users = readUsers();
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (request.url === '/api/auth/register' && request.method === 'POST') {
    if (!email || !email.includes('@') || password.length < 6) return sendJson(response, 400, { error: 'Informe um e-mail valido e uma senha com pelo menos 6 caracteres.' });
    if (users.some((user) => user.email === email)) return sendJson(response, 409, { error: 'Este e-mail ja possui uma conta.' });
    const credentials = hashPassword(password);
    const user = { id: crypto.randomUUID(), email, ...credentials, createdAt: new Date().toISOString() };
    users.push(user);
    writeUsers(users);
    return createSession(response, user);
  }

  if (request.url === '/api/auth/login' && request.method === 'POST') {
    const user = users.find((candidate) => candidate.email === email);
    if (!user || !passwordsMatch(password, user)) return sendJson(response, 401, { error: 'E-mail ou senha incorretos.' });
    return createSession(response, user);
  }

  if (request.url === '/api/auth/logout' && request.method === 'POST') {
    const token = parseCookies(request).cybernox_session;
    if (token) sessions.delete(token);
    return sendJson(response, 200, { ok: true }, [sessionCookie('', 0)]);
  }

  if (request.url === '/api/auth/me' && request.method === 'GET') {
    const user = currentUser(request);
    return sendJson(response, 200, { authenticated: Boolean(user), user: user && { email: user.email } });
  }

  sendJson(response, 404, { error: 'Rota nao encontrada.' });
}

function createSession(response, user) {
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, { userId: user.id, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  sendJson(response, 200, { ok: true, user: { email: user.email } }, [sessionCookie(token)]);
}

function serveStatic(request, response) {
  const requested = request.url === '/' ? '/index.html' : request.url.split('?')[0];
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404); return response.end('Not found');
  }
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  response.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.url.startsWith('/api/')) return await handleApi(request, response);
    if (request.method !== 'GET') { response.writeHead(405); return response.end('Method not allowed'); }
    serveStatic(request, response);
  } catch (error) {
    sendJson(response, 500, { error: 'Erro interno do servidor.' });
    console.error(error);
  }
});

server.listen(PORT, '0.0.0.0', () => console.log(`CyberNox online em http://0.0.0.0:${PORT}`));
