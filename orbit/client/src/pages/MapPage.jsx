import { useState, useMemo }                  from "react";
import { MapContainer, TileLayer,
         CircleMarker, Popup }                from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useDisease }                         from "../hooks/useDisease";
import { enrichCountriesWithCoords }          from "../utils/countryCoordinates";

const DISEASES = [
  { key: "covid19",      label: "COVID-19",     icon: "🦠" },
  { key: "tuberculosis", label: "Tuberculosis", icon: "🫁" },
  { key: "malaria",      label: "Malaria",      icon: "🦟" },
  { key: "hiv",          label: "HIV/AIDS",     icon: "🔴" },
  { key: "mpox",         label: "Mpox",         icon: "🧬" },
  { key: "cholera",      label: "Cholera",      icon: "💧" },
  { key: "measles",      label: "Measles",      icon: "⚕️" },
];

const RISK_LEVELS = [
  { label: "Critical", color: "#dc2626", range: "75–100" },
  { label: "High",     color: "#ea580c", range: "50–74"  },
  { label: "Moderate", color: "#eab308", range: "25–49"  },
  { label: "Low",      color: "#22c55e", range: "5–24"   },
  { label: "Minimal",  color: "#94a3b8", range: "0–4"    },
];

function fmt(n) {
  if (n == null || n === 0) return "—";
  const num = Number(n);
  if (isNaN(num)) return "—";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toLocaleString();
}

function fmtPct(n) {
  if (n == null || n === 0) return "—";
  return `${Number(n).toFixed(2)}%`;
}

function riskColor(risk) {
  switch (risk) {
    case "Critical": return "#dc2626";
    case "High":     return "#ea580c";
    case "Moderate": return "#eab308";
    case "Low":      return "#22c55e";
    default:         return "#94a3b8";
  }
}

function circleRadius(cases, maxCases) {
  if (!cases || !maxCases) return 4;
  const ratio = Math.log1p(cases) / Math.log1p(maxCases);
  return Math.max(4, Math.min(32, ratio * 32));
}

