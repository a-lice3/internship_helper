import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import { getStatusLabel, STATUSES } from "../i18n/helpers";

export default function OffersPage({ userId }: { userId: number }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [offers, setOffers] = useState<api.Offer[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());

  const load = () => {
    api.getOffers(userId).then(r => setOffers(r.items));
  };

  useEffect(load, [userId]);

  const toggleStatus = (s: string) => {
    setFilterStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const filteredOffers = filterStatuses.size === 0
    ? offers
    : offers.filter((o) => filterStatuses.has(o.status));

  const handleStatusChange = async (offer: api.Offer, newStatus: string) => {
    const updated = await api.updateOffer(userId, offer.id, { status: newStatus });
    setOffers(offers.map((o) => (o.id === updated.id ? updated : o)));
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.deleteOffer(userId, id);
    setOffers(offers.filter((o) => o.id !== id));
  };

  // Stats — always computed from all offers, not filtered
  const counts = STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = offers.filter((o) => o.status === s).length;
    return acc;
  }, {});

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t("offers.title")}</h2>
        <p className="page-desc">{t("offers.description")}</p>
      </div>

      <nav className="pill-nav">
        <NavLink to="/offers" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("offers.myOffers")}</NavLink>
        <NavLink to="/offers/search" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("offers.search")}</NavLink>
      </nav>

      {/* Stats bento row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {STATUSES.map((s) => (
          <div
            key={s}
            className="glass-card stat-card"
            style={{ cursor: "pointer", border: filterStatuses.has(s) ? `2px solid var(--accent)` : undefined }}
            onClick={() => toggleStatus(s)}
          >
            <span className="stat-value">{counts[s] || 0}</span>
            <span className="stat-label" style={{ textTransform: "capitalize" }}>{getStatusLabel(t, s)}</span>
          </div>
        ))}
      </div>

      {/* Actions row */}
      {filterStatuses.size > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button className="btn-secondary" onClick={() => setFilterStatuses(new Set())}>
            {t("offers.clearFilters")}
          </button>
        </div>
      )}

      {/* Offers list as cards — clickable to navigate to detail */}
      {filteredOffers.length === 0 ? (
        <p className="empty">{offers.length === 0 ? t("offers.noOffers") : t("offers.noMatch")}</p>
      ) : (
        <div className="card-list">
          {filteredOffers.map((o) => (
            <div
              key={o.id}
              className="glass-card"
              style={{ padding: 0, cursor: "pointer" }}
              onClick={() => navigate(`/offers/${o.id}`)}
            >
              <div style={{ padding: "14px 18px" }}>
                {/* Row 1: Company, title, locations, link, date, delete */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ color: "var(--text-h)", fontSize: 14 }}>{o.company}</strong>
                  {o.date_applied && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{new Date(o.date_applied).getFullYear()}</span>}
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{o.title}</span>
                  {o.locations && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{o.locations}</span>}
                  {o.link && (
                    <a href={o.link} target="_blank" rel="noreferrer" style={{ fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                      {t("offers.link")}
                    </a>
                  )}
                  <span style={{ flex: 1 }} />
                  {o.date_applied && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{o.date_applied}</span>}
                  <button onClick={(e) => handleDelete(o.id, e)} className="btn-icon" title={t("offers.delete")}>x</button>
                </div>
                {/* Row 2: Status */}
                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span className={`status-dot ${o.status}`} />
                  <select
                    value={o.status}
                    onChange={(e) => { e.stopPropagation(); handleStatusChange(o, e.target.value); }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: "auto", fontSize: 11, padding: "2px 6px", border: "none", background: "transparent", color: "var(--text-muted)", cursor: "pointer", textTransform: "capitalize" }}
                    className={`status-${o.status}`}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(t, s)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
