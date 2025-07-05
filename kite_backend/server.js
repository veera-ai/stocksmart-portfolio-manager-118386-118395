//
// Backend Express server to handle Zerodha Kite Connect OAuth authentication & portfolio endpoints
//

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();

const APP_PORT = process.env.KITE_BACKEND_PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";
const SESSION_SECRET = process.env.SESSION_SECRET || 'replace_this_with_long_random_string';

const KITE_API_KEY = process.env.ZERODHA_API_KEY;
const KITE_API_SECRET = process.env.ZERODHA_API_SECRET;

// --- CORS Setup ---
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));

// --- Session Management ---
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // true if HTTPS
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  }
}));

app.use(express.json());

/**
 * PUBLIC_INTERFACE
 * GET /api/login/kite
 * Redirects user to Zerodha Kite Connect login for OAuth authorization.
 * After successful login, user is redirected to /api/auth/kite/callback with request_token.
 */
app.get('/api/login/kite', (req, res) => {
  /**
   * Kite login URL docs: https://kite.trade/docs/connect/v3/#login-flow
   */
  if (!KITE_API_KEY) {
    return res.status(500).send({ error: "KITE API Key not configured in server." });
  }
  const redirectUri = buildRedirectUri(req);
  const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${KITE_API_KEY}&v=3&redirect_uri=${encodeURIComponent(redirectUri)}`;
  res.redirect(loginUrl);
});

/**
 * PUBLIC_INTERFACE
 * GET /api/auth/kite/callback
 * Handles redirect from Kite, exchanges request_token for access_token, sets session.
 * Params: ?request_token, ?error, ?action
 */
app.get('/api/auth/kite/callback', async (req, res) => {
  const { request_token, error, action } = req.query;
  if (error) {
    return res.status(400).send(`<h1>Kite API Error</h1><p>${error}: ${action || ''}</p>`);
  }
  if (!request_token) {
    return res.status(400).send("<h1>Kite API Error: No request_token returned.</h1>");
  }
  // Exchange request_token for access_token
  try {
    const response = await axios.post("https://api.kite.trade/session/token", {
      api_key: KITE_API_KEY,
      request_token,
      api_secret: KITE_API_SECRET,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.data || !response.data.data || !response.data.data.access_token) {
      throw new Error("Missing access_token from Kite Connect auth response.");
    }
    // Store access_token in user session (never expose to frontend)
    req.session.kite_access_token = response.data.data.access_token;
    req.session.kite_login_time = Date.now();
    // Optionally, also store user_id, etc for info
    req.session.kite_user_id = response.data.data.user_id || null;

    // After login success, redirect to frontend (which should check holding endpoint)
    res.redirect(CLIENT_URL + "/?oauth=success");
  } catch (err) {
    return res.status(400).send(`<h1>Kite OAuth Failed</h1><div style="color:crimson">${err.response?.data?.message || err.message}</div>`);
  }
});

/**
 * PUBLIC_INTERFACE
 * GET /api/portfolio/holdings
 * Returns the user's live portfolio holdings from Kite Connect. Requires prior login & access_token in session.
 */
app.get('/api/portfolio/holdings', async (req, res) => {
  if (!req.session.kite_access_token) {
    return res.status(401).json({ error: "Not authenticated. Please login with Kite." });
  }
  try {
    const result = await axios.get('https://api.kite.trade/portfolio/holdings', {
      headers: {
        "X-Kite-Version": "3",
        "Authorization": `token ${KITE_API_KEY}:${req.session.kite_access_token}`
      }
    });
    return res.json({ data: result.data.data });
  } catch (err) {
    if (err.response && err.response.status === 403) {
      // Might be expired token
      req.session.kite_access_token = undefined;
      return res.status(401).json({ error: "Session expired with Kite. Please login again." });
    }
    return res.status(500).json({ error: "Failed to fetch portfolio holdings", details: err.message });
  }
});

/**
 * PUBLIC_INTERFACE
 * GET /api/session/status
 * For checking Kite login status from frontend.
 */
app.get('/api/session/status', (req, res) => {
  res.json({ loggedIn: !!req.session.kite_access_token, user_id: req.session.kite_user_id || null });
});

// Helper for correct redirect_uri
function buildRedirectUri(req) {
  const domain = process.env.KITE_REDIRECT_URI || (req.protocol + '://' + req.get('host') + '/api/auth/kite/callback');
  return domain;
}

// --- Healthcheck ---
app.get('/api/health', (req, res) => res.json({ status: "ok" }));

// --- Static serve for production builds (optional) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Start Server ---
app.listen(APP_PORT, () => {
  console.log(`Kite backend running on port ${APP_PORT}`);
  console.log(`Frontend expected at: ${CLIENT_URL}`);
});

