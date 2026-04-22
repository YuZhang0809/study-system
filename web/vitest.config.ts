import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: [
      "app/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    includeSource: [
      "lib/schemas/**/*.ts",
      "lib/seed/**/*.ts",
      "lib/today/**/*.ts",
      "lib/knowledge/**/*.ts",
      "lib/retro/**/*.ts",
    ],
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
