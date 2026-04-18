import { useEffect, useState } from 'react';
import { useTikTokAuth } from '../hooks/useTikTokAuth';
import { useShopApi } from '../hooks/useShopApi';

export default function Dashboard() {
  const { sellerId, isAuthenticated, isLoading, login, logout } = useTikTokAuth();
  const api = useShopApi(sellerId);

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadShopInfo();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'products') loadProducts();
  }, [activeTab, isAuthenticated]);

  async function loadShopInfo() {
    try {
      const data = await api.getShopInfo();
      setShopInfo(data?.data);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadOrders() {
    setDataLoading(true);
    setError(null);
    try {
      const data = await api.getOrders({ page_size: 20 });
      setOrders(data?.data?.orders || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setDataLoading(false);
    }
  }

  async function loadProducts() {
    setDataLoading(true);
    setError(null);
    try {
      const data = await api.getProducts({ page_size: 20, status: 'ACTIVE' });
      setProducts(data?.data?.products || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setDataLoading(false);
    }
  }

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={styles.center}>
        <p>Checking authentication...</p>
      </div>
    );
  }

  // ─── Not authenticated ────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={styles.center}>
        <h1>TikTok Shop Dashboard</h1>
        <p>Connect your TikTok Shop account to get started.</p>
        <button style={styles.btn} onClick={login}>
          Connect TikTok Shop
        </button>
      </div>
    );
  }

  // ─── Authenticated Dashboard ──────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={{ margin: 0 }}>TikTok Shop</h1>
          {shopInfo && <small>Seller ID: {sellerId}</small>}
        </div>
        <button style={styles.btnSecondary} onClick={logout}>
          Disconnect
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {['orders', 'products'].map((tab) => (
          <button
            key={tab}
            style={activeTab === tab ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {error && <div style={styles.error}>{error}</div>}
      {dataLoading && <p>Loading...</p>}

      {!dataLoading && activeTab === 'orders' && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Status</th>
              <th>Total</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>
                  No orders found
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.id}</td>
                <td>{o.status}</td>
                <td>{o.payment?.total_amount ?? '—'}</td>
                <td>{o.create_time ? new Date(o.create_time * 1000).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!dataLoading && activeTab === 'products' && (
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>SKUs</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center' }}>
                  No products found
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.title}</td>
                <td>{p.status}</td>
                <td>{p.skus?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Minimal inline styles (swap for Tailwind / CSS modules as needed) ─────────
const styles = {
  container: { maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'sans-serif' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  tabs: { display: 'flex', gap: 8, marginBottom: 16 },
  tab: { padding: '8px 20px', cursor: 'pointer', border: '1px solid #ccc', background: '#fff', borderRadius: 4 },
  tabActive: { padding: '8px 20px', cursor: 'pointer', border: '1px solid #fe2c55', background: '#fe2c55', color: '#fff', borderRadius: 4 },
  btn: { padding: '10px 24px', background: '#fe2c55', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
  btnSecondary: { padding: '8px 16px', background: '#eee', border: 'none', borderRadius: 6, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  error: { background: '#fff0f0', border: '1px solid #f00', padding: 12, borderRadius: 4, marginBottom: 12 },
};
