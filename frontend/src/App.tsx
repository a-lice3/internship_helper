import { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import * as api from "./api";
import DashboardPage from "./pages/DashboardPage";
import OffersPage from "./pages/OffersPage";
import SearchPage from "./pages/SearchPage";
import CalendarPage from "./pages/CalendarPage";
import OfferDetailPage from "./pages/OfferDetailPage";
import ProfilePage from "./pages/ProfilePage";
import CVsPage from "./pages/CVsPage";
import TemplatesPage from "./pages/TemplatesPage";
import InterviewPage from "./pages/InterviewPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

const NAV_SECTIONS = [
  { to: "/dashboard", label: "Dashboard", icon: "\uD83D\uDCCA" },
  { to: "/offers", label: "Candidatures", icon: "\uD83D\uDCCB" },
  { to: "/profile", label: "Mon Profil", icon: "\uD83D\uDC64" },
  { to: "/interview", label: "Interview", icon: "\uD83C\uDFA4" },
  { to: "/settings", label: "Settings", icon: "\u2699\uFE0F" },
];

// ---------- Sidebar Link (matches prefix for nested routes) ----------

function SidebarLink({ to, icon, label }: { to: string; icon: string; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
  return (
    <Link to={to} className={isActive ? "active" : ""}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

// ---------- Login ----------

function LoginScreen({ onLogin }: { onLogin: (user: api.User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const resp = await api.login(loginEmail, loginPassword);
      api.setToken(resp.access_token);
      onLogin(resp.user);
    } catch {
      setError("Invalid email or password.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const resp = await api.register(name, email, password);
      api.setToken(resp.access_token);
      onLogin(resp.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Signup failed.";
      setError(msg);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">{"\u2728"}</div>
        <h1>Internship Helper</h1>
        <p className="subtitle">Your AI-powered internship search companion</p>

        <div className="login-toggle">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Login
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            Sign up
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Your password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </label>
            <button type="submit">Login</button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="login-form">
            <label>
              Name
              <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Email
              <input placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="submit">Create account</button>
          </form>
        )}

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}

// ---------- Main App ----------

export default function App() {
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((u) => setUser(u))
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">{"\u2728"}</div>
          <div>
            <h1>Intern Helper</h1>
            <div className="brand-sub">AI-powered</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((item) => (
            <SidebarLink key={item.to} to={item.to} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
          </div>
          <button
            className="btn-logout"
            onClick={handleLogout}
            title="Logout"
          >
            {"\u2192"}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage userId={user.id} />} />

          {/* Candidatures section */}
          <Route path="/offers" element={<OffersPage userId={user.id} />} />
          <Route path="/offers/search" element={<SearchPage userId={user.id} />} />
          <Route path="/offers/calendar" element={<CalendarPage userId={user.id} />} />
          <Route path="/offers/:offerId" element={<OfferDetailPage userId={user.id} />} />

          {/* Mon Profil section */}
          <Route path="/profile" element={<ProfilePage userId={user.id} />} />
          <Route path="/profile/cvs" element={<CVsPage userId={user.id} />} />
          <Route path="/profile/templates" element={<TemplatesPage userId={user.id} />} />

          {/* Interview */}
          <Route path="/interview" element={<InterviewPage userId={user.id} />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage userId={user.id} userName={user.name} userEmail={user.email} onLogout={handleLogout} />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
