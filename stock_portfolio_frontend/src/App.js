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
} from './api/api';

/**
 * App for Stock Portfolio Management.
 * OAuth2-based Zerodha Kite login/portfolio flow.
 */
function App() {
  // PUBLIC_INTERFACE
  /**
   * Root Dashboard Application for Stock Portfolio Management.
   * Handles theming, navigation, OAuth session, and error states.
   */
  const [theme, setTheme] = useState('dark');
  const [selected, setSelected] = useState('portfolio');
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginError, setLoginError] = useState(null);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // On startup, check session status from backend
  useEffect(() => {
    async function checkSession() {
      setCheckingSession(true);
      try {
        const resp = await fetch(`${process.env.REACT_APP_ZERODHA_API_ROOT || 'http://localhost:5001'}/api/session/status`, {
          credentials: 'include',
        });
        if (!resp.ok) throw new Error("Session status check failed.");
        const data = await resp.json();
        setIsLoggedIn(Boolean(data.loggedIn));
        setLoginError(null);
      } catch (e) {
        setIsLoggedIn(false);
        setLoginError((e && e.message) || "Authentication/session check failed");
      }
      setCheckingSession(false);
    }
    checkSession();
    // Also check status after OAuth redirect
    if (window.location.search.includes("oauth=success")) {
      window.history.replaceState({}, document.title, window.location.pathname);
      checkSession();
    }
  }, []);

  // Portfolio loading effect - only after auth
  useEffect(() => {
    if (!isLoggedIn) return;
    async function load() {
      try {
        setLoginError(null);
        const data = await fetchPortfolio();
        setPortfolio(data);
        // Load live prices
        const syms = data.map((stock) => stock.symbol);
        const live = await fetchLivePrices(syms);
        setPrices(live);
      } catch (err) {
        setPortfolio([]);
        setPrices({});
        setLoginError(err && err.message ? err.message : "Unable to load portfolio data.");
      }
    }
    load();
    // Re-fetch prices periodically for real-time analysis
    const interval = setInterval(() => setRefreshTick((t) => t + 1), 15000);
    return () => clearInterval(interval);
  }, [refreshTick, isLoggedIn]);

  // Theme toggler
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // Logout (kill session at backend)
  const handleLogout = async () => {
    try {
      await fetch(`${process.env.REACT_APP_ZERODHA_API_ROOT || 'http://localhost:5001'}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore error
    }
    setIsLoggedIn(false);
    setPortfolio([]);
    setLoginError("Logged out. Please login again.");
  };

  // Start OAuth2 login (redirect to backend login endpoint)
  // PUBLIC_INTERFACE
  /**
   * Initiates OAuth2 login by redirecting the user to the backend login endpoint for Zerodha Kite.
   * Redirects to /api/login/kite as expected by the backend. Adjust CLIENT_URL and API root if behind proxy.
   */
  const handleKiteLogin = () => {
    // Defensive: ensure only a single / between root and endpoint.
    const apiRoot = (process.env.REACT_APP_ZERODHA_API_ROOT || 'http://localhost:5001').replace(/\/$/, "");
    window.location.href = `${apiRoot}/api/login/kite`;
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

  // Auth overlay & error presentation
  let authOverlay = null;
  if (!isLoggedIn) {
    // Show spinner during initial session check
    if (checkingSession) {
      authOverlay = (
        <div
          style={{
            position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 99,
            background: 'rgba(20,20,30,0.70)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <div style={{
            background: 'var(--bg-primary)', padding: 32, borderRadius: 8,
            boxShadow: '0 4px 20px rgba(40,50,75,0.23)', minWidth: 320,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <h2 style={{ marginBottom: 24, color: "var(--accent)" }}>Checking Authentication...</h2>
            <div className="center-text">Please wait...</div>
          </div>
        </div>
      );
    } else {
      // Not authed: show login with Kite UI
      authOverlay = (
        <div
          style={{
            position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 99,
            background: 'rgba(20,20,30,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
          <div style={{
            background: 'var(--bg-primary)', padding: 38, borderRadius: 10,
            boxShadow: '0 4px 24px rgba(40,50,75,0.27)', minWidth: 340,
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <h2 style={{ marginBottom: 14, color: "var(--accent)", fontWeight: 600, letterSpacing: 1 }}>Zerodha Kite Login</h2>
            <div style={{ marginBottom: 13, color: "var(--text-secondary)", fontSize: 16, textAlign: "center" }}>
              Securely login with your Zerodha account to view your portfolio.<br/>
              We never see or store your credentials.
            </div>
            <button
              className="action-btn"
              style={{
                marginBottom: 20,
                fontWeight: 700,
                fontSize: '1.08em',
                letterSpacing: 0.1,
                padding: "11px 34px",
                background: "var(--primary)",
                color: "var(--button-text)",
                borderRadius: 7,
                border: "none",
                boxShadow: "0 1px 5px rgba(20,50,90,0.10)",
                cursor: "pointer"
              }}
              onClick={handleKiteLogin}
              aria-label="Login with Zerodha Kite"
            >
              <img
                src="https://kite.trade/static/images/kite-logo.svg"
                alt="Kite Logo"
                style={{
                  height: 24, marginRight: 11, verticalAlign: "middle", filter: "grayscale(0.34)"
                }}
              />
              Login with Kite
            </button>
            {loginError && (
              <div style={{ color: '#e5533d', marginBottom: 8, textAlign: "center" }}>
                {loginError}
                <br />
                {/* OAuth-specific instructions */}
                {loginError.toLowerCase().includes("auth") || loginError.toLowerCase().includes("oauth") ? (
                  <div style={{ fontSize: 14, color: "#ad5e1c", marginTop: 8 }}>
                    If redirected here after login, your session may have expired.<br />
                    Please try again or check your internet connection.<br />
                    If issues persist, contact support or view console logs.
                  </div>
                ) : null}
              </div>
            )}
            <div style={{ fontSize: 13, color: "#ad5e1c", marginTop: 5, maxWidth: 340 }}>
              By logging in you agree to connect securely via Zerodha's OAuth flow.<br/>
              We do not store your sensitive account data.
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="App">
      <button
        className="theme-toggle"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>

      {authOverlay}

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
              aria-label="Logout"
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
