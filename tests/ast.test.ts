import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createBlankScreen, createNode } from "../src/ast/factory.ts";
import {
  duplicateNode,
  duplicateScreenNode,
  insertNode,
  moveNode,
  removeNode,
  removeScreenFromProject,
  setSlotNode,
} from "../src/ast/operations.ts";
import { STARTER_TEMPLATES } from "../src/ast/templates.ts";
import { validateProject } from "../src/ast/validator.ts";

describe("Android AST schema & templates", () => {
  it("builds and validates all starter templates", () => {
    assert.ok(STARTER_TEMPLATES.length >= 4);
    for (const tpl of STARTER_TEMPLATES) {
      const proj = tpl.build();
      const validated = validateProject(JSON.parse(JSON.stringify(proj)));
      assert.ok(validated, `Template ${tpl.id} failed validation`);
      assert.equal(validated.name, proj.name);
      assert.ok(validated.screens.some((s) => s.id === validated.initialScreenId));
    }
  });

  it("rejects invalid or corrupted project JSON", () => {
    assert.equal(validateProject(null), null);
    assert.equal(validateProject({ schemaVersion: 2 }), null);
    assert.equal(validateProject({ schemaVersion: 1, id: "p1", name: "Bad", screens: [] }), null);
    assert.equal(
      validateProject({
        schemaVersion: 1,
        id: "p1",
        name: "BadScreen",
        screens: [
          {
            id: "s1",
            name: "Home",
            route: "home",
            showBottomNav: true,
            slots: { bodyId: "missing_body" },
            nodes: {},
          },
        ],
      }),
      null,
    );
  });
});

describe("AST node tree operations", () => {
  it("inserts nodes into containers and rejects leaf parents", () => {
    let scr = createBlankScreen("Test", "test");
    const btn = createNode("Button", { id: "btn_1", props: { label: "Go" } });
    scr = insertNode(scr, scr.slots.bodyId, btn);

    assert.deepEqual(scr.nodes[scr.slots.bodyId].childIds, ["btn_1"]);
    assert.equal(scr.nodes["btn_1"].parentId, scr.slots.bodyId);

    const txt = createNode("Text", { id: "txt_1" });
    const unchanged = insertNode(scr, "btn_1", txt);
    assert.equal(unchanged, scr);
    assert.equal(unchanged.nodes["txt_1"], undefined);
  });

  it("moves nodes within same container and across containers without cycles", () => {
    let scr = createBlankScreen("MoveTest", "move");
    const b1 = createNode("Button", { id: "b1" });
    const b2 = createNode("Button", { id: "b2" });
    const card = createNode("Card", { id: "card_1" });
    const innerTxt = createNode("Text", { id: "inner_txt" });

    scr = insertNode(scr, scr.slots.bodyId, b1);
    scr = insertNode(scr, scr.slots.bodyId, b2);
    scr = insertNode(scr, scr.slots.bodyId, card);
    scr = insertNode(scr, "card_1", innerTxt);

    // Move b1 to index 2 (after b2, before card_1)
    scr = moveNode(scr, "b1", scr.slots.bodyId, 2);
    assert.deepEqual(scr.nodes[scr.slots.bodyId].childIds, ["b2", "b1", "card_1"]);

    // Move b2 into card_1
    scr = moveNode(scr, "b2", "card_1", 0);
    assert.deepEqual(scr.nodes["card_1"].childIds, ["b2", "inner_txt"]);
    assert.equal(scr.nodes["b2"].parentId, "card_1");
    assert.deepEqual(scr.nodes[scr.slots.bodyId].childIds, ["b1", "card_1"]);

    // Prevent moving card_1 inside itself
    const cyclic = moveNode(scr, "card_1", "card_1", 0);
    assert.equal(cyclic, scr);

    // Prevent moving card_1 inside a nested Box inside card_1
    const nestedBox = createNode("Box", { id: "nested_box" });
    scr = insertNode(scr, "card_1", nestedBox);
    const deepCyclic = moveNode(scr, "card_1", "nested_box", 0);
    assert.equal(deepCyclic, scr);
  });

  it("duplicates subtrees with fresh IDs", () => {
    let scr = createBlankScreen("Dup", "dup");
    const card = createNode("Card", { id: "c1" });
    const child = createNode("Text", { id: "t1", props: { text: "Hello" } });
    scr = insertNode(scr, scr.slots.bodyId, card);
    scr = insertNode(scr, "c1", child);

    const res = duplicateNode(scr, "c1");
    assert.ok(res.newNodeId);
    assert.notEqual(res.newNodeId, "c1");
    assert.equal(res.screen.nodes[res.screen.slots.bodyId].childIds.length, 2);

    const clonedCard = res.screen.nodes[res.newNodeId!];
    assert.equal(clonedCard.childIds.length, 1);
    const clonedChildId = clonedCard.childIds[0];
    assert.notEqual(clonedChildId, "t1");
    assert.equal(res.screen.nodes[clonedChildId].parentId, res.newNodeId);
    assert.equal((res.screen.nodes[clonedChildId].props as { text: string }).text, "Hello");
  });

  it("removes subtrees cleanly and protects bodyId", () => {
    let scr = createBlankScreen("Del", "del");
    const card = createNode("Card", { id: "c1" });
    const child = createNode("Text", { id: "t1" });
    scr = insertNode(scr, scr.slots.bodyId, card);
    scr = insertNode(scr, "c1", child);

    // Body root cannot be removed
    assert.equal(removeNode(scr, scr.slots.bodyId), scr);

    scr = removeNode(scr, "c1");
    assert.equal(scr.nodes["c1"], undefined);
    assert.equal(scr.nodes["t1"], undefined);
    assert.deepEqual(scr.nodes[scr.slots.bodyId].childIds, []);
  });

  it("replaces and clears Scaffold slots cleanly without orphans", () => {
    let scr = createBlankScreen("Slots", "slots");
    const oldTopBarId = scr.slots.topBarId!;
    assert.ok(scr.nodes[oldTopBarId]);

    const newFab = createNode("FloatingActionButton", { id: "fab_1" });
    scr = setSlotNode(scr, "fabId", newFab);
    assert.equal(scr.slots.fabId, "fab_1");
    assert.ok(scr.nodes["fab_1"]);

    // Clear topBar
    scr = setSlotNode(scr, "topBarId", null);
    assert.equal(scr.slots.topBarId, undefined);
    assert.equal(scr.nodes[oldTopBarId], undefined);
  });
});

describe("Screen and project operations", () => {
  it("duplicates and removes screens while preserving nav integrity", () => {
    const proj = STARTER_TEMPLATES[0].build();
    const first = proj.screens[0];
    const copy = duplicateScreenNode(
      first,
      proj.screens.map((s) => s.name),
    );
    assert.notEqual(copy.id, first.id);
    assert.notEqual(copy.slots.bodyId, first.slots.bodyId);
    assert.ok(copy.nodes[copy.slots.bodyId]);

    const exploreId = proj.screens[1].id;
    const afterRemove = removeScreenFromProject(proj, exploreId);
    assert.equal(afterRemove.screens.length, proj.screens.length - 1);
    assert.ok(
      afterRemove.bottomNav.destinations.every((d) => d.targetScreenId !== exploreId),
    );

    // Deleting the last screen is blocked
    const blank = STARTER_TEMPLATES[3].build();
    assert.equal(removeScreenFromProject(blank, blank.screens[0].id), blank);
  });
});
