import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  test: { environment: "node", exclude: ["tests/e2e/**", "tests/prelaunch/**", "node_modules/**"] },
});
