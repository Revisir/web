import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AppProvider } from "../store/AppProvider";

type ProviderOptions = Omit<RenderOptions, "wrapper"> & {
  route?: string;
  queryClient?: QueryClient;
};

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(ui: ReactElement, { route = "/", queryClient = createTestQueryClient(), ...options }: ProviderOptions = {}) {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AppProvider>{ui}</AppProvider>
      </MemoryRouter>
    </QueryClientProvider>,
    options,
  );
  return { ...result, queryClient };
}
