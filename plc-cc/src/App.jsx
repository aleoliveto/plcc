import React, { useEffect, useMemo, useState } from "react";

/* ========= Shared helpers ========= */
function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
function useLocalState(key, initial){
  const [v,setV]=useState(()=>{ try{const r=localStorage.getItem(key); return r?JSON.parse(r):initial;}catch{return initial;}});
  useEffect(()=>{ try{localStorage.setItem(key, JSON.stringify(v));}catch{} },[key,v]);
  return [v,setV];
}
function downloadFile(filename, text){
  const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}
function dateToYYYYMMDD(d){ return new Date(d).toISOString().slice(0,10); }
function weekStart(date){ const d=new Date(date); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d; } // Monday

/* ========= Seed data ========= */
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
  { id: uid(), title: "Table for four, Saturday 20:00", category: "Dining", priority: "Medium", status: "Open", assignee: "Concierge", dueDate: dateToYYYYMMDD(Date.now()+86400_000*4), createdAt: Date.now(), notes: "Quiet corner. Italian or French." },
  { id: uid(), title: "Airport transfer Friday", category: "Travel", priority: "High", status: "In Progress", assignee: "Chauffeur", dueDate: dateToYYYYMMDD(Date.now()+86400_000*2), createdAt: Date.now()-3600_000, notes: "Mayfair → LHR T5 at 13:00." },
];

