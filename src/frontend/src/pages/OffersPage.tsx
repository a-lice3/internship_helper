import { useEffect, useState } from "react";
import * as api from "../api";

const STATUSES = ["applied", "screened", "interview", "rejected", "accepted"];

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
  }>({ company: "", title: "", link: "", locations: "", description: "", status: "applied", date_applied: "" });

  const load = () => {
    api.getOffers(userId, filterStatus || undefined).then(setOffers);
  };

  useEffect(load, [userId, filterStatus]);

  // ---------- Parse pasted job description ----------
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
    } catch {
      alert("Failed to parse offer text.");
    } finally {
      setParsing(false);
    }
  };

  // ---------- Add offer ----------
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
  };

  // ---------- Status change (quick) ----------
  const handleStatusChange = async (offer: api.Offer, newStatus: string) => {
    const updated = await api.updateOffer(userId, offer.id, { status: newStatus });
    setOffers(offers.map((o) => (o.id === updated.id ? updated : o)));
  };

  // ---------- Edit ----------
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

  // ---------- Delete ----------
  const handleDelete = async (id: number) => {
    if (!confirm("Delete this offer?")) return;
    await api.deleteOffer(userId, id);
    setOffers(offers.filter((o) => o.id !== id));
  };

  return (
    <div className="page">
      <h2>Internship Offers</h2>

      {/* Parse section */}
      <div className="section" style={{ marginBottom: "1rem" }}>
        <h3>Paste a job description to auto-fill</h3>
        <textarea
          rows={4}
          placeholder="Paste the full job description text here..."
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          style={{ width: "100%", marginBottom: "0.5rem" }}
        />
        <button onClick={handleParse} disabled={parsing || !pasteText.trim()}>
          {parsing ? "Parsing..." : "Extract offer details"}
        </button>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="inline-form" style={{ flexWrap: "wrap" }}>
        <input placeholder="Company *" value={company} onChange={(e) => setCompany(e.target.value)} />
        <input placeholder="Job title *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Link (optional)" value={link} onChange={(e) => setLink(e.target.value)} />
        <input placeholder="Location(s)" value={locations} onChange={(e) => setLocations(e.target.value)} />
        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          style={{ flex: "1 1 100%" }}
        />
        <button type="submit">Add offer</button>
      </form>

      {/* Filter */}
      <div className="filter-bar">
        <label>Filter: </label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {offers.length === 0 ? (
        <p className="empty">No offers yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Title</th>
              <th>Location</th>
              <th>Date Applied</th>
              <th>Status</th>
              <th>Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) =>
              editingId === o.id ? (
                <tr key={o.id} className="editing-row">
                  <td><input value={editFields.company} onChange={(e) => setEditFields({ ...editFields, company: e.target.value })} /></td>
                  <td><input value={editFields.title} onChange={(e) => setEditFields({ ...editFields, title: e.target.value })} /></td>
                  <td><input value={editFields.locations} onChange={(e) => setEditFields({ ...editFields, locations: e.target.value })} /></td>
                  <td><input type="date" value={editFields.date_applied} onChange={(e) => setEditFields({ ...editFields, date_applied: e.target.value })} /></td>
                  <td>
                    <select value={editFields.status} onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><input value={editFields.link} onChange={(e) => setEditFields({ ...editFields, link: e.target.value })} /></td>
                  <td>
                    <button onClick={handleSaveEdit}>Save</button>
                    <button onClick={() => setEditingId(null)}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={o.id}>
                  <td>{o.company}</td>
                  <td>{o.title}</td>
                  <td>{o.locations || "-"}</td>
                  <td>{o.date_applied || "-"}</td>
                  <td>
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o, e.target.value)}
                      className={`status-${o.status}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td>
                    {o.link && <a href={o.link} target="_blank" rel="noreferrer">View</a>}
                  </td>
                  <td>
                    <button onClick={() => startEdit(o)} title="Edit">Edit</button>
                    <button onClick={() => handleDelete(o.id)} className="btn-delete" title="Delete">x</button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
