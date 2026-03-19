import { useEffect, useState } from "react";
import * as api from "../api";

const STATUSES = ["bookmarked", "applied", "screened", "interview", "rejected", "accepted"];

export default function OffersPage({ userId }: { userId: number }) {
  const [offers, setOffers] = useState<api.Offer[]>([]);
  const [filterStatus, setFilterStatus] = useState("");

  // Add form
  const [company, setCompany] = useState("");
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [locations, setLocations] = useState("");
  const [description, setDescription] = useState("");

  // Paste-and-parse
  const [pasteText, setPasteText] = useState("");
  const [parsing, setParsing] = useState(false);

  // Editing
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{
    company: string; title: string; link: string;
    locations: string; description: string; status: string; date_applied: string;
  }>({ company: "", title: "", link: "", locations: "", description: "", status: "bookmarked", date_applied: "" });

  // Notes
  const [notesOpenId, setNotesOpenId] = useState<number | null>(null);
  const [notes, setNotes] = useState<api.OfferNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");

  // Show/hide add form
  const [showAdd, setShowAdd] = useState(false);

  const load = () => {
    api.getOffers(userId, filterStatus || undefined).then(setOffers);
  };

  useEffect(load, [userId, filterStatus]);

  const handleParse = async () => {
    if (!pasteText.trim()) return;
    setParsing(true);
    try {
      const parsed = await api.parseOffer(pasteText);
      setCompany(parsed.company || "");
      setTitle(parsed.title || "");
      setLocations(parsed.locations || "");
      setDescription(parsed.description || "");
      setPasteText("");
      setShowAdd(true);
    } catch {
      alert("Failed to parse offer text.");
    } finally {
      setParsing(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !title.trim()) return;
    const o = await api.createOffer(userId, {
      company,
      title,
      link: link || undefined,
      locations: locations || undefined,
      description: description || undefined,
    });
    setOffers([o, ...offers]);
    setCompany(""); setTitle(""); setLink(""); setLocations(""); setDescription("");
    setShowAdd(false);
  };

  const handleStatusChange = async (offer: api.Offer, newStatus: string) => {
    const updated = await api.updateOffer(userId, offer.id, { status: newStatus });
    setOffers(offers.map((o) => (o.id === updated.id ? updated : o)));
  };

  const startEdit = (o: api.Offer) => {
    setEditingId(o.id);
    setEditFields({
      company: o.company,
      title: o.title,
      link: o.link || "",
      locations: o.locations || "",
      description: o.description || "",
      status: o.status,
      date_applied: o.date_applied || "",
    });
  };

  const handleSaveEdit = async () => {
    if (editingId === null) return;
    const updated = await api.updateOffer(userId, editingId, {
      company: editFields.company,
      title: editFields.title,
      link: editFields.link || undefined,
      locations: editFields.locations || undefined,
      description: editFields.description || undefined,
      status: editFields.status,
      date_applied: editFields.date_applied || undefined,
    });
    setOffers(offers.map((o) => (o.id === updated.id ? updated : o)));
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    await api.deleteOffer(userId, id);
    setOffers(offers.filter((o) => o.id !== id));
  };

  // Notes helpers
  const toggleNotes = async (offerId: number) => {
    if (notesOpenId === offerId) {
      setNotesOpenId(null);
      return;
    }
    setNotesOpenId(offerId);
    const n = await api.getOfferNotes(userId, offerId);
    setNotes(n);
  };

  const handleAddNote = async (offerId: number) => {
    if (!newNote.trim()) return;
    const n = await api.createOfferNote(userId, offerId, newNote);
    setNotes([n, ...notes]);
    setNewNote("");
  };

  const handleDeleteNote = async (offerId: number, noteId: number) => {
    await api.deleteOfferNote(userId, offerId, noteId);
    setNotes(notes.filter((n) => n.id !== noteId));
  };

  const handleSaveNoteEdit = async (offerId: number) => {
    if (editingNoteId === null) return;
    const updated = await api.updateOfferNote(userId, offerId, editingNoteId, editNoteContent);
    setNotes(notes.map((n) => (n.id === updated.id ? updated : n)));
    setEditingNoteId(null);
  };

  // Stats
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = offers.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <h2>Internship Offers</h2>
        <p className="page-desc">Track and manage your applications</p>
      </div>

      {/* Stats bento row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {STATUSES.map((s) => (
          <div
            key={s}
            className="glass-card stat-card"
            style={{ cursor: "pointer", border: filterStatus === s ? `2px solid var(--accent)` : undefined }}
            onClick={() => setFilterStatus(filterStatus === s ? "" : s)}
          >
            <span className="stat-value">{counts[s] || 0}</span>
            <span className="stat-label" style={{ textTransform: "capitalize" }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? "Cancel" : "+ New offer"}
        </button>
        {filterStatus && (
          <button className="btn-secondary" onClick={() => setFilterStatus("")}>
            Clear filter
          </button>
        )}
      </div>

      {/* Add / Parse form */}
      {showAdd && (
        <div className="glass-card" style={{ marginBottom: 20 }}>
          <div className="glass-card-body">
            {/* Parse section */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ marginBottom: 8, textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Paste a job description to auto-fill</h4>
              <textarea
                rows={3}
                placeholder="Paste the full job description text here..."
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                style={{ width: "100%", marginBottom: 8 }}
              />
              <button onClick={handleParse} disabled={parsing || !pasteText.trim()} className="btn-secondary">
                {parsing ? "Parsing..." : "Extract details"}
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <h4 style={{ marginBottom: 8, textTransform: "none", letterSpacing: 0, color: "var(--text-h)" }}>Or fill manually</h4>
              <form onSubmit={handleAdd} className="form-grid">
                <input placeholder="Company *" value={company} onChange={(e) => setCompany(e.target.value)} />
                <input placeholder="Job title *" value={title} onChange={(e) => setTitle(e.target.value)} />
                <input placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
                <input placeholder="Location(s)" value={locations} onChange={(e) => setLocations(e.target.value)} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <textarea
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <button type="submit">Add offer</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Offers list as cards */}
      {offers.length === 0 ? (
        <p className="empty">No offers yet. Add your first one!</p>
      ) : (
        <div className="card-list">
          {offers.map((o) =>
            editingId === o.id ? (
              <div key={o.id} className="glass-card">
                <div className="glass-card-body">
                  <div className="form-grid">
                    <label>Company <input value={editFields.company} onChange={(e) => setEditFields({ ...editFields, company: e.target.value })} /></label>
                    <label>Title <input value={editFields.title} onChange={(e) => setEditFields({ ...editFields, title: e.target.value })} /></label>
                    <label>Location <input value={editFields.locations} onChange={(e) => setEditFields({ ...editFields, locations: e.target.value })} /></label>
                    <label>Date applied <input type="date" value={editFields.date_applied} onChange={(e) => setEditFields({ ...editFields, date_applied: e.target.value })} /></label>
                    <label>Status
                      <select value={editFields.status} onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <label>Link <input value={editFields.link} onChange={(e) => setEditFields({ ...editFields, link: e.target.value })} /></label>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className="btn-primary" onClick={handleSaveEdit} style={{ boxShadow: "none" }}>Save</button>
                    <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={o.id} className="glass-card" style={{ padding: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px" }}>
                  <span className={`status-dot ${o.status}`} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: "var(--text-h)", fontSize: 14 }}>{o.company}</strong>
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{o.title}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", gap: 12 }}>
                      {o.locations && <span>{o.locations}</span>}
                      {o.date_applied && <span>{o.date_applied}</span>}
                    </div>
                  </div>
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o, e.target.value)}
                    style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
                    className={`status-${o.status}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {o.link && <a href={o.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>Link</a>}
                  <button onClick={() => toggleNotes(o.id)} className="btn-ghost" title="Notes" style={{ fontSize: 12 }}>
                    Notes
                  </button>
                  <button onClick={() => startEdit(o)} className="btn-ghost" title="Edit">Edit</button>
                  <button onClick={() => handleDelete(o.id)} className="btn-icon" title="Delete">x</button>
                </div>

                {/* Notes panel */}
                {notesOpenId === o.id && (
                  <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px" }}>
                    {/* Add note */}
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                      <input
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddNote(o.id); }}
                        style={{ flex: 1 }}
                      />
                      <button className="btn-secondary" onClick={() => handleAddNote(o.id)} style={{ padding: "6px 14px" }}>
                        Add
                      </button>
                    </div>

                    {/* Notes list */}
                    {notes.length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>No notes yet</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {notes.map((n) => (
                          <div key={n.id} style={{ padding: "8px 12px", background: "var(--surface-solid)", borderRadius: 8, border: "1px solid var(--border)" }}>
                            {editingNoteId === n.id ? (
                              <div style={{ display: "flex", gap: 8 }}>
                                <textarea
                                  rows={2}
                                  value={editNoteContent}
                                  onChange={(e) => setEditNoteContent(e.target.value)}
                                  style={{ flex: 1 }}
                                />
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <button className="btn-ghost" onClick={() => handleSaveNoteEdit(o.id)} style={{ fontSize: 12 }}>Save</button>
                                  <button className="btn-ghost" onClick={() => setEditingNoteId(null)} style={{ fontSize: 12 }}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: 13, whiteSpace: "pre-wrap", marginBottom: 4 }}>{n.content}</div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                                    {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                                  </span>
                                  <div style={{ display: "flex", gap: 4 }}>
                                    <button
                                      className="btn-ghost"
                                      onClick={() => { setEditingNoteId(n.id); setEditNoteContent(n.content); }}
                                      style={{ fontSize: 11, padding: "2px 6px" }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="btn-icon"
                                      onClick={() => handleDeleteNote(o.id, n.id)}
                                      style={{ fontSize: 11 }}
                                    >
                                      x
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
