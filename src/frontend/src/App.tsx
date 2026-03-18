import { useState } from "react";
import * as api from "./api";
import ProfilePage from "./pages/ProfilePage";
import OffersPage from "./pages/OffersPage";
import CVsPage from "./pages/CVsPage";
import TemplatesPage from "./pages/TemplatesPage";
import AIPage from "./pages/AIPage";
import "./App.css";

type Tab = "profile" | "offers" | "cvs" | "templates" | "ai";

const TABS: { key: Tab; label: string }[] = [
  { key: "profile", label: "Profile" },
  { key: "offers", label: "Offers" },
  { key: "cvs", label: "CVs" },
  { key: "templates", label: "Templates" },
  { key: "ai", label: "AI" },
];

// Ecran de login/creation de compte - affiche avant la navigation
function LoginScreen({ onLogin }: { onLogin: (user: api.User) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginEmail, setLoginEmail] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const user = await api.getUserByEmail(loginEmail);
      onLogin(user);
    } catch {
      setError("No account found with this email.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const user = await api.createUser(name, email);
      onLogin(user);
    } catch {
      // Email might already exist — try to log in instead
      try {
        const user = await api.getUserByEmail(email);
        onLogin(user);
      } catch {
        setError("Signup failed.");
      }
    }
  };

  return (
    <div className="login-screen">
      <h1>Internship Helper</h1>
      <p className="subtitle">Manage your internship search with AI</p>

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
          <input
            type="email"
            placeholder="Your email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <form onSubmit={handleSignup} className="login-form">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="submit">Create account</button>
        </form>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<api.User | null>(null);
  const [tab, setTab] = useState<Tab>("offers");

  // Pas connecte -> ecran de login
  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Internship Helper</h1>
        <span className="user-info">
          {user.name}
          <button className="btn-logout" onClick={() => setUser(null)}>Logout</button>
        </span>
      </header>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? "active" : ""}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "profile" && <ProfilePage userId={user.id} />}
        {tab === "offers" && <OffersPage userId={user.id} />}
        {tab === "cvs" && <CVsPage userId={user.id} />}
        {tab === "templates" && <TemplatesPage userId={user.id} />}
        {tab === "ai" && <AIPage userId={user.id} />}
      </main>
    </div>
  );
}
