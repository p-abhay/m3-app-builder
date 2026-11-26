import { useState } from "react";
import { createEmptyAppState } from "@/ast/state";
import type {
  AppCollection,
  AppVariable,
  PersistenceBackend,
} from "@/ast/types";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";

export function DataStateSidebar() {
  const { palette, shapes } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const setPersistenceBackend = useProjectStore((s) => s.setPersistenceBackend);
  const upsertVariable = useProjectStore((s) => s.upsertVariable);
  const removeVariable = useProjectStore((s) => s.removeVariable);
  const upsertCollection = useProjectStore((s) => s.upsertCollection);
  const removeCollection = useProjectStore((s) => s.removeCollection);

  const appState = project.state ?? createEmptyAppState();

  const [varKey, setVarKey] = useState("");
  const [varType, setVarType] = useState<"string" | "boolean" | "number">("string");
  const [varDefault, setVarDefault] = useState("");
  const [varPersist, setVarPersist] = useState(false);

  const [colKey, setColKey] = useState("");
  const [colLabel, setColLabel] = useState("");

  const inputStyle = {
    borderRadius: shapes.small,
    backgroundColor: palette.surfaceContainerHighest,
    color: palette.onSurface,
    border: `1px solid ${palette.outlineVariant}`,
  };

  const handleAddVariable = () => {
    const cleanKey = varKey.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanKey) return;
    const defaultValue: AppVariable["defaultValue"] =
      varType === "boolean"
        ? varDefault.trim().toLowerCase() === "true"
        : varType === "number"
          ? Number(varDefault) || 0
          : varDefault;
    upsertVariable({
      key: cleanKey,
      label: cleanKey,
      type: varType,
      defaultValue,
      persist: varPersist,
    });
    setVarKey("");
    setVarDefault("");
  };

  const handleAddCollection = () => {
    const cleanKey = colKey.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!cleanKey) return;
    const label = colLabel.trim() || cleanKey;
    const nextCol: AppCollection = {
      key: cleanKey,
      label,
      itemLabel: label.replace(/s$/, "") || "Item",
      persist: true,
      fields: [
        { key: "title", label: "Title", type: "string" },
        { key: "notes", label: "Notes", type: "string" },
        { key: "completed", label: "Completed", type: "boolean" },
        { key: "priority", label: "Priority", type: "string" },
        { key: "createdAt", label: "Created At", type: "number" },
      ],
      initialItems: [],
    };
    upsertCollection(nextCol);
    setColKey("");
    setColLabel("");
  };

  return (
    <div
      data-testid="data-state-sidebar"
      className="no-scrollbar flex-1 overflow-y-auto p-3 space-y-4 text-xs"
    >
      {/* Android Storage Backend */}
      <div
        className="p-3 space-y-2"
        style={{ backgroundColor: palette.surfaceContainer, borderRadius: shapes.large }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: palette.onSurfaceVariant }}
          >
            Persistence Storage
          </span>
          <Icon name="storage" size={16} color={palette.primary} />
        </div>
        <select
          aria-label="Persistence Backend"
          value={appState.persistenceBackend}
          onChange={(e) => setPersistenceBackend(e.target.value as PersistenceBackend)}
          className="w-full px-2.5 py-1.5 text-xs outline-none"
          style={inputStyle}
        >
          <option value="datastore">Jetpack DataStore (Preferences + JSON)</option>
          <option value="sharedPreferences">SharedPreferences (JSON Storage)</option>
        </select>
        <p className="text-[11px] leading-relaxed" style={{ color: palette.onSurfaceVariant }}>
          Preview saves automatically to <code className="font-mono">localStorage</code>; Android export implements <code className="font-mono">StateStorage</code>.
        </p>
      </div>

      {/* State Variables */}
      <div
        className="p-3 space-y-2.5"
        style={{ backgroundColor: palette.surfaceContainer, borderRadius: shapes.large }}
      >
        <div className="flex items-center justify-between">
          <span
            className="text-[11px] font-bold uppercase tracking-wider"
            style={{ color: palette.onSurfaceVariant }}
          >
            State Variables ({appState.variables.length})
          </span>
        </div>

        <div className="space-y-1.5">
          {appState.variables.map((v) => (
            <div
              key={v.key}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5"
              style={{ backgroundColor: palette.surfaceContainerLow, borderRadius: shapes.medium }}
            >
              <div className="min-w-0">
                <div className="font-mono font-semibold truncate">{v.key}</div>
                <div className="text-[10px]" style={{ color: palette.onSurfaceVariant }}>
                  {v.type} • default: {JSON.stringify(v.defaultValue)}
                  {v.persist ? " • persist" : ""}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => upsertVariable({ ...v, persist: !v.persist })}
                  className="p-1 border-0 bg-transparent cursor-pointer"
                  style={{ color: v.persist ? palette.primary : palette.onSurfaceVariant }}
                  title={v.persist ? "Persisted" : "Session-only"}
                >
                  <Icon name={v.persist ? "save" : "memory"} size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => removeVariable(v.key)}
                  className="p-1 border-0 bg-transparent cursor-pointer"
                  style={{ color: palette.error }}
                  title={`Remove ${v.key}`}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-1 border-t space-y-1.5" style={{ borderColor: palette.outlineVariant }}>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="text"
              placeholder="varKey"
              value={varKey}
              onChange={(e) => setVarKey(e.target.value)}
              className="px-2 py-1 text-xs font-mono outline-none"
              style={inputStyle}
            />
            <select
              value={varType}
              onChange={(e) => setVarType(e.target.value as "string" | "boolean" | "number")}
              className="px-2 py-1 text-xs outline-none"
              style={inputStyle}
            >
              <option value="string">string</option>
              <option value="boolean">boolean</option>
              <option value="number">number</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="default value"
              value={varDefault}
              onChange={(e) => setVarDefault(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
            <label className="flex items-center gap-1 text-[10px] shrink-0">
              <input
                type="checkbox"
                checked={varPersist}
                onChange={(e) => setVarPersist(e.target.checked)}
              />
              Persist
            </label>
            <button
              type="button"
              onClick={handleAddVariable}
              className="m3-press px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer shrink-0"
              style={{
                borderRadius: shapes.full,
                backgroundColor: palette.primaryContainer,
                color: palette.onPrimaryContainer,
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Collections */}
      <div
        className="p-3 space-y-2.5"
        style={{ backgroundColor: palette.surfaceContainer, borderRadius: shapes.large }}
      >
        <div
          className="text-[11px] font-bold uppercase tracking-wider"
          style={{ color: palette.onSurfaceVariant }}
        >
          Collections ({appState.collections.length})
        </div>

        <div className="space-y-1.5">
          {appState.collections.map((col) => (
            <div
              key={col.key}
              className="p-2.5 space-y-1"
              style={{ backgroundColor: palette.surfaceContainerLow, borderRadius: shapes.medium }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono font-semibold truncate">{col.key}</div>
                  <div className="text-[10px]" style={{ color: palette.onSurfaceVariant }}>
                    {col.fields.length} fields • {col.initialItems.length} seed items
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCollection(col.key)}
                  className="p-1 border-0 bg-transparent cursor-pointer"
                  style={{ color: palette.error }}
                  title={`Remove ${col.key}`}
                >
                  <Icon name="delete" size={14} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {col.fields.map((f) => (
                  <span
                    key={f.key}
                    className="px-1.5 py-0.5 text-[10px] font-mono"
                    style={{
                      borderRadius: shapes.extraSmall,
                      backgroundColor: palette.surfaceContainerHigh,
                      color: palette.onSurfaceVariant,
                    }}
                  >
                    {f.key}:{f.type}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-1 border-t space-y-1.5" style={{ borderColor: palette.outlineVariant }}>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="collectionKey"
              value={colKey}
              onChange={(e) => setColKey(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 text-xs font-mono outline-none"
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Label"
              value={colLabel}
              onChange={(e) => setColLabel(e.target.value)}
              className="w-24 px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={handleAddCollection}
              className="m3-press px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer shrink-0"
              style={{
                borderRadius: shapes.full,
                backgroundColor: palette.primaryContainer,
                color: palette.onPrimaryContainer,
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
