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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            {themes.map((theme) => {
              const isActive = themeId === theme.id;
              const p = theme.preview;
              const r = p.radius ?? 10;
              const isNeon = !!p.accent2;
              const hasGradientHeader = !!p.headerGradient;
              const borderColor = p.border ?? p.accent;
              const glowShadow = isNeon
                ? `0 0 12px ${p.accent}66, 0 0 30px ${p.accent}22`
                : "none";
              return (
                <button
                  key={theme.id}
                  onClick={() => setThemeId(theme.id)}
                  style={{
                    position: "relative",
                    background: "none",
                    border: isActive
                      ? `2px solid ${borderColor}`
                      : `1px solid ${isNeon ? borderColor + "55" : "var(--border)"}`,
                    borderRadius: r + 2,
                    padding: 0,
                    cursor: "pointer",
                    overflow: "hidden",
                    transition: "all 0.25s ease",
                    boxShadow: isActive
                      ? isNeon
                        ? `0 0 16px ${p.accent}88, 0 0 40px ${p.accent}33`
                        : `0 0 0 3px ${p.accent}33`
                      : glowShadow,
                  }}
                >
                  {/* Mini dashboard preview */}
                  <div style={{
                    display: "flex",
                    height: 110,
                    background: p.bg,
                  }}>
                    {/* Mini sidebar */}
                    <div style={{
                      width: 34,
                      background: p.sidebar,
                      display: "flex",
                      flexDirection: "column",
                      gap: 5,
                      padding: "10px 5px",
                      alignItems: "center",
                      borderRight: `1px solid ${borderColor}${isNeon ? "44" : "22"}`,
                      ...(isNeon ? { boxShadow: `inset -1px 0 8px ${p.accent}15` } : {}),
                    }}>
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} style={{
                          width: 16,
                          height: 3,
                          borderRadius: Math.max(1, r / 4),
                          background: i === 0 ? p.accent : `${p.accent}${isNeon ? "55" : "33"}`,
                          ...(isNeon && i === 0 ? { boxShadow: `0 0 6px ${p.accent}88` } : {}),
                        }} />
                      ))}
                    </div>
                    {/* Mini content area */}
                    <div style={{ flex: 1, padding: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                      {/* Mini header */}
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <div style={{
                          width: "50%",
                          height: 5,
                          borderRadius: Math.max(1, r / 4),
                          background: isNeon
                            ? `linear-gradient(90deg, ${p.accent}, ${p.accent2})`
                            : `${p.accent}88`,
                        }} />
                      </div>
                      {/* Mini cards row */}
                      <div style={{ display: "flex", gap: 4, flex: 1 }}>
                        <div style={{
                          flex: 1,
                          background: p.card,
                          borderRadius: Math.max(2, r / 3),
                          border: `1px solid ${borderColor}${isNeon ? "44" : "18"}`,
                          padding: 5,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          ...(isNeon ? { boxShadow: `inset 0 0 8px ${p.accent}10, 0 0 4px ${p.accent}15` } : {}),
                        }}>
                          <div style={{ width: "65%", height: 3, borderRadius: 1, background: hasGradientHeader ? p.headerGradient : `${p.accent}55` }} />
                          <div style={{ width: "100%", height: 5, borderRadius: Math.max(1, r / 5), background: `${p.accent}20` }}>
                            <div style={{
                              width: "45%",
                              height: "100%",
                              borderRadius: Math.max(1, r / 5),
                              background: isNeon
                                ? `linear-gradient(90deg, ${p.accent}, ${p.accent2 ?? p.accent})`
                                : p.accent,
                              ...(isNeon ? { boxShadow: `0 0 4px ${p.accent}88` } : {}),
                            }} />
                          </div>
                          <div style={{ width: "100%", height: 5, borderRadius: Math.max(1, r / 5), background: `${p.accent}20` }}>
                            <div style={{
                              width: "72%",
                              height: "100%",
                              borderRadius: Math.max(1, r / 5),
                              background: isNeon
                                ? `linear-gradient(90deg, ${p.accent}, ${p.accent2 ?? p.accent})`
                                : p.accent,
                              ...(isNeon ? { boxShadow: `0 0 4px ${p.accent}88` } : {}),
                            }} />
                          </div>
                        </div>
                        <div style={{
                          flex: 1,
                          background: p.card,
                          borderRadius: Math.max(2, r / 3),
                          border: `1px solid ${borderColor}${isNeon ? "44" : "18"}`,
                          padding: 5,
                          display: "flex",
                          flexDirection: "column",
                          gap: 3,
                          ...(isNeon ? { boxShadow: `inset 0 0 8px ${p.accent}10, 0 0 4px ${p.accent}15` } : {}),
                        }}>
                          <div style={{ width: "50%", height: 3, borderRadius: 1, background: hasGradientHeader ? p.headerGradient : `${p.accent}55` }} />
                          <div style={{ width: "80%", height: 3, borderRadius: 1, background: `${p.accent}33` }} />
                          <div style={{ width: "55%", height: 3, borderRadius: 1, background: `${p.accent}33` }} />
                          <div style={{ width: "70%", height: 3, borderRadius: 1, background: `${p.accent}33` }} />
                        </div>
                      </div>
                      {/* Mini calendar */}
                      <div style={{
                        background: p.card,
                        borderRadius: Math.max(2, r / 3),
                        border: `1px solid ${borderColor}${isNeon ? "44" : "18"}`,
                        height: 22,
                        display: "grid",
                        gridTemplateColumns: "repeat(7, 1fr)",
                        gap: 1,
                        padding: 3,
                        alignItems: "center",
                        ...(isNeon ? { boxShadow: `inset 0 0 6px ${p.accent}10` } : {}),
                      }}>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div key={i} style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: i === 2 || i === 5
                              ? p.accent
                              : `${p.accent}${isNeon ? "33" : "22"}`,
                            margin: "0 auto",
                            ...(isNeon && (i === 2 || i === 5) ? { boxShadow: `0 0 4px ${p.accent}aa` } : {}),
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
                    color: isActive ? p.accent : "var(--text-h)",
                    background: isNeon ? p.card : "var(--surface)",
                    borderTop: `1px solid ${isNeon ? borderColor + "33" : "var(--border)"}`,
                    textAlign: "center",
                    ...(isNeon && isActive ? { textShadow: `0 0 8px ${p.accent}88` } : {}),
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
