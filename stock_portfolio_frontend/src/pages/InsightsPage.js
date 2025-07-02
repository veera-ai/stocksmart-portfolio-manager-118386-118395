import React from "react";

// PUBLIC_INTERFACE
export default function InsightsPage({ portfolio, prices }) {
  /**
   * Displays portfolio analytics, trends, and statistics.
   * For charts, real charting library (e.g., Chart.js) can be integrated.
   */
  // Simple portfolio value computation
  const total = portfolio.reduce((sum, s) => sum + (prices[s.symbol] || 0) * s.quantity, 0);
  const invested = portfolio.reduce((sum, s) => sum + s.buyPrice * s.quantity, 0);
  const profit = total - invested;

  return (
    <div>
      <h2>Portfolio Insights</h2>
      <div className="insights-summary">
        <div>Current Value: <strong>₹{total.toFixed(2)}</strong></div>
        <div>Invested Amount: <strong>₹{invested.toFixed(2)}</strong></div>
        <div>P&L: <span className={profit >= 0 ? "pnl-profit" : "pnl-loss"}>{profit.toFixed(2)}</span></div>
      </div>
      <div style={{ margin: "2rem 0" }}>
        <div className="chart-placeholder">[Pie Chart: Allocations by symbol]</div>
      </div>
      <div>
        <div className="chart-placeholder">[Line Chart: Portfolio value trend]</div>
      </div>
    </div>
  );
}
