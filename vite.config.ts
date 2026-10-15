import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { learningPlugin } from "./server/learning-plugin";
export default defineConfig({
  plugins: [react(), learningPlugin()],
  server: {
    host: "127.0.0.1",
    strictPort: true,
    cors: false,
    fs: {
      strict: true,
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/personal-os/**",
        "**/.work-learning-test-*/**",
      ],
    },
  },
  preview: { host: "127.0.0.1", cors: false },
});
