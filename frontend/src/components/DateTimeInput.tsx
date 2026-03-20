import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/**
 * A friendly date/time picker that shows a popover calendar + time selector.
 * Uses a portal so the popover is never clipped by parent overflow.
 */

interface Props {
  value: string;
  onChange: (v: string) => void;
  mode?: "datetime" | "date";
  style?: React.CSSProperties;
  className?: string;
  placeholder?: string;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS_HEADER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatDisplay(value: string, mode: "datetime" | "date"): string {
  if (!value) return "";
  const parts = value.split("T");
  const datePart = parts[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return value;
  const dateStr = `${pad(d)} ${MONTHS_SHORT[m - 1]} ${y}`;
  if (mode === "date") return dateStr;
  const timePart = parts[1] || "00:00";
  return `${dateStr}, ${timePart}`;
}

export default function DateTimeInput({ value, onChange, mode = "datetime", style, className, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Parse current value
  const parts = value ? value.split("T") : [];
  const datePart = parts[0] || "";
  const [curYear, curMonth, curDay] = datePart ? datePart.split("-").map(Number) : [0, 0, 0];
  const timePart = parts[1] || "09:00";
  const [curHour, curMinute] = timePart.split(":").map(Number);

  const today = new Date();
  const [viewYear, setViewYear] = useState(curYear || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(curMonth ? curMonth - 1 : today.getMonth());

  // Sync view when value changes externally (without useEffect)
  const [prevCurYear, setPrevCurYear] = useState(curYear);
  const [prevCurMonth, setPrevCurMonth] = useState(curMonth);
  if (curYear && curMonth && (curYear !== prevCurYear || curMonth !== prevCurMonth)) {
    setPrevCurYear(curYear);
    setPrevCurMonth(curMonth);
    setViewYear(curYear);
    setViewMonth(curMonth - 1);
  }

  // Position the popover relative to the input
  useEffect(() => {
    if (!open || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const popoverHeight = 340; // approximate max height
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= popoverHeight ? rect.bottom + 4 : rect.top - popoverHeight - 4;
    const left = Math.min(rect.left, window.innerWidth - 290);
    setPos({ top: Math.max(4, top), left: Math.max(4, left) });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const buildValue = useCallback((y: number, m: number, d: number, h: number, min: number) => {
    const dateStr = `${y}-${pad(m)}-${pad(d)}`;
    if (mode === "date") return dateStr;
    return `${dateStr}T${pad(h)}:${pad(min)}`;
  }, [mode]);

  const selectDay = (day: number) => {
    const h = curHour || 9;
    const min = curMinute || 0;
    onChange(buildValue(viewYear, viewMonth + 1, day, h, min));
    if (mode === "date") setOpen(false);
  };

  const setTime = (h: number, min: number) => {
    const y = curYear || viewYear;
    const m = curMonth || (viewMonth + 1);
    const d = curDay || today.getDate();
    onChange(buildValue(y, m, d, h, min));
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const todayKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const popover = open ? createPortal(
    <div
      ref={popoverRef}
      style={{
        position: "fixed",
        top: pos.top,
        left: pos.left,
        zIndex: 9999,
        background: "var(--surface-solid)",
        border: "1px solid var(--border-strong)",
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        padding: 14,
        minWidth: 270,
      }}
    >
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button type="button" onClick={prevMonth} className="btn-ghost" style={{ padding: "2px 8px", fontSize: 14 }}>&lt;</button>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{MONTHS_SHORT[viewMonth]} {viewYear}</span>
        <button type="button" onClick={nextMonth} className="btn-ghost" style={{ padding: "2px 8px", fontSize: 14 }}>&gt;</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
        {DAYS_HEADER.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", padding: 4 }}>{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const key = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
          const isSelected = curYear === viewYear && curMonth === viewMonth + 1 && curDay === day;
          const isToday = key === todayKey;
          return (
            <button
              type="button"
              key={day}
              onClick={() => selectDay(day)}
              style={{
                width: 32, height: 32,
                border: "none",
                borderRadius: "50%",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: isToday ? 700 : 400,
                background: isSelected ? "var(--accent)" : "transparent",
                color: isSelected ? "#fff" : isToday ? "var(--accent)" : "var(--text-h)",
                transition: "all 0.1s",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto",
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--accent-light)"; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Time picker */}
      {mode === "datetime" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Time</span>
          <select
            value={curHour || 9}
            onChange={(e) => setTime(Number(e.target.value), curMinute || 0)}
            style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
          >
            {Array.from({ length: 24 }).map((_, h) => (
              <option key={h} value={h}>{pad(h)}</option>
            ))}
          </select>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>:</span>
          <select
            value={curMinute || 0}
            onChange={(e) => setTime(curHour || 9, Number(e.target.value))}
            style={{ width: "auto", fontSize: 12, padding: "4px 8px" }}
          >
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
              <option key={m} value={m}>{pad(m)}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn-ghost"
            style={{ marginLeft: "auto", fontSize: 12, padding: "4px 10px", color: "var(--accent)", fontWeight: 600 }}
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: "relative", ...style }} className={className}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={formatDisplay(value, mode)}
        placeholder={placeholder || (mode === "date" ? "Pick a date" : "Pick date & time")}
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", width: "100%" }}
      />
      {popover}
    </div>
  );
}
