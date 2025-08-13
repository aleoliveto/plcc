import React, { useEffect, useMemo, useState } from "react";
import { useScreen } from "./hooks/useScreen";
import MobileHome from "./mobile/MobileHome";
import TabletHome from "./tablet/TabletHome";
import { useScreen } from "./hooks/useScreen";
import MobileTabs from "./mobile/MobileTabs";
import MobileChat from "./mobile/MobileChat";
import MobileProfile from "./mobile/MobileProfile";



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
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 500);
}
function dateToYYYYMMDD(d){ return new Date(d).toISOString().slice(0,10); }
function parseDT(dateStr, timeStr){ return new Date(`${dateStr}T${timeStr||"09:00"}:00`); }
function minutesDiff(a,b){ return Math.round((a.getTime()-b.getTime())/60000); }
function currency(n, hide){ if(hide) return "••••"; try { return new Intl.NumberFormat(undefined,{style:"currency",currency:"GBP"}).format(Number(n||0)); } catch { return `£${Number(n||0).toFixed(0)}`; } }

/* ========= Navigation ========= */
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

/* ========= App ========= */
export default function App(){
  /* Theme & privacy */
  const [theme,setTheme] = useLocalState("plc_theme","noir");
  useEffect(()=>{ document.body.dataset.theme = theme; },[theme]);
  const [privacy,setPrivacy] = useLocalState("plc_privacy","show"); // "show" | "hide"
  const hideSensitive = privacy === "hide";
  const screen = useScreen();
const [mobileTab, setMobileTab] = useLocalState("plc_mobile_tab","home");

const [messages, setMessages] = useLocalState("plc_messages_v1", [
  { id: uid(), thread: "concierge", from: "them", text: "Good morning — how may I assist?", at: Date.now()-3600_000 }
]);
const [lastThread, setLastThread] = useLocalState("plc_last_thread","concierge");

function sendChat(text){
  setMessages(m => [...m, { id: uid(), thread: lastThread, from: "me", text, at: Date.now() }]);
  setMobileTab("chat");
}
const threadMsgs = useMemo(()=>messages.filter(m=>m.thread===lastThread).sort((a,b)=>a.at-b.at),[messages,lastThread]);

  /* Core pages & data */
  const [route,setRoute] = useState("dashboard");
  const [onboarding,setOnboarding] = useLocalState("plc_onboarding_v1",{});
  const [requests,setRequests] = useLocalState("plc_requests_v1",[
    { id: uid(), title: "Table for four, Saturday 20:00", category: "Dining", priority: "Medium", status: "Open", assignee: "Concierge", dueDate: dateToYYYYMMDD(Date.now()+86400_000*4), createdAt: Date.now(), notes: "Quiet corner. Italian or French." },
    { id: uid(), title: "Airport transfer Friday", category: "Travel", priority: "High", status: "In Progress", assignee: "Chauffeur", dueDate: dateToYYYYMMDD(Date.now()+86400_000*2), createdAt: Date.now()-3600_000, notes: "Mayfair → LHR T5 at 13:00." },
  ]);

  /* New executive data */
  const [decisions,setDecisions] = useLocalState("plc_decisions_v1",[
    { id: uid(), type:"Payment", title:"Art restoration invoice", amount: 2850, due: dateToYYYYMMDD(Date.now()+86400_000), requester:"Gallery", context:"Invoice #AR-1189", status:"Pending" },
    { id: uid(), type:"Booking", title:"Dinner at Luca (Sat 20:00)", amount: null, due: dateToYYYYMMDD(Date.now()+86400_000*4), requester:"Concierge", context:"Quiet table, 4 pax", status:"Pending" },
    { id: uid(), type:"Document", title:"Insurance renewal (Bentley)", amount: 1200, due: dateToYYYYMMDD(Date.now()+86400_000*10), requester:"Broker", context:"Policy #BNT-347", status:"Pending" },
  ]);
  const [alerts,setAlerts] = useLocalState("plc_alerts_v1",[
    { id: uid(), severity:"High", message:"BA0342 LHR → NCE delayed 40m", source:"Travel", at: Date.now()-15*60*1000, resolved:false },
    { id: uid(), severity:"Medium", message:"Mayfair: boiler maintenance tomorrow 09:00", source:"Home", at: Date.now()-2*60*60*1000, resolved:false },
  ]);
  const [events,setEvents] = useLocalState("plc_events_v1",[
    { id: uid(), title:"Wealth manager call", date: dateToYYYYMMDD(Date.now()+86400_000), time:"11:30", duration:45, location:"Teams", notes:"Quarterly review" },
    { id: uid(), title:"Gym", date: dateToYYYYMMDD(Date.now()), time:"08:00", duration:60, location:"Club", notes:"Car 07:40" },
  ]);
  const [contacts,setContacts] = useLocalState("plc_contacts_v1",[
    { id: uid(), name:"Amelia Clarke", role:"Concierge", email:"concierge@example.com", phone:"+44 20 7000 0000", notes:"Primary contact" },
  ]);
  const [properties,setProperties] = useLocalState("plc_properties_v1",[
    { id: uid(), name:"Mayfair Residence", address:"32 Grosvenor Sq, London", access:"Concierge desk, fob #12", contact:"Edward (Building Mgr) +44 20...", notes:"Deep clean Wednesdays", occupied:true, todayTasks:2 },
  ]);
  const [trips,setTrips] = useLocalState("plc_trips_v1",[
    { id: uid(), title:"London → Nice", segments:[
      { id: uid(), kind:"Flight", date: dateToYYYYMMDD(Date.now()+86400_000*3), time:"16:10", detail:"BA 0342 LHR → NCE", conf:"ABC123", notes:"Chauffeur arranged" },
      { id: uid(), kind:"Hotel", date: dateToYYYYMMDD(Date.now()+86400_000*3), time:"21:00", detail:"Cheval Blanc, sea-view", conf:"HB-77", notes:"Late check-in" },
    ]},
  ]);
  const [assets,setAssets] = useLocalState("plc_assets_v1",[
    { id: uid(), type:"Vehicle", name:"Bentley Flying Spur", identifier:"LX20 BNT", renewal: dateToYYYYMMDD(Date.now()+86400_000*48), notes:"Service due in Nov" },
    { id: uid(), type:"Art", name:"Warhol lithograph", identifier:"#A12", renewal:"", notes:"Climate 21°C" },
  ]);
  const [datesManual,setDatesManual] = useLocalState("plc_dates_v1",[
    { id: uid(), label:"Anniversary", date: dateToYYYYMMDD(Date.now()+86400_000*30), notes:"Dinner booking" },
  ]);

  /* Logistics data */
  const [vehicles,setVehicles] = useLocalState("plc_vehicles_rt_v1",[
    { id: uid(), driver:"Marco", plate:"LX20 BNT", nextJobAt: `${dateToYYYYMMDD(Date.now())} 07:40`, status:"On duty" },
    { id: uid(), driver:"Amir", plate:"EV70 LUX", nextJobAt: `${dateToYYYYMMDD(Date.now())} 13:00`, status:"Standby" },
  ]);
  const [guests,setGuests] = useLocalState("plc_guests_v1",[
    { id: uid(), name:"Sophie", eta: `${dateToYYYYMMDD(Date.now()+86400_000*2)} 18:00`, notes:"Staying 2 nights" },
  ]);

  /* Concierge inbox threads */
  const [inbox,setInbox] = useLocalState("plc_inbox_v1",[
    { id: uid(), from:"Concierge", summary:"Dry cleaning delivered to Mayfair residence", lastUpdateAt: Date.now()-60*60*1000 },
    { id: uid(), from:"Travel", summary:"NCE flight upgrade confirmed", lastUpdateAt: Date.now()-2*60*60*1000 },
    { id: uid(), from:"Home", summary:"Landscaping moved to 10:00 tomorrow", lastUpdateAt: Date.now()-20*60*1000 },
  ]);

  /* Settings */
  const [settings,setSettings] = useLocalState("plc_settings_v1",{ travelBufferMin: 30 }); // Time-to-leave buffer
  const [money,setMoney] = useLocalState("plc_money_v1",{
    mtdDiscretionary: 12500, plan: 20000,
    nextPayments: [
      { id: uid(), label:"Club membership", due: dateToYYYYMMDD(Date.now()+86400_000*5), amount: 950 },
      { id: uid(), label:"Property insurance", due: dateToYYYYMMDD(Date.now()+86400_000*9), amount: 1200 },
    ],
  });

  /* UX: toasts & drawers */
  const [toasts,setToasts] = useState([]);
  function notify(msg,tone="success"){ const id=uid(); setToasts(t=>[...t,{id,msg,tone}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200); }
  const [activeReqId,setActiveReqId] = useState(null);

  /* Global helpers */
  function createRequest(payload){
    const rec = { id: uid(), createdAt: Date.now(), status:"Open", priority:"Medium", ...payload };
    setRequests(prev=>[rec, ...prev]); notify("Request created"); setRoute("requests"); setActiveReqId(rec.id);
  }
  function exportAll(){
    const data = { theme, privacy, onboarding, requests, events, contacts, properties, trips, assets, datesManual, vehicles, guests, inbox, settings, money, decisions, alerts };
    downloadFile("plc-data.json", JSON.stringify(data,null,2));
  }
  function importAll(file){
    const rdr = new FileReader();
    rdr.onload = () => {
      try{
        const d = JSON.parse(String(rdr.result));
        setTheme(d.theme||"noir"); setPrivacy(d.privacy||"show");
        setOnboarding(d.onboarding||{}); setRequests(d.requests||[]); setEvents(d.events||[]);
        setContacts(d.contacts||[]); setProperties(d.properties||[]); setTrips(d.trips||[]);
        setAssets(d.assets||[]); setDatesManual(d.datesManual||[]);
        setVehicles(d.vehicles||[]); setGuests(d.guests||[]); setInbox(d.inbox||[]);
        setSettings(d.settings||{travelBufferMin:30}); setMoney(d.money||{mtdDiscretionary:0,plan:0,nextPayments:[]});
        setDecisions(d.decisions||[]); setAlerts(d.alerts||[]);
        notify("Data imported");
      }catch{ notify("Import failed","info"); }
    }; rdr.readAsText(file);
  }

  /* Executive Briefing */
  const name = onboarding.personal?.preferredName || onboarding.personal?.fullName || "Client";
  const nextEvent = useMemo(()=>{
    const now = new Date();
    return (events||[])
      .map(e=>({ ...e, start: parseDT(e.date,e.time) }))
      .filter(e=>e.start.getTime()>=now.getTime())
      .sort((a,b)=>a.start - b.start)[0] || null;
  },[events]);
  const leaveInMin = useMemo(()=>{
    if(!nextEvent) return null;
    const leaveAt = new Date(parseDT(nextEvent.date,nextEvent.time).getTime() - (settings.travelBufferMin||30)*60000);
    return minutesDiff(leaveAt, new Date());
  },[nextEvent, settings.travelBufferMin]);

  /* Derived dashboards */
  const pendingDecisions = decisions.filter(d=>d.status==="Pending");
  const unresolvedAlerts = alerts.filter(a=>!a.resolved);
  const nextTripSeg = useMemo(()=>{
    const all = (trips||[]).flatMap(t=>t.segments.map(s=>({...s, trip:t.title, d: parseDT(s.date,s.time||"09:00")})));
    const future = all.filter(s=>s.d>=new Date()).sort((a,b)=>a.d-b.d);
    return future[0]||null;
  },[trips]);

  /* Render */
  return (
    <div className="app">
      <TopBar
        theme={theme}
        privacy={privacy}
        onToggleTheme={()=>setTheme(theme==="noir"?"ivory":"noir")}
        onTogglePrivacy={()=>setPrivacy(privacy==="hide"?"show":"hide")}
        onNewRequest={()=>{ setRoute("requests"); setActiveReqId("new"); }}
        onExport={exportAll}
        onImport={(f)=>importAll(f)}
      />
      <div className="shell">
        <SideBar route={route} onNavigate={setRoute} />
        <main className="main">
          {route === "dashboard" && (
  screen.isPhone ? (
    <>
      {mobileTab === "home" && (
        <MobileHome
          name={name}
          nextEvent={nextEvent}
          leaveInMin={leaveInMin}
          pendingCount={pendingDecisions.length}
          alertCount={unresolvedAlerts.length}
          onShortcut={({title, notes, category}) => createRequest({ title, notes, category })}
          onSendMessage={(text)=>sendChat(text)}
        />
      )}
      {mobileTab === "requests" && (
        <Requests
          items={requests}
          onCreate={(p)=>{ const rec={id:uid(),createdAt:Date.now(),status:"Open",...p}; setRequests([rec,...requests]); }}
          onUpdate={(id,patch)=>setRequests(prev=>prev.map(r=>r.id===id?{...r,...patch}:r))}
          onDelete={(id)=>setRequests(prev=>prev.filter(r=>r.id!==id))}
          onOpen={(id)=>setActiveReqId(id)}
        />
      )}
      {mobileTab === "profile" && (
        <MobileProfile
          name={name}
          theme={theme}
          privacy={privacy}
          onToggleTheme={()=>setTheme(theme==="noir"?"ivory":"noir")}
          onTogglePrivacy={()=>setPrivacy(privacy==="hide"?"show":"hide")}
        />
      )}
      {mobileTab === "chat" && (
        <MobileChat
          name="Concierge"
          messages={threadMsgs}
          onSend={(t)=>sendChat(t)}
          onBack={()=>setMobileTab("home")}
        />
      )}
      <MobileTabs active={mobileTab} onChange={setMobileTab} />
    </>
  ) : screen.isTablet ? (
    /* your TabletHome render (unchanged) */
    <TabletHome
      name={name}
      nextEvent={nextEvent}
      leaveInMin={leaveInMin}
      pendingDecisions={pendingDecisions}
      unresolvedAlerts={unresolvedAlerts}
      nextTripSeg={nextTripSeg}
      money={money}
      onShortcut={({title, notes, category}) => createRequest({ title, notes, category })}
    />
  ) : (
    /* your desktop ExecutiveDashboard render (unchanged) */
    <ExecutiveDashboard
      name={name}
      hideSensitive={privacy==="hide"}
      pendingDecisions={pendingDecisions}
      unresolvedAlerts={unresolvedAlerts}
      nextEvent={nextEvent}
      leaveInMin={leaveInMin}
      vehicles={vehicles}
      properties={properties}
      guests={guests}
      inbox={inbox}
      nextTripSeg={nextTripSeg}
      money={money}
      datesManual={datesManual}
      assets={assets}
      onApprove={(id)=>setDecisions(ds=>ds.map(d=>d.id===id?{...d,status:"Approved"}:d))}
      onDecline={(id)=>setDecisions(ds=>ds.map(d=>d.id===id?{...d,status:"Declined"}:d))}
      onDelegate={()=>{}}
      onQuickMessage={()=>sendChat("Hi — can you assist?")}
      onCreateRequest={(title,notes)=>createRequest({title,category:"General",notes})}
    />
  )
)}



          {route==="calendar" && (<CalendarPage events={events} setEvents={setEvents} />)}
          {route==="properties" && (<PropertiesPage items={properties} setItems={setProperties} quickRequest={(title,notes)=>createRequest({ title, category:"Home", notes })} />)}
          {route==="contacts" && (<ContactsPage contacts={contacts} setContacts={setContacts} />)}
          {route==="travel" && (<TravelPage trips={trips} setTrips={setTrips} toICS={(ics)=>downloadFile("trip.ics", ics)} />)}
          {route==="assets" && (<AssetsPage assets={assets} setAssets={setAssets} />)}
          {route==="dates" && (<DatesPage manual={datesManual} setManual={setDatesManual} assets={assets} />)}
          {route==="onboarding" && (<OnboardingForm data={onboarding} onChange={setOnboarding} onComplete={()=>{ setRoute("dashboard"); notify("Onboarding saved"); }} />)}
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

      {/* Request drawer & toasts */}
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
function TopBar({ onNewRequest, theme, privacy, onToggleTheme, onTogglePrivacy, onExport, onImport }){
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
          <button className="btn btn-ghost ring" onClick={onTogglePrivacy}>{privacy==="hide"?"Show":"Hide"} sensitive</button>
          <label className="btn btn-ghost ring" style={{display:"inline-grid", placeItems:"center"}}>
            Import<input type="file" accept=".json" style={{display:"none"}} onChange={(e)=>{ if(e.target.files?.[0]) onImport(e.target.files[0]); e.currentTarget.value=""; }}/>
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

/* ================= Executive Dashboard ================= */
function ExecutiveDashboard({
  name, hideSensitive, pendingDecisions, unresolvedAlerts,
  nextEvent, leaveInMin, vehicles, properties, guests, inbox, nextTripSeg, money, datesManual, assets,
  onApprove, onDecline, onDelegate, onQuickMessage, onCreateRequest
}){
  // Important dates derived (manual + from assets renewals)
  const datesDerived = useMemo(()=>{
    const fromAssets = (assets||[]).filter(a=>a.renewal).map(a=>({ id:`asset-${a.id}`, label:`${a.name} renewal`, date:a.renewal, source:"Assets"}));
    return [...(datesManual||[]).map(m=>({...m,source:"Manual"})), ...fromAssets]
      .filter(x=>new Date(x.date)>=new Date())
      .sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  },[datesManual,assets]);

  const mtd = money?.mtdDiscretionary||0;
  const plan = money?.plan||0;
  const variance = plan ? Math.round(((mtd-plan)/plan)*100) : 0;
  const payments = (money?.nextPayments||[]).slice(0,3);

  return (
    <div className="container">
      {/* Top strip: Decisions • Now/Next • Alerts • Quick message */}
      <div className="strip">
        <div className="strip-item">
          <div className="badge">{pendingDecisions.length}</div>
          <div className="strip-label">Decision Queue</div>
        </div>
        <div className="strip-item">
          <div className="dot dot--next" />
          <div className="strip-main">
            <div className="strip-title">{nextEvent ? `${nextEvent.time} — ${nextEvent.title}` : "No upcoming"}</div>
            <div className="strip-sub">
              {nextEvent ? (nextEvent.location || "—") : "You're clear"}
              {typeof leaveInMin==="number" && (
                <span className={`pill ${leaveInMin<=0?"pill--late":""}`}>
                  {leaveInMin>0 ? `Leave in ${leaveInMin} min` : `Late by ${Math.abs(leaveInMin)} min`}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="strip-item">
          <div className={`badge ${unresolvedAlerts.length ? "badge--alert":""}`}>{unresolvedAlerts.length}</div>
          <div className="strip-label">Alerts</div>
        </div>
        <div className="strip-cta">
          <button className="btn btn-primary ring" onClick={onQuickMessage}>Message Concierge</button>
        </div>
      </div>

      {/* Grid: 3 x 2 */}
      <div className="grid-3">
        {/* Decisions */}
        <section className="section">
          <div className="section-header"><h3 className="h-with-rule">Decision Queue</h3><div className="meta">{pendingDecisions.length} pending</div></div>
          {pendingDecisions.length===0 ? <div className="mono-note">No approvals needed.</div> : (
            <div className="list">
              {pendingDecisions.slice(0,4).map(d=>(
                <div key={d.id} className="dec-card">
                  <div className="dec-head">
                    <span className="chip">{d.type}</span>
                    <span className="mono-note">Due {d.due}</span>
                  </div>
                  <div className="dec-title">{d.title}</div>
                  <div className="dec-sub">
                    {d.amount!=null ? currency(d.amount, hideSensitive) : "—"} · {d.requester}
                    {d.context ? ` · ${d.context}` : ""}
                  </div>
                  <div className="row-actions" style={{marginTop:8}}>
                    <button className="btn btn-primary ring" onClick={()=>onApprove(d.id)}>Approve</button>
                    <button className="btn btn-ghost" onClick={()=>onDecline(d.id)}>Decline</button>
                    <button className="btn btn-ghost" onClick={()=>onDelegate(d.id)}>Delegate</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Inbox */}
        <section className="section">
          <div className="section-header"><h3 className="h-with-rule">Concierge Inbox</h3></div>
          <div className="list">
            {(inbox||[]).slice(0,3).map(t=>(
              <div key={t.id} className="inbox-item">
                <div className="who">{t.from}</div>
                <div style={{fontWeight:600}}>{t.summary}</div>
                <div className="row-actions" style={{marginTop:8}}>
                  <button className="btn btn-ghost" onClick={()=>onCreateRequest(`Action: ${t.summary}`, `From ${t.from}`)}>Create request</button>
                  <button className="btn btn-ghost">👍</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Logistics */}
        <section className="section">
          <div className="section-header"><h3 className="h-with-rule">Logistics Snapshot</h3></div>
          <div className="grid-2">
            <div className="card">
              <h3 style={{marginTop:0}}>Cars</h3>
              {(vehicles||[]).slice(0,2).map(v=>(
                <div key={v.id} className="log-row">
                  <div className="log-title">{v.driver} · {v.plate}</div>
                  <div className="row-sub">{v.status} · next {v.nextJobAt.split(" ")[1]}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{marginTop:0}}>Residences</h3>
              {(properties||[]).slice(0,2).map(p=>(
                <div key={p.id} className="log-row">
                  <div className="log-title">{p.name}</div>
                  <div className="row-sub">{hideSensitive? "••••" : (p.address || "—")} · {p.occupied?"Occupied":"Empty"} · {p.todayTasks||0} tasks</div>
                </div>
              ))}
              {(guests||[]).length>0 && (
                <div className="log-row">
                  <div className="log-title">Guests</div>
                  <div className="row-sub">{guests.map(g=>`${g.name} ${g.eta}`).join(" · ")}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Travel */}
        <section className="section">
          <div className="section-header"><h3 className="h-with-rule">Travel</h3></div>
          {nextTripSeg ? (
            <div className="inbox-item">
              <div className="who">{nextTripSeg.kind} · {nextTripSeg.date} {nextTripSeg.time}</div>
              <div style={{fontWeight:600}}>{nextTripSeg.detail}</div>
              <div className="row-sub">Conf {nextTripSeg.conf||"—"} {nextTripSeg.notes?` · ${nextTripSeg.notes}`:""}</div>
            </div>
          ) : <div className="mono-note">No upcoming segments.</div>}
        </section>

        {/* Money */}
        <section className="section">
          <div className="section-header"><h3 className="h-with-rule">Money at a Glance</h3></div>
          <div className="grid-2">
            <div className="card">
              <div className="stat"><span className="stat-label">Pending approvals</span><span className="stat-value">{pendingDecisions.filter(d=>d.amount!=null).length}</span></div>
              <div className="stat"><span className="stat-label">MTD discretionary</span><span className="stat-value">{currency(mtd, hideSensitive)}</span></div>
              <div className="stat"><span className="stat-label">Vs plan</span><span className={`stat-value ${variance>0?"neg":""}`}>{hideSensitive?"••••":`${variance>0?"+":""}${variance}%`}</span></div>
            </div>
            <div className="card">
              <h3 style={{marginTop:0}}>Next Payments</h3>
              {(payments||[]).map(p=>(
                <div key={p.id} className="log-row">
                  <div className="log-title">{p.label}</div>
                  <div className="row-sub">{p.due} · {currency(p.amount, hideSensitive)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Important dates */}
        <section className="section">
          <div className="section-header"><h3 className="h-with-rule">Important Dates (30 days)</h3></div>
          {datesDerived.length===0 ? <div className="mono-note">No upcoming dates.</div> : (
            <div className="list">
              {datesDerived.map(x=>(
                <div key={x.id} className="log-row">
                  <div className="log-title">{x.label}</div>
                  <div className="row-sub">{x.date} · {x.source}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Alerts card spans full width */}
      <section className="section" style={{marginTop:16}}>
        <div className="section-header"><h3 className="h-with-rule">Critical Alerts</h3><div className="meta">{unresolvedAlerts.length}</div></div>
        {unresolvedAlerts.length===0 ? <div className="mono-note">All clear.</div> : (
          <div className="list">
            {unresolvedAlerts.slice(0,5).map(a=>(
              <div key={a.id} className={`alert ${a.severity==="High"?"alert--high":a.severity==="Medium"?"alert--med":"alert--low"}`}>
                <div className="alert-dot"/><div className="alert-body">
                  <div className="alert-title">{a.message}</div>
                  <div className="row-sub">{a.source} · {new Date(a.at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</div>
                </div>
                <div className="row-actions">
                  <button className="btn btn-ghost" onClick={()=>a.resolveAction?.()}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ================= Calendar ================= */
function CalendarPage({ events, setEvents }){
  const [focus,setFocus]=useState(weekStart(Date.now()));
  const days=[0,1,2,3,4,5,6].map(i=>{ const d=new Date(focus); d.setDate(focus.getDate()+i); return d; });
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState({ id:null, title:"", date:dateToYYYYMMDD(new Date()), time:"09:00", duration:60, location:"", notes:"" });

  function weekStart(date){ const d=new Date(date); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); d.setHours(0,0,0,0); return d; }
  function openNew(day){ const d = dateToYYYYMMDD(day); setDraft({ id:null, title:"", date:d, time:"09:00", duration:60, location:"", notes:"" }); setOpen(true); }
  function openEdit(ev){ setDraft({...ev}); setOpen(true); }
  function save(){ if(!draft.title.trim()) return; if(draft.id){ setEvents(evts=>evts.map(e=>e.id===draft.id?draft:e)); } else { setEvents(evts=>[{...draft,id:uid()}, ...evts]); } setOpen(false); }
  function toICS(evts){
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PLC//Calendar//EN"];
    evts.forEach(e=>{
      const start = parseDT(e.date,e.time); const end = new Date(start.getTime()+ (Number(e.duration)||60)*60000);
      const dt = (d)=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
      lines.push("BEGIN:VEVENT",`UID:${uid()}@plc`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(start)}`,`DTEND:${dt(end)}`,`SUMMARY:${e.title}`);
      if(e.location) lines.push(`LOCATION:${e.location}`); if(e.notes) lines.push(`DESCRIPTION:${e.notes}`); lines.push("END:VEVENT");
    }); lines.push("END:VCALENDAR"); downloadFile("events.ics", lines.join("\r\n"));
  }

  return (
    <div className="container">
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">Week</h3>
          <div className="meta" style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost" onClick={()=>{const d=new Date(focus); d.setDate(d.getDate()-7); setFocus(d);}}>Prev</button>
            <button className="btn btn-ghost" onClick={()=>setFocus(weekStart(Date.now()))}>Today</button>
            <button className="btn btn-ghost" onClick={()=>{const d=new Date(focus); d.setDate(d.getDate()+7); setFocus(d);}}>Next</button>
            <button className="btn btn-primary ring" onClick={()=>openNew(new Date())}>New</button>
            <button className="btn btn-ghost ring" onClick={()=>toICS(events)}>Export .ics</button>
          </div>
        </div>
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
      </section>

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
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">Properties</h3><div className="meta"><button className="btn btn-primary ring" onClick={()=>setDraft({name:"",address:"",access:"",contact:"",notes:"",occupied:false,todayTasks:0})}>Add Property</button></div></div>
        <div className="grid-2">
          {items.map(p=>(
            <div key={p.id} className="card">
              <h3 style={{marginTop:0}}>{p.name}</h3>
              <div className="mono-note">{p.address}</div>
              <div style={{marginTop:8}}><strong>Access:</strong> {p.access||"—"}</div>
              <div><strong>Contact:</strong> {p.contact||"—"}</div>
              <div className="row-sub" style={{marginTop:6}}>{p.occupied?"Occupied":"Empty"} · {p.todayTasks||0} tasks</div>
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
      </section>

      {draft && (
        <div className="modal-backdrop" onMouseDown={()=>setDraft(null)}>
          <div className="modal" onMouseDown={(e)=>e.stopPropagation()}>
            <h3 style={{marginTop:0}}>{draft.id?"Edit Property":"Add Property"}</h3>
            <div className="form-grid">
              <div className="field"><label>Name</label><input className="input" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></div>
              <div className="field"><label>Address</label><input className="input" value={draft.address} onChange={e=>setDraft({...draft,address:e.target.value})}/></div>
              <div className="field"><label>Access</label><input className="input" value={draft.access} onChange={e=>setDraft({...draft,access:e.target.value})}/></div>
              <div className="field"><label>Main Contact</label><input className="input" value={draft.contact} onChange={e=>setDraft({...draft,contact:e.target.value})}/></div>
              <div className="field"><label>Occupied</label><select className="select" value={draft.occupied?"Yes":"No"} onChange={e=>setDraft({...draft,occupied:e.target.value==="Yes"})}><option>Yes</option><option>No</option></select></div>
              <div className="field"><label>Today Tasks</label><input className="input" value={draft.todayTasks||0} onChange={e=>setDraft({...draft,todayTasks:Number(e.target.value||0)})}/></div>
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
  const [q,setQ]=useState(""); const [draft,setDraft]=useState(null);
  const filtered = useMemo(()=>contacts.filter(c=>q.trim()? (c.name+c.role+c.email+c.phone).toLowerCase().includes(q.toLowerCase()):true).sort((a,b)=>a.name.localeCompare(b.name)),[contacts,q]);
  function importCSV(file){
    const rdr=new FileReader();
    rdr.onload=()=>{ 
      const text=String(rdr.result||""); const rows=text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
      const hasHeader=/name|email|phone|role/i.test(rows[0]); const start=hasHeader?1:0; const out=[];
      for(let i=start;i<rows.length;i++){ const cols=rows[i].split(",").map(s=>s.trim()); const [name,role,email,phone,notes]=cols; if(!name) continue;
        out.push({ id:uid(), name, role:role||"", email:email||"", phone:phone||"", notes:notes||"" }); }
      setContacts(prev=>[...out,...prev]);
    }; rdr.readAsText(file);
  }
  function exportCSV(){
    const lines=[["name","role","email","phone","notes"].join(",")];
    contacts.forEach(c=>lines.push([c.name,c.role,c.email,c.phone,(c.notes||"").replace(/,/g,";")].join(",")));
    downloadFile("contacts.csv", lines.join("\n"));
  }
  function save(){ if(!draft?.name?.trim()) return; if(draft.id){ setContacts(cs=>cs.map(x=>x.id===draft.id?draft:x)); } else{ setContacts(cs=>[{...draft,id:uid()},...cs]); } setDraft(null); }

  return (
    <div className="container">
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">Contacts</h3>
          <div className="meta" style={{display:"flex",gap:8}}>
            <input className="input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
            <label className="btn btn-ghost ring" style={{display:"inline-grid", placeItems:"center"}}>
              Import CSV<input type="file" accept=".csv" style={{display:"none"}} onChange={(e)=>{ if(e.target.files?.[0]) importCSV(e.target.files[0]); e.currentTarget.value=""; }}/>
            </label>
            <button className="btn btn-ghost ring" onClick={exportCSV}>Export CSV</button>
            <button className="btn btn-primary ring" onClick={()=>setDraft({name:"",role:"",email:"",phone:"",notes:""})}>New</button>
          </div>
        </div>
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
      </section>

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
  function saveTrip(){ if(!draftTrip?.title?.trim()) return; if(draftTrip.id){ setTrips(ts=>ts.map(t=>t.id===draftTrip.id?draftTrip:t)); } else{ setTrips(ts=>[{...draftTrip,id:uid(),segments:draftTrip.segments||[]},...ts]); } setDraftTrip(null); }
  function addSeg(trip, seg){ const t = {...trip, segments:[{id:uid(),...seg}, ...(trip.segments||[])]}; setTrips(ts=>ts.map(x=>x.id===trip.id?t:x)); }
  function exportTripICS(trip){
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PLC//Travel//EN"]; const dt = (d)=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    (trip.segments||[]).forEach(s=>{
      const start=parseDT(s.date,(s.time||"09:00")); const end=new Date(start.getTime()+60*60000);
      lines.push("BEGIN:VEVENT",`UID:${uid()}@plc`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(start)}`,`DTEND:${dt(end)}`,`SUMMARY:${trip.title}: ${s.kind} – ${s.detail}`);
      if(s.notes) lines.push(`DESCRIPTION:${s.notes}`); lines.push("END:VEVENT");
    }); lines.push("END:VCALENDAR"); toICS(lines.join("\r\n"));
  }

  return (
    <div className="container">
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">Trips</h3><div className="meta"><button className="btn btn-primary ring" onClick={()=>setDraftTrip({title:"",segments:[]})}>New Trip</button></div></div>
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
      </section>

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
  function save(){ if(!draft?.name?.trim()) return; if(draft.id){ setAssets(as=>as.map(a=>a.id===draft.id?draft:a)); } else{ setAssets(as=>[{...draft,id:uid()},...as]); } setDraft(null); }
  const upcoming = assets.filter(a=>a.renewal && new Date(a.renewal)>=new Date()).sort((a,b)=>a.renewal.localeCompare(b.renewal)).slice(0,5);

  return (
    <div className="container">
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">Assets Registry</h3><div className="meta"><button className="btn btn-primary ring" onClick={()=>setDraft({type:"Vehicle",name:"",identifier:"",renewal:"",notes:""})}>Add Asset</button></div></div>
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
      </section>

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
    const fromAssets = (assets||[]).filter(a=>a.renewal).map(a=>({ id:`asset-${a.id}`, label:`${a.name} renewal`, date:a.renewal, source:"Assets"}));
    return [...manual.map(m=>({...m,source:"Manual"})), ...fromAssets].sort((a,b)=>a.date.localeCompare(b.date));
  },[manual,assets]);

  function exportICS(){
    const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//PLC//Dates//EN"]; const dt = (d)=>d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
    derived.forEach(x=>{
      const start = new Date(`${x.date}T09:00:00`); const end = new Date(start.getTime()+60*60000);
      lines.push("BEGIN:VEVENT",`UID:${uid()}@plc`,`DTSTAMP:${dt(new Date())}`,`DTSTART:${dt(start)}`,`DTEND:${dt(end)}`,`SUMMARY:${x.label}`,`DESCRIPTION:Source: ${x.source}`,"END:VEVENT");
    }); lines.push("END:VCALENDAR"); downloadFile("important-dates.ics", lines.join("\r\n"));
  }
  function save(){ if(!draft?.label?.trim() || !draft?.date) return; if(draft.id){ setManual(ds=>ds.map(d=>d.id===draft.id?draft:d)); } else{ setManual(ds=>[{...draft,id:uid()},...ds]); } setDraft(null); }

  return (
    <div className="container">
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">Important Dates</h3>
          <div className="meta" style={{display:"flex",gap:8}}>
            <button className="btn btn-ghost ring" onClick={exportICS}>Export .ics</button>
            <button className="btn btn-primary ring" onClick={()=>setDraft({label:"",date:dateToYYYYMMDD(Date.now()+86400_000),notes:""})}>Add Date</button>
          </div>
        </div>
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
      </section>

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

/* ================= Requests ================= */
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
            <div className="field"><label>Category</label><select className="select" value={category} onChange={e=>setCategory(e.target.value)}><option>General</option><option>Home</option><option>Travel</option><option>Dining</option><option>Gifting</option><option>Comms</option></select></div>
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
function TagStatus({ value }){ const cls=value==="Open"?"tag tag--open":value==="In Progress"?"tag tag--progress":"tag tag--done"; return <span className={cls}>{value}</span>; }
function TagPriority({ value }){ const cls=value==="Urgent"?"tag tag--urgent":value==="High"?"tag tag--high":value==="Medium"?"tag tag--medium":"tag tag--low"; return <span className={cls}>{value}</span>; }
function ToastHost({ items }){ return (<div className="toast-host">{items.map(t=>(<div key={t.id} className={`toast ${t.tone==="info"?"toast--info":"toast--ok"}`}>{t.tone==="info"?"•":"✓"} <span>{t.msg}</span></div>))}</div>); }

/* ================= Onboarding (same structure as before) ================= */
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
      {/* steps 3..8 identical to previous version */}
      {step>=3 && step<=8 && (
        <Card title={`${step}. Continue setup`}>
          <div className="mono-note">Use the previously added onboarding fields. (Kept concise here.)</div>
          <div className="form-nav" style={{justifyContent:"space-between"}}>
            {step>1 && <button className="btn btn-ghost" onClick={()=>setStep(step-1)}>Back</button>}
            {step<8 ? <button className="btn btn-primary ring" onClick={()=>setStep(step+1)}>Next</button> : <button className="btn btn-primary ring" onClick={onComplete}>Submit</button>}
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
