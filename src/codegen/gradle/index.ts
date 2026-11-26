import type { AppProject, PersistenceBackend } from "../../ast/types.ts";
import {
  generateComposeProject,
  type ComposeCodegenOptions,
  type ComposeCodegenResult,
  type GeneratedKotlinFile,
} from "../compose/index.ts";
import { kotlinString, sanitizePackageName, toPascalCase } from "../compose/utils.ts";
import { createZipArchive } from "../zip.ts";

export interface GradleProjectOptions extends ComposeCodegenOptions {
  packageName?: string;
  minSdk?: number;
  targetSdk?: number;
  compileSdk?: number;
  persistenceBackend?: PersistenceBackend;
}

export type GradleFileCategory =
  | "gradle"
  | "manifest"
  | "resource"
  | GeneratedKotlinFile["category"];

export interface GradleExportFile {
  path: string;
  shortName: string;
  category: GradleFileCategory;
  content: string;
}

export interface GradleProjectBundle {
  projectSlug: string;
  packageName: string;
  minSdk: number;
  targetSdk: number;
  compileSdk: number;
  compose: ComposeCodegenResult;
  files: GradleExportFile[];
  createZipBytes: () => Uint8Array;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slugifyProject(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "m3-app";
}

function buildVersionCatalog(m3Expressive: boolean, useDataStore: boolean): string {
  return [
    "[versions]",
    'agp = "8.7.3"',
    'kotlin = "2.1.0"',
    'coreKtx = "1.15.0"',
    'activityCompose = "1.9.3"',
    'composeBom = "2024.12.01"',
    'navigationCompose = "2.8.5"',
    'coroutines = "1.9.0"',
    ...(useDataStore ? ['datastorePreferences = "1.1.1"'] : []),
    ...(m3Expressive ? ['material3Alpha = "1.4.0-alpha08"'] : []),
    "",
    "[libraries]",
    'androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }',
    'androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }',
    'androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }',
    'androidx-ui = { group = "androidx.compose.ui", name = "ui" }',
    'androidx-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }',
    'androidx-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }',
    m3Expressive
      ? 'androidx-material3 = { group = "androidx.compose.material3", name = "material3", version.ref = "material3Alpha" }'
      : 'androidx-material3 = { group = "androidx.compose.material3", name = "material3" }',
    'androidx-material-icons-extended = { group = "androidx.compose.material", name = "material-icons-extended" }',
    'androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }',
    'kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }',
    ...(useDataStore
      ? ['androidx-datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastorePreferences" }']
      : []),
    "",
    "[plugins]",
    'android-application = { id = "com.android.application", version.ref = "agp" }',
    'kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }',
    'kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }',
    "",
  ].join("\n");
}

function buildAppGradle(
  pkg: string,
  minSdk: number,
  targetSdk: number,
  compileSdk: number,
  useDataStore: boolean,
): string {
  return [
    "import org.jetbrains.kotlin.gradle.dsl.JvmTarget",
    "",
    "plugins {",
    "    alias(libs.plugins.android.application)",
    "    alias(libs.plugins.kotlin.android)",
    "    alias(libs.plugins.kotlin.compose)",
    "}",
    "",
    "android {",
    `    namespace = ${kotlinString(pkg)}`,
    `    compileSdk = ${compileSdk}`,
    "",
    "    defaultConfig {",
    `        applicationId = ${kotlinString(pkg)}`,
    `        minSdk = ${minSdk}`,
    `        targetSdk = ${targetSdk}`,
    "        versionCode = 1",
    '        versionName = "1.0"',
    "    }",
    "",
    "    buildTypes {",
    "        release {",
    "            isMinifyEnabled = false",
    "            proguardFiles(",
    '                getDefaultProguardFile("proguard-android-optimize.txt"),',
    '                "proguard-rules.pro",',
    "            )",
    "        }",
    "    }",
    "",
    "    compileOptions {",
    "        sourceCompatibility = JavaVersion.VERSION_17",
    "        targetCompatibility = JavaVersion.VERSION_17",
    "    }",
    "    buildFeatures {",
    "        compose = true",
    "    }",
    "}",
    "",
    "kotlin {",
    "    compilerOptions {",
    "        jvmTarget.set(JvmTarget.JVM_17)",
    "    }",
    "}",
    "",
    "dependencies {",
    "    implementation(libs.androidx.core.ktx)",
    "    implementation(libs.androidx.activity.compose)",
    "    implementation(platform(libs.androidx.compose.bom))",
    "    implementation(libs.androidx.ui)",
    "    implementation(libs.androidx.ui.graphics)",
    "    implementation(libs.androidx.ui.tooling.preview)",
    "    implementation(libs.androidx.material3)",
    "    implementation(libs.androidx.material.icons.extended)",
    "    implementation(libs.androidx.navigation.compose)",
    "    implementation(libs.kotlinx.coroutines.android)",
    ...(useDataStore ? ["    implementation(libs.androidx.datastore.preferences)"] : []),
    "}",
    "",
  ].join("\n");
}

function buildSettingsGradle(appName: string): string {
  return [
    "pluginManagement {",
    "    repositories {",
    "        google()",
    "        mavenCentral()",
    "        gradlePluginPortal()",
    "    }",
    "}",
    "dependencyResolutionManagement {",
    "    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)",
    "    repositories {",
    "        google()",
    "        mavenCentral()",
    "    }",
    "}",
    "",
    `rootProject.name = ${kotlinString(appName.trim() || "M3App")}`,
    'include(":app")',
    "",
  ].join("\n");
}

function buildRootGradle(): string {
  return [
    "// Top-level build file where you can add configuration options common to all sub-projects/modules.",
    "plugins {",
    "    alias(libs.plugins.android.application) apply false",
    "    alias(libs.plugins.kotlin.android) apply false",
    "    alias(libs.plugins.kotlin.compose) apply false",
    "}",
    "",
  ].join("\n");
}

function buildManifest(themeStyleName: string): string {
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
    "",
    '    <uses-permission android:name="android.permission.INTERNET" />',
    "",
    "    <application",
    '        android:allowBackup="true"',
    '        android:label="@string/app_name"',
    '        android:supportsRtl="true"',
    `        android:theme="@style/${themeStyleName}">`,
    "        <activity",
    '            android:name=".MainActivity"',
    '            android:exported="true"',
    `            android:theme="@style/${themeStyleName}">`,
    "            <intent-filter>",
    '                <action android:name="android.intent.action.MAIN" />',
    '                <category android:name="android.intent.category.LAUNCHER" />',
    "            </intent-filter>",
    "        </activity>",
    "    </application>",
    "</manifest>",
    "",
  ].join("\n");
}

