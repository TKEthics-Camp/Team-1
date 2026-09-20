import { defineConfig } from "vite";
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
