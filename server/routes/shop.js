const express = require('express');
const router = express.Router();
const { tiktokGet, tiktokPost } = require('../lib/tiktok');
const { getToken } = require('../lib/db');

/**
 * Middleware — resolve access_token from seller_id header
 * Frontend must send X-Seller-ID on every request
 */
async function requireToken(req, res, next) {
  const sellerId = req.headers['x-seller-id'];
  if (!sellerId) return res.status(401).json({ error: 'Missing X-Seller-ID header' });

  const stored = await getToken(sellerId);
  if (!stored) return res.status(401).json({ error: 'Not authenticated' });

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec > stored.expires_at) {
    return res.status(401).json({ error: 'Token expired', needs_refresh: true });
  }

  req.accessToken = stored.access_token;
  req.sellerId = sellerId;
  next();
}

// ─── Shop Info ────────────────────────────────────────────────────────────────

/**
 * GET /shop/info
 * Returns basic shop information
 */
router.get('/info', requireToken, async (req, res) => {
  try {
    const data = await tiktokGet('/shop/202309/shops', req.accessToken);
    res.json(data);
  } catch (err) {
    console.error('Shop info error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders ───────────────────────────────────────────────────────────────────

/**
 * GET /shop/orders?page_size=20&cursor=xxx&status=AWAITING_SHIPMENT
 * Search/list orders with optional filters
 */
router.get('/orders', requireToken, async (req, res) => {
  const { page_size = 20, cursor, status, create_time_ge, create_time_lt } = req.query;

  const body = {
    page_size: parseInt(page_size),
    ...(cursor && { cursor }),
    ...(status && { order_status: status }),
    ...(create_time_ge && { create_time_ge: parseInt(create_time_ge) }),
    ...(create_time_lt && { create_time_lt: parseInt(create_time_lt) }),
  };

  try {
    const data = await tiktokPost('/order/202309/orders/search', req.accessToken, body);
    res.json(data);
  } catch (err) {
    console.error('Orders error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /shop/orders/:orderId
 * Get a single order by ID
 */
router.get('/orders/:orderId', requireToken, async (req, res) => {
  const { orderId } = req.params;
  try {
    const data = await tiktokGet('/order/202309/orders', req.accessToken, {
      ids: orderId,
    });
    res.json(data);
  } catch (err) {
    console.error('Order detail error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Products ─────────────────────────────────────────────────────────────────

/**
 * GET /shop/products?page_size=20&cursor=xxx&status=ACTIVE
 * List products with optional filters
 */
router.get('/products', requireToken, async (req, res) => {
  const { page_size = 20, cursor, status } = req.query;

  const body = {
    page_size: parseInt(page_size),
    ...(cursor && { cursor }),
    ...(status && { status }),
  };

  try {
    const data = await tiktokPost('/product/202309/products/search', req.accessToken, body);
    res.json(data);
  } catch (err) {
    console.error('Products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /shop/products/:productId
 * Get a single product by ID
 */
router.get('/products/:productId', requireToken, async (req, res) => {
  const { productId } = req.params;
  try {
    const data = await tiktokGet(`/product/202309/products/${productId}`, req.accessToken);
    res.json(data);
  } catch (err) {
    console.error('Product detail error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Inventory ────────────────────────────────────────────────────────────────

/**
 * GET /shop/inventory/:skuId
 * Get inventory for a specific SKU
 */
router.get('/inventory/:skuId', requireToken, async (req, res) => {
  const { skuId } = req.params;
  try {
    const data = await tiktokGet('/product/202309/inventory', req.accessToken, {
      sku_id: skuId,
    });
    res.json(data);
  } catch (err) {
    console.error('Inventory error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Logistics / Shipping ─────────────────────────────────────────────────────

/**
 * GET /shop/shipping-providers
 * List available shipping providers
 */
router.get('/shipping-providers', requireToken, async (req, res) => {
  try {
    const data = await tiktokGet('/logistics/202309/shipping_providers', req.accessToken);
    res.json(data);
  } catch (err) {
    console.error('Shipping providers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /shop/orders/:orderId/ship
 * Mark an order as shipped
 * Body: { tracking_number, provider_id }
 */
router.post('/orders/:orderId/ship', requireToken, async (req, res) => {
  const { orderId } = req.params;
  const { tracking_number, provider_id } = req.body;

  try {
    const data = await tiktokPost(
      `/logistics/202309/orders/${orderId}/shipments`,
      req.accessToken,
      { tracking_number, shipping_provider_id: provider_id }
    );
    res.json(data);
  } catch (err) {
    console.error('Ship order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
