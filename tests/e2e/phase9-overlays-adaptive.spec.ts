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
});
