import React, { useState, useRef, useEffect } from "react";

export default function MobileChat({ name="Concierge", messages=[], onSend, onBack }) {
  const [text,setText]=useState("");
  const logRef = useRef(null);
  useEffect(()=>{ logRef.current?.scrollTo(0, logRef.current.scrollHeight); },[messages]);
  const send = () => { if(!text.trim()) return; onSend?.(text.trim()); setText(""); };

  return (
    <div className="chat-view">
      <header className="mobile-header" style={{borderRadius:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button className="btn btn-ghost ring" onClick={onBack}>‹ Back</button>
          <div className="mh-greeting">Chat with {name}</div>
          <div style={{width:56}} />
        </div>
      </header>

      <div className="chat-log" ref={logRef}>
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
        <input className="chat-input" placeholder="Message concierge…" value={text}
               onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} />
        <button className="chat-send btn btn-primary ring" onClick={send}>Send</button>
      </div>
    </div>
  );
}
