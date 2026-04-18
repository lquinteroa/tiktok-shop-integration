import { useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/local/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      localStorage.setItem('tt_token', data.token);
      onLogin(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h2 style={styles.title}>TikTok Shop</h2>
        <p style={styles.subtitle}>Enter your password to continue</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoFocus
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2.5rem 2rem',
    width: 320,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  title: { margin: '0 0 0.25rem', fontSize: '1.5rem', fontWeight: 700 },
  subtitle: { margin: '0 0 1.5rem', color: '#666', fontSize: '0.9rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: {
    padding: '0.65rem 0.875rem',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: '1rem',
    outline: 'none',
  },
  button: {
    padding: '0.7rem',
    borderRadius: 8,
    border: 'none',
    background: '#fe2c55',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: { color: '#e53e3e', fontSize: '0.85rem', margin: 0 },
};
