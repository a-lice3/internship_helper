import React, { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import OnboardingFlow from "./pages/OnboardingFlow";
import GuidedTour, { type TourStep } from "./components/GuidedTour";
import "./App.css";
import sittingCat from "./assets/animated-sitting-cat.gif";

const CONGRATS_STAR_STYLES: React.CSSProperties[] = Array.from({ length: 40 }, (_, i) => {
  const angle = (i / 40) * 2 * Math.PI + (Math.random() - 0.5) * 0.5;
  const dist = 150 + Math.random() * 250;
  return {
    "--delay": `${Math.random() * 0.6}s`,
    "--x": `${Math.cos(angle) * dist}px`,
    "--y": `${Math.sin(angle) * dist}px`,
    "--rot": `${Math.random() * 720}deg`,
    "--size": `${14 + Math.random() * 18}px`,
  } as React.CSSProperties;
});

const NAV_KEYS = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: "\uD83D\uDCCA" },
  { to: "/offers", labelKey: "nav.offers", icon: "\uD83D\uDCCB" },
  { to: "/profile", labelKey: "nav.profile", icon: "\uD83D\uDC64" },
  { to: "/interview", labelKey: "nav.interview", icon: "\uD83C\uDFA4" },
  { to: "/settings", labelKey: "nav.settings", icon: "\u2699\uFE0F" },
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
  const { t } = useTranslation();
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
      setError(t("login.invalidCredentials"));
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
      const msg = err instanceof Error ? err.message : t("login.signupFailed");
      setError(msg);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-icon">{"\u2728"}</div>
        <h1>{t("login.title")}</h1>
        <p className="subtitle">{t("login.subtitle")}</p>

        <div className="login-toggle">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            {t("login.login")}
          </button>
          <button className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>
            {t("login.signup")}
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="login-form">
            <label>
              {t("login.email")}
              <input
                type="email"
                placeholder={t("login.emailPlaceholder")}
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </label>
            <label>
              {t("login.password")}
              <input
                type="password"
                placeholder={t("login.passwordPlaceholder")}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </label>
            <button type="submit">{t("login.login")}</button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="login-form">
            <label>
              {t("login.name")}
              <input placeholder={t("login.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              {t("login.email")}
              <input placeholder={t("login.emailPlaceholder")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              {t("login.password")}
              <input
                type="password"
                placeholder={t("login.choosePassword")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="submit">{t("login.createAccount")}</button>
          </form>
        )}

        {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}

// ---------- Main App ----------

export default function App() {
  const { t } = useTranslation();
  const [user, setUser] = useState<api.User | null>(null);
  const [loading, setLoading] = useState(() => !!api.getToken());
  const [showCongrats, setShowCongrats] = useState(false);
  const [catPaused, setCatPaused] = useState(false);
  const [frozenCatSrc, setFrozenCatSrc] = useState<string | null>(null);
  const catImgRef = useRef<HTMLImageElement>(null);
  const navigate = useNavigate();
  const pendingRedirect = useRef<string | null>(null);

  const handleCatClick = useCallback(() => {
    if (!catPaused) {
      // Freeze: capture current frame onto a canvas
      const img = catImgRef.current;
      if (img) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setFrozenCatSrc(canvas.toDataURL());
        }
      }
      setCatPaused(true);
    } else {
      // Unfreeze: reload the GIF to restart animation
      setFrozenCatSrc(null);
      setCatPaused(false);
    }
  }, [catPaused]);


  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.getMe()
        .then((u) => setUser(u))
        .catch(() => {
          api.setToken(null);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  // After onboarding completes and congrats is dismissed, navigate to the pending redirect
  useEffect(() => {
    if (pendingRedirect.current && user?.has_completed_onboarding && !showCongrats) {
      const dest = pendingRedirect.current;
      pendingRedirect.current = null;
      navigate(dest, { replace: true });
    }
  }, [user, navigate, showCongrats]);

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <p>{t("app.loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  const onboardingDone =
    user.has_completed_onboarding ||
    localStorage.getItem(`onboarding_done_${user.id}`) === "1";

  if (!onboardingDone) {
    return (
      <OnboardingFlow
        userId={user.id}
        onComplete={(redirectTo?: string, skipped?: boolean) => {
          localStorage.setItem(`onboarding_done_${user.id}`, "1");
          setUser({ ...user, has_completed_onboarding: true });
          if (skipped) {
            navigate("/dashboard", { replace: true });
          } else {
            pendingRedirect.current = redirectTo ?? null;
            setShowCongrats(true);
          }
        }}
      />
    );
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
            <h1>{t("app.title")}</h1>
            <div className="brand-sub">{t("app.subtitle")}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_KEYS.map((item) => (
            <SidebarLink key={item.to} to={item.to} icon={item.icon} label={t(item.labelKey)} />
          ))}
        </nav>

        <div className="sidebar-cat" onClick={handleCatClick} style={{ cursor: "pointer" }}>
          <img
            ref={catImgRef}
            src={frozenCatSrc ?? sittingCat}
            alt="Mistral cat"
            className="sidebar-cat-img"
          />
        </div>

        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name}</div>
          </div>
          <button
            className="btn-logout"
            onClick={handleLogout}
            title={t("nav.logout")}
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
          <Route path="/profile/cover-letters" element={<TemplatesPage userId={user.id} />} />

          {/* Interview */}
          <Route path="/interview" element={<InterviewPage userId={user.id} />} />

          {/* Settings */}
          <Route path="/settings" element={<SettingsPage userId={user.id} userName={user.name} userEmail={user.email} onLogout={handleLogout} />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {/* Congrats popup after onboarding */}
      {showCongrats && (
        <div className="congrats-overlay" onClick={() => setShowCongrats(false)}>
          <div className="congrats-stars">
            {CONGRATS_STAR_STYLES.map((style, i) => (
              <span key={i} className="congrats-star" style={style} />
            ))}
          </div>
          <div className="congrats-card" onClick={(e) => e.stopPropagation()}>
            <div className="congrats-emoji">{"\uD83C\uDF89"}</div>
            <h2 className="congrats-title">{t("congrats.title")}</h2>
            <p className="congrats-text">{t("congrats.text")}</p>
            <button className="btn-primary congrats-btn" onClick={() => setShowCongrats(false)}>
              {t("congrats.button")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
