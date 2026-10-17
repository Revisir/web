import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router-dom";
import { DateTime } from "luxon";
import App from "../../App";
import Settings from "./Settings";
import { renderWithProviders } from "../../test/renderWithProviders";
import { getApiKeys, revokeApiKey } from "../../service/apikey_service.mjs";
import { userName, userToken } from "../../constants.mjs";

vi.mock("../../service/apikey_service.mjs", () => ({
  getApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));
vi.mock("react-oidc-context", () => ({ useAuth: () => ({ signinRedirect: vi.fn() }) }));
// The topic screens pull in lottie and pdf.js, which need canvas APIs jsdom lacks. Routing is what's under test here.
vi.mock("../ListTabs", () => ({ default: () => <p>Topic lists</p> }));
vi.mock("../topics/TopicDetails", () => ({ default: () => null }));

type Summary = {
  id: string;
  name: string;
  displayPrefix: string;
  status: "active" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

const now = DateTime.now();
function apiKey(overrides: Partial<Summary> = {}): Summary {
  return {
    id: "key-1",
    name: "laptop",
    displayPrefix: "rvsr_Lap1234",
    status: "active",
    createdAt: now.minus({ days: 2 }).toISO()!,
    expiresAt: now.plus({ days: 28 }).toISO()!,
    lastUsedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

function signIn() {
  sessionStorage.setItem(userName, "TESTER");
  sessionStorage.setItem(userToken, "token");
}

function LocationProbe() {
  return <p data-testid="location">{useLocation().pathname}</p>;
}

function dataRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("Settings route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects to / when signed out", async () => {
    renderWithProviders(
      <>
        <App />
        <LocationProbe />
      </>,
      { route: "/settings" },
    );

    expect(await screen.findByText("Welcome to Reviser App")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(/^\/$/);
    expect(getApiKeys).not.toHaveBeenCalled();
  });

  it("is reachable from the header settings icon when signed in", async () => {
    signIn();
    vi.mocked(getApiKeys).mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <App />
        <LocationProbe />
      </>,
      { route: "/" },
    );

    expect(screen.getByText("Topic lists")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Settings" }));

    expect(await screen.findByRole("heading", { name: "API keys" })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/settings");
  });
});

describe("Settings page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    signIn();
  });

  it("lists keys with prefix, dates, last used and a text status badge, active keys first", async () => {
    vi.mocked(getApiKeys).mockResolvedValue([
      apiKey({ id: "k-revoked", name: "old desktop", displayPrefix: "rvsr_Old0000", status: "revoked", revokedAt: now.minus({ days: 1 }).toISO()! }),
      apiKey({ id: "k-laptop", name: "laptop", displayPrefix: "rvsr_Lap1234", expiresAt: null }),
      apiKey({ id: "k-expired", name: "ci runner", displayPrefix: "rvsr_Ci00000", status: "expired", expiresAt: now.minus({ days: 3 }).toISO()! }),
      apiKey({ id: "k-work", name: "work cursor", displayPrefix: "rvsr_Wrk5678", lastUsedAt: now.minus({ hours: 3 }).toISO()! }),
    ]);
    renderWithProviders(<Settings />, { route: "/settings" });

    await screen.findByText("laptop");
    const rows = dataRows();
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["laptop", "work cursor", "old desktop", "ci runner"]);

    const [laptop, work, revoked, expired] = rows;
    expect(within(laptop).getByText("rvsr_Lap1234…")).toBeInTheDocument();
    expect(within(laptop).getAllByText("Never")).toHaveLength(2); // never expires, never used
    expect(within(laptop).getByText("Active")).toBeInTheDocument();
    expect(within(work).getByText("3 hours ago")).toBeInTheDocument();
    expect(within(revoked).getByText("Revoked")).toBeInTheDocument();
    expect(within(expired).getByText("Expired")).toBeInTheDocument();

    expect(within(laptop).getByRole("button", { name: "Revoke laptop" })).toBeInTheDocument();
    expect(within(revoked).queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
    expect(within(expired).queryByRole("button", { name: /revoke/i })).not.toBeInTheDocument();
  });

  it("shows a first-key prompt with a Create button when there are no keys", async () => {
    vi.mocked(getApiKeys).mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<Settings />, { route: "/settings" });

    expect(await screen.findByText("No API keys yet")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create your first key" }));

    expect(within(screen.getByRole("dialog")).getByText("Create API key")).toBeInTheDocument();
  });

  it("shows a retryable alert when the list fails to load", async () => {
    vi.mocked(getApiKeys)
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce([apiKey()]);
    const user = userEvent.setup();
    renderWithProviders(<Settings />, { route: "/settings" });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load your API keys.");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("laptop")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("asks for confirmation naming the key before revoking it", async () => {
    vi.mocked(getApiKeys)
      .mockResolvedValueOnce([apiKey({ lastUsedAt: now.minus({ hours: 3 }).toISO()! })])
      .mockResolvedValue([apiKey({ status: "revoked", revokedAt: now.toISO()! })]);
    vi.mocked(revokeApiKey).mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderWithProviders(<Settings />, { route: "/settings" });

    await user.click(await screen.findByRole("button", { name: "Revoke laptop" }));
    let dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("laptop");
    expect(dialog).toHaveTextContent("rvsr_Lap1234");
    expect(dialog).toHaveTextContent("3 hours ago");

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(revokeApiKey).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Revoke laptop" }));
    dialog = screen.getByRole("dialog");
    expect(revokeApiKey).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Revoke key" }));

    expect(revokeApiKey).toHaveBeenCalledWith("key-1");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Revoked")).toBeInTheDocument();
  });
});
