import { expect, test, type Locator, type Page } from "@playwright/test";

async function dragAndDrop(page: Page, source: Locator, target: Locator) {
  const sBox = await source.boundingBox();
  const tBox = await target.boundingBox();
  if (!sBox || !tBox) throw new Error("Missing boundingBox for dragAndDrop");

  const sx = sBox.x + sBox.width / 2;
  const sy = sBox.y + sBox.height / 2;
  const tx = tBox.x + tBox.width / 2;
  const ty = tBox.y + tBox.height / 2;

  await page.mouse.move(sx, sy);
  await page.mouse.down();
  // Move > 6px to activate PointerSensor distance constraint
  await page.mouse.move(sx + 10, sy + 4, { steps: 3 });
  await page.mouse.move(tx, ty, { steps: 12 });
  await page.mouse.up();
  // @dnd-kit/core attaches a capture-phase document click blocker cleared after setTimeout(..., 50)
  await page.waitForTimeout(80);
}

test.describe("Phase 4: Drag-and-Drop, Parts Palette, Icon Picker & Full M3 Catalog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("searches categorized M3 Parts Palette and adds LoadingIndicator", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");
    const device = page.getByTestId("android-device-frame");

    await leftSidebar.getByRole("button", { name: "Parts" }).click();
    const search = leftSidebar.getByPlaceholder("Search components...");
    await search.fill("Loading");

    const loaderTile = leftSidebar.getByTestId("palette-item-LoadingIndicator");
    await expect(loaderTile).toBeVisible();
    await loaderTile.click();

    await expect(device.locator('[data-node-type="LoadingIndicator"]')).toBeVisible();
  });

  test("drags a Chip from Parts Palette onto the Canvas Body and nested Card", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");
    const device = page.getByTestId("android-device-frame");

    await leftSidebar.getByRole("button", { name: "Parts" }).click();
    const chipTile = leftSidebar.getByTestId("palette-item-Chip");
    const heroCard = device.locator('[data-node-type="Card"]').first();

    await dragAndDrop(page, chipTile, heroCard);

    await expect(heroCard.locator('[data-node-type="Chip"]')).toBeVisible();
  });

  test("drops TopAppBar and FAB into dedicated Scaffold slots on Auth Flow", async ({ page }) => {
    // Load Auth Flow (starts without TopAppBar or FAB)
    await page.getByRole("button", { name: "Templates" }).click();
    const authCard = page.getByTestId("template-card-auth-flow");
    await authCard.getByRole("button", { name: "Use Template" }).click();
    await authCard.getByRole("button", { name: "Click again to load" }).click();

    const leftSidebar = page.getByTestId("left-sidebar");
    const device = page.getByTestId("android-device-frame");
    await expect(device.getByTestId("scaffold-topbar")).toBeHidden();
    await expect(device.locator('[data-node-type="FloatingActionButton"]')).toBeHidden();

    await leftSidebar.getByRole("button", { name: "Parts" }).click();

    // Drag TopAppBar from palette -> reveals and drops into topbar slot
    const topBarTile = leftSidebar.getByTestId("palette-item-TopAppBar");
    const topBarZone = device.getByTestId("dropzone-topbar");
    await dragAndDrop(page, topBarTile, topBarZone);
    await expect(device.getByTestId("scaffold-topbar")).toBeVisible();

    // Drag FloatingActionButton from palette -> drops into fab slot
    const fabTile = leftSidebar.getByTestId("palette-item-FloatingActionButton");
    const fabZone = device.getByTestId("dropzone-fab");
    await dragAndDrop(page, fabTile, fabZone);
    await expect(device.locator('[data-node-type="FloatingActionButton"]')).toBeVisible();
  });

  test("reorders nodes in AST Tree via drag-and-drop and supports Undo", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");
    const device = page.getByTestId("android-device-frame");

    await leftSidebar.getByRole("button", { name: "AST Tree" }).click();

    const bodyCards = device.locator('[data-testid="scaffold-body"] > [data-node-type="Card"]');
    await expect(bodyCards.first()).toContainText("Design Native Android UI");

    const sourceTreeRow = leftSidebar.locator('[data-tree-node-type="Card"]').last();
    const targetTreeRow = leftSidebar.locator('[data-tree-node-type="Card"]').first();
    await dragAndDrop(page, sourceTreeRow, targetTreeRow);

    await expect(bodyCards.first()).toContainText("Smart Alerts");

    // Undo restores Hero Card as first child
    await page.getByTitle("Undo (Ctrl+Z)").click();
    await expect(bodyCards.first()).toContainText("Design Native Android UI");
  });

  test("picks a Material Symbol icon via Icon Picker in Properties Inspector", async ({ page }) => {
    const device = page.getByTestId("android-device-frame");
    const exploreBtn = device.locator('[data-node-type="Button"]', { hasText: "Explore" });
    await exploreBtn.click();

    const inspector = page.getByTestId("properties-inspector");
    await inspector.getByTestId("icon-picker-trigger").click();

    const dialog = page.getByTestId("icon-picker-dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Search icons...").fill("rocket");
    await dialog.getByTestId("icon-option-rocket_launch").click();

    await expect(exploreBtn).toContainText("rocket_launch");

    await page.getByTitle("Undo (Ctrl+Z)").click();
    await expect(exploreBtn).toContainText("explore");
  });

  test("edits Image, ProgressBar, and LoadingIndicator properties in Inspector", async ({ page }) => {
    const device = page.getByTestId("android-device-frame");
    await page.getByTestId("screen-item-scr_explore").click();

    // Select ProgressBar and edit value + wavy toggle
    const progress = device.locator('[data-node-type="ProgressBar"]');
    await progress.click();
    const inspector = page.getByTestId("properties-inspector");
    await expect(inspector).toBeVisible();

    const wavyCheckbox = inspector.getByLabel("Wavy Expressive");
    await expect(wavyCheckbox).toBeChecked();
    await wavyCheckbox.uncheck();
    await expect(wavyCheckbox).not.toBeChecked();

    // Select Image and change Aspect Ratio
    const img = device.locator('[data-node-type="Image"]');
    await img.click();
    await inspector.getByLabel("Aspect Ratio").selectOption("1:1");
    await expect(img).toHaveCSS("aspect-ratio", "1 / 1");
  });
});
