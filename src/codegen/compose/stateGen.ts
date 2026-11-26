import type { AppCollection, AppProject, PersistenceBackend } from "../../ast/types.ts";
import type { GeneratedKotlinFile } from "./types.ts";
import { indentLines, kotlinFloat, kotlinString, toCamelCase, toPascalCase } from "./utils.ts";

function collectionItemClassName(colKey: string): string {
  return `${toPascalCase(colKey, "Record")}Item`;
}

function kotlinTypeFor(type: "string" | "boolean" | "number"): string {
  if (type === "boolean") return "Boolean";
  if (type === "number") return "Long";
  return "String";
}

function defaultLiteralFor(type: "string" | "boolean" | "number", val: unknown): string {
  if (type === "boolean") return Boolean(val) ? "true" : "false";
  if (type === "number") {
    const num = typeof val === "number" ? Math.round(val) : 0;
    return `${num}L`;
  }
  return kotlinString(typeof val === "string" ? val : "");
}

function jsonReaderFor(type: "string" | "boolean" | "number", key: string, fallback: string): string {
  if (type === "boolean") return `obj.optBoolean(${kotlinString(key)}, ${fallback})`;
  if (type === "number") return `obj.optLong(${kotlinString(key)}, ${fallback})`;
  return `obj.optString(${kotlinString(key)}, ${fallback})`;
}

/** Generate `data/StateStorage.kt` implementing an extensible persistence abstraction. */
export function generateStateStorageFile(
  pkg: string,
  appName: string,
  backend: PersistenceBackend,
): GeneratedKotlinFile {
  const pkgPath = pkg.replace(/\./g, "/");
  const prefName = `${toCamelCase(appName, "m3app")}_state`;

  const lines: string[] = [
    `package ${pkg}.data`,
    "",
    "import android.content.Context",
    ...(backend === "datastore"
      ? [
          "import androidx.datastore.preferences.core.edit",
          "import androidx.datastore.preferences.core.stringPreferencesKey",
          "import androidx.datastore.preferences.preferencesDataStore",
          "import kotlinx.coroutines.flow.first",
          "import kotlinx.coroutines.flow.map",
        ]
      : [
          "import kotlinx.coroutines.Dispatchers",
          "import kotlinx.coroutines.withContext",
        ]),
    "",
    "/**",
    " * Pluggable persistence contract for app state & collections.",
    " * Swap in RoomStateStorage or RemoteSyncStorage in future builds without changing UI screens.",
    " */",
    "interface StateStorage {",
    "    suspend fun load(): String?",
    "    suspend fun save(json: String)",
    "}",
    "",
  ];

  if (backend === "datastore") {
    lines.push(
      `private val Context.appStateDataStore by preferencesDataStore(name = ${kotlinString(prefName)})`,
      'private val STATE_JSON_KEY = stringPreferencesKey("app_state_json")',
      "",
      "class DataStoreStateStorage(private val context: Context) : StateStorage {",
      "    override suspend fun load(): String? =",
      "        context.appStateDataStore.data.map { prefs -> prefs[STATE_JSON_KEY] }.first()",
      "",
      "    override suspend fun save(json: String) {",
      "        context.appStateDataStore.edit { prefs ->",
      "            prefs[STATE_JSON_KEY] = json",
      "        }",
      "    }",
      "}",
      "",
      "fun createDefaultStateStorage(context: Context): StateStorage = DataStoreStateStorage(context)",
      "",
    );
  } else {
    lines.push(
      "class SharedPrefsStateStorage(private val context: Context) : StateStorage {",
      `    private val prefs = context.getSharedPreferences(${kotlinString(prefName)}, Context.MODE_PRIVATE)`,
      "",
      "    override suspend fun load(): String? = withContext(Dispatchers.IO) {",
      '        prefs.getString("app_state_json", null)',
      "    }",
      "",
      "    override suspend fun save(json: String) {",
      "        withContext(Dispatchers.IO) {",
      '            prefs.edit().putString("app_state_json", json).apply()',
      "        }",
      "    }",
      "}",
      "",
      "fun createDefaultStateStorage(context: Context): StateStorage = SharedPrefsStateStorage(context)",
      "",
    );
  }

  return {
    path: `app/src/main/java/${pkgPath}/data/StateStorage.kt`,
    shortName: "StateStorage.kt",
    category: "app",
    content: lines.join("\n"),
  };
}

function normalizedFields(col: AppCollection) {
  const seen = new Set<string>(["id", "createdAt"]);
  const extra = col.fields.filter((f) => {
    if (seen.has(f.key)) return false;
    seen.add(f.key);
    return true;
  });
  return extra;
}

