import { beforeEach, describe, expect, it, vi } from "vitest";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("./AxiosInstance.mjs", () => ({ AxiosInstancePrivate: () => http }));

import { createApiKey, getApiKeys, revokeApiKey } from "./apikey_service.mjs";

describe("apikey_service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists keys from GET /api-keys", async () => {
    const apiKeys = [{ id: "k1" }];
    http.get.mockResolvedValue({ data: { apiKeys } });

    await expect(getApiKeys()).resolves.toEqual(apiKeys);
    expect(http.get).toHaveBeenCalledWith("/api-keys");
  });

  it("creates a key with POST /api-keys and returns the one-time response", async () => {
    const body = { key: "rvsr_secret", apiKey: { id: "k1" } };
    http.post.mockResolvedValue({ data: body });

    await expect(createApiKey({ name: "laptop", expiry: "30d" })).resolves.toEqual(body);
    expect(http.post).toHaveBeenCalledWith("/api-keys", { name: "laptop", expiry: "30d" }, expect.anything());
  });

  it("revokes a key with DELETE /api-keys/:id", async () => {
    http.delete.mockResolvedValue({ data: { success: true } });

    await expect(revokeApiKey("k1")).resolves.toEqual({ success: true });
    expect(http.delete).toHaveBeenCalledWith("/api-keys/k1");
  });
});
