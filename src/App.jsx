import { useState, useEffect, useRef, useCallback } from "react";

const FORM_URLS = {
  signOut:     "https://form.jotform.com/261553473034050",
  signIn:      "https://form.jotform.com/261554150654051",
  maintenance: "https://form.jotform.com/261553782081055",
};

const COMPANIES = ["All", "DSC Solutions", "Select Building Services", "Clean Energy"];
const TODAY = new Date();

function daysUntil(dateStr) {
  if (!dateStr || dateStr === "N/A") return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  return Math.ceil((d - TODAY) / (1000 * 60 * 60 * 24));
}
function statusColor(days) {
  if (days === null) return "#8b8b8b";
  if (days < 0)  return "#dc2626";
  if (days < 30) return "#ea580c";
  if (days < 90) return "#d97706";
  return "#16a34a";
}
function statusLabel(days) {
  if (days === null) return "Unknown";
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  return `Due in ${days}d`;
}
function fmtDateTime(str) {
  if (!str) return "—";
  const d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}
function timeAgo(str) {
  if (!str) return "";
  const diff = Date.now() - new Date(str);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}

function resolveVehicle(vehicleIdAnswer) {
  if (!vehicleIdAnswer) return { id: "—", name: "—" };
  const match = vehicleIdAnswer.match(/^([A-Z0-9]+)\s*[-–]\s*(.+)$/);
  if (match) return { id: match[1].trim(), name: match[2].trim() };
  const v = VEHICLES.find(x => x.id === vehicleIdAnswer.trim());
  return v ? { id: v.id, name: v.name } : { id: vehicleIdAnswer, name: vehicleIdAnswer };
}

