export const fmt = {
  number: (n) => (n ?? 0).toLocaleString(),
  compact: (n) => {
    if (!n) return "0";
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString();
  },
  percent: (num, den) =>
    den > 0 ? ((num / den) * 100).toFixed(2) + "%" : "N/A",
  date: (ts) => new Date(ts).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  }),
  relativeTime: (ts) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  },
};

// Risk score to Leaflet map color
export function riskColor(score) {
  if (score >= 75) return "#dc2626"; // critical - red
  if (score >= 50) return "#ea580c"; // high     - orange
  if (score >= 25) return "#eab308"; // moderate - yellow
  if (score >= 5)  return "#22c55e"; // low      - green
  return "#94a3b8";                  // minimal  - grey
}

export function riskColorAlpha(score, alpha = 0.7) {
  const hex = riskColor(score);

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
