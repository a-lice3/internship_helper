import { useEffect, useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as api from "../api";

/* ── Helpers ── */

function Section({ title, children, onAdd }: { title: string; children: React.ReactNode; onAdd?: () => void }) {
  return (
    <div className="glass-card" style={{ marginBottom: 16 }}>
      <div className="glass-card-header">
        <h3>{title}</h3>
        {onAdd && (
          <button className="btn-add-section" onClick={onAdd} title="Add">+</button>
        )}
      </div>
      <div className="glass-card-body">{children}</div>
    </div>
  );
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="glass-card-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>
        <div className="glass-card-body">{children}</div>
      </div>
    </div>
  );
}

/** Inline-editable text: double-click to edit, Enter/blur to save, Escape to cancel */
function EditableText({ value, onSave, className, multiline }: {
  value: string; onSave: (v: string) => void; className?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      if (multiline) textareaRef.current?.focus();
      else inputRef.current?.focus();
    }
  }, [editing, multiline]);
  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <span
        className={`editable-text ${className ?? ""}`}
        onDoubleClick={() => { setDraft(value); setEditing(true); }}
      >
        {value}
      </span>
    );
  }

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  };

  if (multiline) {
    return (
      <textarea
        ref={textareaRef}
        className="editable-input editable-textarea"
        value={draft}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Escape") setEditing(false); }}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      className="editable-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
    />
  );
}

