import fs from "node:fs";
import { expect, test } from "@playwright/test";

test.describe("Phase 7: Android Studio Gradle Project .zip Export & Package Config", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("browses Gradle & Manifest files inside Export Kotlin modal and switches M3E dependency in libs.versions.toml", async ({ page }) => {
    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");
    await expect(modal).toBeVisible();

    await expect(modal.getByTestId("kotlin-code-viewer")).toBeVisible();

    // Regression: long lines in Screen.kt must not push Copy / Download buttons outside modal bounds
    await modal.getByTestId("kotlin-file-HomeScreen.kt").click();
    const modalBox = await modal.boundingBox();
    const downloadBox = await modal.getByTestId("download-single-file").boundingBox();
    const copyBox = await modal.getByTestId("copy-kotlin-file").boundingBox();
    expect(modalBox && downloadBox && copyBox).toBeTruthy();
    expect(downloadBox!.x + downloadBox!.width).toBeLessThanOrEqual(modalBox!.x + modalBox!.width);
    expect(copyBox!.x + copyBox!.width).toBeLessThanOrEqual(modalBox!.x + modalBox!.width);
    expect(downloadBox!.x).toBeGreaterThanOrEqual(modalBox!.x);

    for (const key of [
      "settings.gradle.kts",
      "app/build.gradle.kts",
      "libs.versions.toml",
      "AndroidManifest.xml",
      "strings.xml",
    ]) {
      await expect(modal.getByTestId(`kotlin-file-${key}`)).toBeVisible();
    }

    await modal.getByTestId("kotlin-file-app/build.gradle.kts").click();
    const viewer = modal.getByTestId("kotlin-code-viewer");
    await expect(viewer).toContainText('applicationId = "com.example.m3showcase"');
    await expect(viewer).toContainText("minSdk = 26");
    await expect(viewer).toContainText("targetSdk = 35");

    // Inspect libs.versions.toml and toggle M3 Expressive Alpha APIs
    await modal.getByTestId("kotlin-file-libs.versions.toml").click();
    await expect(viewer).toContainText("composeBom");
    await expect(viewer).not.toContainText("material3Alpha");

    await modal.getByTestId("compose-m3e-toggle").check();
    await expect(viewer).toContainText("material3Alpha");
  });

  test("configures Android packageName, minSdk, and targetSdk live and persists packageName", async ({ page }) => {
    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");

    const pkgInput = modal.getByTestId("gradle-package-input");
    await pkgInput.fill("com.abhay.pulsestudio");

    await modal.getByTestId("gradle-minsdk-select").selectOption("28");
    await modal.getByTestId("gradle-targetsdk-select").selectOption("36");

    await modal.getByTestId("kotlin-file-app/build.gradle.kts").click();
    const viewer = modal.getByTestId("kotlin-code-viewer");
    await expect(viewer).toContainText('namespace = "com.abhay.pulsestudio"');
    await expect(viewer).toContainText("minSdk = 28");
    await expect(viewer).toContainText("targetSdk = 36");

    await modal.getByTestId("kotlin-file-MainActivity.kt").click();
    await expect(viewer).toContainText("package com.abhay.pulsestudio");

    // Close and reload: packageName persisted to localStorage project AST
    await modal.getByRole("button", { name: "Done" }).click();
    await page.reload();

    await page.getByTestId("export-kotlin-button").click();
    await expect(modal.getByTestId("gradle-package-input")).toHaveValue("com.abhay.pulsestudio");
  });

  test("downloads a valid Android Studio Gradle .zip archive containing Kotlin & Gradle files", async ({ page }) => {
    await page.getByTestId("export-kotlin-button").click();
    const modal = page.getByTestId("compose-export-modal");

    const downloadPromise = page.waitForEvent("download");
    await modal.getByTestId("download-gradle-zip").click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("material-showcase-android-studio.zip");

    const savedPath = await download.path();
    expect(savedPath).toBeTruthy();
    const bytes = fs.readFileSync(savedPath!);

    // Standard PKZIP Local File Header signature PK\x03\x04
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);

    const archiveText = bytes.toString("utf8");
    expect(archiveText).toContain("app/build.gradle.kts");
    expect(archiveText).toContain('applicationId = "com.example.m3showcase"');
    expect(archiveText).toContain("package com.example.m3showcase.ui.screens");
  });
});
