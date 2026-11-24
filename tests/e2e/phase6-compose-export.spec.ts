import { expect, test } from "@playwright/test";

test.describe("Phase 6: Kotlin + Jetpack Compose Export & Live Code Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("opens Export Kotlin modal, switches generated Compose files, and copies source", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.getByTestId("export-kotlin-button").click();

    const modal = page.getByTestId("compose-export-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("com.example.m3showcase");

    // Required Kotlin files present in explorer
    for (const fileName of ["Color.kt", "Type.kt", "Shape.kt", "Theme.kt", "HomeScreen.kt", "AppNavHost.kt", "MainActivity.kt"]) {
      await expect(modal.getByTestId(`kotlin-file-${fileName}`)).toBeVisible();
    }

    // Inspect HomeScreen.kt
    await modal.getByTestId("kotlin-file-HomeScreen.kt").click();
    const viewer = modal.getByTestId("kotlin-code-viewer");
    await expect(viewer).toContainText("@Composable");
    await expect(viewer).toContainText("fun HomeScreen(");
    await expect(viewer).toContainText("Scaffold(");
    await expect(viewer).toContainText("Design Native Android UI");

    // Inspect AppNavHost.kt
    await modal.getByTestId("kotlin-file-AppNavHost.kt").click();
    await expect(viewer).toContainText("NavHost(");
    await expect(viewer).toContainText("NavigationBar");

    // Copy file works
    const copyBtn = modal.getByTestId("copy-kotlin-file");
    await copyBtn.click();
    await expect(copyBtn).toContainText("Copied");
  });

  test("toggles Hybrid Stable M3 vs M3 Expressive Alpha APIs for LoadingIndicator", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");

    // Add an M3E LoadingIndicator onto Home
    await leftSidebar.getByRole("button", { name: "Parts" }).click();
    await leftSidebar.getByPlaceholder("Search components...").fill("Loading");
    await leftSidebar.getByTestId("palette-item-LoadingIndicator").click();

    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");
    await modal.getByTestId("kotlin-file-HomeScreen.kt").click();

    const viewer = modal.getByTestId("kotlin-code-viewer");
    const m3eToggle = modal.getByTestId("compose-m3e-toggle");

    // Hybrid default: stable M3 fallback without ExperimentalMaterial3ExpressiveApi
    await expect(m3eToggle).not.toBeChecked();
    await expect(viewer).toContainText("CircularProgressIndicator");
    await expect(viewer).not.toContainText("ExperimentalMaterial3ExpressiveApi");

    // Opt-in M3 Expressive Alpha: emits LoadingIndicator + @OptIn
    await m3eToggle.check();
    await expect(m3eToggle).toBeChecked();
    await expect(viewer).toContainText("ExperimentalMaterial3ExpressiveApi");
    await expect(viewer).toContainText("LoadingIndicator(");
  });

  test("reflects live AST edits and dark/seed theme updates in generated Kotlin", async ({ page }) => {
    // Rename project & switch theme seed/mode
    const nameInput = page.getByLabel("Project Name");
    await nameInput.fill("Pulse Studio");

    const device = page.getByTestId("android-device-frame");
    await device.locator('[data-node-type="Text"]', { hasText: "Design Native Android UI" }).click();
    const inspector = page.getByTestId("properties-inspector");
    await inspector.getByLabel("Text Content").fill("Compose Live Sync");

    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");
    const viewer = modal.getByTestId("kotlin-code-viewer");

    await modal.getByTestId("kotlin-file-HomeScreen.kt").click();
    await expect(viewer).toContainText("Compose Live Sync");

    await modal.getByTestId("kotlin-file-Theme.kt").click();
    await expect(viewer).toContainText("PulseStudioTheme");
  });

  test("generates multi-screen SignIn/CreateAccount composables for Auth Flow template", async ({ page }) => {
    await page.getByRole("button", { name: "Templates" }).click();
    const authCard = page.getByTestId("template-card-auth-flow");
    await authCard.getByRole("button", { name: "Use Template" }).click();
    await authCard.getByRole("button", { name: "Click again to load" }).click();

    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");

    await expect(modal.getByTestId("kotlin-file-SignInScreen.kt")).toBeVisible();
    await expect(modal.getByTestId("kotlin-file-CreateAccountScreen.kt")).toBeVisible();

    await modal.getByTestId("kotlin-file-AppNavHost.kt").click();
    const viewer = modal.getByTestId("kotlin-code-viewer");
    await expect(viewer).toContainText("signin");
    await expect(viewer).toContainText("signup");
    await expect(viewer).toContainText("SignInScreen(");
    await expect(viewer).toContainText("CreateAccountScreen(");
  });
});
