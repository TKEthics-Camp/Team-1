import { defineConfig } from "vite";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// Which build a crash report came from (lib/crashReport): the package
// version plus the commit, when there is one.
function appVersion() {
  const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
  try {
    return version + "+" + execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return version;
  }
}
process.env.VITE_APP_VERSION ||= appVersion();
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Dependencies change on their own schedule, and far less often
        // than this app does. Splitting them out means shipping a fix
        // doesn't re-download React and Supabase along with it. Split by
        // what changes together: react/router move as a set, supabase and
        // dexie are each their own thing.
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-dexie": ["dexie"],
        },
      },
    },
  },
});
