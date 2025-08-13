import React from "react";

export default function MobileProfile({ name="Client", theme, privacy, onToggleTheme, onTogglePrivacy }) {
  const first=(String(name).split(" ")[0])||name;
  return (
    <div className="mobile-shell" style={{padding:16}}>
      <h3 className="h-with-rule" style={{marginTop:0}}>Profile</h3>
      <div className="card" style={{marginBottom:12}}>
        <div className="dec-title" style={{marginTop:0}}>Welcome, {first}</div>
        <div className="row-sub">Personal settings for your device.</div>
      </div>
      <button className="action" onClick={onToggleTheme}>
        <span className="a-emoji">🎨</span><span className="a-label">Theme</span>
        <span className="a-sub">{theme==="noir"?"Noir (dark)":"Ivory (light)"}</span><span className="a-arrow">›</span>
      </button>
      <button className="action" onClick={onTogglePrivacy} style={{marginTop:8}}>
        <span className="a-emoji">🫥</span><span className="a-label">Privacy</span>
        <span className="a-sub">{privacy==="hide"?"Sensitive hidden":"Sensitive visible"}</span><span className="a-arrow">›</span>
      </button>
    </div>
  );
}
