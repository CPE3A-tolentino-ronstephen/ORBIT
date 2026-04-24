export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <style>{`
        .app-footer {
          padding: 9.6px 24px;
          border-top: 1px solid var(--border);
          background: var(--white);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .footer-left {
          font-size: 11.52px;
          color: var(--gray-400);
          font-family: var(--font-sana);
          display: flex; 
          align-items: center; 
          gap: 8px;
        }
        
        .footer-dot {
          width: 5px; 
          height: 5px;
          border-radius: 50%;
          background: var(--orbit-green);
          display: inline-block;
        }
        
        .footer-right {
          display: flex; 
          align-items: center; 
          gap: 16px;
        }
        
        .footer-link {
          font-size: 11.52px;
          color: var(--gray-400);
          text-decoration: none;
          font-family: var(--font-sana);
          transition: color .15s;
        }
        
        .footer-link:hover { 
          color: var(--orbit-green); 
        }
        
        @media (max-width: 600px) { 
          .footer-right { display: none; } 
        }
      `}</style>

      <div className="footer-left">
        <span className="footer-dot" />
        © {year} O.R.B.I.T. | Bulacan State University | All Rights Reserved.
      </div>
      <div className="footer-right">
        <a href="https://disease.sh" target="_blank" rel="noreferrer" className="footer-link">disease.sh</a>
        <a href="https://ourworldindata.org/" target="_blank" rel="noreferrer" className="footer-link">OWID</a>
        <a href="https://www.who.int/data/gho" target="_blank" rel="noreferrer" className="footer-link">WHO | GHO</a>
      </div>
    </footer>
  );
}
