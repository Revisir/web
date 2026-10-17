import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createApiKey, getApiKeys, revokeApiKey } from "../service/apikey_service.mjs";

export const API_KEYS_KEY = "apiKeys";

export type ApiKeyExpiry = "30d" | "90d" | "1y" | "never";

export type ApiKeySummary = {
  id: string;
  name: string;
  displayPrefix: string;
  status: "active" | "expired" | "revoked";
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type CreatedApiKey = { key: string; apiKey: ApiKeySummary };

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function apiKeyErrorMessage(error: unknown, fallback: string): string {
  return (error as ApiError | null)?.response?.data?.error?.message || fallback;
}

export function useApiKeys() {
  return useQuery<ApiKeySummary[]>({
    queryKey: [API_KEYS_KEY],
    queryFn: getApiKeys,
    // Refetch on each visit and on window focus so "last used" stays current.
    staleTime: 0,
  });
}

export function useApiKeyCreate() {
  const qClient = useQueryClient();
  return useMutation<CreatedApiKey, unknown, { name: string; expiry: ApiKeyExpiry }>({
    mutationFn: ({ name, expiry }) => createApiKey({ name, expiry }),
    // The plaintext key lives only in this mutation's result. With gcTime 0, reset() or unmount
    // drops it from the MutationCache right away instead of keeping it for the default 5 minutes.
    gcTime: 0,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: [API_KEYS_KEY] });
    },
  });
}

export function useApiKeyRevoke() {
  const qClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => revokeApiKey(id),
    onSettled: () => {
      qClient.invalidateQueries({ queryKey: [API_KEYS_KEY] });
    },
  });
}
