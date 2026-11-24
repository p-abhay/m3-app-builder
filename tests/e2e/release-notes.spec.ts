import { expect, test } from "@playwright/test";

test.describe("Studio Info Icon: Release Notes & Future Roadmap", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("opens Release Notes and switches to Future tab from the i icon next to V1 Studio", async ({ page }) => {
    const infoBtn = page.getByTestId("studio-info-button");
    await expect(infoBtn).toBeVisible();

    await infoBtn.click();

    const modal = page.getByTestId("release-notes-modal");
    await expect(modal).toBeVisible();

    // Default tab shows Release Notes (current V1 features)
    const releaseTab = modal.getByRole("tab", { name: "Release Notes" });
    const futureTab = modal.getByRole("tab", { name: "Future" });
    await expect(releaseTab).toHaveAttribute("aria-selected", "true");
    await expect(modal.getByText(/Material 3 Expressive Theme & System Engine/i)).toBeVisible();
    await expect(modal.getByText(/Isolated Interactive Preview/i)).toBeVisible();

    // Switch to Future tab -> shows upcoming V2+ features
    await futureTab.click();
    await expect(futureTab).toHaveAttribute("aria-selected", "true");
    await expect(modal.getByText(/Kotlin \+ Jetpack Compose Code Generator/i)).toBeVisible();

    // Close modal
    await modal.getByRole("button", { name: "Close" }).click();
    await expect(modal).toBeHidden();
  });
});
