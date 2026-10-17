import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";
import pluginQuery from "@tanstack/eslint-plugin-query";
import react from "eslint-plugin-react";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite, pluginQuery.configs["flat/recommended"]],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    files: ["**/*.{js,jsx,mjs}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite, pluginQuery.configs["flat/recommended"]],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // ESLint 9 does not count JSX usage as a reference without this rule.
    plugins: { react },
    rules: { "react/jsx-uses-vars": "error" },
  },
  {
    // shadcn's registry imports `cn` straight from the package; the configured one knows the Stitch type scale.
    files: ["src/**/*.{js,jsx,mjs,ts,tsx}"],
    ignores: ["src/lib/utils.ts"],
    rules: { "no-restricted-imports": ["error", { paths: [{ name: "cn", message: "Import cn from @/lib/utils." }] }] },
  },
  {
    // shadcn files export variant helpers beside their components.
    files: ["src/Components/ui/**"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
