import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

// Kept separate from vite.config.ts so test runs do not regenerate public/env.js.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    // Dialog-heavy interaction tests can pass 5s when the whole suite runs in parallel.
    testTimeout: 15000,
  },
});
