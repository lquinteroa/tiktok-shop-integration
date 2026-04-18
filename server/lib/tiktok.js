const crypto = require('crypto');
const axios = require('axios');

const BASE_URL = 'https://open-api.tiktokglobalshop.com';
const AUTH_BASE = 'https://auth.tiktok-shops.com';

/**
 * Generate HMAC-SHA256 signature for TikTok Shop API v2
 * Signature = HMAC_SHA256(app_secret, app_secret + path + sorted_params + body + timestamp)
 */
function generateSignature(appSecret, path, params, body = '', timestamp) {
  // Remove fields that are NOT included in the signature
  const excluded = new Set(['sign', 'access_token']);

  const sortedKeys = Object.keys(params)
    .filter((k) => !excluded.has(k))
    .sort();

  const paramString = sortedKeys.map((k) => `${k}${params[k]}`).join('');
  const input = `${appSecret}${path}${paramString}${body}${timestamp}`;

  return crypto.createHmac('sha256', appSecret).update(input).digest('hex');
}

/**
 * Build the common query params required on every TikTok Shop API request
 */
function buildBaseParams(appKey, accessToken, extraParams = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  return { app_key: appKey, access_token: accessToken, timestamp, ...extraParams };
}

/**
 * Make a signed GET request to the TikTok Shop API
 */
async function tiktokGet(path, accessToken, extraParams = {}) {
  const { APP_KEY, APP_SECRET } = process.env;
  const params = buildBaseParams(APP_KEY, accessToken, extraParams);
  const sign = generateSignature(APP_SECRET, path, params, '', params.timestamp);

  const response = await axios.get(`${BASE_URL}${path}`, {
    params: { ...params, sign },
  });

  return response.data;
}

/**
 * Make a signed POST request to the TikTok Shop API
 */
async function tiktokPost(path, accessToken, body = {}, extraParams = {}) {
  const { APP_KEY, APP_SECRET } = process.env;
  const params = buildBaseParams(APP_KEY, accessToken, extraParams);
  const bodyString = JSON.stringify(body);
  const sign = generateSignature(APP_SECRET, path, params, bodyString, params.timestamp);

  const response = await axios.post(`${BASE_URL}${path}`, body, {
    params: { ...params, sign },
    headers: { 'Content-Type': 'application/json' },
  });

  return response.data;
}

/**
 * Exchange auth_code for access_token + refresh_token
 */
async function getAccessToken(authCode) {
  const { APP_KEY, APP_SECRET } = process.env;
  const response = await axios.get(`${AUTH_BASE}/api/v2/token/get`, {
    params: {
      app_key: APP_KEY,
      app_secret: APP_SECRET,
      auth_code: authCode,
      grant_type: 'authorized_code',
    },
  });
  return response.data;
}

/**
 * Refresh an expired access_token using the refresh_token
 */
async function refreshAccessToken(refreshToken) {
  const { APP_KEY, APP_SECRET } = process.env;
  const response = await axios.get(`${AUTH_BASE}/api/v2/token/refresh`, {
    params: {
      app_key: APP_KEY,
      app_secret: APP_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    },
  });
  return response.data;
}

/**
 * Build the OAuth authorization URL
 */
function getAuthUrl(state = 'random_state') {
  const { APP_KEY, REDIRECT_URI } = process.env;
  const params = new URLSearchParams({
    app_key: APP_KEY,
    state,
    redirect_uri: REDIRECT_URI,
  });
  return `${AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

module.exports = { tiktokGet, tiktokPost, getAccessToken, refreshAccessToken, getAuthUrl, generateSignature };
