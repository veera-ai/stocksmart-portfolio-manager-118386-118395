//
// Backend Express server to handle Zerodha Kite Connect OAuth authentication & portfolio endpoints
//

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

/**
 * Kite Connect OAuth & Portfolio API backend service.
 * 
 * Features:
 *   - /api/login/kite: Redirect for login (OAuth) with Zerodha Kite (GET)
 *   - /api/auth/kite/callback: OAuth callback & token exchange logic (GET)
 *   - /api/portfolio/holdings: Fetch user's portfolio after login (GET)
 *   - /api/session/status: Session status checker (GET)
 * 
 *   Secure session management, error hardening, docstrings, and security best practices included.
 */

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
  name: "sid",
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax", // CSRF mitigation (change to 'strict' if both FE/BE on same domain, else 'lax')
    secure: false, // true if using HTTPS; ensure this is set to true in production with HTTPS!
    maxAge: 2 * 60 * 60 * 1000 // 2 hours
  }
}));

app.use(express.json());

/**
 * PUBLIC_INTERFACE
 * GET /api/login/kite
 * @openapi
 * summary: Start Zerodha Kite OAuth login
 * description: Redirects user to Zerodha's OAuth login screen for authorization. Used to start login flow.
 * tags:
 *   - OAuth
 * responses:
 *   302:
 *     description: Redirects to Kite Connect OAuth login URL.
 */
app.get('/api/login/kite', (req, res) => {
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
 * @openapi
 * summary: OAuth2 callback handler
 * description: Handles Zerodha's OAuth redirect, exchanges request_token for access_token, stores in secure session. Frontend should never receive access_token.
 * tags:
 *   - OAuth
 * parameters:
 *   - in: query
 *     name: request_token
 *     schema:
 *       type: string
 *     description: request_token returned by Kite upon successful auth
 *   - in: query
 *     name: error
 *     schema:
 *       type: string
 *     description: Error code if auth failed
 *   - in: query
 *     name: action
 *     schema:
 *       type: string
 *     description: Error context
 * responses:
 *   302:
 *     description: Redirects to frontend or error message if failed
 */
app.get('/api/auth/kite/callback', async (req, res) => {
  const { request_token, error, action } = req.query;
  if (error) {
    // Output user-friendly error page
    return res.status(400).send(`<h1>Kite API Error</h1><p style="color:crimson">${error}: ${action || ''}</p>`);
  }
  if (!request_token) {
    return res.status(400).send("<h1>Kite API Error: No request_token returned.</h1>");
  }
  // Exchange request_token for access_token
  try {
    const tokenResponse = await axios.post("https://api.kite.trade/session/token", {
      api_key: KITE_API_KEY,
      request_token,
      api_secret: KITE_API_SECRET,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!tokenResponse.data || !tokenResponse.data.data || !tokenResponse.data.data.access_token) {
      throw new Error("Missing access_token from Kite Connect auth response.");
    }
    // Store the sensitive access_token securely in session (HTTP only)
    req.session.kite_access_token = tokenResponse.data.data.access_token;
    req.session.kite_login_time = Date.now();
    req.session.kite_user_id = tokenResponse.data.data.user_id || null;

    // After login success, redirect to frontend (which should check the /api/session/status endpoint)
    res.redirect(CLIENT_URL + "/?oauth=success");
  } catch (err) {
    // Never leak secrets or entire stack to client!
    let msg = err.response?.data?.message || err.message;
    return res.status(400).send(`<h1>Kite OAuth Failed</h1><div style="color:crimson">${msg}</div>`);
  }
});

/**
 * PUBLIC_INTERFACE
 * GET /api/portfolio/holdings
 * @openapi
 * summary: Fetch user's live portfolio holdings from Zerodha
 * description: Returns the user's portfolio holdings as fetched from Kite Connect API. Requires valid session with access_token (OAuth login).
 * tags:
 *   - Portfolio
 * responses:
 *   200:
 *     description: Live portfolio holdings
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             data:
 *               type: array
 *               description: Array of holding objects
 *   401:
 *     description: User not authenticated/session expired
 *   500:
 *     description: Internal server or API error fetching holdings
 */
app.get('/api/portfolio/holdings', async (req, res) => {
  // Session validation for secure endpoint
  if (!req.session.kite_access_token) {
    return res.status(401).json({ error: "Not authenticated. Please login with Kite." });
  }
  try {
    // Secure access_token never leaves BE; used only as API credential
    const result = await axios.get('https://api.kite.trade/portfolio/holdings', {
      headers: {
        "X-Kite-Version": "3",
        "Authorization": `token ${KITE_API_KEY}:${req.session.kite_access_token}`
      }
    });
    if (!result.data || typeof result.data.data !== "object") {
      // Unexpected format from Kite API
      return res.status(500).json({ error: "Unexpected data format from Kite API." });
    }
    return res.json({ data: result.data.data });
  } catch (err) {
    // Handle token expiry specifically (Kite returns 403 on expired)
    if (err.response && err.response.status === 403) {
      req.session.kite_access_token = undefined;
      return res.status(401).json({ error: "Session expired with Kite. Please login again." });
    }
    // Defensive error for all other issues
    const details = err.response?.data?.message || err.message;
    return res.status(500).json({ error: "Failed to fetch portfolio holdings", details });
  }
});

/**
 * PUBLIC_INTERFACE
 * GET /api/session/status
 * @openapi
 * summary: Check login/session status for Kite Connect
 * description: Returns session state (is logged in & user_id if available).
 * tags:
 *   - Session
 * responses:
 *   200:
 *     description: Session info
 *     content:
 *       application/json:
 *         schema:
 *           type: object
 *           properties:
 *             loggedIn:
 *               type: boolean
 *             user_id:
 *               type: string
 */
app.get('/api/session/status', (req, res) => {
  res.json({ loggedIn: !!req.session.kite_access_token, user_id: req.session.kite_user_id || null });
});

// Helper for correct redirect_uri per deployment
function buildRedirectUri(req) {
  // Use env override if provided (recommended in production)
  if (process.env.KITE_REDIRECT_URI) return process.env.KITE_REDIRECT_URI;
  // Else construct from request (useful for dev)
  return req.protocol + '://' + req.get('host') + '/api/auth/kite/callback';
}

// --- Healthcheck route ---
app.get('/api/health', (req, res) => res.json({ status: "ok" }));

// --- Static serve for production builds (optional; ensure static dir exists if used) ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Start Server ---
app.listen(APP_PORT, () => {
  console.log(`Kite backend running on port ${APP_PORT}`);
  console.log(`Frontend expected at: ${CLIENT_URL}`);
});

