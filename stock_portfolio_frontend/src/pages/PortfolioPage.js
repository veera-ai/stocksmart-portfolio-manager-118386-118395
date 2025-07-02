import React, { useEffect, useState } from "react";

// PUBLIC_INTERFACE
export default function PortfolioPage({ fetchPortfolio, fetchLivePrices }) {
  /**
   * Displays user's portfolio, profit/loss, and real-time prices.
   */
  const [portfolio, setPortfolio] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchPortfolio();
      setPortfolio(data);
      const symbols = data.map(stock => stock.symbol);
      const live = await fetchLivePrices(symbols);
      setPrices(live);
      setLoading(false);
    }
    loadData();
  }, [fetchPortfolio, fetchLivePrices]);

  if (loading) return <div className="center-text">Loading portfolio...</div>;
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
