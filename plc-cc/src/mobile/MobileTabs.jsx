import React from "react";

export default function MobileTabs({ active, onChange }) {
  const Item = ({ k, label, icon }) => (
    <button className={active===k ? "active" : ""} onClick={()=>onChange(k)} aria-label={label}>
      <span className="icon">{icon}</span>
      <span className="label">{label}</span>
    </button>
  );
  return (
    <nav className="tabbar">
      <Item k="home" label="Home" icon="⌂" />
      <Item k="requests" label="Requests" icon="🗂️" />
      <Item k="profile" label="Profile" icon="👤" />
    </nav>
  );
}
