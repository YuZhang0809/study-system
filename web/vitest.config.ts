import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "app/**/*.test.{ts,tsx}",
      "lib/**/*.test.{ts,tsx}",
      "components/**/*.test.{ts,tsx}",
      "tests/**/*.test.ts",
    ],
    includeSource: ["lib/schemas/**/*.ts"],
  },
  define: {
    "import.meta.vitest": "undefined",
  },
});
