import { useEffect, useState } from "react";
import * as api from "../api";

const STATUS_LABELS: Record<string, string> = {
  bookmarked: "Bookmarked",
  applied: "Applied",
  screened: "Screened",
  interview: "Interview",
  rejected: "Rejected",
  accepted: "Accepted",
};

export default function DashboardPage({ userId }: { userId: number }) {
  const [stats, setStats] = useState<api.DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboard(userId).then((s) => {
      setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  if (loading) return <div className="page"><p>Loading dashboard...</p></div>;
  if (!stats) return <div className="page"><p>Failed to load dashboard.</p></div>;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    return d.toLocaleDateString();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="page-desc">Overview of your internship search</p>
      </div>

      {/* Top stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <div className="glass-card stat-card">
          <span className="stat-value">{stats.total_offers}</span>
          <span className="stat-label">Total Offers</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-value">
            {stats.average_interview_score != null ? stats.average_interview_score : "—"}
          </span>
          <span className="stat-label">Avg Interview Score</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-value">{stats.interview_sessions_count}</span>
          <span className="stat-label">Total Interviews</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-value">{stats.interview_sessions_this_week}</span>
          <span className="stat-label">Interviews This Week</span>
        </div>
      </div>

      {/* Offers by status */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div className="glass-card">
          <div className="glass-card-header"><h3>Offers by Status</h3></div>
          <div className="glass-card-body">
            {Object.keys(STATUS_LABELS).length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(STATUS_LABELS).map(([key, label]) => {
                  const count = stats.offers_by_status[key] || 0;
                  const pct = stats.total_offers > 0 ? (count / stats.total_offers) * 100 : 0;
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className={`status-dot ${key}`} />
                      <span style={{ width: 80, fontSize: 13 }}>{label}</span>
                      <div style={{ flex: 1, height: 8, background: "var(--accent-light)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", borderRadius: 4, transition: "width 0.3s" }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, width: 24, textAlign: "right" }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty">No offers yet</p>
            )}
          </div>
        </div>

        {/* Upcoming reminders */}
        <div className="glass-card">
          <div className="glass-card-header"><h3>Upcoming Reminders</h3></div>
          <div className="glass-card-body">
            {stats.upcoming_reminders.length === 0 ? (
              <p className="empty">No upcoming reminders</p>
            ) : (
              <ul className="item-list">
                {stats.upcoming_reminders.map((r) => (
                  <li key={r.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 500, color: "var(--text-h)" }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {r.reminder_type} {r.description ? `— ${r.description}` : ""}
                      </div>
                    </div>
                    <span className="badge">{formatDate(r.due_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="glass-card">
        <div className="glass-card-header"><h3>Recent Activity</h3></div>
        <div className="glass-card-body">
          {stats.recent_activity.length === 0 ? (
            <p className="empty">No recent activity</p>
          ) : (
            <ul className="item-list">
              {stats.recent_activity.map((a, i) => (
                <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>
                      {a.type === "offer" ? "\uD83D\uDCCB" : a.type === "interview" ? "\uD83C\uDFA4" : "\u23F0"}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-h)" }}>
                        {String(a.title)}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {String(a.type)} — {String(a.status)}
                      </div>
                    </div>
                  </div>
                  {a.date && (
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(String(a.date)).toLocaleDateString()}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