const VEHICLES = [
  { id:"VAN01",   name:"2008 Chevy Floor Van",        make:"Chevrolet", model:"Express Van",       year:2008, vin:"1GCFG15XX81167876", plate:"ZDK0969", entity:"DSC Solutions",            purchasePrice:10500, milesPurchased:86308,  currentMiles:158383, inspection:"2021-05-31", registration:"2022-01-01", totalMaintCost:5771.81,  lastService:"Radiator & hoses, Oxygen sensor", color:"#1e3a5f",
    maintenance:[
      {date:"2016-04-01",miles:107505,work:"State Inspection, Emissions, Tire leak, Shocks",by:"Landis Garage",cost:702.69},
      {date:"2017-07-01",miles:119499,work:"State Inspection, Emissions, Oil Change",by:"Landis Garage",cost:167.52},
      {date:"2020-10-20",miles:158358,work:"Radiator & hoses, Oxygen sensor",by:"Landis Garage",cost:1058.79},
    ]},
  { id:"VAN02",   name:"2007 GMC 2500 Van",           make:"GMC",       model:"2500 Van",           year:2007, vin:"1GTGG25V271143904", plate:"ZHR5800", entity:"Select Building Services",  purchasePrice:0,      milesPurchased:95277,  currentMiles:150548, inspection:"2023-11-30", registration:null,         totalMaintCost:10387.89, lastService:"Oil change, 3 used tires",        color:"#1a3c2e",
    maintenance:[
      {date:"2022-10-01",miles:148301,work:"Brake repair front and back",by:"Landis Garage",cost:1272.95},
      {date:"2023-06-10",miles:150548,work:"3 used tires",by:"Robert Tire",cost:159.00},
    ]},
  { id:"TRAN01",  name:"2016 Ford Transit Connect",   make:"Ford",      model:"Transit Connect",    year:2016, vin:"NM0LS7E75G1263849", plate:"ZRK3488", entity:"DSC Solutions",            purchasePrice:9000,   milesPurchased:116000, currentMiles:158000, inspection:null,         registration:"2025-06-30", totalMaintCost:0,        lastService:"No records",                      color:"#2d1b69", maintenance:[]},
  { id:"TRAN02",  name:"2017 Ford Transit Connect",   make:"Ford",      model:"Transit Connect",    year:2017, vin:"NM0LS7E72H1337262", plate:"ZSK1167", entity:"Select Building Services",  purchasePrice:17000,  milesPurchased:79270,  currentMiles:89017,  inspection:"2022-02-28", registration:null,         totalMaintCost:5323.76,  lastService:"Oil Change, Tire Leak, Inspection",color:"#2d1b69",
    maintenance:[
      {date:"2021-11-01",miles:85432,work:"Transmission (with warranty)",by:"Landis Transmission",cost:4975.39},
      {date:"2022-01-15",miles:89017,work:"Oil Change, Tire Leak, Inspection",by:"Landis Garage",cost:230.31},
    ]},
  { id:"CADA01",  name:"2016 Cadillac Escalade",      make:"Cadillac",  model:"Escalade",           year:2016, vin:"1GYS4HKJ1GR426748", plate:"MFG4410", entity:"DSC Solutions",            purchasePrice:33000,  milesPurchased:78595,  currentMiles:116000, inspection:"2025-05-30", registration:"2024-07-30", totalMaintCost:144.78,   lastService:"Oil change",                      color:"#5c1a1a",
    maintenance:[{date:"2024-07-01",miles:116000,work:"Oil change",by:"Valvoline",cost:144.78}]},
  { id:"KIA01",   name:"2011 Kia Soul",               make:"Kia",       model:"Soul",               year:2011, vin:"KNDJT2A52CT376728", plate:"LTA5534", entity:"DSC Solutions",            purchasePrice:4000,   milesPurchased:125000, currentMiles:160000, inspection:"2025-05-30", registration:"2023-09-30", totalMaintCost:0,        lastService:"No records",                      color:"#7c3d00", maintenance:[]},
  { id:"VOLVO01", name:"2008 Volvo S40",              make:"Volvo",     model:"S40",                year:2008, vin:"YV1MZ382382367228", plate:"MGT4187", entity:"DSC Solutions",            purchasePrice:5600,   milesPurchased:121000, currentMiles:146262, inspection:"2024-07-30", registration:"2023-08-17", totalMaintCost:466.39,   lastService:"Sway bar links",                  color:"#1c4532",
    maintenance:[
      {date:"2024-07-10",miles:146360,work:"Inspection",by:"Robert Tire 2",cost:74.19},
      {date:"2024-07-11",miles:146372,work:"Sway bar links",by:"Rovert Tire 2",cost:392.20},
    ]},
  { id:"VOLVO02", name:"2008 Volvo XC90",             make:"Volvo",     model:"XC90",               year:2008, vin:"YV4CZ982281462026", plate:"MDE0638", entity:"DSC Solutions",            purchasePrice:5100,   milesPurchased:137138, currentMiles:157225, inspection:"2024-09-30", registration:"2024-04-30", totalMaintCost:556.86,   lastService:"Oil change, inspection, tires",   color:"#1c4532",
    maintenance:[{date:"2024-07-12",miles:159223,work:"Oil change, inspection, tires",by:"Rovert Tire 2",cost:556.86}]},
  { id:"BMW01",   name:"2019 BMW X7",                 make:"BMW",       model:"X7 5.0i",            year:2019, vin:"5UXCX4C58KLS35673", plate:"KSA4247", entity:"DSC Solutions",            purchasePrice:63048,  milesPurchased:50985,  currentMiles:62000,  inspection:"2024-05-30", registration:"2024-03-30", totalMaintCost:0,        lastService:"No records",                      color:"#0f172a", maintenance:[]},
  { id:"BMW02",   name:"2023 BMW M5",                 make:"BMW",       model:"M5",                 year:2023, vin:"WBS83CH02PCM44787",  plate:"MFC4636", entity:"DSC Solutions",            purchasePrice:157726, milesPurchased:0,      currentMiles:12000,  inspection:"2025-06-30", registration:"2025-05-30", totalMaintCost:0,        lastService:"No records",                      color:"#0f172a", maintenance:[]},
  { id:"RAV01",   name:"2011 Toyota RAV4",            make:"Toyota",    model:"RAV4",               year:2011, vin:"2T3RF4DV5BW135203", plate:"KXM3171", entity:"Select Building Services",  purchasePrice:14000,  milesPurchased:0,      currentMiles:75000,  inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records",                      color:"#2e4057", maintenance:[]},
  { id:"SUB01",   name:"Subaru Forester",             make:"Subaru",    model:"Forester",           year:2010, vin:"JF2SH6CCXAH800058", plate:"KPF6537", entity:"DSC Solutions",            purchasePrice:2000,   milesPurchased:0,      currentMiles:0,      inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records",                      color:"#2e4057", maintenance:[]},
  { id:"MAZDA01", name:"Mazda 3",                     make:"Mazda",     model:"3",                  year:2011, vin:"JM1BL1K58B1362735", plate:"LTD2190", entity:"DSC Solutions",            purchasePrice:2000,   milesPurchased:0,      currentMiles:0,      inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records",                      color:"#2e4057", maintenance:[]},
  { id:"TRLR01",  name:"Homestead Trailer",           make:"Trailer",   model:"Homestead",          year:2011, vin:"5HABE0811PN115778",  plate:"XPB9261", entity:"DSC Solutions",            purchasePrice:1000,   milesPurchased:0,      currentMiles:0,      inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records",                      color:"#4a4a4a", maintenance:[]},
];

function QRCode({ value, size = 180 }) {
  const ref = useRef(null);
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const run = () => {
      if (window.QRCode && ref.current) {
        ref.current.innerHTML = "";
        new window.QRCode(ref.current, { text: value, width: size, height: size, colorDark: "#000", colorLight: "#fff", correctLevel: window.QRCode.CorrectLevel.M });
        setOk(true);
      }
    };
    if (window.QRCode) { run(); return; }
    const existing = document.getElementById("qrscript");
    if (!existing) {
      const s = document.createElement("script");
      s.id = "qrscript";
      s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
      s.onload = run;
      document.head.appendChild(s);
    } else { existing.addEventListener("load", run); }
  }, [value, size]);
  return (
    <div>
      <div ref={ref} style={{ background: "#fff", display: "inline-block", padding: 8, borderRadius: 8 }} />
      {!ok && <div style={{ width: size, height: size, background: "#f0f0f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#888" }}>Loading…</div>}
    </div>
  );
}

function useActivity() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/activity");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const resolved = (json.activity || []).map(a => {
        const { id, name } = resolveVehicle(a.vehicleId);
        return { ...a, vehicleId: id, vehicleName: name };
      });
      setActivity(resolved);
      setFetchedAt(json.fetchedAt);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 120000); return () => clearInterval(t); }, [load]);
  return { activity, loading, error, fetchedAt, refresh: load };
}

