import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

process.loadEnvFile(".env.local");

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.db.test.ts"],
  },
});
