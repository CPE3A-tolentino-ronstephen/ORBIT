import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { user, signInWithGoogle, signInWithEmail, registerWithEmail, loading, error, setError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [tab,      setTab]      = useState("signin");
  const [signing,  setSigning]  = useState(false);
  const [localErr, setLocalErr] = useState("");
  const [success,  setSuccess]  = useState("");

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [name,     setName]     = useState("");
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (searchParams.get("confirmed") === "true") {
      setSuccess("Email confirmed! You can now sign in.");
      setTab("signin");
    }
  }, [searchParams]);

  const switchTab = (t) => {
    setTab(t);
    setLocalErr("");
    setSuccess("");
    setError?.(null);
    setEmail(""); setPassword(""); setConfirm(""); setName("");
  };

  const handleGoogle = async () => {
    setSigning(true);
    setLocalErr("");
    try {
      await signInWithGoogle();
    } catch (e) {
      setLocalErr(e.message || "Google sign-in failed.");
      setSigning(false);
    }
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) return setLocalErr(" Please fill in all fields.");
    setSigning(true);
    setLocalErr("");
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      setLocalErr(err.message || "Sign in failed. Check your credentials.");
      setSigning(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm)
      return setLocalErr("Please fill in all fields.");
    if (password.length < 8)
      return setLocalErr("Password must be at least 8 characters.");
    if (password !== confirm)
      return setLocalErr("Passwords do not match.");
    setSigning(true);
    setLocalErr("");
    try {
      await registerWithEmail(email, password, name);
      setSuccess("Account created! Check your email for a confirmation link.");
      setTab("signin");
      setEmail(""); setPassword(""); setConfirm(""); setName("");
    } catch (err) {
      setLocalErr(err.message || "Registration failed. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>
        <link rel="icon" type="image/png" href="/favicon1.png" />
      </div>
      <p style={{ fontFamily: "var(--font-display)", color: "var(--orbit-green)", fontSize: 16 }}>
        Initializing O.R.B.I.T...
      </p>
    </div>
  );

  const displayErr = localErr || error;

  return (
    <div className="auth-page page-enter">
      <style>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 500px;
          background: var(--white);
        }

         .auth-panel-left {
          background: var(--off-white);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 48px;
          position: relative;
          overflow: hidden;
        }
        .auth-panel-left::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 50% at 20% 30%, rgba(16,185,129,.18) 0%, transparent 60%),
            radial-gradient(ellipse 40% 40% at 80% 80%, rgba(16,185,129,.08) 0%, transparent 50%);
        }
        .auth-panel-left-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(16, 185, 129, 0.25) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.25) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(circle at center, black 40%, transparent 95%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 95%);
          
          pointer-events: none; 
        }

        .auth-brand {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center; 
          gap: 12px;
        }
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

        .auth-brand-text strong {
          display: block;
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 800;
          color: var(--gray-900);
          letter-spacing: 1px;
        }
        .auth-brand-text span {
          font-size: 11px;
          color: var(--orbit-green-dim);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 1.6px;
        }
        .auth-hero-text {
          position: relative;
          z-index: 1;
        }
        .auth-hero-text h2 {
          font-size: 40px;
          font-weight: 800;
          color: var(--gray-900);
          line-height: 1.1;
          margin-bottom: 16px;
          letter-spacing: -1px;
        }
        .auth-hero-text h2 em {
          font-style: normal;
          color: var(--orbit-green-light);
        }
        .auth-hero-text p {
          color: var(--gray-700);
          font-size: 15px;
          line-height: 1.7;
          max-width: 380px;
        }

        .auth-stats {
          position: relative;
          z-index: 1;
          display: flex;
          gap: 32px;
        }
        .auth-stat {
          border-left: 2px solid rgba(16,185,129,.4);
          padding-left: 14px;
        }
        .auth-stat-num {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 800;
          color: var(--orbit-green-light);
          display: block;
        }
          .auth-stat-label {
          font-size: 11px;
          color: var(--orbit-green-dim);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 1.3px;
        }

        .auth-panel-right {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 3rem 2.5rem;
          background: var(--orbit-green-dim);
          border-left: 0px !important; 
        }

        .auth-tabs {
          display: flex;
          gap: 0;
          margin-bottom: 32px;
          border: 0px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          background: var(--gray-50);
        }
        .auth-tab-btn {
          flex: 1;
          padding: 10px 16px;
          font-family: var(--font-body);
          font-size: 14px;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--gray-900);
          cursor: pointer;
          transition: all 0.15s;
        }
        .auth-tab-btn.active {
          background: var(--gray-900);
          color: var(--gray-200);
          box-shadow: 0 1px 4px rgba(0,0,0,.08);
        }
        .auth-tab-btn:hover:not(.active) {
          color: var(--orbit-green-dim);
          background: var(--gray-100);
        }

        .auth-form-header {
          margin-bottom: 24px;
        }
        .auth-form-header h3 {
          font-size: 26px;
          font-weight: 800;
          color: var(--gray-900);
          text-align: center;
          margin-bottom: 6px;
          letter-spacing: -0.5px;
        }

        .auth-form-header p {
          color: var(--gray-200);
          font-size: 14px;
          text-align: center;
        }

        .google-btn {
          width: 100%;
          padding: 13px 24px;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-family: var(--font-body);
          font-size: 15px;
          font-weight: 600;
          color: var(--gray-700);
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 20px;
        }
        .google-btn:hover:not(:disabled) {
          border-color: var(--orbit-green);
          color: var(--orbit-green-dim);
          box-shadow: 0 4px 16px rgba(16,185,129,.12);
          transform: translateY(-1px);
        }
        .google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .google-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          color: var(--gray-200);
          font-size: 12px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }
        .form-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--gray-300);
          font-family: var(--font-body);
        }
        .form-input {
          padding: 11px 14px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-sm);
          font-family: var(--font-body);
          font-size: 14px;
          color: var(--gray-800);
          background: var(--white);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .form-input:focus {
          border-color: var(--orbit-green);
          box-shadow: 0 0 0 3px rgba(16,185,129,.1);
        }
        .form-input::placeholder {
          color: var(--gray-300);
        }
        .pass-wrap {
          position: relative;
        }
        .pass-wrap .form-input {
          padding-right: 44px;
        }
        .pass-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--gray-400);
          font-size: 16px;
          padding: 0;
          line-height: 1;
          transition: color 0.15s;
        }
        .pass-toggle:hover { color: var(--orbit-green); }

        .submit-btn {
          width: 100%;
          padding: 13px 24px;
          background: var(--gray-900);
          color: var(--off-white);
          border: none;
          border-radius: var(--radius-sm);
          font-family: var(--font-body);
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 10px;
          box-shadow: var(--shadow-green);
          letter-spacing: 0.2px;
        }
        .submit-btn:hover:not(:disabled) {
          background: var(--gray-700);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(14, 82, 59, 0.32);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-error {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          color: var(--risk-critical);
          padding: 11px 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .auth-success {
          background: var(--orbit-green-bg);
          border: 1px solid var(--border-em);
          color: var(--orbit-green-dim);
          padding: 11px 14px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pass-hint {
          font-size: 12px;
          color: var(--gray-300);
          margin-top: 4px;
          font-family: var(--font-mono);
        }

        .auth-back {
          display: inline-flex;
          gap: 6px;
          color: var(--off-white);
          text-decoration: none;
          transition: color 0.15s;
          width: 100%;
          font-weight: 500;
          font-size: 15px;
          font-family: var(--font-body);
          justify-content: left; 
          margin-top: 15px;
        }

        .auth-back:hover { 
          color: var(--gray-900); 
        }


        @media (max-width: 768px) {
          .auth-page { grid-template-columns: 1fr; }
          .auth-panel-left { display: none; }
          .auth-panel-right { padding: 40px 24px; }
        }
      `}</style>

      {}
      <div className="auth-panel-left">
        <div className="auth-panel-left-grid" />
        <div className="auth-brand">
           <div className="auth-logo">
            <img src="/logo.png" alt="O.R.B.I.T. Logo" />
           </div>
          <div className="auth-brand-text">
            <strong>O.R.B.I.T.</strong>
            <span>THE PULSE OF WORLD HEALTH AT YOUR FINGERTIPS</span>
          </div>
        </div>
        <div className="auth-hero-text">
          <h2>TRACK OUTBREAKS.<br /><em>SAVE LIVES.</em></h2>
          <p>
            Global disease intelligence. Monitor outbreaks, analyze trends,
            and stay ahead of biological threats. All in one platform.
          </p>
        </div>
        <div className="auth-stats">
          {[
            { num: "195+", label: "Countries"         },
            { num: "24/7", label: "Live Feed"         },
            { num: "100%", label: "Open Data"         },
          ].map(({ num, label }) => (
            <div className="auth-stat" key={label}>
              <span className="auth-stat-num">{num}</span>
              <span className="auth-stat-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {}
      <div className="auth-panel-right">

        {}
        <div className="auth-tabs">
          <button
            className={`auth-tab-btn ${tab === "signin" ? "active" : ""}`}
            onClick={() => switchTab("signin")}
          >
            Sign In
          </button>
          <button
            className={`auth-tab-btn ${tab === "register" ? "active" : ""}`}
            onClick={() => switchTab("register")}
          >
            Create Account
          </button>
        </div>

        {}
        <div className="auth-form-header">
          <h3>{tab === "signin" ? "Welcome back!" : "Join O.R.B.I.T."}</h3>
          <p>
            {tab === "signin"
              ? "Sign in to access your surveillance dashboard"
              : "Create your account to start tracking global outbreaks"
            }
          </p>
        </div>

        {}
        <button className="google-btn" onClick={handleGoogle} disabled={signing}>
          <svg className="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {signing ? "Connecting..." : "Continue with Google"}
        </button>

        <div className="auth-divider">or {tab === "signin" ? "sign in" : "register"} with email</div>

        {}
        {tab === "signin" && (
          <form onSubmit={handleSignIn} noValidate>
            <div className="form-field">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={signing}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <div className="pass-wrap">
                <input
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={signing}
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass((s) => !s)} tabIndex={-1}>
                   <img src={showPass ? "/eye.png" : "/show.png"} className="toggle-icon" />
                </button>
        
              </div>
            </div>
            {}
            {displayErr && (
              <div className="auth-error">{displayErr}</div>
            )}
            {success && (
              <div className="auth-success">{success}</div>
            )}
            <button className="submit-btn" type="submit" disabled={signing}>
              {signing ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {}
        {tab === "register" && (
          <form onSubmit={handleRegister} noValidate>
            <div className="form-field">
              <label className="form-label">Full name</label>
              <input
                className="form-input"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
                disabled={signing}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={signing}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Password</label>
              <div className="pass-wrap">
                <input
                  className="form-input"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={signing}
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass((s) => !s)} tabIndex={-1}>
                   <img src={showPass ? "/eye.png" : "/show.png"} className="toggle-icon" />
                </button>
              </div>
              
            </div>
            <div className="form-field">
              <label className="form-label">Confirm password</label>
              <input
                className="form-input"
                type={showPass ? "text" : "password"}
                placeholder="Repeat your password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                disabled={signing}
              />
            </div>
            <button className="submit-btn" type="submit" disabled={signing}>
              {signing ? "Creating account..." : "Create Account"}
            </button>
          </form>
        )}

        <a href="/" className="auth-back">← Back to home</a>
      </div>
    </div>
  );
}