const ACT_META = {
  "sign-out":  { icon: "🔑", label: "Sign Out",    bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  "sign-in":   { icon: "🏠", label: "Sign In",     bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  maintenance: { icon: "🔧", label: "Maintenance", bg: "#faf5ff", border: "#e9d5ff", text: "#7e22ce" },
};

function ActivityFeed({ onVehicleClick }) {
  const { activity, loading, error, fetchedAt, refresh } = useActivity();
  const [typeFilter, setTypeFilter] = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const filtered = activity.filter(a => typeFilter === "all" || a.type === typeFilter).filter(a => vehicleFilter === "all" || a.vehicleId === vehicleFilter);
  const vehicleIds = [...new Set(activity.map(a => a.vehicleId))].filter(id => id !== "—");
  const damageCount = activity.filter(a => a.damage).length;
  const warningCount = activity.filter(a => a.warningLights).length;
  const todayCount = activity.filter(a => new Date(a.datetime).toDateString() === new Date().toDateString()).length;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Events Today",   value: todayCount,      color: "#1d4ed8", bg: "#eff6ff" },
          { label: "Damage Reports", value: damageCount,     color: "#dc2626", bg: "#fef2f2" },
          { label: "Warning Lights", value: warningCount,    color: "#d97706", bg: "#fffbeb" },
          { label: "Total Logged",   value: activity.length, color: "#374151", bg: "#f9fafb" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 10, color: "#6b7280", marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {["all", "sign-out", "sign-in", "maintenance"].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: typeFilter === t ? "#374151" : "#e5e7eb", background: typeFilter === t ? "#111" : "#fff", color: typeFilter === t ? "#fff" : "#374151", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {t === "all" ? "All" : t === "sign-out" ? "🔑 Sign Outs" : t === "sign-in" ? "🏠 Sign Ins" : "🔧 Maintenance"}
          </button>
        ))}
        {vehicleIds.length > 0 && (
          <select value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid #e5e7eb", fontSize: 12, background: "#fff", cursor: "pointer" }}>
            <option value="all">All Vehicles</option>
            {vehicleIds.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        )}
        <button onClick={refresh} style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 20, border: "1px solid #e5e7eb", background: "#fff", fontSize: 12, cursor: "pointer", color: "#374151" }}>↻ Refresh</button>
      </div>
      {fetchedAt && <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 12 }}>Live data · Last fetched {fmtDateTime(fetchedAt)}</div>}
      {loading && <div style={{ textAlign: "center", padding: 48, color: "#6b7280" }}><div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div><div style={{ fontSize: 13 }}>Fetching submissions from Jotform…</div></div>}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 4 }}>Could not load activity</div>
          <div style={{ fontSize: 12, color: "#991b1b" }}>{error}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>Make sure JOTFORM_API_KEY is set in your Vercel environment variables.</div>
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: "center", color: "#9ca3af", padding: 48 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontSize: 13 }}>No submissions yet — forms are live and waiting for first scan.</div>
          <div style={{ fontSize: 12, marginTop: 8 }}><a href={FORM_URLS.signOut} target="_blank" rel="noreferrer" style={{ color: "#1d4ed8" }}>Test Sign Out form ↗</a></div>
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(a => <ActivityRow key={a.id} a={a} expanded={expanded === a.id} onToggle={() => setExpanded(expanded === a.id ? null : a.id)} onVehicleClick={onVehicleClick} />)}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ a, expanded, onToggle, onVehicleClick }) {
  const m = ACT_META[a.type] || ACT_META["sign-out"];
  const vehicle = VEHICLES.find(v => v.id === a.vehicleId);
  const flagged = a.damage || a.warningLights || a.flagImmediate;
  return (
    <div style={{ border: "1px solid", borderColor: flagged ? "#fca5a5" : "#e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", flexWrap: "wrap" }}>
        <span style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.text, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{m.icon} {m.label}</span>
        <button onClick={e => { e.stopPropagation(); if (vehicle) onVehicleClick(vehicle); }} style={{ background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 600, color: "#111", cursor: vehicle ? "pointer" : "default", textDecoration: vehicle ? "underline" : "none", textDecorationColor: "#d1d5db", textUnderlineOffset: 2 }}>{a.vehicleName || a.vehicleId}</button>
        {a.plate && a.plate !== "—" && <span style={{ fontSize: 12, color: "#6b7280" }}>{a.plate}</span>}
        {a.damage && <span style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>⚠ Damage</span>}
        {a.warningLights && <span style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#d97706", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>⚡ Warning</span>}
        {a.flagImmediate && <span style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>🚨 Immediate</span>}
        <div style={{ marginLeft: "auto", textAlign: "right", minWidth: 100 }}>
          <div style={{ fontSize: 11, color: "#6b7280" }}>{fmtDateTime(a.datetime)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>{a.operator}</div>
        </div>
        <span style={{ color: "#9ca3af", fontSize: 12 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      {expanded && (
        <div style={{ borderTop: "1px solid #f3f4f6", background: "#fafafa", padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            {a.type === "sign-out" && <><DField label="Odometer Out" value={a.odometerOut ? `${a.odometerOut.toLocaleString()} mi` : "—"} /><DField label="Destination" value={a.destination || "—"} /><DField label="Damage" value={a.damage ? "Yes" : "None reported"} ok={!a.damage} alert={a.damage} />{a.damage && <DField label="Damage Detail" value={a.damageDetail} alert />}<DField label="Warning Lights" value={a.warningLights ? (a.warningDetail || "Yes") : "None"} ok={!a.warningLights} alert={a.warningLights} />{a.comments && <DField label="Comments" value={a.comments} />}</>}
            {a.type === "sign-in" && <><DField label="Odometer In" value={a.odometerIn ? `${a.odometerIn.toLocaleString()} mi` : "—"} /><DField label="New Damage" value={a.damage ? "YES" : "None"} ok={!a.damage} alert={a.damage} />{a.damage && <DField label="Damage Detail" value={a.damageDetail} alert />}<DField label="Warning Lights" value={a.warningLights ? (a.warningDetail || "Yes") : "None"} ok={!a.warningLights} alert={a.warningLights} /><DField label="Interior" value={a.cleanlinessRating ? `${"★".repeat(a.cleanlinessRating)}${"☆".repeat(5 - a.cleanlinessRating)} (${a.cleanlinessRating}/5)` : "—"} /><DField label="Exterior" value={a.exteriorRating ? `${"★".repeat(a.exteriorRating)}${"☆".repeat(5 - a.exteriorRating)} (${a.exteriorRating}/5)` : "—"} />{a.refueled && <DField label="Fuel" value={a.fuelDetail || "Yes"} />}{a.comments && <DField label="Comments" value={a.comments} />}</>}
            {a.type === "maintenance" && <><DField label="Service Type" value={a.maintenanceType || "—"} /><DField label="Work Done" value={a.workDescription || "—"} /><DField label="Vendor" value={a.serviceVendor || "—"} /><DField label="Odometer" value={a.odometerAtService ? `${a.odometerAtService.toLocaleString()} mi` : "—"} /><DField label="Cost" value={a.cost != null ? `$${Number(a.cost).toFixed(2)}` : "—"} />{a.nextDueMiles && <DField label="Next Due (mi)" value={`${Number(a.nextDueMiles).toLocaleString()} mi`} />}{a.nextDueDate && <DField label="Next Due (date)" value={a.nextDueDate} />}{a.notes && <DField label="Notes" value={a.notes} />}<DField label="Immediate Flag" value={a.flagImmediate ? "YES — flagged" : "No"} alert={a.flagImmediate} ok={!a.flagImmediate} /></>}
          </div>
        </div>
      )}
    </div>
  );
}

function DField({ label, value, ok, alert }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: alert ? "#dc2626" : ok ? "#15803d" : "#111" }}>{value || "—"}</div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div style={{ background: "#f9fafb", borderRadius: 6, padding: "6px 10px" }}><div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{value}</div></div>;
}
function Badge({ label, days }) {
  return <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: days === null ? "#f3f4f6" : days < 0 ? "#fee2e2" : days < 30 ? "#ffedd5" : days < 90 ? "#fef9c3" : "#dcfce7", color: days === null ? "#6b7280" : days < 0 ? "#991b1b" : days < 30 ? "#9a3412" : days < 90 ? "#854d0e" : "#15803d" }}>{days === null ? "—" : days < 0 ? `${label}: Expired` : `${label}: ${days}d`}</span>;
}

function VehicleCard({ v, onClick }) {
  const iD = daysUntil(v.inspection), rD = daysUntil(v.registration);
  const urgent = d => d !== null && d < 30;
  const alertColor = (urgent(iD) || urgent(rD)) ? (iD < 0 || rD < 0 ? "#dc2626" : "#ea580c") : "#e5e7eb";
  return (
    <div onClick={() => onClick(v)} style={{ background: "#fff", border: `1.5px solid ${alertColor}`, borderRadius: 12, padding: 16, cursor: "pointer", transition: "box-shadow 0.15s,transform 0.15s", position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: v.color, borderRadius: "10px 10px 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 }}>
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 700, color: "#111", lineHeight: 1.3 }}>{v.name}</div><div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{v.plate} · {v.entity}</div></div>
        <div style={{ background: "#f3f4f6", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, color: "#374151", whiteSpace: "nowrap", marginLeft: 8 }}>{v.id}</div>
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Stat label="Odometer" value={v.currentMiles > 0 ? `${v.currentMiles.toLocaleString()} mi` : "—"} />
        <Stat label="Maint. Cost" value={v.totalMaintCost > 0 ? `$${v.totalMaintCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "$0"} />
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}><Badge label="Insp" days={iD} /><Badge label="Reg" days={rD} /></div>
      <div style={{ marginTop: 10, fontSize: 10, color: "#9ca3af", borderTop: "1px solid #f3f4f6", paddingTop: 8 }}>Last: {v.lastService}</div>
    </div>
  );
}

function AlertBanner({ vehicles }) {
  const alerts = [];
  vehicles.forEach(v => {
    const iD = daysUntil(v.inspection), rD = daysUntil(v.registration);
    if (iD !== null && iD < 60) alerts.push({ vehicle: v.name, type: "Inspection", days: iD });
    if (rD !== null && rD < 60) alerts.push({ vehicle: v.name, type: "Registration", days: rD });
  });
  if (!alerts.length) return null;
  return (
    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: "#9a3412", marginBottom: 6 }}>⚠️ {alerts.length} Upcoming Deadline{alerts.length > 1 ? "s" : ""}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {alerts.map((a, i) => <span key={i} style={{ background: a.days < 0 ? "#fee2e2" : "#ffedd5", color: a.days < 0 ? "#991b1b" : "#9a3412", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 500 }}>{a.vehicle} — {a.type}: {a.days < 0 ? `${Math.abs(a.days)}d overdue` : `${a.days}d`}</span>)}
      </div>
    </div>
  );
}

function InfoField({ label, value, mono }) {
  return <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 12px" }}><div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#111", fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-all" }}>{value || "—"}</div></div>;
}
function ComplianceCard({ label, date, days }) {
  const color = statusColor(days);
  const bg = days === null ? "#f9fafb" : days < 0 ? "#fef2f2" : days < 30 ? "#fff7ed" : days < 90 ? "#fefce8" : "#f0fdf4";
  return <div style={{ background: bg, borderRadius: 10, padding: "12px 14px", borderLeft: `4px solid ${color}` }}><div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div><div style={{ fontSize: 13, fontWeight: 700, color }}>{statusLabel(days)}</div><div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{date || "No date on file"}</div></div>;
}

function VehicleDetail({ v, onClose }) {
  const [tab, setTab] = useState("info");
  const iD = daysUntil(v.inspection), rD = daysUntil(v.registration);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 20, paddingBottom: 20, overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720, margin: "0 16px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ background: v.color, borderRadius: "16px 16px 0 0", padding: "20px 24px", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" }}>{v.id} · {v.entity}</div>
          <div style={{ color: "#fff", fontSize: 22, fontWeight: 700, marginTop: 4 }}>{v.name}</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 }}>VIN: {v.vin} · Plate: {v.plate}</div>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", padding: "0 24px" }}>
          {[["info","Vehicle Info"],["maintenance","Maintenance"],["qr","QR Codes"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", padding: "14px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: tab === t ? "#111" : "#6b7280", borderBottom: tab === t ? "2px solid #111" : "2px solid transparent" }}>{label}</button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {tab === "info" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                <InfoField label="Make / Model" value={`${v.make} ${v.model}`} /><InfoField label="Year" value={v.year} />
                <InfoField label="VIN Number" value={v.vin} mono /><InfoField label="License Plate" value={v.plate} />
                <InfoField label="Entity" value={v.entity} /><InfoField label="Purchase Price" value={v.purchasePrice > 0 ? `$${v.purchasePrice.toLocaleString()}` : "—"} />
                <InfoField label="Miles at Purchase" value={v.milesPurchased > 0 ? `${v.milesPurchased.toLocaleString()} mi` : "—"} /><InfoField label="Current Mileage" value={v.currentMiles > 0 ? `${v.currentMiles.toLocaleString()} mi` : "—"} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 10 }}>Compliance</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <ComplianceCard label="State Inspection" date={v.inspection} days={iD} />
                  <ComplianceCard label="Registration" date={v.registration} days={rD} />
                </div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#111", marginBottom: 8 }}>Total Maintenance Cost</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: v.color }}>${v.totalMaintCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{v.maintenance.length} historical service record{v.maintenance.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
          )}
          {tab === "maintenance" && (
            <div>
              {v.maintenance.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", padding: 40 }}><div style={{ fontSize: 32, marginBottom: 8 }}>🔧</div><div style={{ fontSize: 13 }}>No historical records. New records submitted via QR form will appear in the Activity feed.</div></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...v.maintenance].reverse().map((m, i) => (
                    <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{m.work}</div><div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{m.by} · {m.date} · {m.miles > 0 ? `${m.miles.toLocaleString()} mi` : "—"}</div></div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", marginLeft: 12 }}>{m.cost > 0 ? `$${m.cost.toFixed(2)}` : "—"}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ background: "#f9fafb", borderRadius: 10, padding: "10px 16px", textAlign: "right" }}>
                    <span style={{ fontSize: 12, color: "#6b7280" }}>Total: </span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>${v.totalMaintCost.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "qr" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Print all three QR codes and post them inside <strong>{v.name}</strong>.</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16 }}>
                {[
                  { label: "Sign Out",    url: `${FORM_URLS.signOut}?vehicleID=${v.id}`,     icon: "🔑", bg: "#eff6ff", color: "#1d4ed8" },
                  { label: "Sign In",     url: `${FORM_URLS.signIn}?vehicleID=${v.id}`,      icon: "🏠", bg: "#f0fdf4", color: "#15803d" },
                  { label: "Maintenance", url: `${FORM_URLS.maintenance}?vehicleID=${v.id}`, icon: "🔧", bg: "#faf5ff", color: "#7e22ce" },
                ].map(({ label, url, icon, bg, color }) => (
                  <div key={label} style={{ background: bg, borderRadius: 12, padding: 16, textAlign: "center", border: `1px solid ${color}22` }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 12 }}>{icon} {label}</div>
                    <QRCode value={url} size={140} />
                    <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 10 }}>{v.id} · {v.plate}</div>
                    <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: 8, fontSize: 11, color, textDecoration: "none", fontWeight: 600 }}>Open form ↗</a>
                  </div>
                ))}
              </div>
              <div style={{ background: "#f9fafb", borderRadius: 10, padding: 14, textAlign: "center" }}>
                <button onClick={() => window.print()} style={{ padding: "8px 24px", background: "#111", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🖨️ Print all three QR codes</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [mainTab, setMainTab] = useState("fleet");
  const [company, setCompany] = useState("All");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const { activity } = useActivity();
  const alertCount = activity.filter(a => a.damage || a.warningLights || a.flagImmediate).length;
  const filtered = VEHICLES
    .filter(v => company === "All" || v.entity === company)
    .filter(v => { const q = search.toLowerCase(); return !q || v.name.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q) || v.id.toLowerCase().includes(q) || v.vin.toLowerCase().includes(q); })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "urgent") { const uA = Math.min(daysUntil(a.inspection) ?? 9999, daysUntil(a.registration) ?? 9999); const uB = Math.min(daysUntil(b.inspection) ?? 9999, daysUntil(b.registration) ?? 9999); return uA - uB; }
      if (sortBy === "cost") return b.totalMaintCost - a.totalMaintCost;
      if (sortBy === "miles") return b.currentMiles - a.currentMiles;
      return 0;
    });
  const totalCost = VEHICLES.reduce((s, v) => s + v.totalMaintCost, 0);
  const expiredCount = VEHICLES.filter(v => { const iD = daysUntil(v.inspection), rD = daysUntil(v.registration); return (iD !== null && iD < 0) || (rD !== null && rD < 0); }).length;
  const dueSoonCount = VEHICLES.filter(v => { const iD = daysUntil(v.inspection), rD = daysUntil(v.registration); return ((iD !== null && iD >= 0 && iD < 60) || (rD !== null && rD >= 0 && rD < 60)); }).length;
  return (
    <div style={{ fontFamily: "'Segoe UI',system-ui,sans-serif", background: "#f8fafc", minHeight: "100vh", padding: "20px 16px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.5px" }}>🚗 DSC Fleet Dashboard</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>DSC Solutions · Select Building Services · Clean Energy</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Total Vehicles",    value: VEHICLES.length, color: "#0f172a", bg: "#f9fafb" },
            { label: "Total Maint. Cost", value: `$${totalCost.toLocaleString("en-US", { maximumFractionDigits: 0 })}`, color: "#1e40af", bg: "#eff6ff" },
            { label: "Expired/Overdue",   value: expiredCount,    color: "#dc2626", bg: "#fef2f2" },
            { label: "Due Within 60d",    value: dueSoonCount,    color: "#d97706", bg: "#fffbeb" },
            { label: "Live Alerts",       value: alertCount,      color: "#7e22ce", bg: "#faf5ff" },
          ].map((s, i) => (
            <div key={i} style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
        <AlertBanner vehicles={VEHICLES} />
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
          {[["fleet","🚙 Fleet"],["activity","📋 Activity"]].map(([t, label]) => (
            <button key={t} onClick={() => setMainTab(t)} style={{ background: "none", border: "none", padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", color: mainTab === t ? "#111" : "#6b7280", borderBottom: mainTab === t ? "3px solid #111" : "3px solid transparent", position: "relative" }}>
              {label}
              {t === "activity" && alertCount > 0 && <span style={{ position: "absolute", top: 8, right: 4, background: "#dc2626", color: "#fff", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{alertCount}</span>}
            </button>
          ))}
        </div>
        {mainTab === "fleet" && (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input placeholder="Search by name, plate, VIN, ID…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: "1 1 200px", padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, outline: "none", background: "#fff" }} />
              <select value={company} onChange={e => setCompany(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff", cursor: "pointer" }}>{COMPANIES.map(c => <option key={c}>{c}</option>)}</select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, background: "#fff", cursor: "pointer" }}>
                <option value="name">Sort: Name</option><option value="urgent">Sort: Most Urgent</option><option value="cost">Sort: Highest Cost</option><option value="miles">Sort: Highest Miles</option>
              </select>
              <div style={{ fontSize: 12, color: "#9ca3af" }}>{filtered.length} vehicle{filtered.length !== 1 ? "s" : ""}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
              {filtered.map(v => <VehicleCard key={v.id} v={v} onClick={setSelected} />)}
            </div>
            {filtered.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: 60, fontSize: 14 }}>No vehicles match your search.</div>}
          </>
        )}
        {mainTab === "activity" && <ActivityFeed onVehicleClick={v => setSelected(v)} />}
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 11, color: "#cbd5e1" }}>DSC Fleet Dashboard · Live data from Jotform · Click any vehicle for details & QR codes</div>
      </div>
      {selected && <VehicleDetail v={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
