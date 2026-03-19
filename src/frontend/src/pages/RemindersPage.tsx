import { useEffect, useState } from "react";
import * as api from "../api";

const REMINDER_TYPES = ["deadline", "follow_up", "interview", "custom"];

export default function RemindersPage({ userId }: { userId: number }) {
  const [reminders, setReminders] = useState<api.Reminder[]>([]);
  const [showDone, setShowDone] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [offers, setOffers] = useState<api.Offer[]>([]);

  // Add form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reminderType, setReminderType] = useState("custom");
  const [offerId, setOfferId] = useState<number | "">("");

  // Editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [editType, setEditType] = useState("custom");

  const load = () => {
    api.getReminders(userId, showDone).then(setReminders);
  };

  useEffect(load, [userId, showDone]);
  useEffect(() => {
    api.getOffers(userId).then(setOffers);
  }, [userId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;
    const r = await api.createReminder(userId, {
      title,
      description: description || undefined,
      due_at: new Date(dueAt).toISOString(),
      reminder_type: reminderType,
      offer_id: offerId || null,
    });
    setReminders([r, ...reminders].sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime()));
    setTitle(""); setDescription(""); setDueAt(""); setReminderType("custom"); setOfferId("");
    setShowAdd(false);
  };

  const handleToggleDone = async (r: api.Reminder) => {
    const updated = await api.updateReminder(userId, r.id, { is_done: !r.is_done });
    if (!showDone && updated.is_done) {
      setReminders(reminders.filter((x) => x.id !== r.id));
    } else {
      setReminders(reminders.map((x) => (x.id === updated.id ? updated : x)));
    }
  };

  const handleDelete = async (id: number) => {
    await api.deleteReminder(userId, id);
    setReminders(reminders.filter((r) => r.id !== id));
  };

  const startEdit = (r: api.Reminder) => {
    setEditingId(r.id);
    setEditTitle(r.title);
    setEditDesc(r.description || "");
    setEditDueAt(r.due_at.slice(0, 16)); // datetime-local format
    setEditType(r.reminder_type);
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const updated = await api.updateReminder(userId, editingId, {
      title: editTitle,
      description: editDesc || undefined,
      due_at: new Date(editDueAt).toISOString(),
      reminder_type: editType,
    });
    setReminders(reminders.map((r) => (r.id === updated.id ? updated : r)));
    setEditingId(null);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  };

  const isOverdue = (r: api.Reminder) => !r.is_done && new Date(r.due_at) < new Date();

  const upcoming = reminders.filter((r) => !r.is_done);
  const done = reminders.filter((r) => r.is_done);

  return (
    <div className="page">
      <div className="page-header">
        <h2>Reminders</h2>
        <p className="page-desc">Track deadlines, follow-ups, and interviews</p>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ New reminder"}
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", flexDirection: "row" }}>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} style={{ width: "auto" }} />
          Show completed
        </label>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <div className="glass-card-body">
            <form onSubmit={handleAdd} className="form-grid">
              <label>
                Title *
                <input placeholder="e.g. Follow up with Google" value={title} onChange={(e) => setTitle(e.target.value)} />
              </label>
              <label>
                Type
                <select value={reminderType} onChange={(e) => setReminderType(e.target.value)}>
                  {REMINDER_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                </select>
              </label>
              <label>
                Due date *
                <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </label>
              <label>
                Linked offer (optional)
                <select value={offerId} onChange={(e) => setOfferId(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">— None —</option>
                  {offers.map((o) => <option key={o.id} value={o.id}>{o.company} — {o.title}</option>)}
                </select>
              </label>
              <div style={{ gridColumn: "1 / -1" }}>
                <label>
                  Description (optional)
                  <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Additional details..." />
                </label>
              </div>
              <button type="submit">Add reminder</button>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming reminders */}
      {upcoming.length === 0 && !showDone ? (
        <p className="empty">No pending reminders. Create one to stay on track!</p>
      ) : (
        <div className="card-list">
          {upcoming.map((r) =>
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
              <div key={r.id} className="glass-card" style={{ padding: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                  <input
                    type="checkbox"
                    checked={r.is_done}
                    onChange={() => handleToggleDone(r)}
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
                  <button onClick={() => startEdit(r)} className="btn-ghost" title="Edit">Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="btn-icon" title="Delete">x</button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Done reminders */}
      {showDone && done.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 15, marginBottom: 12, color: "var(--text-muted)" }}>Completed</h3>
          <div className="card-list">
            {done.map((r) => (
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
  );
}
