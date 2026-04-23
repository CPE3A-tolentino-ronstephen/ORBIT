import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const TICKER_ITEMS = [
  " Global Health Surveillance",
  " Disease Outbreak Data Statistics from 195+ Countries",
  " Historical Trend Analysis",
  " Interactive Outbreak Map",
  " Risk Scoring Across Nations"
];

function GlobeCanvas() {
  const canvasRef = useRef(null);
  const angleRef  = useRef(0);
  const rafRef    = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const R          = canvas.width * 0.44;  
    const cx         = canvas.width  / 2;
    const cy         = canvas.height / 2;
    const LAT_BANDS  = 30; 
    const LON_SEGS   = 60;  
    const GREEN      = "rgba(16,185,129,";

    const TILT = (30 * Math.PI) / 180;

    function project(lat, lon, rotY) {
      const rlat = (lat * Math.PI) / 180;
      const rlon = ((lon + rotY) * Math.PI) / 180;

      const x3 = R * Math.cos(rlat) * Math.sin(rlon);
      const y3 = -R * Math.sin(rlat);
      const z3 = R * Math.cos(rlat) * Math.cos(rlon);

      const y4 = y3 * Math.cos(TILT) - z3 * Math.sin(TILT);
      const z4 = y3 * Math.sin(TILT) + z3 * Math.cos(TILT);

      return { x: cx + x3, y: cy + y4, z: z4 };
    }

    function drawLine(p1, p2, alpha) {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = GREEN + alpha + ")";
      ctx.stroke();
    }

    function render() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const rot = angleRef.current;

      for (let band = 0; band <= LAT_BANDS; band++) {
        const lat = -90 + (band / LAT_BANDS) * 180; 
        const pts = [];
        for (let seg = 0; seg <= LON_SEGS; seg++) {
          const lon = (seg / LON_SEGS) * 360;
          pts.push(project(lat, lon, rot));
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const midZ = (pts[i].z + pts[i + 1].z) / 2;
          const alpha = Math.max(0, Math.min(0.7, (midZ / R) * 0.55 + 0.35));
          ctx.lineWidth = 0.7;
          drawLine(pts[i], pts[i + 1], alpha);
        }
      }

      for (let seg = 0; seg < LON_SEGS; seg++) {
        const lon = (seg / LON_SEGS) * 360;
        const pts = [];
        for (let band = 0; band <= LAT_BANDS; band++) {
          const lat = -90 + (band / LAT_BANDS) * 180;
          pts.push(project(lat, lon, rot));
        }
        for (let i = 0; i < pts.length - 1; i++) {
          const midZ = (pts[i].z + pts[i + 1].z) / 2;
          const alpha = Math.max(0, Math.min(0.7, (midZ / R) * 0.55 + 0.35));
          ctx.lineWidth = 0.7;
          drawLine(pts[i], pts[i + 1], alpha);
        }
      }

      for (let band = 0; band < LAT_BANDS; band++) {
        for (let seg = 0; seg < LON_SEGS; seg++) {
          const lat0 = -90 + (band / LAT_BANDS) * 180;
          const lat1 = -90 + ((band + 1) / LAT_BANDS) * 180;
          const lon0 = (seg / LON_SEGS) * 360;
          const lon1 = ((seg + 1) / LON_SEGS) * 360;
          const A = project(lat0, lon0, rot);
          const B = project(lat1, lon1, rot);
          const midZ = (A.z + B.z) / 2;
          const alpha = Math.max(0, Math.min(0.45, (midZ / R) * 0.38 + 0.22));
          ctx.lineWidth = 0.5;
          drawLine(A, B, alpha);
        }
      }

      for (let band = 0; band < LAT_BANDS; band++) {
        for (let seg = 0; seg < LON_SEGS; seg++) {
          const lat0 = -90 + (band / LAT_BANDS) * 180;
          const lat1 = -90 + ((band + 1) / LAT_BANDS) * 180;
          const lon0 = (seg / LON_SEGS) * 360;
          const lon1 = ((seg - 1 + LON_SEGS) / LON_SEGS) * 360;
          const A = project(lat0, lon0, rot);
          const B = project(lat1, lon1, rot);
          const midZ = (A.z + B.z) / 2;
          const alpha = Math.max(0, Math.min(0.45, (midZ / R) * 0.38 + 0.22));
          ctx.lineWidth = 0.5;
          drawLine(A, B, alpha);
        }
      }

      for (let band = 0; band <= LAT_BANDS; band += 2) {
        const lat = -90 + (band / LAT_BANDS) * 180;
        for (let seg = 0; seg < LON_SEGS; seg += 3) {
          const lon = (seg / LON_SEGS) * 360;
          const p = project(lat, lon, rot);
          if (p.z > 0) {
            const a = Math.max(0, Math.min(0.8, p.z / R));
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = GREEN + (a * 0.9) + ")";
            ctx.fill();
          }
        }
      }

      angleRef.current += 0.12;
      rafRef.current = requestAnimationFrame(render);
    }

    render();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={1200}
      height={1200}
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(1200px, 95vw)",
        height: "min(1200px, 95vw)",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.85,
      }}
    />
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing page-enter">
      <style>{`
        .landing {
          min-height: 100vh;
          background: var(--white);
          display: flex;
          flex-direction: column;
        }

        .ticker {
          background: var(--gray-900);
          color: var(--orbit-green-light);
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 8px 0;
          overflow: hidden;
          white-space: nowrap;
          letter-spacing: 0.5px;
          position: relative;
          z-index: 100;
        }
        .ticker-content {
          display: inline-flex;
          gap: 64px;
          animation: ticker-scroll 30s linear infinite;
        }
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        .lnav {
          padding: 5px 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border);
          background: rgba(255,255,255,.96);
          backdrop-filter: blur(12px);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        
        .lnav-brand { display: flex; align-items: center; gap: 12px; }
        .lnav-logo {
          width: 42px; height: 42px;
          background: linear-gradient(135deg, var(--orbit-green), var(--orbit-green-dim));
          border-radius: 11px;
          display: flex; align-items: center; justify-content: center;
          font-size: 21px;
          box-shadow: var(--shadow-green);
        }
        .lnav-title {
          font-family: var(--font-display);
          font-size: 18px; font-weight: 800;
          color: var(--gray-900); letter-spacing: 0.64px;
        }
        .lnav-sub { font-size: 11px; color: var(--gray-400); font-family: var(--font-mono); }
        .lnav-actions { display: flex; gap: 12px; align-items: center; }

        .auth-logo {
          width: 48px; 
          height: 48px;
          background: linear-gradient(135deg, var(--orbit-green), var(--orbit-green-dim));
          border-radius: 13px;
          display: flex; 
          align-items: center; 
          justify-content: center;
          box-shadow: 0 4px 24px rgba(16,185,129,.4);
          overflow: hidden; 
        }

        .auth-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .hero {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 60px 20px 80px;
          position: relative;
          overflow: hidden;
          min-height: 700px;
        }

        .hero-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 50% -10%, rgba(16,185,129,.10) 0%, transparent 70%),
            radial-gradient(ellipse 40% 30% at 80% 80%, rgba(16,185,129,.06) 0%, transparent 60%);
          pointer-events: none;
        }

        .hero-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(var(--gray-100) 1px, transparent 1px),
            linear-gradient(90deg, var(--gray-100) 1px, transparent 1px);
          background-size: 30px 30px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent);
          pointer-events: none; opacity: .5;
        }

        .hero-horizon {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 200px;
          background: linear-gradient(
            to top,
            rgba(16,185,129,.08) 0%,
            rgba(16,185,129,.03) 50%,
            transparent 100%
          );
          pointer-events: none;
          z-index: 1;
        }

        .hero-scanlines {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(16,185,129,.02) 2px,
            rgba(16,185,129,.02) 3px
          );
          pointer-events: none;
          z-index: 1;
          mix-blend-mode: multiply;
          animation: scanline-drift 8s linear infinite;
        }
        @keyframes scanline-drift {
          from { background-position: 0 0; }
          to   { background-position: 0 60px; }
        }

        .ping-dot {
          position: absolute;
          width: 8px; height: 8px;
          border-radius: 50%;
          background: rgba(16,185,129,.9);
          box-shadow: 0 0 8px 3px rgba(16,185,129,.4);
          animation: ping-pulse 2.8s ease-in-out infinite;
          z-index: 2;
        }
        .ping-dot::after {
          content: "";
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 1.5px solid rgba(16,185,129,.35);
          animation: ping-ring 2.8s ease-in-out infinite;
        }
        @keyframes ping-pulse {
          0%,100% { opacity:.9; transform:scale(1); }
          50%      { opacity:.5; transform:scale(.8); }
        }
        @keyframes ping-ring {
          0%   { transform:scale(1); opacity:.6; }
          100% { transform:scale(3); opacity:0; }
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 800px;
          margin: 0 auto;
        }
        
        .hero h1 {
          font-size: 60px;
          font-weight: 800;
          color: var(--gray-900);
          line-height: 1.1;
          margin-bottom: 105px;
          margin-top: 30px;
          letter-spacing: -1.5px;
        }
        .hero h1 em { 
          font-style: normal;
          color: var(--orbit-green);
          display: inline-block;
        }

        .hero-tagline {
          font-size: 18px;
          color: var(--gray-500);
          max-width: 560px;
          margin: 0 auto 32px;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 60px;
        }

        .hero-stats {
          display: flex;
          gap: 60px;
          flex-wrap: wrap;
          justify-content: center;
          padding-top: 0px;
          border-top: 1px solid var(--border);
          position: relative;
          z-index: 10;
          max-width: 600px;
          margin: 0 auto;
        }
        .hero-stat { text-align: center; }
        .hero-stat-num {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: -.04em;
          display: block;
        }
        .hero-stat-label {
          font-size: 13px;
          color: var(--gray-400);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .features {
          padding: 80px 60px;
          background: var(--gray-50);
          border-top: 1px solid var(--border);
          position: relative;
          z-index: 10;
        }
        .section-label {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--orbit-green);
          margin-bottom: 12px;
        }
        .section-title {
          font-size: 40px;
          font-weight: 800;
          color: var(--gray-900);
          margin-bottom: 48px;
          max-width: 500px;
          letter-spacing: -0.8px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }
        .feature-card {
          background: var(--white);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 28px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .feature-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--orbit-green-bg), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .feature-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-3px);
          border-color: var(--border-em);
        }
        .feature-card:hover::before { opacity: 0.5; }
  
        .feature-card h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--gray-900);
          margin-bottom: 12px;
          position: relative;
        }
        .feature-card p {
          font-size: 14px;
          color: var(--gray-500);
          line-height: 1.6;
          position: relative;
        }

        .landing-footer {
          padding: 32px 60px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          background: var(--white);
          position: relative;
          z-index: 10;
        }
        .landing-footer p {
          font-size: 13px;
          color: var(--gray-400);
          font-family: var(--font-mono);
        }
        .footer-links {
          display: flex;
          gap: 24px;
        }
        .footer-links a {
          font-size: 13px;
          color: var(--gray-400);
          text-decoration: none;
          transition: color .15s;
        }
        .footer-links a:hover { color: var(--orbit-green); }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 99px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
          border: none;
          font-family: inherit;
        }
        .btn-primary {
          background: var(--orbit-green);
          color: white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
        }
        .btn-primary:hover {
          background: var(--orbit-green-dim);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
          transform: translateY(-2px);
        }
        .btn-ghost {
          background: transparent;
          color: var(--gray-900);
          border: 1px solid #cbc1c1;
          box-shadow: 0 2px 8px rgba(228, 218, 218, 0.1);
        }
        .btn-ghost:hover {
          border-color: var(--orbit-green);
          color: var(--orbit-green);
          background: rgba(16, 185, 129, 0.05);
        }

        @media (max-width: 768px) {
          .lnav { padding: 5px 20px; }
          .features { padding: 60px 20px; }
          .landing-footer { padding: 24px 20px; flex-direction: column; text-align: center; }
          .hero h1 { font-size: 50px; }
          .hero-tagline { font-size: 16px; padding: 0 20px; }
          .hero-stats { gap: 30px; }
          .hero-actions { flex-direction: column; align-items: center; }
          .lnav-actions .btn-ghost { display: none; }
        }
        
        @media (max-width: 480px) {
          .hero { padding: 40px 16px 60px; min-height: 600px; }
          .hero h1 { font-size: 28px; }
          .hero-stats { gap: 20px; }
          .hero-stat-num { font-size: 24px; }
        }
      `}</style>

     
      <div className="ticker">
        <div className="ticker-content">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i}>⬡ {item}</span>
          ))}
        </div>
      </div>

  
      <nav className="lnav">
        <div className="lnav-brand">
          <div className="auth-logo">
            <img src="/logo.png" alt="O.R.B.I.T. Logo" />
          </div>
          <div>
            <div className="lnav-title">O.R.B.I.T.</div>
            <div className="lnav-sub">orbitdetection.com</div>
          </div>
        </div>
        <div className="lnav-actions">
          <a href="#features" className="btn btn-ghost">Features</a>
          <button className="btn btn-primary" onClick={() => navigate("/auth")}>
            Sign In
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-scanlines" />
        <div className="hero-horizon" />

        <GlobeCanvas />

        <div className="hero-content">
          <h1>
            OUTBREAK
            REPORTING &<br />
            <em>
             BIOLOGICAL INTELLIGENCE <br/> 
             TRACKER<br/>
             </em>
          </h1>

          <p className="hero-tagline">
            O.R.B.I.T. delivers live outbreak intelligence,
            interactive outbreak maps, and deep statistical analysis across countries
          </p>

          <div className="hero-actions">
            <button
              className="btn btn-primary"
              style={{ padding: "14px 32px", fontSize: "16px" }}
              onClick={() => navigate("/auth")}
            >
               Launch Dashboard
            </button>
            <a href="#features" className="btn btn-ghost" style={{ padding: "14px 32px", fontSize: "16px" }}>
              Explore Features
            </a>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">195+</span>
              <span className="hero-stat-label">Countries Tracked</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">7</span>
              <span className="hero-stat-label">Disease Streams</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">100%</span>
              <span className="hero-stat-label">API Open Data</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="section-label">Platform Capabilities</div>
        <div className="section-title">TRACKING TODAY FOR A HEALTHIER TOMORROW</div>
        <div className="features-grid">
          <div className="feature-card">

            <h3>Interactive Outbreak Map</h3>
            <p>Live heatmap across 195+ countries. Color-coded by risk level. Drill down to country-level detail with a single click.</p>
          </div>
          <div className="feature-card">

            <h3>Statistical Deep Dive</h3>
            <p>Historical trend lines, continent comparisons, case fatality rates, and recovery trajectories.</p>
          </div>
          <div className="feature-card">
  
            <h3>Risk Scoring Analysis</h3>
            <p>Every country receives a 0–100 risk score computed from case density, mortality rate, and active case trajectory.</p>
          </div>
          <div className="feature-card">
     
            <h3>Multi-Disease Tracking</h3>
            <p>Switch between historical known diseases like COVID-19, Mpox, HIV/AIDS, and more.</p>
          </div>
          <div className="feature-card">            
            
            <h3>Global Risk Intelligence</h3>
            <p>A unified risk score is computed for every country using various case ratio to give an at-a-glance picture of where biological threats are most severe worldwide.</p>
          </div>
          <div className="feature-card">            
            
            <h3>Historical Trend Analysis</h3>
            <p>Explore disease progression over time with timeline charts. Compare case fatality rates, recovery trajectories, and active case surges across any tracked disease.</p>
          </div>
          <div className="feature-card">
        
            <h3>Country Detail View</h3>
            <p>Select any country for a full breakdown: total cases, daily new cases, deaths, recovery rate, risk tier, and population-adjusted metrics.</p>
          </div>
          <div className="feature-card">
       
            <h3>Secure Authentication</h3>
            <p>Google Sign-In powered by Firebase. Your session is secure and your data is private.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2026 O.R.B.I.T. | Outbreak Reporting & Biological Intelligence Tracker</p>
        <div className="footer-links">
        <p>All Rights Reserved | Bulacan State University</p>

        </div>
      </footer>
    </div>
  );
}