import { useState, useEffect, useCallback, useReducer } from "react";
import { useTranslation } from "react-i18next";

export interface TourStep {
  targetRef: React.RefObject<HTMLElement | null>;
  titleKey: string;
  descriptionKey: string;
}

interface Props {
  steps: TourStep[];
  onComplete: () => void;
}

export default function GuidedTour({ steps, onComplete }: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  const getRect = useCallback(() => {
    const el = steps[current]?.targetRef.current;
    return el ? el.getBoundingClientRect() : null;
  }, [current, steps]);

  // Recalculate on resize
  useEffect(() => {
    const onResize = () => forceUpdate();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onComplete();
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (current === steps.length - 1) onComplete();
        else setCurrent((c) => c + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, steps.length, onComplete]);

  const rect = getRect();
  if (!rect) return null;

  const PAD = 6;
  const isLast = current === steps.length - 1;

  return (
    <>
      <div className="guided-tour-backdrop" />
      <div
        className="guided-tour-spotlight"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        }}
      />
      <div className="guided-tour-tooltip" style={{ top: rect.top, left: rect.right + 16 }}>
        <div className="guided-tour-tooltip-title">{t(steps[current].titleKey)}</div>
        <div className="guided-tour-tooltip-desc">{t(steps[current].descriptionKey)}</div>
        <div className="guided-tour-tooltip-footer">
          <span className="guided-tour-step-indicator">
            {current + 1} / {steps.length}
          </span>
          <div className="guided-tour-tooltip-actions">
            <button className="guided-tour-skip" onClick={onComplete}>
              {t("guidedTour.skip")}
            </button>
            <button
              className="btn-primary guided-tour-next"
              onClick={() => (isLast ? onComplete() : setCurrent((c) => c + 1))}
            >
              {isLast ? t("guidedTour.done") : t("guidedTour.next")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