function DetailPanel({ selected, isOwid, onClose }) {
  if (!selected) {
    return (
      <div className="detail-empty">
        <div className="detail-empty-icon">🌍</div>
        <p>Click any circle on the map to see detailed country statistics</p>
      </div>
    );
  }

  const baseRows = [
    ["Total Cases",  fmt(selected.cases)],
    ["Deaths",       fmt(selected.deaths)],
    ...(isOwid ? [] : [["Cases / 1M", fmt(selected.casesPerMillion)]]),
    ["Risk Score",   `${selected.riskScore ?? "—"} / 100`],
  ];

  const covidRows = [
    ["Recovered",    fmt(selected.recovered)],
    ["Active",       fmt(selected.active)],
    ["Critical",     fmt(selected.critical)],
    ["Today Cases",  fmt(selected.todayCases)],
    ["Deaths / 1M",  fmt(selected.deathsPerMillion)],
    ["Data Year",    selected.dataYear ? String(selected.dataYear) : "—"],
  ];

  const owidRows = [
    ["Mortality Rate", fmtPct(selected.caseFatalityRate)],
    ["Data Year",      selected.year ?? "—"],
    ["Continent",      selected.continent ?? "—"],
    ["Source",         "OWID / WHO"],
  ];

  const rows = isOwid ? [...baseRows, ...owidRows] : [...baseRows, ...covidRows];

  return (
    <>
      <div className="detail-head">
        <div style={{ display:"flex", alignItems:"center", gap:".6rem", marginBottom:".5rem" }}>
          {selected.flag && (
            <img
              src={selected.flag} alt=""
              style={{ width:30, height:19, objectFit:"cover", borderRadius:3 }}
            />
          )}
          <div className="detail-name">{selected.country}</div>
          <button
            onClick={onClose}
            style={{ marginLeft:"auto", background:"none", border:"none",
                     cursor:"pointer", color:"var(--gray-400)", fontSize:"1rem" }}
            aria-label="Close"
          >✕</button>
        </div>
        <span className={`badge badge-${(selected.risk ?? "").toLowerCase()}`}>
          {selected.risk} Risk
        </span>
        <div style={{ height:5, borderRadius:99, background:"var(--gray-100)",
                      overflow:"hidden", marginTop:".5rem" }}>
          <div style={{
            height:"100%", borderRadius:99,
            width:`${selected.riskScore ?? 0}%`,
            background: riskColor(selected.risk),
            transition:"width .5s ease",
          }} />
        </div>
        <div style={{ fontSize:".72rem", color:"var(--gray-400)", fontFamily:"var(--font-mono)",
                      marginTop:".3rem" }}>
          Score: {selected.riskScore ?? "—"}/100
        </div>
      </div>

      <div className="detail-body">
        {rows.map(([l, v]) => (
          <div className="drow" key={l}>
            <span className="dlabel">{l}</span>
            <span className="dval">{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function MapPage() {
  const [activeDisease, setActiveDisease] = useState("covid19");
  const [selected,      setSelected]      = useState(null);
  const [activeRisks,   setActiveRisks]   = useState(
    new Set(RISK_LEVELS.map(r => r.label))
  );

  const { countries, loading, error, isOwid, refetch } = useDisease(activeDisease);

  const mappableCountries = useMemo(() => {
    if (!countries.length) return [];
    return isOwid
      ? enrichCountriesWithCoords(countries)
      : countries.filter(c => c.lat && c.lng);
  }, [countries, isOwid]);

  const maxCases = useMemo(
    () => Math.max(...mappableCountries.map(c => c.cases || 0), 1),
    [mappableCountries]
  );

  const visibleCountries = useMemo(
    () => mappableCountries.filter(c => activeRisks.has(c.risk ?? "Minimal")),
    [mappableCountries, activeRisks]
  );

  const handleDiseaseChange = (key) => {
    setActiveDisease(key);
    setSelected(null);
  };

  const toggleRisk = (label) => {
    setActiveRisks(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const toggleAll = () => {
    const allLabels = RISK_LEVELS.map(r => r.label);
    setActiveRisks(prev =>
      prev.size === allLabels.length ? new Set() : new Set(allLabels)
    );
  };

  const allChecked = activeRisks.size === RISK_LEVELS.length;

  const subText = loading
    ? "Loading data…"
    : error
    ? "Error loading data"
    : `${visibleCountries.length} of ${mappableCountries.length} countries · ${isOwid ? "OWID / WHO annual data" : "disease.sh real-time"} · Click a circle for details`;

  return (
    <div className="map-page page-enter">
      <style>{`
        .map-page { display:flex; flex-direction:column; gap:1rem; height:100%; }
        .map-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:1rem; }
        .map-title { font-size:1.4rem; font-weight:800; color:var(--gray-900); letter-spacing:-.02em; }
        .map-sub { font-size:.82rem; color:var(--gray-400); margin-top:.2rem; }
        .map-tabs { display:flex; gap:.4rem; flex-wrap:wrap; }
        .map-tab {
          padding:.4rem .8rem; border-radius:99px; font-size:.82rem; font-weight:600;
          cursor:pointer; border:1.5px solid var(--border); background:var(--white);
          color:var(--gray-600); transition:all .18s; font-family:var(--font-body);
        }
        .map-tab:hover { border-color:var(--orbit-green); color:var(--orbit-green-dim); }
        .map-tab.active { background:var(--orbit-green); color:white; border-color:var(--orbit-green); box-shadow:var(--shadow-green); }
        .map-body { display:flex; gap:1rem; flex:1; min-height:0; }
        .map-wrapper {
          flex:1; position:relative; border-radius:var(--radius);
          overflow:hidden; border:1px solid var(--border);
          min-height:520px; background:#f0f4f8;
        }
        .leaflet-container { width:100%; height:100%; min-height:520px; border-radius:var(--radius); }
        .map-loading {
          position:absolute; inset:0; z-index:2000;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          background:rgba(255,255,255,.85); backdrop-filter:blur(4px);
          gap:14px; border-radius:var(--radius);
        }
        @keyframes spin { to { transform:rotate(360deg); } }
        .spinner {
          width:36px; height:36px;
          border:3px solid var(--orbit-green-pale);
          border-top-color:var(--orbit-green);
          border-radius:50%; animation:spin .8s linear infinite;
        }
        .map-loading p { font-size:14px; color:var(--gray-500); font-family:var(--font-mono); }
        .map-legend {
          position:absolute; bottom:1.5rem; left:1rem;
          background:rgba(255,255,255,.96); backdrop-filter:blur(8px);
          border:1px solid var(--border); border-radius:var(--radius-sm);
          padding:.875rem 1rem; z-index:1000; box-shadow:var(--shadow);
          min-width:170px;
        }
        .map-legend-title { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--gray-500); font-family:var(--font-mono); margin-bottom:.5rem; }
        .legend-item {
          display:flex; align-items:center; gap:.5rem;
          font-size:.78rem; color:var(--gray-700);
          margin-bottom:.25rem; font-weight:500;
          cursor:pointer; user-select:none;
        }
        .legend-item input[type="checkbox"] { accent-color:var(--orbit-green); cursor:pointer; margin:0; }
        .legend-dot { width:12px; height:12px; border-radius:50%; flex-shrink:0; }
        .legend-range { color:var(--gray-400); font-size:.7rem; font-family:var(--font-mono); margin-left:auto; padding-left:.5rem; }
        .legend-toggle-all {
          font-size:.7rem; font-family:var(--font-mono); color:var(--orbit-green);
          background:none; border:none; cursor:pointer; padding:0;
          margin-bottom:.4rem; font-weight:700; text-decoration:underline;
        }
        .map-tip {
          position:absolute; bottom:1.5rem; right:1rem;
          background:rgba(255,255,255,.88); backdrop-filter:blur(6px);
          border:1px solid var(--border); border-radius:var(--radius-sm);
          padding:.5rem .875rem; z-index:999;
          font-size:.75rem; color:var(--gray-500); font-family:var(--font-mono);
        }
        .detail-panel { width:270px; flex-shrink:0; background:var(--white); border:1px solid var(--border); border-radius:var(--radius); overflow-y:auto; display:flex; flex-direction:column; }
        .detail-empty { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2rem 1.5rem; text-align:center; gap:.75rem; }
        .detail-empty-icon { font-size:2.5rem; opacity:.4; }
        .detail-empty p { font-size:.85rem; color:var(--gray-400); line-height:1.6; }
        .detail-head { padding:1.25rem 1.25rem .75rem; border-bottom:1px solid var(--border); }
        .detail-name { font-size:1rem; font-weight:800; color:var(--gray-900); }
        .detail-body { padding:.75rem 1.25rem 1.25rem; }
        .drow { display:flex; justify-content:space-between; align-items:center; padding:.4rem 0; border-bottom:1px solid var(--border); font-size:.82rem; }
        .drow:last-child { border-bottom:none; }
        .dlabel { color:var(--gray-500); }
        .dval { font-weight:700; font-family:var(--font-mono); color:var(--gray-900); }
        .error-bar { background:#fef2f2; border:1px solid #fecaca; border-radius:var(--radius-sm); padding:.6rem 1rem; font-size:.82rem; color:#dc2626; display:flex; align-items:center; justify-content:space-between; }
        @media (max-width:900px) { .detail-panel { display:none; } }
      `}</style>

      {/* Header */}
      <div className="map-header">
        <div>
          <div className="map-title">🗺 Live Outbreak Map</div>
          <div className="map-sub">{subText}</div>
        </div>
        <div className="map-tabs">
          {DISEASES.map(d => (
            <button
              key={d.key}
              className={`map-tab ${activeDisease === d.key ? "active" : ""}`}
              onClick={() => handleDiseaseChange(d.key)}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-bar">
          <span>⚠ {error}</span>
          <button
            onClick={refetch}
            style={{ background:"none", border:"none", cursor:"pointer",
                     fontWeight:700, color:"#dc2626" }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Body */}
      <div className="map-body">
        <div className="map-wrapper">

          {loading && (
            <div className="map-loading">
              <div className="spinner" />
              <p>Fetching outbreak data...</p>
            </div>
          )}

          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={1.5}
            maxZoom={8}
            style={{ width:"100%", height:"100%", minHeight:520 }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              attribution='© <a href="https://carto.com/">CARTO</a>'
              subdomains="abcd"
            />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
            />

            {!loading && visibleCountries.map((c) => (
              <CircleMarker
                key={c.countryCode || c.country}
                center={[c.lat, c.lng]}
                radius={circleRadius(c.cases, maxCases)}
                pathOptions={{
                  color:       riskColor(c.risk),
                  fillColor:   riskColor(c.risk),
                  fillOpacity: 0.65,
                  weight:      1.5,
                  opacity:     0.9,
                }}
                eventHandlers={{ click: () => setSelected(c) }}
              >
                <Popup>
                  <div style={{ fontFamily:"var(--font-body)", minWidth:200 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                      {c.flag && (
                        <img
                          src={c.flag} alt=""
                          style={{ width:26, height:17, objectFit:"cover", borderRadius:3 }}
                        />
                      )}
                      <strong style={{ fontSize:15, color:"#111827" }}>{c.country}</strong>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                      <span style={{
                        width:9, height:9, borderRadius:"50%",
                        background: riskColor(c.risk), display:"inline-block"
                      }} />
                      <span style={{ fontSize:12, fontWeight:700, color: riskColor(c.risk) }}>
                        {c.risk} Risk · {c.riskScore}/100
                      </span>
                    </div>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                      <tbody>
                        {[
                          ["Cases",   fmt(c.cases)],
                          ["Deaths",  fmt(c.deaths)],
                          ["Active",  fmt(c.active)],
                          ["Today +", fmt(c.todayCases)],
                          ...(isOwid ? [["Mortality", fmtPct(c.caseFatalityRate)]] : []),
                        ].map(([l, v]) => (
                          <tr key={l}>
                            <td style={{ color:"#6b7280", padding:"3px 0" }}>{l}</td>
                            <td style={{ textAlign:"right", fontWeight:700, fontFamily:"monospace" }}>{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Legend with filter checkboxes */}
          <div className="map-legend">
            <div className="map-legend-title">Risk Level</div>
            <button className="legend-toggle-all" onClick={toggleAll}>
              {allChecked ? "Deselect all" : "Select all"}
            </button>
            {RISK_LEVELS.map(({ label, color, range }) => (
              <label className="legend-item" key={label}>
                <input
                  type="checkbox"
                  checked={activeRisks.has(label)}
                  onChange={() => toggleRisk(label)}
                />
                <div
                  className="legend-dot"
                  style={{ background: color, opacity: activeRisks.has(label) ? 1 : 0.3 }}
                />
                <span style={{ opacity: activeRisks.has(label) ? 1 : 0.4 }}>{label}</span>
                <span className="legend-range">{range}</span>
              </label>
            ))}
            <div style={{ marginTop:".6rem", paddingTop:".5rem", borderTop:"1px solid var(--border)" }}>
              <div className="map-legend-title" style={{ marginBottom:".2rem" }}>Circle Size</div>
              <div style={{ fontSize:".72rem", color:"var(--gray-500)" }}>∝ log(case count)</div>
            </div>
          </div>

          {!loading && visibleCountries.length > 0 && !selected && (
            <div className="map-tip">💡 Click any circle for details</div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="detail-panel">
          <DetailPanel
            selected={selected}
            isOwid={isOwid}
            onClose={() => setSelected(null)}
          />
        </div>
      </div>
    </div>
  );
}