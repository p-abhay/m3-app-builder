import type { AppStateConfig, CollectionRecord, VisibilityCondition } from "./types.ts";

export function createEmptyAppState(): AppStateConfig {
  return {
    persistenceBackend: "datastore",
    variables: [],
    collections: [],
  };
}

export interface CollectionQueryOptions {
  searchQuery?: string;
  searchFields?: string[];
  filterField?: string;
  filterValue?: string;
  sortBy?: string;
}

const PRIORITY_RANK: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function priorityWeight(record: CollectionRecord): number {
  const raw = String(record.priority ?? "").trim().toLowerCase();
  return raw in PRIORITY_RANK ? PRIORITY_RANK[raw] : 3;
}

function createdAtMs(record: CollectionRecord, fallbackIndex: number): number {
  return typeof record.createdAt === "number" ? record.createdAt : fallbackIndex;
}

function titleText(record: CollectionRecord): string {
  if (typeof record.title === "string") return record.title.toLowerCase();
  if (typeof record.name === "string") return record.name.toLowerCase();
  const firstStr = Object.entries(record).find(
    ([k, v]) => k !== "id" && typeof v === "string",
  );
  return firstStr ? String(firstStr[1]).toLowerCase() : "";
}

/**
 * Filter, search, and sort collection records identically across Studio Preview and unit tests.
 */
export function queryCollection<T extends CollectionRecord>(
  items: readonly T[],
  options: CollectionQueryOptions = {},
): T[] {
  const q = (options.searchQuery ?? "").trim().toLowerCase();
  const fField = options.filterField?.trim();
  const fVal = (options.filterValue ?? "").trim().toLowerCase();
  const sortBy = (options.sortBy ?? "").trim();

  const indexed = items.map((item, idx) => ({ item, idx })).filter(({ item }) => {
    if (q) {
      const fields =
        options.searchFields && options.searchFields.length > 0
          ? options.searchFields
          : Object.keys(item).filter((k) => k !== "id");
      const matchesQuery = fields.some((field) =>
        String(item[field] ?? "").toLowerCase().includes(q),
      );
      if (!matchesQuery) return false;
    }

    if (fField && fVal && fVal !== "all") {
      const val = item[fField];
      if (fVal === "active") {
        if (Boolean(val)) return false;
      } else if (fVal === "done" || fVal === "completed") {
        if (!Boolean(val)) return false;
      } else if (String(val ?? "").toLowerCase() !== fVal) {
        return false;
      }
    }

    return true;
  });

  if (sortBy === "newest") {
    indexed.sort((a, b) => createdAtMs(b.item, b.idx) - createdAtMs(a.item, a.idx));
  } else if (sortBy === "oldest") {
    indexed.sort((a, b) => createdAtMs(a.item, a.idx) - createdAtMs(b.item, b.idx));
  } else if (sortBy === "titleAsc" || sortBy === "az") {
    indexed.sort((a, b) => titleText(a.item).localeCompare(titleText(b.item)));
  } else if (sortBy === "titleDesc" || sortBy === "za") {
    indexed.sort((a, b) => titleText(b.item).localeCompare(titleText(a.item)));
  } else if (sortBy === "priority") {
    indexed.sort((a, b) => {
      const diff = priorityWeight(a.item) - priorityWeight(b.item);
      return diff !== 0 ? diff : createdAtMs(b.item, b.idx) - createdAtMs(a.item, a.idx);
    });
  }

  return indexed.map((entry) => entry.item);
}

/**
 * Resolve `{{item.field}}`, `{{state.key}}`, and `{{count.collection}}` template tokens.
 */
export function resolveTemplateString(
  raw: string,
  values: Record<string, unknown>,
  collections: Record<string, CollectionRecord[]>,
  item?: CollectionRecord,
): string {
  if (!raw.includes("{{")) return raw;
  return raw.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (match, expr: string) => {
    if (expr.startsWith("item.")) {
      if (!item) return match;
      const field = expr.slice(5);
      const val = item[field];
      return val === undefined || val === null ? "" : String(val);
    }
    if (expr.startsWith("state.")) {
      const key = expr.slice(6);
      const val = values[key];
      return val === undefined || val === null ? "" : String(val);
    }
    if (expr.startsWith("count.")) {
      const colKey = expr.slice(6);
      const list = collections[colKey];
      return String(Array.isArray(list) ? list.length : 0);
    }
    return match;
  });
}

/**
 * Evaluate conditional node visibility rules against runtime preview/default variable values.
 */
export function evaluateVisibility(
  condition: VisibilityCondition | undefined,
  values: Record<string, unknown>,
  fallbackDefaults?: Record<string, unknown>,
): boolean {
  if (!condition || !condition.stateKey.trim()) return true;
  const raw =
    condition.stateKey in values
      ? values[condition.stateKey]
      : fallbackDefaults?.[condition.stateKey];

  const isTruthy =
    typeof raw === "string"
      ? raw.trim().length > 0 && raw.trim().toLowerCase() !== "false"
      : Boolean(raw);

  switch (condition.operator) {
    case "truthy":
      return isTruthy;
    case "falsy":
      return !isTruthy;
    case "equals":
      return (
        String(raw ?? "").trim().toLowerCase() ===
        String(condition.value ?? "").trim().toLowerCase()
      );
    case "notEquals":
      return (
        String(raw ?? "").trim().toLowerCase() !==
        String(condition.value ?? "").trim().toLowerCase()
      );
    default:
      return true;
  }
}
