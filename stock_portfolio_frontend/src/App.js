import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import PortfolioPage from './pages/PortfolioPage';
import InsightsPage from './pages/InsightsPage';
import RecommendationsPage from './pages/RecommendationsPage';
import TradePage from './pages/TradePage';
import SettingsPage from './pages/SettingsPage';
import {
  fetchPortfolio,
  fetchLivePrices,
  fetchRecommendations,
  placeTrade,
  mcpLogin,
  mcpLogout,
} from './api/api';

// Inline login form/modal for username/password/MFA
function LoginModal({ onLogin, error, isLoading }) {
  // PUBLIC_INTERFACE
  /**
   * Minimal modal to prompt for MCP credentials.
   */
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState('');
  const handleSubmit = async (e) => {
    e.preventDefault();
    onLogin({ username, password, mfa });
  };
  return (
    <div style={{
      position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 99,
      background: 'rgba(20,20,30,0.70)', display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: 'var(--bg-primary)', padding: 32, borderRadius: 8,
        boxShadow: '0 4px 20px rgba(40,50,75,0.23)', minWidth: 320, display: 'flex', flexDirection: 'column'
      }}>
        <h2 style={{ marginBottom: 16 }}>Zerodha MCP Login</h2>
        <label>
          Username:
          <input type="text" autoFocus required value={username} onChange={e => setUsername(e.target.value)} style={{margin: '4px 0 16px 0'}} />
        </label>
        <label>
          Password:
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} style={{margin: '4px 0 16px 0'}} />
        </label>
        <label>
          MFA (2FA/OTP):
          <input type="text" required value={mfa} onChange={e => setMfa(e.target.value)} style={{margin: '4px 0 16px 0'}} />
        </label>
        {error && <div style={{ color: 'crimson', marginBottom: 10 }}>{error}</div>}
        <button disabled={isLoading} type="submit" style={{
          background: 'var(--primary)', color: 'white', padding: '0.7em 2em', fontWeight: 600, border: 'none', borderRadius: 4,
          marginBottom: 8
        }}>{isLoading ? "Logging in..." : "Login"}</button>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Your credentials are never stored. MCP login is required for secure access.
        </div>
      </form>
    </div>
  );
}

function App() {
  // PUBLIC_INTERFACE
  /**
   * Root Dashboard Application for Stock Portfolio Management.
   * Handles theming and navigation between dashboard pages.
   * Securely requires MCP (Zerodha) login at startup.
   */
  const [theme, setTheme] = useState('dark');
  const [selected, setSelected] = useState('portfolio');
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);

  // MCP Auth state
  const [auth, setAuth] = useState({ isLoggedIn: false, isLoading: false, error: null });

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Portfolio loading effect - only after auth
  useEffect(() => {
    if (!auth.isLoggedIn) return;
    async function load() {
      const data = await fetchPortfolio();
      setPortfolio(data);
      // Load live prices
      const syms = data.map((stock) => stock.symbol);
      const live = await fetchLivePrices(syms);
      setPrices(live);
    }
    load();
    // Re-fetch prices periodically for real-time analysis
    const interval = setInterval(() => setRefreshTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, [refreshTick, auth.isLoggedIn]);

  // Theme toggler
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // Handle MCP login
  const handleLogin = async ({ username, password, mfa }) => {
    setAuth(a => ({ ...a, isLoading: true, error: null }));
    try {
      await mcpLogin({ username, password, mfa });
      setAuth({ isLoggedIn: true, isLoading: false, error: null });
    } catch (e) {
      setAuth(a => ({ ...a, isLoading: false, error: e.message || "Login failed" }));
    }
  };

  // Logout (could add "log out" button in settings)
  const handleLogout = () => {
    mcpLogout();
    setAuth({ isLoggedIn: false, isLoading: false, error: null });
  };

  // Navigation
  const renderContent = useCallback(() => {
    switch (selected) {
      case 'portfolio':
        return (
          <PortfolioPage
            fetchPortfolio={fetchPortfolio}
            fetchLivePrices={fetchLivePrices}
          />
        );
      case 'insights':
        return (
          <InsightsPage
            portfolio={portfolio}
            prices={prices}
          />
        );
      case 'recommendations':
        return (
          <RecommendationsPage
            fetchRecommendations={fetchRecommendations}
          />
        );
      case 'trade':
        return (
          <TradePage
            availableSymbols={portfolio.map(s => s.symbol)}
            onTrade={placeTrade}
          />
        );
      case 'settings':
      default:
        return <SettingsPage />;
    }
  }, [selected, portfolio, prices]);

  return (
    <div className="App">
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
      {!auth.isLoggedIn &&
        <LoginModal
          onLogin={handleLogin}
          error={auth.error}
          isLoading={auth.isLoading}
        />}
      {auth.isLoggedIn &&
        <div className="dashboard-layout">
          <Sidebar selected={selected} onSelect={setSelected} />
          <main className="main-content">
            <button
              style={{
                position: "absolute", top: 16, right: 120, fontSize: 14,
                background: "#bd3c41", color: "#fff", border: "none",
                borderRadius: 6, padding: "7px 14px", zIndex: 9, fontWeight: 600, cursor: "pointer"
              }}
              onClick={handleLogout}
              aria-label="Logout MCP"
            >
              Logout
            </button>
            {renderContent()}
          </main>
        </div>}
    </div>
  );
}

export default App;
