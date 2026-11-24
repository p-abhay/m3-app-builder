import { expect, test } from "@playwright/test";

test.describe("Phase 3: Live AST Canvas Renderer, Selection & Properties Inspector", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("renders the active screen AST inside the Android phone frame and switches screens", async ({ page }) => {
    const device = page.getByTestId("android-device-frame");
    await expect(device).toBeVisible();

    // Home screen from Material Showcase renders AST content (not static Phase 1 demo)
    await expect(device.getByText("Design Native Android UI")).toBeVisible();
    await expect(device.getByTestId("scaffold-body").getByRole("button", { name: /Explore/i })).toBeVisible();
    await expect(device.getByRole("button", { name: /Compose/i })).toBeVisible();

    // Switching to Explore screen in LeftSidebar renders Explore's AST nodes
    await page.getByTestId("screen-item-scr_explore").click();
    await expect(device.getByText("Explore Components")).toBeVisible();
    await expect(device.getByText("Shape-Morphing Loader")).toBeVisible();

    // Switching to Settings screen hides shared BottomNavigationBar (showBottomNav: false)
    await page.getByTestId("screen-item-scr_settings").click();
    await expect(device.getByText("Haptic Feedback")).toBeVisible();
    await expect(device.getByTestId("shared-bottom-nav")).toBeHidden();
  });

  test("renders Auth Flow without TopAppBar or BottomNav when AST omits them", async ({ page }) => {
    await page.getByRole("button", { name: "Templates" }).click();
    const authCard = page.getByTestId("template-card-auth-flow");
    await authCard.getByRole("button", { name: "Use Template" }).click();
    await authCard.getByRole("button", { name: "Click again to load" }).click();

    const device = page.getByTestId("android-device-frame");
    await expect(device.getByText("Welcome back")).toBeVisible();
    await expect(device.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(device.getByTestId("scaffold-topbar")).toBeHidden();
    await expect(device.getByTestId("shared-bottom-nav")).toBeHidden();
  });

  test("supports bidirectional selection between canvas nodes and AST Tree", async ({ page }) => {
    const device = page.getByTestId("android-device-frame");

    // Click a node directly on the phone canvas
    const heroHeading = device.locator('[data-node-type="Text"]', { hasText: "Design Native Android UI" });
    await heroHeading.click();
    await expect(heroHeading).toHaveAttribute("data-selected", "true");

    // Open AST Tree and verify corresponding tree item is selected
    await page.getByRole("button", { name: "AST Tree" }).click();
    const selectedTreeRow = page.locator('[data-tree-selected="true"]');
    await expect(selectedTreeRow).toContainText("Design Native Android UI");

    // Selecting another node from AST Tree selects it on the canvas
    await page.locator('[data-tree-node-type="FloatingActionButton"]').click();
    const fabOnCanvas = device.locator('[data-node-type="FloatingActionButton"]');
    await expect(fabOnCanvas).toHaveAttribute("data-selected", "true");
  });

  test("edits node properties and style in the Properties Inspector with live canvas updates and Undo", async ({ page }) => {
    const device = page.getByTestId("android-device-frame");

    // Select the "Explore" button on the canvas
    const exploreBtn = device.locator('[data-node-type="Button"]', { hasText: "Explore" });
    await exploreBtn.click();

    // Right sidebar switches to Properties Inspector for Button
    const inspector = page.getByTestId("properties-inspector");
    await expect(inspector).toBeVisible();

    const labelInput = inspector.getByLabel("Button Label");
    await labelInput.fill("Launch Now");
    await expect(device.locator('[data-node-type="Button"]', { hasText: "Launch Now" })).toBeVisible();

    // Change button variant to Outlined
    await inspector.getByLabel("Button Variant").selectOption("outlined");

    // Undo reverts the label back to Explore
    await page.getByTitle("Undo (Ctrl+Z)").click();
    await page.getByTitle("Undo (Ctrl+Z)").click();
    await expect(device.locator('[data-node-type="Button"]', { hasText: "Explore" })).toBeVisible();
  });

  test("adds a core component to the active screen and deletes/duplicates via Inspector", async ({ page }) => {
    const device = page.getByTestId("android-device-frame");

    // Add a new Button via Quick Add palette/bar
    await page.getByTestId("quick-add-Button").click();
    const newBtn = device.locator('[data-node-type="Button"]', { hasText: "Continue" });
    await expect(newBtn).toBeVisible();

    // Duplicate it via Inspector
    const inspector = page.getByTestId("properties-inspector");
    await inspector.getByTitle("Duplicate component").click();
    await expect(device.locator('[data-node-type="Button"]', { hasText: "Continue" })).toHaveCount(2);

    // Delete the duplicated node via Inspector
    await inspector.getByTitle("Delete component").click();
    await expect(device.locator('[data-node-type="Button"]', { hasText: "Continue" })).toHaveCount(1);
  });

  test("toggles viewport size between Compact Phone and Tablet frames", async ({ page }) => {
    const device = page.getByTestId("android-device-frame");
    const phoneBox = await device.boundingBox();
    expect(phoneBox?.width).toBeLessThan(460);

    await page.getByRole("button", { name: "Tablet", exact: true }).click();
    const tabletBox = await device.boundingBox();
    expect(tabletBox?.width).toBeGreaterThan(600);
  });
});
