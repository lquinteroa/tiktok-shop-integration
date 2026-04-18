const express = require('express');
const router = express.Router();
const { getAuthUrl, getAccessToken, refreshAccessToken } = require('../lib/tiktok');
const { saveToken, getToken, deleteToken } = require('../lib/db');

/**
 * GET /auth/url
 * Returns the TikTok OAuth authorization URL for the frontend to redirect to
 */
router.get('/url', (req, res) => {
  const state = Math.random().toString(36).substring(2); // CSRF state token
  const url = getAuthUrl(state);
  res.json({ url, state });
});

/**
 * GET /auth/callback
 * TikTok redirects here after the user authorizes your app
 * Query params: code, state
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing auth code' });
  }

  try {
    const data = await getAccessToken(code);

    if (data.code !== 0) {
      return res.status(400).json({ error: data.message });
    }

    const { access_token, refresh_token, access_token_expire_in, seller_id } = data.data;

    // Persist to SQLite
    saveToken({
      seller_id,
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + access_token_expire_in,
    });

    // Redirect to React frontend with seller_id in URL
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?seller_id=${seller_id}`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

/**
 * POST /auth/refresh
 * Body: { seller_id }
 * Refreshes the access_token using the stored refresh_token
 */
router.post('/refresh', async (req, res) => {
  const { seller_id } = req.body;
  const stored = getToken(seller_id);

  if (!stored) {
    return res.status(401).json({ error: 'No token found for this seller' });
  }

  try {
    const data = await refreshAccessToken(stored.refresh_token);

    if (data.code !== 0) {
      return res.status(400).json({ error: data.message });
    }

    const { access_token, refresh_token, access_token_expire_in } = data.data;

    saveToken({
      seller_id,
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + access_token_expire_in,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Token refresh error:', err.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * GET /auth/status?seller_id=xxx
 * Check if we have a valid (non-expired) token for this seller
 */
router.get('/status', (req, res) => {
  const { seller_id } = req.query;
  const stored = getToken(seller_id);

  if (!stored) {
    return res.json({ authenticated: false });
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const isExpired = nowSec > stored.expires_at;

  res.json({
    authenticated: !isExpired,
    expires_at: stored.expires_at,
    needs_refresh: isExpired,
  });
});

/**
 * POST /auth/logout
 * Body: { seller_id }
 * Deletes tokens from the DB
 */
router.post('/logout', (req, res) => {
  const { seller_id } = req.body;
  if (seller_id) deleteToken(seller_id);
  res.json({ success: true });
});

module.exports = { router };
