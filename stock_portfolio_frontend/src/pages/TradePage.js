import React, { useState } from "react";

// PUBLIC_INTERFACE
export default function TradePage({ onTrade, availableSymbols }) {
  /**
   * Trading interface for stocks. Options UI stub included, but only stock buy/sell implemented.
   * All trade requests delegated to onTrade callback (Zerodha integration).
   */
  const [tradeType, setTradeType] = useState("STOCK");
  const [symbol, setSymbol] = useState(availableSymbols[0] || "");
  const [quantity, setQuantity] = useState(1);
  const [side, setSide] = useState("BUY");
  const [optionParams, setOptionParams] = useState({
    underlying: availableSymbols[0] || "",
    expiry: "",
    strike: "",
    optionType: "CE",
    optionQty: 25,
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // PUBLIC_INTERFACE
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    try {
      if (tradeType === "STOCK") {
        await onTrade({ symbol, quantity, type: side });
        setStatus(`✅ ${side} order for ${quantity} x ${symbol} placed.`);
      } else {
        // Option order UI stub - not implemented
        setStatus("⚠️ Options trading is not available yet.");
      }
    } catch (err) {
      setStatus("❌ " + (err && err.message ? err.message : "Order failed."));
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Trade</h2>
      <div style={{ marginBottom: "0.6rem" }}>
        <button
          className={`action-btn btn-trade${tradeType === "STOCK" ? " active" : ""}`}
          style={{ marginRight: 10, background: tradeType === "STOCK" ? "var(--primary)" : undefined }}
          onClick={() => setTradeType("STOCK")}
          type="button"
        >
          Stock
        </button>
        <button
          className={`action-btn btn-trade${tradeType === "OPTION" ? " active" : ""}`}
          style={{ background: tradeType === "OPTION" ? "var(--primary)" : undefined }}
          onClick={() => setTradeType("OPTION")}
          type="button"
        >
          Option (coming soon)
        </button>
      </div>
      <form className="trade-form" onSubmit={handleSubmit}>
        {tradeType === "STOCK" && (
          <>
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
                required
              />
            </label>
            <label>
              Type:
              <select value={side} onChange={e => setSide(e.target.value)}>
                <option value="BUY">Buy</option>
                <option value="SELL">Sell</option>
              </select>
            </label>
          </>
        )}
        {tradeType === "OPTION" && (
          <>
            <label>
              Underlying:
              <select
                value={optionParams.underlying}
                onChange={e => setOptionParams(v => ({ ...v, underlying: e.target.value }))}
              >
                {availableSymbols.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Expiry:
              <input
                type="text"
                placeholder="e.g. 2024-06-19"
                value={optionParams.expiry}
                onChange={e => setOptionParams(v => ({ ...v, expiry: e.target.value }))}
              />
            </label>
            <label>
              Strike:
              <input
                type="text"
                placeholder="e.g. 4100"
                value={optionParams.strike}
                onChange={e => setOptionParams(v => ({ ...v, strike: e.target.value }))}
              />
            </label>
            <label>
              Option Type:
              <select
                value={optionParams.optionType}
                onChange={e => setOptionParams(v => ({ ...v, optionType: e.target.value }))}
              >
                <option value="CE">Call</option>
                <option value="PE">Put</option>
              </select>
            </label>
            <label>
              Qty:
              <input
                type="number"
                min={1}
                value={optionParams.optionQty}
                onChange={e => setOptionParams(v => ({ ...v, optionQty: Number(e.target.value) }))}
              />
            </label>
          </>
        )}
        <button className="action-btn btn-trade" type="submit" disabled={loading}>
          {loading ? "Placing..." : (tradeType === "STOCK" ? "Place Stock Order" : "Place Option Order")}
        </button>
      </form>
      <div className="muted" style={{ marginTop: 16 }}>
        * Options trading UI is a preview – support coming soon.<br />
        {status && <span style={{ display: "block", marginTop: 8, color: status.indexOf("✅") === 0 ? "#38e38e" : "#ed9211" }}>{status}</span>}
      </div>
    </div>
  );
}
