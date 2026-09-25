import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Design preview: the real screens with sample data and no login. Swaps the
// store and auth contexts for the mocks in src/dev by absolute path, so the
// screens import them exactly as they normally would.
const swap = {
  [path.resolve("src/store/StoreContext.jsx")]: path.resolve("src/dev/mockStore.jsx"),
  [path.resolve("src/store/AuthContext.jsx")]: path.resolve("src/dev/mockAuth.jsx"),
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: "forest-preview-mocks",
      enforce: "pre",
      async resolveId(source, importer, options) {
        const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
        if (resolved && swap[resolved.id]) return swap[resolved.id];
        return null;
      },
    },
  ],
  server: { open: false },
  appType: "mpa",
});