export default function App(){
  /* ---------- Theme ---------- */
  const [theme,setTheme] = useLocalState("plc_theme","noir");
  useEffect(()=>{ document.body.dataset.theme = theme; },[theme]);

  /* ---------- Core state ---------- */
  const [route,setRoute] = useState("dashboard");
  const [onboarding,setOnboarding] = useLocalState("plc_onboarding_v1",{});
  const [requests,setRequests] = useLocalState("plc_requests_v1",SEED_REQUESTS);

  // New pages state
  const [events,setEvents] = useLocalState("plc_events_v1",[
    { id: uid(), title:"Wealth manager call", date: dateToYYYYMMDD(Date.now()+86400_000), time:"11:30", duration:45, location:"Teams", notes:"Review quarterly." },
  ]);
  const [contacts,setContacts] = useLocalState("plc_contacts_v1",[
    { id: uid(), name:"Amelia Clarke", role:"Concierge", email:"concierge@example.com", phone:"+44 20 7000 0000", notes:"Primary contact" },
  ]);
  const [properties,setProperties] = useLocalState("plc_properties_v1",[
    { id: uid(), name:"Mayfair Residence", address:"32 Grosvenor Sq, London", access:"Concierge desk, fob #12", contact:"Edward (Building Mgr) +44 20...", notes:"Deep clean Wednesdays" },
  ]);
  const [trips,setTrips] = useLocalState("plc_trips_v1",[
    { id: uid(), title:"London → Nice", segments:[
      { id: uid(), kind:"Flight", date: dateToYYYYMMDD(Date.now()+86400_000*3), time:"16:10", detail:"BA 0342 LHR → NCE", notes:"Chauffeur arranged" },
      { id: uid(), kind:"Hotel", date: dateToYYYYMMDD(Date.now()+86400_000*3), time:"21:00", detail:"Cheval Blanc, sea-view", notes:"Late check-in" },
    ]},
  ]);
  const [assets,setAssets] = useLocalState("plc_assets_v1",[
    { id: uid(), type:"Vehicle", name:"Bentley Flying Spur", identifier:"LX20 BNT", renewal: dateToYYYYMMDD(Date.now()+86400_000*48), notes:"Service due in Nov" },
    { id: uid(), type:"Art", name:"Warhol lithograph", identifier:"#A12", renewal:"", notes:"Climate 21°C" },
  ]);
  const [datesManual,setDatesManual] = useLocalState("plc_dates_v1",[
    { id: uid(), label:"Anniversary", date: dateToYYYYMMDD(Date.now()+86400_000*30), notes:"Dinner booking" },
  ]);

  /* ---------- UX helpers ---------- */
  const [toasts,setToasts] = useState([]);
  function notify(msg,tone="success"){ const id=uid(); setToasts(t=>[...t,{id,msg,tone}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200); }

  // Global create request (for Properties/Travel quick actions)
  function createRequest(payload){
    const rec = { id: uid(), createdAt: Date.now(), status:"Open", priority:"Medium", ...payload };
    setRequests([rec,...requests]); notify("Request created");
    setRoute("requests"); setActiveReqId(rec.id);
  }

  /* ---------- Drawers ---------- */
  const [activeReqId,setActiveReqId] = useState(null);
  const activeReq = requests.find(r=>r.id===activeReqId)||null;

  /* ---------- Briefing ---------- */
  const briefing = useMemo(()=>{
    const name = onboarding.personal?.preferredName || onboarding.personal?.fullName || "Client";
    const comms = onboarding.comms?.dailyUpdate || "WhatsApp";
    return {
      name, comms,
      dateStr: new Date().toLocaleDateString(),
      schedule:[
        { time:"08:00", item:"Gym session booked, car 07:40" },
        { time:"11:30", item:"Call with wealth manager" },
        { time:"14:00", item:"Housekeeper weekly deep clean" },
      ],
      reminders:["Passport renewal forms submitted","Restaurant confirmed for Sat 20:00 (4)"],
      travel:{ upcoming:"LON → NCE Friday 16:10. Chauffeur arranged." }
    };
  },[onboarding]);

  /* ---------- Data export/import ---------- */
  function exportAll(){
    const data = {
      onboarding, requests, events, contacts, properties, trips, assets, datesManual, theme
    };
    downloadFile("plc-data.json", JSON.stringify(data,null,2));
  }
  function importAll(file){
    const rdr = new FileReader();
    rdr.onload = () => {
      try{
        const data = JSON.parse(String(rdr.result));
        setOnboarding(data.onboarding||{});
        setRequests(data.requests||[]);
        setEvents(data.events||[]);
        setContacts(data.contacts||[]);
        setProperties(data.properties||[]);
        setTrips(data.trips||[]);
        setAssets(data.assets||[]);
        setDatesManual(data.datesManual||[]);
        setTheme(data.theme||"noir");
        notify("Data imported");
      }catch{ notify("Import failed","info"); }
    };
    rdr.readAsText(file);
  }

  return (
    <div className="app">
      <TopBar
        theme={theme}
        onToggleTheme={()=>setTheme(theme==="noir"?"ivory":"noir")}
        onNewRequest={()=>{ setRoute("requests"); setActiveReqId("new"); }}
        onExport={exportAll}
        onImport={(f)=>importAll(f)}
      />
      <div className="shell">
        <SideBar route={route} onNavigate={setRoute} />
        <main className="main">
          {route==="dashboard" && (
            <>
              <div className="container">
                <SummaryStrip
                  name={briefing.name}
                  openCount={requests.filter(r=>r.status!=="Done").length}
                  nextTrip="LON → NCE · Fri 16:10"
                  comms={briefing.comms}
                  onNewRequest={()=>{ setRoute("requests"); setActiveReqId("new"); }}
                />
              </div>
              <Dashboard
                briefing={briefing}
                requests={requests}
                onNewRequest={()=>{ setRoute("requests"); setActiveReqId("new"); }}
                onOpenRequest={(id)=>{ setRoute("requests"); setActiveReqId(id); }}
              />
            </>
          )}

          {route==="calendar" && (
            <CalendarPage
              events={events}
              setEvents={setEvents}
            />
          )}

          {route==="properties" && (
            <PropertiesPage
              items={properties}
              setItems={setProperties}
              quickRequest={(title,notes)=>createRequest({ title, category:"Home", notes })}
            />
          )}

          {route==="contacts" && (
            <ContactsPage
              contacts={contacts}
              setContacts={setContacts}
            />
          )}

          {route==="travel" && (
            <TravelPage
              trips={trips}
              setTrips={setTrips}
              toICS={(ics)=>downloadFile("trip.ics", ics)}
            />
          )}

          {route==="assets" && (
            <AssetsPage
              assets={assets}
              setAssets={setAssets}
            />
          )}

          {route==="dates" && (
            <DatesPage
              manual={datesManual}
              setManual={setDatesManual}
              assets={assets}
            />
          )}

          {route==="onboarding" && (
            <OnboardingForm data={onboarding} onChange={setOnboarding} onComplete={()=>{ setRoute("dashboard"); notify("Onboarding saved"); }} />
          )}

          {route==="requests" && (
            <Requests
              items={requests}
              onCreate={(p)=>{ const rec={id:uid(),createdAt:Date.now(),status:"Open",...p}; setRequests([rec,...requests]); }}
              onUpdate={(id,patch)=>setRequests(prev=>prev.map(r=>r.id===id?{...r,...patch}:r))}
              onDelete={(id)=>setRequests(prev=>prev.filter(r=>r.id!==id))}
              onOpen={(id)=>setActiveReqId(id)}
            />
          )}
        </main>
      </div>

      {/* Drawers & Toasts */}
      {activeReqId && (
        <RequestDrawer
          mode={activeReqId==="new"?"new":"view"}
          request={requests.find(r=>r.id===activeReqId)||null}
          onClose={()=>setActiveReqId(null)}
          onCreate={(payload)=>{ const rec={id:uid(),createdAt:Date.now(),status:"Open",...payload}; setRequests([rec,...requests]); setActiveReqId(rec.id); }}
          onUpdate={(patch)=>{ const id=activeReqId; setRequests(prev=>prev.map(r=>r.id===id?{...r,...patch}:r)); }}
        />
      )}
      <ToastHost items={toasts} />
    </div>
  );
}

/* ================= Shell & shared UI ================= */
function TopBar({ onNewRequest, theme, onToggleTheme, onExport, onImport }){
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="monogram"><PLMonogram/></div>
          <div className="brand-title">
            <div className="brand-subtle">Private Life</div>
            <div className="brand-strong">Command Center</div>
          </div>
        </div>
        <div className="actions">
          <label className="btn btn-ghost ring" style={{display:"inline-grid", placeItems:"center"}}>
            Import
            <input type="file" accept=".json" style={{display:"none"}} onChange={(e)=>{ if(e.target.files?.[0]) onImport(e.target.files[0]); e.currentTarget.value=""; }} />
          </label>
          <button className="btn btn-ghost ring" onClick={onExport}>Export</button>
          <button className="btn btn-ghost ring" onClick={onToggleTheme}>{theme==="noir"?"Ivory":"Noir"}</button>
          <button className="btn btn-primary ring" onClick={onNewRequest}>New Request</button>
        </div>
      </div>
    </header>
  );
}
function PLMonogram(){
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" fill="currentColor" aria-hidden>
      <path d="M18 50V14h9c9 0 15 5 15 13 0 8-6 13-15 13h-4v10h-5zm9-18c6 0 10-3 10-8s-4-8-10-8h-4v16h4z"/>
      <path d="M41 14h5v36h-5c-10 0-17-7-17-18s7-18 17-18z" opacity=".9"/>
    </svg>
  );
}
function SideBar({ route, onNavigate }){
  return (
    <aside className="sidebar">
      <nav className="nav">
        {NAV.map(n => (
          <button key={n.key} className={route===n.key?"active":""} onClick={()=>onNavigate(n.key)}>{n.label}</button>
        ))}
      </nav>
    </aside>
  );
}
function SummaryStrip({ name, openCount, nextTrip, comms, onNewRequest }){
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
        <button className="btn btn-primary ring" onClick={onNewRequest}>New Request</button>
      </div>
    </div>
  );
}
function KPI({label,value}){ return (<div className="kpi"><div className="kpi__label">{label}</div><div className="kpi__value">{value}</div></div>); }
function Section({ title, right, children }){
  return (
    <section className="section">
      <div className="section-header">
        <h3 className="h-with-rule">{title}</h3>
        <div className="meta">{right}</div>
      </div>
      {children}
    </section>
  );
}
function Stat({label,value}){ return (<div className="stat"><span className="stat-label">{label}</span><span className="stat-value">{value}</span></div>); }

