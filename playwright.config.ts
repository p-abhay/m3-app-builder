import { defineConfig } from "@playwright/test";

const isCI = Boolean(process.env.CI);
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: isCI ? 1 : 0,
  timeout: 30_000,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    channel: process.env.PLAYWRIGHT_CHANNEL || (isCI ? undefined : "msedge"),
    headless: true,
    viewport: { width: 1440, height: 920 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `${npmCmd} run dev -- --host 127.0.0.1 --port 4173 --strictPort`,
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: isCI ? 60_000 : 30_000,
  },
});
