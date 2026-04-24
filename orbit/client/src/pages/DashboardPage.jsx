import { useState, useMemo }  from "react";
import { useNavigate }        from "react-router-dom";
import { useAuth }            from "../context/AuthContext";
import { useDisease }         from "../hooks/useDisease";

const DISEASES = [
  { key: "covid19",      label: "COVID-19",      color: "#3b82f6" },
  { key: "tuberculosis", label: "Tuberculosis",  color: "#7c3aed" },
  { key: "malaria",      label: "Malaria",       color: "#16a34a" },
  { key: "hiv",          label: "HIV/AIDS",      color: "#dc2626" },
  { key: "mpox",         label: "Mpox",          color: "#8b5cf6" },
  { key: "cholera",      label: "Cholera",       color: "#0891b2" },
  { key: "measles",      label: "Measles",       color: "#db2777" },
];

function fmt(n) {
  if (n == null || n === "—") return "-";
  const num = Number(n);
  if (isNaN(num) || num === 0) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (num >= 1_000)     return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return num.toLocaleString();
}

function fmtPct(n) {
  if (n == null || n === 0) return "0";
  return `${Number(n).toFixed(2)}%`;
}

function fmtTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({ label, value, sub, accent, loading }) {
  return (
    <div className="card stat-card" style={{ "--accent": accent || "var(--orbit-green)" }}>
      <style>{`
        .stat-card {
          display: flex; flex-direction: column; gap: .5rem;
          padding: 1.25rem 1.5rem;
          border-left: 3px solid var(--accent, var(--orbit-green));
        }
        .stat-card-label {
          font-size: .75rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: .07em;
          color: var(--gray-400); font-family: var(--font-mono);
        }
        .stat-card-val {
          font-family: var(--font-display); font-size: 1.3rem;
          font-weight: 800; color: var(--gray-900);
          letter-spacing: -.03em; line-height: 1;
          min-height: 1.3rem;
        }
        .stat-card-sub { font-size: .8rem; color: var(--gray-400); }
        .stat-skeleton {
          height: 1.3rem; width: 80px; border-radius: 4px;
          background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <div className="stat-card-label">{label}</div>
      {loading
        ? <div className="stat-skeleton" />
        : <div className="stat-card-val">{value ?? "—"}</div>
      }
      {sub && !loading && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function CountryRow({ item, onClick, rank, isOwid, activeDisease }) {
  const isHiv = activeDisease === "hiv";
  return (
    <tr
      onClick={onClick}
      tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick()}
      style={{ cursor: "pointer" }}
    >
      <td>
        <span style={{ fontFamily:"var(--font-mono)", color:"var(--gray-400)", fontSize:".8rem" }}>
          {String(rank).padStart(2, "0")}
        </span>
      </td>
      <td>
        <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
          {item.flag && (
            <img
              src={item.flag} alt=""
              style={{ width:22, height:15, objectFit:"cover", borderRadius:3, flexShrink:0 }}
            />
          )}
          <span style={{ fontWeight:600 }}>{item.country}</span>
          {isOwid && item.year && (
            <span style={{ fontSize:".7rem", color:"var(--gray-400)", fontFamily:"var(--font-mono)" }}>
              {item.year}
            </span>
          )}
        </div>
      </td>
      <td className="hide-mobile mono">{fmt(item.cases)}</td>
      <td className="hide-mobile mono" style={{ color:"var(--risk-critical)" }}>
        {fmt(item.deaths)}
      </td>
      <td className="hide-mobile mono" style={{ color:"var(--gray-500)" }}>
        {fmtPct(item.caseFatalityRate)}
      </td>
      <td>
        <div style={{ display:"flex", alignItems:"center", gap:".6rem" }}>
          <div className="risk-bar" style={{ width:64, flexShrink:0 }}>
            <div
              className="risk-bar-fill"
              style={{ width:`${item.riskScore ?? 0}%`, background:"#6b7280" }}
            />
          </div>
          <span style={{ fontFamily:"var(--font-mono)", fontSize:".75rem", color:"#6b7280", fontWeight:700 }}>
            {item.riskScore ?? 0}
          </span>
        </div>
      </td>
    </tr>
  );
}

function DetailPanel({ selected, isOwid, activeDisease, onClose }) {
  if (!selected) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🌍</div>
        <p style={{ fontSize:".875rem" }}>
          Select a country from the table<br />to see detailed statistics
        </p>
      </div>
    );
  }

  const isHiv  = activeDisease === "hiv";
  const isCovid = activeDisease === "covid19"; 
  const rateLabel = isHiv ? "Infection-to-Death Ratio" : "Case Fatality Rate";

  const baseRows = [
    {
      label: isHiv ? "New Infections"  : "Total Cases",
      val:   fmt(selected.cases),
    },
    {
      label: isHiv ? "Annual Deaths"   : "Deaths",
      val:   fmt(selected.deaths),
    },
    {
      label: rateLabel, 
      val:   isHiv
        ? Number(selected.caseFatalityRate).toFixed(2)
        : fmtPct(selected.caseFatalityRate),
    },
    ...(!isHiv
      ? [{ label: "Cases / 1M pop", val: fmt(selected.casesPerMillion) }]
      : []
    ),
  ];

  const covidRows = [
    { label: "Recovered",        val: fmt(selected.recovered) },
    { label: "Active Cases",     val: fmt(selected.active) },
    { label: "Critical",         val: fmt(selected.critical) },
    { label: "Deaths / 1M pop",  val: fmt(selected.deathsPerMillion) },
    { label: "Data Year",        val: selected.dataYear ? String(selected.dataYear) : "—" },
  ];

  const owidRows = [
    { label: "Data Year", val: selected.year ?? "—" },
    { label: "Source",    val: selected.source ?? "OWID / WHO" },
  ];

  const rows = isOwid
    ? [...baseRows, ...owidRows]
    : [...baseRows, ...covidRows];

  return (
    <>
      <div className="detail-country-header">
        {selected.flag && (
          <img src={selected.flag} alt="" className="detail-flag" />
        )}
        <div>
          <div className="detail-country-name">{selected.country}</div>
          <span className={`badge badge-${(selected.risk ?? "").toLowerCase()}`}>
            {selected.risk} · Risk {selected.riskScore}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            marginLeft:"auto", background:"none", border:"none",
            cursor:"pointer", color:"var(--gray-400)", fontSize:"1.1rem"
          }}
          aria-label="Close"
        >✕</button>
      </div>

      {rows.map(({ label, val }) => (
        <div className="detail-row" key={label}>
          <span className="detail-row-label">{label}</span>
          <span className="detail-row-val">{val}</span>
        </div>
      ))}
    </>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [activeDisease, setActiveDisease] = useState("covid19");
  const [search,        setSearch]        = useState("");
  const [sortBy,        setSortBy]        = useState("cases");
  const [selected,      setSelected]      = useState(null);

  const {
    global,
    countries,
    loading,
    error,
    isOwid,
    refetch,
  } = useDisease(activeDisease);

  const handleDiseaseChange = (key) => {
    setActiveDisease(key);
    setSelected(null);
    setSearch("");
  };

  const filtered = useMemo(() => {
    const searched = countries.filter(c =>
      c.country.toLowerCase().includes(search.toLowerCase())
    );
    return [...searched].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));
  }, [countries, search, sortBy]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const isHiv   = activeDisease === "hiv";
  const isCovid = activeDisease === "covid19"; 
  const rateLabel = isHiv ? "Infection-to-Death Ratio" : "Case Fatality Rate"; 

  const globalStats = useMemo(() => {
    if (!global) return {};
    const dataYear = global.dataYear ?? global.year ?? null;
    return {
      cases:    fmt(global.cases),
      deaths:   fmt(global.deaths),
       cfr:      isHiv
        ? Number(global.caseFatalityRate).toFixed(2)
        : fmtPct(global.caseFatalityRate),
      recovered: fmt(global.recovered),
      active:   fmt(global.active),
      critical: fmt(global.critical),
      dataYear: dataYear ? `Data as of ${dataYear}` : null,
    };
  }, [global, isHiv]);


  return (
    <div className="dashboard page-enter">
      <style>{`
        .dashboard { display: flex; flex-direction: column; gap: 1.5rem; }
        .dash-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem;
        }
        .dash-greeting { font-size: .85rem; color: var(--black-400); margin-bottom: .25rem; }
        .dash-title { font-size: 1.5rem; font-weight: 800; color: var(--gray-900); letter-spacing: -.02em; }
        .disease-tabs { display: flex; gap: .5rem; flex-wrap: wrap; }
        .disease-tab {
          display: flex; align-items: center; gap: .4rem;
          padding: .5rem 1rem; border-radius: 99px;
          font-size: .85rem; font-weight: 600; cursor: pointer;
          border: 1.5px solid var(--border);
          background: var(--white); color: var(--gray-600);
          transition: all .18s ease; font-family: var(--font-body);
        }
        .disease-tab:hover { border-color: var(--orbit-green); color: var(--orbit-green-dim); }
        .disease-tab.active {
          background: var(--orbit-green); color: white;
          border-color: var(--orbit-green); box-shadow: var(--shadow-green);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }
        .dash-body { display: grid; grid-template-columns: 1fr 340px; gap: 1.25rem; }
        @media (max-width: 900px) { .dash-body { grid-template-columns: 1fr; } }
        .table-card { overflow: hidden; }
        .table-toolbar {
          display: flex; align-items: center; gap: .75rem;
          padding: 1rem 1.25rem; border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
        }
        .table-title { font-weight: 700; color: var(--gray-900); flex: 1; min-width: 120px; }
        .search-input {
          padding: .45rem .875rem; border: 1px solid var(--border);
          border-radius: var(--radius-sm); font-family: var(--font-body);
          font-size: .875rem; color: var(--gray-700); background: var(--gray-50);
          outline: none; width: 180px; transition: border-color .15s;
        }
        .search-input:focus { border-color: var(--orbit-green); background: white; }
        .sort-select {
          padding: .45rem .75rem; border: 1px solid var(--border);
          border-radius: var(--radius-sm); font-family: var(--font-body);
          font-size: .875rem; color: var(--gray-700); background: var(--gray-50);
          outline: none; cursor: pointer;
        }
        .table-body { overflow-y: auto; max-height: 520px; }
        .detail-panel { display: flex; flex-direction: column; gap: 1rem; }
        .detail-card { padding: 1.25rem; }
        .detail-country-header {
          display: flex; align-items: center; gap: .75rem; margin-bottom: 1.25rem;
        }
        .detail-flag { width: 40px; height: 26px; object-fit: cover; border-radius: 4px; }
        .detail-country-name { font-size: 1.1rem; font-weight: 800; color: var(--gray-900); }
        .detail-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: .5rem 0; border-bottom: 1px solid var(--border); font-size: .875rem;
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-row-label { color: var(--gray-500); }
        .detail-row-val { font-weight: 700; color: var(--gray-900); font-family: var(--font-mono); }
        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: .75rem; padding: 3rem 1.5rem; color: var(--gray-400); text-align: center;
        }
        .empty-icon { font-size: 2.5rem; opacity: .5; }
        .map-cta {
          background: linear-gradient(135deg, var(--orbit-green-bg), white);
          border: 1px solid var(--border-em); border-radius: var(--radius);
          padding: 1.25rem; display: flex; flex-direction: column; gap: .75rem;
        }
        .map-cta h4 { font-size: .95rem; font-weight: 700; color: var(--gray-900); }
        .map-cta p  { font-size: .82rem; color: var(--gray-500); }
        .data-source-badge {
          font-size: .72rem; color: var(--gray-400); font-family: var(--font-mono);
          padding: .2rem .5rem; background: var(--gray-50);
          border: 1px solid var(--border); border-radius: 4px;
        }
        .error-bar {
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: var(--radius-sm); padding: .75rem 1rem;
          display: flex; align-items: center; justify-content: space-between;
          font-size: .875rem; color: #dc2626;
        }
      `}</style>

      <div className="dash-header">
        <div>
          
          <div className="dash-title">Global Outbreak Intelligence</div>
          <div className="dash-greeting">Select Subject, Explore Data by Disease</div>
        </div>
        <div className="disease-tabs">
          {DISEASES.map(d => (
            <button
              key={d.key}
              className={`disease-tab ${activeDisease === d.key ? "active" : ""}`}
              onClick={() => handleDiseaseChange(d.key)}
            >
              {d.icon} {d.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="error-bar">
          <span>⚠ {error}</span>
          <button
            onClick={refetch}
            style={{ background:"none", border:"none", cursor:"pointer",
                     fontWeight:700, color:"#dc2626", fontFamily:"var(--font-body)" }}
          >
            Retry
          </button>
        </div>
      )}

      <div className="stats-grid">
        <StatCard
          label={isHiv ? "New Infections" : "Total Cases"}
          value={globalStats.cases}
          sub={globalStats.dataYear}
          accent="#3b82f6"
          loading={loading}
        />
        <StatCard
          label={isHiv ? "Annual Deaths" : "Total Deaths"}
          value={globalStats.deaths}
          sub={globalStats.dataYear}
          accent="#dc2626"
          loading={loading}
        />
        {activeDisease !== "covid19" && (
          <StatCard
            label={rateLabel} 
            value={globalStats.cfr}
            sub={isHiv ? "new infections ÷ death" : "deaths ÷ cases"}
            accent="#f59e0b"
            loading={loading}
          />
        )}
  
        {!isOwid && (
  <>
    <StatCard
      label="Recovered"
      value={globalStats.recovered}
      sub="cumulative"
      accent="#10b981"
      loading={loading}
    />
    <StatCard
      label={isCovid ? "Case Fatality Rate" : "Active Cases"}
      value={isCovid ? globalStats.cfr : globalStats.active}
      sub={isCovid ? "deaths / cases" : "currently infected"}
      accent="#f59e0b"
      loading={loading}
    />
    <StatCard
      label="Critical"
      value={globalStats.critical}
      sub="in serious condition"
      accent="#ef4444"
      loading={loading}
    />
  </>
)}
      </div>

      <div className="dash-body">

        <div className="card table-card" style={{ padding: 0 }}>
          <div className="table-toolbar">
            <div className="table-title">
              Countries — {filtered.length} tracked
            </div>
            <span className="data-source-badge">
              {isOwid ? "OWID / WHO" : "disease.sh"}
            </span>
            <input
              className="search-input"
              placeholder="Search country"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="sort-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="cases">Sort: Cases</option>
              <option value="deaths">Sort: Deaths</option>
              <option value="caseFatalityRate">{isHiv ? "Sort: Infection-to-Death Ratio" : "Sort: Case Fatality Rate"}</option>
              <option value="riskScore">Sort: Risk</option>
            </select>
          </div>

          <div className="table-body">
            {loading ? (
              <table className="data-table">
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j}>
                          <div style={{
                            height: ".85rem", borderRadius: 4,
                            background: "var(--gray-100)",
                            width: j === 1 ? "120px" : "60px",
                            animation: "shimmer 1.4s infinite",
                          }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Country</th>
                    <th className="hide-mobile">
                      {isHiv ? "New Infections" : "Cases"}
                    </th>
                    <th className="hide-mobile">
                      {isHiv ? "Annual Deaths" : "Deaths"}
                    </th>
                    <th className="hide-mobile">{isHiv ? "Infection-to-Death Ratio" : "Case Fatality Rate"}</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty-state">
                          <div className="empty-icon">📭</div>
                          <p style={{ fontSize: ".875rem" }}>
                            {search ? `No results for "${search}"` : "No data available"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c, i) => (
                      <CountryRow
                        key={(c.countryCode || c.country) + i}
                        item={c}
                        rank={i + 1}
                        isOwid={isOwid}
                        activeDisease={activeDisease}
                        onClick={() => setSelected(c)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="detail-panel">
          <div className="map-cta">
            <div style={{ fontSize: "1.5rem" }}>🗺</div>
            <h4>View Interactive Map</h4>
            <p>Analyze global outbreaks with color-coded risk data.</p>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => navigate("/map")}
            >
              Open Live Map
            </button>
          </div>

          <div className="card detail-card">
            <DetailPanel
              selected={selected}
              isOwid={isOwid}
              activeDisease={activeDisease}
              onClose={() => setSelected(null)}
            />
          </div>

        </div>
      </div>
    </div>
  );
}