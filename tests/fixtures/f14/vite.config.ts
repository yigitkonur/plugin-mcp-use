import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: { exclude: ["@openai/apps-sdk-ui"] },
});
