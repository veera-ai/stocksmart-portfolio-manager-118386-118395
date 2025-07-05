import React, { useEffect, useState } from "react";

// PUBLIC_INTERFACE
export default function PortfolioPage({ fetchPortfolio, fetchLivePrices }) {
  /**
   * Displays user's portfolio, profit/loss, and real-time prices.
   * Shows detailed error if API/OAuth flow is not completed or fails.
   */
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPortfolio();
        setPortfolio(data);
        if (data.length) {
          const symbols = data.map(stock => stock.symbol);
          const live = await fetchLivePrices(symbols);
          setPrices(live);
        }
      } catch (err) {
        setError(err && err.message ? err.message : "Unknown error loading portfolio.");
      }
      setLoading(false);
    }
    loadData();
    // eslint-disable-next-line
  }, [fetchPortfolio, fetchLivePrices]);

  if (loading) return <div className="center-text">Loading portfolio...</div>;
  if (error) return (
    <div className="center-text" style={{ color: "#e5533d", background: "#fff5f5", padding: 18, borderRadius: 8, maxWidth: 580, margin: "2rem auto" }}>
      <b>Portfolio Load Failed:</b><br />
      <span style={{ fontSize: 15 }}>{error}</span><br />
      {/* If OAuth or redirect needed, explain here */}
      {error.toLowerCase().includes("zerodha authentication") && (
        <div style={{ marginTop: 6, color: "#ad5e1c" }}>
          {/* OAuth/Interactive Flow Instructions */}
          You may need to authorize via Zerodha Kite Connect. Please ensure you've completed login/authentication.<br/>
          <a
            href="https://kite.trade/docs/connect/v3/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1976d2", textDecoration: "underline" }}
          >
            View Kite API Docs
          </a>
        </div>
      )}
    </div>
  );
  if (!portfolio.length) return <div className="center-text">No portfolio data found.</div>;

  return (
    <div>
      <h2>My Portfolio</h2>
      <div className="table-responsive">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Quantity</th>
              <th>Avg Buy Price</th>
              <th>Current Price</th>
              <th>P&L</th>
              <th>P&L %</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.map((stock) => {
              const current = prices[stock.symbol] || 0;
              const pnl = (current - stock.buyPrice) * stock.quantity;
              const pnlPercent = stock.buyPrice ? ((current - stock.buyPrice) / stock.buyPrice) * 100 : 0;
              return (
                <tr key={stock.symbol}>
                  <td>{stock.symbol}</td>
                  <td>{stock.quantity}</td>
                  <td>{stock.buyPrice.toFixed(2)}</td>
                  <td>{current ? current.toFixed(2) : <span className="muted">-</span>}</td>
                  <td className={pnl >= 0 ? "pnl-profit" : "pnl-loss"}>
                    {pnl.toFixed(2)}
                  </td>
                  <td className={pnlPercent >= 0 ? "pnl-profit" : "pnl-loss"}>
                    {pnlPercent.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
