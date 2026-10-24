import { build } from "vite";
import { fileURLToPath } from "node:url";

// Package the shared repository for Deno; platform bindings stay out of this bundle.
await build({
  configFile: false,
  resolve: { alias: [{ find: "./persistence", replacement: fileURLToPath(new URL("../supabase/functions/nexo-game/persistence.ts", import.meta.url)) }] },
  build: {
    target: "es2022", minify: false, outDir: "dist/supabase-game", emptyOutDir: true,
    lib: { entry: "supabase/functions/nexo-game/index.ts", formats: ["es"], fileName: () => "index.ts" },
  },
});
