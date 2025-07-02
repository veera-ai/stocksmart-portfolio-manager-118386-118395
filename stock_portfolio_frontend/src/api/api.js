/**
 * API wrapper for connecting to Zerodha MCP and Kite APIs for live portfolio data, price streaming, recommendations, and trading.
 * Credentials/secrets for MCP are no longer stored in .env or statically. Instead, user authenticates with username, password, and MFA.
 * Provides methods for login, authentication, and MCP API usage via user credentials.
 */

// MCP protocol base endpoints (can use user-provided tokens after auth)
const ZERODHA_API_ROOT = process.env.REACT_APP_ZERODHA_API_ROOT || 'https://api.kite.trade';         // MCP/Kite API REST base
const ZERODHA_WS_ROOT = process.env.REACT_APP_ZERODHA_WS_ROOT || 'wss://ws.kite.trade/';             // MCP websocket root

// MCP secure credentials/session management
let mcpSession = {
  apiKey: undefined, // issued/returned after user login (Zerodha MCP)
  accessToken: undefined, // issued/returned after user login (Zerodha MCP)
  userId: undefined // optional: track user
};

/**
 * PUBLIC_INTERFACE
 * Logs in using MCP protocol: username, password, and (if required) MFA.
 * On success, sets session API tokens for future MCP calls.
 *
 * @param {string} username
 * @param {string} password
 * @param {string} mfa
 * @returns {Promise<boolean>} true if login succeeds
 */
export async function mcpLogin({ username, password, mfa }) {
  /**
   * For Zerodha MCP, typically:
   * 1. POST /session/token with username, password, (and possibly) mfa.
   * 2. Parse response for access_token, API key, userId, etc.
   */
  // Example endpoint (official docs): https://api.kite.trade/session/token
  // This is a simulation; real flow might require redirection or more parameters.

  let url = `${ZERODHA_API_ROOT}/session/token`;
  let body = {
    user_id: username,
    password: password,
    twofa_value: mfa
  };
  let response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Kite-Version': '3' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error("MCP login failed: " + (error.message || response.statusText));
  }
  const data = await response.json();
  // Expect: { data: { access_token, public_token, user_id, api_key, ... }, ... }
  if (!data || !data.data || !data.data.access_token || !data.data.api_key) {
    throw new Error("MCP login did not return API tokens. Please retry.");
  }
  mcpSession.apiKey = data.data.api_key;
  mcpSession.accessToken = data.data.access_token;
  mcpSession.userId = data.data.user_id || username;
  return true;
}

/**
 * PUBLIC_INTERFACE
 * Logs out user and clears MCP session credentials.
 */
export function mcpLogout() {
  mcpSession.apiKey = undefined;
  mcpSession.accessToken = undefined;
  mcpSession.userId = undefined;
}

/**
 * Helper: Add auth headers for all requests that require user login.
 */
function getAuthHeaders() {
  if (!mcpSession.apiKey || !mcpSession.accessToken) {
    throw new Error(
      "Not authenticated. Please log in to Zerodha MCP first."
    );
  }
  return {
    'X-Kite-Version': '3',
    'Authorization': `token ${mcpSession.apiKey}:${mcpSession.accessToken}`,
    'Content-Type': 'application/json',
  };
}

// PUBLIC_INTERFACE
/**
 * Fetch user's portfolio (holdings/positions) via Zerodha Connect API.
 * Returns [{ symbol, quantity, buyPrice }]
 */
