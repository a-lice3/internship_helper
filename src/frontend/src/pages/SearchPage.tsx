import { useState } from "react";
import * as api from "../api";

const SOURCE_LABELS: Record<string, string> = {
  francetravail: "France Travail",
  wttj: "Welcome to the Jungle",
  themuse: "The Muse",
};

const SUGGESTIONS = [
  "Je cherche un stage en data science a Paris",
  "Stage frontend React a Lyon",
  "Machine learning internship in London",
  "Stage developpeur Python, remote en France",
  "Stage en marketing digital a Bordeaux",
];

export default function SearchPage({ userId }: { userId: number }) {
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<api.ScrapedOffer[]>([]);
  const [sourcesUsed, setSourcesUsed] = useState<string[]>([]);
  const [parsedQuery, setParsedQuery] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);

  const doSearch = async (query: string) => {
    if (!query.trim()) return;
    setMessage(query);
    setLoading(true);
    setError("");
    setSearched(true);
    setExpandedId(null);
    try {
      const resp = await api.chatSearchOffers(userId, query);
      setResults(resp.results);
      setSourcesUsed(resp.sources_used);
      setParsedQuery(resp.parsed_query ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
      setParsedQuery(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(message);
  };

  const handleSave = async (offer: api.ScrapedOffer) => {
    setSavingId(offer.id);
    try {
      await api.saveScrapedOffer(userId, offer.id);
      setResults((prev) =>
        prev.map((r) => (r.id === offer.id ? { ...r, saved: true } : r))
      );
    } catch {
      alert("Failed to save offer");
    } finally {
      setSavingId(null);
    }
  };

  const scoreColor = (score: number | null) => {
    if (score === null) return "var(--text-muted)";
    if (score >= 75) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const sourceLabel = (src: string) => {
    if (src === "francetravail") return "FT";
    if (src === "wttj") return "WTTJ";
    if (src === "themuse") return "Muse";
    return src;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Search Internships</h2>
        <p className="page-desc">
          Describe what you're looking for and AI will find matching offers
        </p>
      </div>

      {/* Chat input */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-body">
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <textarea
                placeholder="Describe what you're looking for... (e.g. 'stage en data science a Paris')"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (message.trim() && !loading) doSearch(message);
                  }
                }}
                rows={3}
                style={{ flex: 1, resize: "vertical", minHeight: 72 }}
                disabled={loading}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !message.trim()}
                style={{ whiteSpace: "nowrap", alignSelf: "flex-end" }}
              >
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {/* Suggestions (only before first search) */}
          {!searched && (
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Try:</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => doSearch(s)}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 6,
                      background: "var(--bg-card)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parsed query info */}
      {parsedQuery && !loading && (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 16,
          fontSize: 12,
          color: "var(--text-muted)",
        }}>
          {parsedQuery.keywords && (
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: "var(--bg-card)", border: "1px solid var(--border)"
            }}>
              Keywords: {String(parsedQuery.keywords)}
            </span>
          )}
          {parsedQuery.location && (
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: "var(--bg-card)", border: "1px solid var(--border)"
            }}>
              Location: {String(parsedQuery.location)}
            </span>
          )}
          {parsedQuery.country && (
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: "var(--bg-card)", border: "1px solid var(--border)"
            }}>
              Country: {String(parsedQuery.country)}
            </span>
          )}
          {sourcesUsed.length > 0 && (
            <span style={{
              padding: "2px 8px", borderRadius: 4,
              background: "var(--bg-card)", border: "1px solid var(--border)"
            }}>
              Sources: {sourcesUsed.map((s) => SOURCE_LABELS[s] || s).join(", ")}
            </span>
          )}
          <span style={{
            padding: "2px 8px", borderRadius: 4,
            background: "var(--bg-card)", border: "1px solid var(--border)"
          }}>
            {results.length} result{results.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="glass-card" style={{ marginBottom: 16, borderColor: "#ef4444" }}>
          <div className="glass-card-body">
            <p className="error">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
          <p style={{ fontSize: 16 }}>Searching offers and matching to your profile...</p>
          <p style={{ fontSize: 13 }}>This may take a few seconds</p>
        </div>
      )}

      {/* Results list */}
      {!loading && results.length > 0 && (
        <div className="card-list">
          {results.map((offer) => (
            <div key={offer.id} className="glass-card" style={{ padding: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "14px 18px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setExpandedId(expandedId === offer.id ? null : offer.id)
                }
              >
                {/* Score badge */}
                <div
                  style={{
                    minWidth: 48,
                    height: 48,
                    borderRadius: 12,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--bg-card)",
                    border: `2px solid ${scoreColor(offer.match_score)}`,
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: scoreColor(offer.match_score),
                    }}
                  >
                    {offer.match_score !== null ? Math.round(offer.match_score) : "?"}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>match</span>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--text-h)", fontSize: 14 }}>
                      {offer.company}
                    </strong>
                    <span style={{ color: "var(--text)", fontSize: 13 }}>
                      {offer.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: "var(--bg-card)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      {sourceLabel(offer.source)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      marginTop: 2,
                      display: "flex",
                      gap: 12,
                    }}
                  >
                    {offer.locations && <span>{offer.locations}</span>}
                    {offer.contract_type && <span>{offer.contract_type}</span>}
                    {offer.salary && <span>{offer.salary}</span>}
                  </div>
                  {offer.match_reasons.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4 }}>
                      {offer.match_reasons[0]}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                  {offer.link && (
                    <a
                      href={offer.link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12 }}
                    >
                      Link
                    </a>
                  )}
                  <button
                    className={offer.saved ? "btn-secondary" : "btn-primary"}
                    style={{ fontSize: 12, padding: "4px 10px", boxShadow: "none" }}
                    disabled={offer.saved || savingId === offer.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSave(offer);
                    }}
                  >
                    {offer.saved ? "Saved" : savingId === offer.id ? "..." : "Save"}
                  </button>
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === offer.id && (
                <div
                  style={{
                    padding: "0 18px 14px 78px",
                    borderTop: "1px solid var(--border)",
                  }}
                >
                  {offer.match_reasons.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <strong style={{ fontSize: 12, color: "var(--text-h)" }}>
                        Why this matches your profile:
                      </strong>
                      <ul style={{ margin: "4px 0 0 16px", fontSize: 12, color: "var(--text)" }}>
                        {offer.match_reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {offer.description && (
                    <div style={{ marginTop: 10 }}>
                      <strong style={{ fontSize: 12, color: "var(--text-h)" }}>
                        Description:
                      </strong>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text)",
                          marginTop: 4,
                          whiteSpace: "pre-wrap",
                          maxHeight: 200,
                          overflow: "auto",
                        }}
                      >
                        {offer.description}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {searched && !loading && results.length === 0 && !error && (
        <p className="empty">
          No offers found. Try describing your search differently.
        </p>
      )}
    </div>
  );
}
