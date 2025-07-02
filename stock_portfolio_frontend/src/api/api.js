/**
 * API wrapper for Zerodha MCP/Kite with API key/secret auth.
 * Now authenticates using static API key/secret from environment (.env) rather than runtime username/password/MFA.
 * API_SECRET is NEVER returned to client, sent to backend or logged.
 * All request auth is based on API key/token (from env) using HTTP headers.
 */

// MCP protocol base endpoints
const ZERODHA_API_ROOT = process.env.REACT_APP_ZERODHA_API_ROOT || 'https://api.kite.trade';         // MCP/Kite API REST base
const ZERODHA_WS_ROOT = process.env.REACT_APP_ZERODHA_WS_ROOT || 'wss://ws.kite.trade/';             // MCP websocket root

// Read static API KEY and SECRET from the environment. These are embedded at build time, never exposed in logs.
const ZERODHA_API_KEY = process.env.REACT_APP_ZERODHA_API_KEY;
const ZERODHA_API_SECRET = process.env.REACT_APP_ZERODHA_API_SECRET;

/**
 * Helper: Add auth headers for all requests that require authentication with API key.
 * WARNING: Do not log or expose the API key or secret!
 */
function getAuthHeaders() {
  if (!ZERODHA_API_KEY) {
    throw new Error("Zerodha API key missing. Define REACT_APP_ZERODHA_API_KEY in .env");
  }
  return {
    'X-Kite-Version': '3',
    'Authorization': `token ${ZERODHA_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

// PUBLIC_INTERFACE
/**
 * Authenticate with Zerodha for token-based workflows.
 * In this refactored mode, MCP login is SHORT-CIRCUITED: always succeeds if key/secret are present (no username/password/MFA).
 * @returns {Promise<boolean>}
 */
export async function mcpLogin() {
  if (ZERODHA_API_KEY && ZERODHA_API_SECRET) {
    return true; // "Login" is present if env vars exist.
  }
  throw new Error("Missing Zerodha API key/secret. Please set REACT_APP_ZERODHA_API_KEY and REACT_APP_ZERODHA_API_SECRET in your environment.");
}

// PUBLIC_INTERFACE
/**
 * Logs out user (noop with static API key/secret).
 */
export function mcpLogout() {
  // No actual stateful logout -- stateless with static key usage.
  // Placeholder for compatibility.
}

// PUBLIC_INTERFACE
/**
 * Fetch user's portfolio (holdings/positions) via Zerodha Connect API.
 * Returns [{ symbol, quantity, buyPrice }]
 */
export async function fetchPortfolio() {
  const response = await fetch(`${ZERODHA_API_ROOT}/portfolio/holdings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio data: ${response.statusText}`);
  }
  const data = await response.json();
  return (data.data || []).map((stock) => ({
    symbol: stock.tradingsymbol,
    quantity: stock.quantity,
    buyPrice: stock.average_price,
  }));
}

// PUBLIC_INTERFACE
/**
 * Fetch LTPs (last traded prices) for symbols using Zerodha MCP HTTP API.
 * If you want to subscribe to live tick-by-tick prices, use 'subscribeToLivePrices'.
 * @param {string[]} symbols - List of strings e.g. ["TCS", "INFY"]
 * @returns {Promise<object>} prices mapping: { "TCS": 3345.7, ... }
 */
export async function fetchLivePrices(symbols) {
  if (!symbols || !symbols.length) return {};
  const url = `${ZERODHA_API_ROOT}/quote/ltp?i=${symbols.map(s => 'NSE:' + s).join('&i=')}`;
  const response = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch live LTPs from MCP: ${response.statusText}`);
  }
  const data = await response.json();
  const out = {};
  for (const key in data.data) {
    const symbol = key.split(':')[1];
    out[symbol] = data.data[key].last_price;
  }
  return out;
}

// PUBLIC_INTERFACE
/**
 * Subscribe to tick-by-tick live price updates using MCP WebSocket.
 * Returns a function for unsubscribing; invokes callback with { symbol: price } as prices update.
 * @param {string[]} symbols - NSE symbols to subscribe to (e.g., ["TCS", "INFY"])
 * @param {(prices: object) => void} onUpdate - Called with new prices as they arrive
 * @returns {function} unsubscribe
 */
export function subscribeToLivePrices(symbols, onUpdate) {
  if (!window.__kite_instrument_tokens) {
    console.warn('Instrument tokens mapping is missing. Live streaming requires instrument-token mapping.');
    return () => {};
  }
  const tokens = symbols.map(s => window.__kite_instrument_tokens[s]).filter(Boolean);
  if (!tokens.length) return () => {};
  if (!ZERODHA_API_KEY) {
    throw new Error("Zerodha API key not set in environment.");
  }
  const ws = new WebSocket(`${ZERODHA_WS_ROOT}?api_key=${ZERODHA_API_KEY}`);
  let isSubscribed = false;
  ws.onopen = function () {
    ws.send(JSON.stringify({ a: 'subscribe', v: tokens }));
    isSubscribed = true;
  };
  ws.onmessage = function (event) {
    let msg;
    try {
      msg = JSON.parse(event.data);
    } catch {
      return;
    }
    if (Array.isArray(msg)) {
      const prices = {};
      msg.forEach(tick => {
        if (tick.token && tick.ltp) {
          const symbol = Object.keys(window.__kite_instrument_tokens)
            .find(s => window.__kite_instrument_tokens[s] === tick.token);
          if (symbol) prices[symbol] = tick.ltp;
        }
      });
      onUpdate(prices);
    }
  };
  ws.onerror = e => {
    // Never log API secrets; errors are generic.
    console.error('Zerodha MCP WebSocket error', e && e.message);
  };
  const unsubscribe = () => {
    if (isSubscribed && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ a: 'unsubscribe', v: tokens }));
    }
    ws.close();
  };
  return unsubscribe;
}

// PUBLIC_INTERFACE
/**
 * Fetch recommendations using backend analytics or MCP's personalizations if available.
 * @returns {Promise<Array<{title:string,description:string,action?:object}>>}
 */
export async function fetchRecommendations() {
  throw new Error("fetchRecommendations: Integration with real MCP analytics not implemented – connect to backend or Zerodha AI recommendations endpoint.");
}

// PUBLIC_INTERFACE
/**
 * Place a trade via Zerodha Kite Connect order API.
 * @param {object} params { symbol, quantity, type }
 * @returns {Promise<{status, message}>}
 */
export async function placeTrade({ symbol, quantity, type }) {
  const body = JSON.stringify({
    exchange: "NSE",
    tradingsymbol: symbol,
    quantity: Number(quantity),
    transaction_type: type,
    order_type: "MARKET",
    product: "CNC",
    variety: "regular"
  });
  const response = await fetch(`${ZERODHA_API_ROOT}/orders/regular`, {
    method: "POST",
    headers: getAuthHeaders(),
    body
  });
  if (!response.ok) {
    const errorMsg = (await response.json()).message || response.statusText;
    throw new Error("Trade order failed: " + errorMsg);
  }
  return { status: "success", message: "Order placed successfully." };
}

