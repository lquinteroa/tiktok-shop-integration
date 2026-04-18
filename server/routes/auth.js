const express = require('express');
const router = express.Router();
const { getAuthUrl, getAccessToken, refreshAccessToken } = require('../lib/tiktok');
const { saveToken, getToken, deleteToken } = require('../lib/db');

/**
 * GET /auth/url
 * Returns the TikTok OAuth authorization URL for the frontend to redirect to
 */
router.get('/url', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  const url = getAuthUrl(state);
  res.json({ url, state });
});

/**
 * GET /auth/callback
 * TikTok redirects here after the user authorizes your app
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing auth code' });

  try {
    const data = await getAccessToken(code);
    if (data.code !== 0) return res.status(400).json({ error: data.message });

    const { access_token, refresh_token, access_token_expire_in, seller_id } = data.data;

    await saveToken({
      seller_id,
      access_token,
      refresh_token,
      expires_at: Math.floor(Date.now() / 1000) + access_token_expire_in,
    });

    res.redirect(`${process.env.FRONTEND_URL}/dashboard?seller_id=${seller_id}`);
  } catch (err) {
    console.error('OAuth callback error:', err.message);
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

/**
 * POST /auth/refresh
 * Body: { seller_id }
 */
router.post('/refresh', async (req, res) => {
  const { seller_id } = req.body;
  const stored = await getToken(seller_id);
  if (!stored) return res.status(401).json({ error: 'No token found for this seller' });

  try {
    const data = await refreshAccessToken(stored.refresh_token);
    if (data.code !== 0) return res.status(400).json({ error: data.message });

    const { access_token, refresh_token, access_token_expire_in } = data.data;

    await saveToken({
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
 */
router.get('/status', async (req, res) => {
  const { seller_id } = req.query;
  const stored = await getToken(seller_id);
  if (!stored) return res.json({ authenticated: false });

  const isExpired = Math.floor(Date.now() / 1000) > stored.expires_at;
  res.json({ authenticated: !isExpired, expires_at: stored.expires_at, needs_refresh: isExpired });
});

/**
 * POST /auth/logout
 */
router.post('/logout', async (req, res) => {
  const { seller_id } = req.body;
  if (seller_id) await deleteToken(seller_id);
  res.json({ success: true });
});

module.exports = { router };