/** Generate `ui/state/AppStateStore.kt` holding reactive state, collections, query/sort & persistence sync. */
export function generateAppStateStoreFile(
  pkg: string,
  project: AppProject,
): GeneratedKotlinFile {
  const pkgPath = pkg.replace(/\./g, "/");
  const state = project.state;
  const variables = state?.variables ?? [];
  const collections = state?.collections ?? [];

  const dataClasses: string[] = [];
  const storeBody: string[] = [];

  for (const v of variables) {
    const varName = toCamelCase(v.key, "stateVar");
    const initExpr =
      v.type === "boolean"
        ? (Boolean(v.defaultValue) ? "true" : "false")
        : v.type === "number"
          ? kotlinFloat(Number(v.defaultValue) || 0)
          : kotlinString(String(v.defaultValue ?? ""));
    storeBody.push(`    var ${varName} by mutableStateOf(${initExpr})`);
  }
  if (variables.length > 0 && collections.length > 0) storeBody.push("");

  for (const col of collections) {
    const className = collectionItemClassName(col.key);
    const colPascal = toPascalCase(col.key, "Items");
    const listVar = toCamelCase(col.key, "items");
    const fields = normalizedFields(col);

    // Data class
    dataClasses.push(
      "@Immutable",
      `data class ${className}(`,
      "    val id: String,",
      ...fields.map((f) => {
        const defVal = f.type === "boolean" ? "false" : f.type === "number" ? "0L" : '""';
        return `    val ${toCamelCase(f.key)}: ${kotlinTypeFor(f.type)} = ${defVal},`;
      }),
      "    val createdAt: Long = 0L,",
      ")",
      "",
    );

    // Seed items
    storeBody.push(`    val ${listVar} = mutableStateListOf<${className}>(`);
    for (const row of col.initialItems) {
      const fieldArgs = fields.map(
        (f) => `${toCamelCase(f.key)} = ${defaultLiteralFor(f.type, row[f.key])}`,
      );
      const createdAt = typeof row.createdAt === "number" ? Math.round(row.createdAt) : 0;
      storeBody.push(
        `        ${className}(id = ${kotlinString(row.id)}, ${fieldArgs.join(", ")}${
          fieldArgs.length ? ", " : ""
        }createdAt = ${createdAt}L),`,
      );
    }
    storeBody.push("    )", "");

    // Query helper (search + active/done/value filter + newest/oldest/az/priority sort)
    const strFieldKeys = fields.filter((f) => f.type === "string").map((f) => toCamelCase(f.key));
    const titleField = strFieldKeys.includes("title")
      ? "title"
      : strFieldKeys[0] ?? "id";
    const hasCompleted = fields.some((f) => f.key === "completed" && f.type === "boolean");
    const hasPriority = fields.some((f) => f.key === "priority" && f.type === "string");

    storeBody.push(
      `    fun query${colPascal}(`,
      '        searchQuery: String = "",',
      '        filterValue: String = "all",',
      '        sortBy: String = "newest",',
      `    ): List<${className}> {`,
      "        val q = searchQuery.trim().lowercase()",
      '        val f = filterValue.trim().lowercase()',
      `        val filtered = ${listVar}.filter { item ->`,
      "            val matchesQuery = q.isEmpty() || listOf(" +
        (strFieldKeys.length > 0 ? strFieldKeys.map((k) => `item.${k}`).join(", ") : "item.id") +
        ").any { it.lowercase().contains(q) }",
      hasCompleted
        ? [
            "            val matchesFilter = when (f) {",
            '                "", "all" -> true',
            '                "active" -> !item.completed',
            '                "done", "completed" -> item.completed',
            "                else -> true",
            "            }",
          ].join("\n")
        : "            val matchesFilter = true",
      "            matchesQuery && matchesFilter",
      "        }",
      "        return when (sortBy) {",
      '            "newest" -> filtered.sortedByDescending { it.createdAt }',
      '            "oldest" -> filtered.sortedBy { it.createdAt }',
      `            "titleAsc", "az" -> filtered.sortedBy { it.${titleField}.lowercase() }`,
      `            "titleDesc", "za" -> filtered.sortedByDescending { it.${titleField}.lowercase() }`,
      ...(hasPriority
        ? [
            '            "priority" -> filtered.sortedWith(compareBy<'+className+'> { item ->',
            '                when (item.priority.lowercase()) {',
            '                    "high" -> 0',
            '                    "medium" -> 1',
            '                    "low" -> 2',
            "                    else -> 3",
            "                }",
            "            }.thenByDescending { it.createdAt })",
          ]
        : []),
      "            else -> filtered",
      "        }",
      "    }",
      "",
    );

    // CRUD methods
    const paramDecls = fields.map((f) => {
      const def = f.type === "boolean" ? "false" : f.type === "number" ? "0L" : '""';
      return `${toCamelCase(f.key)}: ${kotlinTypeFor(f.type)} = ${def}`;
    });
    const nullableParamDecls = fields.map(
      (f) => `${toCamelCase(f.key)}: ${kotlinTypeFor(f.type)}? = null`,
    );
    const ctorAssign = fields.map((f) => `${toCamelCase(f.key)} = ${toCamelCase(f.key)}`).join(", ");
    const nullableCreateAssign = fields
      .map((f) => {
        const k = toCamelCase(f.key);
        const def = f.type === "boolean" ? "false" : f.type === "number" ? "0L" : '""';
        return `${k} = ${k} ?: ${def}`;
      })
      .join(", ");
    const nullableCopyAssign = fields
      .map((f) => {
        const k = toCamelCase(f.key);
        return `${k} = ${k} ?: existing.${k}`;
      })
      .join(", ");

    storeBody.push(
      `    fun create${colPascal}(${paramDecls.join(", ")}) {`,
      `        val item = ${className}(id = "item_" + System.currentTimeMillis(), ${ctorAssign}${
        ctorAssign ? ", " : ""
      }createdAt = System.currentTimeMillis())`,
      `        ${listVar}.add(0, item)`,
      "        scheduleSave()",
      "    }",
      "",
      `    fun upsert${colPascal}(id: String?, ${nullableParamDecls.join(", ")}) {`,
      `        val idx = if (id.isNullOrBlank()) -1 else ${listVar}.indexOfFirst { it.id == id }`,
      "        if (idx >= 0) {",
      `            val existing = ${listVar}[idx]`,
      `            ${listVar}[idx] = existing.copy(${nullableCopyAssign})`,
      "        } else {",
      `            val item = ${className}(id = "item_" + System.currentTimeMillis(), ${nullableCreateAssign}${
        nullableCreateAssign ? ", " : ""
      }createdAt = System.currentTimeMillis())`,
      `            ${listVar}.add(0, item)`,
      "        }",
      "        scheduleSave()",
      "    }",
      "",
    );

    const boolFields = fields.filter((f) => f.type === "boolean");
    storeBody.push(
      `    fun toggle${colPascal}Field(id: String, field: String) {`,
      `        val idx = ${listVar}.indexOfFirst { it.id == id }`,
      "        if (idx < 0) return",
      `        val current = ${listVar}[idx]`,
      "        val updated = when (field) {",
      ...boolFields.map(
        (bf) =>
          `            ${kotlinString(bf.key)} -> current.copy(${toCamelCase(bf.key)} = !current.${toCamelCase(bf.key)})`,
      ),
      "            else -> current",
      "        }",
      `        ${listVar}[idx] = updated`,
      "        scheduleSave()",
      "    }",
      "",
      `    fun delete${colPascal}(id: String) {`,
      `        ${listVar}.removeAll { it.id == id }`,
      "        scheduleSave()",
      "    }",
      "",
    );
  }

  // Persistence serialize / deserialize inside AppStateStore
  const persistVars = variables.filter((v) => v.persist);
  const persistCols = collections.filter((c) => c.persist);

  const encodeLines: string[] = [
    "    private fun encodeToJson(): String {",
    "        val root = JSONObject()",
    "        val varsObj = JSONObject()",
    ...persistVars.map(
      (v) => `        varsObj.put(${kotlinString(v.key)}, ${toCamelCase(v.key, "stateVar")})`,
    ),
    '        root.put("variables", varsObj)',
    "        val colsObj = JSONObject()",
  ];

  const decodeLines: string[] = [
    "    suspend fun hydrate() {",
    "        val raw = storage?.load() ?: return",
    "        try {",
    "            val root = JSONObject(raw)",
    '            val varsObj = root.optJSONObject("variables")',
    "            if (varsObj != null) {",
    ...persistVars.map((v) => {
      const varName = toCamelCase(v.key, "stateVar");
      const k = kotlinString(v.key);
      if (v.type === "boolean") {
        return `                if (varsObj.has(${k})) ${varName} = varsObj.optBoolean(${k}, ${varName})`;
      }
      if (v.type === "number") {
        return `                if (varsObj.has(${k})) ${varName} = varsObj.optDouble(${k}, ${varName}.toDouble()).toFloat()`;
      }
      return `                if (varsObj.has(${k})) ${varName} = varsObj.optString(${k}, ${varName})`;
    }),
    "            }",
    '            val colsObj = root.optJSONObject("collections")',
    "            if (colsObj != null) {",
  ];

  for (const col of persistCols) {
    const className = collectionItemClassName(col.key);
    const listVar = toCamelCase(col.key, "items");
    const fields = normalizedFields(col);
    const k = kotlinString(col.key);

    encodeLines.push(
      `        val arr_${listVar} = JSONArray()`,
      `        for (item in ${listVar}) {`,
      "            val obj = JSONObject()",
      '            obj.put("id", item.id)',
      ...fields.map(
        (f) => `            obj.put(${kotlinString(f.key)}, item.${toCamelCase(f.key)})`,
      ),
      '            obj.put("createdAt", item.createdAt)',
      `            arr_${listVar}.put(obj)`,
      "        }",
      `        colsObj.put(${k}, arr_${listVar})`,
    );

    decodeLines.push(
      `                val arr_${listVar} = colsObj.optJSONArray(${k})`,
      `                if (arr_${listVar} != null) {`,
      `                    val loaded = ArrayList<${className}>(arr_${listVar}.length())`,
      `                    for (i in 0 until arr_${listVar}.length()) {`,
      `                        val obj = arr_${listVar}.optJSONObject(i) ?: continue`,
      `                        loaded.add(${className}(`,
      '                            id = obj.optString("id", "item_" + i),',
      ...fields.map((f) => {
        const fb = f.type === "boolean" ? "false" : f.type === "number" ? "0L" : '""';
        return `                            ${toCamelCase(f.key)} = ${jsonReaderFor(f.type, f.key, fb)},`;
      }),
      '                            createdAt = obj.optLong("createdAt", 0L),',
      "                        ))",
      "                    }",
      `                    ${listVar}.clear()`,
      `                    ${listVar}.addAll(loaded)`,
      "                }",
    );
  }

  encodeLines.push(
    '        root.put("collections", colsObj)',
    "        return root.toString()",
    "    }",
  );

  decodeLines.push(
    "            }",
    "        } catch (_: Exception) {",
    "            // Ignore malformed persisted state and retain defaults",
    "        }",
    "    }",
  );

  const lines = [
    `package ${pkg}.ui.state`,
    "",
    "import androidx.compose.runtime.Composable",
    "import androidx.compose.runtime.Immutable",
    "import androidx.compose.runtime.LaunchedEffect",
    "import androidx.compose.runtime.Stable",
    "import androidx.compose.runtime.getValue",
    "import androidx.compose.runtime.mutableStateListOf",
    "import androidx.compose.runtime.mutableStateOf",
    "import androidx.compose.runtime.remember",
    "import androidx.compose.runtime.rememberCoroutineScope",
    "import androidx.compose.runtime.setValue",
    `import ${pkg}.data.StateStorage`,
    "import kotlinx.coroutines.CoroutineScope",
    "import kotlinx.coroutines.launch",
    "import org.json.JSONArray",
    "import org.json.JSONObject",
    "",
    ...dataClasses,
    "@Stable",
    "class AppStateStore(",
    "    private val storage: StateStorage?,",
    "    private val scope: CoroutineScope,",
    ") {",
    ...storeBody,
    "    fun notifyChanged() {",
    "        scheduleSave()",
    "    }",
    "",
    "    private fun scheduleSave() {",
    "        if (storage == null) return",
    "        val snapshot = encodeToJson()",
    "        scope.launch { storage.save(snapshot) }",
    "    }",
    "",
    ...indentLines(encodeLines.map((l) => l.replace(/^ {4}/, "")), 4),
    "",
    ...indentLines(decodeLines.map((l) => l.replace(/^ {4}/, "")), 4),
    "}",
    "",
    "@Composable",
    "fun rememberAppStateStore(storage: StateStorage?): AppStateStore {",
    "    val scope = rememberCoroutineScope()",
    "    val store = remember(storage, scope) { AppStateStore(storage = storage, scope = scope) }",
    "    LaunchedEffect(store) { store.hydrate() }",
    "    return store",
    "}",
    "",
  ];

  return {
    path: `app/src/main/java/${pkgPath}/ui/state/AppStateStore.kt`,
    shortName: "AppStateStore.kt",
    category: "app",
    content: lines.join("\n"),
  };
}
