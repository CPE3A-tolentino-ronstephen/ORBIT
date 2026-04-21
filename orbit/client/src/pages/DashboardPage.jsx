import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useDisease } from "../hooks/useDisease";
import { fmt } from "../utils/format";
import DiseaseTabs from "../components/ui/DiseaseTabs";
import StatCard from "../components/ui/StatCard";
import CountryTable from "../components/ui/CountryTable";
import CountryDetail from "../components/ui/CountryDetail";

export default function DashboardPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [disease, setDisease] = useState("covid19");
  const [search,  setSearch]  = useState("");
  const [sortBy,  setSortBy]  = useState("cases");

  const { global, countries, loading, error, selected, selectCountry, clearSelected } =
    useDisease(disease);

  const filtered = useMemo(() =>
    countries
      .filter(c => c.country.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0))
  , [countries, search, sortBy]);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="dashboard page-enter">
      <style>{`
        .dashboard {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .dash-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .dash-greeting {
          font-size: 14px;
          color: var(--gray-400);
          margin-bottom: 3px;
        }

        .dash-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.3px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(175px, 1fr));
          gap: 16px;
        }

        .dash-body {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 20px;
        }

        @media (max-width: 900px) {
          .dash-body {
            grid-template-columns: 1fr;
          }
        }

        .error-msg {
          background: #fee2e2;
          color: var(--risk-critical);
          border: 1px solid #fca5a5;
          border-radius: var(--radius-sm);
          padding: 16px 20px;
          font-size: 14px;
        }

        .map-cta {
          background: linear-gradient(135deg, var(--orbit-green-bg), white);
          border: 1px solid var(--border-em);
          border-radius: var(--radius);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .map-cta-icon {
          font-size: 24px;
        }

        .map-cta h4 {
          font-size: 15px;
          font-weight: 700;
          color: var(--gray-900);
          margin: 0;
        }

        .map-cta p {
          font-size: 13px;
          color: var(--gray-500);
          margin: 0;
          line-height: 1.5;
        }

        .right-col {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .detail-card {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--white);
          overflow: hidden;
        }
      `}</style>

      {/* Header */}
      <div className="dash-header">
        <div>
          <div className="dash-greeting">
            {greeting}, {user?.name?.split(" ")[0] || "Researcher"} 👋
          </div>
          <div className="dash-title">Global Outbreak Intelligence</div>
        </div>
        <DiseaseTabs
          active={disease}
          onChange={d => {
            setDisease(d);
            clearSelected();
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="error-msg">⚠ Could not load data: {error}</div>
      )}

      {/* KPI Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Cases"
          value={fmt.compact(global?.cases)}
          sub={`+${fmt.compact(global?.todayCases)} today`}
          accent="#3b82f6"
          loading={loading}
        />
        <StatCard
          label="Total Deaths"
          value={fmt.compact(global?.deaths)}
          sub={`+${fmt.compact(global?.todayDeaths)} today`}
          accent="#dc2626"
          loading={loading}
        />
        <StatCard
          label="Recovered"
          value={fmt.compact(global?.recovered)}
          sub="cumulative"
          accent="#10b981"
          loading={loading}
        />
        <StatCard
          label="Active Cases"
          value={fmt.compact(global?.active)}
          sub="currently infected"
          accent="#f59e0b"
          loading={loading}
        />
        <StatCard
          label="Critical"
          value={fmt.compact(global?.critical)}
          sub="serious condition"
          accent="#ef4444"
          loading={loading}
        />
      </div>

      {/* Body */}
      <div className="dash-body">
        <CountryTable
          countries={filtered}
          loading={loading}
          selected={selected}
          onSelect={c => selectCountry(c.country)}
          sortBy={sortBy}
          onSortChange={setSortBy}
          search={search}
          onSearchChange={setSearch}
        />

        <div className="right-col">
          {/* Map CTA */}
          <div className="map-cta">
            <div className="map-cta-icon">🗺</div>
            <h4>View Interactive Map</h4>
            <p>See outbreak heatmap with risk coloring across all countries</p>
            <button
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={() => navigate("/map")}
            >
              Open Live Map →
            </button>
          </div>

          {/* Country Detail */}
          <div className="detail-card">
            <CountryDetail country={selected} onClose={clearSelected} />
          </div>
        </div>
      </div>
    </div>
  );
}
