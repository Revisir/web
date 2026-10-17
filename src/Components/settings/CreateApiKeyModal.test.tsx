import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateApiKeyModal from "./CreateApiKeyModal";
import { renderWithProviders } from "../../test/renderWithProviders";
import { createApiKey } from "../../service/apikey_service.mjs";

vi.mock("../../service/apikey_service.mjs", () => ({
  getApiKeys: vi.fn(),
  createApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

const KEY = "rvsr_TESTsecretVALUE0123456789abcdefABCDEF";
const MCP_URL = "http://localhost:5000/mcp";

const created = {
  key: KEY,
  apiKey: {
    id: "key-1",
    name: "laptop",
    displayPrefix: KEY.slice(0, 12),
    status: "active",
    createdAt: new Date().toISOString(),
    expiresAt: null,
    lastUsedAt: null,
    revokedAt: null,
  },
};

function apiError(status: number, code: string, message: string) {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    response: { status, data: { error: { code, message } } },
  });
}

function Host() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open create</button>
      {open && <CreateApiKeyModal onClose={() => setOpen(false)} />}
    </>
  );
}

function setup() {
  const user = userEvent.setup();
  const view = renderWithProviders(<Host />);
  return { user, ...view };
}

type User = ReturnType<typeof userEvent.setup>;

async function fillAndCreate(user: User, name = "laptop") {
  await user.type(screen.getByLabelText("Name"), name);
  await user.click(screen.getByRole("button", { name: "Create" }));
}

async function openAndSubmit(user: User) {
  await user.click(screen.getByRole("button", { name: "Open create" }));
  await fillAndCreate(user);
}

function occurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

describe("CreateApiKeyModal", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("__ENV__", { FE_BACKEND_URL: "http://localhost:5000/api" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates a key with a trimmed name and the 90-day default expiry", async () => {
    vi.mocked(createApiKey).mockResolvedValue(created);
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Open create" }));
    expect(screen.getByLabelText("Expires after")).toHaveValue("90d");
    await fillAndCreate(user, "  laptop  ");

    expect(createApiKey).toHaveBeenCalledWith({ name: "laptop", expiry: "90d" });
  });

  it("lets Escape and a backdrop click close the form step", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Open create" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open create" }));
    await user.click(screen.getByRole("dialog"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reveals the key once, and Done removes it from the DOM and the mutation cache", async () => {
    vi.mocked(createApiKey).mockResolvedValue(created);
    const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "info"), vi.spyOn(console, "debug")];
    const { user, queryClient } = setup();

    await openAndSubmit(user);

    const dialog = await screen.findByRole("dialog", { name: "Save your API key" });
    expect(within(dialog).getByText(KEY)).toBeInTheDocument();
    expect(dialog).toHaveTextContent(/won't be shown again/i);
    expect(occurrences(document.body.textContent ?? "", KEY)).toBe(1);

    await user.click(within(dialog).getByRole("button", { name: "Done" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(KEY);
    await waitFor(() => {
      const cached = queryClient.getMutationCache().getAll().map((mutation) => JSON.stringify(mutation.state));
      expect(cached.join("")).not.toContain(KEY);
    });

    await user.click(screen.getByRole("button", { name: "Open create" }));
    expect(screen.getByLabelText("Name")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(KEY);

    for (const spy of logs) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(KEY);
    }
  });

  it("keeps the reveal open on Escape and a backdrop click", async () => {
    vi.mocked(createApiKey).mockResolvedValue(created);
    const { user } = setup();

    await openAndSubmit(user);
    const dialog = await screen.findByRole("dialog", { name: "Save your API key" });
    expect(within(dialog).queryByRole("button", { name: /close/i })).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    await user.click(dialog);

    expect(screen.getByRole("dialog", { name: "Save your API key" })).toBeInTheDocument();
    expect(screen.getByText(KEY)).toBeInTheDocument();
  });

  it("copies the key and confirms with Copied", async () => {
    vi.mocked(createApiKey).mockResolvedValue(created);
    const { user } = setup();

    await openAndSubmit(user);
    await user.click(await screen.findByRole("button", { name: "Copy API key" }));

    expect(screen.getByRole("button", { name: "Copied API key" })).toBeInTheDocument();
    await expect(navigator.clipboard.readText()).resolves.toBe(KEY);
  });

  it.each([
    ["the 11th-key refusal", apiError(400, "VALIDATION_ERROR", "You can have at most 10 active API keys. Revoke a key before creating a new one.")],
    ["an AUTH_REQUIRED refusal", apiError(403, "AUTH_REQUIRED", "Sign in with your Reviser account to manage API keys.")],
  ])("shows %s inline in the form", async (_label, error) => {
    vi.mocked(createApiKey).mockRejectedValue(error);
    const { user } = setup();

    await openAndSubmit(user);

    const dialog = screen.getByRole("dialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(error.response.data.error.message);
    expect(within(dialog).getByLabelText("Name")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Done" })).not.toBeInTheDocument();
  });

  it.each([
    ["Claude Code", [`claude mcp add --transport http reviser ${MCP_URL} --header "Authorization: Bearer $REVISER_API_KEY"`]],
    ["Cursor", ['"mcpServers"', `"url": "${MCP_URL}"`, '"Authorization": "Bearer ${env:REVISER_API_KEY}"']],
    ["VS Code", ['"servers"', '"type": "http"', `"url": "${MCP_URL}"`, '"type": "promptString"', '"password": true', '"Authorization": "Bearer ${input:reviser-api-key}"']],
  ])("the %s snippet uses the MCP URL from FE_BACKEND_URL and never the key", async (client, expected) => {
    vi.mocked(createApiKey).mockResolvedValue(created);
    const { user } = setup();

    await openAndSubmit(user);
    const tab = await screen.findByRole("tab", { name: client });
    await user.click(tab);
    expect(tab).toHaveAttribute("aria-selected", "true");

    // Bootstrap hides inactive panes with CSS, which tests don't load, so follow the tab to its panel.
    const panel = document.getElementById(tab.getAttribute("aria-controls")!)!;
    const snippet = panel.querySelector("pre")!;
    for (const fragment of expected) {
      expect(snippet.textContent).toContain(fragment);
    }
    expect(panel.textContent).not.toContain(KEY);

    await user.click(within(panel).getByRole("button", { name: `Copy ${client} snippet` }));
    await expect(navigator.clipboard.readText()).resolves.toBe(snippet.textContent);
  });
});
