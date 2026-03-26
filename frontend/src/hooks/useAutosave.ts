import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Reusable autosave hook with debounce.
 * - Saves after `delay` ms of inactivity
 * - Saves immediately on unmount if there are pending changes
 * - Warns before page unload if there are unsaved changes
 * - Backs up to localStorage before 401 logout (via "session-expired" event)
 *
 * @param key      Unique key for localStorage draft backup (e.g. "memo-draft-42")
 * @param value    Current value to save
 * @param saveFn   Async function that persists the value
 * @param options  { delay, enabled }
 * @returns { isDirty, saveNow }
 */
export function useAutosave(
  key: string,
  value: string,
  saveFn: (value: string) => Promise<void>,
  options?: { delay?: number; enabled?: boolean },
) {
  const delay = options?.delay ?? 2000;
  const enabled = options?.enabled ?? true;

  const [isDirty, setIsDirty] = useState(false);
  const isDirtyRef = useRef(false);
  const valueRef = useRef(value);
  const saveFnRef = useRef(saveFn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialValueRef = useRef(value);

  // Keep refs up to date (inside an effect to avoid "cannot update ref during render")
  useEffect(() => {
    valueRef.current = value;
    saveFnRef.current = saveFn;
  });

  // Track dirty state: value differs from last saved/initial value
  const lastSavedRef = useRef(value);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isDirtyRef.current) return;
    try {
      await saveFnRef.current(valueRef.current);
      lastSavedRef.current = valueRef.current;
      isDirtyRef.current = false;
      setIsDirty(false);
    } catch {
      // Save failed — keep dirty so we retry
    }
  }, []);

  // When value changes, mark dirty and schedule save
  useEffect(() => {
    if (!enabled) return;
    // Don't trigger on initial mount
    if (value === initialValueRef.current && !isDirtyRef.current) return;
    if (value === lastSavedRef.current) {
      isDirtyRef.current = false;
      setIsDirty(false);
      return;
    }

    isDirtyRef.current = true;
    setIsDirty(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      saveNow();
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delay, enabled, saveNow]);

  // Update initial value when key changes (switching items)
  useEffect(() => {
    initialValueRef.current = value;
    lastSavedRef.current = value;
    isDirtyRef.current = false;
    setIsDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // beforeunload warning
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        // Attempt synchronous backup to localStorage
        try {
          localStorage.setItem(key, valueRef.current);
        } catch { /* quota exceeded — ignore */ }
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [key, enabled]);

  // Session expired event: backup to localStorage
  useEffect(() => {
    if (!enabled) return;
    const handler = () => {
      if (isDirtyRef.current) {
        try {
          localStorage.setItem(key, valueRef.current);
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("session-expired", handler);
    return () => window.removeEventListener("session-expired", handler);
  }, [key, enabled]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isDirtyRef.current) {
        // Fire-and-forget save on unmount
        saveFnRef.current(valueRef.current).catch(() => {});
      }
    };
  }, []);

  return { isDirty, saveNow };
}

/**
 * Check if there is a draft backup in localStorage and return it.
 * Removes the draft after reading.
 */
export function getDraft(key: string): string | null {
  const draft = localStorage.getItem(key);
  if (draft !== null) {
    localStorage.removeItem(key);
  }
  return draft;
}
