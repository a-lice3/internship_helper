import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Node.js 22+ has a native localStorage without clear() that shadows jsdom's.
// We create a simple mock to work around this.
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

// ---------- Token management ----------

describe("Token management", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  it("stores token in localStorage", async () => {
    const { setToken, getToken } = await import("../api");
    setToken("my-token");
    expect(getToken()).toBe("my-token");
    expect(window.localStorage.getItem("token")).toBe("my-token");
  });

  it("clears token from localStorage", async () => {
    const { setToken, getToken } = await import("../api");
    setToken("my-token");
    setToken(null);
    expect(getToken()).toBeNull();
    expect(window.localStorage.getItem("token")).toBeNull();
  });

  it("reads token from localStorage on module load", async () => {
    window.localStorage.setItem("token", "persisted-token");
    const { getToken } = await import("../api");
    expect(getToken()).toBe("persisted-token");
  });
});

// ---------- API request helper ----------

describe("API request helper", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends auth header when token is set", async () => {
    const { setToken, getMe } = await import("../api");
    setToken("test-token");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: 1, name: "Alice", email: "a@t.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getMe();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [, options] = fetchSpy.mock.calls[0];
    expect(options?.headers).toHaveProperty("Authorization", "Bearer test-token");
  });

  it("throws on non-401 error with detail message", async () => {
    const { setToken, getMe } = await import("../api");
    setToken("t");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getMe()).rejects.toThrow("Not found");
  });

  it("clears token on 401 response", async () => {
    const { setToken, getToken, getMe } = await import("../api");
    setToken("expired-token");

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(getMe()).rejects.toThrow("Session expired");
    expect(getToken()).toBeNull();
  });
});

// ---------- API functions build correct URLs ----------

describe("API URL construction", () => {
  beforeEach(() => {
    store.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getOffers appends status query param", async () => {
    const { setToken, getOffers } = await import("../api");
    setToken("t");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getOffers(1, "applied");

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe("/api/users/1/offers?status=applied");
  });

  it("getOffers without status has no query param", async () => {
    const { setToken, getOffers } = await import("../api");
    setToken("t");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await getOffers(1);

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toBe("/api/users/1/offers");
  });
});
