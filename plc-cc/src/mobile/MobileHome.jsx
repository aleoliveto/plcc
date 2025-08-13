import React, { useState } from "react";

export default function MobileHome({
  name = "Client",
  nextEvent,
  leaveInMin,
  pendingCount = 0,
  alertCount = 0,
  onShortcut,        // ({title, notes, category}) => void
  onSendMessage      // (text) => void
}) {
  const first = String(name).split(" ")[0] || name;
  const hour = new Date().getHours();
  const greet = hour >= 18 ? "Good Evening" : hour >= 12 ? "Good Afternoon" : "Good Morning";

  const shortcuts = [
    { label: "I want to book a hotel", emoji: "🏨", title: "Book hotel", notes: "City, dates, room type, vibe", category: "Travel" },
    { label: "Book me a table", emoji: "🍽️", title: "Book restaurant", notes: "Cuisine, date, time, pax, vibe", category: "Dining" },
    { label: "I need flight tickets", emoji: "✈️", title: "Book flights", notes: "Route, dates, pax, class, seats", category: "Travel" },
    { label: "I want to travel", emoji: "🧳", title: "Plan trip", notes: "Destination, dates, interests", category: "Travel" },
    { label: "I’m looking for events", emoji: "🎟️", title: "Get event access", notes: "Event, date, #passes", category: "Access" },
    { label: "Personal shopping / gifts", emoji: "🎁", title: "Gift / shopping", notes: "Recipient, occasion, budget, deliver by", category: "Gifting" },
  ];

  const [msg, setMsg] = useState("");
  const send = () => { if (!msg.trim()) return; onSendMessage?.(msg.trim()); setMsg(""); };

  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <div className="mh-greeting">{greet}, {first}.</div>
        <div className="mh-sub">
          {nextEvent ? `${nextEvent.time} — ${nextEvent.title}` : "No upcoming events"}
          {typeof leaveInMin === "number" && (
            <span className={`pill ${leaveInMin <= 0 ? "pill--late" : ""}`}>
              {leaveInMin > 0 ? `Leave in ${leaveInMin}m` : `Late ${Math.abs(leaveInMin)}m`}
            </span>
          )}
        </div>
        <div className="mh-status">
          <span className="badge">{pendingCount}</span> Decisions
          <span className={`badge ${alertCount ? "badge--alert" : ""}`} style={{marginLeft:8}}>{alertCount}</span> Alerts
        </div>
      </header>

      <div className="mobile-actions">
        {shortcuts.map((s, i) => (
          <button
            key={i}
            className="action"
            onClick={() => onShortcut?.({ title: s.title, notes: s.notes, category: s.category })}
          >
            <span className="a-emoji">{s.emoji}</span>
            <span className="a-label">{s.label}</span>
            <span className="a-arrow">›</span>
          </button>
        ))}
      </div>

      <div className="mobile-chatbar">
        <input
          className="chat-input"
          placeholder="Type a message to your concierge…"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
        />
        <button className="chat-send" onClick={send}>Send</button>
      </div>
    </div>
  );
}
