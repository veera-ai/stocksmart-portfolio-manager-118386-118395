const mockPortfolio = [
  { symbol: "TCS", quantity: 10, buyPrice: 3200.0 },
  { symbol: "INFY", quantity: 5, buyPrice: 1450.0 },
  { symbol: "RELIANCE", quantity: 8, buyPrice: 2350.9 },
];

const mockPrices = {
  TCS: 3370.5,
  INFY: 1506.25,
  RELIANCE: 2295.1,
};

const mockRecommendations = [
  {
    title: "Increase Holdings in INFY",
    description: "INFY has shown positive momentum. Consider increasing your position for better diversification.",
    action: { label: "Buy More", url: "https://kite.zerodha.com/order/INFY" }
  },
  {
    title: "Book Profits in TCS",
    description: "Your holdings in TCS are up 5%. Consider partial profit booking.",
    action: { label: "Sell Now", url: "https://kite.zerodha.com/order/TCS" }
  }
];

// PUBLIC_INTERFACE
export async function fetchPortfolio() {
  // Integrate with Zerodha Kite API for production; using mock data here.
  return new Promise(resolve => setTimeout(() => resolve([...mockPortfolio]), 500));
}

// PUBLIC_INTERFACE
export async function fetchLivePrices(symbols) {
  // Integrate with Zerodha MCP live data for production; using mock data here.
  return new Promise(resolve =>
    setTimeout(
      () => resolve(symbols.reduce((acc, s) => ({ ...acc, [s]: mockPrices[s] || 1000 }), {})),
      400
    )
  );
}

// PUBLIC_INTERFACE
export async function fetchRecommendations() {
  // Integrate with personalized MCP API in production.
  return new Promise(resolve => setTimeout(() => resolve(mockRecommendations), 600));
}

// PUBLIC_INTERFACE
export async function placeTrade({ symbol, quantity, type }) {
  // Trigger trade via Zerodha Kite API.
  console.log(`[Order Placed] ${type} ${quantity} shares of ${symbol}`);
  return new Promise(resolve =>
    setTimeout(() => resolve({ status: "success", message: "Order placed successfully." }), 700)
  );
}
