import { expect, test } from "@playwright/test";

test.describe("v0.3.0: Todo App CRUD, Search, Sort, New Components & Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("adds new SearchBar, SegmentedButton, and DataList components from Parts Palette", async ({ page }) => {
    const leftSidebar = page.getByTestId("left-sidebar");
    const device = page.getByTestId("android-device-frame");

    await leftSidebar.getByRole("button", { name: "Parts" }).click();
    const search = leftSidebar.getByPlaceholder("Search components...");

    await search.fill("Search Bar");
    await leftSidebar.getByTestId("palette-item-SearchBar").click();
    await expect(device.locator('[data-node-type="SearchBar"]')).toBeVisible();

    await search.fill("Segmented");
    await leftSidebar.getByTestId("palette-item-SegmentedButton").click();
    await expect(device.locator('[data-node-type="SegmentedButton"]')).toBeVisible();

    await search.fill("Data List");
    await leftSidebar.getByTestId("palette-item-DataList").click();
    await expect(device.locator('[data-node-type="DataList"]')).toBeVisible();
  });

  test("runs Todo & Tasks app end-to-end in Preview: create, search, filter, sort, toggle, edit, delete & persist across reload", async ({ page }) => {
    // Load Todo & Tasks template
    await page.getByRole("button", { name: "Templates" }).click();
    const todoCard = page.getByTestId("template-card-todo-app");
    await expect(todoCard).toBeVisible();
    await todoCard.getByRole("button", { name: "Use Template" }).click();
    await todoCard.getByRole("button", { name: "Click again to load" }).click();

    const device = page.getByTestId("android-device-frame");
    await expect(device).toContainText("My Tasks");

    // Enter Interactive Preview
    await page.getByTestId("mode-preview").click();

    // 1. Create via Quick Add input + Add button
    const quickInput = device.getByPlaceholder("Add a new task...");
    await quickInput.fill("Buy espresso beans");
    await device.getByRole("button", { name: "Add", exact: true }).click();
    await expect(device).toContainText("Buy espresso beans");

    // 2. Search narrows displayed items live
    const searchInput = device.getByPlaceholder("Search tasks...");
    await searchInput.fill("espresso");
    await expect(device).toContainText("Buy espresso beans");
    await expect(device).not.toContainText("Review Material 3 tokens");

    // Clear search
    await searchInput.fill("");
    await expect(device).toContainText("Review Material 3 tokens");

    // 3. Toggle completion & filter Active / Done via SegmentedButton
    const newTaskCard = device.locator('[data-node-type="Card"]', { hasText: "Buy espresso beans" });
    await newTaskCard.locator('[data-node-type="Checkbox"]').click();

    await device.getByRole("button", { name: "Done", exact: true }).click();
    await expect(device).toContainText("Buy espresso beans");

    await device.getByRole("button", { name: "Active", exact: true }).click();
    await expect(device).not.toContainText("Buy espresso beans");

    // Switch back to All and sort A-Z
    await device.getByRole("button", { name: "All", exact: true }).click();
    await device.getByRole("button", { name: "A–Z", exact: true }).click();

    // 4. Edit task on Task Editor screen via selectItem + Save Task
    await device.locator('[data-node-type="Card"]', { hasText: "Buy espresso beans" }).getByText("Buy espresso beans").click();
    await expect(device).toContainText("Task Details");
    await device.getByLabel("Title").fill("Buy dark roast beans");
    await device.getByRole("button", { name: "Save Task" }).click();
    await expect(device).toContainText("Buy dark roast beans");

    // 5. Persistence across full page reload in Preview
    await page.reload();
    await page.getByTestId("mode-preview").click();
    await expect(device).toContainText("Buy dark roast beans");

    // 6. Delete item
    const editedCard = device.locator('[data-node-type="Card"]', { hasText: "Buy dark roast beans" });
    await editedCard.locator('[data-node-type="IconButton"]').click();
    await expect(device).not.toContainText("Buy dark roast beans");

    // 7. Reset Preview restores seed items
    await page.getByTestId("preview-reset").click();
    await expect(device).toContainText("Review Material 3 tokens");
  });

  test("exports Todo & Tasks Kotlin/Compose with StateStorage, AppStateStore, DataStore/SharedPrefs toggle, and balanced .kt", async ({ page }) => {
    await page.getByRole("button", { name: "Templates" }).click();
    const todoCard = page.getByTestId("template-card-todo-app");
    await todoCard.getByRole("button", { name: "Use Template" }).click();
    await todoCard.getByRole("button", { name: "Click again to load" }).click();

    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");
    const viewer = modal.getByTestId("kotlin-code-viewer");

    await expect(modal.getByTestId("kotlin-file-StateStorage.kt")).toBeVisible();
    await expect(modal.getByTestId("kotlin-file-AppStateStore.kt")).toBeVisible();
    await expect(modal.getByTestId("kotlin-file-TasksScreen.kt")).toBeVisible();

    await modal.getByTestId("kotlin-file-StateStorage.kt").click();
    await expect(viewer).toContainText("interface StateStorage");
    await expect(viewer).toContainText("DataStoreStateStorage");

    // Switch persistence backend to SharedPreferences and verify libs.versions.toml + StateStorage update
    await modal.getByTestId("gradle-storage-select").selectOption("sharedPreferences");
    await expect(viewer).toContainText("SharedPrefsStateStorage");

    await modal.getByTestId("kotlin-file-libs.versions.toml").click();
    await expect(viewer).not.toContainText("datastore-preferences");

    await modal.getByTestId("gradle-storage-select").selectOption("datastore");
    await expect(viewer).toContainText("datastore-preferences");
  });
});
