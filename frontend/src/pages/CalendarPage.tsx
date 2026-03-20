import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import * as api from "../api";

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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage({ userId }: { userId: number }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<api.CalendarEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Reminders state
  const [reminders, setReminders] = useState<api.Reminder[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [offers, setOffers] = useState<api.Offer[]>([]);

  // Add reminder form
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reminderType, setReminderType] = useState("custom");
  const [offerId, setOfferId] = useState<number | "">("");

  // Edit reminder
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editType, setEditType] = useState("custom");

  const loadCalendar = () => {
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = getDaysInMonth(year, month);
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    api.getCalendarEvents(userId, start, end).then((resp) => setEvents(resp.events));
  };

  const loadReminders = () => {
    api.getReminders(userId, showDone).then(setReminders);
  };

  useEffect(loadCalendar, [userId, year, month]);
  useEffect(loadReminders, [userId, showDone]);
  useEffect(() => {
    api.getOffers(userId).then(setOffers);
  }, [userId]);

  const reloadAll = () => {
    loadCalendar();
    loadReminders();
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;
    await api.createReminder(userId, {
      title,
      description: description || undefined,
      due_at: new Date(dueAt).toISOString(),
      reminder_type: reminderType,
      offer_id: offerId || null,
    });
    setTitle(""); setDescription(""); setDueAt(""); setReminderType("custom"); setOfferId("");
    setShowAdd(false);
    reloadAll();
  };

  const handleToggleDone = async (r: api.Reminder) => {
    await api.updateReminder(userId, r.id, { is_done: !r.is_done });
    reloadAll();
  };

  const handleDelete = async (id: number) => {
    await api.deleteReminder(userId, id);
    reloadAll();
  };

  const startEdit = (r: api.Reminder) => {
    setEditingId(r.id);
    setEditTitle(r.title);
    setEditDesc(r.description || "");
    setEditDueAt(r.due_at.slice(0, 16));
    setEditType(r.reminder_type);
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    await api.updateReminder(userId, editingId, {
      title: editTitle,
      description: editDesc || undefined,
      due_at: new Date(editDueAt).toISOString(),
      reminder_type: editType,
    });
    setEditingId(null);
    reloadAll();
  };

  const openAddForDay = (dayKey: string) => {
    setSelectedDay(dayKey);
    setShowAdd(true);
    setDueAt(`${dayKey}T09:00`);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  const isOverdue = (r: api.Reminder) => !r.is_done && new Date(r.due_at) < new Date();

  // Group events by day key
  const eventsByDay: Record<string, api.CalendarEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.date);
    const key = toDateKey(d);
    if (!eventsByDay[key]) eventsByDay[key] = [];
    eventsByDay[key].push(ev);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayKey = toDateKey(today);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  // Reminders for the selected day
  const selectedDayReminders = selectedDay
    ? reminders.filter((r) => {
        const rKey = toDateKey(new Date(r.due_at));
        return rKey === selectedDay;
      })
    : [];

  // Non-reminder events for the selected day
  const selectedDayOtherEvents = selectedEvents.filter((ev) => ev.event_type !== "reminder");

  // All reminders list (for the bottom panel)
  const upcomingReminders = reminders.filter((r) => !r.is_done);
  const doneReminders = reminders.filter((r) => r.is_done);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Candidatures</h2>
        <p className="page-desc">View your events and manage reminders in one place</p>
      </div>

      <nav className="pill-nav">
        <NavLink to="/offers" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>Mes offres</NavLink>
        <NavLink to="/offers/search" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>Recherche</NavLink>
        <NavLink to="/offers/calendar" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>Calendrier</NavLink>
      </nav>

      {/* Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="btn-secondary" onClick={prevMonth} style={{ padding: "8px 14px" }}>&lt;</button>
        <h3 style={{ margin: 0, minWidth: 180, textAlign: "center", fontSize: 16 }}>
          {MONTHS[month]} {year}
        </h3>
        <button className="btn-secondary" onClick={nextMonth} style={{ padding: "8px 14px" }}>&gt;</button>
        <button className="btn-ghost" onClick={goToday} style={{ marginLeft: 8 }}>Today</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedDay ? "1fr 360px" : "1fr", gap: 16 }}>
        {/* Calendar grid */}
        <div className="glass-card">
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
                <div key={`empty-${i}`} style={{ minHeight: 64 }} />
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
                    onClick={() => setSelectedDay(isSelected ? null : key)}
                    style={{
                      minHeight: 64,
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
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Day header */}
            <div className="glass-card">
              <div className="glass-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>{new Date(selectedDay + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</h3>
                {!showAdd && (
                  <button className="btn-ghost" onClick={() => openAddForDay(selectedDay)} title="Add reminder on this day" style={{ fontSize: 18, padding: "2px 8px" }}>+</button>
                )}
              </div>
            </div>

            {/* Other events (applications, interviews) */}
            {selectedDayOtherEvents.length > 0 && (
              <div className="glass-card">
                <div className="glass-card-header"><h4 style={{ margin: 0, fontSize: 13 }}>Events</h4></div>
                <div className="glass-card-body" style={{ padding: "8px 14px" }}>
                  <ul className="item-list" style={{ margin: 0 }}>
                    {selectedDayOtherEvents.map((ev) => (
                      <li key={ev.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: 4, padding: "8px 0" }}>
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

            {/* Reminders for this day */}
            <div className="glass-card">
              <div className="glass-card-header"><h4 style={{ margin: 0, fontSize: 13 }}>Reminders</h4></div>
              <div className="glass-card-body" style={{ padding: "8px 14px" }}>
                {selectedDayReminders.length === 0 && !showAdd ? (
                  <p className="empty" style={{ padding: 8, margin: 0, fontSize: 13 }}>No reminders this day</p>
                ) : (
                  <ul className="item-list" style={{ margin: 0 }}>
                    {selectedDayReminders.map((r) =>
                      editingId === r.id ? (
                        <li key={r.id} style={{ flexDirection: "column", gap: 8, padding: "8px 0" }}>
                          <input placeholder="Title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ fontSize: 13 }} />
                          <select value={editType} onChange={(e) => setEditType(e.target.value)} style={{ fontSize: 13 }}>
                            {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                          </select>
                          <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} style={{ fontSize: 13 }} />
                          <textarea rows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" style={{ fontSize: 13 }} />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn-primary" onClick={handleSaveEdit} style={{ boxShadow: "none", fontSize: 12 }}>Save</button>
                            <button className="btn-cancel" onClick={() => setEditingId(null)} style={{ fontSize: 12 }}>Cancel</button>
                          </div>
                        </li>
                      ) : (
                        <li key={r.id} style={{ padding: "8px 0", gap: 8 }}>
                          <input
                            type="checkbox"
                            checked={r.is_done}
                            onChange={() => handleToggleDone(r)}
                            style={{ width: "auto", cursor: "pointer", flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
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
                          <button onClick={() => startEdit(r)} className="btn-ghost" style={{ fontSize: 11, padding: "2px 6px" }}>Edit</button>
                          <button onClick={() => handleDelete(r.id)} className="btn-icon" style={{ fontSize: 11, padding: "2px 6px" }}>x</button>
                        </li>
                      )
                    )}
                  </ul>
                )}
              </div>
            </div>

            {/* Add reminder form (inline in sidebar) */}
            {showAdd && (
              <div className="glass-card">
                <div className="glass-card-header"><h4 style={{ margin: 0, fontSize: 13 }}>New reminder</h4></div>
                <div className="glass-card-body" style={{ padding: "12px 14px" }}>
                  <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <input placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} style={{ fontSize: 13 }} />
                    <select value={reminderType} onChange={(e) => setReminderType(e.target.value)} style={{ fontSize: 13 }}>
                      {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                    </select>
                    <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={{ fontSize: 13 }} />
                    <select value={offerId} onChange={(e) => setOfferId(e.target.value ? Number(e.target.value) : "")} style={{ fontSize: 13 }}>
                      <option value="">Linked offer (optional)</option>
                      {offers.map((o) => <option key={o.id} value={o.id}>{o.company} — {o.title}</option>)}
                    </select>
                    <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" style={{ fontSize: 13 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="submit" className="btn-primary" style={{ boxShadow: "none", fontSize: 12 }}>Add</button>
                      <button type="button" className="btn-cancel" onClick={() => setShowAdd(false)} style={{ fontSize: 12 }}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* All reminders list below the calendar */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>All reminders</h3>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", flexDirection: "row" }}>
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} style={{ width: "auto" }} />
            Show completed
          </label>
        </div>

        {upcomingReminders.length === 0 && !showDone ? (
          <p className="empty">No pending reminders</p>
        ) : (
          <div className="card-list">
            {upcomingReminders.map((r) =>
              editingId === r.id ? (
                <div key={r.id} className="glass-card">
                  <div className="glass-card-body">
                    <div className="form-grid">
                      <label>Title <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></label>
                      <label>Type
                        <select value={editType} onChange={(e) => setEditType(e.target.value)}>
                          {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                        </select>
                      </label>
                      <label>Due date <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} /></label>
                      <label>Description <textarea rows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} /></label>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button className="btn-primary" onClick={handleSaveEdit} style={{ boxShadow: "none" }}>Save</button>
                      <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={r.id}
                  className="glass-card"
                  style={{ padding: 0, cursor: "pointer" }}
                  onClick={() => {
                    const rDate = new Date(r.due_at);
                    setYear(rDate.getFullYear());
                    setMonth(rDate.getMonth());
                    setSelectedDay(toDateKey(rDate));
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                    <input
                      type="checkbox"
                      checked={r.is_done}
                      onChange={(e) => { e.stopPropagation(); handleToggleDone(r); }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "auto", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ color: isOverdue(r) ? "var(--danger)" : "var(--text-h)", fontSize: 14 }}>
                          {r.title}
                        </strong>
                        <span className="badge" style={{ textTransform: "capitalize" }}>
                          {r.reminder_type.replace("_", " ")}
                        </span>
                        {isOverdue(r) && <span style={{ fontSize: 11, color: "var(--danger)", fontWeight: 600 }}>OVERDUE</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        {formatDate(r.due_at)}
                        {r.description && <span> — {r.description}</span>}
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(r); }} className="btn-ghost" title="Edit">Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="btn-icon" title="Delete">x</button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {showDone && doneReminders.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, color: "var(--text-muted)" }}>Completed</h4>
            <div className="card-list">
              {doneReminders.map((r) => (
                <div key={r.id} className="glass-card" style={{ padding: 0, opacity: 0.6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                    <input
                      type="checkbox"
                      checked={r.is_done}
                      onChange={() => handleToggleDone(r)}
                      style={{ width: "auto", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ textDecoration: "line-through", fontSize: 14, color: "var(--text-muted)" }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(r.due_at)}</div>
                    </div>
                    <button onClick={() => handleDelete(r.id)} className="btn-icon" title="Delete">x</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
