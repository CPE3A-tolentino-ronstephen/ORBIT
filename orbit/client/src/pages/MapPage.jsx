import { useState, useMemo }                  from "react";
import { MapContainer, TileLayer,
         CircleMarker }                       from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useDisease }                         from "../hooks/useDisease";
import { enrichCountriesWithCoords }          from "../utils/countryCoordinates";

const DISEASES = [
  { key: "covid19",      label: "COVID-19",      },
  { key: "tuberculosis", label: "Tuberculosis", },
  { key: "malaria",      label: "Malaria",       },
  { key: "hiv",          label: "HIV/AIDS",      },
  { key: "mpox",         label: "Mpox",         },
  { key: "cholera",      label: "Cholera",    },
  { key: "measles",      label: "Measles",      },
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

function DetailPopup({ selected, isOwid, activeDisease, onClose }) {
  if (!selected) return null;

  const isHiv = activeDisease === "hiv";

  const baseRows = [
    { label: isHiv ? "New Infections" : "Total Cases", val: fmt(selected.cases) },
    { label: isHiv ? "Annual Deaths"  : "Deaths",      val: fmt(selected.deaths) },
    { label: "Mortality Rate",                          val: fmtPct(selected.caseFatalityRate) },
    ...(!isHiv ? [{ label: "Cases / 1M pop", val: fmt(selected.casesPerMillion) }] : []),
  ];

  const covidRows = [
    { label: "Recovered",       val: fmt(selected.recovered) },
    { label: "Active Cases",    val: fmt(selected.active) },
    { label: "Critical",        val: fmt(selected.critical) },
    { label: "Deaths / 1M pop", val: fmt(selected.deathsPerMillion) },
    { label: "Today + Cases",   val: fmt(selected.todayCases) },
  ];

  const owidRows = [
    { label: "Data Year", val: selected.year ?? "—" },
    { label: "Source",    val: selected.source ?? "OWID / WHO" },
  ];

  const rows = isOwid ? [...baseRows, ...owidRows] : [...baseRows, ...covidRows];

  return (
    <div className="map-detail-overlay" onClick={onClose}>
      <div className="map-detail-card" onClick={e => e.stopPropagation()}>
        <div className="detail-country-header">
          {selected.flag && (
            <img src={selected.flag} alt="" className="detail-flag" />
          )}
          <div>
            <div className="detail-country-name">{selected.country}</div>
            <span style={{ color: riskColor(selected.risk), fontSize: ".72rem", fontWeight: 700 }}>
              {selected.risk} Risk · {selected.riskScore}/100
            </span>
          </div>
          <button onClick={onClose} className="detail-close-btn" aria-label="Close">✕</button>
        </div>
        <div className="detail-rows">
          {rows.map(({ label, val }) => (
            <div className="detail-row" key={label}>
              <span className="detail-row-label">{label}</span>
              <span className="detail-row-val">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [activeDisease, setActiveDisease] = useState("covid19");
  const [activeRisks,   setActiveRisks]   = useState(new Set(RISK_LEVELS.map(r => r.label)));
  const [showLegend,    setShowLegend]    = useState(false);
  const [selected,      setSelected]      = useState(null);

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

  const handleDiseaseChange = (key) => { setActiveDisease(key); setSelected(null); };

  const toggleRisk = (label) => {
    setActiveRisks(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const toggleAll = () => {
    const all = RISK_LEVELS.map(r => r.label);
    setActiveRisks(prev => prev.size === all.length ? new Set() : new Set(all));
  };

  const allChecked = activeRisks.size === RISK_LEVELS.length;

  const subText = loading
    ? "Loading data…"
    : error
    ? "Error loading data"
    : `${visibleCountries.length} of ${mappableCountries.length} countries · ${isOwid ? "OWID / WHO annual data" : "disease.sh real-time"}`;

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

        .map-body { flex:1; min-height:0; }
        .map-wrapper {
          position:relative; border-radius:var(--radius);
          overflow:hidden; border:1px solid var(--border);
          min-height:520px;
          /* Warm off-white background matches Toner Lite ocean color */
          background:#f5f0e8;
        }
        .leaflet-container { width:100%; height:100%; min-height:520px; border-radius:var(--radius); }
        .leaflet-control-attribution {
          font-size:.6rem !important;
          background:rgba(255,255,255,.75) !important;
          backdrop-filter:blur(4px);
        }

        /* ── Loading overlay ── */
        .map-loading {
          position:absolute; inset:0; z-index:2000;
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          background:rgba(245,240,232,.9); backdrop-filter:blur(4px);
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

        /* ── Legend ── */
        .map-legend {
          position:absolute; bottom:1.5rem; left:1rem;
          background:rgba(255,253,248,.97); backdrop-filter:blur(8px);
          border:1px solid rgba(0,0,0,.1); border-radius:var(--radius-sm);
          padding:.875rem 1rem; z-index:1000;
          box-shadow:0 4px 20px rgba(0,0,0,.1);
          min-width:170px;
        }
        .map-legend-title {
          font-size:.68rem; font-weight:700; text-transform:uppercase;
          letter-spacing:.08em; color:var(--gray-500); font-family:var(--font-mono);
          margin-bottom:.5rem;
        }
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

        /* ── Tip ── */
        .map-tip {
          position:absolute; bottom:1.5rem; right:1rem;
          background:rgba(255,253,248,.92); backdrop-filter:blur(6px);
          border:1px solid rgba(0,0,0,.09); border-radius:var(--radius-sm);
          padding:.5rem .875rem; z-index:999;
          font-size:.75rem; color:var(--gray-500); font-family:var(--font-mono);
          box-shadow:0 2px 8px rgba(0,0,0,.07);
        }

        .error-bar {
          background:#fef2f2; border:1px solid #fecaca;
          border-radius:var(--radius-sm); padding:.6rem 1rem;
          font-size:.82rem; color:#dc2626;
          display:flex; align-items:center; justify-content:space-between;
        }

        /* ── Detail popup ── */
        .map-detail-overlay {
          position:absolute; inset:0; z-index:1500;
          display:flex; align-items:center; justify-content:center;
          background:rgba(0,0,0,.3); backdrop-filter:blur(2px);
          animation:fadeIn .18s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .map-detail-card {
          background:#fffdf8;
          border:1px solid rgba(0,0,0,.1);
          border-radius:var(--radius);
          padding:1.25rem 1.5rem;
          width:320px; max-width:calc(100vw - 2rem);
          box-shadow:0 20px 60px rgba(0,0,0,.16);
          animation:slideUp .2s ease;
        }
        @keyframes slideUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .detail-country-header { display:flex; align-items:center; gap:.75rem; margin-bottom:1rem; }
        .detail-flag { width:36px; height:24px; object-fit:cover; border-radius:3px; flex-shrink:0; }
        .detail-country-name { font-size:1.05rem; font-weight:800; color:var(--gray-900); }
        .detail-close-btn {
          margin-left:auto; background:none; border:none;
          cursor:pointer; color:var(--gray-400); font-size:1rem;
          line-height:1; padding:.2rem .4rem; border-radius:4px;
          transition:background .15s, color .15s;
        }
        .detail-close-btn:hover { background:var(--gray-100); color:var(--gray-700); }
        .detail-rows { display:flex; flex-direction:column; }
        .detail-row {
          display:flex; justify-content:space-between; align-items:center;
          padding:.45rem 0; border-bottom:1px solid var(--border); font-size:.875rem;
        }
        .detail-row:last-child { border-bottom:none; }
        .detail-row-label { color:var(--gray-500); }
        .detail-row-val { font-weight:700; color:var(--gray-900); font-family:var(--font-mono); font-size:.85rem; }
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
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-bar">
          <span>⚠ {error}</span>
          <button onClick={refetch} style={{ background:"none", border:"none", cursor:"pointer", fontWeight:700, color:"#dc2626" }}>
            Retry
          </button>
        </div>
      )}

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
            worldCopyJump={false}
            maxBounds={[[-90, -180], [90, 180]]}
            style={{ width:"100%", height:"100%", minHeight:520 }}
          >
            {/*
              Stadia Maps — Stamen Toner Lite
              ─────────────────────────────────────────────────────────
              Classic black-on-white cartographic aesthetic.
              All labels (countries, continents, cities) are in English.
              Free to use with attribution. No API key required.
              URL pattern: /stamen_toner_lite/{z}/{x}/{y}{r}.png
            */}
            <TileLayer
             url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
                  fillOpacity: 0.72,
                  weight:      1.5,
                  opacity:     1,
                }}
                eventHandlers={{ click: () => setSelected(c) }}
              />
            ))}
          </MapContainer>

          {/* Floating detail card */}
          <DetailPopup
            selected={selected}
            isOwid={isOwid}
            activeDisease={activeDisease}
            onClose={() => setSelected(null)}
          />

          {/* Legend */}
          <div className="map-legend">
            <div
              className="map-legend-title"
              onClick={() => setShowLegend(!showLegend)}
              style={{ cursor:"pointer" }}
            >
              Risk Level {showLegend ? "▼" : "▶"}
            </div>
            {showLegend && (
              <>
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
                    <div className="legend-dot" style={{ background: color, opacity: activeRisks.has(label) ? 1 : 0.3 }} />
                    <span style={{ opacity: activeRisks.has(label) ? 1 : 0.4 }}>{label}</span>
                    <span className="legend-range">{range}</span>
                  </label>
                ))}
                <div style={{ marginTop:".6rem", paddingTop:".5rem", borderTop:"1px solid var(--border)" }}>
                  <div className="map-legend-title" style={{ marginBottom:".2rem" }}>Circle Size</div>
                  <div style={{ fontSize:".72rem", color:"var(--gray-500)" }}>∝ log(case count)</div>
                </div>
              </>
            )}
          </div>

          {!loading && visibleCountries.length > 0 && !selected && (
            <div className="map-tip">Click any circle for details</div>
          )}
        </div>
      </div>
    </div>
  );
}
