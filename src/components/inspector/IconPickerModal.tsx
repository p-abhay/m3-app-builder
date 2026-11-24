import { useMemo, useState } from "react";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "../Icon";
import { ICON_CATALOG } from "./iconCatalog";

interface IconPickerModalProps {
  open: boolean;
  value?: string;
  onSelect: (iconName: string | undefined) => void;
  onClose: () => void;
}

export function IconPickerModal({ open, value, onSelect, onClose }: IconPickerModalProps) {
  const { palette, shapes } = useM3Theme();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ICON_CATALOG;
    return ICON_CATALOG.filter(
      (item) => item.name.includes(q) || item.tags.includes(q),
    );
  }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        data-testid="icon-picker-dialog"
        className="w-full max-w-lg flex flex-col max-h-[80vh] overflow-hidden shadow-2xl border"
        style={{
          backgroundColor: palette.surfaceContainerLow,
          borderColor: palette.outlineVariant,
          borderRadius: shapes.extraLarge,
          color: palette.onSurface,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-2"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div className="flex items-center gap-2">
            <Icon name="apps" size={20} color={palette.primary} />
            <h2 className="text-sm font-semibold">Material Symbols Picker</h2>
          </div>
          <div className="flex items-center gap-2">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onSelect(undefined);
                  onClose();
                }}
                className="px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: palette.surfaceContainerHigh,
                  color: palette.onSurfaceVariant,
                }}
              >
                Clear icon
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center border-0 bg-transparent cursor-pointer"
              style={{ borderRadius: shapes.full, color: palette.onSurfaceVariant }}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              backgroundColor: palette.surfaceContainerHigh,
              borderRadius: shapes.full,
            }}
          >
            <Icon name="search" size={18} color={palette.onSurfaceVariant} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons..."
              className="flex-1 bg-transparent text-xs outline-none border-0"
              style={{ color: palette.onSurface }}
            />
          </div>
        </div>

        <div className="no-scrollbar flex-1 overflow-y-auto p-4 pt-2 grid grid-cols-5 gap-2">
          {filtered.map((item) => {
            const active = value === item.name;
            return (
              <button
                key={item.name}
                type="button"
                data-testid={`icon-option-${item.name}`}
                onClick={() => {
                  onSelect(item.name);
                  onClose();
                }}
                className="m3-press flex flex-col items-center justify-center gap-1 p-2.5 border-0 cursor-pointer"
                style={{
                  borderRadius: shapes.medium,
                  backgroundColor: active
                    ? palette.secondaryContainer
                    : palette.surfaceContainer,
                  color: active ? palette.onSecondaryContainer : palette.onSurface,
                  outline: active ? `2px solid ${palette.primary}` : "none",
                }}
                title={item.name}
              >
                <Icon name={item.name} size={22} fill={active} />
                <span className="text-[10px] w-full truncate text-center opacity-80">
                  {item.name}
                </span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div
              className="col-span-5 py-8 text-center text-xs"
              style={{ color: palette.onSurfaceVariant }}
            >
              No matching icons found for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
