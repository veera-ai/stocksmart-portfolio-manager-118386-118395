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

/**
 * App for Stock Portfolio Management.
 * Now uses API key/secrets from environment: no login prompt needed.
 */
function App() {
  // PUBLIC_INTERFACE
  /**
   * Root Dashboard Application for Stock Portfolio Management.
   * Handles theming and navigation between dashboard pages.
   * Securely checks MCP (Zerodha) credential presence at startup.
   */
  const [theme, setTheme] = useState('dark');
  const [selected, setSelected] = useState('portfolio');
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState(null);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Check API key/secret presence at app start; if present, "log in"
  useEffect(() => {
    async function checkLogin() {
      try {
        await mcpLogin();
        setIsLoggedIn(true);
        setLoginError(null);
      } catch (e) {
        setIsLoggedIn(false);
        setLoginError((e && e.message) || "Authentication failed (API key/secret missing)");
      }
    }
    checkLogin();
  }, []);

  // Portfolio loading effect - only after auth
  useEffect(() => {
    if (!isLoggedIn) return;
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
  }, [refreshTick, isLoggedIn]);

  // Theme toggler
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // Logout toggles stateful re-authentication (does not truly destroy API key)
  const handleLogout = () => {
    mcpLogout();
    setIsLoggedIn(false);
    setLoginError("Logged out (reload page to retry API key authentication).");
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
      {!isLoggedIn && (
        <div
          style={{
            position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 99,
            background: 'rgba(20,20,30,0.70)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <div style={{
            background: 'var(--bg-primary)', padding: 32, borderRadius: 8,
            boxShadow: '0 4px 20px rgba(40,50,75,0.23)', minWidth: 320, display: 'flex', flexDirection: 'column'
          }}>
            <h2 style={{ marginBottom: 16, color: "var(--accent)" }}>API Key Required</h2>
            <div style={{ marginBottom: 12, color: "var(--text-secondary)" }}>
              Zerodha API credentials are required.<br />
              Please define <b>REACT_APP_ZERODHA_API_KEY</b> and <b>REACT_APP_ZERODHA_API_SECRET</b>
              <br />in your <code>.env</code> file and restart the app.
            </div>
            {loginError && (
              <div style={{ color: 'crimson', marginBottom: 10 }}>{loginError}</div>
            )}
          </div>
        </div>
      )}
      {isLoggedIn &&
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
