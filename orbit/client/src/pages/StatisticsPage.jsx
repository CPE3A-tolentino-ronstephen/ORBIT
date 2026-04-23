import { useState, useMemo }          from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useDisease }                  from "../hooks/useDisease";
import { enrichCountriesWithCoords }   from "../utils/countryCoordinates";

const DISEASES = [
  { key: "covid19",      label: "COVID-19",      },
  { key: "tuberculosis", label: "Tuberculosis",  },
  { key: "malaria",      label: "Malaria",       },
  { key: "hiv",          label: "HIV/AIDS",     },
  { key: "mpox",         label: "Mpox",         },
  { key: "cholera",      label: "Cholera",      },
  { key: "measles",      label: "Measles",      },
];

const CONTINENT_COLORS = {
  "Asia":          "#3b82f6",
  "Africa":        "#f59e0b",
  "Europe":        "#8b5cf6",
  "North America": "#10b981",
  "South America": "#f97316",
  "Oceania":       "#06b6d4",
  "Other":         "#94a3b8",
};

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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
      padding: "12px 16px", boxShadow: "0 4px 16px rgba(0,0,0,.1)",
      fontFamily: "var(--font-body)", fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#111827" }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: p.color, display: "inline-block",
          }} />
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

function NoData({ text = "No data available" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: 200, color: "var(--gray-400)", fontSize: 14,
      textAlign: "center", flexDirection: "column", gap: 8,
    }}>
      <span style={{ fontSize: 24 }}>📭</span>
      {text}
    </div>
  );
}

