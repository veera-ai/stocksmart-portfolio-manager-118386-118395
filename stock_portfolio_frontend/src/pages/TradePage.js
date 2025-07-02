import React, { useState } from "react";

// PUBLIC_INTERFACE
export default function TradePage({ onTrade, availableSymbols }) {
  /**
   * Simple trading interface for stock/options orders.
   * Integration with APIs should be handled by onTrade callback.
   */
  const [symbol, setSymbol] = useState(availableSymbols[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [type, setType] = useState("BUY");

  // PUBLIC_INTERFACE
  const handleSubmit = (e) => {
    e.preventDefault();
    onTrade({ symbol, quantity, type });
  };

  return (
    <div>
      <h2>Trade</h2>
      <form className="trade-form" onSubmit={handleSubmit}>
        <label>
          Symbol:
          <select value={symbol} onChange={e => setSymbol(e.target.value)}>
            {availableSymbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Quantity:
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
          />
        </label>
        <label>
          Type:
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </label>
        <button className="action-btn btn-trade" type="submit">Place Order</button>
      </form>
      <div className="muted" style={{ marginTop: 16 }}>
        * Options trading coming soon.
      </div>
    </div>
  );
}
