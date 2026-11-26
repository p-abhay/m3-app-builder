import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { STARTER_TEMPLATES } from "../src/ast/templates.ts";
import { generateGradleProject } from "../src/codegen/gradle/index.ts";
import { crc32, createZipArchive } from "../src/codegen/zip.ts";
import { APP_VERSION } from "../src/version.ts";

interface ParsedZipEntry {
  path: string;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  data: Uint8Array;
  text: string;
}

function parseZip(bytes: Uint8Array): ParsedZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder("utf-8");

  // Locate End of Central Directory record (0x06054b50)
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }
  assert.ok(eocdOffset >= 0, "Missing PKZIP EOCD signature");

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const cdOffset = view.getUint32(eocdOffset + 16, true);
  const entries: ParsedZipEntry[] = [];

  let cursor = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    assert.equal(view.getUint32(cursor, true), 0x02014b50, "Invalid central directory signature");
    const method = view.getUint16(cursor + 10, true);
    assert.equal(method, 0, "Expected STORE compression method");
    const expectedCrc = view.getUint32(cursor + 16, true);
    const compSize = view.getUint32(cursor + 20, true);
    const uncompSize = view.getUint32(cursor + 24, true);
    const nameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const path = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
    cursor += 46 + nameLen + extraLen + commentLen;

    assert.equal(view.getUint32(localHeaderOffset, true), 0x04034b50, `Invalid local header for ${path}`);
    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const data = bytes.subarray(dataStart, dataStart + uncompSize);

    assert.equal(compSize, uncompSize, `Size mismatch for ${path}`);
    assert.equal(crc32(data), expectedCrc, `CRC-32 mismatch for ${path}`);

    entries.push({
      path,
      crc: expectedCrc,
      compressedSize: compSize,
      uncompressedSize: uncompSize,
      data,
      text: decoder.decode(data),
    });
  }

  return entries;
}

describe("Phase 7: ZIP Archiver & Android Studio Gradle Exporter", () => {
  it("writes valid PKZIP archives with UTF-8 paths, empty entries, and accurate CRC-32", () => {
    const zipBytes = createZipArchive([
      { path: "hello/world.txt", content: "Hello Compose • M3E!" },
      { path: "empty.txt", content: "" },
    ]);

    const parsed = parseZip(zipBytes);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].path, "hello/world.txt");
    assert.equal(parsed[0].text, "Hello Compose • M3E!");
    assert.equal(parsed[1].path, "empty.txt");
    assert.equal(parsed[1].text, "");
  });

  it("packages all 4 starter templates into complete Android Studio Gradle zip archives", () => {
    for (const tpl of STARTER_TEMPLATES) {
      const project = tpl.build();
      const bundle = generateGradleProject(project);
      const entries = parseZip(bundle.createZipBytes());
      const byPath = new Map(entries.map((e) => [e.path, e.text]));

      for (const requiredPath of [
        "settings.gradle.kts",
        "build.gradle.kts",
        "gradle.properties",
        "gradle/libs.versions.toml",
        "gradle/wrapper/gradle-wrapper.properties",
        "app/build.gradle.kts",
        "app/src/main/AndroidManifest.xml",
        "app/src/main/res/values/strings.xml",
        "app/src/main/res/values/themes.xml",
        "README.md",
      ]) {
        assert.ok(byPath.has(requiredPath), `Missing ${requiredPath} in zip for ${tpl.id}`);
      }

      const appGradle = byPath.get("app/build.gradle.kts")!;
      assert.match(appGradle, /org\.jetbrains\.kotlin\.gradle\.dsl\.JvmTarget/);
      assert.match(appGradle, /compilerOptions\s*\{\s*jvmTarget\.set\(JvmTarget\.JVM_17\)/);
      assert.ok(!appGradle.includes("kotlinOptions"), `Deprecated kotlinOptions found in ${tpl.id}`);

      const wrapperProps = byPath.get("gradle/wrapper/gradle-wrapper.properties")!;
      assert.match(wrapperProps, /gradle-8\.11\.1-bin\.zip/);

      const pkgPath = bundle.packageName.replace(/\./g, "/");
      assert.ok(byPath.has(`app/src/main/java/${pkgPath}/MainActivity.kt`));
      assert.ok(byPath.has(`app/src/main/java/${pkgPath}/ui/theme/Color.kt`));
      assert.ok(byPath.has(`app/src/main/java/${pkgPath}/ui/navigation/AppNavHost.kt`));
    }
  });

  it("synchronizes packageName, minSdk/targetSdk, and XML-escaped app names across Gradle & Manifest", () => {
    const project = STARTER_TEMPLATES[3].build();
    project.name = "Fit & Pulse <Alpha>";
    const bundle = generateGradleProject(project, {
      packageName: "dev.abhay.Fitness-Pro",
      minSdk: 28,
      targetSdk: 36,
      compileSdk: 36,
    });

    assert.equal(bundle.packageName, "dev.abhay.fitness_pro");
    assert.equal(bundle.projectSlug, "fit-pulse-alpha");

    const entries = parseZip(bundle.createZipBytes());
    const byPath = new Map(entries.map((e) => [e.path, e.text]));

    const appGradle = byPath.get("app/build.gradle.kts")!;
    const stringsXml = byPath.get("app/src/main/res/values/strings.xml")!;
    const manifestXml = byPath.get("app/src/main/AndroidManifest.xml")!;
    const mainKt = byPath.get("app/src/main/java/dev/abhay/fitness_pro/MainActivity.kt")!;

    assert.match(appGradle, /namespace = "dev\.abhay\.fitness_pro"/);
    assert.match(appGradle, /applicationId = "dev\.abhay\.fitness_pro"/);
    assert.match(appGradle, /compileSdk = 36/);
    assert.match(appGradle, /minSdk = 28/);
    assert.match(appGradle, /targetSdk = 36/);
    assert.match(stringsXml, /Fit &amp; Pulse &lt;Alpha&gt;/);
    assert.match(manifestXml, /android:name="\.MainActivity"/);
    assert.match(mainKt, /^package dev\.abhay\.fitness_pro/m);
  });

  it("switches Gradle version catalog Material3 dependency between Hybrid Stable BOM and M3E Alpha", () => {
    const project = STARTER_TEMPLATES[0].build();

    const hybridToml = generateGradleProject(project, { m3Expressive: false })
      .files.find((f) => f.path === "gradle/libs.versions.toml")!.content;
    assert.match(hybridToml, /composeBom = "/);
    assert.ok(!hybridToml.includes("material3Alpha"));

    const alphaToml = generateGradleProject(project, { m3Expressive: true })
      .files.find((f) => f.path === "gradle/libs.versions.toml")!.content;
    assert.match(alphaToml, /material3Alpha = "1\.4\./);
    assert.match(alphaToml, /version\.ref = "material3Alpha"/);
  });

  it("keeps APP_VERSION synchronized with package.json SemVer release", () => {
    const pkg = JSON.parse(
      fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as { version: string };
    assert.equal(APP_VERSION, pkg.version);
    assert.match(APP_VERSION, /^0\.3\./);
  });
});
