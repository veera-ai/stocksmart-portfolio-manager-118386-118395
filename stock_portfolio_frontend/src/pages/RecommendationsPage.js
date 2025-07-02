import React, { useEffect, useState } from "react";

// PUBLIC_INTERFACE
export default function RecommendationsPage({ fetchRecommendations }) {
  /**
   * Displays personalized investment recommendations.
   */
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await fetchRecommendations();
      setRecs(data);
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
            {r.action && (
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
