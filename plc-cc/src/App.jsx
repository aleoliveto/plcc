import React, { useEffect, useMemo, useState } from "react";

/* ===========================
   Small helpers
=========================== */
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
function useLocalState(key, initialValue) {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initialValue; }
    catch { return initialValue; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

const NAV = [
  { key: "dashboard", label: "Dashboard" },
  { key: "calendar", label: "Calendar" },
  { key: "properties", label: "Properties" },
  { key: "contacts", label: "Contacts" },
  { key: "travel", label: "Travel" },
  { key: "assets", label: "Assets" },
  { key: "dates", label: "Important Dates" },
  { key: "requests", label: "Requests" },
  { key: "onboarding", label: "Onboarding" },
];

const SEED_REQUESTS = [
  { id: uid(), title: "Table for four, Saturday 20:00", category: "Dining", priority: "Medium", status: "Open", assignee: "Concierge", dueDate: new Date().toISOString().slice(0, 10), createdAt: Date.now(), notes: "Prefer a quiet corner. Italian or French." },
  { id: uid(), title: "Airport transfer Friday", category: "Travel", priority: "High", status: "In Progress", assignee: "Chauffeur", dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), createdAt: Date.now() - 3600_000, notes: "From Mayfair to LHR T5 at 13:00." },
  { id: uid(), title: "Garden maintenance", category: "Home", priority: "Low", status: "Done", assignee: "Gardener", dueDate: "", createdAt: Date.now() - 86400_000 * 2, notes: "Front hedges and patio clean." },
];

