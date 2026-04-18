const { Pool } = require('pg');

let pool;

/**
 * Initialize the PostgreSQL connection pool.
 * Uses DATABASE_URL from environment (Neon, Supabase, or any Postgres provider).
 * Called once on server startup.
 */
function initDb() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('Unexpected DB pool error:', err.message);
  });

  return createTables();
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tokens (
      seller_id       TEXT PRIMARY KEY,
      access_token    TEXT NOT NULL,
      refresh_token   TEXT NOT NULL,
      expires_at      BIGINT NOT NULL,
      created_at      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      updated_at      BIGINT NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT
    );
  `);
  console.log('DB ready (PostgreSQL)');
}

function getPool() {
  if (!pool) throw new Error('Database not initialised. Call initDb() first.');
  return pool;
}

// ─── Token CRUD ───────────────────────────────────────────────────────────────

/**
 * Upsert token record for a seller
 */
async function saveToken({ seller_id, access_token, refresh_token, expires_at }) {
  await getPool().query(
    `INSERT INTO tokens (seller_id, access_token, refresh_token, expires_at, updated_at)
     VALUES ($1, $2, $3, $4, EXTRACT(EPOCH FROM NOW())::BIGINT)
     ON CONFLICT (seller_id) DO UPDATE SET
       access_token  = EXCLUDED.access_token,
       refresh_token = EXCLUDED.refresh_token,
       expires_at    = EXCLUDED.expires_at,
       updated_at    = EXTRACT(EPOCH FROM NOW())::BIGINT`,
    [seller_id, access_token, refresh_token, expires_at]
  );
}

/**
 * Retrieve token record for a seller — returns null if not found
 */
async function getToken(seller_id) {
  const result = await getPool().query(
    'SELECT * FROM tokens WHERE seller_id = $1',
    [seller_id]
  );
  return result.rows[0] ?? null;
}

/**
 * Delete a seller's tokens (logout / revoke)
 */
async function deleteToken(seller_id) {
  await getPool().query('DELETE FROM tokens WHERE seller_id = $1', [seller_id]);
}

module.exports = { initDb, saveToken, getToken, deleteToken };
