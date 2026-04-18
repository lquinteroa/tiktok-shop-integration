const Database = require('better-sqlite3');
const path = require('path');

// DATA_DIR is set to the Railway volume mount path in production (/data)
// Falls back to a local ./data directory in development
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'tokens.db');

let db;

/**
 * Initialize the SQLite database and create the tokens table if it doesn't exist.
 * Called once on server startup.
 */
function initDb() {
  const fs = require('fs');
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  db = new Database(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tokens (
      seller_id       TEXT PRIMARY KEY,
      access_token    TEXT NOT NULL,
      refresh_token   TEXT NOT NULL,
      expires_at      INTEGER NOT NULL,
      created_at      INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at      INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  console.log(`SQLite DB initialised at ${DB_PATH}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDb() first.');
  return db;
}

// ─── Token CRUD ───────────────────────────────────────────────────────────────

/**
 * Upsert token record for a seller
 */
function saveToken({ seller_id, access_token, refresh_token, expires_at }) {
  const stmt = getDb().prepare(`
    INSERT INTO tokens (seller_id, access_token, refresh_token, expires_at, updated_at)
    VALUES (@seller_id, @access_token, @refresh_token, @expires_at, unixepoch())
    ON CONFLICT(seller_id) DO UPDATE SET
      access_token  = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at    = excluded.expires_at,
      updated_at    = unixepoch()
  `);
  stmt.run({ seller_id, access_token, refresh_token, expires_at });
}

/**
 * Retrieve token record for a seller — returns null if not found
 */
function getToken(seller_id) {
  return getDb().prepare('SELECT * FROM tokens WHERE seller_id = ?').get(seller_id) ?? null;
}

/**
 * Delete a seller's tokens (logout / revoke)
 */
function deleteToken(seller_id) {
  getDb().prepare('DELETE FROM tokens WHERE seller_id = ?').run(seller_id);
}

/**
 * Returns all sellers whose access_token expires within the next `withinMs` ms
 * Useful if you want to add a background refresh job later
 */
function getExpiringTokens(withinMs = 60 * 60 * 1000) {
  const threshold = Math.floor((Date.now() + withinMs) / 1000);
  return getDb()
    .prepare('SELECT * FROM tokens WHERE expires_at <= ?')
    .all(threshold);
}

module.exports = { initDb, saveToken, getToken, deleteToken, getExpiringTokens };