/* ================= Dashboard ================= */
function Dashboard({ briefing, requests, onNewRequest, onOpenRequest }){
  const openReqs = useMemo(()=>requests.filter(r=>r.status!=="Done").slice(0,3),[requests]);
  return (
    <div className="container grid-3">
      <Section title="Morning Briefing" right={<span>{briefing.dateStr}</span>}>
        <div className="mono-note" style={{marginBottom:10}}>Good morning, {briefing.name}.</div>
        <div className="grid-2">
          <div>
            <div style={{fontSize:14, fontWeight:600, marginBottom:8}}>Today</div>
            <ul style={{listStyle:"none", padding:0, margin:0, display:"grid", gap:8}}>
              {briefing.schedule.map((s,i)=>(
                <li key={i} style={{display:"grid", gridTemplateColumns:"16px 1fr", gap:10}}>
                  <div className="bullet" /><div><div style={{fontWeight:600}}>{s.time}</div><div style={{fontSize:14}}>{s.item}</div></div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div style={{fontSize:14, fontWeight:600, marginBottom:8}}>Reminders</div>
            <ul style={{paddingLeft:18, margin:0, display:"grid", gap:6}}>
              {briefing.reminders.map((r,i)=>(<li key={i} style={{fontSize:14}}>{r}</li>))}
            </ul>
            <div className="callout" style={{marginTop:12}}>
              <div style={{fontWeight:600}}>Travel</div>
              <div>{briefing.travel.upcoming}</div>
              <div className="mono-note" style={{marginTop:6}}>Daily update sent via {briefing.comms}.</div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="At a Glance">
        <div className="grid-2">
          <Stat label="Open requests" value={requests.filter(r=>r.status!=="Done").length} />
          <Stat label="This week events" value="9" />
          <Stat label="Properties" value="2" />
          <Stat label="Staff" value="5" />
        </div>
        <button className="btn btn-ghost ring" style={{marginTop:12}} onClick={onNewRequest}>Create request</button>
      </Section>

      <Section title="Open Requests">
        {openReqs.length===0 ? <div className="mono-note">No open requests.</div> : (
          <table className="table">
            <thead><tr><th>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Assignee</th></tr></thead>
            <tbody>
              {openReqs.map(r=>(
                <tr key={r.id} className="row-click" onClick={()=>onOpenRequest(r.id)}>
                  <td><div className="row-title">{r.title}</div><div className="row-sub">{r.notes}</div></td>
                  <td><TagStatus value={r.status}/></td>
                  <td><TagPriority value={r.priority}/></td>
                  <td>{r.dueDate||"—"}</td>
                  <td>{r.assignee||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

/* ================= Calendar ================= */
function CalendarPage({ events, setEvents }){
  const [focus,setFocus]=useState(weekStart(Date.now()));
  const days=[0,1,2,3,4,5,6].map(i=>{ const d=new Date(focus); d.setDate(focus.getDate()+i); return d; });
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState({ id:null, title:"", date:dateToYYYYMMDD(new Date()), time:"09:00", duration:60, location:"", notes:"" });

  function openNew(day){
    const d = dateToYYYYMMDD(day);
    setDraft({ id:null, title:"", date:d, time:"09:00", duration:60, location:"", notes:"" });
    setOpen(true);
  }
  function openEdit(ev){ setDraft({...ev}); setOpen(true); }
  function save(){ 
    if(!draft.title.trim()) return;
    if(draft.id){ setEvents(evts=>evts.map(e=>e.id===draft.id?draft:e)); }
    else { setEvents(evts=>[{...draft,id:uid()}, ...evts]); }
    setOpen(false);
  }
  function toICS(evts){
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PLC//Calendar//EN"];
    evts.forEach(e=>{
      const start = new Date(`${e.date}T${e.time}:00`);
      const end = new Date(start.getTime()+ (Number(e.duration)||60)*60000);
      const dt = (d)=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid()}@plc`);
      lines.push(`DTSTAMP:${dt(new Date())}`);
      lines.push(`DTSTART:${dt(start)}`);
      lines.push(`DTEND:${dt(end)}`);
      lines.push(`SUMMARY:${e.title}`);
      if(e.location) lines.push(`LOCATION:${e.location}`);
      if(e.notes) lines.push(`DESCRIPTION:${e.notes}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    downloadFile("events.ics", lines.join("\r\n"));
  }

  return (
    <div className="container">
      <Section title="Week" right={
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost" onClick={()=>{const d=new Date(focus); d.setDate(d.getDate()-7); setFocus(d);}}>Prev</button>
          <button className="btn btn-ghost" onClick={()=>setFocus(weekStart(Date.now()))}>Today</button>
          <button className="btn btn-ghost" onClick={()=>{const d=new Date(focus); d.setDate(d.getDate()+7); setFocus(d);}}>Next</button>
          <button className="btn btn-primary ring" onClick={()=>openNew(new Date())}>New Event</button>
          <button className="btn btn-ghost ring" onClick={()=>toICS(events)}>Export .ics</button>
        </div>
      }>
        <div className="calendar-week">
          {days.map((d,i)=>(
            <div key={i} className="calendar-day">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:600}}>{d.toLocaleDateString(undefined,{weekday:"short", month:"short", day:"numeric"})}</div>
                <button className="btn btn-ghost" onClick={()=>openNew(d)}>+</button>
              </div>
              {(events.filter(e=>e.date===dateToYYYYMMDD(d)).sort((a,b)=>a.time.localeCompare(b.time))).map(ev=>(
                <div key={ev.id} className="calendar-block row-click" onClick={()=>openEdit(ev)} title={ev.notes}>
                  <div style={{fontWeight:600, fontSize:14}}>{ev.time} · {ev.title}</div>
                  <div className="row-sub">{ev.location||""}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      {open && (
        <div className="modal-backdrop" onMouseDown={()=>setOpen(false)}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{draft.id?"Edit Event":"New Event"}</h3>
            <div className="form-grid">
              <div className="field"><label>Title</label><input className="input" value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></div>
              <div className="field"><label>Date</label><input type="date" className="input" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></div>
              <div className="field"><label>Time</label><input className="input" value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value})} placeholder="HH:MM"/></div>
              <div className="field"><label>Duration (mins)</label><input className="input" value={draft.duration} onChange={e=>setDraft({...draft,duration:e.target.value})}/></div>
              <div className="field"><label>Location</label><input className="input" value={draft.location} onChange={e=>setDraft({...draft,location:e.target.value})}/></div>
              <div className="field" style={{gridColumn:"1 / -1"}}><label>Notes</label><textarea className="textarea" rows={3} value={draft.notes} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>
            </div>
            <div className="form-nav">
              {draft.id && <button className="btn btn-ghost" onClick={()=>{ setEvents(evts=>evts.filter(e=>e.id!==draft.id)); setOpen(false); }}>Delete</button>}
              <div style={{marginLeft:"auto", display:"flex", gap:8}}>
                <button className="btn btn-ghost" onClick={()=>setOpen(false)}>Cancel</button>
                <button className="btn btn-primary ring" onClick={save} disabled={!draft.title.trim()}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Properties ================= */
function PropertiesPage({ items, setItems, quickRequest }){
  const [draft,setDraft]=useState(null);
  function save(){
    if(!draft?.name?.trim()) return;
    if(draft.id){ setItems(list=>list.map(x=>x.id===draft.id?draft:x)); }
    else { setItems(list=>[{...draft,id:uid()},...list]); }
    setDraft(null);
  }
  return (
    <div className="container">
      <Section title="Properties" right={<button className="btn btn-primary ring" onClick={()=>setDraft({name:"",address:"",access:"",contact:"",notes:""})}>Add Property</button>}>
        <div className="grid-2">
          {items.map(p=>(
            <div key={p.id} className="card">
              <h3 style={{marginTop:0}}>{p.name}</h3>
              <div className="mono-note">{p.address}</div>
              <div style={{marginTop:8}}><strong>Access:</strong> {p.access||"—"}</div>
              <div><strong>Contact:</strong> {p.contact||"—"}</div>
              {p.notes && <div className="row-sub" style={{marginTop:6}}>{p.notes}</div>}
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button className="btn btn-ghost" onClick={()=>setDraft(p)}>Edit</button>
                <button className="btn btn-ghost" onClick={()=>setItems(list=>list.filter(x=>x.id!==p.id))}>Delete</button>
                <button className="btn btn-primary ring" onClick={()=>quickRequest(`Maintenance at ${p.name}`, `Please arrange maintenance. Access: ${p.access}. Contact: ${p.contact}.`)}>Request maintenance</button>
              </div>
            </div>
          ))}
          {items.length===0 && <div className="mono-note">No properties yet.</div>}
        </div>
      </Section>

      {draft && (
        <div className="modal-backdrop" onMouseDown={()=>setDraft(null)}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{draft.id?"Edit Property":"Add Property"}</h3>
            <div className="form-grid">
              <div className="field"><label>Name</label><input className="input" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></div>
              <div className="field"><label>Address</label><input className="input" value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})}/></div>
              <div className="field"><label>Access</label><input className="input" value={draft.access} onChange={e=>setDraft({...draft,access:e.target.value})}/></div>
              <div className="field"><label>Main Contact</label><input className="input" value={draft.contact} onChange={e=>setDraft({...draft,contact:e.target.value})}/></div>
              <div className="field" style={{gridColumn:"1 / -1"}}><label>Notes</label><textarea className="textarea" rows={3} value={draft.notes||""} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>
            </div>
            <div className="form-nav" style={{justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setDraft(null)}>Cancel</button>
              <button className="btn btn-primary ring" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Contacts ================= */
function ContactsPage({ contacts, setContacts }){
  const [q,setQ]=useState("");
  const [draft,setDraft]=useState(null);

  const filtered = useMemo(()=>contacts
    .filter(c=>q.trim()? (c.name+c.role+c.email+c.phone).toLowerCase().includes(q.toLowerCase()):true)
    .sort((a,b)=>a.name.localeCompare(b.name)),[contacts,q]);

  function importCSV(file){
    const rdr=new FileReader();
    rdr.onload=()=>{ 
      const text=String(rdr.result||"");
      const rows=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      if(rows.length===0) return;
      const hasHeader=/name|email|phone|role/i.test(rows[0]);
      const start=hasHeader?1:0;
      const out=[];
      for(let i=start;i<rows.length;i++){
        const cols=rows[i].split(",").map(s=>s.trim());
        const [name,role,email,phone,notes] = cols;
        if(!name) continue;
        out.push({ id:uid(), name, role:role||"", email:email||"", phone:phone||"", notes:notes||"" });
      }
      setContacts(prev=>[...out,...prev]);
    };
    rdr.readAsText(file);
  }
  function exportCSV(){
    const lines=[["name","role","email","phone","notes"].join(",")];
    contacts.forEach(c=>lines.push([c.name,c.role,c.email,c.phone,(c.notes||"").replace(/,/g,";")].join(",")));
    downloadFile("contacts.csv", lines.join("\n"));
  }

  function save(){
    if(!draft?.name?.trim()) return;
    if(draft.id){ setContacts(cs=>cs.map(x=>x.id===draft.id?draft:x)); }
    else{ setContacts(cs=>[{...draft,id:uid()},...cs]); }
    setDraft(null);
  }

  return (
    <div className="container">
      <Section title="Contacts" right={
        <div style={{display:"flex",gap:8}}>
          <input className="input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
          <label className="btn btn-ghost ring" style={{display:"inline-grid", placeItems:"center"}}>
            Import CSV<input type="file" accept=".csv" style={{display:"none"}} onChange={(e)=>{ if(e.target.files?.[0]) importCSV(e.target.files[0]); e.currentTarget.value=""; }}/>
          </label>
          <button className="btn btn-ghost ring" onClick={exportCSV}>Export CSV</button>
          <button className="btn btn-primary ring" onClick={()=>setDraft({name:"",role:"",email:"",phone:"",notes:""})}>New Contact</button>
        </div>
      }>
        <div className="grid-2">
          {filtered.map(c=>(
            <div key={c.id} className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <h3 style={{marginTop:0}}>{c.name}</h3><span className="chip">{c.role||"—"}</span>
              </div>
              <div className="mono-note">{c.email||"—"} {c.phone?` · ${c.phone}`:""}</div>
              {c.notes && <div className="row-sub" style={{marginTop:6}}>{c.notes}</div>}
              <div style={{display:"flex",gap:8,marginTop:12}}>
                <button className="btn btn-ghost" onClick={()=>setDraft(c)}>Edit</button>
                <button className="btn btn-ghost" onClick={()=>setContacts(cs=>cs.filter(x=>x.id!==c.id))}>Delete</button>
              </div>
            </div>
          ))}
          {filtered.length===0 && <div className="mono-note">No contacts found.</div>}
        </div>
      </Section>

      {draft && (
        <div className="modal-backdrop" onMouseDown={()=>setDraft(null)}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{draft.id?"Edit Contact":"New Contact"}</h3>
            <div className="form-grid">
              <div className="field"><label>Name</label><input className="input" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></div>
              <div className="field"><label>Role</label><input className="input" value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value})}/></div>
              <div className="field"><label>Email</label><input className="input" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})}/></div>
              <div className="field"><label>Phone</label><input className="input" value={draft.phone} onChange={e=>setDraft({...draft,phone:e.target.value})}/></div>
              <div className="field" style={{gridColumn:"1 / -1"}}><label>Notes</label><textarea className="textarea" rows={3} value={draft.notes||""} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>
            </div>
            <div className="form-nav" style={{justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setDraft(null)}>Cancel</button>
              <button className="btn btn-primary ring" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Travel ================= */
function TravelPage({ trips, setTrips, toICS }){
  const [draftTrip,setDraftTrip]=useState(null);
  function saveTrip(){
    if(!draftTrip?.title?.trim()) return;
    if(draftTrip.id){ setTrips(ts=>ts.map(t=>t.id===draftTrip.id?draftTrip:t)); }
    else{ setTrips(ts=>[{...draftTrip,id:uid(),segments:draftTrip.segments||[]},...ts]); }
    setDraftTrip(null);
  }
  function addSeg(trip, seg){
    const t = {...trip, segments:[{id:uid(),...seg}, ...(trip.segments||[])]};
    setTrips(ts=>ts.map(x=>x.id===trip.id?t:x));
  }
  function exportTripICS(trip){
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PLC//Travel//EN"];
    const dt = (d)=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    (trip.segments||[]).forEach(s=>{
      const start=new Date(`${s.date}T${(s.time||"09:00")}:00`);
      const end=new Date(start.getTime()+ 60*60000);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid()}@plc`);
      lines.push(`DTSTAMP:${dt(new Date())}`);
      lines.push(`DTSTART:${dt(start)}`);
      lines.push(`DTEND:${dt(end)}`);
      lines.push(`SUMMARY:${trip.title}: ${s.kind} – ${s.detail}`);
      if(s.notes) lines.push(`DESCRIPTION:${s.notes}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    toICS(lines.join("\r\n"));
  }

  return (
    <div className="container">
      <Section title="Trips" right={<button className="btn btn-primary ring" onClick={()=>setDraftTrip({title:"",segments:[]})}>New Trip</button>}>
        <div className="grid-2">
          {trips.map(t=>(
            <div key={t.id} className="card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                <h3 style={{marginTop:0}}>{t.title}</h3>
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost" onClick={()=>setDraftTrip(t)}>Edit</button>
                  <button className="btn btn-ghost" onClick={()=>setTrips(ts=>ts.filter(x=>x.id!==t.id))}>Delete</button>
                </div>
              </div>
              <div style={{display:"grid",gap:8}}>
                {(t.segments||[]).map(s=>(
                  <div key={s.id} className="inbox-item">
                    <div className="who">{s.kind} · {s.date} {s.time||""}</div>
                    <div style={{fontWeight:600}}>{s.detail}</div>
                    {s.notes && <div className="row-sub" style={{marginTop:4}}>{s.notes}</div>}
                  </div>
                ))}
                <div style={{display:"flex",gap:8}}>
                  <button className="btn btn-ghost" onClick={()=>addSeg(t,{kind:"Flight",date:dateToYYYYMMDD(Date.now()+86400_000),time:"16:10",detail:"",notes:""})}>+ Flight</button>
                  <button className="btn btn-ghost" onClick={()=>addSeg(t,{kind:"Hotel",date:dateToYYYYMMDD(Date.now()+86400_000),time:"21:00",detail:"",notes:""})}>+ Hotel</button>
                  <button className="btn btn-ghost" onClick={()=>addSeg(t,{kind:"Transfer",date:dateToYYYYMMDD(Date.now()+86400_000),time:"14:00",detail:"",notes:""})}>+ Transfer</button>
                  <button className="btn btn-ghost ring" onClick={()=>exportTripICS(t)}>Export .ics</button>
                </div>
              </div>
            </div>
          ))}
          {trips.length===0 && <div className="mono-note">No trips yet.</div>}
        </div>
      </Section>

      {draftTrip && (
        <div className="modal-backdrop" onMouseDown={()=>setDraftTrip(null)}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{draftTrip.id?"Edit Trip":"New Trip"}</h3>
            <div className="field"><label>Title</label><input className="input" value={draftTrip.title} onChange={e=>setDraftTrip({...draftTrip,title:e.target.value})}/></div>
            <div className="form-nav" style={{justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setDraftTrip(null)}>Cancel</button>
              <button className="btn btn-primary ring" onClick={saveTrip}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Assets ================= */
function AssetsPage({ assets, setAssets }){
  const [draft,setDraft]=useState(null);
  const types=["Vehicle","Vessel","Art","Property","Other"];
  function save(){
    if(!draft?.name?.trim()) return;
    if(draft.id){ setAssets(as=>as.map(a=>a.id===draft.id?draft:a)); }
    else{ setAssets(as=>[{...draft,id:uid()},...as]); }
    setDraft(null);
  }
  const upcoming = assets.filter(a=>a.renewal && new Date(a.renewal)>=new Date()).sort((a,b)=>a.renewal.localeCompare(b.renewal)).slice(0,5);

  return (
    <div className="container">
      <Section title="Assets Registry" right={<button className="btn btn-primary ring" onClick={()=>setDraft({type:"Vehicle",name:"",identifier:"",renewal:"",notes:""})}>Add Asset</button>}>
        <div className="grid-2">
          <div className="section">
            <h3 style={{marginTop:0}}>All Assets</h3>
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th>Identifier</th><th>Renewal</th><th style={{width:140}}>Actions</th></tr></thead>
              <tbody>
                {assets.map(a=>(
                  <tr key={a.id}>
                    <td><div className="row-title">{a.name}</div><div className="row-sub">{a.notes}</div></td>
                    <td>{a.type}</td>
                    <td>{a.identifier||"—"}</td>
                    <td>{a.renewal||"—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn btn-ghost" onClick={()=>setDraft(a)}>Edit</button>
                        <button className="btn btn-ghost" onClick={()=>setAssets(as=>as.filter(x=>x.id!==a.id))}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {assets.length===0 && <tr><td colSpan={5}><div className="mono-note">No assets yet.</div></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="section">
            <h3 style={{marginTop:0}}>Upcoming Renewals</h3>
            {upcoming.length===0 && <div className="mono-note">No upcoming renewals.</div>}
            {upcoming.map(a=>(
              <div key={a.id} className="inbox-item" style={{marginBottom:8}}>
                <div className="who">{a.renewal}</div>
                <div style={{fontWeight:600}}>{a.name} · {a.type}</div>
                <div className="row-sub">{a.identifier||""}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {draft && (
        <div className="modal-backdrop" onMouseDown={()=>setDraft(null)}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{draft.id?"Edit Asset":"Add Asset"}</h3>
            <div className="form-grid">
              <div className="field"><label>Type</label>
                <select className="select" value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}>{types.map(t=><option key={t}>{t}</option>)}</select>
              </div>
              <div className="field"><label>Name</label><input className="input" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></div>
              <div className="field"><label>Identifier</label><input className="input" value={draft.identifier} onChange={e=>setDraft({...draft,identifier:e.target.value})}/></div>
              <div className="field"><label>Renewal Date</label><input type="date" className="input" value={draft.renewal} onChange={e=>setDraft({...draft,renewal:e.target.value})}/></div>
              <div className="field" style={{gridColumn:"1 / -1"}}><label>Notes</label><textarea className="textarea" rows={3} value={draft.notes||""} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>
            </div>
            <div className="form-nav" style={{justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setDraft(null)}>Cancel</button>
              <button className="btn btn-primary ring" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Important Dates ================= */
function DatesPage({ manual, setManual, assets }){
  const [draft,setDraft]=useState(null);
  const derived = useMemo(()=>{
    const fromAssets = (assets||[])
      .filter(a=>a.renewal)
      .map(a=>({ id:`asset-${a.id}`, label:`${a.name} renewal`, date:a.renewal, source:"Assets"}));
    return [...manual.map(m=>({...m,source:"Manual"})), ...fromAssets]
      .sort((a,b)=>a.date.localeCompare(b.date));
  },[manual,assets]);

  function exportICS(){
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PLC//Dates//EN"];
    const dt = (d)=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    derived.forEach(x=>{
      const start = new Date(`${x.date}T09:00:00`);
      const end = new Date(start.getTime()+60*60000);
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${uid()}@plc`);
      lines.push(`DTSTAMP:${dt(new Date())}`);
      lines.push(`DTSTART:${dt(start)}`);
      lines.push(`DTEND:${dt(end)}`);
      lines.push(`SUMMARY:${x.label}`);
      lines.push(`DESCRIPTION:Source: ${x.source}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    downloadFile("important-dates.ics", lines.join("\r\n"));
  }

  function save(){
    if(!draft?.label?.trim() || !draft?.date) return;
    if(draft.id){ setManual(ds=>ds.map(d=>d.id===draft.id?draft:d)); }
    else{ setManual(ds=>[{...draft,id:uid()},...ds]); }
    setDraft(null);
  }

  return (
    <div className="container">
      <Section title="Important Dates" right={
        <div style={{display:"flex",gap:8}}>
          <button className="btn btn-ghost ring" onClick={exportICS}>Export .ics</button>
          <button className="btn btn-primary ring" onClick={()=>setDraft({label:"",date:dateToYYYYMMDD(Date.now()+86400_000),notes:""})}>Add Date</button>
        </div>
      }>
        <div className="section">
          <table className="table">
            <thead><tr><th>Label</th><th>Date</th><th>Source</th><th style={{width:140}}>Actions</th></tr></thead>
          </table>
          <div className="table-scroll">
            <table className="table">
              <tbody>
                {derived.map(x=>(
                  <tr key={x.id}>
                    <td><div className="row-title">{x.label}</div></td>
                    <td>{x.date}</td>
                    <td>{x.source}</td>
                    <td>
                      {String(x.id).startsWith("asset-") ? <span className="mono-note">From Assets</span> : (
                        <div className="row-actions">
                          <button className="btn btn-ghost" onClick={()=>setDraft(x)}>Edit</button>
                          <button className="btn btn-ghost" onClick={()=>setManual(ds=>ds.filter(d=>d.id!==x.id))}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {derived.length===0 && <tr><td colSpan={4}><div className="mono-note">No dates yet.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {draft && (
        <div className="modal-backdrop" onMouseDown={()=>setDraft(null)}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{draft.id?"Edit Date":"Add Date"}</h3>
            <div className="form-grid">
              <div className="field"><label>Label</label><input className="input" value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})}/></div>
              <div className="field"><label>Date</label><input type="date" className="input" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></div>
              <div className="field" style={{gridColumn:"1 / -1"}}><label>Notes</label><textarea className="textarea" rows={3} value={draft.notes||""} onChange={e=>setDraft({...draft,notes:e.target.value})}/></div>
            </div>
            <div className="form-nav" style={{justifyContent:"flex-end"}}>
              <button className="btn btn-ghost" onClick={()=>setDraft(null)}>Cancel</button>
              <button className="btn btn-primary ring" onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Requests (from earlier) ================= */
function Requests({ items, onCreate, onUpdate, onDelete, onOpen }){
  const [q,setQ]=useState(""); const [status,setStatus]=useState("All"); const [prio,setPrio]=useState("All");
  const filtered = useMemo(()=>items
    .filter(r=>status==="All"?true:r.status===status)
    .filter(r=>prio==="All"?true:r.priority===prio)
    .filter(r=>q.trim() ? (r.title+r.notes).toLowerCase().includes(q.toLowerCase()) : true)
    .sort((a,b)=>b.createdAt-a.createdAt),[items,q,status,prio]);

  return (
    <div className="container">
      <div className="section" style={{marginBottom:16}}>
        <div className="section-header"><h3 className="h-with-rule">Requests</h3><div className="meta">{items.length} total</div></div>
        <div className="toolbar">
          <input className="input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)}/>
          <select className="select" value={status} onChange={e=>setStatus(e.target.value)}><option>All</option><option>Open</option><option>In Progress</option><option>Done</option></select>
          <select className="select" value={prio} onChange={e=>setPrio(e.target.value)}><option>All</option><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select>
          <button className="btn btn-primary ring" onClick={()=>onOpen("new")}>New Request</button>
        </div>
      </div>

      <div className="section">
        <table className="table">
          <thead><tr><th style={{width:"34%"}}>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Assignee</th><th style={{width:140}}>Actions</th></tr></thead>
        </table>
        <div className="table-scroll">
          <table className="table">
            <tbody>
              {filtered.map(r=>(
                <tr key={r.id} className="row-click" onClick={()=>onOpen(r.id)}>
                  <td style={{width:"34%"}}><div className="row-title">{r.title}</div><div className="row-sub">{r.notes}</div></td>
                  <td><TagStatus value={r.status}/></td>
                  <td><TagPriority value={r.priority}/></td>
                  <td>{r.dueDate||"—"}</td>
                  <td>{r.assignee||"—"}</td>
                  <td>
                    <div className="row-actions">
                      {r.status!=="Done" && <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onUpdate(r.id,{status:"Done"});}}>Mark done</button>}
                      {r.status==="Open" && <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onUpdate(r.id,{status:"In Progress"});}}>Start</button>}
                      <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onDelete(r.id);}}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length===0 && (<tr><td colSpan={6}><div className="mono-note">No results.</div></td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function RequestDrawer({ mode, request, onClose, onCreate, onUpdate }){
  const [title,setTitle]=useState(request?.title||"");
  const [category,setCategory]=useState(request?.category||"General");
  const [priority,setPriority]=useState(request?.priority||"Medium");
  const [assignee,setAssignee]=useState(request?.assignee||"");
  const [dueDate,setDueDate]=useState(request?.dueDate||"");
  const [notes,setNotes]=useState(request?.notes||"");

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="drawer" onMouseDown={(e)=>e.stopPropagation()}>
        <header className="drawer-head">
          <h3 className="h-with-rule">{mode==="new"?"New Request":"Request Details"}</h3>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </header>
        <div className="drawer-body">
          <div className="form-grid">
            <div className="field"><label>Title</label><input className="input" value={title} onChange={e=>setTitle(e.target.value)}/></div>
            <div className="field"><label>Category</label><select className="select" value={category} onChange={e=>setCategory(e.target.value)}><option>General</option><option>Home</option><option>Travel</option><option>Dining</option><option>Gifting</option></select></div>
            <div className="field"><label>Priority</label><select className="select" value={priority} onChange={e=>setPriority(e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></div>
            <div className="field"><label>Assignee</label><input className="input" value={assignee} onChange={e=>setAssignee(e.target.value)}/></div>
            <div className="field"><label>Due date</label><input type="date" className="input" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></div>
            <div className="field" style={{gridColumn:"1 / -1"}}><label>Notes</label><textarea className="textarea" rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/></div>
          </div>
        </div>
        <footer className="drawer-foot">
          {mode==="new"
            ? (<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary ring" onClick={()=>onCreate({title,category,priority,assignee,dueDate,notes})} disabled={!title.trim()}>Create</button></>)
            : (<><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-primary ring" onClick={()=>onUpdate({title,category,priority,assignee,dueDate,notes})} disabled={!title.trim()}>Save</button></>)
          }
        </footer>
      </aside>
    </div>
  );
}

/* ================= Small components ================= */
function InboxItem({ who, summary }){ return (<div className="inbox-item"><div className="who">{who}</div><div style={{fontWeight:600}}>{summary}</div></div>); }
function TagStatus({ value }){ const cls=value==="Open"?"tag tag--open":value==="In Progress"?"tag tag--progress":"tag tag--done"; return <span className={cls}>{value}</span>; }
function TagPriority({ value }){ const cls=value==="Urgent"?"tag tag--urgent":value==="High"?"tag tag--high":value==="Medium"?"tag tag--medium":"tag tag--low"; return <span className={cls}>{value}</span>; }
function ToastHost({ items }){ return (<div className="toast-host">{items.map(t=>(<div key={t.id} className={`toast ${t.tone==="info"?"toast--info":"toast--ok"}`}>{t.tone==="info"?"•":"✓"} <span>{t.msg}</span></div>))}</div>); }

/* ================= Onboarding (unchanged from previous luxe) ================= */
function OnboardingForm({ data, onChange, onComplete }){
  const [step,setStep]=useState(1); const total=8;
  function setSection(section,patch){ onChange({ ...data, [section]:{ ...(data[section]||{}), ...patch } }); }
  return (
    <div className="container">
      <header style={{marginBottom:16}}>
        <h2 className="h-with-rule" style={{margin:"0 0 4px 0"}}>Client Onboarding</h2>
        <div className="mono-note">Step {step} of {total}</div>
      </header>

      {step===1 && (
        <Card title="1. Personal & Family Information">
          <div className="form-grid">
            <Field label="Full Name"><Input value={data.personal?.fullName||""} onChange={e=>setSection("personal",{fullName:e.target.value})} placeholder="Jane Alexandra Doe"/></Field>
            <Field label="Preferred Name/Nickname"><Input value={data.personal?.preferredName||""} onChange={e=>setSection("personal",{preferredName:e.target.value})} placeholder="Jane"/></Field>
            <Field label="Date of Birth"><Input type="date" value={data.personal?.dob||""} onChange={e=>setSection("personal",{dob:e.target.value})}/></Field>
            <Field label="Spouse/Partner Name"><Input value={data.personal?.spouseName||""} onChange={e=>setSection("personal",{spouseName:e.target.value})} placeholder="John Doe"/></Field>
            <Field label="Spouse/Partner Date of Birth"><Input type="date" value={data.personal?.spouseDob||""} onChange={e=>setSection("personal",{spouseDob:e.target.value})}/></Field>
          </div>
          <div style={{marginTop:12}}><Field label="Children (names and birthdays)"><TextArea rows={3} value={data.personal?.children||""} onChange={e=>setSection("personal",{children:e.target.value})} placeholder="Add each on a new line"/></Field></div>
          <OnbNav onNext={()=>setStep(2)} />
        </Card>
      )}

      {step===2 && (
        <Card title="2. Key Contacts and Household Staff">
          <div className="grid-2">
            <div>
              <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Professional Team</div>
              <div className="form-grid">
                <Field label="Lawyer"><Input value={data.contacts?.lawyer||""} onChange={e=>setSection("contacts",{lawyer:e.target.value})} placeholder="Name, mobile, email"/></Field>
                <Field label="Accountant"><Input value={data.contacts?.accountant||""} onChange={e=>setSection("contacts",{accountant:e.target.value})} placeholder="Name, mobile, email"/></Field>
                <Field label="Wealth Manager/Private Banker"><Input value={data.contacts?.wealth||""} onChange={e=>setSection("contacts",{wealth:e.target.value})} placeholder="Name, mobile, email"/></Field>
                <Field label="Business PA / Personal Assistant"><Input value={data.contacts?.pa||""} onChange={e=>setSection("contacts",{pa:e.target.value})} placeholder="Name, mobile, email"/></Field>
              </div>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:600,marginBottom:8}}>Household Staff</div>
              <div className="form-grid">
                <Field label="Driver"><Input value={data.staff?.driver||""} onChange={e=>setSection("staff",{driver:e.target.value})} placeholder="Name, contact, schedule"/></Field>
                <Field label="Chef"><Input value={data.staff?.chef||""} onChange={e=>setSection("staff",{chef:e.target.value})} placeholder="Name, contact, schedule"/></Field>
                <Field label="Cleaner"><Input value={data.staff?.cleaner||""} onChange={e=>setSection("staff",{cleaner:e.target.value})} placeholder="Name, contact, schedule"/></Field>
                <Field label="Gardener"><Input value={data.staff?.gardener||""} onChange={e=>setSection("staff",{gardener:e.target.value})} placeholder="Name, contact, schedule"/></Field>
              </div>
            </div>
          </div>
          <OnbNav onBack={()=>setStep(1)} onNext={()=>setStep(3)} />
        </Card>
      )}

      {step===3 && (
        <Card title="3. Properties">
          <div className="form-grid">
            <Field label="Address"><Input value={data.property?.address||""} onChange={e=>setSection("property",{address:e.target.value})} placeholder="Address"/></Field>
            <Field label="Access Instructions"><Input value={data.property?.access||""} onChange={e=>setSection("property",{access:e.target.value})} placeholder="Codes, keys, concierge"/></Field>
            <Field label="Main Contact"><Input value={data.property?.contact||""} onChange={e=>setSection("property",{contact:e.target.value})} placeholder="Caretaker, building manager"/></Field>
            <Field label="Utilities & Service Providers"><TextArea rows={3} value={data.property?.utilities||""} onChange={e=>setSection("property",{utilities:e.target.value})} placeholder="Electrician, plumber, cleaner, gardener..."/></Field>
          </div>
          <div style={{marginTop:12}}>
            <Field label="Preferred Maintenance Times"><Input value={data.property?.maint||""} onChange={e=>setSection("property",{maint:e.target.value})} placeholder="Weekdays 9–12, avoid Wednesdays"/></Field>
            <Field label="Notes"><TextArea rows={3} value={data.property?.notes||""} onChange={e=>setSection("property",{notes:e.target.value})} placeholder="Any special instructions"/></Field>
          </div>
          <OnbNav onBack={()=>setStep(2)} onNext={()=>setStep(4)} />
        </Card>
      )}

      {step===4 && (
        <Card title="4. Lifestyle Preferences">
          <div className="form-grid">
            <Field label="Favourite Restaurants"><TextArea rows={3} value={data.life?.restaurants||""} onChange={e=>setSection("life",{restaurants:e.target.value})} /></Field>
            <Field label="Favourite Hotels/Resorts"><TextArea rows={3} value={data.life?.hotels||""} onChange={e=>setSection("life",{hotels:e.target.value})} /></Field>
            <Field label="Airline(s) of Choice & Loyalty Numbers"><Input value={data.life?.airlines||""} onChange={e=>setSection("life",{airlines:e.target.value})} /></Field>
            <Field label="Seating Preferences"><Input value={data.life?.seats||""} onChange={e=>setSection("life",{seats:e.target.value})} /></Field>
            <Field label="Preferred Travel Class"><Input value={data.life?.travelClass||""} onChange={e=>setSection("life",{travelClass:e.target.value})} /></Field>
            <Field label="Dietary Restrictions / Allergies"><Input value={data.life?.diet||""} onChange={e=>setSection("life",{diet:e.target.value})} /></Field>
            <Field label="Food & Drink Preferences"><TextArea rows={3} value={data.life?.food||""} onChange={e=>setSection("life",{food:e.target.value})} /></Field>
            <Field label="Hobbies & Activities"><TextArea rows={3} value={data.life?.hobbies||""} onChange={e=>setSection("life",{hobbies:e.target.value})} /></Field>
            <Field label="Events you enjoy"><TextArea rows={2} value={data.life?.enjoy||""} onChange={e=>setSection("life",{enjoy:e.target.value})} /></Field>
            <Field label="Events to avoid"><TextArea rows={2} value={data.life?.avoid||""} onChange={e=>setSection("life",{avoid:e.target.value})} /></Field>
          </div>
          <OnbNav onBack={()=>setStep(3)} onNext={()=>setStep(5)} />
        </Card>
      )}

      {step===5 && (
        <Card title="5. Assets">
          <div className="form-grid">
            <Field label="Vehicles"><TextArea rows={3} value={data.assets?.vehicles||""} onChange={e=>setSection("assets",{vehicles:e.target.value})} /></Field>
            <Field label="Yacht/Boat"><TextArea rows={3} value={data.assets?.yacht||""} onChange={e=>setSection("assets",{yacht:e.target.value})} /></Field>
            <Field label="Art/Collectibles"><TextArea rows={3} value={data.assets?.art||""} onChange={e=>setSection("assets",{art:e.target.value})} /></Field>
          </div>
          <OnbNav onBack={()=>setStep(4)} onNext={()=>setStep(6)} />
        </Card>
      )}

      {step===6 && (
        <Card title="6. Important Dates">
          <div className="form-grid">
            <Field label="Anniversaries"><TextArea rows={3} value={data.dates?.anniversaries||""} onChange={e=>setSection("dates",{anniversaries:e.target.value})} /></Field>
            <Field label="Key Birthdays"><TextArea rows={3} value={data.dates?.birthdays||""} onChange={e=>setSection("dates",{birthdays:e.target.value})} /></Field>
            <Field label="Annual Events"><TextArea rows={3} value={data.dates?.annual||""} onChange={e=>setSection("dates",{annual:e.target.value})} /></Field>
            <Field label="Membership Renewals"><TextArea rows={3} value={data.dates?.renewals||""} onChange={e=>setSection("dates",{renewals:e.target.value})} /></Field>
          </div>
          <OnbNav onBack={()=>setStep(5)} onNext={()=>setStep(7)} />
        </Card>
      )}

      {step===7 && (
        <Card title="7. Communication Preferences">
          <div className="form-grid">
            <Field label="Preferred Daily Update Method">
              <Select value={data.comms?.dailyUpdate||"WhatsApp"} onChange={e=>setSection("comms",{dailyUpdate:e.target.value})}><option>WhatsApp</option><option>Email</option><option>Both</option></Select>
            </Field>
            <Field label="Urgent Matters">
              <Select value={data.comms?.urgent||"Call"} onChange={e=>setSection("comms",{urgent:e.target.value})}><option>Call</option><option>WhatsApp</option><option>Email</option></Select>
            </Field>
          </div>
          <div className="form-grid" style={{marginTop:12}}>
            <Field label="Auto-approve topics"><TextArea rows={3} value={data.comms?.autoApprove||""} onChange={e=>setSection("comms",{autoApprove:e.target.value})} /></Field>
            <Field label="Always ask topics"><TextArea rows={3} value={data.comms?.alwaysAsk||""} onChange={e=>setSection("comms",{alwaysAsk:e.target.value})} /></Field>
          </div>
          <OnbNav onBack={()=>setStep(6)} onNext={()=>setStep(8)} />
        </Card>
      )}

      {step===8 && (
        <Card title="8. Special Instructions">
          <div className="form-grid">
            <Field label="Personal habits / customs"><TextArea rows={4} value={data.special?.habits||""} onChange={e=>setSection("special",{habits:e.target.value})} /></Field>
            <Field label="Never schedule / buy"><TextArea rows={4} value={data.special?.never||""} onChange={e=>setSection("special",{never:e.target.value})} /></Field>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16}}>
            <span className="mono-note">Signature and date will be collected digitally.</span>
            <div style={{display:"flex",gap:10}}>
              <button className="btn btn-ghost" onClick={()=>setStep(7)}>Back</button>
              <button className="btn btn-primary ring" onClick={onComplete}>Submit</button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
function OnbNav({onBack,onNext}){ return (<div className="form-nav">{onBack&&<button className="btn btn-ghost" onClick={onBack}>Back</button>}{onNext&&<button className="btn btn-primary ring" onClick={onNext}>Next</button>}</div>); }
function Card({title,children}){ return (<div className="card" style={{marginBottom:16}}><h3 className="h-with-rule" style={{marginTop:0}}>{title}</h3>{children}</div>); }
function Field({label,children}){ return (<div className="field"><label>{label}</label>{children}</div>); }
function Input(props){ return <input {...props} className="input" />; }
function TextArea(props){ return <textarea {...props} className="textarea" />; }
function Select(props){ return <select {...props} className="select" />; }
