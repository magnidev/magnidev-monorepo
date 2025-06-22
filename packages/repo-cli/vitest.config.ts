import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/tests/**/*.{test,spec}.{js,ts}"],
    exclude: ["node_modules", "dist", ".turbo"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@commands": resolve(__dirname, "./src/commands"),
      "@lib": resolve(__dirname, "./src/lib"),
      "@types": resolve(__dirname, "./src/types"),
      "@schemas": resolve(__dirname, "./src/schemas"),
      "@utils": resolve(__dirname, "./src/utils"),
      "@config": resolve(__dirname, "./src/config"),
      "@services": resolve(__dirname, "./src/lib/services"),
      "@providers": resolve(__dirname, "./src/lib/providers"),
    },
  },
});
