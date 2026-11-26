import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBlankScreen, createNode } from "../src/ast/factory.ts";
import { insertNode } from "../src/ast/operations.ts";
import { evaluateVisibility } from "../src/ast/state.ts";
import { STARTER_TEMPLATES } from "../src/ast/templates.ts";
import { generateGradleProject } from "../src/codegen/gradle/index.ts";
import { verifyGradleBundle } from "../src/codegen/verifier.ts";

describe("v0.4.0: Core Components, Overlays, Adaptive NavRail & Preflight Verifier", () => {
  it("evaluates conditional visibility rules consistently", () => {
    const vals = { filterStatus: "done", agreed: true, count: 0, note: "" };
    assert.equal(evaluateVisibility({ stateKey: "agreed", operator: "truthy" }, vals), true);
    assert.equal(evaluateVisibility({ stateKey: "agreed", operator: "falsy" }, vals), false);
    assert.equal(evaluateVisibility({ stateKey: "note", operator: "truthy" }, vals), false);
    assert.equal(evaluateVisibility({ stateKey: "count", operator: "falsy" }, vals), true);
    assert.equal(
      evaluateVisibility({ stateKey: "filterStatus", operator: "equals", value: "DONE" }, vals),
      true,
    );
    assert.equal(
      evaluateVisibility({ stateKey: "filterStatus", operator: "notEquals", value: "all" }, vals),
      true,
    );
  });

  it("compiles all 5 new v0.4.0 components, overlays, typed actions, and adaptive NavigationRail cleanly", () => {
    const base = STARTER_TEMPLATES[0].build();
    let scr = createBlankScreen("Showcase Extra", "showcase_extra", { id: "scr_extra" });

    const dropdown = createNode("DropdownMenu", {
      bindings: { stateKey: "category" },
    });
    const radio = createNode("RadioGroup", {
      bindings: { stateKey: "delivery" },
    });
    const tabs = createNode("Tabs", {
      bindings: { stateKey: "activeTab" },
    });
    const dialog = createNode("AlertDialog", {
      id: "dlg_confirm",
      props: {
        title: "Delete Task?",
        message: "Confirm deletion",
        icon: "flame",
        confirmLabel: "Delete",
        dismissLabel: "Cancel",
        confirmAction: { type: "deleteItem", collectionKey: "todos", idStateKey: "editingId" },
      },
    });
    let sheet = createNode("ModalBottomSheet", {
      id: "sheet_opts",
      props: { title: "Quick Filters", dragHandle: true },
    });
    const sheetBtn = createNode("Button", {
      props: { label: "Close", variant: "text", enabled: true },
      action: { type: "dismissOverlay" },
    });
    const openBtn = createNode("Button", {
      props: { label: "Confirm Delete", variant: "filled", enabled: true },
      action: { type: "openOverlay", targetNodeId: "dlg_confirm" },
      visibleWhen: { stateKey: "showConfirm", operator: "truthy" },
    });
    const createBtn = createNode("Button", {
      props: { label: "Save Typed", variant: "tonal", enabled: true },
      action: {
        type: "createItem",
        collectionKey: "todos",
        fieldFromState: { title: "titleVar", completed: "showConfirm" },
      },
    });

    scr = insertNode(scr, scr.slots.bodyId, dropdown);
    scr = insertNode(scr, scr.slots.bodyId, radio);
    scr = insertNode(scr, scr.slots.bodyId, tabs);
    scr = insertNode(scr, scr.slots.bodyId, openBtn);
    scr = insertNode(scr, scr.slots.bodyId, createBtn);
    scr = insertNode(scr, scr.slots.bodyId, dialog);
    scr = insertNode(scr, scr.slots.bodyId, sheet);
    scr = insertNode(scr, "sheet_opts", sheetBtn);

    base.screens = [...base.screens, scr];
    base.state = {
      persistenceBackend: "datastore",
      variables: [
        { key: "category", label: "Category", type: "string", defaultValue: "work", persist: false },
        { key: "delivery", label: "Delivery", type: "string", defaultValue: "standard", persist: false },
        { key: "activeTab", label: "Tab", type: "string", defaultValue: "overview", persist: false },
        { key: "showConfirm", label: "Show Confirm", type: "boolean", defaultValue: true, persist: false },
        { key: "editingId", label: "Editing ID", type: "string", defaultValue: "", persist: false },
        { key: "titleVar", label: "Title", type: "string", defaultValue: "", persist: false },
      ],
      collections: [
        {
          key: "todos",
          label: "Todos",
          itemLabel: "Todo",
          persist: true,
          fields: [
            { key: "title", label: "Title", type: "string" },
            { key: "completed", label: "Completed", type: "boolean" },
            { key: "createdAt", label: "Created At", type: "number" },
          ],
          initialItems: [],
        },
      ],
    };

    const bundle = generateGradleProject(base);
    const report = verifyGradleBundle(base, bundle);
    assert.equal(report.ok, true, `Expected preflight pass, got: ${JSON.stringify(report.issues)}`);

    const extraKt = bundle.files.find((f) => f.shortName === "ShowcaseExtraScreen.kt")!.content;
    const navKt = bundle.files.find((f) => f.shortName === "AppNavHost.kt")!.content;

    assert.match(extraKt, /ExposedDropdownMenuBox\(/);
    assert.match(extraKt, /RadioButton\(/);
    assert.match(extraKt, /PrimaryTabRow\(/);
    assert.match(extraKt, /AlertDialog\(/);
    assert.match(extraKt, /ModalBottomSheet\(/);
    assert.match(extraKt, /Icons\.Rounded\.LocalFireDepartment/);
    assert.match(extraKt, /if \(appState\.showConfirm\)/);
    assert.match(extraKt, /activeOverlayId = "dlg_confirm"/);
    // Typed boolean mapping must NOT emit .trim() on Boolean
    assert.doesNotMatch(extraKt, /showConfirm\.trim\(\)/);
    assert.match(extraKt, /completed = appState\.showConfirm/);

    // Responsive NavigationRail in AppNavHost.kt
    assert.match(navKt, /BoxWithConstraints\(/);
    assert.match(navKt, /maxWidth >= 600\.dp/);
    assert.match(navKt, /NavigationRail\(/);
  });

  it("passes static preflight across all 5 starter templates", () => {
    for (const tpl of STARTER_TEMPLATES) {
      const proj = tpl.build();
      const bundle = generateGradleProject(proj);
      const report = verifyGradleBundle(proj, bundle);
      assert.equal(report.ok, true, `Template ${tpl.id} failed preflight: ${JSON.stringify(report.issues)}`);
      assert.equal(report.errorCount, 0);
    }
  });

  it("flags broken bindings, missing overlays, bad SDK bounds, and syntax imbalance", () => {
    const proj = STARTER_TEMPLATES.find((t) => t.id === "blank")!.build();
    const btn = createNode("Button", {
      bindings: { stateKey: "missingVar" },
      visibleWhen: { stateKey: "alsoMissing", operator: "truthy" },
      action: { type: "openOverlay", targetNodeId: "nonexistent_dialog" },
    });
    proj.screens[0] = insertNode(proj.screens[0], proj.screens[0].slots.bodyId, btn);

    const bundle = generateGradleProject(proj, { minSdk: 30, targetSdk: 35 });
    bundle.minSdk = 35;
    bundle.targetSdk = 30;
    const screenFile = bundle.files.find((f) => f.category === "screen")!;
    screenFile.content += "\nfun brokenSnippet() {\n";

    const report = verifyGradleBundle(proj, bundle);
    assert.equal(report.ok, false);
    assert.ok(report.errorCount >= 2);
    assert.ok(report.warningCount >= 3);
  });
});
