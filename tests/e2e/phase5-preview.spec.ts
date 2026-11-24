import { expect, test } from "@playwright/test";

test.describe("Phase 5: Isolated Interactive Preview & Multi-Screen Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("toggles between Edit and Preview modes and keeps ThemePanel live", async ({ page }) => {
    await expect(page.getByTestId("left-sidebar")).toBeVisible();
    await expect(page.getByTestId("quick-add-Button")).toBeVisible();

    await page.getByTestId("mode-preview").click();

    await expect(page.getByTestId("left-sidebar")).toBeHidden();
    await expect(page.getByTestId("quick-add-Button")).toBeHidden();
    await expect(page.getByTestId("preview-toolbar")).toBeVisible();

    // Theme & System remains interactive in Preview mode
    const rightSidebar = page.getByTestId("right-sidebar");
    await rightSidebar.getByRole("button", { name: "Dark", exact: true }).click();
    const storedDark = await page.evaluate(() => {
      const raw = localStorage.getItem("m3_app_builder_project_v1");
      return raw ? JSON.parse(raw).theme.mode : null;
    });
    expect(storedDark).toBe("dark");

    await page.getByTestId("mode-edit").click();
    await expect(page.getByTestId("left-sidebar")).toBeVisible();
  });

  test("handles live interactive TextField and Switch state without mutating Design AST", async ({ page }) => {
    await page.getByTestId("mode-preview").click();
    const device = page.getByTestId("android-device-frame");

    // Type in Quick Search TextField
    const searchInput = device.getByLabel("Quick Search");
    await searchInput.fill("Compose Material");
    await expect(searchInput).toHaveValue("Compose Material");

    // Toggle Smart Alerts ListItem switch (starts checked=true -> becomes false)
    const smartAlerts = device.locator('[data-node-type="ListItem"]', { hasText: "Smart Alerts" });
    const switchRole = smartAlerts.getByRole("switch");
    await expect(switchRole).toHaveAttribute("aria-checked", "true");
    await smartAlerts.click();
    await expect(switchRole).toHaveAttribute("aria-checked", "false");

    // Reset Preview restores defaults
    await page.getByTestId("preview-reset").click();
    await expect(device.getByLabel("Quick Search")).toHaveValue("");
    await expect(switchRole).toHaveAttribute("aria-checked", "true");

    // Returning to Edit mode confirms AST Undo stack was not polluted
    await page.getByTestId("mode-edit").click();
    await expect(page.getByTitle("Undo (Ctrl+Z)")).toBeDisabled();
  });

  test("navigates across screens via Buttons, TopAppBar actions, Back, and Shared BottomNav", async ({ page }) => {
    await page.getByTestId("mode-preview").click();
    const device = page.getByTestId("android-device-frame");

    // Tap Explore button in Home body -> navigates to Explore screen
    await device.getByTestId("scaffold-body").getByRole("button", { name: /Explore/i }).click();
    await expect(device.getByText("Shape-Morphing Loader")).toBeVisible();

    // Tap Settings via Shared BottomNav -> Profile -> Settings ListItem
    await device.getByTestId("shared-bottom-nav").getByRole("button", { name: "Profile" }).click();
    await expect(device.getByText("Alex Mercer")).toBeVisible();

    await device.locator('[data-node-type="ListItem"]', { hasText: "App Preferences" }).click();
    await expect(device.getByText("Haptic Feedback")).toBeVisible();
    await expect(device.getByTestId("shared-bottom-nav")).toBeHidden();

    // Tap TopAppBar back icon -> returns to Profile
    await device.getByTestId("topbar-nav-button").click();
    await expect(device.getByText("Alex Mercer")).toBeVisible();
    await expect(device.getByTestId("shared-bottom-nav")).toBeVisible();
  });

  test("triggers Material 3 Snackbar action on FAB tap and dismisses cleanly", async ({ page }) => {
    await page.getByTestId("mode-preview").click();
    const device = page.getByTestId("android-device-frame");

    await device.getByRole("button", { name: /Compose/i }).click();
    const snackbar = device.getByTestId("preview-snackbar");
    await expect(snackbar).toBeVisible();
    await expect(snackbar).toContainText("Compose action tapped!");

    await snackbar.getByRole("button", { name: "Dismiss" }).click();
    await expect(snackbar).toBeHidden();
  });

  test("runs multi-screen Auth Flow end-to-end in Preview mode", async ({ page }) => {
    await page.getByRole("button", { name: "Templates" }).click();
    const authCard = page.getByTestId("template-card-auth-flow");
    await authCard.getByRole("button", { name: "Use Template" }).click();
    await authCard.getByRole("button", { name: "Click again to load" }).click();

    await page.getByTestId("mode-preview").click();
    const device = page.getByTestId("android-device-frame");

    await device.getByLabel("Email").fill("alex@android.dev");
    await device.getByRole("button", { name: "Create an account" }).click();
    await expect(device.getByLabel("Full Name")).toBeVisible();

    await device.getByTestId("topbar-nav-button").click();
    await expect(device.getByText("Welcome back")).toBeVisible();

    await device.getByRole("button", { name: "Sign In" }).click();
    await expect(device.getByTestId("preview-snackbar")).toContainText("Signed in!");
  });
});
