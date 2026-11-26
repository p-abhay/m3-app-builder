import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { queryCollection, resolveTemplateString } from "../src/ast/state.ts";
import { STARTER_TEMPLATES } from "../src/ast/templates.ts";
import { validateProject } from "../src/ast/validator.ts";
import { generateComposeProject } from "../src/codegen/compose/index.ts";
import { generateGradleProject } from "../src/codegen/gradle/index.ts";

function countBraces(src: string): [number, number] {
  let open = 0;
  let close = 0;
  for (const ch of src) {
    if (ch === "{") open++;
    else if (ch === "}") close++;
  }
  return [open, close];
}

describe("v0.3.0: State Variables, Collections, Search/Sort Query & Persistence", () => {
  it("filters and sorts collection records deterministically for search, status, and priority", () => {
    const sample = [
      { id: "1", title: "Buy Milk", notes: "Almond milk", completed: false, priority: "low", createdAt: 100 },
      { id: "2", title: "Ship Release", notes: "Run PlayWright E2E", completed: true, priority: "high", createdAt: 200 },
      { id: "3", title: "Add SearchBar", notes: "M3 pill input", completed: false, priority: "high", createdAt: 300 },
    ];

    // Search across title + notes (case-insensitive)
    assert.deepEqual(
      queryCollection(sample, {
        searchQuery: "playwright",
        searchFields: ["title", "notes"],
      }).map((x) => x.id),
      ["2"],
    );

    // Filter active vs done + newest sort
    assert.deepEqual(
      queryCollection(sample, {
        filterField: "completed",
        filterValue: "active",
        sortBy: "newest",
      }).map((x) => x.id),
      ["3", "1"],
    );

    assert.deepEqual(
      queryCollection(sample, {
        filterField: "completed",
        filterValue: "done",
      }).map((x) => x.id),
      ["2"],
    );

    // Title ascending A-Z
    assert.deepEqual(
      queryCollection(sample, { sortBy: "titleAsc" }).map((x) => x.id),
      ["3", "1", "2"],
    );

    // Priority order (high first, newest tiebreaker)
    assert.deepEqual(
      queryCollection(sample, { sortBy: "priority" }).map((x) => x.id),
      ["3", "2", "1"],
    );
  });

  it("interpolates item, state, and collection count template expressions safely", () => {
    const out = resolveTemplateString(
      "Task: {{item.title}} • Filter={{state.filterStatus}} • Total={{count.todos}}",
      { filterStatus: "active" },
      { todos: [{ id: "1" }, { id: "2" }] },
      { id: "1", title: "Review PR" },
    );
    assert.equal(out, "Task: Review PR • Filter=active • Total=2");
  });

  it("includes a valid Todo & Tasks template and preserves state/collections through validateProject", () => {
    const todoTpl = STARTER_TEMPLATES.find((t) => t.id === "todo-app");
    assert.ok(todoTpl, "Expected 'todo-app' starter template in STARTER_TEMPLATES");

    const project = todoTpl.build();
    const roundTripped = validateProject(JSON.parse(JSON.stringify(project)));
    assert.ok(roundTripped, "Todo template failed validateProject");
    assert.ok(roundTripped.state);
    assert.ok(roundTripped.state.collections.some((c) => c.key === "todos"));
    assert.ok(roundTripped.state.variables.some((v) => v.key === "searchQuery"));
    assert.ok(roundTripped.state.variables.some((v) => v.key === "filterStatus"));
    assert.ok(roundTripped.state.variables.some((v) => v.key === "sortOrder"));
  });

  it("generates pluggable StateStorage (DataStore & SharedPreferences), AppStateStore, SearchBar, SegmentedButton & CRUD Kotlin", () => {
    const project = STARTER_TEMPLATES.find((t) => t.id === "todo-app")!.build();

    // 1. Default DataStore backend
    const composeRes = generateComposeProject(project);
    const shortNames = composeRes.files.map((f) => f.shortName);
    assert.ok(shortNames.includes("StateStorage.kt"));
    assert.ok(shortNames.includes("AppStateStore.kt"));

    for (const f of composeRes.files) {
      const [o, c] = countBraces(f.content);
      assert.equal(o, c, `Unbalanced braces in ${f.shortName}`);
      assert.ok(!f.content.includes("undefined"), `Found 'undefined' in ${f.shortName}`);
      assert.ok(!f.content.includes("NaN"), `Found 'NaN' in ${f.shortName}`);
    }

    const storageKt = composeRes.files.find((f) => f.shortName === "StateStorage.kt")!.content;
    const storeKt = composeRes.files.find((f) => f.shortName === "AppStateStore.kt")!.content;
    const tasksKt = composeRes.files.find((f) => f.shortName === "TasksScreen.kt")!.content;

    assert.match(storageKt, /interface StateStorage/);
    assert.match(storageKt, /class DataStoreStateStorage/);
    assert.match(storeKt, /data class TodosItem/);
    assert.match(storeKt, /class AppStateStore/);
    assert.match(storeKt, /JSONArray/);
    assert.match(tasksKt, /SingleChoiceSegmentedButtonRow/);
    assert.match(tasksKt, /SegmentedButton\(/);
    assert.match(tasksKt, /appState\.queryTodos/);

    const gradleDs = generateGradleProject(project, { persistenceBackend: "datastore" });
    const tomlDs = gradleDs.files.find((f) => f.path === "gradle/libs.versions.toml")!.content;
    assert.match(tomlDs, /datastore-preferences/);

    // 2. SharedPreferences alternative backend via pluggable interface
    const spCompose = generateComposeProject({
      ...project,
      state: { ...project.state!, persistenceBackend: "sharedPreferences" },
    });
    const spStorageKt = spCompose.files.find((f) => f.shortName === "StateStorage.kt")!.content;
    assert.match(spStorageKt, /class SharedPrefsStateStorage/);
    assert.match(spStorageKt, /getSharedPreferences/);

    const gradleSp = generateGradleProject(project, { persistenceBackend: "sharedPreferences" });
    const tomlSp = gradleSp.files.find((f) => f.path === "gradle/libs.versions.toml")!.content;
    assert.ok(!tomlSp.includes("datastore-preferences"));
  });
});
