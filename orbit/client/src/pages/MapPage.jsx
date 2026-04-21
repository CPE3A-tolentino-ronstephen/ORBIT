import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useDisease } from "../hooks/useDisease";
import DiseaseTabs from "../components/ui/DiseaseTabs";
import CountryDetail from "../components/ui/CountryDetail";
import { fmt, riskColor } from "../utils/format";
import "leaflet/dist/leaflet.css";

const RISK_LEGEND = [
  { label: "Critical", color: "#dc2626", range: "75–100" },
  { label: "High",     color: "#ea580c", range: "50–74"  },
  { label: "Moderate", color: "#eab308", range: "25–49"  },
  { label: "Low",      color: "#22c55e", range: "5–24"   },
  { label: "Minimal",  color: "#94a3b8", range: "0–4"    },
];

function MapMarkers({ countries, onSelect }) {
  return countries
    .filter(c => c.lat && c.lng && c.cases > 0)
    .map((c, i) => {
      const radius = Math.max(4, Math.min(40, Math.sqrt(c.cases / 5000)));
      const color  = riskColor(c.riskScore);
      return (
        <CircleMarker
          key={`${c.countryCode}-${i}`}
          center={[c.lat, c.lng]}
          radius={radius}
          pathOptions={{
            color,
            weight: 1.5,
            opacity: 0.9,
            fillColor: color,
            fillOpacity: 0.55,
          }}
          eventHandlers={{ click: () => onSelect(c) }}
        >
          <Popup>
            <div style={{ fontFamily: "var(--font-body)", minWidth: 200 }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 10,
              }}>
                {c.flag && (
                  <img
                    src={c.flag}
                    alt=""
                    style={{ width: 26, height: 17, objectFit: "cover", borderRadius: 3 }}
                  />
                )}
                <strong style={{ fontSize: 15, color: "#111827" }}>
                  {c.country}
                </strong>
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}>
                <span style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: color,
                  display: "inline-block",
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color }}>
                  {c.risk?.label} Risk · {c.riskScore}/100
                </span>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {[
                    ["Cases",   fmt.number(c.cases)],
                    ["Deaths",  fmt.number(c.deaths)],
                    ["Active",  fmt.number(c.active)],
                    ["Today +", fmt.number(c.todayCases)],
                  ].map(([l, v]) => (
                    <tr key={l}>
                      <td style={{ color: "#6b7280", padding: "3px 0" }}>{l}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>
                        {v}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Popup>
        </CircleMarker>
      );
    });
}

export default function MapPage() {
  const [activeDisease, setActiveDisease] = useState("covid19");
  const [selected, setSelected]           = useState(null);
  const { countries, loading }            = useDisease(activeDisease);

  return (
    <div className="map-page page-enter">
      <style>{`
        .map-page {
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: 100%;
        }

        .map-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }

        .map-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -0.3px;
        }

        .map-sub {
          font-size: 13px;
          color: var(--gray-400);
          margin-top: 3px;
        }

        .map-body {
          display: flex;
          gap: 16px;
          flex: 1;
          min-height: 0;
        }

        .map-wrapper {
          flex: 1;
          position: relative;
          border-radius: var(--radius);
          overflow: hidden;
          border: 1px solid var(--border);
          min-height: 520px;
          background: #f0f4f8;
        }

        .leaflet-container {
          width: 100%;
          height: 100%;
          min-height: 520px;
          border-radius: var(--radius);
        }

        .map-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(4px);
          z-index: 1000;
          flex-direction: column;
          gap: 14px;
          border-radius: var(--radius);
        }

        .map-loading p {
          font-size: 14px;
          color: var(--gray-500);
          font-family: var(--font-mono);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .spinner {
          width: 36px;
          height: 36px;
          border: 3px solid var(--orbit-green-pale);
          border-top-color: var(--orbit-green);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .map-legend {
          position: absolute;
          bottom: 24px;
          left: 16px;
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
          z-index: 1000;
          box-shadow: var(--shadow);
        }

        .map-legend-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.3px;
          color: var(--gray-500);
          font-family: var(--font-mono);
          margin-bottom: 8px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--gray-700);
          margin-bottom: 5px;
          font-weight: 500;
        }

        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .legend-range {
          color: var(--gray-400);
          font-size: 11px;
          font-family: var(--font-mono);
          margin-left: auto;
          padding-left: 8px;
        }

        .map-tip {
          position: absolute;
          bottom: 24px;
          right: 16px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(6px);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 14px;
          z-index: 999;
          font-size: 12px;
          color: var(--gray-500);
          font-family: var(--font-mono);
        }

        .detail-panel {
          width: 270px;
          flex-shrink: 0;
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 900px) {
          .detail-panel { display: none; }
        }
      `}</style>

      {/* Header */}
      <div className="map-header">
        <div>
          <div className="map-title">🗺 Live Outbreak Map</div>
          <div className="map-sub">
            {loading
              ? "Loading..."
              : `${countries.filter(c => c.cases > 0).length} countries with data · Click a circle for details`
            }
          </div>
        </div>
        <DiseaseTabs
          active={activeDisease}
          onChange={d => {
            setActiveDisease(d);
            setSelected(null);
          }}
        />
      </div>

      {/* Body */}
      <div className="map-body">

        {/* Map */}
        <div className="map-wrapper">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            minZoom={1.5}
            maxZoom={8}
            style={{ width: "100%", height: "100%", minHeight: 520 }}
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
            {!loading && (
              <MapMarkers countries={countries} onSelect={setSelected} />
            )}
          </MapContainer>

          {loading && (
            <div className="map-loading">
              <div className="spinner" />
              <p>Fetching outbreak data...</p>
            </div>
          )}

          {/* Legend */}
          <div className="map-legend">
            <div className="map-legend-title">Risk Level</div>
            {RISK_LEGEND.map(({ label, color, range }) => (
              <div className="legend-item" key={label}>
                <div className="legend-dot" style={{ background: color }} />
                <span>{label}</span>
                <span className="legend-range">{range}</span>
              </div>
            ))}
            <div style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px solid var(--border)",
            }}>
              <div className="map-legend-title" style={{ marginBottom: 3 }}>
                Circle Size
              </div>
              <div style={{ fontSize: 11, color: "var(--gray-500)" }}>
                ∝ total case count
              </div>
            </div>
          </div>

          {!loading && countries.length > 0 && !selected && (
            <div className="map-tip">💡 Click any circle for details</div>
          )}
        </div>

        {/* Detail panel */}
        <div className="detail-panel">
          <CountryDetail country={selected} onClose={() => setSelected(null)} />
        </div>

      </div>
    </div>
  );
}