function buildAndroidReadme(
  appName: string,
  pkg: string,
  minSdk: number,
  targetSdk: number,
  m3Expressive: boolean,
): string {
  return [
    `# ${appName}`,
    "",
    "Generated by **M3 App Builder** (Kotlin + Jetpack Compose).",
    "",
    `- **Package / Application ID**: \`${pkg}\``,
    `- **SDK**: \`minSdk ${minSdk}\` / \`targetSdk ${targetSdk}\``,
    `- **Material 3 Mode**: ${
      m3Expressive ? "M3 Expressive Alpha (`material3 1.4.0-alpha08`)" : "Hybrid Stable Material 3 (Compose BOM)"
    }`,
    "",
    "## Opening in Android Studio",
    "1. Unzip this archive into a workspace folder.",
    "2. Open the root folder (`settings.gradle.kts`) in **Android Studio Ladybug / Meerkat** or newer.",
    "3. Let Gradle sync (`gradle/libs.versions.toml` + `gradle/wrapper/gradle-wrapper.properties`) and click **Run**.",
    "",
    "## Building from CLI",
    "If building outside Android Studio without pre-bundled wrapper binaries, run once with Gradle installed:",
    "```bash",
    "gradle wrapper --gradle-version 8.11.1",
    "./gradlew assembleDebug",
    "```",
    "",
  ].join("\n");
}

/**
 * Generate a complete Android Studio Gradle project (`.kts`, Version Catalog, Manifest, XML resources,
 * README, and all compiled Kotlin + Jetpack Compose files) ready to download as a `.zip` archive.
 */
