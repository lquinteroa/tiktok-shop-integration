import { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/**
 * Hook to manage TikTok Shop OAuth state
 * Usage: const { sellerId, isAuthenticated, login, logout, refreshToken } = useTikTokAuth();
 */
export function useTikTokAuth() {
  const [sellerId, setSellerId] = useState(() => localStorage.getItem('tiktok_seller_id'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check auth status on mount and when sellerId changes
  useEffect(() => {
    if (!sellerId) {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }

    checkStatus();
  }, [sellerId]);

  // Pick up seller_id from URL after OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('seller_id');
    if (id) {
      localStorage.setItem('tiktok_seller_id', id);
      setSellerId(id);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/status?seller_id=${sellerId}`);
      const data = await res.json();

      if (data.needs_refresh) {
        await refreshToken();
      } else {
        setIsAuthenticated(data.authenticated);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, [sellerId]);

  const login = useCallback(async () => {
    const res = await fetch(`${API_BASE}/auth/url`);
    const { url } = await res.json();
    window.location.href = url;
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller_id: sellerId }),
      });
      const data = await res.json();
      setIsAuthenticated(data.success);
      return data.success;
    } catch {
      setIsAuthenticated(false);
      return false;
    }
  }, [sellerId]);

  const logout = useCallback(() => {
    localStorage.removeItem('tiktok_seller_id');
    setSellerId(null);
    setIsAuthenticated(false);
  }, []);

  return { sellerId, isAuthenticated, isLoading, login, logout, refreshToken };
}
