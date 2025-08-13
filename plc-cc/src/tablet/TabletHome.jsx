import React from "react";

export default function TabletHome({
  name="Client",
  nextEvent, leaveInMin, pendingDecisions=[], unresolvedAlerts=[],
  nextTripSeg, onShortcut, money
}) {
  const first = String(name).split(" ")[0] || name;
  const shortcuts = [
    { t:"Book hotel", n:"City, dates, room type", c:"Travel", emoji:"🏨" },
    { t:"Book restaurant", n:"Cuisine, time, pax", c:"Dining", emoji:"🍽️" },
    { t:"Book flights", n:"Route, dates, class", c:"Travel", emoji:"✈️" },
    { t:"Get event access", n:"Event, date, #passes", c:"Access", emoji:"🎟️" },
    { t:"Gift / shopping", n:"Recipient, budget, deliver by", c:"Gifting", emoji:"🎁" },
    { t:"Chauffeur / car", n:"Pickup, time, bags", c:"Transport", emoji:"🚘" },
  ];

  return (
    <div className="tablet-grid container">
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">How may we assist today, {first}?</h3></div>
        <div className="tablet-actions">
          {shortcuts.map((s,i)=>(
            <button key={i} className="action action--lg"
              onClick={()=>onShortcut?.({title:s.t, notes:s.n, category:s.c})}>
              <span className="a-emoji">{s.emoji}</span>
              <span className="a-label">{s.t}</span>
              <span className="a-sub">{s.n}</span>
              <span className="a-arrow">›</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">Today</h3></div>
        <div className="list">
          <div className="dec-card">
            <div className="dec-head"><span className="chip">Next</span></div>
            <div className="dec-title">{nextEvent ? `${nextEvent.time} — ${nextEvent.title}` : "No upcoming events"}</div>
            <div className="dec-sub">
              {nextEvent?.location || "—"}
              {typeof leaveInMin==="number" && <span className={`pill ${leaveInMin<=0?"pill--late":""}`} style={{marginLeft:8}}>
                {leaveInMin>0?`Leave in ${leaveInMin}m`:`Late ${Math.abs(leaveInMin)}m`}
              </span>}
            </div>
          </div>
          <div className="dec-card"><div className="dec-head"><span className="chip">Decisions</span></div><div className="dec-title">{pendingDecisions.length} pending</div></div>
          <div className="dec-card"><div className="dec-head"><span className="chip">Alerts</span></div><div className="dec-title">{unresolvedAlerts.length ? unresolvedAlerts[0].message : "All clear"}</div><div className="dec-sub">{unresolvedAlerts.length} open</div></div>
          <div className="dec-card"><div className="dec-head"><span className="chip">Travel</span></div><div className="dec-title">{nextTripSeg ? `${nextTripSeg.date} ${nextTripSeg.time} — ${nextTripSeg.detail}` : "No upcoming segments"}</div></div>
          <div className="dec-card"><div className="dec-head"><span className="chip">Spend</span></div><div className="dec-title">MTD Discretionary</div><div className="dec-sub">£{Number(money?.mtdDiscretionary||0).toLocaleString()}</div></div>
        </div>
      </section>
    </div>
  );
}
