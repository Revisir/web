import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const filteredEnv = Object.fromEntries(Object.entries(env).filter(([key]) => key.startsWith("FE_")));
  console.log(filteredEnv);
  const envJs = `window.__ENV__ = ${JSON.stringify(filteredEnv)};\n`;
  fs.writeFileSync(path.resolve(__dirname, "public/env.js"), envJs);

  return {
    plugins: [react()],
    server: {
      port: 3000,
    },
  };
});
