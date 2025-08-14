import React, { useEffect, useMemo, useState } from "react";

/* ========= Small utilities ========= */
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
function currency(n, hide, code){
  if(hide) return "••••";
  try {
    const fallback = "GBP";
    const cfg = JSON.parse(localStorage.getItem("plc_settings_v1")||"{}") || {};
    const cur = code || cfg.currency || fallback;
    return new Intl.NumberFormat(undefined,{style:"currency",currency:String(cur||fallback)}).format(Number(n||0));
  } catch { return `£${Number(n||0).toFixed(0)}`; }
}

/* ========= Responsive hook (inline, premium-tuned breakpoints) ========= */
function useScreen() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => { const onR=()=>setW(window.innerWidth); window.addEventListener("resize", onR); return ()=>window.removeEventListener("resize", onR); },[]);
  return { width: w, isPhone: w <= 480, isTablet: w > 480 && w <= 1024, isDesktop: w > 1024 };
}

/* ========= Nav ========= */
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

/* =======================================================================
   App
======================================================================= */
export default function App(){
  /* Theme & privacy */
  const [theme,setTheme] = useLocalState("plc_theme","noir");
  useEffect(()=>{ document.body.dataset.theme = theme; },[theme]);
  const [privacy,setPrivacy] = useLocalState("plc_privacy","show"); // "show" | "hide"
  const hideSensitive = privacy === "hide";
  // Ensure settings exists before any effects use it
  const [settings,setSettings] = useLocalState("plc_settings_v1",{
    travelBufferMin: 30,
    currency: "GBP",
    timeZone: (Intl.DateTimeFormat().resolvedOptions().timeZone)||"Europe/London",
    autoLockMin: 2
  });

  /* Lock & PIN */
  const [lockPin,setLockPin] = useLocalState("plc_lock_pin_v1","");
  const pinSet = Boolean(lockPin && String(lockPin).length>=4);
  const [locked,setLocked] = useState(false);
  const [showPinModal,setShowPinModal] = useState(false);
  const [showSettings,setShowSettings] = useState(false);

  function lockNow(){ setLocked(true); setPrivacy("hide"); }
  function unlockWith(pin){
    if(!pinSet){ setLocked(false); return true; }
    if(String(pin)===String(lockPin)){ setLocked(false); return true; }
    return false;
  }
  function setNewPin(pin){ setLockPin(String(pin||"")); notify("PIN updated","info"); }

  // Lock on load if a PIN is set
  useEffect(()=>{ if(pinSet) setLocked(true); },[]);

  // Auto-lock on inactivity (settings.autoLockMin minutes)
  useEffect(()=>{
    if(!pinSet) return;
    let t;
    const mins = Number(settings?.autoLockMin||2);
    const reset=()=>{ if(t) clearTimeout(t); t=setTimeout(()=>lockNow(), Math.max(0.5, mins)*60*1000); };
    const evts=["mousemove","keydown","touchstart"];
    evts.forEach(e=>window.addEventListener(e, reset));
    reset();
    return ()=>{ evts.forEach(e=>window.removeEventListener(e, reset)); if(t) clearTimeout(t); };
  },[pinSet, settings.autoLockMin]);

  // Lock when the window/tab loses focus
  useEffect(()=>{
    const onBlur=()=>{ if(pinSet) lockNow(); };
    window.addEventListener("blur", onBlur);
    return ()=>window.removeEventListener("blur", onBlur);
  },[pinSet]);

  /* Router */
  const [route,setRoute] = useState("dashboard");

  /* Core data */
  const [onboarding,setOnboarding] = useLocalState("plc_onboarding_v1",{});
  const [requests,setRequests] = useLocalState("plc_requests_v1",[
    { id: uid(), title: "Table for four, Saturday 20:00", category: "Dining", priority: "Medium", status: "Open", assignee: "Concierge", dueDate: dateToYYYYMMDD(Date.now()+86400_000*4), createdAt: Date.now(), notes: "Quiet corner. Italian or French." },
    { id: uid(), title: "Airport transfer Friday", category: "Travel", priority: "High", status: "In Progress", assignee: "Chauffeur", dueDate: dateToYYYYMMDD(Date.now()+86400_000*2), createdAt: Date.now()-3600_000, notes: "Mayfair → LHR T5 at 13:00." },
  ]);
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
  const [vehicles,setVehicles] = useLocalState("plc_vehicles_rt_v1",[
    { id: uid(), driver:"Marco", plate:"LX20 BNT", nextJobAt: `${dateToYYYYMMDD(Date.now())} 07:40`, status:"On duty" },
    { id: uid(), driver:"Amir", plate:"EV70 LUX", nextJobAt: `${dateToYYYYMMDD(Date.now())} 13:00`, status:"Standby" },
  ]);
  const [guests,setGuests] = useLocalState("plc_guests_v1",[
    { id: uid(), name:"Sophie", eta: `${dateToYYYYMMDD(Date.now()+86400_000*2)} 18:00`, notes:"Staying 2 nights" },
  ]);
  const [inbox,setInbox] = useLocalState("plc_inbox_v1",[
    { id: uid(), from:"Concierge", summary:"Dry cleaning delivered to Mayfair residence", lastUpdateAt: Date.now()-60*60*1000 },
    { id: uid(), from:"Travel", summary:"NCE flight upgrade confirmed", lastUpdateAt: Date.now()-2*60*60*1000 },
    { id: uid(), from:"Home", summary:"Landscaping moved to 10:00 tomorrow", lastUpdateAt: Date.now()-20*60*1000 },
  ]);
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

  function exportBrief(){
    const tz = settings?.timeZone;
    const mtd = money?.mtdDiscretionary||0;
    const plan = money?.plan||0;
    const variance = plan ? Math.round(((mtd-plan)/plan)*100) : 0;
    const payments = (money?.nextPayments||[]).slice(0,5);
    const now = new Date();

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Executive Brief</title>
      <style>
        body{font-family:Segoe UI,Inter,system-ui,sans-serif;margin:24px;color:#111}
        h1{font-size:20px;margin:0 0 8px}
        .sub{color:#666;margin-bottom:18px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
        .card{border:1px solid #ddd;border-radius:12px;padding:14px}
        .h{font-weight:600;margin-bottom:8px}
        .row{display:flex;justify-content:space-between;margin:4px 0}
        .muted{color:#666}
      </style></head><body>
        <h1>Executive Brief</h1>
        <div class="sub">Generated ${now.toLocaleString([], {timeZone: tz})}</div>
        <div class="grid">
          <div class="card"><div class="h">Next Event</div>
            <div>${nextEvent ? `${nextEvent.date} ${nextEvent.time} — ${nextEvent.title}` : "No upcoming events"}</div>
            <div class="muted">${nextEvent?.location||""}</div>
          </div>
          <div class="card"><div class="h">Decisions Pending</div>
            ${(pendingDecisions||[]).slice(0,6).map(d=>`<div class="row"><span>${d.title}</span><span>${d.amount!=null?currency(d.amount, false):""}</span></div>`).join("")||"<div class=muted>None</div>"}
          </div>
          <div class="card"><div class="h">Alerts</div>
            ${(unresolvedAlerts||[]).slice(0,6).map(a=>`<div class="row"><span>${a.message}</span><span class="muted">${new Date(a.at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", timeZone: tz})}</span></div>`).join("")||"<div class=muted>All clear</div>"}
          </div>
          <div class="card"><div class="h">Travel</div>
            ${nextTripSeg ? `<div>${nextTripSeg.date} ${nextTripSeg.time||""} — ${nextTripSeg.detail}</div>` : "<div class=muted>No upcoming segments</div>"}
          </div>
          <div class="card"><div class="h">Money</div>
            <div class="row"><span>MTD discretionary</span><span>${currency(mtd,false)}</span></div>
            <div class="row"><span>Vs plan</span><span>${variance?`${variance>0?"+":""}${variance}%`:"—"}</span></div>
            ${(payments||[]).map(p=>`<div class="row"><span>${p.label}</span><span>${currency(p.amount,false)}</span></div>`).join("")}
          </div>
        </div>
        <script>window.print();</script>
      </body></html>`;
    const w = window.open("","_blank");
    if(!w) return notify("Pop-up blocked","info");
    w.document.write(html); w.document.close(); w.focus();
  }

  /* Executive Briefing derived */
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
  const pendingDecisions = decisions.filter(d=>d.status==="Pending");
  const unresolvedAlerts = alerts.filter(a=>!a.resolved);
  const nextTripSeg = useMemo(()=>{
    const all = (trips||[]).flatMap(t=>t.segments.map(s=>({...s, trip:t.title, d: parseDT(s.date,s.time||"09:00")})));
    const future = all.filter(s=>s.d>=new Date()).sort((a,b)=>a.d-b.d);
    return future[0]||null;
  },[trips]);

  /* ====== Chat (lightweight, with auto-replies & unread) ====== */
  const [mobileTab, setMobileTab] = useLocalState("plc_mobile_tab","home");
  const [threads] = useLocalState("plc_threads_v1", [{ id: "concierge", name: "Concierge" }]);
  const [lastThread, setLastThread] = useLocalState("plc_last_thread", "concierge");
  const [messages, setMessages] = useLocalState("plc_messages_v1", [
    { id: uid(), thread: "concierge", from: "them", text: "Good morning — how may I assist?", at: Date.now()-3600_000 }
  ]);
  const [readAt, setReadAt] = useLocalState("plc_read_at_v1", { concierge: Date.now()-3600_000 });

  const threadMsgs = useMemo(()=>messages.filter(m=>m.thread===lastThread).sort((a,b)=>a.at-b.at),[messages,lastThread]);
  const unreadCount = useMemo(()=>{ const t=readAt[lastThread]||0; return messages.filter(m=>m.thread===lastThread && m.from==="them" && m.at>t).length; },[messages,readAt,lastThread]);
  function markThreadRead(id=lastThread){ setReadAt(r=>({...r,[id]:Date.now()})); }
  const AUTO = ["Certainly. I’ll handle and update.","Booked and confirmed.","Sharing options shortly.","On it — will report back."];
  function autoReply(threadId){ const reply=AUTO[Math.floor(Math.random()*AUTO.length)];
    setTimeout(()=>setMessages(m=>[...m,{id:uid(),thread:threadId,from:"them",text:reply,at:Date.now()}]), 900+Math.random()*1200);
  }
  function sendChat(text, threadId=lastThread){
    setMessages(m=>[...m,{id:uid(),thread:threadId,from:"me",text,at:Date.now()}]);
    setMobileTab("chat"); setLastThread(threadId); autoReply(threadId);
  }

  const openRequestsCount = useMemo(()=>requests.filter(r=>r.status!=="Done").length,[requests]);

  /* ====== Screen ====== */
  const screen = useScreen();

  /* ====== Quick Action Sheet (state) ====== */
  const [quickOpen, setQuickOpen] = useState(false);

  /* ====== Render ====== */
  return (
    <div className="app">
      {/* Top & shell hidden on phone by CSS media queries */}
      <TopBar
        theme={theme}
        privacy={privacy}
        pinSet={pinSet}
        onToggleTheme={()=>setTheme(theme==="noir"?"ivory":"noir")}
        onTogglePrivacy={()=>setPrivacy(privacy==="hide"?"show":"hide")}
        onNewRequest={()=>{ setRoute("requests"); setActiveReqId("new"); }}
        onExport={exportAll}
        onImport={(f)=>importAll(f)}
        onLockNow={lockNow}
        onOpenPin={()=>setShowPinModal(true)}
        onOpenSettings={()=>setShowSettings(true)}
      />
      <div className="shell">
        <SideBar route={route} onNavigate={setRoute} />
        <main className="main">

          {/* ===== DASHBOARD ===== */}
          {route==="dashboard" && (
            screen.isPhone ? (
              <>
                {mobileTab === "home" && (
                  <PhoneDashboard
                    name={name}
                    pendingDecisions={pendingDecisions}
                    unresolvedAlerts={unresolvedAlerts}
                    nextEvent={nextEvent}
                    leaveInMin={leaveInMin}
                    nextTripSeg={nextTripSeg}
                    money={money}
                    properties={properties}
                    onOpenQuick={()=>setQuickOpen(true)}
                    onGoRequests={()=>setMobileTab("requests")}
                    onGoCalendar={()=>setRoute("calendar")}
                    onGoTravel={()=>setRoute("travel")}
                    onGoProperties={()=>setRoute("properties")}
                    onGoMoney={()=>setRoute("assets")}
                  />
                )}
                {mobileTab === "requests" && (
                  <PhoneRequests
                    items={requests}
                    onBack={()=>setMobileTab("home")}
                    onCreate={(p)=>{ const rec={id:uid(),createdAt:Date.now(),status:"Open",...p}; setRequests([rec,...requests]); }}
                    onUpdate={(id,patch)=>setRequests(prev=>prev.map(r=>r.id===id?{...r,...patch}:r))}
                    onDelete={(id)=>setRequests(prev=>prev.filter(r=>r.id!==id))}
                    onOpen={(id)=>setActiveReqId(id)}
                    onShareToChat={(text)=>sendChat(text)}
                  />
                )}
                {mobileTab === "profile" && (
                  <PhoneProfile
                    name={name}
                    theme={theme}
                    privacy={privacy}
                    pinSet={pinSet}
                    onToggleTheme={()=>setTheme(theme==="noir"?"ivory":"noir")}
                    onTogglePrivacy={()=>setPrivacy(privacy==="hide"?"show":"hide")}
                    onOpenPin={()=>setShowPinModal(true)}
                    onLockNow={lockNow}
                  />
                )}
                {mobileTab === "chat" && (
                  <PhoneChat
                    name="Concierge"
                    messages={threadMsgs}
                    onSend={(t)=>sendChat(t)}
                    onBack={()=>{ setMobileTab("home"); markThreadRead(); }}
                  />
                )}
                <PhoneTabs
                  active={mobileTab}
                  onChange={(k)=>{ setMobileTab(k); if(k==="home") markThreadRead(); }}
                  badges={{ home: unreadCount, requests: openRequestsCount, profile: 0 }}
                />
                <QuickActionSheet
                  open={quickOpen}
                  onClose={()=>setQuickOpen(false)}
                  onShortcut={({title, notes, category}) => createRequest({ title, notes, category })}
                />
              </>
            ) : screen.isTablet ? (
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
              <ExecutiveDashboard
                name={name}
                hideSensitive={hideSensitive}
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
                onShare={(text)=>sendChat(text)}
                timeZone={settings.timeZone}
                onExportBrief={exportBrief}
                onViewDecisions={()=>setRoute("requests")}
                onViewInbox={()=>setRoute("requests")}
              />
            )
          )}

          {/* ===== OTHER ROUTES ===== */}
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
              onShareToChat={(text)=>sendChat(text)}
            />
          )}
        </main>
      </div>

      {/* Drawer & toasts */}
      {activeReqId && (
        <RequestDrawer
          mode={activeReqId==="new"?"new":"view"}
          request={requests.find(r=>r.id===activeReqId)||null}
          onClose={()=>setActiveReqId(null)}
          onCreate={(payload)=>{ const rec={id:uid(),createdAt:Date.now(),status:"Open",...payload}; setRequests([rec,...requests]); setActiveReqId(rec.id); }}
          onUpdate={(patch)=>{ const id=activeReqId; setRequests(prev=>prev.map(r=>r.id===id?{...r,...patch}:r)); }}
        />
      )}
      <LockOverlay locked={locked} onUnlock={unlockWith} />
      <PinModal open={showPinModal} onClose={()=>setShowPinModal(false)} onSet={(p)=>{ setNewPin(p); setShowPinModal(false); }} />
      <SettingsModal open={showSettings} settings={settings} onClose={()=>setShowSettings(false)} onSave={(patch)=>{ setSettings(s=>({...s,...patch})); setShowSettings(false); notify("Settings saved","ok"); }} />
      <ToastHost items={toasts} />
    </div>
  );
}

/* =======================================================================
   Shell
======================================================================= */
function TopBar({ onNewRequest, theme, privacy, pinSet, onToggleTheme, onTogglePrivacy, onExport, onImport, onLockNow, onOpenPin, onOpenSettings }){
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
          {pinSet 
            ? <button className="btn btn-ghost ring" onClick={onLockNow}>Lock</button>
            : <button className="btn btn-ghost ring" onClick={onOpenPin}>Set PIN</button>
          }
          <label className="btn btn-ghost ring" style={{display:"inline-grid", placeItems:"center"}}>
            Import<input type="file" accept=".json" style={{display:"none"}} onChange={(e)=>{ if(e.target.files?.[0]) onImport(e.target.files[0]); e.currentTarget.value=""; }}/>
          </label>
          <button className="btn btn-ghost ring" onClick={onExport}>Export</button>
          <button className="btn btn-ghost ring" onClick={onToggleTheme}>{theme==="noir"?"Ivory":"Noir"}</button>
          <button className="btn btn-ghost ring" onClick={onOpenSettings}>Settings</button>
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

/* =======================================================================
   Executive Dashboard (desktop)
======================================================================= */
function ExecutiveDashboard({
  name, hideSensitive, pendingDecisions, unresolvedAlerts,
  nextEvent, leaveInMin, vehicles, properties, guests, inbox, nextTripSeg, money, datesManual, assets,
  onApprove, onDecline, onDelegate, onQuickMessage, onCreateRequest, onShare, timeZone, onExportBrief,
  onViewDecisions, onViewInbox
}){
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
      {/* Strip */}
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
          <button className="btn btn-ghost ring" onClick={onExportBrief}>Export Brief</button>
          <button className="btn btn-primary ring" onClick={onQuickMessage}>Message Concierge</button>
        </div>
      </div>

      <div className="grid-3">
        {/* Decisions */}
        <section className="section">
          <div className="section-header">
            <h3 className="h-with-rule">Decision Queue</h3>
            <div className="meta">
              {pendingDecisions.length} pending
              <button className="btn btn-ghost ring" style={{marginLeft:8}} onClick={onViewDecisions}>View all</button>
            </div>
          </div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Inbox */}
        <section className="section">
          <div className="section-header">
            <h3 className="h-with-rule">Concierge Inbox</h3>
            <div className="meta">
              {(inbox||[]).length} items
              <button className="btn btn-ghost ring" style={{marginLeft:8}} onClick={onViewInbox}>View all</button>
            </div>
          </div>
          <div className="list">
            {(inbox||[]).slice(0,3).map(t=>(
              <div key={t.id} className="inbox-item">
                <div className="who">{t.from}</div>
                <div style={{fontWeight:600}}>{t.summary}</div>
                <div className="row-actions" style={{marginTop:8}}>
                  <button className="btn btn-ghost" onClick={()=>onCreateRequest(`Action: ${t.summary}`, `From ${t.from}`)}>Create request</button>
                  <button className="btn btn-ghost" onClick={()=>onShare?.(`${t.from}: ${t.summary}`)}>Share</button>
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

        {/* Dates */}
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

      {/* Alerts */}
      <section className="section" style={{marginTop:16}}>
        <div className="section-header"><h3 className="h-with-rule">Critical Alerts</h3><div className="meta">{unresolvedAlerts.length}</div></div>
        {unresolvedAlerts.length===0 ? <div className="mono-note">All clear.</div> : (
          <div className="list">
            {unresolvedAlerts.slice(0,5).map(a=>(
              <div key={a.id} className={`alert ${a.severity==="High"?"alert--high":a.severity==="Medium"?"alert--med":"alert--low"}`}>
                <div className="alert-dot"/><div className="alert-body">
                  <div className="alert-title">{a.message}</div>
                  <div className="row-sub">{a.source} · {new Date(a.at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", timeZone})}</div>
                </div>
                <div className="row-actions">
                  <button className="btn btn-ghost" onClick={()=>{/* reserved for real resolve */}}>Resolve</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* =======================================================================
   Phone (iPhone) — premium, minimal, no emojis
======================================================================= */
function PhoneTabs({ active, onChange, badges = {} }){
  const Item = ({ k, label, icon }) => (
    <button className={active===k ? "active" : ""} onClick={()=>onChange(k)} aria-label={label}>
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
      {!!badges[k] && <span className="tab-badge">{badges[k] > 99 ? "99+" : badges[k]}</span>}
    </button>
  );
  return (
    <nav className="tabbar">
      <Item k="home"     label="Home"     icon="⌂" />
      <Item k="requests" label="Requests" icon="⋯" />
      <Item k="profile"  label="Profile"  icon="⚙︎" />
    </nav>
  );
}

/* ---- iOS-style widget Home + FAB ---- */
function PhoneDashboard({
  name="Client",
  pendingDecisions=[],
  unresolvedAlerts=[],
  nextEvent, leaveInMin,
  nextTripSeg, money, properties=[],
  onOpenQuick, onGoRequests, onGoCalendar, onGoTravel, onGoProperties, onGoMoney
}) {
  const first = String(name).split(" ")[0] || name;
  const h = new Date().getHours();
  const greet = h >= 18 ? "Good Evening" : h >= 12 ? "Good Afternoon" : "Good Morning";
  const mtd = money?.mtdDiscretionary ?? 0;
  const plan = money?.plan ?? 0;
  const variance = plan ? Math.round(((mtd - plan) / plan) * 100) : 0;

  return (
    <div className="mobile-shell">
      <header className="mobile-header">
        <div style={{display:"grid", gap:6}}>
          <div style={{fontSize:18, fontWeight:700, letterSpacing:"0.01em"}}>{greet}, {first}.</div>
          <div className="mh-sub">
            {nextEvent ? `${nextEvent.time} — ${nextEvent.title}` : "No upcoming events"}
            {typeof leaveInMin === "number" && (
              <span className={`pill ${leaveInMin <= 0 ? "pill--late" : ""}`}>
                {leaveInMin > 0 ? `Leave in ${leaveInMin}m` : `Late ${Math.abs(leaveInMin)}m`}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Widget grid */}
      <div className="w-grid">
        <button className="widget" onClick={onGoRequests}>
          <div className="w-k">Decision Queue</div>
          <div className="w-v">{pendingDecisions.length}</div>
          <div className="w-sub">Approvals awaiting</div>
        </button>

        <div className="widget">
          <div className="w-k">Alerts</div>
          <div className={`w-v ${unresolvedAlerts.length ? "warn" : ""}`}>{unresolvedAlerts.length}</div>
          <div className="w-sub">{unresolvedAlerts[0]?.message || "All clear"}</div>
        </div>

        <button className="widget" onClick={onGoCalendar}>
          <div className="w-k">Next</div>
          <div className="w-v">{nextEvent ? nextEvent.time : "—"}</div>
          <div className="w-sub">{nextEvent ? (nextEvent.location || nextEvent.title) : "No upcoming"}</div>
        </button>

        <button className="widget widget--wide" onClick={onGoTravel}>
          <div className="w-k">Travel</div>
          <div className="w-v">{nextTripSeg ? `${nextTripSeg.date} ${nextTripSeg.time}` : "—"}</div>
          <div className="w-sub">{nextTripSeg ? nextTripSeg.detail : "No upcoming segments"}</div>
        </button>

        <button className="widget" onClick={onGoMoney}>
          <div className="w-k">MTD Spend</div>
          <div className="w-v">{new Intl.NumberFormat(undefined,{style:"currency",currency:"GBP"}).format(mtd)}</div>
          <div className="w-sub">{variance ? `${variance>0?"+":""}${variance}% vs plan` : "—"}</div>
        </button>

        <button className="widget" onClick={onGoProperties}>
          <div className="w-k">Residences</div>
          <div className="w-v">{properties.length || 0}</div>
          <div className="w-sub">{properties[0]?.name || "Manage access & tasks"}</div>
        </button>
      </div>

      {/* Floating + (opens quick-add sheet) */}
      <button className="fab" aria-label="Quick actions" onClick={onOpenQuick}>＋</button>
    </div>
  );
}

/* ---- Bottom Quick Action Sheet ---- */
function QuickActionSheet({ open, onClose, onShortcut }) {
  if (!open) return null;
  const actions = [
    { t:"Dining reservation", s:"Cuisine, time, guests", c:"Dining" },
    { t:"Hotel booking", s:"City, dates, room type", c:"Travel" },
    { t:"Flight arrangements", s:"Route, dates, class", c:"Travel" },
    { t:"Event access", s:"Event, date, passes", c:"Access" },
    { t:"Gifting / shopping", s:"Recipient, budget, delivery by", c:"Gifting" },
    { t:"Car / chauffeur", s:"Pickup, time, bags", c:"Transport" },
  ];
  function pick(a){
    onShortcut?.({ title: a.t, notes: a.s, category: a.c });
    onClose?.();
  }
  return (
    <div className="sheet-backdrop" onMouseDown={onClose}>
      <div className="sheet" onMouseDown={(e)=>e.stopPropagation()}>
        <div className="sheet-handle"/>
        <div className="sheet-title">Create request</div>
        <div className="sheet-list">
          {actions.map((a,i)=>(
            <button key={i} className="sheet-item" onClick={()=>pick(a)}>
              <div className="sheet-item-main">
                <div className="sheet-item-title">{a.t}</div>
                <div className="sheet-item-sub">{a.s}</div>
              </div>
              <div className="sheet-chevron">›</div>
            </button>
          ))}
        </div>
        <div className="sheet-foot">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ---- Mobile Requests (sticky header, back) ---- */
function PhoneRequests({ items, onBack, onCreate, onUpdate, onDelete, onOpen, onShareToChat }) {
  const [q,setQ]=useState(""); 
  const [status,setStatus]=useState("All");
  const [prio,setPrio]=useState("All");
  const filtered = useMemo(()=>items
    .filter(r=>status==="All"?true:r.status===status)
    .filter(r=>prio==="All"?true:r.priority===prio)
    .filter(r=>q.trim() ? (r.title+r.notes).toLowerCase().includes(q.toLowerCase()) : true)
    .sort((a,b)=>b.createdAt-a.createdAt),[items,q,status,prio]);

  return (
    <div className="page">
      <header className="m-header">
        <button className="hbtn" onClick={onBack}>‹</button>
        <div className="m-title">Requests</div>
        <button className="hbtn" onClick={()=>onCreate({
          title:"", category:"General", priority:"Medium", assignee:"", dueDate:"", notes:""
        })}>＋</button>
      </header>

      <div className="m-toolbar">
        <input className="input" placeholder="Search…" value={q} onChange={e=>setQ(e.target.value)} />
        <div className="seg">
          {["All","Open","In Progress","Done"].map(s=>(
            <button key={s} className={`seg-item ${status===s?"active":""}`} onClick={()=>setStatus(s)}>{s}</button>
          ))}
        </div>
        <div className="seg">
          {["All","Low","Medium","High","Urgent"].map(s=>(
            <button key={s} className={`seg-item ${prio===s?"active":""}`} onClick={()=>setPrio(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="m-list">
        {filtered.map(r=>(
          <div key={r.id} className="m-card" onClick={()=>onOpen(r.id)}>
            <div className="m-row">
              <div className="m-title-2">{r.title}</div>
              <span className="m-chevron">›</span>
            </div>
            <div className="row-sub">{r.notes}</div>
            <div className="m-meta">
              <TagStatus value={r.status}/><span>·</span><TagPriority value={r.priority}/>
              {r.dueDate && <><span>·</span><span className="row-sub">Due {r.dueDate}</span></>}
            </div>
            <div className="row-actions" style={{marginTop:8}}>
              <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onShareToChat?.(`${r.title} — ${r.status}${r.dueDate?` · due ${r.dueDate}`:""}`);}}>Share</button>
              {r.status!=="Done" && <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onUpdate(r.id,{status:"Done"});}}>Mark done</button>}
              {r.status==="Open" && <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onUpdate(r.id,{status:"In Progress"});}}>Start</button>}
              <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onDelete(r.id);}}>Delete</button>
            </div>
          </div>
        ))}
        {filtered.length===0 && <div className="mono-note" style={{padding:12}}>No results.</div>}
      </div>
    </div>
  );
}

function PhoneChat({ name="Concierge", messages=[], onSend, onBack }){
  const [text,setText]=useState("");
  const send=()=>{ if(!text.trim()) return; onSend?.(text.trim()); setText(""); };
  useEffect(()=>{ const el=document.querySelector(".chat-log"); el?.scrollTo(0, el.scrollHeight); },[messages]);

  return (
    <div className="chat-view">
      <header className="mobile-header" style={{borderRadius:0, background:"linear-gradient(180deg,#0c0c0c,#080808)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button className="btn btn-ghost ring" onClick={onBack}>‹ Back</button>
          <div className="mh-greeting">{name}</div>
          <div style={{width:56}} />
        </div>
      </header>

      <div className="chat-log" style={{padding:12}}>
        {messages.map(m=>(
          <div key={m.id} className={`chat-msg ${m.from==="me"?"me":"them"}`}>
            <div style={{fontSize:14}}>{m.text}</div>
            <div className="row-sub" style={{marginTop:4}}>
              {new Date(m.at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
            </div>
          </div>
        ))}
      </div>

      <div className="chat-composer">
        <input className="chat-input" placeholder="Type a message…" value={text}
               onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} />
        <button className="chat-send btn btn-primary ring" onClick={send}>Send</button>
      </div>
    </div>
  );
}
function PhoneProfile({ name="Client", theme, privacy, pinSet, onToggleTheme, onTogglePrivacy, onOpenPin, onLockNow }){
  const first=(String(name).split(" ")[0])||name;
  return (
    <div className="mobile-shell" style={{padding:16}}>
      <h3 className="h-with-rule" style={{marginTop:0}}>Profile</h3>
      <div className="card" style={{marginBottom:12}}>
        <div className="dec-title" style={{marginTop:0}}>Welcome, {first}</div>
        <div className="row-sub">Device preferences</div>
      </div>
      <button className="action" style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",border:"1px solid var(--line)",borderRadius:16,background:"var(--surface)"}}
              onClick={onToggleTheme}>
        <div className="a-label" style={{fontWeight:600}}>Theme</div>
        <div className="a-sub" style={{marginLeft:"auto", color:"var(--ink-3)"}}>{theme==="noir"?"Noir (dark)":"Ivory (light)"}</div>
        <span className="a-arrow" style={{opacity:.45, fontSize:20}}>›</span>
      </button>
      <button className="action" style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",border:"1px solid var(--line)",borderRadius:16,background:"var(--surface)", marginTop:8}}
              onClick={onTogglePrivacy}>
        <div className="a-label" style={{fontWeight:600}}>Privacy</div>
        <div className="a-sub" style={{marginLeft:"auto", color:"var(--ink-3)"}}>{privacy==="hide"?"Sensitive hidden":"Sensitive visible"}</div>
        <span className="a-arrow" style={{opacity:.45, fontSize:20}}>›</span>
      </button>
      <div style={{marginTop:12}} />
      {pinSet ? (
        <button className="action" style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",border:"1px solid var(--line)",borderRadius:16,background:"var(--surface)"}}
                onClick={onLockNow}>
          <div className="a-label" style={{fontWeight:600}}>Lock</div>
          <div className="a-sub" style={{marginLeft:"auto", color:"var(--ink-3)"}}>Immediately lock and hide</div>
          <span className="a-arrow" style={{opacity:.45, fontSize:20}}>›</span>
        </button>
      ) : (
        <button className="action" style={{display:"flex",gap:12,alignItems:"center",padding:"14px 16px",border:"1px solid var(--line)",borderRadius:16,background:"var(--surface)"}}
                onClick={onOpenPin}>
          <div className="a-label" style={{fontWeight:600}}>Set PIN</div>
          <div className="a-sub" style={{marginLeft:"auto", color:"var(--ink-3)"}}>Create a 4–6 digit PIN</div>
          <span className="a-arrow" style={{opacity:.45, fontSize:20}}>›</span>
        </button>
      )}
    </div>
  );
}

/* =======================================================================
   Tablet Home (compact)
======================================================================= */
function TabletHome({ name="Client", nextEvent, leaveInMin, pendingDecisions=[], unresolvedAlerts=[], nextTripSeg, onShortcut, money }){
  const first = String(name).split(" ")[0] || name;
  const shortcuts = [
    { t:"Book hotel", n:"City, dates, room type", c:"Travel" },
    { t:"Book restaurant", n:"Cuisine, time, pax", c:"Dining" },
    { t:"Book flights", n:"Route, dates, class", c:"Travel" },
    { t:"Get event access", n:"Event, date, #passes", c:"Access" },
    { t:"Gift / shopping", n:"Recipient, budget, deliver by", c:"Gifting" },
    { t:"Chauffeur / car", n:"Pickup, time, bags", c:"Transport" },
  ];
  return (
    <div className="tablet-grid container">
      <section className="section">
        <div className="section-header"><h3 className="h-with-rule">How may we assist today, {first}?</h3></div>
        <div className="tablet-actions">
          {shortcuts.map((s,i)=>(
            <button key={i} className="action action--lg"
              onClick={()=>onShortcut?.({title:s.t, notes:s.n, category:s.c})}>
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

/* =======================================================================
   Calendar
======================================================================= */
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

/* =======================================================================
   Properties
======================================================================= */
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

/* =======================================================================
   Contacts
======================================================================= */
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

/* =======================================================================
   Travel
======================================================================= */
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

/* =======================================================================
   Assets
======================================================================= */
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

/* =======================================================================
   Dates
======================================================================= */
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

/* =======================================================================
   Requests + Drawer (desktop/tablet)
======================================================================= */
function Requests({ items, onCreate, onUpdate, onDelete, onOpen, onShareToChat }){
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
          <thead><tr><th style={{width:"34%"}}>Title</th><th>Status</th><th>Priority</th><th>Due</th><th>Assignee</th><th style={{width:220}}>Actions</th></tr></thead>
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
                      <button className="btn btn-ghost" onClick={(e)=>{e.stopPropagation(); onShareToChat?.(`${r.title} — ${r.status}${r.dueDate?` · due ${r.dueDate}`:""}`);}}>Share to chat</button>
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

/* =======================================================================
   Small components
======================================================================= */
function TagStatus({ value }){ const cls=value==="Open"?"tag tag--open":value==="In Progress"?"tag tag--progress":"tag tag--done"; return <span className={cls}>{value}</span>; }

function LockOverlay({ locked, onUnlock }){
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  if(!locked) return null;
  const tryUnlock=()=>{
    if(onUnlock?.(pin)) { setPin(""); setErr(""); }
    else { setErr("Incorrect PIN"); }
  };
  return (
    <div className="lock-overlay" style={{position:"fixed",inset:0,backdropFilter:"blur(8px)",background:"rgba(0,0,0,.4)",display:"grid",placeItems:"center",zIndex:9999}}>
      <div className="lock-panel" style={{background:"var(--surface, #111)",color:"var(--ink, #eee)",padding:24,borderRadius:16,minWidth:280,boxShadow:"0 10px 30px rgba(0,0,0,.4)"}}>
        <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>Locked</div>
        <div className="row-sub" style={{marginBottom:12,opacity:.8}}>Enter PIN to continue</div>
        <input autoFocus className="input" inputMode="numeric" pattern="[0-9]*" placeholder="••••"
               value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryUnlock()} />
        {err && <div className="mono-note" style={{color:"#ff6b6b",marginTop:8}}>{err}</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
          <button className="btn btn-primary ring" onClick={tryUnlock}>Unlock</button>
        </div>
      </div>
    </div>
  );
}

function PinModal({ open, onClose, onSet }){
  const [p1,setP1]=useState("");
  const [p2,setP2]=useState("");
  const [err,setErr]=useState("");
  if(!open) return null;
  const save=()=>{
    if(p1.length<4 || p1.length>6) { setErr("PIN must be 4–6 digits"); return; }
    if(p1!==p2) { setErr("PINs do not match"); return; }
    onSet?.(p1);
    setP1(""); setP2(""); setErr("");
  };
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>Set PIN</h3>
        <div className="form-grid">
          <div className="field"><label>New PIN</label><input className="input" inputMode="numeric" pattern="[0-9]*" value={p1} onChange={e=>setP1(e.target.value)} /></div>
          <div className="field"><label>Confirm PIN</label><input className="input" inputMode="numeric" pattern="[0-9]*" value={p2} onChange={e=>setP2(e.target.value)} /></div>
        </div>
        {err && <div className="mono-note" style={{color:"#ff6b6b",marginTop:8}}>{err}</div>}
        <div className="form-nav" style={{justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary ring" onClick={save}>Save PIN</button>
        </div>
      </div>
    </div>
  );
}
function TagPriority({ value }){ const cls=value==="Urgent"?"tag tag--urgent":value==="High"?"tag tag--high":value==="Medium"?"tag tag--medium":"tag tag--low"; return <span className={cls}>{value}</span>; }
function ToastHost({ items }){ return (<div className="toast-host">{items.map(t=>(<div key={t.id} className={`toast ${t.tone==="info"?"toast--info":"toast--ok"}`}>{t.tone==="info"?"•":"✓"} <span>{t.msg}</span></div>))}</div>); }

/* =======================================================================
   Onboarding (trimmed)
======================================================================= */
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

function SettingsModal({ open, settings, onClose, onSave }){
  const [currency,setCurrency]=useState(settings?.currency||"GBP");
  const [timeZone,setTimeZone]=useState(settings?.timeZone||"Europe/London");
  const [autoLockMin,setAutoLockMin]=useState(settings?.autoLockMin||2);
  const [travelBufferMin,setTravelBufferMin]=useState(settings?.travelBufferMin||30);
  if(!open) return null;
  const save=()=>onSave?.({ currency, timeZone, autoLockMin:Number(autoLockMin)||0, travelBufferMin:Number(travelBufferMin)||0 });
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={e=>e.stopPropagation()}>
        <h3 style={{marginTop:0}}>Settings</h3>
        <div className="form-grid">
          <div className="field"><label>Currency</label>
            <select className="select" value={currency} onChange={e=>setCurrency(e.target.value)}>
              <option value="GBP">GBP – British Pound</option>
              <option value="EUR">EUR – Euro</option>
              <option value="USD">USD – US Dollar</option>
              <option value="AED">AED – UAE Dirham</option>
              <option value="CHF">CHF – Swiss Franc</option>
            </select>
          </div>
          <div className="field"><label>Time Zone</label>
            <input className="input" value={timeZone} onChange={e=>setTimeZone(e.target.value)} placeholder="e.g., Europe/London"/>
          </div>
          <div className="field"><label>Auto-lock after (minutes)</label>
            <input className="input" value={autoLockMin} onChange={e=>setAutoLockMin(e.target.value)} />
          </div>
          <div className="field"><label>Travel buffer (minutes)</label>
            <input className="input" value={travelBufferMin} onChange={e=>setTravelBufferMin(e.target.value)} />
          </div>
        </div>
        <div className="form-nav" style={{justifyContent:"flex-end"}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary ring" onClick={save}>Save</button>
        </div>
      </div>
    </div>
  );
}