export function generateGradleProject(
  project: AppProject,
  options: GradleProjectOptions = {},
): GradleProjectBundle {
  const effectivePackage = sanitizePackageName(options.packageName ?? project.packageName);
  const minSdk = Math.max(21, Math.min(35, options.minSdk ?? 26));
  const targetSdk = Math.max(minSdk, Math.min(36, options.targetSdk ?? 35));
  const compileSdk = Math.max(targetSdk, options.compileSdk ?? 35);
  const m3Expressive = Boolean(options.m3Expressive);
  const hasAppState = Boolean(
    project.state && (project.state.variables.length > 0 || project.state.collections.length > 0),
  );
  const persistenceBackend: PersistenceBackend =
    options.persistenceBackend ?? project.state?.persistenceBackend ?? "datastore";
  const useDataStore = hasAppState && persistenceBackend === "datastore";

  const projectForCompose: AppProject = {
    ...project,
    packageName: effectivePackage,
  };
  const compose = generateComposeProject(projectForCompose, {
    m3Expressive,
    persistenceBackend,
  });

  const appPascal = toPascalCase(project.name, "M3App");
  const themeStyleName = `Theme.${appPascal}`;
  const projectSlug = slugifyProject(project.name);

  const scaffoldFiles: GradleExportFile[] = [
    {
      path: "settings.gradle.kts",
      shortName: "settings.gradle.kts",
      category: "gradle",
      content: buildSettingsGradle(project.name),
    },
    {
      path: "build.gradle.kts",
      shortName: "build.gradle.kts",
      category: "gradle",
      content: buildRootGradle(),
    },
    {
      path: "gradle.properties",
      shortName: "gradle.properties",
      category: "gradle",
      content: [
        "org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8",
        "android.useAndroidX=true",
        "kotlin.code.style=official",
        "android.nonTransitiveRClass=true",
        "",
      ].join("\n"),
    },
    {
      path: "gradle/libs.versions.toml",
      shortName: "libs.versions.toml",
      category: "gradle",
      content: buildVersionCatalog(m3Expressive, useDataStore),
    },
    {
      path: "gradle/wrapper/gradle-wrapper.properties",
      shortName: "gradle-wrapper.properties",
      category: "gradle",
      content: [
        "distributionBase=GRADLE_USER_HOME",
        "distributionPath=wrapper/dists",
        "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-bin.zip",
        "networkTimeout=10000",
        "validateDistributionUrl=true",
        "zipStoreBase=GRADLE_USER_HOME",
        "zipStorePath=wrapper/dists",
        "",
      ].join("\n"),
    },
    {
      path: "app/build.gradle.kts",
      shortName: "app/build.gradle.kts",
      category: "gradle",
      content: buildAppGradle(compose.packageName, minSdk, targetSdk, compileSdk, useDataStore),
    },
    {
      path: "app/proguard-rules.pro",
      shortName: "proguard-rules.pro",
      category: "gradle",
      content: "# Add project specific ProGuard rules here.\n",
    },
    {
      path: "app/src/main/AndroidManifest.xml",
      shortName: "AndroidManifest.xml",
      category: "manifest",
      content: buildManifest(themeStyleName),
    },
    {
      path: "app/src/main/res/values/strings.xml",
      shortName: "strings.xml",
      category: "resource",
      content: [
        '<?xml version="1.0" encoding="utf-8"?>',
        "<resources>",
        `    <string name="app_name">${escapeXml(project.name)}</string>`,
        "</resources>",
        "",
      ].join("\n"),
    },
    {
      path: "app/src/main/res/values/themes.xml",
      shortName: "themes.xml",
      category: "resource",
      content: [
        '<?xml version="1.0" encoding="utf-8"?>',
        "<resources>",
        `    <style name="${themeStyleName}" parent="android:Theme.Material.Light.NoActionBar" />`,
        "</resources>",
        "",
      ].join("\n"),
    },
    {
      path: "README.md",
      shortName: "README.md",
      category: "gradle",
      content: buildAndroidReadme(
        project.name,
        compose.packageName,
        minSdk,
        targetSdk,
        m3Expressive,
      ),
    },
  ];

  const allFiles: GradleExportFile[] = [...compose.files, ...scaffoldFiles];

  return {
    projectSlug,
    packageName: compose.packageName,
    minSdk,
    targetSdk,
    compileSdk,
    compose,
    files: allFiles,
    createZipBytes: () =>
      createZipArchive(allFiles.map((f) => ({ path: f.path, content: f.content }))),
  };
}