export default function App() {
  const [route, setRoute] = useState("dashboard");
  const [onboarding, setOnboarding] = useLocalState("plc_onboarding_v1", {});
  const [requests, setRequests] = useLocalState("plc_requests_v1", SEED_REQUESTS);

  // Toasts
  const [toasts, setToasts] = useState([]);
  function notify(message, tone = "success") {
    const id = uid();
    setToasts(t => [...t, { id, message, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }

  // Request Drawer & Chat Drawer
  const [activeReqId, setActiveReqId] = useState(null);
  const activeReq = requests.find(r => r.id === activeReqId) || null;
  const [chatOpen, setChatOpen] = useState(false);
  const [chat, setChat] = useLocalState("plc_chat_v1", [
    { id: uid(), who: "concierge", text: "Good morning—your gym car is booked for 07:40.", at: Date.now()-7200_000 },
    { id: uid(), who: "me", text: "Perfect. Please add a table for 4 on Saturday 20:00 somewhere quiet.", at: Date.now()-7100_000 },
  ]);

  // Derived briefing
  const briefing = useMemo(() => {
    const name = onboarding.personal?.preferredName || onboarding.personal?.fullName || "Client";
    const comms = onboarding.comms?.dailyUpdate || "WhatsApp";
    return {
      name,
      hello: `Good morning, ${name}.`,
      dateStr: new Date().toLocaleDateString(),
      schedule: [
        { time: "08:00", item: "Gym session booked, car arrives 07:40" },
        { time: "11:30", item: "Call with wealth manager" },
        { time: "14:00", item: "Housekeeper weekly deep clean" },
      ],
      reminders: ["Passport renewal forms submitted", "Restaurant confirmed for Saturday, 20:00, table for 4"],
      travel: { upcoming: "LON → NCE Friday 16:10. Chauffeur arranged." },
      comms,
    };
  }, [onboarding]);

  // Requests CRUD
  function createRequest(payload) {
    const rec = { id: uid(), createdAt: Date.now(), status: "Open", ...payload };
    setRequests([rec, ...requests]);
    notify("Request created");
    setActiveReqId(rec.id);
  }
  function updateRequest(id, patch) {
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }
  function deleteRequest(id) {
    setRequests(prev => prev.filter(r => r.id !== id));
    notify("Request deleted", "info");
    if (activeReqId === id) setActiveReqId(null);
  }

  // Keyboard shortcuts: "n" = new request, "/" = search on Requests page, "c" = chat
  useEffect(() => {
    function onKey(e) {
      if (e.key === "n") { setRoute("requests"); setActiveReqId("new"); e.preventDefault(); }
      if (e.key === "/") { setRoute("requests"); setActiveReqId(null); e.preventDefault(); }
      if (e.key.toLowerCase() === "c") { setChatOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeReqId]);

  return (
    <div className="app">
      <TopBar onNewRequest={() => { setRoute("requests"); setActiveReqId("new"); }} />
      <div className="shell">
        <SideBar route={route} onNavigate={setRoute} />
        <main className="main">
          {route === "dashboard" && (
            <>
              <div className="container">
                <SummaryStrip
                  name={briefing.name}
                  openCount={requests.filter(r => r.status !== "Done").length}
                  nextTrip="LON → NCE · Fri 16:10"
                  comms={briefing.comms}
                  onNewRequest={() => { setRoute("requests"); setActiveReqId("new"); }}
                />
              </div>
              <Dashboard
                briefing={briefing}
                requests={requests}
                onNewRequest={() => { setRoute("requests"); setActiveReqId("new"); }}
                onOpenRequest={id => { setRoute("requests"); setActiveReqId(id); }}
              />
            </>
          )}

          {route === "onboarding" && (
            <OnboardingForm data={onboarding} onChange={setOnboarding} onComplete={() => { setRoute("dashboard"); notify("Onboarding saved"); }} />
          )}

          {route === "requests" && (
            <Requests
              items={requests}
              onCreate={createRequest}
              onUpdate={updateRequest}
              onDelete={deleteRequest}
              onOpen={id => setActiveReqId(id)}
            />
          )}

          {route !== "dashboard" && route !== "onboarding" && route !== "requests" && (
            <ComingSoon label={NAV.find((n) => n.key === route)?.label || ""} />
          )}
        </main>
      </div>

      {/* Floating Chat button */}
      <button className="fab" title="Concierge Chat (c)" onClick={() => setChatOpen(true)}>
        <svg viewBox="0 0 24 24" className="icon-18"><path d="M21 12a8 8 0 11-3.1-6.3L22 4l-1.8 3.9A8 8 0 0121 12z" fill="currentColor" opacity=".15"/><path d="M12 20c4.4 0 8-3.1 8-7s-3.6-7-8-7-8 3.1-8 7c0 1.5.5 2.9 1.4 4.1L4 22l5.3-2.3c.8.2 1.7.3 2.7.3z" stroke="currentColor" strokeWidth="1.3" fill="none"/></svg>
      </button>

      {/* Drawers & Toasts */}
      {activeReqId && (
        <RequestDrawer
          mode={activeReqId === "new" ? "new" : "view"}
          request={activeReq}
          onClose={() => setActiveReqId(null)}
          onCreate={(payload) => createRequest(payload)}
          onUpdate={patch => activeReq && updateRequest(activeReq.id, patch)}
        />
      )}
      {chatOpen && (
        <ChatDrawer
          messages={chat}
          onSend={(text) => {
            const m = { id: uid(), who: "me", text, at: Date.now() };
            setChat([...chat, m]);
            setTimeout(() => setChat(c => [...c, { id: uid(), who: "concierge", text: "Noted. I’ll confirm shortly.", at: Date.now() }]), 700);
          }}
          onClose={() => setChatOpen(false)}
        />
      )}
      <ToastHost items={toasts} />
    </div>
  );
}

/* ===========================
   Shell
=========================== */
function TopBar({ onNewRequest }) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="monogram"><PLMonogram /></div>
          <div className="brand-title">
            <div className="brand-subtle">Private Life</div>
            <div className="brand-strong">Command Center</div>
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-primary" onClick={onNewRequest}>New Request</button>
          <button className="btn btn-ghost">Profile</button>
        </div>
      </div>
    </header>
  );
}
function PLMonogram() {
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 50V14h9c9 0 15 5 15 13 0 8-6 13-15 13h-4v10h-5zm9-18c6 0 10-3 10-8s-4-8-10-8h-4v16h4z" fill="#151515"/>
      <path d="M41 14h5v36h-5c-10 0-17-7-17-18s7-18 17-18z" fill="#151515" opacity=".9"/>
    </svg>
  );
}
function SideBar({ route, onNavigate }) {
  return (
    <aside className="sidebar">
      <nav className="nav">
        {NAV.map((item) => (
          <button key={item.key} className={route === item.key ? "active" : ""} onClick={() => onNavigate(item.key)}>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

/* ===========================
   Summary strip
=========================== */
function SummaryStrip({ name, openCount, nextTrip, comms, onNewRequest }) {
  return (
    <div className="summary">
      <div className="summary__left">
        <div className="summary__hello">Good morning</div>
        <h2 className="summary__title">{name}</h2>
        <div className="chip">Daily briefing via {comms}</div>
      </div>

      <div className="kpis">
        <KPI label="Open Requests" value={openCount} />
        <KPI label="Next Trip" value={nextTrip} />
        <KPI label="Properties" value="2" />
      </div>

      <div className="summary__cta">
        <button className="btn btn-primary" onClick={onNewRequest}>New Request</button>
      </div>
    </div>
  );
}
function KPI({ label, value }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
    </div>
  );
}

function Section({ title, right, children }) {
  return (
    <section className="section">
      <div className="section-header">
        <h3>{title}</h3>
        <div className="meta">{right}</div>
      </div>
      {children}
    </section>
  );
}
function Stat({ label, value }) { return (<div className="stat"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></div>); }

/* ===========================
   Dashboard
=========================== */
function Dashboard({ briefing, requests, onNewRequest, onOpenRequest }) {
  const openReqs = useMemo(() => requests.filter((r) => r.status !== "Done").slice(0, 3), [requests]);

  return (
    <div className="container grid-3">
      <Section title="Morning Briefing" right={<span>{briefing.dateStr}</span>}>
        <div className="mono-note" style={{ marginBottom: 10 }}>{briefing.hello}</div>
        <div className="grid-2">
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Today</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {briefing.schedule.map((s, i) => (
                <li key={i} style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: 10 }}>
                  <div className="bullet" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.time}</div>
                    <div style={{ fontSize: 14, color: "#333" }}>{s.item}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Reminders</div>
            <ul style={{ paddingLeft: 18, margin: 0, display: "grid", gap: 6 }}>
              {briefing.reminders.map((r, i) => (<li key={i} style={{ fontSize: 14 }}>{r}</li>))}
            </ul>
            <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "var(--ivory)", border: "1px solid var(--line)", fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>Travel</div>
              <div>{briefing.travel.upcoming}</div>
              <div className="mono-note" style={{ marginTop: 6 }}>Daily update sent via {briefing.comms}.</div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="At a Glance">
        <div className="grid-2">
          <Stat label="Open requests" value={requests.filter(r => r.status !== "Done").length} />
          <Stat label="This week events" value="9" />
          <Stat label="Properties" value="2" />
          <Stat label="Staff" value="5" />
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={onNewRequest}>Create request</button>
      </Section>

      <Section title="Quick Actions">
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <QuickAction icon={IconRestaurant} label="Book restaurant" onClick={onNewRequest} />
          <QuickAction icon={IconWrench} label="Schedule maintenance" onClick={onNewRequest} />
          <QuickAction icon={IconPlane} label="Plan trip" onClick={onNewRequest} />
          <QuickAction icon={IconGift} label="Gift reminder" onClick={onNewRequest} />
        </div>
      </Section>

      <Section title="Inbox">
        <div style={{ display: "grid", gap: 12 }}>
          <InboxItem who="Concierge" summary="Your dry cleaning delivered to Mayfair residence" />
          <InboxItem who="Travel" summary="NCE flight upgraded. Car confirmed." />
          <InboxItem who="Home" summary="Landscaping visit moved to 10:00" />
        </div>
      </Section>

      <Section title="Open Requests">
        {openReqs.length === 0 ? (
          <div className="mono-note">No open requests.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Assignee</th></tr></thead>
            <tbody>
              {openReqs.map((r) => (
                <tr key={r.id} className="row-click" onClick={() => onOpenRequest(r.id)}>
                  <td><div className="row-title">{r.title}</div><div className="row-sub">{r.notes}</div></td>
                  <td><TagStatus value={r.status} /></td>
                  <td><TagPriority value={r.priority} /></td>
                  <td>{r.dueDate || "—"}</td>
                  <td>{r.assignee || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Notes">
        <textarea className="textarea" placeholder="Leave a note for your concierge" style={{ width: "100%", height: 160 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn btn-primary">Send</button>
        </div>
      </Section>
    </div>
  );
}

/* quick actions with icons */
function QuickAction({ label, icon: Icon, onClick }) {
  return (
    <button className="qa" onClick={onClick}>
      <span>{label}</span>
      <Icon />
    </button>
  );
}
function IconPlane(){return(<svg className="icon-16" viewBox="0 0 24 24" fill="none"><path d="M2 12l19-7-7 19-3-8-8-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>)}
function IconWrench(){return(<svg className="icon-16" viewBox="0 0 24 24" fill="none"><path d="M14 7a5 5 0 017 7l-5-2-5 5-2-5-5-5a5 5 0 017-7l3 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>)}
function IconRestaurant(){return(<svg className="icon-16" viewBox="0 0 24 24" fill="none"><path d="M7 2v10M11 2v10M7 7h4M17 2v10a4 4 0 01-4 4h-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>)}
function IconGift(){return(<svg className="icon-16" viewBox="0 0 24 24" fill="none"><path d="M20 7H4v14h16V7zM4 11h16M12 7v14M8 7s-2-1.5-2-3 2-2 3-1 3 4 3 4M16 7s2-1.5 2-3-2-2-3-1-3 4-3 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>)}

function InboxItem({ who, summary }) { return (<div className="inbox-item"><div className="who">{who}</div><div style={{ fontWeight: 600 }}>{summary}</div></div>); }
function TagStatus({ value }) {
  const cls = value === "Open" ? "tag tag--open" : value === "In Progress" ? "tag tag--progress" : "tag tag--done";
  return <span className={cls}>{value}</span>;
}
function TagPriority({ value }) {
  const cls = value === "Urgent" ? "tag tag--urgent" : value === "High" ? "tag tag--high" : value === "Medium" ? "tag tag--medium" : "tag tag--low";
  return <span className={cls}>{value}</span>;
}

/* ===========================
   Requests list
=========================== */
function Requests({ items, onCreate, onUpdate, onDelete, onOpen }) {
  const [q, setQ] = useState(""); const [status, setStatus] = useState("All"); const [prio, setPrio] = useState("All");
  const filtered = useMemo(() => items
    .filter(r => (status === "All" ? true : r.status === status))
    .filter(r => (prio === "All" ? true : r.priority === prio))
    .filter(r => (q.trim() ? (r.title + r.notes).toLowerCase().includes(q.toLowerCase()) : true))
    .sort((a, b) => b.createdAt - a.createdAt), [items, q, status, prio]);

  return (
    <div className="container">
      <div className="section" style={{ marginBottom: 16 }}>
        <div className="section-header"><h3>Requests</h3><div className="meta">{items.length} total</div></div>
        <div className="toolbar">
          <input className="input" placeholder="Search…  (press /)" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Open</option><option>In Progress</option><option>Done</option></select>
          <select className="select" value={prio} onChange={(e) => setPrio(e.target.value)}><option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
          <button className="btn btn-primary" onClick={() => onOpen("new")}>New Request</button>
        </div>
      </div>

      <div className="section">
        <table className="table">
          <thead><tr><th style={{ width: "34%" }}>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Assignee</th><th style={{ width: 120 }}>Actions</th></tr></thead>
        </table>
        <div className="table-scroll">
          <table className="table">
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="row-click" onClick={() => onOpen(r.id)}>
                  <td style={{ width: "34%" }}><div className="row-title">{r.title}</div><div className="row-sub">{r.notes}</div></td>
                  <td><TagStatus value={r.status} /></td>
                  <td><TagPriority value={r.priority} /></td>
                  <td>{r.dueDate || "—"}</td>
                  <td>{r.assignee || "—"}</td>
                  <td>
                    <div className="row-actions">
                      {r.status !== "Done" && <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onUpdate(r.id, { status: "Done" }); }}>Mark done</button>}
                      {r.status === "Open" && <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onUpdate(r.id, { status: "In Progress" }); }}>Start</button>}
                      <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (<tr><td colSpan={6}><div className="mono-note">No results.</div></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Request Drawer with Timeline
=========================== */
function RequestDrawer({ mode, request, onClose, onCreate, onUpdate }) {
  const [title, setTitle] = useState(request?.title || "");
  const [category, setCategory] = useState(request?.category || "General");
  const [priority, setPriority] = useState(request?.priority || "Medium");
  const [assignee, setAssignee] = useState(request?.assignee || "");
  const [dueDate, setDueDate] = useState(request?.dueDate || "");
  const [notes, setNotes] = useState(request?.notes || "");

  const timeline = (request && [
    { t: request.createdAt, label: "Created" },
    request.status === "In Progress" ? { t: request.createdAt + 5_000, label: "Work started" } : null,
    request.dueDate ? { t: new Date(request.dueDate).getTime(), label: "Due" } : null,
    request.status === "Done" ? { t: Date.now(), label: "Completed" } : null,
  ].filter(Boolean)) || [];

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <h3>{mode === "new" ? "New Request" : "Request Details"}</h3>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </header>

        <div className="drawer-body">
          <div className="form-grid">
            <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="field"><label>Category</label><select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>General</option><option>Home</option><option>Travel</option><option>Dining</option><option>Gifting</option>
            </select></div>
            <div className="field"><label>Priority</label><select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
            </select></div>
            <div className="field"><label>Assignee</label><input className="input" value={assignee} onChange={(e) => setAssignee(e.target.value)} /></div>
            <div className="field"><label>Due date</label><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}><label>Notes</label><textarea className="textarea" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>

          {mode === "view" && (
            <>
              <div className="divider"></div>
              <div className="timeline">
                {timeline.map((it, i) => (
                  <div className="tl-row" key={i}>
                    <div className="tl-dot" />
                    <div className="tl-body">
                      <div className="tl-label">{it.label}</div>
                      <div className="tl-time">{new Date(it.t).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {timeline.length === 0 && <div className="mono-note">No activity yet.</div>}
              </div>

              <div className="drawer-actions">
                {request?.status !== "Done" && <button className="btn btn-ghost" onClick={() => onUpdate({ status: "Done" })}>Mark done</button>}
                {request?.status === "Open" && <button className="btn btn-ghost" onClick={() => onUpdate({ status: "In Progress" })}>Start</button>}
              </div>
            </>
          )}
        </div>

        <footer className="drawer-foot">
          {mode === "new" ? (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={() => onCreate({ title, category, priority, assignee, dueDate, notes })} disabled={!title.trim()}>Create</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Close</button>
              <button className="btn btn-primary" onClick={() => onUpdate({ title, category, priority, assignee, dueDate, notes })} disabled={!title.trim()}>Save</button>
            </>
          )}
        </footer>
      </aside>
    </div>
  );
}

/* ===========================
   Concierge Chat Drawer
=========================== */
function ChatDrawer({ messages, onSend, onClose }) {
  const [text, setText] = useState("");
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <div className="sheet" onMouseDown={(e) => e.stopPropagation()}>
        <header className="sheet-head">
          <div className="brand-subtle">Concierge</div>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </header>

        <div className="chat">
          {messages.map(m => (
            <div key={m.id} className={`bubble ${m.who === "me" ? "me" : "them"}`}>
              <div className="bubble-text">{m.text}</div>
              <div className="bubble-time">{new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          ))}
        </div>

        <div className="sheet-foot">
          <input className="input" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) { onSend(text.trim()); setText(""); } }} />
          <button className="btn btn-primary" onClick={() => { if (text.trim()) { onSend(text.trim()); setText(""); } }}>Send</button>
        </div>
      </div>
    </div>
  );
}

/* ===========================
   Toasts
=========================== */
function ToastHost({ items }) {
  return (
    <div className="toast-host">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.tone === "info" ? "toast--info" : "toast--ok"}`}>
          {t.tone === "info" ? "•" : "✓"} <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

/* ===========================
   Onboarding (persisted) & helpers
=========================== */
function OnboardingForm({ data, onChange, onComplete }) {
  const [step, setStep] = useState(1); const total = 8;
  function setSection(section, patch) { onChange({ ...data, [section]: { ...(data[section] || {}), ...patch } }); }

  return (
    <div className="container">
      <header style={{ marginBottom: 16 }}><h2 style={{ margin: "0 0 4px 0" }}>Client Onboarding</h2><div className="mono-note">Step {step} of {total}</div></header>

      {step === 1 && (
        <Card title="1. Personal & Family Information">
          <div className="form-grid">
            <Field label="Full Name"><Input value={data.personal?.fullName || ""} onChange={(e) => setSection("personal", { fullName: e.target.value })} placeholder="Jane Alexandra Doe" /></Field>
            <Field label="Preferred Name/Nickname"><Input value={data.personal?.preferredName || ""} onChange={(e) => setSection("personal", { preferredName: e.target.value })} placeholder="Jane" /></Field>
            <Field label="Date of Birth"><Input type="date" value={data.personal?.dob || ""} onChange={(e) => setSection("personal", { dob: e.target.value })} /></Field>
            <Field label="Spouse/Partner Name"><Input value={data.personal?.spouseName || ""} onChange={(e) => setSection("personal", { spouseName: e.target.value })} placeholder="John Doe" /></Field>
            <Field label="Spouse/Partner Date of Birth"><Input type="date" value={data.personal?.spouseDob || ""} onChange={(e) => setSection("personal", { spouseDob: e.target.value })} /></Field>
          </div>
          <div style={{ marginTop: 12 }}><Field label="Children (names and birthdays)"><TextArea rows={3} value={data.personal?.children || ""} onChange={(e) => setSection("personal", { children: e.target.value })} placeholder="Add each on a new line" /></Field></div>
          <OnbNav onNext={() => setStep(2)} />
        </Card>
      )}

      {step === 2 && (
        <Card title="2. Key Contacts and Household Staff">
          <div className="grid-2">
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Professional Team</div>
              <div className="form-grid">
                <Field label="Lawyer"><Input value={data.contacts?.lawyer || ""} onChange={(e) => setSection("contacts", { lawyer: e.target.value })} placeholder="Name, mobile, email" /></Field>
                <Field label="Accountant"><Input value={data.contacts?.accountant || ""} onChange={(e) => setSection("contacts", { accountant: e.target.value })} placeholder="Name, mobile, email" /></Field>
                <Field label="Wealth Manager/Private Banker"><Input value={data.contacts?.wealth || ""} onChange={(e) => setSection("contacts", { wealth: e.target.value })} placeholder="Name, mobile, email" /></Field>
                <Field label="Business PA / Personal Assistant"><Input value={data.contacts?.pa || ""} onChange={(e) => setSection("contacts", { pa: e.target.value })} placeholder="Name, mobile, email" /></Field>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Household Staff</div>
              <div className="form-grid">
                <Field label="Driver"><Input value={data.staff?.driver || ""} onChange={(e) => setSection("staff", { driver: e.target.value })} placeholder="Name, contact, schedule" /></Field>
                <Field label="Chef"><Input value={data.staff?.chef || ""} onChange={(e) => setSection("staff", { chef: e.target.value })} placeholder="Name, contact, schedule" /></Field>
                <Field label="Cleaner"><Input value={data.staff?.cleaner || ""} onChange={(e) => setSection("staff", { cleaner: e.target.value })} placeholder="Name, contact, schedule" /></Field>
                <Field label="Gardener"><Input value={data.staff?.gardener || ""} onChange={(e) => setSection("staff", { gardener: e.target.value })} placeholder="Name, contact, schedule" /></Field>
              </div>
            </div>
          </div>
          <OnbNav onBack={() => setStep(1)} onNext={() => setStep(3)} />
        </Card>
      )}

      {step === 3 && (
        <Card title="3. Properties">
          <div className="form-grid">
            <Field label="Address"><Input value={data.property?.address || ""} onChange={(e) => setSection("property", { address: e.target.value })} placeholder="Address" /></Field>
            <Field label="Access Instructions"><Input value={data.property?.access || ""} onChange={(e) => setSection("property", { access: e.target.value })} placeholder="Codes, keys, concierge" /></Field>
            <Field label="Main Contact"><Input value={data.property?.contact || ""} onChange={(e) => setSection("property", { contact: e.target.value })} placeholder="Caretaker, building manager" /></Field>
            <Field label="Utilities & Service Providers"><TextArea rows={3} value={data.property?.utilities || ""} onChange={(e) => setSection("property", { utilities: e.target.value })} placeholder="Electrician, plumber, cleaner, gardener..." /></Field>
          </div>
          <div style={{ marginTop: 12 }}>
            <Field label="Preferred Maintenance Times"><Input value={data.property?.maint || ""} onChange={(e) => setSection("property", { maint: e.target.value })} placeholder="Weekdays 9–12, avoid Wednesdays" /></Field>
            <Field label="Notes"><TextArea rows={3} value={data.property?.notes || ""} onChange={(e) => setSection("property", { notes: e.target.value })} placeholder="Any special instructions" /></Field>
          </div>
          <OnbNav onBack={() => setStep(2)} onNext={() => setStep(4)} />
        </Card>
      )}

      {step === 4 && (
        <Card title="4. Lifestyle Preferences">
          <div className="form-grid">
            <Field label="Favourite Restaurants"><TextArea rows={3} value={data.life?.restaurants || ""} onChange={(e) => setSection("life", { restaurants: e.target.value })} placeholder="List your favourites" /></Field>
            <Field label="Favourite Hotels/Resorts"><TextArea rows={3} value={data.life?.hotels || ""} onChange={(e) => setSection("life", { hotels: e.target.value })} placeholder="List your favourites" /></Field>
            <Field label="Airline(s) of Choice & Loyalty Numbers"><Input value={data.life?.airlines || ""} onChange={(e) => setSection("life", { airlines: e.target.value })} placeholder="BA, AF… | BA12345" /></Field>
            <Field label="Seating Preferences"><Input value={data.life?.seats || ""} onChange={(e) => setSection("life", { seats: e.target.value })} placeholder="Plane/train seat preferences" /></Field>
            <Field label="Preferred Travel Class"><Input value={data.life?.travelClass || ""} onChange={(e) => setSection("life", { travelClass: e.target.value })} placeholder="First, Business, Premium…" /></Field>
            <Field label="Dietary Restrictions / Allergies"><Input value={data.life?.diet || ""} onChange={(e) => setSection("life", { diet: e.target.value })} placeholder="Gluten free, shellfish…" /></Field>
            <Field label="Food & Drink Preferences"><TextArea rows={3} value={data.life?.food || ""} onChange={(e) => setSection("life", { food: e.target.value })} placeholder="Brands, varietals, staples" /></Field>
            <Field label="Hobbies & Activities"><TextArea rows={3} value={data.life?.hobbies || ""} onChange={(e) => setSection("life", { hobbies: e.target.value })} placeholder="Golf, sailing, art…" /></Field>
            <Field label="Events you enjoy"><TextArea rows={2} value={data.life?.enjoy || ""} onChange={(e) => setSection("life", { enjoy: e.target.value })} placeholder="Charity galas, film premieres…" /></Field>
            <Field label="Events to avoid"><TextArea rows={2} value={data.life?.avoid || ""} onChange={(e) => setSection("life", { avoid: e.target.value })} placeholder="Crowded festivals…" /></Field>
          </div>
          <OnbNav onBack={() => setStep(3)} onNext={() => setStep(5)} />
        </Card>
      )}

      {step === 5 && (
        <Card title="5. Assets">
          <div className="form-grid">
            <Field label="Vehicles"><TextArea rows={3} value={data.assets?.vehicles || ""} onChange={(e) => setSection("assets", { vehicles: e.target.value })} placeholder="Make/Model, licence plate, service schedule, insurance renewal" /></Field>
            <Field label="Yacht/Boat"><TextArea rows={3} value={data.assets?.yacht || ""} onChange={(e) => setSection("assets", { yacht: e.target.value })} placeholder="Name, location, maintenance schedule" /></Field>
            <Field label="Art/Collectibles"><TextArea rows={3} value={data.assets?.art || ""} onChange={(e) => setSection("assets", { art: e.target.value })} placeholder="Storage/display, climate, insurer" /></Field>
          </div>
          <OnbNav onBack={() => setStep(4)} onNext={() => setStep(6)} />
        </Card>
      )}

      {step === 6 && (
        <Card title="6. Important Dates">
          <div className="form-grid">
            <Field label="Anniversaries"><TextArea rows={3} value={data.dates?.anniversaries || ""} onChange={(e) => setSection("dates", { anniversaries: e.target.value })} placeholder="Add key dates" /></Field>
            <Field label="Key Birthdays"><TextArea rows={3} value={data.dates?.birthdays || ""} onChange={(e) => setSection("dates", { birthdays: e.target.value })} placeholder="Add names and dates" /></Field>
            <Field label="Annual Events"><TextArea rows={3} value={data.dates?.annual || ""} onChange={(e) => setSection("dates", { annual: e.target.value })} placeholder="Recurring events" /></Field>
            <Field label="Membership Renewals"><TextArea rows={3} value={data.dates?.renewals || ""} onChange={(e) => setSection("dates", { renewals: e.target.value })} placeholder="Clubs, insurance, services" /></Field>
          </div>
          <OnbNav onBack={() => setStep(5)} onNext={() => setStep(7)} />
        </Card>
      )}

      {step === 7 && (
        <Card title="7. Communication Preferences">
          <div className="form-grid">
            <Field label="Preferred Daily Update Method">
              <Select value={data.comms?.dailyUpdate || "WhatsApp"} onChange={(e) => setSection("comms", { dailyUpdate: e.target.value })}>
                <option>WhatsApp</option><option>Email</option><option>Both</option>
              </Select>
            </Field>
            <Field label="Urgent Matters">
              <Select value={data.comms?.urgent || "Call"} onChange={(e) => setSection("comms", { urgent: e.target.value })}>
                <option>Call</option><option>WhatsApp</option><option>Email</option>
              </Select>
            </Field>
          </div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <Field label="Topics you approve without asking"><TextArea rows={3} value={data.comms?.autoApprove || ""} onChange={(e) => setSection("comms", { autoApprove: e.target.value })} /></Field>
            <Field label="Topics that always require your approval"><TextArea rows={3} value={data.comms?.alwaysAsk || ""} onChange={(e) => setSection("comms", { alwaysAsk: e.target.value })} /></Field>
          </div>
          <OnbNav onBack={() => setStep(6)} onNext={() => setStep(8)} />
        </Card>
      )}

      {step === 8 && (
        <Card title="8. Special Instructions">
          <div className="form-grid">
            <Field label="Personal habits, sensitivities, customs"><TextArea rows={4} value={data.special?.habits || ""} onChange={(e) => setSection("special", { habits: e.target.value })} /></Field>
            <Field label="Anything you never want scheduled, booked, or purchased?"><TextArea rows={4} value={data.special?.never || ""} onChange={(e) => setSection("special", { never: e.target.value })} /></Field>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <span className="mono-note">Signature and date will be collected digitally.</span>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setStep(7)}>Back</button>
              <button className="btn btn-primary" onClick={onComplete}>Submit</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
function OnbNav({ onBack, onNext }) { return (<div className="form-nav">{onBack && <button className="btn btn-ghost" onClick={onBack}>Back</button>}{onNext && <button className="btn btn-primary" onClick={onNext}>Next</button>}</div>); }
function Card({ title, children }) { return (<div className="card" style={{ marginBottom: 16 }}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</div>); }
function Field({ label, children }) { return (<div className="field"><label>{label}</label>{children}</div>); }
function Input(props) { return <input {...props} className="input" />; }
function TextArea(props) { return <textarea {...props} className="textarea" />; }
function Select(props) { return <select {...props} className="select" />; }

/* ===========================
   Coming Soon
=========================== */
function ComingSoon({ label }) {
  return (<div className="container centered"><div style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>{label}</div><p className="mono-note">This section will be implemented next. We will connect it to the secure backend and calendar integrations.</p></div>);
}
