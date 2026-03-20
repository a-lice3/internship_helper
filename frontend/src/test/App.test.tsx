import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import App from "../App";

// Mock the api module
vi.mock("../api", () => {
  let token: string | null = null;
  return {
    getToken: () => token,
    setToken: (t: string | null) => {
      token = t;
    },
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
  };
});

// Mock page components to keep tests focused on App shell
vi.mock("../pages/DashboardPage", () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}));
vi.mock("../pages/OffersPage", () => ({
  default: () => <div data-testid="offers-page">Offers</div>,
}));
vi.mock("../pages/SearchPage", () => ({
  default: () => <div data-testid="search-page">Search</div>,
}));
vi.mock("../pages/CalendarPage", () => ({
  default: () => <div data-testid="calendar-page">Calendar</div>,
}));
vi.mock("../pages/OfferDetailPage", () => ({
  default: () => <div data-testid="offer-detail-page">OfferDetail</div>,
}));
vi.mock("../pages/ProfilePage", () => ({
  default: () => <div data-testid="profile-page">Profile</div>,
}));
vi.mock("../pages/CVsPage", () => ({
  default: () => <div data-testid="cvs-page">CVs</div>,
}));
vi.mock("../pages/TemplatesPage", () => ({
  default: () => <div data-testid="templates-page">Templates</div>,
}));
vi.mock("../pages/InterviewPage", () => ({
  default: () => <div data-testid="interview-page">Interview</div>,
}));
vi.mock("../pages/SettingsPage", () => ({
  default: () => <div data-testid="settings-page">Settings</div>,
}));

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
}

describe("App - unauthenticated", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("../api");
    api.setToken(null);
  });

  it("shows login screen when no token", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Internship Helper")).toBeInTheDocument();
    });
    // Login toggle button + submit button both exist
    expect(screen.getAllByRole("button", { name: /Login/ })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Sign up" })).toBeInTheDocument();
  });

  it("switches between login and signup forms", async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Internship Helper")).toBeInTheDocument();
    });

    // Default is login — has Email and Password fields
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Your password")).toBeInTheDocument();

    // Switch to signup
    await user.click(screen.getAllByText("Sign up")[0]);
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Choose a password")).toBeInTheDocument();
  });

  it("calls login API and shows app on success", async () => {
    const user = userEvent.setup();
    const api = await import("../api");

    const mockUser = { id: 1, name: "Alice", email: "alice@test.com", created_at: null };
    vi.mocked(api.login).mockResolvedValue({
      access_token: "new-token",
      token_type: "bearer",
      user: mockUser,
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Internship Helper")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("you@example.com"), "alice@test.com");
    await user.type(screen.getByPlaceholderText("Your password"), "secret123");
    // Pick the submit button (not the toggle)
    const loginBtn = screen.getAllByRole("button", { name: /^Login$/ }).find(
      (btn) => btn.closest("form"),
    )!;
    await user.click(loginBtn);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith("alice@test.com", "secret123");
    });

    // After login, sidebar should appear with user name
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });
  });

  it("shows error message on login failure", async () => {
    const user = userEvent.setup();
    const api = await import("../api");

    vi.mocked(api.login).mockRejectedValue(new Error("Invalid credentials"));

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Internship Helper")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("you@example.com"), "bad@test.com");
    await user.type(screen.getByPlaceholderText("Your password"), "wrong");
    const loginBtn = screen.getAllByRole("button", { name: /^Login$/ }).find(
      (btn) => btn.closest("form"),
    )!;
    await user.click(loginBtn);

    await waitFor(() => {
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    });
  });

  it("calls register API on signup", async () => {
    const user = userEvent.setup();
    const api = await import("../api");

    const mockUser = { id: 2, name: "Bob", email: "bob@test.com", created_at: null };
    vi.mocked(api.register).mockResolvedValue({
      access_token: "signup-token",
      token_type: "bearer",
      user: mockUser,
    });

    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Internship Helper")).toBeInTheDocument();
    });

    // Switch to signup
    await user.click(screen.getAllByText("Sign up")[0]);

    await user.type(screen.getByPlaceholderText("Your name"), "Bob");
    await user.type(screen.getByPlaceholderText("you@example.com"), "bob@test.com");
    await user.type(screen.getByPlaceholderText("Choose a password"), "mypass");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith("Bob", "bob@test.com", "mypass");
    });

    await waitFor(() => {
      expect(screen.getByText("Bob")).toBeInTheDocument();
    });
  });
});

describe("App - authenticated", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const api = await import("../api");
    api.setToken("valid-token");

    const mockUser = { id: 1, name: "Alice Dupont", email: "alice@test.com", created_at: null };
    vi.mocked(api.getMe).mockResolvedValue(mockUser);
  });

  it("shows sidebar with navigation when authenticated", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Intern Helper")).toBeInTheDocument();
    });

    // Check navigation links exist in the sidebar
    const sidebar = screen.getByRole("complementary"); // <aside>
    expect(sidebar).toHaveTextContent("Dashboard");
    expect(sidebar).toHaveTextContent("Applications");
    expect(sidebar).toHaveTextContent("My Profile");
    expect(sidebar).toHaveTextContent("Interview");
    expect(sidebar).toHaveTextContent("Settings");
  });

  it("displays user initials in sidebar", async () => {
    renderApp();

    await waitFor(() => {
      expect(screen.getByText("AD")).toBeInTheDocument(); // Alice Dupont -> AD
    });
  });

  it("logs out and shows login screen", async () => {
    const user = userEvent.setup();
    renderApp();

    await waitFor(() => {
      expect(screen.getByText("Alice Dupont")).toBeInTheDocument();
    });

    // Click logout button
    await user.click(screen.getByTitle("Logout"));

    await waitFor(() => {
      expect(screen.getByText("Internship Helper")).toBeInTheDocument();
    });
  });
});
