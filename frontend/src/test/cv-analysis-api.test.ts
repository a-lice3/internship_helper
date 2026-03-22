import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Re-use the localStorage mock from the main api test
const store = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => { store.clear(); },
  get length() { return store.size; },
  key: () => null,
} as Storage;

Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

// ---------- CV Analysis API URL construction ----------

describe("CV Analysis API functions", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("toggleDefaultCV calls correct endpoint with POST", async () => {
    const { setToken, toggleDefaultCV } = await import("../api");
    setToken("t");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: "My CV", is_default: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await toggleDefaultCV(1, 5);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/users/1/cvs/5/toggle-default");
    expect(options?.method).toBe("POST");
  });

  it("analyzeCVGeneral calls correct endpoint with POST", async () => {
    const { setToken, analyzeCVGeneral } = await import("../api");
    setToken("t");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ score: 8, summary: "Good", strengths: [], improvements: [] }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await analyzeCVGeneral(1, 3);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/users/1/cvs/3/analyze");
    expect(options?.method).toBe("POST");
    expect(result.score).toBe(8);
  });

  it("getStoredCVAnalyses calls correct endpoint with GET", async () => {
    const { setToken, getStoredCVAnalyses } = await import("../api");
    setToken("t");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getStoredCVAnalyses(1);

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe("/api/users/1/cv-analyses");
  });

  it("getStoredCVOfferAnalyses calls correct endpoint with GET", async () => {
    const { setToken, getStoredCVOfferAnalyses } = await import("../api");
    setToken("t");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getStoredCVOfferAnalyses(1);

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe("/api/users/1/cv-offer-analyses");
  });

  it("suggestCVChanges sends cv_id in body and calls correct endpoint", async () => {
    const { setToken, suggestCVChanges } = await import("../api");
    setToken("t");

    const mockResult = {
      id: 1,
      cv_id: 3,
      score: 7,
      suggested_title: "SWE Intern",
      suggested_profile: "Motivated student",
      other_suggestions: ["Add Python"],
      offer_title: "Internship",
      company: "Google",
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await suggestCVChanges(1, 10, 3);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/users/1/offers/10/suggest-cv-changes");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(options?.body as string)).toEqual({ cv_id: 3 });
    expect(result.score).toBe(7);
    expect(result.other_suggestions).toEqual(["Add Python"]);
  });

  it("toggleDefaultCV returns updated CV object", async () => {
    const { setToken, toggleDefaultCV } = await import("../api");
    setToken("t");

    const mockCV = {
      id: 5,
      name: "My CV",
      content: "...",
      is_default: true,
      is_adapted: false,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockCV), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await toggleDefaultCV(1, 5);
    expect(result.id).toBe(5);
    expect(result.is_default).toBe(true);
  });

  it("analyzeCVGeneral returns full analysis result", async () => {
    const { setToken, analyzeCVGeneral } = await import("../api");
    setToken("t");

    const mockResult = {
      score: 9,
      summary: "Excellent CV",
      strengths: ["Clear layout", "Strong skills"],
      improvements: ["Add more metrics"],
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(mockResult), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await analyzeCVGeneral(1, 3);
    expect(result.score).toBe(9);
    expect(result.summary).toBe("Excellent CV");
    expect(result.strengths).toHaveLength(2);
    expect(result.improvements).toHaveLength(1);
  });
});
