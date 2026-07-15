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
      include: [
        "lib/document-workflow.ts",
        "lib/document-status.ts",
        "lib/invitations.ts",
        "lib/membership-policy.ts",
        "lib/comment-thread-policy.ts",
        "lib/notification-policy.ts",
        "lib/email/email-events.ts",
        "lib/email/retry-policy.ts",
        "lib/email/safety.ts",
        "lib/email/templates.ts",
      ],
      exclude: [
        "app/generated/**",
        "prisma/migrations/**",
        "tests/**",
      ],
    },
  },
});
