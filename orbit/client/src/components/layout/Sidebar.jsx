import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", icon: "⬡", label: "Dashboard" },
  { to: "/map", icon: "◈", label: "Live Map" },
  { to: "/statistics", icon: "▦", label: "Statistics" },
];

export default function Sidebar({ collapsed }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <style>{`
        .sidebar {
          width: var(--sidebar-w);
          min-width: var(--sidebar-w);
          background: var(--white);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: width .25s ease, min-width .25s ease;
          z-index: 100;
          overflow: hidden;
        }
        
        .sidebar.collapsed { 
          width: 68px; 
          min-width: 68px; 
        }

        .sidebar-brand {
          padding: 20px 20px 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          text-decoration: none;
        }
        
        .orbit-logo {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, var(--orbit-green), var(--orbit-green-dim));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: var(--shadow-green);
          overflow: hidden;
        }

        .orbit-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
                
        .orbit-wordmark strong {
          display: block;
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: .05em;
          white-space: nowrap;
        }
        
        .orbit-wordmark span {
          font-size: 10.4px;
          color: var(--gray-400);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 11.2px 14px;
          border-radius: var(--radius-sm);
          color: var(--gray-600);
          text-decoration: none;
          font-size: 14.4px;
          font-weight: 500;
          transition: all .18s ease;
          white-space: nowrap;
          overflow: hidden;
        }
        
        .nav-link:hover { 
          background: var(--orbit-green-bg); 
          color: var(--orbit-green-dim); 
        }
        
        .nav-link.active { 
          background: var(--orbit-green-bg); 
          color: var(--orbit-green-dim); 
          font-weight: 600; 
        }
        
        .nav-link.active .nav-icon { 
          background: var(--orbit-green); 
          color: white; 
        }
        
        .nav-icon {
          width: 32px; 
          height: 32px;
          border-radius: 7px;
          background: var(--gray-100);
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          transition: all .18s ease;
        }

        .sidebar-footer {
          padding: 14px 12px;
          border-top: 1px solid var(--border);
        }
        
        .user-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px;
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        
        .user-avatar {
          width: 34px; 
          height: 34px;
          border-radius: 50%;
          background: var(--orbit-green-bg);
          border: 2px solid var(--orbit-green-pale);
          flex-shrink: 0;
          object-fit: cover;
          display: flex; 
          align-items: center; 
          justify-content: center;
          font-size: 14.4px;
        }
        
        .user-name {
          font-size: 13.6px; 
          font-weight: 600; 
          color: var(--gray-800);
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        }
        
        .user-email {
          font-size: 11.52px; 
          color: var(--gray-400);
          font-family: var(--font-mono);
          white-space: nowrap; 
          overflow: hidden; 
          text-overflow: ellipsis;
        }
        
        .logout-btn {
          width: 100%; 
          margin-top: 8px; 
          padding: 8px;
          background: none; 
          border: none; 
          border-radius: var(--radius-sm);
          color: var(--gray-400); 
          font-size: 12.8px; 
          cursor: pointer;
          display: flex; 
          align-items: center; 
          gap: 6.4px;
          font-family: var(--font-body); 
          transition: all .15s;
          white-space: nowrap; 
          overflow: hidden;
        }
        
        .logout-btn:hover { 
          color: var(--risk-critical); 
          background: #fee2e2; 
        }

        @media (max-width: 768px) { 
          .sidebar { display: none; } 
        }
      `}</style>

      <NavLink to="/dashboard" className="sidebar-brand" style={{ textDecoration: "none" }}>
        <div className="orbit-logo">
          <img src="/logo.png" alt="O.R.B.I.T. Logo" />
        </div>
        {!collapsed && (
          <div className="orbit-wordmark">
            <strong>O.R.B.I.T.</strong>
            <span>Disease Tracker</span>
          </div>
        )}
      </NavLink>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} className="nav-link">
            <span className="nav-icon">{icon}</span>
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip">
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar" className="user-avatar" />
            : <div className="user-avatar">👤</div>
          }
          {!collapsed && (
            <div style={{ overflow: "hidden" }}>
              <div className="user-name">{user?.name || "Researcher"}</div>
              <div className="user-email">{user?.email}</div>
            </div>
          )}
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          <span>←</span>
          {!collapsed && "Sign Out"}
        </button>
      </div>
    </aside>
  );
}