export default function StatisticsPage() {
  const [activeDisease, setActiveDisease] = useState("covid19");
  const [topN,          setTopN]          = useState(10);
  const [covidYearly,   setCovidYearly]   = useState(false);

  const isHiv   = activeDisease === "hiv";
  const isCovid = activeDisease === "covid19";

  const {
    global, countries, historical, continents,
    loading, error, isOwid, refetch,
  } = useDisease(activeDisease);

  const {
    historical: yearlyHistorical,
    loading:    yearlyLoading,
  } = useDisease(isCovid ? "covid19_yearly" : null);

  const trendData    = isCovid && covidYearly ? (yearlyHistorical ?? []) : historical;
  const trendLoading = isCovid && covidYearly ? yearlyLoading : loading;

  const topCountries = useMemo(
    () => [...countries].sort((a, b) => b.cases - a.cases).slice(0, topN),
    [countries, topN]
  );

  const topByMortality = useMemo(
    () => [...countries]
      .filter(c => c.caseFatalityRate > 0 && c.cases > 1000)
      .sort((a, b) => b.caseFatalityRate - a.caseFatalityRate)
      .slice(0, topN),
    [countries, topN]
  );

  const continentPie = useMemo(() => {
    if (!isOwid) {
      return continents
        .map(c => ({ name: c.continent, value: c.cases || 0 }))
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value);
    }
    const enriched = enrichCountriesWithCoords(countries);
    const byContinent = {};
    enriched.forEach(c => {
      const cont = c.continent || "Other";
      byContinent[cont] = (byContinent[cont] || 0) + (c.cases || 0);
    });
    return Object.entries(byContinent)
      .map(([name, value]) => ({ name, value }))
      .filter(c => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [countries, continents, isOwid]);

  const riskBands = useMemo(() => {
    const bands = { Critical: 0, High: 0, Moderate: 0, Low: 0, Minimal: 0 };
    countries.forEach(c => {
      const key = c.risk;
      if (key in bands) bands[key]++;
      else              bands.Minimal++;
    });
    return [
      { label: "Critical", color: "#dc2626", count: bands.Critical },
      { label: "High",     color: "#ea580c", count: bands.High     },
      { label: "Moderate", color: "#eab308", count: bands.Moderate },
      { label: "Low",      color: "#22c55e", count: bands.Low      },
      { label: "Minimal",  color: "#94a3b8", count: bands.Minimal  },
    ];
  }, [countries]);

  const maxRisk = Math.max(...riskBands.map(b => b.count), 1);

  const kpis = useMemo(() => {
    if (!global) return {};
    return {
      cases:       fmt(global.cases),
      deaths:      fmt(global.deaths),
      cfr:         fmtPct(global.caseFatalityRate),
      recovered:   fmt(global.recovered),
      active:      fmt(global.active),
      critical:    fmt(global.critical),
      todayDeaths: fmt(global.todayDeaths),
      recoveryRate: global.cases > 0
        ? fmtPct((global.recovered / global.cases) * 100)
        : "—",
      year: global.year,
    };
  }, [global]);

  const tickFmt = (v) => {
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
    if (v >= 1_000)     return (v / 1_000).toFixed(0)     + "K";
    return v;
  };

  const trendTitle = isCovid
    ? covidYearly
      ? "📈 Yearly Trend — Cumulative Cases & Deaths (Global)"
      : "📈 30-Day Trend — New Cases & Deaths"
    : "📈 Yearly Trend — Cases & Deaths (Global)";

  const xAxisInterval = (() => {
    if (!isOwid && !covidYearly) return "preserveStartEnd";
    if (activeDisease === "mpox") return 0;
    return 4;
  })();

  return (
    <div className="stats-page page-enter">
      <style>{`
        .stats-page { display:flex; flex-direction:column; gap:1.5rem; }
        .stats-header { display:flex; align-items:flex-end; justify-content:space-between; flex-wrap:wrap; gap:1rem; }
        .stats-title { font-size:1.4rem; font-weight:800; color:var(--gray-900); letter-spacing:-.02em; }
        .stats-tabs { display:flex; gap:.4rem; flex-wrap:wrap; }
        .stats-tab {
          padding:.4rem .8rem; border-radius:99px; font-size:.82rem; font-weight:600;
          cursor:pointer; border:1.5px solid var(--border); background:var(--white);
          color:var(--gray-600); transition:all .18s; font-family:var(--font-body);
        }
        .stats-tab:hover { border-color:var(--orbit-green); color:var(--orbit-green-dim); }
        .stats-tab.active { background:var(--orbit-green); color:white; border-color:var(--orbit-green); box-shadow:var(--shadow-green); }
        .kpi-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:1rem; }
        .kpi-card {
          background:var(--white); border:1px solid var(--border);
          border-radius:var(--radius); padding:1.1rem 1.25rem;
          display:flex; flex-direction:column; gap:.35rem;
        }
        .kpi-label { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--gray-400); font-family:var(--font-mono); }
        .kpi-val { font-family:var(--font-display); font-size:1.15rem; font-weight:800; color:var(--gray-900); letter-spacing:-.03em; min-height:1.15rem; }
        .kpi-sub { font-size:.75rem; color:var(--gray-400); }
        .kpi-skeleton { height:1.15rem; width:72px; border-radius:4px; background:linear-gradient(90deg,var(--gray-100) 25%,var(--gray-200) 50%,var(--gray-100) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .charts-grid { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
        @media (max-width:900px) { .charts-grid { grid-template-columns:1fr; } }
        .chart-card { background:var(--white); border:1px solid var(--border); border-radius:var(--radius); padding:1.5rem; }
        .chart-title { font-size:.95rem; font-weight:700; color:var(--gray-900); margin-bottom:1.25rem; display:flex; align-items:center; gap:.5rem; }
        .chart-span { grid-column:1/-1; }
        .n-btn { padding:.25rem .6rem; border-radius:6px; font-size:.75rem; font-weight:600; border:1px solid var(--border); background:var(--gray-50); cursor:pointer; font-family:var(--font-body); color:var(--gray-600); transition:all .15s; }
        .n-btn.active { background:var(--orbit-green); color:white; border-color:var(--orbit-green); }
        .trend-toggle { display:flex; gap:.4rem; margin-left:auto; }
        .risk-dist { display:flex; flex-direction:column; gap:.6rem; }
        .risk-dist-row { display:flex; align-items:center; gap:.75rem; font-size:.85rem; }
        .risk-dist-label { width:70px; font-weight:600; }
        .risk-dist-bar { flex:1; height:10px; border-radius:99px; background:var(--gray-100); overflow:hidden; }
        .risk-dist-fill { height:100%; border-radius:99px; transition:width .6s ease; }
        .risk-dist-count { width:50px; text-align:right; font-family:var(--font-mono); font-size:.78rem; color:var(--gray-500); }
        .error-bar { background:#fef2f2; border:1px solid #fecaca; border-radius:var(--radius-sm); padding:.75rem 1rem; display:flex; align-items:center; justify-content:space-between; font-size:.875rem; color:#dc2626; }
        .data-badge { font-size:.72rem; color:var(--gray-400); font-family:var(--font-mono); padding:.2rem .5rem; background:var(--gray-50); border:1px solid var(--border); border-radius:4px; }
      `}</style>

      {/* Header */}
      <div className="stats-header">
        <div>
          <div className="stats-title">📊 Statistical Analysis</div>
          <div style={{ display:"flex", alignItems:"center", gap:".5rem", marginTop:".2rem" }}>
            <span style={{ fontSize:".85rem", color:"var(--gray-400)" }}>
              {loading ? "Loading…" : `${countries.length} countries loaded`}
            </span>
            {!loading && (
              <span className="data-badge">
                {isOwid ? `OWID / WHO · ${kpis.year ?? "annual"}` : "disease.sh · real-time"}
              </span>
            )}
          </div>
        </div>
        <div className="stats-tabs">
          {DISEASES.map(d => (
            <button
              key={d.key}
              className={`stats-tab ${activeDisease === d.key ? "active" : ""}`}
              onClick={() => { setActiveDisease(d.key); setCovidYearly(false); }}
            >
             {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="error-bar">
          <span>⚠ {error}</span>
          <button onClick={refetch} style={{ background:"none", border:"none", cursor:"pointer", fontWeight:700, color:"#dc2626" }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-row">
        {isHiv ? (
          <>
            <div className="kpi-card">
              <div className="kpi-label">New Infections</div>
              {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.cases ?? "—"}</div>}
              <div className="kpi-sub">as of {kpis.year ?? "—"}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Annual Deaths</div>
              {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.deaths ?? "—"}</div>}
              <div className="kpi-sub">as of {kpis.year ?? "—"}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Countries</div>
              {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{String(countries.length || "0")}</div>}
              <div className="kpi-sub">with data</div>
            </div>
          </>
        ) : (
          <>
            <div className="kpi-card">
              <div className="kpi-label">Global Cases</div>
              {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.cases ?? "—"}</div>}
              <div className="kpi-sub">{isOwid ? `as of ${kpis.year ?? "—"}` : "cumulative"}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Global Deaths</div>
              {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.deaths ?? "—"}</div>}
              <div className="kpi-sub">{isOwid ? `as of ${kpis.year ?? "—"}` : "cumulative"}</div>
            </div>
            {!isCovid && (
              <div className="kpi-card">
                <div className="kpi-label">Mortality Rate</div>
                {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.cfr ?? "—"}</div>}
                <div className="kpi-sub">deaths ÷ cases</div>
              </div>
            )}
            <div className="kpi-card">
              <div className="kpi-label">Countries</div>
              {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{String(countries.length || "0")}</div>}
              <div className="kpi-sub">with data</div>
            </div>
            {!isOwid && (
              <>
                <div className="kpi-card">
                  <div className="kpi-label">Recovery Rate</div>
                  {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.recoveryRate ?? "—"}</div>}
                  <div className="kpi-sub">recovered / cases</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Critical</div>
                  {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.critical ?? "—"}</div>}
                  <div className="kpi-sub">serious condition</div>
                </div>
                <div className="kpi-card">
                  <div className="kpi-label">Today Deaths</div>
                  {loading ? <div className="kpi-skeleton" /> : <div className="kpi-val">{kpis.todayDeaths ? `+${kpis.todayDeaths}` : "—"}</div>}
                  <div className="kpi-sub">last 24h</div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Charts */}
      <div className="charts-grid">

        {/* Trend chart */}
        <div className="chart-card chart-span">
          <div className="chart-title">
            {trendTitle}
            {isCovid && (
              <div className="trend-toggle">
                <button className={`n-btn ${!covidYearly ? "active" : ""}`} onClick={() => setCovidYearly(false)}>30-Day</button>
                <button className={`n-btn ${covidYearly  ? "active" : ""}`} onClick={() => setCovidYearly(true)}>Yearly</button>
              </div>
            )}
          </div>
          {trendLoading ? (
            <NoData text="Loading trend data…" />
          ) : !trendData?.length ? (
            <NoData text="No historical data available" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ top:4, right:16, left:0, bottom:0 }}>
                <defs>
                  <linearGradient id="gCases"  x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gDeaths" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize:11, fontFamily:"var(--font-mono)" }}
                  tickLine={false}
                  interval={xAxisInterval}
                  angle={activeDisease === "mpox" ? -35 : 0}
                  textAnchor={activeDisease === "mpox" ? "end" : "middle"}
                  height={activeDisease === "mpox" ? 48 : 30}
                />
                <YAxis
                  tickFormatter={tickFmt}
                  tick={{ fontSize:11, fontFamily:"var(--font-mono)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize:".8rem", fontFamily:"var(--font-body)" }} />
                <Area type="monotone" dataKey="cases"  name={isHiv ? "New Infections" : "Cases"}  stroke="#3b82f6" strokeWidth={2} fill="url(#gCases)"  dot={activeDisease === "mpox"} />
                <Area type="monotone" dataKey="deaths" name={isHiv ? "Annual Deaths"  : "Deaths"} stroke="#ef4444" strokeWidth={2} fill="url(#gDeaths)" dot={activeDisease === "mpox"} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top countries by cases */}
        <div className="chart-card">
          <div className="chart-title">
            🏆 Top Countries by {isHiv ? "New Infections" : "Cases"}
            <div style={{ display:"flex", gap:".4rem", marginLeft:"auto" }}>
              {[5, 10].map(n => (
                <button key={n} className={`n-btn ${topN === n ? "active" : ""}`} onClick={() => setTopN(n)}>Top {n}</button>
              ))}
            </div>
          </div>
          {loading ? <NoData text="Loading…" /> : topCountries.length === 0 ? <NoData text="No country data loaded" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topCountries} layout="vertical" margin={{ top:0, right:16, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tickFormatter={tickFmt} tick={{ fontSize:10, fontFamily:"var(--font-mono)" }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="country" width={90} tick={{ fontSize:11, fontFamily:"var(--font-body)" }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cases" name={isHiv ? "New Infections" : "Cases"} fill="#3b82f6" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bottom-right chart: mortality (OWID), deaths (HIV), or continent pie (COVID/others) */}
        <div className="chart-card">
          {isOwid && !isHiv ? (
            <>
              <div className="chart-title">
                ☠️ Top Countries by Mortality Rate
                <div style={{ display:"flex", gap:".4rem", marginLeft:"auto" }}>
                  {[5, 10].map(n => (
                    <button key={n} className={`n-btn ${topN === n ? "active" : ""}`} onClick={() => setTopN(n)}>Top {n}</button>
                  ))}
                </div>
              </div>
              {loading ? <NoData text="Loading…" /> : topByMortality.length === 0 ? <NoData text="No mortality data available" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topByMortality} layout="vertical" margin={{ top:0, right:16, left:0, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => `${v.toFixed(1)}%`} tick={{ fontSize:10, fontFamily:"var(--font-mono)" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="country" width={90} tick={{ fontSize:11, fontFamily:"var(--font-body)" }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="caseFatalityRate" name="Mortality %" fill="#ef4444" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : isHiv ? (
            <>
              <div className="chart-title">
                ☠️ Top Countries by Annual Deaths
                <div style={{ display:"flex", gap:".4rem", marginLeft:"auto" }}>
                  {[5, 10].map(n => (
                    <button key={n} className={`n-btn ${topN === n ? "active" : ""}`} onClick={() => setTopN(n)}>Top {n}</button>
                  ))}
                </div>
              </div>
              {loading ? <NoData text="Loading…" /> : countries.length === 0 ? <NoData text="No data available" /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={[...countries].filter(c => c.deaths > 0).sort((a,b) => b.deaths - a.deaths).slice(0, topN)}
                    layout="vertical"
                    margin={{ top:0, right:16, left:0, bottom:0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tickFormatter={tickFmt} tick={{ fontSize:10, fontFamily:"var(--font-mono)" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="country" width={90} tick={{ fontSize:11, fontFamily:"var(--font-body)" }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="deaths" name="Annual Deaths" fill="#ef4444" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </>
          ) : (
            <>
              <div className="chart-title">🌍 Cases by Continent</div>
              {loading ? <NoData text="Loading…" /> : continentPie.length === 0 ? <NoData text="No continent data available" /> : (() => {
                const total = continentPie.reduce((s, c) => s + c.value, 0);
                const sorted = [...continentPie].sort((a, b) => a.name.localeCompare(b.name));
                return (
                  <div style={{ display:"flex", alignItems:"center", gap:"1rem", height:260 }}>
                    {/* Left: vertical legend sorted alphabetically */}
                    <div style={{ display:"flex", flexDirection:"column", gap:".6rem", minWidth:155, justifyContent:"center", height:"100%" }}>
                      {sorted.map(({ name, value }) => {
                        const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                        const color = CONTINENT_COLORS[name] ?? CONTINENT_COLORS.Other;
                        return (
                          <div key={name} style={{ display:"flex", alignItems:"center", gap:".45rem", fontSize:".8rem" }}>
                            <span style={{ width:10, height:10, borderRadius:"50%", background:color, flexShrink:0 }} />
                            <span style={{ color:"var(--gray-700)", fontWeight:600, flex:1, whiteSpace:"nowrap" }}>{name}</span>
                            <span style={{ fontFamily:"var(--font-mono)", color:"var(--gray-400)", fontSize:".75rem", marginLeft:"auto" }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Right: pie chart only, no built-in labels or legend */}
                    <div style={{ flex:1, height:"100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={continentPie}
                            cx="50%" cy="50%"
                            outerRadius={105}
                            dataKey="value"
                            nameKey="name"
                            label={false}
                            labelLine={false}
                          >
                            {continentPie.map(({ name }) => (
                              <Cell key={name} fill={CONTINENT_COLORS[name] ?? CONTINENT_COLORS.Other} />
                            ))}
                          </Pie>
                          <Tooltip formatter={v => fmt(v)} contentStyle={{ fontFamily:"var(--font-body)", fontSize:".82rem" }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        {/* Risk distribution */}
        <div className="chart-card">
          <div className="chart-title">⚡ Risk Distribution</div>
          <div className="risk-dist" style={{ paddingTop:".5rem" }}>
            {riskBands.map(({ label, color, count }) => (
              <div className="risk-dist-row" key={label}>
                <div className="risk-dist-label" style={{ color }}>{label}</div>
                <div className="risk-dist-bar">
                  <div
                    className="risk-dist-fill"
                    style={{ width: loading ? "0%" : `${(count / maxRisk) * 100}%`, background: color }}
                  />
                </div>
                <div className="risk-dist-count">{loading ? "…" : count}</div>
              </div>
            ))}
            <div style={{
              marginTop:".75rem", paddingTop:".75rem",
              borderTop:"1px solid var(--border)",
              fontSize:".75rem", color:"var(--gray-400)", fontFamily:"var(--font-mono)",
            }}>
              Based on ORBIT risk scoring (0–100) · {countries.length} countries
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}