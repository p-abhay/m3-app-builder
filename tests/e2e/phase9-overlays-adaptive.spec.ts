import { expect, test } from "@playwright/test";

test.describe("v0.4.0: Core Components, Modal Overlays, Tablet NavigationRail & Preflight", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("adds DropdownMenu, RadioGroup, Tabs, AlertDialog, and ModalBottomSheet from Parts Palette", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");
    const device = page.getByTestId("android-device-frame");

    await leftSidebar.getByRole("button", { name: "Parts" }).click();
    const search = leftSidebar.getByPlaceholder("Search components...");

    for (const [query, type] of [
      ["Dropdown", "DropdownMenu"],
      ["Radio Group", "RadioGroup"],
      ["Tabs", "Tabs"],
      ["Alert Dialog", "AlertDialog"],
      ["Bottom Sheet", "ModalBottomSheet"],
    ] as const) {
      await search.fill(query);
      await leftSidebar.getByTestId(`palette-item-${type}`).click();
      await expect(device.locator(`[data-node-type="${type}"]`)).toBeVisible();
    }
  });

  test("runs AlertDialog openOverlay/dismissOverlay, DropdownMenu, RadioGroup, Tabs, and Tablet NavigationRail", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");
    const rightSidebar = page.getByTestId("right-sidebar");
    const device = page.getByTestId("android-device-frame");

    // 1. Default Material Showcase switches BottomNav -> NavigationRail in Tablet viewport
    await expect(device.getByTestId("shared-bottom-nav")).toBeVisible();
    await page.getByRole("button", { name: "Tablet" }).click();
    await expect(device.getByTestId("shared-nav-rail")).toBeVisible();
    await expect(device.getByTestId("shared-bottom-nav")).toBeHidden();
    await page.getByRole("button", { name: "Phone" }).click();
    await expect(device.getByTestId("shared-bottom-nav")).toBeVisible();

    // 2. Add AlertDialog and trigger Button opening that overlay
    await leftSidebar.getByRole("button", { name: "Parts" }).click();
    await leftSidebar.getByPlaceholder("Search components...").fill("Alert Dialog");
    await leftSidebar.getByTestId("palette-item-AlertDialog").click();

    const dialogNodeId = await device.locator('[data-node-type="AlertDialog"]').getAttribute("data-node-id");
    expect(dialogNodeId).toBeTruthy();

    await leftSidebar.getByPlaceholder("Search components...").fill("Button");
    await leftSidebar.getByTestId("palette-item-Button").click();

    await rightSidebar.getByRole("button", { name: "Properties" }).click();
    await rightSidebar.getByLabel("Button Label").fill("Open Prompt");
    // Wire On Tap -> openOverlay targeting the created AlertDialog
    await rightSidebar.locator("select").filter({ hasText: "Navigate to Screen" }).first().selectOption("openOverlay");
    await rightSidebar.getByLabel("Target Overlay").selectOption(dialogNodeId!);

    // Add DropdownMenu & RadioGroup
    await leftSidebar.getByPlaceholder("Search components...").fill("Dropdown");
    await leftSidebar.getByTestId("palette-item-DropdownMenu").click();

    // 3. Test Interactive Preview: overlays hidden until clicked, then dialog opens & dismisses cleanly
    await page.getByTestId("mode-preview").click();
    await expect(device.getByTestId("preview-overlay-scrim")).toBeHidden();

    await device.getByRole("button", { name: "Open Prompt" }).click();
    await expect(device.getByTestId("preview-overlay-scrim")).toBeVisible();
    await expect(device.getByTestId("preview-overlay-scrim")).toContainText("Confirm action?");

    await device.getByTestId("preview-overlay-scrim").getByRole("button", { name: "Cancel" }).click();
    await expect(device.getByTestId("preview-overlay-scrim")).toBeHidden();

    // Interact with DropdownMenu
    await device.locator('[data-node-type="DropdownMenu"]').click();
    await device.getByRole("option", { name: "Urgent" }).click();
    await expect(device.locator('[data-node-type="DropdownMenu"]')).toContainText("Urgent");
  });

  test("edits collection schema & seed rows in Data tab and verifies Static Preflight in Export Kotlin", async ({ page }) => {
    await page.getByRole("button", { name: "Templates" }).click();
    const todoCard = page.getByTestId("template-card-todo-app");
    await todoCard.getByRole("button", { name: "Use Template" }).click();
    await todoCard.getByRole("button", { name: "Click again to load" }).click();

    const leftSidebar = page.getByTestId("left-sidebar");
    await leftSidebar.getByRole("button", { name: "Data" }).click();

    const todosCard = leftSidebar.getByTestId("collection-card-todos");
    await todosCard.getByRole("button", { name: "Edit Schema & Seeds" }).click();
    await todosCard.getByLabel("New field for todos").fill("estimate");
    await todosCard.getByLabel("Field type for todos").selectOption("number");
    await todosCard.getByRole("button", { name: "+ Field" }).click();
    await expect(todosCard).toContainText("estimate:number");

    await todosCard.getByRole("button", { name: "+ Add Seed Row" }).click();
    await expect(todosCard).toContainText("4 seed rows");

    // Verify Export Kotlin Static Preflight passes with balanced NavigationRail & custom field in AppStateStore
    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");
    const preflightBadge = modal.getByTestId("preflight-status-badge");
    await expect(preflightBadge).toContainText(/Preflight Passed/i);

    await preflightBadge.click();
    await expect(modal.getByTestId("preflight-drawer")).toContainText(/static preflight checks passed/i);

    await modal.getByTestId("kotlin-file-AppStateStore.kt").click();
    await expect(modal.getByTestId("kotlin-code-viewer")).toContainText("val estimate: Long");
  });

  test("v0.4.1: auto device theme, unclipped left NavigationRail tabs, and component self-alignment", async ({ page }) => {
    // 1. Auto System Theme follows device prefers-color-scheme: dark in Studio & Compose export
    await page.emulateMedia({ colorScheme: "dark" });
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    const headerThemeBtn = page.getByTestId("header-theme-mode-button");
    await expect(headerThemeBtn).toContainText("Auto");

    const leftSidebar = page.getByTestId("left-sidebar");
    // 2. All 5 left NavigationRail tabs render visibly without text clipping/truncation
    for (const key of ["parts", "screens", "data", "tree", "tokens"] as const) {
      const tabBtn = leftSidebar.getByTestId(`left-tab-${key}`);
      await expect(tabBtn).toBeVisible();
      const overflowCheck = await tabBtn.evaluate((btn) => {
        const label = btn.querySelector("span:last-of-type") as HTMLElement;
        const labelRect = label.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();
        return {
          scrollW: label.scrollWidth,
          clientW: label.clientWidth,
          rectW: labelRect.width,
          fitsInsideButton: labelRect.right <= btnRect.right + 1 && labelRect.left >= btnRect.left - 1,
        };
      });
      expect(overflowCheck.rectW).toBeGreaterThan(20);
      expect(overflowCheck.scrollW).toBeLessThanOrEqual(overflowCheck.clientW + 1);
      expect(overflowCheck.fitsInsideButton).toBe(true);
    }

    // Tokens tab confirms dark surface colors active automatically from system preference
    await leftSidebar.getByTestId("left-tab-tokens").click();
    await expect(leftSidebar.getByText(/^#[01][0-9A-F]{5}$/).first()).toBeVisible();

    // Header mode toggle cycles Auto -> Light -> Dark -> Auto
    await headerThemeBtn.click();
    await expect(headerThemeBtn).toContainText("Light");
    await headerThemeBtn.click();
    await expect(headerThemeBtn).toContainText("Dark");
    await headerThemeBtn.click();
    await expect(headerThemeBtn).toContainText("Auto");

    // 3. Component self-alignment control updates canvas CSS and Compose Modifier.align
    await leftSidebar.getByTestId("left-tab-parts").click();
    await leftSidebar.getByPlaceholder("Search components...").fill("Button");
    await leftSidebar.getByTestId("palette-item-Button").click();

    const device = page.getByTestId("android-device-frame");
    const addedButton = device.locator('[data-node-type="Button"]').last();
    await addedButton.click();

    const rightSidebar = page.getByTestId("right-sidebar");
    await rightSidebar.getByRole("button", { name: "Properties" }).click();
    await rightSidebar.getByRole("button", { name: "Align Center" }).click();

    await expect(addedButton).toHaveCSS("align-self", "center");

    await page.getByTestId("mode-preview").click();
    await expect(device.locator('[data-node-type="Button"]').last()).toHaveCSS("align-self", "center");
    await page.getByTestId("mode-edit").click();

    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");
    await modal.getByTestId("kotlin-file-Theme.kt").click();
    await expect(modal.getByTestId("kotlin-code-viewer")).toContainText("darkTheme: Boolean = isSystemInDarkTheme()");
    await modal.getByTestId("kotlin-file-HomeScreen.kt").click();
    await expect(modal.getByTestId("kotlin-code-viewer")).toContainText(".align(Alignment.CenterHorizontally)");
  });
});