/** Inline-editable select: click on the tag to get a dropdown, auto-saves on change */
function EditableSelect({ value, options, onSave, className }: {
  value: string;
  options: { value: string; label: string }[];
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => { if (editing) selectRef.current?.focus(); }, [editing]);

  const currentLabel = options.find((o) => o.value === value)?.label ?? value;

  if (!editing) {
    return (
      <span
        className={`editable-tag ${className ?? ""}`}
        onClick={() => setEditing(true)}
      >
        {currentLabel}
      </span>
    );
  }

  return (
    <select
      ref={selectRef}
      className="editable-select"
      value={value}
      onChange={(e) => { onSave(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Inline-editable month input: click to get a date picker */
function EditableMonth({ value, onSave, placeholder }: {
  value: string | null; onSave: (v: string) => void; placeholder: string;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  if (!editing) {
    return (
      <span
        className="editable-text hint"
        onDoubleClick={() => setEditing(true)}
      >
        {value || placeholder}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="month"
      className="editable-input"
      value={value ?? ""}
      onChange={(e) => { onSave(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
    />
  );
}

type ModalType = null | "skill" | "language" | "experience" | "education" | "extra";

const SKILL_CATEGORIES = ["programming", "libraries", "tools", "soft", "other"] as const;
const LANG_LEVELS = ["beginner", "intermediate", "advanced", "fluent", "native"] as const;

export default function ProfilePage({ userId }: { userId: number }) {
  const { t } = useTranslation();

  const [skills, setSkills] = useState<api.Skill[]>([]);
  const [experiences, setExperiences] = useState<api.Experience[]>([]);
  const [education, setEducation] = useState<api.Education[]>([]);
  const [languages, setLanguages] = useState<api.Language[]>([]);
  const [extras, setExtras] = useState<api.Extracurricular[]>([]);

  const [filling, setFilling] = useState(false);
  const [cvList, setCvList] = useState<api.CV[]>([]);
  const [selectedCvId, setSelectedCvId] = useState<number | "">("");

  const [modalOpen, setModalOpen] = useState<ModalType>(null);
  const [modalData, setModalData] = useState<Record<string, string>>({});
  const [modalError, setModalError] = useState("");

  const openModal = (type: ModalType) => { setModalOpen(type); setModalData({}); setModalError(""); };
  const closeModal = () => { setModalOpen(null); setModalData({}); setModalError(""); };
  const modalField = (key: string) => modalData[key] ?? "";
  const setModalField = (key: string, value: string) =>
    setModalData((prev) => ({ ...prev, [key]: value }));

  const loadAll = () => {
    api.getSkills(userId).then(setSkills);
    api.getExperiences(userId).then(setExperiences);
    api.getEducation(userId).then(setEducation);
    api.getLanguages(userId).then(setLanguages);
    api.getExtracurriculars(userId).then(setExtras);
    api.getCVs(userId).then(setCvList);
  };

  useEffect(loadAll, [userId]);

  const handleClearProfile = async () => {
    await api.clearProfile(userId);
    setSkills([]); setExperiences([]); setEducation([]); setLanguages([]); setExtras([]);
  };

  const handleAutoFillFromCV = async () => {
    if (selectedCvId === "") return;
    setFilling(true);
    try {
      await api.autoFillProfile(userId, selectedCvId);
      loadAll();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("profile.autoFillFailed"));
    } finally {
      setFilling(false);
    }
  };

  /* ── Modal submit with validation ── */
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalOpen) return;
    setModalError("");

    switch (modalOpen) {
      case "skill": {
        if (!modalField("name").trim()) { setModalError(t("profile.requiredSkillName")); return; }
        const s = await api.addSkill(userId, { name: modalField("name"), category: modalField("category") || "programming" });
        setSkills((prev) => [...prev, s]);
        break;
      }
      case "language": {
        if (!modalField("language").trim()) { setModalError(t("profile.requiredLanguage")); return; }
        const l = await api.addLanguage(userId, { language: modalField("language"), level: modalField("level") || "intermediate" });
        setLanguages((prev) => [...prev, l]);
        break;
      }
      case "experience": {
        if (!modalField("title").trim()) { setModalError(t("profile.requiredTitle")); return; }
        const exp = await api.addExperience(userId, {
          title: modalField("title"),
          description: modalField("description") || undefined,
          technologies: modalField("technologies") || undefined,
          client: modalField("client") || undefined,
          start_date: modalField("start_date") || undefined,
          end_date: modalField("end_date") || undefined,
        });
        setExperiences((prev) => [...prev, exp]);
        break;
      }
      case "education": {
        const missing: string[] = [];
        if (!modalField("school").trim()) missing.push(t("profile.school"));
        if (!modalField("degree").trim()) missing.push(t("profile.degree"));
        if (missing.length) { setModalError(t("profile.requiredFields", { fields: missing.join(", ") })); return; }
        const ed = await api.addEducation(userId, {
          school: modalField("school"),
          degree: modalField("degree"),
          field: modalField("field") || undefined,
          description: modalField("description") || undefined,
          start_date: modalField("start_date") || undefined,
          end_date: modalField("end_date") || undefined,
        });
        setEducation((prev) => [...prev, ed]);
        break;
      }
      case "extra": {
        if (!modalField("name").trim()) { setModalError(t("profile.requiredName")); return; }
        const ex = await api.addExtracurricular(userId, { name: modalField("name"), description: modalField("description") || undefined });
        setExtras((prev) => [...prev, ex]);
        break;
      }
    }
    closeModal();
  };

  /* ── Inline quick-save helpers ── */
  const quickSaveSkill = async (id: number, patch: { name?: string; category?: string }) => {
    const updated = await api.updateSkill(userId, id, patch);
    setSkills((prev) => prev.map((s) => (s.id === id ? updated : s)));
  };

  const quickSaveLang = async (id: number, patch: { language?: string; level?: string }) => {
    const updated = await api.updateLanguage(userId, id, patch);
    setLanguages((prev) => prev.map((l) => (l.id === id ? updated : l)));
  };

  const quickSaveExp = async (id: number, patch: Record<string, string | undefined>) => {
    const updated = await api.updateExperience(userId, id, patch);
    setExperiences((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  const quickSaveEdu = async (id: number, patch: Record<string, string | undefined>) => {
    const updated = await api.updateEducation(userId, id, patch);
    setEducation((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  const quickSaveExtra = async (id: number, patch: { name?: string; description?: string }) => {
    const updated = await api.updateExtracurricular(userId, id, patch);
    setExtras((prev) => prev.map((e) => (e.id === id ? updated : e)));
  };

  /* ── Derived data ── */
  const skillsByCategory = SKILL_CATEGORIES
    .map((cat) => ({ cat, items: skills.filter((s) => s.category === cat) }))
    .filter(({ items }) => items.length > 0);

  const categoryOptions = SKILL_CATEGORIES.map((c) => ({ value: c, label: t(`profile.${c}`) }));
  const levelOptions = LANG_LEVELS.map((l) => ({ value: l, label: t(`profile.${l}`) }));

  /* ── Render ── */
  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <h2>{t("profile.title")}</h2>
          <p className="page-desc">{t("profile.description")}</p>
        </div>
        {cvList.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={selectedCvId}
              onChange={(e) => setSelectedCvId(e.target.value ? Number(e.target.value) : "")}
              style={{ minWidth: 160 }}
            >
              <option value="">{t("profile.selectCV")}</option>
              {cvList.map((cv) => (
                <option key={cv.id} value={cv.id}>{cv.name}</option>
              ))}
            </select>
            <button
              className="btn-autofill"
              onClick={handleAutoFillFromCV}
              disabled={filling || selectedCvId === ""}
              style={{ cursor: filling ? "wait" : "pointer" }}
            >
              {filling ? t("profile.extracting") : t("profile.autoFill")}
            </button>
          </div>
        )}
        <button className="btn-clear-profile" onClick={handleClearProfile}>{t("profile.clearAll")}</button>
      </div>

      <nav className="pill-nav">
        <NavLink to="/profile" end className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.profil")}</NavLink>
        <NavLink to="/profile/cvs" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.cvs")}</NavLink>
        <NavLink to="/profile/cover-letters" className={({ isActive }) => `pill${isActive ? " active" : ""}`}>{t("profile.coverLetters")}</NavLink>
      </nav>

      {/* ── Skills ── */}
      <Section title={t("profile.skills")} onAdd={() => openModal("skill")}>
        {skills.length === 0 ? (
          <p className="empty">{t("profile.noItems")}</p>
        ) : (
          <div className="skill-groups">
            {skillsByCategory.map(({ cat, items }) => (
              <div key={cat} className="skill-group">
                <span className="skill-group-label">{t(`profile.${cat}`)}</span>
                <div className="skill-chips">
                  {items.map((s) => (
                    <span key={s.id} className="skill-chip">
                      <EditableText value={s.name} onSave={(v) => quickSaveSkill(s.id, { name: v })} />
                      <select
                        className="chip-cat-select"
                        value={s.category}
                        onChange={(e) => quickSaveSkill(s.id, { category: e.target.value })}
                      >
                        {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <button className="chip-delete" onClick={() => { api.deleteSkill(userId, s.id); setSkills(skills.filter((x) => x.id !== s.id)); }}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Languages ── */}
      <Section title={t("profile.languages")} onAdd={() => openModal("language")}>
        {languages.length === 0 ? (
          <p className="empty">{t("profile.noItems")}</p>
        ) : (
          <div className="skill-chips">
            {languages.map((l) => (
              <span key={l.id} className="skill-chip">
                <EditableText value={l.language} onSave={(v) => quickSaveLang(l.id, { language: v })} />
                <EditableSelect
                  value={l.level}
                  options={levelOptions}
                  onSave={(v) => quickSaveLang(l.id, { level: v })}
                  className="chip-level-tag"
                />
                <button className="chip-delete" onClick={() => { api.deleteLanguage(userId, l.id); setLanguages(languages.filter((x) => x.id !== l.id)); }}>&times;</button>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* ── Experiences ── */}
      <Section title={t("profile.experiences")} onAdd={() => openModal("experience")}>
        {experiences.length === 0 ? (
          <p className="empty">{t("profile.noItems")}</p>
        ) : (
          <div className="profile-card-list">
            {experiences.map((exp) => (
              <div key={exp.id} className="profile-item-card">
                <div className="profile-item-header">
                  <EditableText value={exp.title} className="item-title" onSave={(v) => quickSaveExp(exp.id, { title: v })} />
                  <button className="btn-delete" onClick={() => { api.deleteExperience(userId, exp.id); setExperiences(experiences.filter((x) => x.id !== exp.id)); }}>&times;</button>
                </div>
                <div className="profile-item-meta">
                  {exp.client !== null && (
                    <EditableText value={exp.client || ""} className="tag" onSave={(v) => quickSaveExp(exp.id, { client: v })} />
                  )}
                  {exp.technologies !== null && (
                    <EditableText value={exp.technologies || ""} className="tag" onSave={(v) => quickSaveExp(exp.id, { technologies: v })} />
                  )}
                  <span className="profile-item-dates">
                    <EditableMonth value={exp.start_date} onSave={(v) => quickSaveExp(exp.id, { start_date: v })} placeholder="?" />
                    <span> - </span>
                    <EditableMonth value={exp.end_date} onSave={(v) => quickSaveExp(exp.id, { end_date: v })} placeholder={t("profile.present")} />
                  </span>
                </div>
                {(exp.description !== null) && (
                  <div className="profile-item-desc">
                    <EditableText
                      value={exp.description || ""}
                      multiline
                      onSave={(v) => quickSaveExp(exp.id, { description: v })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Education ── */}
      <Section title={t("profile.education")} onAdd={() => openModal("education")}>
        {education.length === 0 ? (
          <p className="empty">{t("profile.noItems")}</p>
        ) : (
          <div className="profile-card-list">
            {education.map((ed) => (
              <div key={ed.id} className="profile-item-card">
                <div className="profile-item-header">
                  <EditableText value={ed.degree} className="item-title" onSave={(v) => quickSaveEdu(ed.id, { degree: v })} />
                  <span> {t("profile.at")} </span>
                  <EditableText value={ed.school} onSave={(v) => quickSaveEdu(ed.id, { school: v })} />
                  <button className="btn-delete" onClick={() => { api.deleteEducation(userId, ed.id); setEducation(education.filter((x) => x.id !== ed.id)); }}>&times;</button>
                </div>
                <div className="profile-item-meta">
                  {ed.field !== null && (
                    <EditableText value={ed.field || ""} className="tag" onSave={(v) => quickSaveEdu(ed.id, { field: v })} />
                  )}
                  <span className="profile-item-dates">
                    <EditableMonth value={ed.start_date} onSave={(v) => quickSaveEdu(ed.id, { start_date: v })} placeholder="?" />
                    <span> - </span>
                    <EditableMonth value={ed.end_date} onSave={(v) => quickSaveEdu(ed.id, { end_date: v })} placeholder={t("profile.present")} />
                  </span>
                </div>
                {(ed.description !== null) && (
                  <div className="profile-item-desc">
                    <EditableText
                      value={ed.description || ""}
                      multiline
                      onSave={(v) => quickSaveEdu(ed.id, { description: v })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Extracurriculars ── */}
      <Section title={t("profile.extracurriculars")} onAdd={() => openModal("extra")}>
        {extras.length === 0 ? (
          <p className="empty">{t("profile.noItems")}</p>
        ) : (
          <div className="profile-card-list">
            {extras.map((ex) => (
              <div key={ex.id} className="profile-item-card">
                <div className="profile-item-header">
                  <EditableText value={ex.name} className="item-title" onSave={(v) => quickSaveExtra(ex.id, { name: v })} />
                  <button className="btn-delete" onClick={() => { api.deleteExtracurricular(userId, ex.id); setExtras(extras.filter((x) => x.id !== ex.id)); }}>&times;</button>
                </div>
                {(ex.description !== null) && (
                  <div className="profile-item-desc">
                    <EditableText
                      value={ex.description || ""}
                      multiline
                      onSave={(v) => quickSaveExtra(ex.id, { description: v })}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ===== Modals ===== */}

      <Modal open={modalOpen === "skill"} title={t("profile.addSkill")} onClose={closeModal}>
        <form onSubmit={handleModalSubmit} className="form-vertical">
          {modalError && <p className="modal-error">{modalError}</p>}
          <label>
            {t("profile.skillName")} *
            <input autoFocus value={modalField("name")} onChange={(e) => setModalField("name", e.target.value)} />
          </label>
          <label>
            {t("profile.categoryLabel")}
            <select value={modalField("category") || "programming"} onChange={(e) => setModalField("category", e.target.value)}>
              {SKILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{t(`profile.${cat}`)}</option>
              ))}
            </select>
          </label>
          <button type="submit">{t("profile.add")}</button>
        </form>
      </Modal>

      <Modal open={modalOpen === "language"} title={t("profile.addLanguage")} onClose={closeModal}>
        <form onSubmit={handleModalSubmit} className="form-vertical">
          {modalError && <p className="modal-error">{modalError}</p>}
          <label>
            {t("profile.language")} *
            <input autoFocus value={modalField("language")} onChange={(e) => setModalField("language", e.target.value)} />
          </label>
          <label>
            {t("profile.levelLabel")}
            <select value={modalField("level") || "intermediate"} onChange={(e) => setModalField("level", e.target.value)}>
              {LANG_LEVELS.map((l) => (
                <option key={l} value={l}>{t(`profile.${l}`)}</option>
              ))}
            </select>
          </label>
          <button type="submit">{t("profile.add")}</button>
        </form>
      </Modal>

      <Modal open={modalOpen === "experience"} title={t("profile.addExperience")} onClose={closeModal}>
        <form onSubmit={handleModalSubmit} className="form-vertical">
          {modalError && <p className="modal-error">{modalError}</p>}
          <label>
            {t("profile.titleField")}
            <input autoFocus value={modalField("title")} onChange={(e) => setModalField("title", e.target.value)} />
          </label>
          <label>
            {t("profile.technologies")}
            <input value={modalField("technologies")} onChange={(e) => setModalField("technologies", e.target.value)} />
          </label>
          <label>
            {t("profile.client")}
            <input value={modalField("client")} onChange={(e) => setModalField("client", e.target.value)} />
          </label>
          <div className="form-row">
            <label style={{ flex: 1 }}>
              {t("profile.startDate")}
              <input type="month" value={modalField("start_date")} onChange={(e) => setModalField("start_date", e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              {t("profile.endDate")}
              <input type="month" value={modalField("end_date")} onChange={(e) => setModalField("end_date", e.target.value)} />
            </label>
          </div>
          <label>
            {t("profile.descriptionField")}
            <textarea rows={3} value={modalField("description")} onChange={(e) => setModalField("description", e.target.value)} />
          </label>
          <button type="submit">{t("profile.add")}</button>
        </form>
      </Modal>

      <Modal open={modalOpen === "education"} title={t("profile.addEducation")} onClose={closeModal}>
        <form onSubmit={handleModalSubmit} className="form-vertical">
          {modalError && <p className="modal-error">{modalError}</p>}
          <label>
            {t("profile.school")}
            <input autoFocus value={modalField("school")} onChange={(e) => setModalField("school", e.target.value)} />
          </label>
          <label>
            {t("profile.degree")}
            <input value={modalField("degree")} onChange={(e) => setModalField("degree", e.target.value)} />
          </label>
          <label>
            {t("profile.field")}
            <input value={modalField("field")} onChange={(e) => setModalField("field", e.target.value)} />
          </label>
          <div className="form-row">
            <label style={{ flex: 1 }}>
              {t("profile.startDate")}
              <input type="month" value={modalField("start_date")} onChange={(e) => setModalField("start_date", e.target.value)} />
            </label>
            <label style={{ flex: 1 }}>
              {t("profile.endDate")}
              <input type="month" value={modalField("end_date")} onChange={(e) => setModalField("end_date", e.target.value)} />
            </label>
          </div>
          <label>
            {t("profile.descriptionField")}
            <textarea rows={3} value={modalField("description")} onChange={(e) => setModalField("description", e.target.value)} />
          </label>
          <button type="submit">{t("profile.add")}</button>
        </form>
      </Modal>

      <Modal open={modalOpen === "extra"} title={t("profile.addExtra")} onClose={closeModal}>
        <form onSubmit={handleModalSubmit} className="form-vertical">
          {modalError && <p className="modal-error">{modalError}</p>}
          <label>
            {t("profile.namePlaceholder")} *
            <input autoFocus value={modalField("name")} onChange={(e) => setModalField("name", e.target.value)} />
          </label>
          <label>
            {t("profile.descOptional")}
            <textarea rows={3} value={modalField("description")} onChange={(e) => setModalField("description", e.target.value)} />
          </label>
          <button type="submit">{t("profile.add")}</button>
        </form>
      </Modal>
    </div>
  );
}
