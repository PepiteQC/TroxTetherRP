import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: ".",
  publicDir: "public",

  // ✅ ADD THIS — Tell Vite to only scan your main entry
  optimizeDeps: {
    entries: ["src/main.tsx"], // or "src/main.jsx" depending on your file
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@components": path.resolve(__dirname, "./src/components"),
      "@game": path.resolve(__dirname, "./src/game"),
      "@core": path.resolve(__dirname, "./src/core"),
      "@ui": path.resolve(__dirname, "./src/ui"),
      "@shared": path.resolve(__dirname, "./src/shared"),
      "@scene": path.resolve(__dirname, "./src/scene-creator"),
      "@nodelab": path.resolve(__dirname, "./src/nodejs-lab"),
      "@workspace/api-client-react": path.resolve(__dirname, "./src/nodejs-lab/lib/api-client-react/index.ts"),
      "@state": path.resolve(__dirname, "./src/state"),
      "@nodelab/components": path.resolve(__dirname, "./src/nodejs-lab/components"),
      "@nodelab/hooks": path.resolve(__dirname, "./src/nodejs-lab/hooks"),
      "@nodelab/lib": path.resolve(__dirname, "./src/nodejs-lab/lib"),
      "@nodelab/pages": path.resolve(__dirname, "./src/nodejs-lab/pages"),
    }
  },

  server: {
    port: 5173,
    open: false,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true
      },
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
        changeOrigin: true
      }
    }
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      // ✅ ADD THIS — Only build from your React entry
      input: {
        main: path.resolve(__dirname, "index.html")
      },
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          three: ["three"],
        }
      }
    }
  }
});
