import { useState, useEffect, useRef, useCallback } from "react";

const FORM_URLS = {
  signOut:     "https://form.jotform.com/261553473034050",
  signIn:      "https://form.jotform.com/261554150654051",
  maintenance: "https://form.jotform.com/261553782081055",
};

const COMPANIES = ["All", "DSC Solutions", "Select Building Services", "Clean Energy"];
const ENTITIES  = ["DSC Solutions", "Select Building Services", "Clean Energy"];
const TODAY = new Date();

// ── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY  = "dsc_fleet_vehicles_v1";
const PHOTOS_KEY   = "dsc_fleet_photos_v1";
const DOCS_KEY     = "dsc_fleet_docs_v1";

function loadVehicles() {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return null;
}
function saveVehicles(v) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch (_) {}
}
function loadPhotos() {
  try { const r = localStorage.getItem(PHOTOS_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return {};
}
function savePhotos(p) {
  try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(p)); } catch (_) {}
}
function loadDocs() {
  try { const r = localStorage.getItem(DOCS_KEY); if (r) return JSON.parse(r); } catch (_) {}
  return {};
}
function saveDocs(d) {
  try { localStorage.setItem(DOCS_KEY, JSON.stringify(d)); } catch (_) {}
}

const DOC_TYPES = ["Insurance Card", "Registration", "Inspection Certificate", "Other"];
const DOC_ICONS = { "Insurance Card":"🛡️", "Registration":"📋", "Inspection Certificate":"✅", "Other":"📄" };

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
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
function resolveVehicle(ans, vehicles) {
  if (!ans) return { id: "—", name: "—" };
  const m = ans.match(/^([A-Z0-9]+)\s*[-–]\s*(.+)$/);
  if (m) return { id: m[1].trim(), name: m[2].trim() };
  const v = vehicles.find(x => x.id === ans.trim());
  return v ? { id: v.id, name: v.name } : { id: ans, name: ans };
}
function genId() { return "V" + Math.random().toString(36).substr(2, 5).toUpperCase(); }

function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Default vehicles ─────────────────────────────────────────────────────────
const DEFAULT_VEHICLES = [
  { id:"VAN01",   name:"2008 Chevy Floor Van",       make:"Chevrolet",model:"Express Van",    year:2008, vin:"1GCFG15XX81167876", plate:"ZDK0969", entity:"DSC Solutions",           purchasePrice:10500, milesPurchased:86308,  currentMiles:158383, inspection:"2021-05-31", registration:"2022-01-01", totalMaintCost:5771.81,  lastService:"Radiator & hoses, Oxygen sensor", color:"#1e3a5f", reminders:[],
    maintenance:[{date:"2020-10-20",miles:158358,work:"Radiator & hoses, Oxygen sensor",by:"Landis Garage",cost:1058.79}]},
  { id:"VAN02",   name:"2007 GMC 2500 Van",          make:"GMC",      model:"2500 Van",        year:2007, vin:"1GTGG25V271143904", plate:"ZHR5800", entity:"Select Building Services", purchasePrice:0,      milesPurchased:95277,  currentMiles:150548, inspection:"2023-11-30", registration:null,         totalMaintCost:10387.89, lastService:"Oil change, 3 used tires",        color:"#1a3c2e", reminders:[],
    maintenance:[{date:"2023-06-10",miles:150548,work:"3 used tires",by:"Robert Tire",cost:159.00}]},
  { id:"TRAN01",  name:"2016 Ford Transit Connect",  make:"Ford",     model:"Transit Connect", year:2016, vin:"NM0LS7E75G1263849", plate:"ZRK3488", entity:"DSC Solutions",           purchasePrice:9000,   milesPurchased:116000, currentMiles:158000, inspection:null,         registration:"2025-06-30", totalMaintCost:0,        lastService:"No records", color:"#2d1b69", reminders:[], maintenance:[]},
  { id:"TRAN02",  name:"2017 Ford Transit Connect",  make:"Ford",     model:"Transit Connect", year:2017, vin:"NM0LS7E72H1337262", plate:"ZSK1167", entity:"Select Building Services", purchasePrice:17000,  milesPurchased:79270,  currentMiles:89017,  inspection:"2022-02-28", registration:null,         totalMaintCost:5323.76,  lastService:"Oil Change, Tire Leak, Inspection", color:"#2d1b69", reminders:[],
    maintenance:[{date:"2022-01-15",miles:89017,work:"Oil Change, Tire Leak, Inspection",by:"Landis Garage",cost:230.31}]},
  { id:"CADA01",  name:"2016 Cadillac Escalade",     make:"Cadillac", model:"Escalade",        year:2016, vin:"1GYS4HKJ1GR426748", plate:"MFG4410", entity:"DSC Solutions",           purchasePrice:33000,  milesPurchased:78595,  currentMiles:116000, inspection:"2025-05-30", registration:"2024-07-30", totalMaintCost:144.78,   lastService:"Oil change", color:"#5c1a1a", reminders:[],
    maintenance:[{date:"2024-07-01",miles:116000,work:"Oil change",by:"Valvoline",cost:144.78}]},
  { id:"KIA01",   name:"2011 Kia Soul",              make:"Kia",      model:"Soul",            year:2011, vin:"KNDJT2A52CT376728", plate:"LTA5534", entity:"DSC Solutions",           purchasePrice:4000,   milesPurchased:125000, currentMiles:160000, inspection:"2025-05-30", registration:"2023-09-30", totalMaintCost:0,        lastService:"No records", color:"#7c3d00", reminders:[], maintenance:[]},
  { id:"VOLVO01", name:"2008 Volvo S40",             make:"Volvo",    model:"S40",             year:2008, vin:"YV1MZ382382367228", plate:"MGT4187", entity:"DSC Solutions",           purchasePrice:5600,   milesPurchased:121000, currentMiles:146262, inspection:"2024-07-30", registration:"2023-08-17", totalMaintCost:466.39,   lastService:"Sway bar links", color:"#1c4532", reminders:[],
    maintenance:[{date:"2024-07-11",miles:146372,work:"Sway bar links",by:"Rovert Tire 2",cost:392.20}]},
  { id:"VOLVO02", name:"2008 Volvo XC90",            make:"Volvo",    model:"XC90",            year:2008, vin:"YV4CZ982281462026", plate:"MDE0638", entity:"DSC Solutions",           purchasePrice:5100,   milesPurchased:137138, currentMiles:157225, inspection:"2024-09-30", registration:"2024-04-30", totalMaintCost:556.86,   lastService:"Oil change, inspection, tires", color:"#1c4532", reminders:[],
    maintenance:[{date:"2024-07-12",miles:159223,work:"Oil change, inspection, tires",by:"Rovert Tire 2",cost:556.86}]},
  { id:"BMW01",   name:"2019 BMW X7",                make:"BMW",      model:"X7 5.0i",         year:2019, vin:"5UXCX4C58KLS35673", plate:"KSA4247", entity:"DSC Solutions",           purchasePrice:63048,  milesPurchased:50985,  currentMiles:62000,  inspection:"2024-05-30", registration:"2024-03-30", totalMaintCost:0,        lastService:"No records", color:"#0f172a", reminders:[], maintenance:[]},
  { id:"BMW02",   name:"2023 BMW M5",                make:"BMW",      model:"M5",              year:2023, vin:"WBS83CH02PCM44787",  plate:"MFC4636", entity:"DSC Solutions",           purchasePrice:157726, milesPurchased:0,      currentMiles:12000,  inspection:"2025-06-30", registration:"2025-05-30", totalMaintCost:0,        lastService:"No records", color:"#0f172a", reminders:[], maintenance:[]},
  { id:"RAV01",   name:"2011 Toyota RAV4",           make:"Toyota",   model:"RAV4",            year:2011, vin:"2T3RF4DV5BW135203", plate:"KXM3171", entity:"Select Building Services", purchasePrice:14000,  milesPurchased:0,      currentMiles:75000,  inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records", color:"#2e4057", reminders:[], maintenance:[]},
  { id:"SUB01",   name:"Subaru Forester",            make:"Subaru",   model:"Forester",        year:2010, vin:"JF2SH6CCXAH800058", plate:"KPF6537", entity:"DSC Solutions",           purchasePrice:2000,   milesPurchased:0,      currentMiles:0,      inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records", color:"#2e4057", reminders:[], maintenance:[]},
  { id:"MAZDA01", name:"Mazda 3",                    make:"Mazda",    model:"3",               year:2011, vin:"JM1BL1K58B1362735", plate:"LTD2190", entity:"DSC Solutions",           purchasePrice:2000,   milesPurchased:0,      currentMiles:0,      inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records", color:"#2e4057", reminders:[], maintenance:[]},
  { id:"TRLR01",  name:"Homestead Trailer",          make:"Trailer",  model:"Homestead",       year:2011, vin:"5HABE0811PN115778",  plate:"XPB9261", entity:"DSC Solutions",           purchasePrice:1000,   milesPurchased:0,      currentMiles:0,      inspection:null,         registration:null,         totalMaintCost:0,        lastService:"No records", color:"#4a4a4a", reminders:[], maintenance:[]},
];

// ── QR Code ──────────────────────────────────────────────────────────────────
function QRCode({ value, size = 160 }) {
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
    const ex = document.getElementById("qrscript");
    if (!ex) {
      const s = document.createElement("script");
      s.id = "qrscript";
      s.src = "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js";
      s.onload = run;
      document.head.appendChild(s);
    } else ex.addEventListener("load", run);
  }, [value, size]);
  return (
    <div>
      <div ref={ref} style={{ background: "#fff", display: "inline-block", padding: 6, borderRadius: 8 }} />
      {!ok && <div style={{ width: size, height: size, background: "#f0f0f0", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#888" }}>Loading…</div>}
    </div>
  );
}

// ── useActivity ──────────────────────────────────────────────────────────────
function useActivity(vehicles) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/activity");
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const resolved = (json.activity || []).map(a => {
        const { id, name } = resolveVehicle(a.vehicleId, vehicles);
        return { ...a, vehicleId: id, vehicleName: name };
      });
      setActivity(resolved);
      setFetchedAt(json.fetchedAt);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [vehicles]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 120000); return () => clearInterval(t); }, [load]);
  return { activity, loading, error, fetchedAt, refresh: load };
}