export async function fetchPortfolio() {
  // Use /portfolio/holdings endpoint from Kite Connect
  const response = await fetch(`${ZERODHA_API_ROOT}/portfolio/holdings`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch portfolio data: ${response.statusText}`);
  }
  const data = await response.json();
  // Normalize: symbol, quantity, buyPrice
  return (data.data || []).map((stock) => ({
    symbol: stock.tradingsymbol,
    quantity: stock.quantity,
    buyPrice: stock.average_price,
  }));
}

// --- MCP Live Price Streaming (WebSocket) ---
// When invoking fetchLivePrices, we *establish a streaming connection* and return a Promise that resolves to the current price snapshot.
// For full dashboard/live analytics, a React effect should open a connection and feed updates into state.
// Below is a hybrid function which polls latest prices using HTTP (for first load) and also exposes a stream API if needed.

// PUBLIC_INTERFACE
/**
 * Fetch LTPs (last traded prices) for symbols using Zerodha MCP HTTP API.
 * If you want to subscribe to live tick-by-tick prices, use 'subscribeToLivePrices'.
 * 
 * @param {string[]} symbols - List of strings e.g. ["TCS", "INFY"]
 * @returns {Promise<object>} prices mapping: { "TCS": 3345.7, ... }
 */
export async function fetchLivePrices(symbols) {
  if (!symbols || !symbols.length) return {};
  // Use /quote/ltp endpoint for HTTP poll
  const url = `${ZERODHA_API_ROOT}/quote/ltp?i=${symbols.map(s => 'NSE:' + s).join('&i=')}`;
  const response = await fetch(url, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch live LTPs from MCP: ${response.statusText}`);
  }
  const data = await response.json();
  // Response is { status:..., data: { "NSE:TCS": { last_price: ... } } }
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
 * 
 * @param {string[]} symbols - NSE symbols to subscribe to (e.g., ["TCS", "INFY"])
 * @param {(prices: object) => void} onUpdate - Called with new prices as they arrive
 * @returns {function} unsubscribe
 */
export function subscribeToLivePrices(symbols, onUpdate) {
  // Prepare tokens for each symbol using instrument-token mapping
  // Instrument-token mapping should be retrieved from Zerodha instrument dump (typically static for NSE stocks)
  // For brevity, this code assumes a mapping object is available.
  // In production, fetch a mapping file from backend/cache the response.
  const INSTRUMENT_TOKEN_CACHE = {
    // Example: 'TCS': 2953217 (Token for NSE:TCS)
  };
  if (!window.__kite_instrument_tokens) {
    console.warn('Instrument tokens mapping is missing. Live streaming requires instrument-token mapping.');
    return () => {};
  }
  const tokens = symbols.map(s => window.__kite_instrument_tokens[s]).filter(Boolean);
  if (!tokens.length) return () => {};

  // Use tokens from session (runtime login)
  if (!mcpSession.apiKey || !mcpSession.accessToken) {
    throw new Error("Not authenticated to MCP: please login first.");
  }
  const ws = new WebSocket(`${ZERODHA_WS_ROOT}?api_key=${mcpSession.apiKey}&access_token=${mcpSession.accessToken}`);
  let isSubscribed = false;

  ws.onopen = function () {
    // Subscribe to the instruments
    ws.send(JSON.stringify({ a: 'subscribe', v: tokens }));
    isSubscribed = true;
  };
  ws.onmessage = function (event) {
    // Parse the binary ticks to LTP - for a real app, use KiteConnect JS SDK (if possible)
    // For brevity, assume event.data is JSON with { token, ltp }
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
          // Reverse map token to symbol
          const symbol = Object.keys(window.__kite_instrument_tokens)
            .find(s => window.__kite_instrument_tokens[s] === tick.token);
          if (symbol) prices[symbol] = tick.ltp;
        }
      });
      onUpdate(prices);
    }
  };
  ws.onerror = e => {
    console.error('Zerodha MCP WebSocket error', e);
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
 * 
 * @returns {Promise<Array<{title:string,description:string,action?:object}>>}
 */
export async function fetchRecommendations() {
  // Placeholder: If Zerodha MCP provides recommendations, use their endpoint
  // Otherwise, fetch from backend API if performing custom analytics
  // For example:
  //   const response = await fetch('/api/recommendations', {headers: getAuthHeaders() });
  // For now, throw unimplemented:
  throw new Error("fetchRecommendations: Integration with real MCP analytics not implemented – connect to backend or Zerodha AI recommendations endpoint.");
}

// PUBLIC_INTERFACE
/**
 * Place a trade via Zerodha Kite Connect order API.
 * 
 * @param {object} params { symbol, quantity, type }
 * @returns {Promise<{status, message}>}
 */
export async function placeTrade({ symbol, quantity, type }) {
  // Supported types: BUY, SELL
  // Place equity order: POST /orders/regular
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

