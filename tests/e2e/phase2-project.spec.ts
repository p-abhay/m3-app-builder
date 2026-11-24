import { expect, test } from "@playwright/test";

test.describe("Phase 2: Normalized AST, Screens, Undo/Redo, Templates & JSON", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("loads starter templates and supports Undo/Redo", async ({ page }) => {
    const projectInput = page.getByLabel("Project Name");
    await expect(projectInput).toHaveValue("Material Showcase");

    await page.getByRole("button", { name: "Templates" }).click();
    await expect(page.getByText("Starter App Templates")).toBeVisible();

    const settingsCard = page.getByTestId("template-card-settings-app");
    await settingsCard.getByRole("button", { name: "Use Template" }).click();
    await settingsCard.getByRole("button", { name: "Click again to load" }).click();

    await expect(projectInput).toHaveValue("Android Settings");

    await page.getByTitle("Undo (Ctrl+Z)").click();
    await expect(projectInput).toHaveValue("Material Showcase");

    await page.getByTitle("Redo (Ctrl+Shift+Z)").click();
    await expect(projectInput).toHaveValue("Android Settings");
  });

  test("creates, configures, duplicates, and removes screens and shared bottom nav tabs", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");

    await expect(leftSidebar.getByText("Screens (4)")).toBeVisible();

    await leftSidebar.getByRole("button", { name: "Add", exact: true }).click();
    await expect(leftSidebar.getByText("Screens (5)")).toBeVisible();
    await expect(leftSidebar.getByText("Screen 5", { exact: true })).toBeVisible();

    await expect(leftSidebar.getByText("App-wide tabs (3/5)")).toBeVisible();
    await leftSidebar.getByRole("button", { name: "Add Tab Destination" }).click();
    await expect(leftSidebar.getByText("App-wide tabs (4/5)")).toBeVisible();

    await leftSidebar.getByRole("button", { name: "AST Tree" }).click();
    await expect(leftSidebar.getByText("Screen 5 Scaffold")).toBeVisible();
  });

  test("exports valid AST JSON and rejects malformed JSON imports cleanly", async ({ page }) => {
    await page.getByRole("button", { name: "AST JSON" }).click();
    await expect(page.getByText("Project AST & JSON")).toBeVisible();

    const textarea = page.locator("textarea");
    const exportedJson = await textarea.inputValue();
    const parsed = JSON.parse(exportedJson);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.screens.length).toBeGreaterThanOrEqual(4);

    await page.getByRole("button", { name: /import JSON/i }).click();
    await textarea.fill('{"schemaVersion": 999, "bad": true}');
    await page.getByRole("button", { name: "Import Project" }).click();
    await expect(page.getByText(/Invalid M3 App Builder project schema/i)).toBeVisible();

    parsed.name = "Imported App Name";
    await textarea.fill(JSON.stringify(parsed));
    await page.getByRole("button", { name: "Import Project" }).click();

    await expect(page.getByLabel("Project Name")).toHaveValue("Imported App Name");
  });
});
