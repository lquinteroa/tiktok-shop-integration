import { useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Hook that wraps all shop API calls with the seller auth header
 * Usage: const { getOrders, getProducts, shipOrder } = useShopApi(sellerId);
 */
export function useShopApi(sellerId) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Seller-ID': sellerId,
  };

  const apiFetch = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API_BASE}/shop${path}`, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (res.status === 401) {
        const data = await res.json();
        if (data.needs_refresh) throw new Error('TOKEN_EXPIRED');
        throw new Error('UNAUTHORIZED');
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'API error');
      }

      return res.json();
    },
    [sellerId]
  );

  // ─── Orders ─────────────────────────────────────────────────────────────────

  const getOrders = useCallback(
    (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/orders${qs ? `?${qs}` : ''}`);
    },
    [apiFetch]
  );

  const getOrder = useCallback(
    (orderId) => apiFetch(`/orders/${orderId}`),
    [apiFetch]
  );

  const shipOrder = useCallback(
    (orderId, { tracking_number, provider_id }) =>
      apiFetch(`/orders/${orderId}/ship`, {
        method: 'POST',
        body: JSON.stringify({ tracking_number, provider_id }),
      }),
    [apiFetch]
  );

  // ─── Products ────────────────────────────────────────────────────────────────

  const getProducts = useCallback(
    (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/products${qs ? `?${qs}` : ''}`);
    },
    [apiFetch]
  );

  const getProduct = useCallback(
    (productId) => apiFetch(`/products/${productId}`),
    [apiFetch]
  );

  // ─── Shop ────────────────────────────────────────────────────────────────────

  const getShopInfo = useCallback(() => apiFetch('/info'), [apiFetch]);

  const getShippingProviders = useCallback(
    () => apiFetch('/shipping-providers'),
    [apiFetch]
  );

  return {
    getOrders,
    getOrder,
    shipOrder,
    getProducts,
    getProduct,
    getShopInfo,
    getShippingProviders,
  };
}
