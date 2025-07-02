import React from "react";
import { FaChartBar, FaWallet, FaRegLightbulb, FaExchangeAlt, FaCogs } from "react-icons/fa";

// PUBLIC_INTERFACE
export default function Sidebar({ selected, onSelect }) {
  /**
   * Sidebar navigation for the dashboard.
   * @param selected {string} - Currently selected menu item.
   * @param onSelect {function} - Callback to change selected menu.
   */
  const navItems = [
    { key: "portfolio", label: "Portfolio", icon: <FaWallet /> },
    { key: "insights", label: "Insights", icon: <FaChartBar /> },
    { key: "trade", label: "Trade", icon: <FaExchangeAlt /> },
    { key: "recommendations", label: "Recommendations", icon: <FaRegLightbulb /> },
    { key: "settings", label: "Settings", icon: <FaCogs /> }
  ];

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">StockSmart</h2>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.key}
            className={`sidebar-item${selected === item.key ? " active" : ""}`}
            onClick={() => onSelect(item.key)}
            tabIndex={0}
            role="button"
            aria-label={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
