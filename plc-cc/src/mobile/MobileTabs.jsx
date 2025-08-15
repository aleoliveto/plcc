import React from "react";
/** badges: { home?:number, requests?:number, profile?:number } */
export default function MobileTabs({ active, onChange, badges = {} }) {
  const Item = ({ k, label, icon }) => (
    <button
      className={active===k ? "active" : ""}
      onClick={()=>onChange(k)}
      aria-label={label}
      aria-current={active===k ? "page" : undefined}
      title={label}
    >
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
      {!!badges[k] && <span className="tab-badge">{badges[k] > 99 ? "99+" : badges[k]}</span>}
    </button>
  );
  return (
    <nav className="tabbar">
      <Item k="home"     label="Home"     icon="⌂" />
      <Item k="requests" label="Requests" icon="🗂️" />
      <Item k="profile"  label="Profile"  icon="👤" />
    </nav>
  );
}
