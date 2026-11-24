import { expect, test } from "@playwright/test";

test.describe("Phase 1: Material 3 Expressive Theme & System Engine", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("switches light/dark mode and persists across reload", async ({ page }) => {
    const rightSidebar = page.getByTestId("right-sidebar");
    const leftSidebar = page.getByTestId("left-sidebar");

    await rightSidebar.getByRole("button", { name: "Dark", exact: true }).click();

    await leftSidebar.getByRole("button", { name: "Tokens" }).click();
    // Dark mode surface uses low tone (hex starts with #0 or #1)
    await expect(leftSidebar.getByText(/^#[01][0-9A-F]{5}$/).first()).toBeVisible();

    await page.reload();
    const storedDark = await page.evaluate(() => {
      const raw = localStorage.getItem("m3_app_builder_project_v1");
      return raw ? JSON.parse(raw).theme.mode : null;
    });
    expect(storedDark).toBe("dark");
  });

  test("updates seed palette, dynamic color wallpaper, and contrast level", async ({ page }) => {
    const rightSidebar = page.getByTestId("right-sidebar");
    const leftSidebar = page.getByTestId("left-sidebar");

    await rightSidebar.getByRole("button", { name: "Pixel Blue" }).click();
    await leftSidebar.getByRole("button", { name: "Tokens" }).click();

    const blueTheme = await page.evaluate(() => {
      const raw = localStorage.getItem("m3_app_builder_project_v1");
      return raw ? JSON.parse(raw).theme : null;
    });
    expect(blueTheme.paletteKey).toBe("blue");
    expect(blueTheme.seedColor).toBe("#0B57D0");

    const dynamicSwitch = rightSidebar
      .locator("div", { hasText: "Dynamic Color (Material You)" })
      .getByRole("switch")
      .first();
    await dynamicSwitch.click();
    await rightSidebar.getByRole("button", { name: "Desert Sunset" }).click();

    const storedTheme = await page.evaluate(() => {
      const raw = localStorage.getItem("m3_app_builder_project_v1");
      return raw ? JSON.parse(raw).theme : null;
    });
    expect(storedTheme.useDynamicColor).toBe(true);
    expect(storedTheme.wallpaperId).toBe("sunset");

    await rightSidebar.getByRole("button", { name: "High", exact: true }).click();
    const highContrast = await page.evaluate(() => {
      const raw = localStorage.getItem("m3_app_builder_project_v1");
      return raw ? JSON.parse(raw).theme.contrast : null;
    });
    expect(highContrast).toBe("high");
  });

  test("customizes Display/Body fonts, emphasized weights, font scale, and shape scale", async ({ page }) => {
    const rightSidebar = page.getByTestId("right-sidebar");
    const leftSidebar = page.getByTestId("left-sidebar");

    await rightSidebar.getByRole("tab", { name: "Type & Shape" }).click();

    await rightSidebar.getByRole("button", { name: /Poppins/ }).click();
    await rightSidebar.getByRole("button", { name: "130%" }).click();
    await rightSidebar.getByRole("button", { name: /Square/ }).click();

    const emphasizedSwitch = rightSidebar
      .locator("div", { hasText: "Emphasized Type Weights" })
      .getByRole("switch")
      .first();
    await emphasizedSwitch.click();

    await leftSidebar.getByRole("button", { name: "Tokens" }).click();
    await expect(leftSidebar.getByText("130%").first()).toBeVisible();
    await expect(leftSidebar.getByText("poppins").first()).toBeVisible();
    await expect(leftSidebar.getByText("square").first()).toBeVisible();
  });

  test("configures system density, motion physics, and Android system bars", async ({ page }) => {
    const rightSidebar = page.getByTestId("right-sidebar");
    const leftSidebar = page.getByTestId("left-sidebar");

    await rightSidebar.getByRole("tab", { name: "System" }).click();

    await rightSidebar.getByRole("button", { name: "Compact" }).click();
    await rightSidebar.getByRole("button", { name: "3-Button" }).click();
    await rightSidebar.getByRole("button", { name: "Standard", exact: true }).first().click();

    await leftSidebar.getByRole("button", { name: "Tokens" }).click();
    await expect(leftSidebar.getByText("12dp").first()).toBeVisible();
  });
});
