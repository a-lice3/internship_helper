import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as api from "../api";
import DateTimeInput from "../components/DateTimeInput";

const STATUS_LABELS: Record<string, string> = {
  bookmarked: "Bookmarked",
  applied: "Applied",
  screened: "Screened",
  interview: "Interview",
  rejected: "Rejected",
  accepted: "Accepted",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const REMINDER_TYPES = ["deadline", "follow_up", "interview", "custom"];

const EVENT_COLORS: Record<string, string> = {
  application: "var(--accent)",
  reminder: "#f59e0b",
  interview: "#8b5cf6",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function DashboardPage({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<api.DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Calendar state
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<api.CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Reminders state
  const [reminders, setReminders] = useState<api.Reminder[]>([]);
  const [addTitle, setAddTitle] = useState("");
  const [addDueAt, setAddDueAt] = useState("");
  const [addType, setAddType] = useState("custom");
  const [addDescription, setAddDescription] = useState("");

  // Edit reminder
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editType, setEditType] = useState("custom");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    api.getDashboard(userId).then((s) => {
      setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [userId]);

  // Load calendar events
  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = getDaysInMonth(year, month);
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    api.getCalendarEvents(userId, start, end).then((resp) => setEvents(resp.events));
  }, [userId, year, month]);

  // Load reminders
  const loadReminders = () => {
    api.getReminders(userId, true).then(setReminders);
  };
  useEffect(loadReminders, [userId]);

  const reloadCalendarAndReminders = () => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = getDaysInMonth(year, month);
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    api.getCalendarEvents(userId, start, end).then((resp) => setEvents(resp.events));
    loadReminders();
    // Reload dashboard stats too
    api.getDashboard(userId).then(setStats);
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
    setSelectedDay(null);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(toDateKey(today));
  };

  // --- Reminder handlers ---
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTitle.trim() || !addDueAt) return;
    await api.createReminder(userId, {
      title: addTitle,
      description: addDescription || undefined,
      due_at: new Date(addDueAt).toISOString(),
      reminder_type: addType,
    });
    setAddTitle(""); setAddDescription(""); setAddType("custom");
    if (selectedDay) setAddDueAt(`${selectedDay}T09:00`);
    else setAddDueAt("");
    reloadCalendarAndReminders();
  };

  const handleToggleReminder = async (r: api.Reminder) => {
    await api.updateReminder(userId, r.id, { is_done: !r.is_done });
    reloadCalendarAndReminders();
  };

  const handleDeleteReminder = async (id: number) => {
    await api.deleteReminder(userId, id);
    reloadCalendarAndReminders();
  };

  const startEditReminder = (r: api.Reminder) => {
    setEditingId(r.id);
    setEditTitle(r.title);
    setEditDueAt(r.due_at.slice(0, 16));
    setEditType(r.reminder_type);
    setEditDesc(r.description || "");
  };

  const handleSaveEditReminder = async () => {
    if (editingId === null) return;
    await api.updateReminder(userId, editingId, {
      title: editTitle,
      description: editDesc || undefined,
      due_at: new Date(editDueAt).toISOString(),
      reminder_type: editType,
    });
    setEditingId(null);
    reloadCalendarAndReminders();
  };

  const isOverdue = (r: api.Reminder) => !r.is_done && new Date(r.due_at) < new Date();

  // Group events by day
  const eventsByDay: Record<string, api.CalendarEvent[]> = {};
  for (const ev of events) {
    const key = toDateKey(new Date(ev.date));
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayKey = toDateKey(today);
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  // Reminders for the selected day
  const selectedDayReminders = selectedDay
    ? reminders.filter((r) => toDateKey(new Date(r.due_at)) === selectedDay)
    : [];

  // Non-reminder events for the selected day
  const selectedDayOtherEvents = selectedEvents.filter((ev) => ev.event_type !== "reminder");

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

      {/* Offers by status + Upcoming reminders */}
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

      {/* Calendar */}
      <div style={{ display: "grid", gridTemplateColumns: selectedDay ? "1fr 340px" : "1fr", gap: 16 }}>
        <div className="glass-card">
          <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0 }}>Calendar</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn-ghost" onClick={prevMonth} style={{ padding: "2px 8px", fontSize: 14 }}>&lt;</button>
              <span style={{ fontWeight: 600, fontSize: 13, minWidth: 130, textAlign: "center" }}>{MONTHS[month]} {year}</span>
              <button className="btn-ghost" onClick={nextMonth} style={{ padding: "2px 8px", fontSize: 14 }}>&gt;</button>
              <button className="btn-ghost" onClick={goToday} style={{ fontSize: 12, marginLeft: 4 }}>Today</button>
            </div>
          </div>
          <div className="glass-card-body" style={{ padding: 12 }}>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {DAYS.map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: 6, textTransform: "uppercase" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} style={{ minHeight: 56 }} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsByDay[key] || [];
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDay(null);
                        setEditingId(null);
                      } else {
                        setSelectedDay(key);
                        setEditingId(null);
                        setAddDueAt(`${key}T09:00`);
                      }
                    }}
                    style={{
                      minHeight: 56,
                      padding: 6,
                      borderRadius: 8,
                      cursor: "pointer",
                      border: isSelected ? "2px solid var(--accent)" : isToday ? "2px solid var(--accent-light)" : "1px solid transparent",
                      background: isSelected ? "var(--accent-light)" : isToday ? "rgba(99, 102, 241, 0.04)" : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{
                      fontSize: 13,
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "var(--accent)" : "var(--text-h)",
                      marginBottom: 4,
                    }}>
                      {day}
                    </div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {dayEvents.slice(0, 4).map((ev, idx) => (
                        <div
                          key={idx}
                          title={ev.title}
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: EVENT_COLORS[ev.event_type] || "var(--text-muted)",
                          }}
                        />
                      ))}
                      {dayEvents.length > 4 && (
                        <span style={{ fontSize: 9, color: "var(--text-muted)" }}>+{dayEvents.length - 4}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginTop: 12, paddingTop: 8, borderTop: "1px solid var(--border)" }}>
              {Object.entries(EVENT_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  <span style={{ textTransform: "capitalize", color: "var(--text-muted)" }}>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Day detail sidebar */}
        {selectedDay && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignSelf: "start" }}>
            {/* Day header */}
            <div className="glass-card">
              <div className="glass-card-header">
                <h3 style={{ margin: 0 }}>{new Date(selectedDay + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</h3>
              </div>
            </div>

            {/* Other events (applications, interviews) */}
            {selectedDayOtherEvents.length > 0 && (
              <div className="glass-card">
                <div className="glass-card-header"><h4 style={{ margin: 0, fontSize: 13 }}>Events</h4></div>
                <div className="glass-card-body" style={{ padding: "8px 14px" }}>
                  <ul className="item-list" style={{ margin: 0 }}>
                    {selectedDayOtherEvents.map((ev) => (
                      <li
                        key={ev.id}
                        style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "8px 0", cursor: ev.offer_id ? "pointer" : undefined }}
                        onClick={() => { if (ev.offer_id) navigate(`/offers/${ev.offer_id}`); }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: EVENT_COLORS[ev.event_type] || "var(--text-muted)", flexShrink: 0 }} />
                          <span style={{ fontWeight: 500, color: "var(--text-h)", fontSize: 13 }}>{ev.title}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--text-muted)", paddingLeft: 16 }}>
                          <span style={{ textTransform: "capitalize" }}>{ev.event_type}</span>
                          {ev.company && <span>{ev.company}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Reminders for this day — only shown if there are reminders */}
            {selectedDayReminders.length > 0 && (
              <div className="glass-card">
                <div className="glass-card-header"><h4 style={{ margin: 0, fontSize: 13 }}>Reminders</h4></div>
                <div className="glass-card-body" style={{ padding: "8px 14px" }}>
                  <ul className="item-list" style={{ margin: 0 }}>
                    {selectedDayReminders.map((r) =>
                      editingId === r.id ? (
                        <li key={r.id} style={{ flexDirection: "column", gap: 8, padding: "8px 0", alignItems: "stretch" }}>
                          <input placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ fontSize: 13 }} />
                          <select value={editType} onChange={(e) => setEditType(e.target.value)} style={{ fontSize: 13 }}>
                            {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                          </select>
                          <DateTimeInput value={editDueAt} onChange={setEditDueAt} style={{ fontSize: 13 }} />
                          <textarea rows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" style={{ fontSize: 13 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-primary" onClick={handleSaveEditReminder} style={{ boxShadow: "none", fontSize: 12 }}>Save</button>
                            <button className="btn-cancel" onClick={() => setEditingId(null)} style={{ fontSize: 12 }}>Cancel</button>
                          </div>
                        </li>
                      ) : (
                        <li key={r.id} style={{ padding: "8px 0", gap: 8 }}>
                          <button
                            className={`reminder-toggle${r.is_done ? " done" : ""}`}
                            onClick={() => handleToggleReminder(r)}
                            title={r.is_done ? "Mark undone" : "Mark done"}
                          >{r.is_done ? "\u2713" : ""}</button>
                          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => startEditReminder(r)} title="Click to edit">
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <span style={{
                                fontWeight: 500,
                                fontSize: 13,
                                color: r.is_done ? "var(--text-muted)" : isOverdue(r) ? "var(--danger)" : "var(--text-h)",
                                textDecoration: r.is_done ? "line-through" : "none",
                              }}>
                                {r.title}
                              </span>
                              <span className="badge" style={{ textTransform: "capitalize", fontSize: 10 }}>
                                {r.reminder_type.replace("_", " ")}
                              </span>
                              {isOverdue(r) && <span style={{ fontSize: 10, color: "var(--danger)", fontWeight: 600 }}>OVERDUE</span>}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                              {new Date(r.due_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              {r.description && <span> — {r.description}</span>}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteReminder(r.id)} className="btn-icon" style={{ fontSize: 11, padding: "2px 6px" }}>x</button>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* New reminder form — always visible */}
            <div className="glass-card">
              <div className="glass-card-header"><h4 style={{ margin: 0, fontSize: 13 }}>New reminder</h4></div>
              <div className="glass-card-body" style={{ padding: "12px 14px" }}>
                <form onSubmit={handleAddReminder} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <input placeholder="Title *" value={addTitle} onChange={(e) => setAddTitle(e.target.value)} style={{ fontSize: 13 }} />
                  <select value={addType} onChange={(e) => setAddType(e.target.value)} style={{ fontSize: 13 }}>
                    {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                  </select>
                  <DateTimeInput value={addDueAt} onChange={setAddDueAt} style={{ fontSize: 13 }} />
                  <textarea rows={2} value={addDescription} onChange={(e) => setAddDescription(e.target.value)} placeholder="Description (optional)" style={{ fontSize: 13 }} />
                  <button type="submit" className="btn-primary" style={{ boxShadow: "none", fontSize: 12 }}>Add</button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
