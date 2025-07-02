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
  placeTrade
} from './api/api';

function App() {
  // PUBLIC_INTERFACE
  /**
   * Root Dashboard Application for Stock Portfolio Management.
   * Handles theming and navigation between dashboard pages.
   */
  const [theme, setTheme] = useState('dark');
  const [selected, setSelected] = useState('portfolio');
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);

  // Theme effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Portfolio loading effect
  useEffect(() => {
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
  }, [refreshTick]);

  // Theme toggler
  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

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
      <div className="dashboard-layout">
        <Sidebar selected={selected} onSelect={setSelected} />
        <main className="main-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
