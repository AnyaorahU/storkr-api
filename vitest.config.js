import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    // TODO: point setupFiles at tests/setup.js
    setupFiles: ["./tests/setup.js"],
  },
});
