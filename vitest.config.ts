import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      ".next/**",
      "app/generated/**",
      "prisma/migrations/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/document-workflow.ts", "lib/document-status.ts"],
      exclude: [
        "app/generated/**",
        "prisma/migrations/**",
        "tests/**",
      ],
    },
  },
});
