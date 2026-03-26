import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../api";

// ---------- Types ----------

type Tab = "memos" | "recommendations";

// ---------- Main Component ----------

export default function MemosPage({ userId }: { userId: number }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("memos");

  // -- Memos state --
  const [memos, setMemos] = useState<api.Memo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // -- Edit / Create --
  const [editing, setEditing] = useState<api.Memo | null>(null);
  const [creating, setCreating] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formSkillName, setFormSkillName] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // -- Expanded memo --
  const [expanded, setExpanded] = useState<number | null>(null);

  // -- Recommendations state --
  const [recommendations, setRecommendations] = useState<api.SkillRecommendations | null>(null);
  const [recoLoading, setRecoLoading] = useState(false);

  // ---------- Data fetching ----------

  const [memosRefreshKey, setMemosRefreshKey] = useState(0);

  const loadMemos = () => setMemosRefreshKey((k) => k + 1);

  useEffect(() => {
    api.getMemos(userId, {
      search: search || undefined,
      tag: selectedTag || undefined,
      favorites_only: favoritesOnly || undefined,
    })
      .then(r => setMemos(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, search, selectedTag, favoritesOnly, memosRefreshKey]);

  useEffect(() => {
    if (tab !== "recommendations") return;
    api.getSkillRecommendations(userId)
      .then(setRecommendations)
      .catch(() => {})
      .finally(() => setRecoLoading(false));
  }, [tab, userId]);

  // ---------- All tags (extracted from memos) ----------

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    memos.forEach((m) => m.tags?.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [memos]);

  // ---------- Handlers ----------

  const handleCreate = async () => {
    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
    await api.createMemo(userId, {
      title: formTitle,
      content: formContent,
      tags: tags.length > 0 ? tags : undefined,
      skill_name: formSkillName || undefined,
    });
    clearDraft();
    resetForm();
    loadMemos();
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const tags = formTags.split(",").map((t) => t.trim()).filter(Boolean);
    await api.updateMemo(userId, editing.id, {
      title: formTitle,
      content: formContent,
      tags,
      skill_name: formSkillName || null,
    });
    clearDraft();
    resetForm();
    loadMemos();
  };

  const handleDelete = async (id: number) => {
    await api.deleteMemo(userId, id);
    if (expanded === id) setExpanded(null);
    loadMemos();
  };

  const handleToggleFavorite = async (memo: api.Memo) => {
    await api.updateMemo(userId, memo.id, { is_favorite: !memo.is_favorite });
    loadMemos();
  };

  const startEdit = (memo: api.Memo) => {
    setEditing(memo);
    setCreating(false);
    setFormTitle(memo.title);
    setFormContent(memo.content);
    setFormTags(memo.tags.join(", "));
    setFormSkillName(memo.skill_name || "");
    setShowPreview(false);
  };

  const startCreate = (skillName?: string) => {
    setCreating(true);
    setEditing(null);
    setFormTitle("");
    setFormContent("");
    setFormTags("");
    setFormSkillName(skillName || "");
    setShowPreview(false);
  };

  const DRAFT_KEY = `memo-draft-${userId}`;

  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, [DRAFT_KEY]);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        title: formTitle, content: formContent, tags: formTags,
        skillName: formSkillName, editingId: editing?.id ?? null,
      }));
    } catch { /* quota exceeded — ignore */ }
  }, [DRAFT_KEY, formTitle, formContent, formTags, formSkillName, editing]);

  // Auto-backup draft to localStorage on every change
  useEffect(() => {
    if (!creating && !editing) return;
    saveDraft();
  }, [formTitle, formContent, formTags, formSkillName, creating, editing, saveDraft]);

  // Restore draft on mount (if user was disconnected mid-edit)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.content || draft.title) {
        setFormTitle(draft.title || "");
        setFormContent(draft.content || "");
        setFormTags(draft.tags || "");
        setFormSkillName(draft.skillName || "");
        if (draft.editingId) {
          // We can't fully restore editing state (need the memo object),
          // so open as "create" with the draft content
          setCreating(true);
        } else {
          setCreating(true);
        }
        // Don't clear draft yet — wait until user saves or cancels
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Warn before page unload if form has unsaved content
  useEffect(() => {
    if (!creating && !editing) return;
    if (!formContent.trim() && !formTitle.trim()) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      saveDraft();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [creating, editing, formContent, formTitle, saveDraft]);

  // Backup draft on session expiry
  useEffect(() => {
    const handler = () => saveDraft();
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, [saveDraft]);

  const resetForm = () => {
    setCreating(false);
    setEditing(null);
    setFormTitle("");
    setFormContent("");
    setFormTags("");
    setFormSkillName("");
    setShowPreview(false);
    clearDraft();
  };

  const handleRefreshRecommendations = () => {
    setRecoLoading(true);
    api.refreshSkillRecommendations(userId)
      .then(setRecommendations)
      .catch(() => {})
      .finally(() => setRecoLoading(false));
  };

  const handleCreateMemoFromSkill = (skillName: string) => {
    setTab("memos");
    startCreate(skillName);
  };

  // ---------- Render ----------

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2>{t("memos.title")}</h2>
          <p className="page-subtitle">{t("memos.subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="memo-tabs">
        <button
          className={`memo-tab ${tab === "memos" ? "active" : ""}`}
          onClick={() => setTab("memos")}
        >
          {t("memos.tabMemos")}
        </button>
        <button
          className={`memo-tab ${tab === "recommendations" ? "active" : ""}`}
          onClick={() => setTab("recommendations")}
        >
          {t("memos.tabRecommendations")}
        </button>
      </div>

      {tab === "memos" ? (
        <>
          {/* Toolbar */}
          <div className="memo-toolbar">
            <input
              type="text"
              className="memo-search"
              placeholder={t("memos.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className={`btn-ghost ${favoritesOnly ? "active" : ""}`}
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              title={t("memos.favoritesOnly")}
            >
              {favoritesOnly ? "\u2605" : "\u2606"}
            </button>
            <div className="memo-view-toggle">
              <button
                className={viewMode === "grid" ? "active" : ""}
                onClick={() => setViewMode("grid")}
                title={t("memos.gridView")}
              >
                {"\u25A6"}
              </button>
              <button
                className={viewMode === "list" ? "active" : ""}
                onClick={() => setViewMode("list")}
                title={t("memos.listView")}
              >
                {"\u2630"}
              </button>
            </div>
            <button className="btn-primary" onClick={() => startCreate()}>
              + {t("memos.newMemo")}
            </button>
          </div>

          {/* Tag filter pills */}
          {allTags.length > 0 && (
            <div className="memo-tag-pills">
              <button
                className={`tag-pill ${selectedTag === null ? "active" : ""}`}
                onClick={() => setSelectedTag(null)}
              >
                {t("memos.allTags")}
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`tag-pill ${selectedTag === tag ? "active" : ""}`}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Create / Edit form */}
          {(creating || editing) && (
            <div className="glass-card memo-form">
              <div className="glass-card-header">
                <h3>{editing ? t("memos.editMemo") : t("memos.newMemo")}</h3>
                <button className="btn-ghost" onClick={resetForm}>{"\u2715"}</button>
              </div>
              <div className="glass-card-body">
                <input
                  type="text"
                  placeholder={t("memos.titlePlaceholder")}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="memo-title-input"
                />
                <div className="memo-editor-tabs">
                  <button
                    className={!showPreview ? "active" : ""}
                    onClick={() => setShowPreview(false)}
                  >
                    {t("memos.edit")}
                  </button>
                  <button
                    className={showPreview ? "active" : ""}
                    onClick={() => setShowPreview(true)}
                  >
                    {t("memos.preview")}
                  </button>
                </div>
                {showPreview ? (
                  <div className="memo-preview">{formContent}</div>
                ) : (
                  <textarea
                    placeholder={t("memos.contentPlaceholder")}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    className="memo-content-textarea"
                    rows={10}
                  />
                )}
                <input
                  type="text"
                  placeholder={t("memos.tagsPlaceholder")}
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="memo-tags-input"
                />
                <input
                  type="text"
                  placeholder={t("memos.skillNamePlaceholder")}
                  value={formSkillName}
                  onChange={(e) => setFormSkillName(e.target.value)}
                  className="memo-skill-input"
                />
                <div className="memo-form-actions">
                  <button className="btn-ghost" onClick={resetForm}>
                    {t("memos.cancel")}
                  </button>
                  <button
                    className="btn-primary"
                    onClick={editing ? handleUpdate : handleCreate}
                    disabled={!formTitle.trim() || !formContent.trim()}
                  >
                    {editing ? t("memos.save") : t("memos.create")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Memo list */}
          {loading ? (
            <p className="loading-text">{t("memos.loading")}</p>
          ) : memos.length === 0 ? (
            <div className="empty-state">
              <p>{t("memos.noMemos")}</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "memo-grid" : "memo-list"}>
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  className={`glass-card memo-card ${expanded === memo.id ? "expanded" : ""}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setExpanded(expanded === memo.id ? null : memo.id)}
                >
                  <div className="memo-card-header">
                    <h4>{memo.title}</h4>
                    <div className="memo-card-actions">
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(memo); }}
                        title={t("memos.toggleFavorite")}
                      >
                        {memo.is_favorite ? "\u2605" : "\u2606"}
                      </button>
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); startEdit(memo); }}
                        title={t("memos.editMemo")}
                      >
                        {"\u270E"}
                      </button>
                      <button
                        className="btn-icon danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(memo.id); }}
                        title={t("memos.deleteMemo")}
                      >
                        {"\u2717"}
                      </button>
                    </div>
                  </div>
                  {expanded === memo.id ? (
                    <div className="memo-card-body">{memo.content}</div>
                  ) : (
                    <p className="memo-card-preview">
                      {memo.content.slice(0, 120)}
                      {memo.content.length > 120 ? "..." : ""}
                    </p>
                  )}
                  {memo.tags.length > 0 && (
                    <div className="memo-card-tags">
                      {memo.tags.map((tag) => (
                        <span key={tag} className="badge">{tag}</span>
                      ))}
                    </div>
                  )}
                  {memo.skill_name && (
                    <span className="badge badge-skill">{memo.skill_name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Recommendations tab */
        <div className="recommendations-section">
          <div className="memo-toolbar">
            <p className="reco-info">
              {recommendations
                ? t("memos.recoInfo", { count: recommendations.offers_analyzed_count })
                : ""}
            </p>
            <button
              className="btn-primary"
              onClick={handleRefreshRecommendations}
              disabled={recoLoading}
            >
              {recoLoading ? t("memos.refreshing") : t("memos.refresh")}
            </button>
          </div>

          {recoLoading && !recommendations ? (
            <p className="loading-text">{t("memos.loading")}</p>
          ) : !recommendations || recommendations.aggregated_skills.length === 0 ? (
            <div className="empty-state">
              <p>{t("memos.noRecommendations")}</p>
            </div>
          ) : (
            <div className="reco-list">
              {recommendations.aggregated_skills.map((skill, i) => (
                <div key={i} className="glass-card reco-card">
                  <div className="reco-card-header">
                    <div className="reco-skill-info">
                      <h4>{skill.skill_name}</h4>
                      <span className={`badge ${skill.skill_type === "hard" ? "badge-hard" : "badge-soft"}`}>
                        {skill.skill_type}
                      </span>
                      {skill.user_has_skill && (
                        <span className="badge badge-acquired">{t("memos.acquired")}</span>
                      )}
                    </div>
                    <div className="reco-card-actions">
                      <span className="reco-frequency">
                        {t("memos.appearsIn", { count: skill.frequency })}
                      </span>
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => handleCreateMemoFromSkill(skill.skill_name)}
                      >
                        + {t("memos.createMemo")}
                      </button>
                    </div>
                  </div>
                  {skill.offer_titles.length > 0 && (
                    <div className="reco-offers">
                      {skill.offer_titles.map((title, j) => (
                        <span key={j} className="badge badge-offer">{title}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
