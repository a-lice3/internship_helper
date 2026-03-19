import { useEffect, useState } from "react";
import * as api from "./api";
import ProfilePage from "./pages/ProfilePage";
import OffersPage from "./pages/OffersPage";
import CVsPage from "./pages/CVsPage";
import TemplatesPage from "./pages/TemplatesPage";
import AIPage from "./pages/AIPage";
import InterviewPage from "./pages/InterviewPage";
import SearchPage from "./pages/SearchPage";
import "./App.css";

type Tab = "offers" | "search" | "profile" | "cvs" | "templates" | "ai" | "interview";

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "offers", label: "Offers", icon: "\uD83D\uDCCB" },
  { key: "search", label: "Search", icon: "\uD83D\uDD0D" },
  { key: "profile", label: "Profile", icon: "\uD83D\uDC64" },
  { key: "cvs", label: "CVs", icon: "\uD83D\uDCC4" },
  { key: "templates", label: "Templates", icon: "\uD83D\uDCDD" },
  { key: "ai", label: "AI Assistant", icon: "\u2728" },
  { key: "interview", label: "Interview", icon: "\uD83C\uDFA4" },
];

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
  const [tab, setTab] = useState<Tab>("offers");
  const [loading, setLoading] = useState(true);

  // Try to restore session from stored token on mount
  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((u) => setUser(u))
        .catch(() => {
          api.setToken(null); // Token expired or invalid
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
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
          {TABS.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "active" : ""}
              onClick={() => setTab(t.key)}
            >
              <span className="nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
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
        {tab === "offers" && <OffersPage userId={user.id} />}
        {tab === "search" && <SearchPage userId={user.id} />}
        {tab === "profile" && <ProfilePage userId={user.id} />}
        {tab === "cvs" && <CVsPage userId={user.id} />}
        {tab === "templates" && <TemplatesPage userId={user.id} />}
        {tab === "ai" && <AIPage userId={user.id} />}
        {tab === "interview" && <InterviewPage userId={user.id} />}
      </main>
    </div>
  );
}
