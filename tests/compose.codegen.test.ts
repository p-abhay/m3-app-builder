import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBlankScreen, createNode, uniformSpacing } from "../src/ast/factory.ts";
import { insertNode, setSlotNode } from "../src/ast/operations.ts";
import { STARTER_TEMPLATES } from "../src/ast/templates.ts";
import type { ComponentType } from "../src/ast/types.ts";
import { generateComposeProject } from "../src/codegen/compose/index.ts";

function countChar(str: string, ch: string): number {
  let n = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ch) n++;
  }
  return n;
}

describe("Phase 6: Kotlin + Jetpack Compose AST Compiler", () => {
  it("generates complete, balanced Kotlin files for all 4 starter templates", () => {
    for (const tpl of STARTER_TEMPLATES) {
      const project = tpl.build();
      const result = generateComposeProject(project);

      assert.equal(result.packageName, project.packageName);
      const shortNames = result.files.map((f) => f.shortName);
      for (const required of [
        "Color.kt",
        "Type.kt",
        "Shape.kt",
        "Theme.kt",
        "AppNavHost.kt",
        "MainActivity.kt",
      ]) {
        assert.ok(shortNames.includes(required), `Missing ${required} in template ${tpl.id}`);
      }

      // Every screen produces a *Screen.kt composable file
      assert.equal(
        result.files.filter((f) => f.category === "screen").length,
        project.screens.length,
        `Screen file count mismatch for ${tpl.id}`,
      );

      for (const file of result.files) {
        assert.ok(
          file.content.startsWith(`package ${result.packageName}`),
          `${file.shortName} must declare package`,
        );
        assert.ok(!file.content.includes("undefined"), `${file.shortName} contains 'undefined'`);
        assert.ok(!file.content.includes("NaN"), `${file.shortName} contains 'NaN'`);
        assert.equal(
          countChar(file.content, "{"),
          countChar(file.content, "}"),
          `Unbalanced braces in ${file.shortName} (${tpl.id})`,
        );
      }
    }
  });

  it("maps M3 theme seed overrides, shape scales, typography, and dynamic color flags", () => {
    const project = STARTER_TEMPLATES[3].build();
    project.name = "My Cool App";
    project.packageName = "dev.abhay.Showcase-App";
    project.theme.customOverrides = { primary: "#123456" };
    project.theme.shapeScale = "full";
    project.theme.useDynamicColor = true;
    project.theme.fontScale = 1.15;
    project.theme.emphasizedType = true;

    const result = generateComposeProject(project);
    assert.equal(result.packageName, "dev.abhay.showcase_app");

    const colorKt = result.files.find((f) => f.shortName === "Color.kt")!.content;
    const shapeKt = result.files.find((f) => f.shortName === "Shape.kt")!.content;
    const typeKt = result.files.find((f) => f.shortName === "Type.kt")!.content;
    const themeKt = result.files.find((f) => f.shortName === "Theme.kt")!.content;

    assert.match(colorKt, /Color\(0xFF123456\)/);
    assert.match(colorKt, /surfaceContainerHighest/i);
    assert.match(shapeKt, /RoundedCornerShape\(24\.dp\)/); // medium = 12 * 1.5 = 18dp; large = 16 * 1.5 = 24dp
    assert.match(typeKt, /65\.6\.sp|65\.5\.sp|66\.sp/); // displayLarge 57 * 1.15 = 65.6sp
    assert.match(typeKt, /FontWeight\.SemiBold|FontWeight\.Bold/);
    assert.match(themeKt, /dynamicLightColorScheme/);
    assert.match(themeKt, /dynamicDarkColorScheme/);
  });

  it("compiles all 22 component types, escapes Kotlin strings, and toggles Hybrid vs M3E Alpha", () => {
    const base = STARTER_TEMPLATES[3].build();
    let screen = createBlankScreen("Catalog", "catalog", { id: "scr_cat" });
    screen = setSlotNode(
      screen,
      "fabId",
      createNode("FloatingActionButton", {
        props: { variant: "extended", icon: "rocket_launch", label: "Launch $99", colorRole: "primaryContainer" },
        action: { type: "showSnackbar", message: 'Saved "Draft" $1' },
      }),
    );

    const allTypes: ComponentType[] = [
      "Column",
      "Row",
      "Box",
      "Card",
      "Text",
      "Icon",
      "Image",
      "Spacer",
      "Divider",
      "Badge",
      "Button",
      "IconButton",
      "TextField",
      "Switch",
      "Checkbox",
      "Slider",
      "Chip",
      "ListItem",
      "LoadingIndicator",
      "ProgressBar",
    ];

    for (const type of allTypes) {
      const node = createNode(type);
      if (type === "Text") {
        node.props = {
          text: 'Price: $50 "Net"',
          role: "titleMedium",
          colorToken: "onSurface",
          align: "left",
        };
      }
      if (type === "ProgressBar") {
        node.props = { variant: "linear", determinate: true, value: 65, wavy: true };
      }
      if (type === "Row") {
        node.props = {
          gap: 4,
          verticalAlignment: "center",
          horizontalArrangement: "start",
          wrap: false,
          connected: true,
        };
      }
      if (type === "Button") {
        node.style = { ...node.style, width: "fill", padding: uniformSpacing(8) };
        node.action = { type: "openUrl", url: "https://developer.android.com" };
      }
      screen = insertNode(screen, screen.slots.bodyId, node);
    }

    base.screens = [screen];
    base.initialScreenId = screen.id;

    // 1. Default Hybrid (Stable M3 fallback)
    const stableResult = generateComposeProject(base, { m3Expressive: false });
    const stableScreen = stableResult.files.find((f) => f.shortName === "CatalogScreen.kt")!.content;

    assert.match(stableScreen, /Price: \\\$50 \\"Net\\"/);
    assert.match(stableScreen, /Launch \\\$99/);
    assert.match(stableScreen, /ExtendedFloatingActionButton/);
    assert.match(stableScreen, /CircularProgressIndicator/);
    assert.match(stableScreen, /LinearProgressIndicator/);
    assert.ok(!stableScreen.includes("ExperimentalMaterial3ExpressiveApi"));
    assert.ok(!stableScreen.includes("LinearWavyProgressIndicator"));
    assert.match(stableScreen, /Icons\.Rounded\.RocketLaunch/);
    assert.match(stableScreen, /progress = \{ 0\.65f \}/);
    assert.match(stableScreen, /uriHandler\.openUri\(/);

    // Nested scrollable Column inside body must NOT emit duplicate .verticalScroll() without explicit height
    assert.equal(
      (stableScreen.match(/\.verticalScroll\(rememberScrollState\(\)\)/g) ?? []).length,
      1,
      "Expected only root Scaffold body Column to have verticalScroll",
    );

    // 2. M3 Expressive Alpha Opt-in
    const m3eResult = generateComposeProject(base, { m3Expressive: true });
    const m3eScreen = m3eResult.files.find((f) => f.shortName === "CatalogScreen.kt")!.content;
    const m3eTheme = m3eResult.files.find((f) => f.shortName === "Theme.kt")!.content;

    assert.match(m3eScreen, /ExperimentalMaterial3ExpressiveApi/);
    assert.match(m3eScreen, /LoadingIndicator\(/);
    assert.match(m3eScreen, /LinearWavyProgressIndicator\(/);
    assert.match(m3eTheme, /MaterialExpressiveTheme|MotionScheme\.expressive/);
  });

  it("emits Android-compilable FlowRow, Row weights, SpaceBetween Switch, normalized progress, and AutoMirrored icons", () => {
    const showcase = STARTER_TEMPLATES[0].build();
    const result = generateComposeProject(showcase);

    const homeKt = result.files.find((f) => f.shortName === "HomeScreen.kt")!.content;
    const exploreKt = result.files.find((f) => f.shortName === "ExploreScreen.kt")!.content;
    const settingsKt = result.files.find((f) => f.shortName === "SettingsScreen.kt")!.content;

    // 1. FlowRow must not use verticalAlignment; uses verticalArrangement + child Modifier.align
    assert.doesNotMatch(exploreKt, /FlowRow\([^\n]*verticalAlignment\s*=/, "FlowRow must not receive verticalAlignment");
    assert.match(exploreKt, /FlowRow\([^\n]*verticalArrangement = Arrangement\.spacedBy\(8\.dp\)/);
    assert.match(exploreKt, /Modifier\.align\(Alignment\.CenterVertically\)/);

    // 2. ProgressBar 72% normalizes cleanly to 0.72f
    assert.match(exploreKt, /LinearProgressIndicator\(progress = \{ 0\.72f \}/);

    // 3. Multi-child Row fill children use .weight(1f) instead of .fillMaxWidth()
    assert.match(homeKt, /Button\([\s\S]*?modifier = Modifier\.weight\(1f\)/);
    assert.match(homeKt, /FilledTonalButton\([\s\S]*?modifier = Modifier\.weight\(1f\)/);
    assert.match(exploreKt, /Column\(modifier = Modifier\.weight\(1f\)/);

    // 4. Settings ArrowBack uses AutoMirrored icon without deprecation warning
    assert.match(settingsKt, /androidx\.compose\.material\.icons\.automirrored\.rounded\.\*/);
    assert.match(settingsKt, /Icons\.AutoMirrored\.Rounded\.ArrowBack/);
    assert.ok(!settingsKt.includes("Icons.Rounded.ArrowBack"));

    // 5. Switch row includes fillMaxWidth so SpaceBetween separates label & switch
    const blank = STARTER_TEMPLATES[3].build();
    blank.screens[0] = insertNode(blank.screens[0], blank.screens[0].slots.bodyId, createNode("Switch"));
    const switchKt = generateComposeProject(blank).files.find((f) => f.category === "screen")!.content;
    assert.match(switchKt, /Row\(modifier = Modifier\.fillMaxWidth\(\), verticalAlignment = Alignment\.CenterVertically, horizontalArrangement = Arrangement\.SpaceBetween\)/);
  });

  it("reports diagnostic warnings for broken navigation targets without failing codegen", () => {
    const project = STARTER_TEMPLATES[3].build();
    const home = project.screens[0];
    const btn = createNode("Button", {
      props: { label: "Broken Link", variant: "filled", enabled: true },
      action: { type: "navigate", targetScreenId: "scr_does_not_exist", transition: "slide" },
    });
    project.screens[0] = insertNode(home, home.slots.bodyId, btn);

    const result = generateComposeProject(project);
    assert.ok(result.diagnostics.some((d) => d.severity === "warning" && /missing/i.test(d.message)));
    assert.ok(result.files.length >= 7);
  });
});
