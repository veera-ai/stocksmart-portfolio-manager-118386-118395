 /**
 * API wrapper for Kite OAuth backend. No static API key in FO – all requests use BE session via credentials.
 */

const API_ROOT = process.env.REACT_APP_ZERODHA_API_ROOT || "http://localhost:5001";

/**
 * PUBLIC_INTERFACE
 * Fetch user's portfolio (holdings/positions) from the OAuth-authenticated backend.
 * Returns [{ symbol, quantity, buyPrice }]
 * Throws a descriptive error on not authenticated or failure.
 */
export async function fetchPortfolio() {
  try {
    const response = await fetch(`${API_ROOT}/api/portfolio/holdings`, {
      credentials: "include", // Send session cookie for OAuth
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Zerodha authentication required. Please login with Kite Connect to view your portfolio."
      );
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio data: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Portfolio data format invalid or empty from backend API.");
    }
    return data.data.map((stock) => ({
      symbol: stock.tradingsymbol,
      quantity: stock.quantity,
      buyPrice: stock.average_price,
    }));
  } catch (err) {
    throw new Error(
      "Failed to fetch portfolio: " +
      (err && err.message ? err.message :
        "Unknown error. Please complete the Kite Connect login (OAuth).")
    );
  }
}

/**
 * PUBLIC_INTERFACE
 * Fetch LTPs (last traded prices) for symbols.
 * This can be a stub or call a /quote endpoint if available in backend.
 * @param {string[]} symbols
 * @returns {Promise<object>} prices mapping: { "TCS": 3345.7, ... }
 */
export async function fetchLivePrices(symbols) {
  if (!symbols || !symbols.length) return {};
  // Attempt to hit /quote/ltp if backend implemented, else stub
  const url = `${API_ROOT}/quote/ltp?i=${symbols.map(s => 'NSE:' + s).join('&i=')}`;
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    // fallback: return zero prices
    return symbols.reduce((obj, sym) => { obj[sym] = 0; return obj; }, {});
  }
  const data = await response.json();
  const out = {};
  for (const key in data.data) {
    const symbol = key.split(':')[1];
    out[symbol] = data.data[key].last_price;
  }
  return out;
}

/**
 * PUBLIC_INTERFACE
 * Personalized recommendations (stub).
 */
export async function fetchRecommendations() {
  // fallback stub
  return [
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
  ];
}

/**
 * PUBLIC_INTERFACE
 * Place a trade via Kite Connect API – stub; real order placement requires backend endpoint.
 * @param {object} params { symbol, quantity, type }
 */
export async function placeTrade({ symbol, quantity, type }) {
  throw new Error("Trade placement API is not available in this frontend demo.");
}