const ACT_META = {
  "sign-out":  { icon: "🔑", label: "Sign Out",    bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" },
  "sign-in":   { icon: "🏠", label: "Sign In",     bg: "#f0fdf4", border: "#bbf7d0", text: "#15803d" },
  maintenance: { icon: "🔧", label: "Maintenance", bg: "#faf5ff", border: "#e9d5ff", text: "#7e22ce" },
};

function DField({ label, value, ok, alert }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: alert ? "#dc2626" : ok ? "#15803d" : "#111" }}>{value || "—"}</div>
    </div>
  );
}

function ActivityRow({ a, expanded, onToggle, onVehicleClick }) {
  const m = ACT_META[a.type] || ACT_META["sign-out"];
  const flagged = a.damage || a.warningLights || a.flagImmediate;
  return (
    <div style={{ border: "1px solid", borderColor: flagged ? "#fca5a5" : "#e5e7eb", borderRadius: 10, overflow: "hidden", background: "#fff" }}>
      <div onClick={onToggle} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer", flexWrap: "wrap" }}>
        <span style={{ background: m.bg, border: `1px solid ${m.border}`, color: m.text, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{m.icon} {m.label}</span>
        {onVehicleClick
          ? <button onClick={e => { e.stopPropagation(); onVehicleClick(); }} style={{ background: "none", border: "none", padding: 0, fontSize: 13, fontWeight: 600, color: "#111", cursor: "pointer", textDecoration: "underline", textDecorationColor: "#d1d5db", textUnderlineOffset: 2 }}>{a.vehicleName || a.vehicleId}</button>
          : <span style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{a.vehicleName || a.vehicleId}</span>
        }
        {a.plate && a.plate !== "—" && <span style={{ fontSize: 12, color: "#6b7280" }}>{a.plate}</span>}
        {a.damage        && <span style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>⚠ Damage</span>}
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
            {a.type === "sign-out" && <><DField label="Odometer Out" value={a.odometerOut ? `${Number(a.odometerOut).toLocaleString()} mi` : "—"} /><DField label="Destination" value={a.destination||"—"} /><DField label="Damage" value={a.damage?"Yes":"None"} ok={!a.damage} alert={a.damage} />{a.damage&&<DField label="Damage Detail" value={a.damageDetail} alert />}<DField label="Warning Lights" value={a.warningLights?(a.warningDetail||"Yes"):"None"} ok={!a.warningLights} alert={a.warningLights} />{a.comments&&<DField label="Comments" value={a.comments} />}</>}
            {a.type === "sign-in"  && <><DField label="Odometer In" value={a.odometerIn?`${Number(a.odometerIn).toLocaleString()} mi`:"—"} /><DField label="New Damage" value={a.damage?"YES":"None"} ok={!a.damage} alert={a.damage} />{a.damage&&<DField label="Damage Detail" value={a.damageDetail} alert />}<DField label="Warning Lights" value={a.warningLights?(a.warningDetail||"Yes"):"None"} ok={!a.warningLights} alert={a.warningLights} /><DField label="Interior" value={a.cleanlinessRating?`${"★".repeat(a.cleanlinessRating)}${"☆".repeat(5-a.cleanlinessRating)} (${a.cleanlinessRating}/5)`:"—"} />{a.refueled&&<DField label="Fuel" value={a.fuelDetail||"Yes"} />}{a.comments&&<DField label="Comments" value={a.comments} />}</>}
            {a.type === "maintenance" && <><DField label="Service Type" value={a.maintenanceType||"—"} /><DField label="Work Done" value={a.workDescription||"—"} /><DField label="Vendor" value={a.serviceVendor||"—"} /><DField label="Odometer" value={a.odometerAtService?`${Number(a.odometerAtService).toLocaleString()} mi`:"—"} /><DField label="Cost" value={a.cost!=null?`$${Number(a.cost).toFixed(2)}`:"—"} />{a.nextDueMiles&&<DField label="Next Due (mi)" value={`${Number(a.nextDueMiles).toLocaleString()} mi`} />}{a.nextDueDate&&<DField label="Next Due (date)" value={a.nextDueDate} />}{a.notes&&<DField label="Notes" value={a.notes} />}<DField label="Immediate Flag" value={a.flagImmediate?"YES":"No"} alert={a.flagImmediate} ok={!a.flagImmediate} /></>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Activity Feed (main tab) ─────────────────────────────────────────────────
function ActivityFeed({ activity, loading, error, fetchedAt, refresh, onVehicleClick }) {
  const [typeFilter, setTypeFilter]       = useState("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [expanded, setExpanded]           = useState(null);
  const filtered   = activity.filter(a => typeFilter==="all"||a.type===typeFilter).filter(a => vehicleFilter==="all"||a.vehicleId===vehicleFilter);
  const vehicleIds = [...new Set(activity.map(a=>a.vehicleId))].filter(id=>id!=="—");
  const damageCount  = activity.filter(a=>a.damage).length;
  const warningCount = activity.filter(a=>a.warningLights).length;
  const todayCount   = activity.filter(a=>new Date(a.datetime).toDateString()===new Date().toDateString()).length;
  return (
    <div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18 }}>
        {[{label:"Events Today",value:todayCount,color:"#1d4ed8",bg:"#eff6ff"},{label:"Damage Reports",value:damageCount,color:"#dc2626",bg:"#fef2f2"},{label:"Warning Lights",value:warningCount,color:"#d97706",bg:"#fffbeb"},{label:"Total Logged",value:activity.length,color:"#374151",bg:"#f9fafb"}].map((s,i)=>(
          <div key={i} style={{ background:s.bg,borderRadius:10,padding:"12px 14px" }}>
            <div style={{ fontSize:10,color:"#6b7280",marginBottom:3 }}>{s.label}</div>
            <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center" }}>
        {["all","sign-out","sign-in","maintenance"].map(t=>(
          <button key={t} onClick={()=>setTypeFilter(t)} style={{ padding:"6px 14px",borderRadius:20,border:"1px solid",borderColor:typeFilter===t?"#374151":"#e5e7eb",background:typeFilter===t?"#111":"#fff",color:typeFilter===t?"#fff":"#374151",fontSize:12,fontWeight:600,cursor:"pointer" }}>
            {t==="all"?"All":t==="sign-out"?"🔑 Sign Outs":t==="sign-in"?"🏠 Sign Ins":"🔧 Maintenance"}
          </button>
        ))}
        {vehicleIds.length>0&&<select value={vehicleFilter} onChange={e=>setVehicleFilter(e.target.value)} style={{ padding:"6px 12px",borderRadius:20,border:"1px solid #e5e7eb",fontSize:12,background:"#fff",cursor:"pointer" }}><option value="all">All Vehicles</option>{vehicleIds.map(id=><option key={id} value={id}>{id}</option>)}</select>}
        <button onClick={refresh} style={{ marginLeft:"auto",padding:"6px 12px",borderRadius:20,border:"1px solid #e5e7eb",background:"#fff",fontSize:12,cursor:"pointer",color:"#374151" }}>↻ Refresh</button>
      </div>
      {fetchedAt&&<div style={{ fontSize:11,color:"#9ca3af",marginBottom:12 }}>Live data · Last fetched {fmtDateTime(fetchedAt)}</div>}
      {loading&&<div style={{ textAlign:"center",padding:48,color:"#6b7280" }}><div style={{ fontSize:28,marginBottom:8 }}>⏳</div><div style={{ fontSize:13 }}>Fetching from Jotform…</div></div>}
      {error&&<div style={{ background:"#fef2f2",border:"1px solid #fca5a5",borderRadius:10,padding:16,marginBottom:16 }}><div style={{ fontWeight:700,color:"#dc2626",marginBottom:4 }}>Could not load activity</div><div style={{ fontSize:12,color:"#991b1b" }}>{error}</div><div style={{ fontSize:11,color:"#9ca3af",marginTop:8 }}>Check JOTFORM_API_KEY in Vercel environment variables.</div></div>}
      {!loading&&!error&&filtered.length===0&&<div style={{ textAlign:"center",color:"#9ca3af",padding:48 }}><div style={{ fontSize:32,marginBottom:8 }}>📋</div><div style={{ fontSize:13 }}>No submissions yet — forms are live and waiting for first scan.</div></div>}
      {!loading&&filtered.length>0&&<div style={{ display:"flex",flexDirection:"column",gap:8 }}>{filtered.map(a=><ActivityRow key={a.id} a={a} expanded={expanded===a.id} onToggle={()=>setExpanded(expanded===a.id?null:a.id)} onVehicleClick={onVehicleClick?()=>onVehicleClick(a.vehicleId):null} />)}</div>}
    </div>
  );
}

// ── Fleet helpers ─────────────────────────────────────────────────────────────
function Stat({ label, value }) {
  return <div style={{ background:"#f9fafb",borderRadius:6,padding:"6px 10px" }}><div style={{ fontSize:10,color:"#9ca3af",marginBottom:2 }}>{label}</div><div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{value}</div></div>;
}
function Badge({ label, days }) {
  return <span style={{ fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:20,background:days===null?"#f3f4f6":days<0?"#fee2e2":days<30?"#ffedd5":days<90?"#fef9c3":"#dcfce7",color:days===null?"#6b7280":days<0?"#991b1b":days<30?"#9a3412":days<90?"#854d0e":"#15803d" }}>{days===null?"—":days<0?`${label}: Expired`:`${label}: ${days}d`}</span>;
}

function VehicleCard({ v, photo, onClick }) {
  const iD = daysUntil(v.inspection), rD = daysUntil(v.registration);
  const urgent = d => d!==null&&d<30;
  const alertColor = (urgent(iD)||urgent(rD)) ? (iD<0||rD<0?"#dc2626":"#ea580c") : "#e5e7eb";
  return (
    <div onClick={()=>onClick(v)} style={{ background:"#fff",border:`1.5px solid ${alertColor}`,borderRadius:12,cursor:"pointer",transition:"box-shadow 0.15s,transform 0.15s",position:"relative",overflow:"hidden" }}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.12)";e.currentTarget.style.transform="translateY(-2px)"}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.transform="translateY(0)"}}>
      {/* Photo or color bar */}
      {photo
        ? <div style={{ height:120,overflow:"hidden",borderRadius:"10px 10px 0 0" }}><img src={photo} alt={v.name} style={{ width:"100%",height:"100%",objectFit:"cover" }} /></div>
        : <div style={{ height:6,background:v.color,borderRadius:"10px 10px 0 0" }} />
      }
      <div style={{ padding:"12px 14px" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
          <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:700,color:"#111",lineHeight:1.3 }}>{v.name}</div><div style={{ fontSize:11,color:"#6b7280",marginTop:2 }}>{v.plate} · {v.entity}</div></div>
          <div style={{ background:"#f3f4f6",borderRadius:6,padding:"3px 8px",fontSize:10,fontWeight:600,color:"#374151",whiteSpace:"nowrap",marginLeft:8 }}>{v.id}</div>
        </div>
        <div style={{ marginTop:10,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
          <Stat label="Odometer" value={v.currentMiles>0?`${v.currentMiles.toLocaleString()} mi`:"—"} />
          <Stat label="Maint. Cost" value={v.totalMaintCost>0?`$${v.totalMaintCost.toLocaleString("en-US",{maximumFractionDigits:0})}`:"$0"} />
        </div>
        <div style={{ marginTop:8,display:"flex",gap:6,flexWrap:"wrap" }}><Badge label="Insp" days={iD} /><Badge label="Reg" days={rD} /></div>
        {(v.reminders||[]).filter(r=>{ const d=daysUntil(r.dueDate); return d!==null&&d<30; }).map((r,i)=>(
          <div key={i} style={{ marginTop:5,fontSize:10,color:"#d97706",fontWeight:600 }}>⏰ {r.label}: {daysUntil(r.dueDate)<0?`${Math.abs(daysUntil(r.dueDate))}d overdue`:`${daysUntil(r.dueDate)}d`}</div>
        ))}
        <div style={{ marginTop:8,fontSize:10,color:"#9ca3af",borderTop:"1px solid #f3f4f6",paddingTop:8 }}>Last: {v.lastService}</div>
      </div>
    </div>
  );
}

function AlertBanner({ vehicles }) {
  const alerts = [];
  vehicles.forEach(v => {
    const iD=daysUntil(v.inspection),rD=daysUntil(v.registration);
    if(iD!==null&&iD<60) alerts.push({vehicle:v.name,type:"Inspection",days:iD});
    if(rD!==null&&rD<60) alerts.push({vehicle:v.name,type:"Registration",days:rD});
    (v.reminders||[]).forEach(r=>{ const rd=daysUntil(r.dueDate); if(rd!==null&&rd<60) alerts.push({vehicle:v.name,type:r.label,days:rd}); });
  });
  if(!alerts.length) return null;
  return (
    <div style={{ background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:"12px 16px",marginBottom:20 }}>
      <div style={{ fontWeight:600,fontSize:13,color:"#9a3412",marginBottom:6 }}>⚠️ {alerts.length} Upcoming Deadline{alerts.length>1?"s":""}</div>
      <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
        {alerts.map((a,i)=><span key={i} style={{ background:a.days<0?"#fee2e2":"#ffedd5",color:a.days<0?"#991b1b":"#9a3412",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:500 }}>{a.vehicle} — {a.type}: {a.days<0?`${Math.abs(a.days)}d overdue`:`${a.days}d`}</span>)}
      </div>
    </div>
  );
}

// ── Form helpers ─────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type="text", placeholder="" }) {
  return (
    <div>
      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600 }}>{label}</div>
      <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%",padding:"7px 10px",border:"1px solid #e5e7eb",borderRadius:7,fontSize:13,outline:"none",boxSizing:"border-box" }} />
    </div>
  );
}
function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600 }}>{label}</div>
      <select value={value||""} onChange={e=>onChange(e.target.value)} style={{ width:"100%",padding:"7px 10px",border:"1px solid #e5e7eb",borderRadius:7,fontSize:13,background:"#fff",outline:"none",boxSizing:"border-box" }}>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Vehicle Detail Modal ─────────────────────────────────────────────────────
function VehicleDetail({ v, onClose, onSave, onDelete, activity, actLoading, photo, onPhotoChange, docs, onDocsChange }) {
  const [tab, setTab]     = useState("info");
  const [form, setForm]   = useState({...v});
  const [dirty, setDirty] = useState(false);
  const [newRem, setNewRem]         = useState({ label:"", dueDate:"", dueMiles:"" });
  const [newMaint, setNewMaint]     = useState({ date:"", miles:"", work:"", by:"", cost:"" });
  const [newDoc, setNewDoc]         = useState({ type:"Insurance Card", label:"", expiry:"", fileName:"", fileData:"" });
  const [expanded, setExpanded]     = useState(null);
  const [docExpanded, setDocExpanded] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [photoPreview, setPhotoPreview]   = useState(photo||null);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef    = useRef(null);
  const docFileInputRef = useRef(null);
  const vehicleDocs = docs[v.id] || [];

  const iD = daysUntil(form.inspection), rD = daysUntil(form.registration);

  function upd(key, val) { setForm(f=>({...f,[key]:val})); setDirty(true); }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await readFileAsBase64(file);
    setPhotoPreview(b64);
    onPhotoChange(v.id, b64);
  }

  function removePhoto() { setPhotoPreview(null); onPhotoChange(v.id, null); }

  async function handleDocFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await readFileAsBase64(file);
      setNewDoc(d => ({...d, fileName: file.name, fileData: b64}));
    } finally { setUploading(false); }
  }

  function addDoc() {
    if (!newDoc.fileData) return;
    const label = newDoc.label || newDoc.type;
    const doc = { id: Date.now(), type: newDoc.type, label, expiry: newDoc.expiry, fileName: newDoc.fileName, fileData: newDoc.fileData, addedAt: new Date().toISOString() };
    const updated = [...vehicleDocs, doc];
    onDocsChange(v.id, updated);
    setNewDoc({ type:"Insurance Card", label:"", expiry:"", fileName:"", fileData:"" });
    if (docFileInputRef.current) docFileInputRef.current.value = "";
  }

  function deleteDoc(id) {
    onDocsChange(v.id, vehicleDocs.filter(d=>d.id!==id));
  }

  function openDoc(fileData, fileName) {
    const a = document.createElement("a");
    a.href = fileData;
    a.download = fileName;
    a.target = "_blank";
    a.click();
  }

  function addReminder() {
    if (!newRem.label || !newRem.dueDate) return;
    const rem = [...(form.reminders||[]), { id: Date.now(), ...newRem }];
    setForm(f=>({...f,reminders:rem})); setDirty(true);
    setNewRem({ label:"", dueDate:"", dueMiles:"" });
  }
  function deleteReminder(id) { setForm(f=>({...f,reminders:(f.reminders||[]).filter(r=>r.id!==id)})); setDirty(true); }

  function addMaint() {
    if (!newMaint.work) return;
    const m = [...(form.maintenance||[]), { ...newMaint, miles: parseInt(newMaint.miles)||0, cost: parseFloat(newMaint.cost)||0 }];
    const total = m.reduce((s,x)=>s+(x.cost||0),0);
    setForm(f=>({...f,maintenance:m,totalMaintCost:total,lastService:newMaint.work})); setDirty(true);
    setNewMaint({ date:"",miles:"",work:"",by:"",cost:"" });
  }
  function deleteMaint(idx) {
    const m = (form.maintenance||[]).filter((_,i)=>i!==idx);
    const total = m.reduce((s,x)=>s+(x.cost||0),0);
    setForm(f=>({...f,maintenance:m,totalMaintCost:total})); setDirty(true);
  }

  const vehicleActivity = activity.filter(a=>a.vehicleId===v.id);

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:100,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:20,paddingBottom:20,overflowY:"auto" }}>
      <div style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:740,margin:"0 16px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>

        {/* Header with photo */}
        <div style={{ position:"relative",borderRadius:"16px 16px 0 0",background:v.color }}>
          {photoPreview && (
            <div style={{ borderRadius:"16px 16px 0 0",overflow:"hidden" }}>
              <img src={photoPreview} alt={v.name} style={{ width:"100%",height:200,objectFit:"cover",display:"block" }} />
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",borderRadius:"16px 16px 0 0" }} />
            </div>
          )}
          {/* Close button — always on top */}
          <button onClick={onClose} style={{ position:"absolute",top:12,right:12,zIndex:10,background:"rgba(0,0,0,0.45)",border:"2px solid rgba(255,255,255,0.6)",borderRadius:"50%",width:34,height:34,color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1 }}>×</button>
          <div style={{ padding: photoPreview ? "0 20px 16px" : "20px 20px 16px", position: photoPreview ? "absolute" : "relative", bottom: photoPreview ? 0 : "auto", left: photoPreview ? 0 : "auto", right: photoPreview ? 0 : "auto" }}>
            <div style={{ color:"rgba(255,255,255,0.75)",fontSize:11,fontWeight:600,letterSpacing:1,textTransform:"uppercase" }}>{v.id} · {v.entity}</div>
            <div style={{ color:"#fff",fontSize:21,fontWeight:700,marginTop:2,textShadow:"0 1px 4px rgba(0,0,0,0.5)" }}>{v.name}</div>
            <div style={{ color:"rgba(255,255,255,0.8)",fontSize:12,marginTop:2 }}>VIN: {v.vin} · Plate: {v.plate}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex",borderBottom:"1px solid #e5e7eb",padding:"0 12px",overflowX:"auto" }}>
          {[["info","Info"],["activity","Activity"],["maintenance","Maint."],["reminders","Reminders"],["docs","Docs"],["edit","Edit"],["qr","QR Codes"]].map(([t,label])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ background:"none",border:"none",padding:"12px 12px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",color:tab===t?"#111":"#6b7280",borderBottom:tab===t?"2px solid #111":"2px solid transparent" }}>
              {label}
              {t==="activity"&&vehicleActivity.length>0&&<span style={{ marginLeft:4,background:"#e5e7eb",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:700,color:"#374151" }}>{vehicleActivity.length}</span>}
              {t==="docs"&&vehicleDocs.length>0&&<span style={{ marginLeft:4,background:"#e5e7eb",borderRadius:20,padding:"1px 6px",fontSize:10,fontWeight:700,color:"#374151" }}>{vehicleDocs.length}</span>}
            </button>
          ))}
        </div>

        <div style={{ padding:24 }}>

          {/* ── INFO ── */}
          {tab==="info" && (
            <div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16 }}>
                {[["Make / Model",`${v.make} ${v.model}`],["Year",v.year],["VIN",v.vin],["Plate",v.plate],["Entity",v.entity],["Purchase Price",v.purchasePrice>0?`$${v.purchasePrice.toLocaleString()}`:"—"],["Miles at Purchase",v.milesPurchased>0?`${v.milesPurchased.toLocaleString()} mi`:"—"],["Current Mileage",v.currentMiles>0?`${v.currentMiles.toLocaleString()} mi`:"—"]].map(([l,val])=>(
                  <div key={l} style={{ background:"#f9fafb",borderRadius:8,padding:"10px 12px" }}>
                    <div style={{ fontSize:10,color:"#9ca3af",marginBottom:3,textTransform:"uppercase",letterSpacing:0.5 }}>{l}</div>
                    <div style={{ fontSize:13,fontWeight:600,color:"#111",wordBreak:"break-all" }}>{val||"—"}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16 }}>
                {[["State Inspection",v.inspection,iD],["Registration",v.registration,rD]].map(([l,date,days])=>(
                  <div key={l} style={{ background:days===null?"#f9fafb":days<0?"#fef2f2":days<30?"#fff7ed":days<90?"#fefce8":"#f0fdf4",borderRadius:10,padding:"12px 14px",borderLeft:`4px solid ${statusColor(days)}` }}>
                    <div style={{ fontSize:11,color:"#6b7280",marginBottom:4 }}>{l}</div>
                    <div style={{ fontSize:13,fontWeight:700,color:statusColor(days) }}>{statusLabel(days)}</div>
                    <div style={{ fontSize:11,color:"#9ca3af",marginTop:2 }}>{date||"No date on file"}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:"#f9fafb",borderRadius:10,padding:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#111",marginBottom:4 }}>Total Maintenance Cost</div>
                <div style={{ fontSize:28,fontWeight:800,color:v.color }}>${(v.totalMaintCost||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                <div style={{ fontSize:11,color:"#9ca3af",marginTop:2 }}>{(v.maintenance||[]).length} service records</div>
              </div>
            </div>
          )}

          {/* ── ACTIVITY ── */}
          {tab==="activity" && (
            <div>
              {actLoading&&<div style={{ textAlign:"center",padding:40,color:"#9ca3af" }}><div style={{ fontSize:24,marginBottom:8 }}>⏳</div>Loading…</div>}
              {!actLoading&&vehicleActivity.length===0&&(
                <div style={{ textAlign:"center",color:"#9ca3af",padding:40 }}>
                  <div style={{ fontSize:32,marginBottom:8 }}>📋</div>
                  <div style={{ fontSize:13 }}>No form submissions for this vehicle yet.</div>
                  <div style={{ fontSize:12,marginTop:8,color:"#6b7280" }}>Activity appears here once employees scan the QR and submit the form.</div>
                </div>
              )}
              {!actLoading&&vehicleActivity.length>0&&(
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {vehicleActivity.map(a=><ActivityRow key={a.id} a={a} expanded={expanded===a.id} onToggle={()=>setExpanded(expanded===a.id?null:a.id)} />)}
                </div>
              )}
            </div>
          )}

          {/* ── MAINTENANCE ── */}
          {tab==="maintenance" && (
            <div>
              <div style={{ background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:16,marginBottom:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#15803d",marginBottom:12 }}>+ Add Maintenance Record</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                  <Field label="Date" value={newMaint.date} onChange={v=>setNewMaint(m=>({...m,date:v}))} type="date" />
                  <Field label="Odometer (miles)" value={newMaint.miles} onChange={v=>setNewMaint(m=>({...m,miles:v}))} type="number" placeholder="158420" />
                  <Field label="Work Performed" value={newMaint.work} onChange={v=>setNewMaint(m=>({...m,work:v}))} placeholder="Oil change, inspection…" />
                  <Field label="Performed By" value={newMaint.by} onChange={v=>setNewMaint(m=>({...m,by:v}))} placeholder="Valvoline, Landis Garage…" />
                  <Field label="Cost ($)" value={newMaint.cost} onChange={v=>setNewMaint(m=>({...m,cost:v}))} type="number" placeholder="89.99" />
                </div>
                <button onClick={addMaint} style={{ padding:"8px 20px",background:"#15803d",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Add Record</button>
              </div>
              {(form.maintenance||[]).length===0
                ? <div style={{ textAlign:"center",color:"#9ca3af",padding:32 }}><div style={{ fontSize:28,marginBottom:8 }}>🔧</div>No records yet.</div>
                : <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {[...(form.maintenance||[])].reverse().map((m,i)=>(
                      <div key={i} style={{ border:"1px solid #e5e7eb",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{m.work}</div>
                          <div style={{ fontSize:11,color:"#6b7280",marginTop:3 }}>{m.by} · {m.date} · {m.miles>0?`${Number(m.miles).toLocaleString()} mi`:"—"}</div>
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:10,marginLeft:12 }}>
                          <div style={{ fontSize:14,fontWeight:700,color:"#374151" }}>{m.cost>0?`$${Number(m.cost).toFixed(2)}`:"—"}</div>
                          <button onClick={()=>deleteMaint((form.maintenance||[]).length-1-i)} style={{ background:"#fef2f2",border:"none",borderRadius:6,padding:"4px 8px",fontSize:11,color:"#dc2626",cursor:"pointer",fontWeight:600 }}>Delete</button>
                        </div>
                      </div>
                    ))}
                    <div style={{ background:"#f9fafb",borderRadius:10,padding:"10px 16px",textAlign:"right" }}>
                      <span style={{ fontSize:12,color:"#6b7280" }}>Total: </span>
                      <span style={{ fontSize:15,fontWeight:700 }}>${(form.totalMaintCost||0).toFixed(2)}</span>
                    </div>
                  </div>
              }
              {dirty&&<button onClick={()=>onSave(form)} style={{ marginTop:16,width:"100%",padding:"10px",background:"#111",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Save Changes</button>}
            </div>
          )}

          {/* ── REMINDERS ── */}
          {tab==="reminders" && (
            <div>
              <div style={{ background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:16,marginBottom:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#1d4ed8",marginBottom:4 }}>+ Add Maintenance Reminder</div>
                <div style={{ fontSize:12,color:"#3b82f6",marginBottom:12 }}>Reminders with future dates appear in the Upcoming Deadlines banner on the main dashboard.</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                  <Field label="Reminder Label" value={newRem.label} onChange={v=>setNewRem(r=>({...r,label:v}))} placeholder="Next oil change, inspection due…" />
                  <Field label="Due Date" value={newRem.dueDate} onChange={v=>setNewRem(r=>({...r,dueDate:v}))} type="date" />
                  <Field label="Due Mileage (optional)" value={newRem.dueMiles} onChange={v=>setNewRem(r=>({...r,dueMiles:v}))} type="number" placeholder="161420" />
                </div>
                <button onClick={addReminder} style={{ padding:"8px 20px",background:"#1d4ed8",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Add Reminder</button>
              </div>
              {(form.reminders||[]).length===0
                ? <div style={{ textAlign:"center",color:"#9ca3af",padding:32 }}><div style={{ fontSize:28,marginBottom:8 }}>⏰</div>No reminders set.</div>
                : <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {(form.reminders||[]).map(r=>{
                      const days=daysUntil(r.dueDate);
                      const color=statusColor(days);
                      return (
                        <div key={r.id} style={{ border:"1px solid",borderColor:days!==null&&days<30?"#fca5a5":"#e5e7eb",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                          <div>
                            <div style={{ fontSize:13,fontWeight:600,color:"#111" }}>{r.label}</div>
                            <div style={{ fontSize:11,color:"#6b7280",marginTop:3 }}>Due: {r.dueDate||"—"}{r.dueMiles?` · ${Number(r.dueMiles).toLocaleString()} mi`:""}</div>
                            <div style={{ fontSize:12,fontWeight:700,color,marginTop:4 }}>{statusLabel(days)}</div>
                          </div>
                          <button onClick={()=>deleteReminder(r.id)} style={{ background:"#fef2f2",border:"none",borderRadius:6,padding:"6px 12px",fontSize:12,color:"#dc2626",cursor:"pointer",fontWeight:600 }}>Remove</button>
                        </div>
                      );
                    })}
                  </div>
              }
              {dirty&&<button onClick={()=>onSave(form)} style={{ marginTop:16,width:"100%",padding:"10px",background:"#111",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Save Changes</button>}
            </div>
          )}

          {/* ── EDIT ── */}
          {tab==="edit" && (
            <div>
              {/* Photo upload */}
              <div style={{ marginBottom:20,background:"#f9fafb",borderRadius:10,padding:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#111",marginBottom:12 }}>Vehicle Photo</div>
                {photoPreview
                  ? <div style={{ position:"relative",display:"inline-block" }}>
                      <img src={photoPreview} alt="Vehicle" style={{ width:"100%",maxHeight:200,objectFit:"cover",borderRadius:8,display:"block" }} />
                      <button onClick={removePhoto} style={{ position:"absolute",top:8,right:8,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:20,padding:"4px 10px",color:"#fff",fontSize:11,cursor:"pointer",fontWeight:600 }}>Remove photo</button>
                    </div>
                  : <div onClick={()=>fileInputRef.current.click()} style={{ border:"2px dashed #d1d5db",borderRadius:8,padding:"32px 16px",textAlign:"center",cursor:"pointer",transition:"border-color 0.15s" }}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="#9ca3af"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="#d1d5db"}>
                      <div style={{ fontSize:28,marginBottom:8 }}>📷</div>
                      <div style={{ fontSize:13,fontWeight:600,color:"#374151" }}>Click to upload vehicle photo</div>
                      <div style={{ fontSize:11,color:"#9ca3af",marginTop:4 }}>JPG, PNG — shows on vehicle card and modal header</div>
                    </div>
                }
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display:"none" }} />
                {!photoPreview&&<button onClick={()=>fileInputRef.current.click()} style={{ marginTop:10,padding:"7px 16px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",color:"#374151" }}>Choose photo</button>}
              </div>

              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
                <Field label="Vehicle Name" value={form.name} onChange={v=>upd("name",v)} />
                <Field label="Make" value={form.make} onChange={v=>upd("make",v)} />
                <Field label="Model" value={form.model} onChange={v=>upd("model",v)} />
                <Field label="Year" value={form.year} onChange={v=>upd("year",v)} type="number" />
                <Field label="VIN Number" value={form.vin} onChange={v=>upd("vin",v)} />
                <Field label="License Plate" value={form.plate} onChange={v=>upd("plate",v)} />
                <SelectField label="Entity" value={form.entity} onChange={v=>upd("entity",v)} options={ENTITIES} />
                <Field label="Current Mileage" value={form.currentMiles} onChange={v=>upd("currentMiles",parseInt(v)||0)} type="number" />
                <Field label="Purchase Price ($)" value={form.purchasePrice} onChange={v=>upd("purchasePrice",parseFloat(v)||0)} type="number" />
                <Field label="Miles at Purchase" value={form.milesPurchased} onChange={v=>upd("milesPurchased",parseInt(v)||0)} type="number" />
                <Field label="State Inspection Expiry" value={form.inspection} onChange={v=>upd("inspection",v)} type="date" />
                <Field label="Registration Expiry" value={form.registration} onChange={v=>upd("registration",v)} type="date" />
                <Field label="Last Service Description" value={form.lastService} onChange={v=>upd("lastService",v)} />
                <div>
                  <div style={{ fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600 }}>Accent Color</div>
                  <input type="color" value={form.color||"#1e3a5f"} onChange={e=>upd("color",e.target.value)} style={{ width:"100%",height:36,border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",padding:2 }} />
                </div>
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={()=>{onSave(form);setDirty(false)}} disabled={!dirty} style={{ flex:1,padding:"10px",background:dirty?"#111":"#e5e7eb",color:dirty?"#fff":"#9ca3af",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:dirty?"pointer":"default" }}>Save Changes</button>
                {!confirmDelete
                  ? <button onClick={()=>setConfirmDelete(true)} style={{ padding:"10px 20px",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Delete Vehicle</button>
                  : <button onClick={()=>onDelete(v.id)} style={{ padding:"10px 20px",background:"#dc2626",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Confirm Delete</button>
                }
              </div>
              {confirmDelete&&<div style={{ marginTop:8,fontSize:12,color:"#dc2626",textAlign:"right" }}>This cannot be undone.</div>}
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {tab==="docs" && (
            <div>
              {/* Upload new doc */}
              <div style={{ background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:10,padding:16,marginBottom:16 }}>
                <div style={{ fontSize:13,fontWeight:700,color:"#0369a1",marginBottom:4 }}>+ Add Document</div>
                <div style={{ fontSize:12,color:"#0284c7",marginBottom:14 }}>Upload insurance cards, registration, inspection certificates, or any vehicle-related document. PDFs and images accepted.</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600 }}>Document Type</div>
                    <select value={newDoc.type} onChange={e=>setNewDoc(d=>({...d,type:e.target.value}))}
                      style={{ width:"100%",padding:"7px 10px",border:"1px solid #e5e7eb",borderRadius:7,fontSize:13,background:"#fff",outline:"none",boxSizing:"border-box" }}>
                      {DOC_TYPES.map(t=><option key={t} value={t}>{DOC_ICONS[t]} {t}</option>)}
                    </select>
                  </div>
                  <Field label="Custom Label (optional)" value={newDoc.label} onChange={v=>setNewDoc(d=>({...d,label:v}))} placeholder={`e.g. ${newDoc.type} 2025`} />
                  <Field label="Expiry Date (optional)" value={newDoc.expiry} onChange={v=>setNewDoc(d=>({...d,expiry:v}))} type="date" />
                  <div>
                    <div style={{ fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600 }}>File</div>
                    <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                      <button onClick={()=>docFileInputRef.current.click()} style={{ padding:"7px 14px",background:"#f3f4f6",border:"1px solid #e5e7eb",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer",color:"#374151",whiteSpace:"nowrap" }}>
                        {uploading ? "Reading…" : "Choose file"}
                      </button>
                      {newDoc.fileName && <span style={{ fontSize:11,color:"#6b7280",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>📎 {newDoc.fileName}</span>}
                    </div>
                    <input ref={docFileInputRef} type="file" accept="image/*,.pdf,.doc,.docx" onChange={handleDocFileSelect} style={{ display:"none" }} />
                  </div>
                </div>
                <button onClick={addDoc} disabled={!newDoc.fileData} style={{ padding:"8px 20px",background:newDoc.fileData?"#0369a1":"#e5e7eb",color:newDoc.fileData?"#fff":"#9ca3af",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:newDoc.fileData?"pointer":"default" }}>
                  Upload Document
                </button>
              </div>

              {/* Doc list */}
              {vehicleDocs.length === 0 ? (
                <div style={{ textAlign:"center",color:"#9ca3af",padding:40 }}>
                  <div style={{ fontSize:36,marginBottom:10 }}>📁</div>
                  <div style={{ fontSize:13,fontWeight:600 }}>No documents yet</div>
                  <div style={{ fontSize:12,marginTop:6 }}>Upload your insurance card, registration, or any vehicle document above.</div>
                </div>
              ) : (
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {/* Group by type */}
                  {DOC_TYPES.filter(type=>vehicleDocs.some(d=>d.type===type)).map(type=>{
                    const typeDocs = vehicleDocs.filter(d=>d.type===type);
                    return (
                      <div key={type}>
                        <div style={{ fontSize:11,fontWeight:700,color:"#6b7280",letterSpacing:1,textTransform:"uppercase",marginBottom:6 }}>{DOC_ICONS[type]} {type}</div>
                        {typeDocs.map(doc=>{
                          const days = daysUntil(doc.expiry);
                          const isImg = doc.fileName && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.fileName);
                          return (
                            <div key={doc.id} style={{ border:"1px solid",borderColor:days!==null&&days<30?"#fca5a5":"#e5e7eb",borderRadius:10,overflow:"hidden",marginBottom:8 }}>
                              {/* Doc row */}
                              <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px" }}>
                                {/* Thumbnail for images */}
                                {isImg
                                  ? <img src={doc.fileData} alt={doc.label} style={{ width:44,height:44,objectFit:"cover",borderRadius:6,flexShrink:0 }} />
                                  : <div style={{ width:44,height:44,background:"#f3f4f6",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>📄</div>
                                }
                                <div style={{ flex:1,minWidth:0 }}>
                                  <div style={{ fontSize:13,fontWeight:600,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{doc.label}</div>
                                  <div style={{ fontSize:11,color:"#6b7280",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{doc.fileName}</div>
                                  {doc.expiry && (
                                    <div style={{ fontSize:11,fontWeight:600,color:statusColor(days),marginTop:3 }}>
                                      Expires {doc.expiry} · {statusLabel(days)}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display:"flex",gap:8,flexShrink:0 }}>
                                  <button onClick={()=>openDoc(doc.fileData, doc.fileName)} style={{ padding:"6px 14px",background:"#111",color:"#fff",border:"none",borderRadius:7,fontSize:12,fontWeight:600,cursor:"pointer" }}>
                                    Open
                                  </button>
                                  {isImg && (
                                    <button onClick={()=>setDocExpanded(docExpanded===doc.id?null:doc.id)} style={{ padding:"6px 10px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:7,fontSize:12,cursor:"pointer" }}>
                                      {docExpanded===doc.id?"▲":"▼"}
                                    </button>
                                  )}
                                  <button onClick={()=>deleteDoc(doc.id)} style={{ padding:"6px 10px",background:"#fef2f2",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:7,fontSize:12,cursor:"pointer",fontWeight:600 }}>✕</button>
                                </div>
                              </div>
                              {/* Expanded image preview */}
                              {isImg && docExpanded===doc.id && (
                                <div style={{ borderTop:"1px solid #f3f4f6",padding:12,background:"#fafafa",textAlign:"center" }}>
                                  <img src={doc.fileData} alt={doc.label} style={{ maxWidth:"100%",maxHeight:400,objectFit:"contain",borderRadius:8 }} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── QR CODES ── */}
          {tab==="qr" && (
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              <p style={{ fontSize:13,color:"#6b7280",margin:0 }}>Print all three and post them inside <strong>{v.name}</strong>. Each links directly to the correct form with this vehicle pre-tagged.</p>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:16 }}>
                {[
                  { label:"Sign Out",    url:`${FORM_URLS.signOut}?vehicleID=${v.id}`,     icon:"🔑",bg:"#eff6ff",color:"#1d4ed8" },
                  { label:"Sign In",     url:`${FORM_URLS.signIn}?vehicleID=${v.id}`,      icon:"🏠",bg:"#f0fdf4",color:"#15803d" },
                  { label:"Maintenance", url:`${FORM_URLS.maintenance}?vehicleID=${v.id}`, icon:"🔧",bg:"#faf5ff",color:"#7e22ce" },
                ].map(({label,url,icon,bg,color})=>(
                  <div key={label} style={{ background:bg,borderRadius:12,padding:16,textAlign:"center",border:`1px solid ${color}22` }}>
                    <div style={{ fontSize:12,fontWeight:700,color,marginBottom:12 }}>{icon} {label}</div>
                    <QRCode value={url} size={140} />
                    <div style={{ fontSize:10,color:"#9ca3af",marginTop:10 }}>{v.id} · {v.plate}</div>
                    <a href={url} target="_blank" rel="noreferrer" style={{ display:"block",marginTop:8,fontSize:11,color,textDecoration:"none",fontWeight:600 }}>Open form ↗</a>
                  </div>
                ))}
              </div>
              <div style={{ textAlign:"center" }}>
                <button onClick={()=>window.print()} style={{ padding:"8px 24px",background:"#111",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>🖨️ Print all three QR codes</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Vehicle Modal ─────────────────────────────────────────────────────────
function AddVehicleModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ id:"", name:"", make:"", model:"", year:new Date().getFullYear(), vin:"", plate:"", entity:"DSC Solutions", purchasePrice:0, milesPurchased:0, currentMiles:0, inspection:"", registration:"", lastService:"No records", color:"#1e3a5f", totalMaintCost:0, maintenance:[], reminders:[] });
  function upd(k,v) { setForm(f=>({...f,[k]:v})); }
  function handleAdd() {
    if(!form.name||!form.make) return;
    onAdd({ ...form, id: form.id||genId(), year: parseInt(form.year)||2024, currentMiles: parseInt(form.currentMiles)||0, purchasePrice: parseFloat(form.purchasePrice)||0 });
  }
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
      <div style={{ background:"#fff",borderRadius:16,width:"100%",maxWidth:600,maxHeight:"90vh",overflowY:"auto",padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div style={{ fontSize:18,fontWeight:700,color:"#111" }}>Add New Vehicle</div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#6b7280" }}>×</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
          <Field label="Vehicle Name *" value={form.name} onChange={v=>upd("name",v)} placeholder="2024 Ford Transit" />
          <Field label="Custom ID (optional)" value={form.id} onChange={v=>upd("id",v)} placeholder="Auto-generated if blank" />
          <Field label="Make *" value={form.make} onChange={v=>upd("make",v)} placeholder="Ford" />
          <Field label="Model" value={form.model} onChange={v=>upd("model",v)} placeholder="Transit" />
          <Field label="Year" value={form.year} onChange={v=>upd("year",v)} type="number" />
          <Field label="VIN" value={form.vin} onChange={v=>upd("vin",v)} />
          <Field label="License Plate" value={form.plate} onChange={v=>upd("plate",v)} />
          <SelectField label="Entity" value={form.entity} onChange={v=>upd("entity",v)} options={ENTITIES} />
          <Field label="Purchase Price ($)" value={form.purchasePrice} onChange={v=>upd("purchasePrice",v)} type="number" />
          <Field label="Current Mileage" value={form.currentMiles} onChange={v=>upd("currentMiles",v)} type="number" />
          <Field label="Inspection Expiry" value={form.inspection} onChange={v=>upd("inspection",v)} type="date" />
          <Field label="Registration Expiry" value={form.registration} onChange={v=>upd("registration",v)} type="date" />
          <div>
            <div style={{ fontSize:11,color:"#6b7280",marginBottom:4,fontWeight:600 }}>Accent Color</div>
            <input type="color" value={form.color} onChange={e=>upd("color",e.target.value)} style={{ width:"100%",height:36,border:"1px solid #e5e7eb",borderRadius:7,cursor:"pointer",padding:2 }} />
          </div>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <button onClick={onClose} style={{ flex:1,padding:"10px",background:"#f3f4f6",color:"#374151",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Cancel</button>
          <button onClick={handleAdd} style={{ flex:2,padding:"10px",background:"#111",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer" }}>Add Vehicle</button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [vehicles, setVehicles] = useState(()=>loadVehicles()||DEFAULT_VEHICLES);
  const [photos, setPhotos]     = useState(()=>loadPhotos());
  const [docs, setDocs]         = useState(()=>loadDocs());
  const [selected, setSelected] = useState(null);
  const [mainTab, setMainTab]   = useState("fleet");
  const [company, setCompany]   = useState("All");
  const [search, setSearch]     = useState("");
  const [sortBy, setSortBy]     = useState("name");
  const [showAdd, setShowAdd]   = useState(false);

  const { activity, loading: actLoading, error: actError, fetchedAt, refresh } = useActivity(vehicles);
  const alertCount = activity.filter(a=>a.damage||a.warningLights||a.flagImmediate).length;

  function saveVehicle(updated) {
    const next = vehicles.map(v=>v.id===updated.id?updated:v);
    setVehicles(next); saveVehicles(next);
    setSelected(updated);
  }
  function deleteVehicle(id) {
    const next = vehicles.filter(v=>v.id!==id);
    setVehicles(next); saveVehicles(next);
    const newPhotos = {...photos}; delete newPhotos[id];
    setPhotos(newPhotos); savePhotos(newPhotos);
    const newDocs = {...docs}; delete newDocs[id];
    setDocs(newDocs); saveDocs(newDocs);
    setSelected(null);
  }
  function addVehicle(v) {
    const next = [...vehicles, v];
    setVehicles(next); saveVehicles(next);
    setShowAdd(false);
  }
  function handlePhotoChange(vehicleId, base64) {
    const newPhotos = {...photos};
    if (base64) newPhotos[vehicleId] = base64;
    else delete newPhotos[vehicleId];
    setPhotos(newPhotos); savePhotos(newPhotos);
  }
  function handleDocsChange(vehicleId, updatedDocs) {
    const newDocs = {...docs, [vehicleId]: updatedDocs};
    setDocs(newDocs); saveDocs(newDocs);
  }

  const filtered = vehicles
    .filter(v=>company==="All"||v.entity===company)
    .filter(v=>{ const q=search.toLowerCase(); return !q||v.name.toLowerCase().includes(q)||v.plate.toLowerCase().includes(q)||v.id.toLowerCase().includes(q)||(v.vin||"").toLowerCase().includes(q); })
    .sort((a,b)=>{
      if(sortBy==="name") return a.name.localeCompare(b.name);
      if(sortBy==="urgent"){ const uA=Math.min(daysUntil(a.inspection)??9999,daysUntil(a.registration)??9999); const uB=Math.min(daysUntil(b.inspection)??9999,daysUntil(b.registration)??9999); return uA-uB; }
      if(sortBy==="cost") return (b.totalMaintCost||0)-(a.totalMaintCost||0);
      if(sortBy==="miles") return (b.currentMiles||0)-(a.currentMiles||0);
      return 0;
    });

  const totalCost    = vehicles.reduce((s,v)=>s+(v.totalMaintCost||0),0);
  const expiredCount = vehicles.filter(v=>{ const iD=daysUntil(v.inspection),rD=daysUntil(v.registration); return (iD!==null&&iD<0)||(rD!==null&&rD<0); }).length;
  const dueSoonCount = vehicles.filter(v=>{ const iD=daysUntil(v.inspection),rD=daysUntil(v.registration); return ((iD!==null&&iD>=0&&iD<60)||(rD!==null&&rD>=0&&rD<60)); }).length;

  return (
    <div style={{ fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f8fafc",minHeight:"100vh",padding:"20px 16px" }}>
      <div style={{ maxWidth:1100,margin:"0 auto" }}>

        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20 }}>
          <div>
            <div style={{ fontSize:24,fontWeight:800,color:"#0f172a",letterSpacing:"-0.5px" }}>🚗 DSC Fleet Dashboard</div>
            <div style={{ fontSize:13,color:"#64748b",marginTop:2 }}>DSC Solutions · Select Building Services · Clean Energy</div>
          </div>
          <button onClick={()=>setShowAdd(true)} style={{ padding:"9px 18px",background:"#111",color:"#fff",border:"none",borderRadius:9,fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>+ Add Vehicle</button>
        </div>

        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:20 }}>
          {[
            { label:"Total Vehicles",    value:vehicles.length,  color:"#0f172a",bg:"#f9fafb" },
            { label:"Total Maint. Cost", value:`$${totalCost.toLocaleString("en-US",{maximumFractionDigits:0})}`, color:"#1e40af",bg:"#eff6ff" },
            { label:"Expired/Overdue",   value:expiredCount,     color:"#dc2626",bg:"#fef2f2" },
            { label:"Due Within 60d",    value:dueSoonCount,     color:"#d97706",bg:"#fffbeb" },
            { label:"Live Alerts",       value:alertCount,       color:"#7e22ce",bg:"#faf5ff" },
          ].map((s,i)=>(
            <div key={i} style={{ background:s.bg,borderRadius:12,padding:"14px 16px",border:"1px solid #e5e7eb" }}>
              <div style={{ fontSize:10,color:"#9ca3af",marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22,fontWeight:800,color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <AlertBanner vehicles={vehicles} />

        <div style={{ display:"flex",borderBottom:"1px solid #e5e7eb",marginBottom:20 }}>
          {[["fleet","🚙 Fleet"],["activity","📋 Activity"]].map(([t,label])=>(
            <button key={t} onClick={()=>setMainTab(t)} style={{ background:"none",border:"none",padding:"12px 20px",fontSize:14,fontWeight:700,cursor:"pointer",color:mainTab===t?"#111":"#6b7280",borderBottom:mainTab===t?"3px solid #111":"3px solid transparent",position:"relative" }}>
              {label}
              {t==="activity"&&alertCount>0&&<span style={{ position:"absolute",top:8,right:4,background:"#dc2626",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:9,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center" }}>{alertCount}</span>}
            </button>
          ))}
        </div>

        {mainTab==="fleet" && (
          <>
            <div style={{ display:"flex",gap:10,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
              <input placeholder="Search by name, plate, VIN, ID…" value={search} onChange={e=>setSearch(e.target.value)} style={{ flex:"1 1 200px",padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,outline:"none",background:"#fff" }} />
              <select value={company} onChange={e=>setCompany(e.target.value)} style={{ padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>
                {COMPANIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{ padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,background:"#fff",cursor:"pointer" }}>
                <option value="name">Sort: Name</option>
                <option value="urgent">Sort: Most Urgent</option>
                <option value="cost">Sort: Highest Cost</option>
                <option value="miles">Sort: Highest Miles</option>
              </select>
              <div style={{ fontSize:12,color:"#9ca3af" }}>{filtered.length} vehicle{filtered.length!==1?"s":""}</div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14 }}>
              {filtered.map(v=><VehicleCard key={v.id} v={v} photo={photos[v.id]||null} onClick={setSelected} />)}
            </div>
            {filtered.length===0&&<div style={{ textAlign:"center",color:"#9ca3af",padding:60,fontSize:14 }}>No vehicles match your search.</div>}
          </>
        )}

        {mainTab==="activity" && (
          <ActivityFeed
            activity={activity} loading={actLoading} error={actError} fetchedAt={fetchedAt} refresh={refresh}
            onVehicleClick={id=>{ const v=vehicles.find(x=>x.id===id); if(v) setSelected(v); }}
          />
        )}

        <div style={{ marginTop:24,textAlign:"center",fontSize:11,color:"#cbd5e1" }}>
          DSC Fleet Dashboard · Live data from Jotform · Photos & edits saved locally
        </div>
      </div>

      {selected && (
        <VehicleDetail
          v={selected} onClose={()=>setSelected(null)}
          onSave={saveVehicle} onDelete={deleteVehicle}
          activity={activity} actLoading={actLoading}
          photo={photos[selected.id]||null}
          onPhotoChange={handlePhotoChange}
          docs={docs}
          onDocsChange={handleDocsChange}
        />
      )}
      {showAdd && <AddVehicleModal onClose={()=>setShowAdd(false)} onAdd={addVehicle} />}
    </div>
  );
}
