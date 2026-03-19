import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import * as api from "../api";

const STATUSES = ["bookmarked", "applied", "screened", "interview", "rejected", "accepted"];

export default function OffersPage({ userId }: { userId: number }) {
  const navigate = useNavigate();
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

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteOffer(userId, id);
    setOffers(offers.filter((o) => o.id !== id));
  };

  // Stats
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = offers.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <h2>Candidatures</h2>
        <p className="page-desc">Track and manage your applications</p>
      </div>

      <nav className="pill-nav">
        <NavLink to="/offers" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>Mes offres</NavLink>
        <NavLink to="/offers/search" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>Recherche</NavLink>
        <NavLink to="/offers/calendar" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>Calendrier</NavLink>
      </nav>

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

      {/* Offers list as cards — clickable to navigate to detail */}
      {offers.length === 0 ? (
        <p className="empty">No offers yet. Add your first one!</p>
      ) : (
        <div className="card-list">
          {offers.map((o) => (
            <div
              key={o.id}
              className="glass-card"
              style={{ padding: 0, cursor: "pointer" }}
              onClick={() => navigate(`/offers/${o.id}`)}
            >
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
                  onChange={(e) => { e.stopPropagation(); handleStatusChange(o, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
                  className={`status-${o.status}`}
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {o.link && (
                  <a href={o.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                    Link
                  </a>
                )}
                <button onClick={(e) => handleDelete(o.id, e)} className="btn-icon" title="Delete">x</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
