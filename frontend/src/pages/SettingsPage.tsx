import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../api";
import i18n from "../i18n";
import { useTheme } from "../ThemeContext";
import { themes } from "../themes";

export default function SettingsPage({
  userId, userName, userEmail, onLogout,
}: {
  userId: number; userName: string; userEmail: string; onLogout: () => void;
}) {
  const { t } = useTranslation();
  const { themeId, setThemeId } = useTheme();
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiInstructionsSaved, setAiInstructionsSaved] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);

  useEffect(() => {
    api.getAIInstructions(userId).then((res) => {
      const val = res.ai_instructions ?? "";
      setAiInstructions(val);
      setAiInstructionsSaved(val);
    });
  }, [userId]);

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      await api.updateAIInstructions(userId, aiInstructions);
      setAiInstructionsSaved(aiInstructions);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t("settings.failedSave"));
    } finally {
      setSavingInstructions(false);
    }
  };

  const instructionsChanged = aiInstructions !== aiInstructionsSaved;

  return (
    <div className="page">
      <div className="page-header">
        <h2>{t("settings.title")}</h2>
        <p className="page-desc">{t("settings.description")}</p>
      </div>

      {/* Account */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-header"><h3>{t("settings.account")}</h3></div>
        <div className="glass-card-body">
          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
            <div><span style={{ color: "var(--text-muted)", width: 80, display: "inline-block" }}>{t("settings.nameLabel")}</span> <strong>{userName}</strong></div>
            <div><span style={{ color: "var(--text-muted)", width: 80, display: "inline-block" }}>{t("settings.emailLabel")}</span> <strong>{userEmail}</strong></div>
          </div>
          <button onClick={onLogout} className="btn-danger" style={{ marginTop: 16 }}>
            {t("settings.logout")}
          </button>
        </div>
      </div>

      {/* Language */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-header"><h3>{t("settings.languageLabel")}</h3></div>
        <div className="glass-card-body">
          <p className="hint" style={{ marginBottom: 8 }}>
            {t("settings.languageHint")}
          </p>
          <select
            value={["fr", "de", "es"].find((l) => i18n.language?.startsWith(l)) || "en"}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="en">English</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      {/* Theme */}
      <div className="glass-card" style={{ marginBottom: 20 }}>
        <div className="glass-card-header"><h3>{t("settings.themeLabel")}</h3></div>
        <div className="glass-card-body">
          <p className="hint" style={{ marginBottom: 12 }}>
            {t("settings.themeHint")}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
            {themes.map((theme) => {
              const isActive = themeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => setThemeId(theme.id)}
                  style={{
                    position: "relative",
                    background: "none",
                    border: isActive ? `2px solid ${theme.preview.accent}` : "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 0,
                    cursor: "pointer",
                    overflow: "hidden",
                    transition: "all 0.2s var(--ease)",
                    boxShadow: isActive ? `0 0 0 3px ${theme.preview.accent}33` : "none",
                  }}
                >
                  {/* Mini dashboard preview */}
                  <div style={{
                    display: "flex",
                    height: 100,
                    background: theme.preview.bg,
                    borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                  }}>
                    {/* Mini sidebar */}
                    <div style={{
                      width: 32,
                      background: theme.preview.sidebar,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      padding: "8px 4px",
                      alignItems: "center",
                      borderRight: `1px solid ${theme.preview.accent}22`,
                    }}>
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} style={{
                          width: 14,
                          height: 3,
                          borderRadius: 2,
                          background: i === 0 ? theme.preview.accent : `${theme.preview.accent}44`,
                        }} />
                      ))}
                    </div>
                    {/* Mini content area */}
                    <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                      {/* Mini header bar */}
                      <div style={{ width: "60%", height: 4, borderRadius: 2, background: `${theme.preview.accent}88` }} />
                      {/* Mini cards row */}
                      <div style={{ display: "flex", gap: 4, flex: 1 }}>
                        <div style={{
                          flex: 1,
                          background: theme.preview.card,
                          borderRadius: 4,
                          border: `1px solid ${theme.preview.accent}22`,
                          padding: 4,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}>
                          <div style={{ width: "70%", height: 3, borderRadius: 1, background: `${theme.preview.accent}55` }} />
                          <div style={{ width: "100%", height: 4, borderRadius: 2, background: `${theme.preview.accent}20` }}>
                            <div style={{ width: "45%", height: "100%", borderRadius: 2, background: theme.preview.accent }} />
                          </div>
                          <div style={{ width: "100%", height: 4, borderRadius: 2, background: `${theme.preview.accent}20` }}>
                            <div style={{ width: "70%", height: "100%", borderRadius: 2, background: theme.preview.accent }} />
                          </div>
                        </div>
                        <div style={{
                          flex: 1,
                          background: theme.preview.card,
                          borderRadius: 4,
                          border: `1px solid ${theme.preview.accent}22`,
                          padding: 4,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                        }}>
                          <div style={{ width: "50%", height: 3, borderRadius: 1, background: `${theme.preview.accent}55` }} />
                          <div style={{ width: "80%", height: 3, borderRadius: 1, background: `${theme.preview.accent}33` }} />
                          <div style={{ width: "60%", height: 3, borderRadius: 1, background: `${theme.preview.accent}33` }} />
                        </div>
                      </div>
                      {/* Mini calendar */}
                      <div style={{
                        background: theme.preview.card,
                        borderRadius: 4,
                        border: `1px solid ${theme.preview.accent}22`,
                        height: 20,
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: 1,
                        padding: 2,
                        alignItems: "center",
                      }}>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div key={i} style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: i === 2 || i === 5 ? theme.preview.accent : `${theme.preview.accent}22`,
                            margin: "0 auto",
                          }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Theme name */}
                  <div style={{
                    padding: "8px 10px",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? theme.preview.accent : "var(--text-h)",
                    background: "var(--surface)",
                    borderTop: "1px solid var(--border)",
                    textAlign: "center",
                  }}>
                    {t(theme.labelKey)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Instructions */}
      <div className="glass-card">
        <div className="glass-card-header"><h3>{t("settings.aiInstructions")}</h3></div>
        <div className="glass-card-body">
          <p className="hint" style={{ marginBottom: 8 }}>
            {t("settings.aiHint")}
          </p>
          <textarea
            value={aiInstructions}
            onChange={(e) => setAiInstructions(e.target.value)}
            placeholder={t("settings.aiPlaceholder")}
            rows={6}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={handleSaveInstructions}
              disabled={!instructionsChanged || savingInstructions}
              className="btn-primary"
              style={{ boxShadow: "none" }}
            >
              {savingInstructions ? t("settings.saving") : t("settings.save")}
            </button>
            {!instructionsChanged && aiInstructionsSaved && (
              <span className="hint">{t("settings.saved")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
