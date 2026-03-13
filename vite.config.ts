import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";

// copies excalidraw fonts to public at build time
const copyExcalidrawFonts = {
  name: "copy-excalidraw-fonts",
  buildStart() {
    const fontsRoot = path.resolve(
      __dirname,
      "node_modules/@excalidraw/excalidraw/dist/prod/fonts",
    );
    const dest = path.resolve(__dirname, "public/fonts");

    const bundledFamilies = [
      "Assistant",
      "Cascadia",
      "ComicShanns",
      "Excalifont",
      "Liberation",
      "Lilita",
      "Nunito",
      "Virgil",
    ];

    fs.rmSync(dest, { force: true, recursive: true });
    fs.mkdirSync(dest, { recursive: true });

    for (const familyName of bundledFamilies) {
      const src = path.join(fontsRoot, familyName);
      const familyDest = path.join(dest, familyName);
      if (fs.existsSync(src)) {
        fs.cpSync(src, familyDest, { recursive: true });
      }
    }
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss(), copyExcalidrawFonts],
  server: {
    port: 1420,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["@excalidraw/excalidraw"],
  },
});
