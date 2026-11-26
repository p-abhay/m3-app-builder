import { expect, test } from "@playwright/test";

test.describe("Studio Info Icon: Release Notes & Future Roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("opens Release Notes showing v0.3.0, v0.2.0 and v0.1.0 sections and switches to Future roadmap", async ({ page }) => {
    await expect(page.getByText("v0.3.0 Studio")).toBeVisible();

    const infoBtn = page.getByTestId("studio-info-button");
    await expect(infoBtn).toBeVisible();

    await infoBtn.click();

    const modal = page.getByTestId("release-notes-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("v0.3.0");

    // Default tab shows Release Notes grouped under v0.3.0, v0.2.0 and v0.1.0 headings
    const releaseTab = modal.getByRole("tab", { name: "Release Notes" });
    const futureTab = modal.getByRole("tab", { name: "Future" });
    await expect(releaseTab).toHaveAttribute("aria-selected", "true");

    await expect(modal.getByTestId("release-group-v0.3.0")).toBeVisible();
    await expect(modal.getByTestId("release-group-v0.3.0")).toContainText(/SearchBar, SegmentedButton & DataList/i);
    await expect(modal.getByTestId("release-group-v0.3.0")).toContainText(/Pluggable Android StateStorage/i);

    await expect(modal.getByTestId("release-group-v0.2.0")).toBeVisible();
    await expect(modal.getByTestId("release-group-v0.2.0")).toContainText(/Kotlin \+ Jetpack Compose/i);
    await expect(modal.getByTestId("release-group-v0.2.0")).toContainText(/Gradle Project \.zip Export/i);

    await expect(modal.getByTestId("release-group-v0.1.0")).toBeVisible();
    await expect(modal.getByTestId("release-group-v0.1.0")).toContainText(/Material 3 Expressive Theme & System Engine/i);
    await expect(modal.getByTestId("release-group-v0.1.0")).toContainText(/Isolated Interactive Preview/i);

    // Switch to Future tab -> shows upcoming 0.x -> 1.0.0 roadmap
    await futureTab.click();
    await expect(futureTab).toHaveAttribute("aria-selected", "true");
    await expect(modal.getByText(/AI Screen Co-Pilot & Design Spec Bridge/i)).toBeVisible();
    await expect(modal.getByText(/v1\.0\.0/i)).toBeVisible();

    // Close modal
    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).toBeHidden();
  });
});
