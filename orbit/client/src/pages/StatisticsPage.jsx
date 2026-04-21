import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useDisease } from "../hooks/useDisease";
import DiseaseTabs from "../components/ui/DiseaseTabs";
import { fmt, riskColor } from "../utils/format";

const CHART_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "white",
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: "12px 16px",
      boxShadow: "0 4px 16px rgba(0,0,0,.1)",
      fontFamily: "var(--font-body)",
      fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: "#111827" }}>
        {label}
      </div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: p.color,
            display: "inline-block",
          }} />
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function StatisticsPage() {
  const [activeDisease, setActiveDisease] = useState("covid19");
  const [topN, setTopN] = useState(10);

  const { countries, historical, continents, global, loading } = useDisease(activeDisease);

  const topCountries = useMemo(() =>
    countries.slice(0, topN).map(c => ({
      name:   c.country.length > 14 ? c.country.slice(0, 13) + "…" : c.country,
      cases:  c.cases,
      deaths: c.deaths,
      color:  riskColor(c.riskScore),
    }))
  , [countries, topN]);

  const timelineData = useMemo(() => {
    if (!historical?.cases) return [];
    const dates = Object.keys(historical.cases).slice(-30);
    return dates.map(date => ({
      date:   new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cases:  historical.cases[date]    || 0,
      deaths: historical.deaths?.[date] || 0,
    }));
  }, [historical]);

  const continentPie = useMemo(() => {
    if (!continents.length) return [];
    return continents
      .map((c, i) => ({
        name:  c.continent || c.country || "Unknown",
        value: c.cases || 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .filter(c => c.value > 0 && c.name !== "Unknown")
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [continents]);

  const cfr = global?.deaths && global?.cases
    ? ((global.deaths / global.cases) * 100).toFixed(2) : "—";
  const recoveryRate = global?.recovered && global?.cases
    ? ((global.recovered / global.cases) * 100).toFixed(1) : "—";

  const isWHO = !["covid19"].includes(activeDisease);

  return (
    <div className="stats-page page-enter">
      <style>{`
        .stats-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .stats-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .stats-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.3px;
        }

        .stats-subtitle {
          font-size: 14px;
          color: var(--gray-400);
          margin-top: 3px;
        }

        .kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .kpi-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .kpi-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.1px;
          color: var(--gray-400);
          font-family: var(--font-mono);
        }

        .kpi-val {
          font-family: var(--font-display);
          font-size: 26px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.5px;
        }

        .kpi-sub {
          font-size: 12px;
          color: var(--gray-400);
        }

        .charts-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        @media (max-width: 900px) {
          .charts-grid { grid-template-columns: 1fr; }
        }

        .chart-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 24px;
        }

        .chart-title {
          font-size: 15px;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chart-span {
          grid-column: 1 / -1;
        }

        .n-btn {
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid var(--border);
          background: var(--gray-50);
          cursor: pointer;
          font-family: var(--font-body);
          color: var(--gray-600);
          transition: all 0.15s;
        }

        .n-btn.active {
          background: var(--orbit-green);
          color: white;
          border-color: var(--orbit-green);
        }

        .no-data {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--gray-400);
          font-size: 14px;
          text-align: center;
          flex-direction: column;
          gap: 8px;
        }

        .who-note {
          font-size: 12px;
          color: var(--gray-400);
          background: var(--gray-50);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
        }

        .risk-dist {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .risk-dist-row {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }

        .risk-dist-label {
          width: 70px;
          font-weight: 600;
        }

        .risk-dist-bar {
          flex: 1;
          height: 10px;
          border-radius: 99px;
          background: var(--gray-100);
          overflow: hidden;
        }

        .risk-dist-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s ease;
        }

        .risk-dist-count {
          width: 50px;
          text-align: right;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--gray-500);
        }
      `}</style>

      {/* Header */}
      <div className="stats-header">
        <div>
          <div className="stats-title">📊 Statistical Analysis</div>
          <div className="stats-subtitle">
            {countries.length} countries loaded
            {isWHO && " · WHO annual data"}
          </div>
        </div>
        <DiseaseTabs active={activeDisease} onChange={setActiveDisease} />
      </div>

      {/* WHO note */}
      {isWHO && (
        <div className="who-note">
          ℹ️ Data source: WHO Global Health Observatory (annual figures).
          Deaths, recovered & critical are tracked separately by WHO for this disease.
        </div>
      )}

      {/* KPI row */}
      <div className="kpi-row">
        {[
          { label: "Global Cases",  val: loading ? "—" : fmt.compact(global?.cases),           sub: "cumulative" },
          { label: "Case Fatality", val: loading ? "—" : cfr + "%",                             sub: "deaths / cases" },
          { label: "Recovery Rate", val: loading ? "—" : recoveryRate + "%",                    sub: "recovered / cases" },
          { label: "Critical",      val: loading ? "—" : fmt.compact(global?.critical),         sub: "serious condition" },
          { label: "Countries",     val: loading ? "—" : countries.length,                      sub: "with data" },
          { label: "Today Deaths",  val: loading ? "—" : `+${fmt.compact(global?.todayDeaths)}`, sub: "last 24h" },
        ].map(({ label, val, sub }) => (
          <div className="kpi-card" key={label}>
            <div className="kpi-label">{label}</div>
            {loading
              ? <div className="skeleton" style={{ height: 29, width: 80 }} />
              : <div className="kpi-val">{val}</div>
            }
            <div className="kpi-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">

        {/* 30-day trend */}
        <div className="chart-card chart-span">
          <div className="chart-title">📈 30-Day Trend — Cases & Deaths</div>
          {loading ? (
            <div className="skeleton" style={{ height: 220 }} />
          ) : timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#dc2626" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tickFormatter={v => fmt.compact(v)}
                  tick={{ fontSize: 11, fontFamily: "var(--font-mono)", fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cases"  name="Cases"  stroke="#10b981" strokeWidth={2} fill="url(#gc)" dot={false} />
                <Area type="monotone" dataKey="deaths" name="Deaths" stroke="#dc2626" strokeWidth={2} fill="url(#gd)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">
              <span style={{ fontSize: 24 }}>📅</span>
              No historical timeline available for this disease source
            </div>
          )}
        </div>

        {/* Top N countries */}
        <div className="chart-card">
          <div className="chart-title">
            🏆 Top Countries by Cases
            <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
              {[5, 10].map(n => (
                <button
                  key={n}
                  className={`n-btn ${topN === n ? "active" : ""}`}
                  onClick={() => setTopN(n)}
                >
                  Top {n}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 220 }} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topCountries} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={v => fmt.compact(v)}
                  tick={{ fontSize: 10, fontFamily: "var(--font-mono)", fill: "#9ca3af" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 10, fontFamily: "var(--font-body)", fill: "#374151" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cases" name="Cases" radius={[0, 4, 4, 0]}>
                  {topCountries.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Continent pie */}
        <div className="chart-card">
          <div className="chart-title">🌍 Cases by Continent</div>
          {loading ? (
            <div className="skeleton" style={{ height: 220 }} />
          ) : continentPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={continentPie}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {continentPie.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Pie>
                <Tooltip formatter={v => v.toLocaleString()} />
                <Legend
                  formatter={v => (
                    <span style={{ fontSize: 12, color: "var(--gray-600)", fontFamily: "var(--font-body)" }}>
                      {v}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">
              <span style={{ fontSize: 24 }}>🌐</span>
              No continent breakdown for this disease
            </div>
          )}
        </div>

        {/* Risk distribution */}
        <div className="chart-card">
          <div className="chart-title">⚡ Risk Distribution</div>
          {loading ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : (() => {
            const bands = [
              { label: "Critical", color: "#dc2626", min: 75, max: 101 },
              { label: "High",     color: "#ea580c", min: 50, max: 75  },
              { label: "Moderate", color: "#eab308", min: 25, max: 50  },
              { label: "Low",      color: "#22c55e", min: 5,  max: 25  },
              { label: "Minimal",  color: "#94a3b8", min: 0,  max: 5   },
            ].map(b => ({
              ...b,
              count: countries.filter(c => c.riskScore >= b.min && c.riskScore < b.max).length,
            }));
            const maxCount = Math.max(...bands.map(b => b.count), 1);
            return (
              <div className="risk-dist" style={{ paddingTop: 8 }}>
                {bands.map(({ label, color, count }) => (
                  <div className="risk-dist-row" key={label}>
                    <div className="risk-dist-label" style={{ color }}>{label}</div>
                    <div className="risk-dist-bar">
                      <div
                        className="risk-dist-fill"
                        style={{ width: `${(count / maxCount) * 100}%`, background: color }}
                      />
                    </div>
                    <div className="risk-dist-count">{count}</div>
                  </div>
                ))}
                <div style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid var(--border)",
                  fontSize: 12,
                  color: "var(--gray-400)",
                  fontFamily: "var(--font-mono)",
                }}>
                  Based on ORBIT risk scoring (0–100) · {countries.length} countries
                </div>
              </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
