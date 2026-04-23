import { useLocation } from "react-router-dom";

const PAGE_TITLES = {
  "/dashboard": { title: "Global Outbreak Intelligence", icon: "⬡" },
  "/map": { title: "Live Outbreak Map", icon: "◈" },
  "/statistics": { title: "Statistical Analysis", icon: "▦" },
};

export default function Header({ onToggleSidebar }) {
  const location = useLocation();
  const page = PAGE_TITLES[location.pathname] || { title: "O.R.B.I.T.", icon: "🛰" };
  const now = new Date().toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="app-header">
      <style>{`
        .app-header {
          height: var(--header-h);
          background: var(--white);
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          padding: 0 24px;
          gap: 16px;
          flex-shrink: 0;
        }
        
        .header-toggle {
          background: none; 
          border: none; 
          cursor: pointer;
          font-size: 17.6px; 
          color: var(--gray-500); 
          padding: 4px;
          border-radius: 6px; 
          transition: all .15s; 
          line-height: 1;
        }
        
        .header-toggle:hover { 
          background: var(--gray-100); 
          color: var(--gray-700); 
        }
        
        .header-page-title {
          display: flex; 
          align-items: center; 
          gap: 8px;
          font-size: 15.2px; 
          font-weight: 700; 
          color: var(--gray-800);
          font-family: var(--font-display);
        }
        
        .header-page-icon {
          width: 28px; 
          height: 28px;
          background: var(--orbit-green-bg);
          border: 1px solid var(--border-em);
          border-radius: 7px;
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-size: 13.6px;
        }
        
        .header-right {
          margin-left: auto;
          display: flex; 
          align-items: center; 
          gap: 16px;
        }
        
        .live-indicator {
          display: flex; 
          align-items: center; 
          gap: 8px;
          font-size: 12.48px; 
          color: var(--gray-500);
          font-family: var(--font-sana);
        }
        
        .header-time {
          font-size: 12.48px; 
          color: var(--gray-400);
          font-family: var(--font-sana);
        }
        
        @media (max-width: 600px) { 
          .header-time { display: none; } 
        }
        
      `}</style>

      <button className="header-toggle" onClick={onToggleSidebar}>☰</button>

      <div className="header-page-title">
        <div className="header-page-icon">{page.icon}</div>
        {page.title}
      </div>

      <div className="header-right">
        <div className="live-indicator">
          <span className="live-dot" />
          LIVE
        </div>
        <div className="header-time">{now}</div>
      </div>
    </header>
  );
}
