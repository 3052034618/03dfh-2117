const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3456;
const DATA_FILE = path.join(__dirname, 'sync-data.json');

let store = {};

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      store = JSON.parse(data);
      console.log(`[SyncServer] Loaded ${Object.keys(store).length} games from disk`);
    }
  } catch (e) {
    console.error('[SyncServer] Load error:', e.message);
    store = {};
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('[SyncServer] Save error:', e.message);
  }
}

function getGameKey(shareCode) {
  return shareCode.toUpperCase();
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJSON(res, 200, {});
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    if (req.method === 'GET' && pathname === '/api/game') {
      const shareCode = url.searchParams.get('code');
      if (!shareCode) {
        sendJSON(res, 400, { ok: false, error: 'Missing code param' });
        return;
      }
      const key = getGameKey(shareCode);
      const game = store[key];
      if (!game) {
        sendJSON(res, 404, { ok: false, error: 'Game not found' });
        return;
      }
      sendJSON(res, 200, { ok: true, data: game });

    } else if (req.method === 'POST' && pathname === '/api/game') {
      const body = await parseBody(req);
      if (!body.shareCode) {
        sendJSON(res, 400, { ok: false, error: 'Missing shareCode' });
        return;
      }
      const key = getGameKey(body.shareCode);
      store[key] = body;
      saveStore();
      console.log(`[SyncServer] Game saved: ${key}`);
      sendJSON(res, 200, { ok: true });

    } else if (req.method === 'PUT' && pathname === '/api/game') {
      const body = await parseBody(req);
      if (!body.shareCode) {
        sendJSON(res, 400, { ok: false, error: 'Missing shareCode' });
        return;
      }
      const key = getGameKey(body.shareCode);
      store[key] = body;
      saveStore();
      console.log(`[SyncServer] Game updated: ${key}`);
      sendJSON(res, 200, { ok: true });

    } else if (req.method === 'GET' && pathname === '/api/result') {
      const shareCode = url.searchParams.get('code');
      if (!shareCode) {
        sendJSON(res, 400, { ok: false, error: 'Missing code param' });
        return;
      }
      const key = 'result_' + getGameKey(shareCode);
      const result = store[key];
      if (!result) {
        sendJSON(res, 404, { ok: false, error: 'Result not found' });
        return;
      }
      sendJSON(res, 200, { ok: true, data: result });

    } else if (req.method === 'POST' && pathname === '/api/result') {
      const body = await parseBody(req);
      if (!body.shareCode) {
        sendJSON(res, 400, { ok: false, error: 'Missing shareCode' });
        return;
      }
      const key = 'result_' + getGameKey(body.shareCode);
      store[key] = body;
      saveStore();
      console.log(`[SyncServer] Result saved: ${key}`);
      sendJSON(res, 200, { ok: true });

    } else if (req.method === 'GET' && pathname === '/api/health') {
      sendJSON(res, 200, { ok: true, games: Object.keys(store).filter(k => !k.startsWith('result_')).length });

    } else {
      sendJSON(res, 404, { ok: false, error: 'Not found' });
    }
  } catch (e) {
    console.error('[SyncServer] Error:', e.message);
    sendJSON(res, 500, { ok: false, error: e.message });
  }
});

loadStore();

server.listen(PORT, () => {
  console.log(`\n🚀 Sync Server running at http://localhost:${PORT}`);
  console.log(`   GET  /api/game?code=XXX   - Get game by share code`);
  console.log(`   POST /api/game             - Save/update game`);
  console.log(`   GET  /api/result?code=XXX  - Get result by share code`);
  console.log(`   POST /api/result           - Save/update result`);
  console.log(`   GET  /api/health           - Health check\n`);
});
