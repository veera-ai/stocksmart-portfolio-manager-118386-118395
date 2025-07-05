import React, { useEffect, useState } from "react";

// PUBLIC_INTERFACE
export default function RecommendationsPage({ fetchRecommendations }) {
  /**
   * Displays personalized investment recommendations.
   * If fetchRecommendations fails (MCP not integrated), fallback demo recommendations are rendered.
   */
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchRecommendations();
        setRecs(data);
      } catch (e) {
        // Fallback: Demo recommendations for FE-only preview
        setRecs([
          {
            title: "Increase Exposure to Blue Chips",
            description: "Your portfolio is underweight in reliable blue-chip stocks. Consider increasing your allocation to large caps like TCS or Infosys.",
            action: { label: "Trade TCS", url: "https://kite.zerodha.com/dashboard" }
          },
          {
            title: "Diversify into Financials",
            description: "You have no banking sector exposure. Add HDFC Bank or ICICI Bank for risk balancing.",
            action: { label: "Trade HDFC Bank", url: "https://kite.zerodha.com/dashboard" }
          },
          {
            title: "Explore Covered Call Options",
            description: "Unlock steady returns by writing covered calls against your ITC holdings. Learn more about stock options in the trading tab.",
          }
        ]);
      }
      setLoading(false);
    }
    load();
  }, [fetchRecommendations]);

  if (loading) return <div className="center-text">Loading recommendations...</div>;
  if (!recs.length) return <div className="center-text">No recommendations at this time.</div>;

  return (
    <div>
      <h2>Personalized Recommendations</h2>
      <ol className="recommendations-list">
        {recs.map((r, i) => (
          <li key={i}>
            <strong>{r.title}</strong>
            <div>{r.description}</div>
            {r.action && r.action.url && (
              <button className="action-btn" onClick={() => window.open(r.action.url)}>
                {r.action.label}
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
