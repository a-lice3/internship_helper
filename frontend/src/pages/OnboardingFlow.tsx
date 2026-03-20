import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../api";

import walkingCat from "../assets/cat-walking-white.gif";

type Step = "welcome" | "analyzing" | "search" | "results" | "matching";

interface Props {
  userId: number;
  onComplete: (redirectTo?: string) => void;
}

export default function OnboardingFlow({ userId, onComplete }: Props) {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>("welcome");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<api.ScrapedOffer[]>([]);
  const [saving, setSaving] = useState<number | null>(null);

  const dragCounter = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ---- Skip ----
  const handleSkip = async () => {
    try { await api.completeOnboarding(); } catch { /* ignore */ }
    onComplete();
  };

  // ---- Drag & Drop ----
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current++;
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") return;

    setStep("analyzing");
    setError("");

    try {
      await api.uploadCVFile(userId, file, file.name, "", "");
      await api.autoFillProfile(userId);
      setStep("search");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    }
  }, [userId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragging(false);
    dragCounter.current = 0;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleBrowse = () => fileInputRef.current?.click();

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---- Search ----
  const DEFAULT_QUERY = "stages en data à Paris";

  const doSearch = async (searchQuery: string) => {
    setSearching(true);
    setError("");
    try {
      const resp = await api.chatSearchOffers(userId, searchQuery);
      if (resp.results.length === 0) {
        // No results — fallback to default query
        const fallback = await api.chatSearchOffers(userId, DEFAULT_QUERY);
        setResults(fallback.results);
      } else {
        setResults(resp.results);
      }
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    await doSearch(query.trim());
  };

  const handleNewSearch = () => {
    setStep("search");
    setResults([]);
  };

  // ---- Select offer ----
  const handleSelect = async (scrapedId: number) => {
    setSaving(scrapedId);
    setError("");
    try {
      const { offer_id } = await api.saveScrapedOffer(userId, scrapedId);
      setStep("matching");

      // Generate skill gap + cover letter in parallel, don't block on failure
      await Promise.allSettled([
        api.analyzeSkillGap(userId, offer_id),
        api.generateCoverLetter(userId, offer_id),
      ]);

      try { await api.completeOnboarding(); } catch { /* ignore */ }
      onComplete(`/offers/${offer_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(null);
    }
  };

  // ---- Step indicator ----
  const dotSteps: Step[] = ["welcome", "analyzing", "search", "results", "matching"];
  const stepIndex = dotSteps.indexOf(step);

  const scoreColor = (s: number | null) => {
    if (s == null) return "var(--muted)";
    if (s >= 75) return "var(--success)";
    if (s >= 50) return "var(--warning)";
    return "var(--danger)";
  };

  return (
    <div className="onboarding-screen">
      {/* Step dots */}
      <div className="onboarding-step-dots">
        {dotSteps.map((s, i) => (
          <div key={s} className={`onboarding-dot ${i <= stepIndex ? "active" : ""}`} />
        ))}
      </div>

      {/* ---- WELCOME ---- */}
      {step === "welcome" && (
        <div className="onboarding-card">
          <img src={walkingCat} alt="Job Seeker" className="onboarding-logo" />
          <h1 className="onboarding-title">{t("onboarding.title")}</h1>
          <p className="onboarding-subtitle">{t("onboarding.subtitle")}</p>

          <div
            className={`onboarding-dropzone ${dragging ? "onboarding-dropzone-active" : ""}`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleBrowse}
          >
            <div className="onboarding-dropzone-icon">{"\uD83D\uDCC4"}</div>
            <p className="onboarding-dropzone-text">{t("onboarding.dropzoneText")}</p>
            <p className="onboarding-dropzone-hint">{t("onboarding.dropzoneHint")}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={handleFileInput}
            />
          </div>

          <button className="onboarding-skip" onClick={handleSkip}>
            {t("onboarding.skip")} →
          </button>
        </div>
      )}

      {/* ---- ANALYZING ---- */}
      {step === "analyzing" && (
        <div className="onboarding-card onboarding-spinner">
          <img src={walkingCat} alt="" className="onboarding-spin-logo" />
          <p className="onboarding-spinner-text">{t("onboarding.analyzing")}</p>
          {error && (
            <>
              <p className="error">{error}</p>
              <button className="btn-primary" onClick={() => { setError(""); setStep("search"); }}>
                {t("onboarding.continueAnyway")}
              </button>
            </>
          )}
        </div>
      )}

      {/* ---- SEARCH ---- */}
      {step === "search" && !searching && (
        <div className="onboarding-card">
          <h2 className="onboarding-search-title">{t("onboarding.searchTitle")}</h2>
          <p className="onboarding-search-arrow">{"\u2193"}</p>
          <form onSubmit={handleSearch} className="onboarding-search-form">
            <textarea
              className="onboarding-search-input"
              placeholder={t("onboarding.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch(e);
                }
              }}
            />
            <button type="submit" className="btn-primary onboarding-search-btn" disabled={!query.trim()}>
              {t("onboarding.searchButton")}
            </button>
          </form>
          {error && <p className="error">{error}</p>}
          <button className="onboarding-skip" onClick={handleSkip}>
            {t("onboarding.skip")} →
          </button>
        </div>
      )}

      {/* ---- SEARCHING (loading) ---- */}
      {step === "search" && searching && (
        <div className="onboarding-card onboarding-spinner">
          <img src={walkingCat} alt="" className="onboarding-spin-logo" />
          <p className="onboarding-spinner-text">{t("onboarding.searching")}</p>
        </div>
      )}

      {/* ---- RESULTS ---- */}
      {step === "results" && (
        <div className="onboarding-card onboarding-card-wide">
          <h2 className="onboarding-results-title">{t("onboarding.selectTitle")}</h2>
          {results.length === 0 && (
            <p className="onboarding-no-results">{t("onboarding.noResults")}</p>
          )}
          <div className="onboarding-results">
            {results.slice(0, 10).map((offer) => (
              <div key={offer.id} className="onboarding-result-card glass-card">
                <div className="onboarding-result-header">
                  <span
                    className="onboarding-result-score"
                    style={{ color: scoreColor(offer.match_score) }}
                  >
                    {offer.match_score != null ? `${Math.round(offer.match_score)}%` : "\u2014"}
                  </span>
                  <span className="onboarding-result-source">{offer.source.toUpperCase()}</span>
                </div>
                <h3 className="onboarding-result-title">{offer.title}</h3>
                <p className="onboarding-result-company">{offer.company}</p>
                {offer.locations && (
                  <p className="onboarding-result-location">{offer.locations}</p>
                )}
                <button
                  className="btn-primary onboarding-select-btn"
                  onClick={() => handleSelect(offer.id)}
                  disabled={saving !== null}
                >
                  {saving === offer.id ? "..." : t("onboarding.select")}
                </button>
              </div>
            ))}
          </div>
          {error && <p className="error">{error}</p>}
          <div className="onboarding-bottom-actions">
            <button className="btn-secondary onboarding-new-search-btn" onClick={handleNewSearch}>
              {t("onboarding.newSearch")}
            </button>
            <button className="onboarding-skip" onClick={handleSkip}>
              {t("onboarding.skip")} →
            </button>
          </div>
        </div>
      )}

      {/* ---- MATCHING (generating analysis) ---- */}
      {step === "matching" && (
        <div className="onboarding-card onboarding-spinner">
          <img src={walkingCat} alt="" className="onboarding-spin-logo" />
          <p className="onboarding-spinner-text">{t("onboarding.matching")}</p>
        </div>
      )}
    </div>
  );
}
