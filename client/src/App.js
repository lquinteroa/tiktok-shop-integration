import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('tt_token'));
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verify stored token is still valid on mount
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    fetch(`${API}/auth/local/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.ok) setVerified(true);
        else {
          localStorage.removeItem('tt_token');
          setToken(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('tt_token');
        setToken(null);
      })
      .finally(() => setChecking(false));
  }, [token]);

  function handleLogin(newToken) {
    setToken(newToken);
    setVerified(true);
  }

  function handleLogout() {
    localStorage.removeItem('tt_token');
    setToken(null);
    setVerified(false);
  }

  if (checking) return null; // splash / loading state

  if (!token || !verified) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}
