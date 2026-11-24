import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { createNode } from "@/ast/factory";
import { isNodeContainer } from "@/components/canvas/M3Renderer";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "../Icon";
import { PALETTE_CATEGORIES, PALETTE_PARTS, type PalettePartMeta } from "./paletteCatalog";

function DraggablePaletteTile({
  part,
  onClickAdd,
}: {
  part: PalettePartMeta;
  onClickAdd: (part: PalettePartMeta) => void;
}) {
  const { palette, shapes } = useM3Theme();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${part.type}`,
    data: {
      source: "palette",
      componentType: part.type,
      targetSlot: part.targetSlot,
      label: part.label,
      icon: part.icon,
    },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      data-testid={`palette-item-${part.type}`}
      onClick={() => onClickAdd(part)}
      {...listeners}
      {...attributes}
      className="m3-press flex flex-col items-start gap-1.5 p-2.5 text-left border cursor-grab active:cursor-grabbing select-none touch-none"
      style={{
        borderRadius: shapes.medium,
        backgroundColor: palette.surfaceContainer,
        borderColor: palette.outlineVariant,
        color: palette.onSurface,
        opacity: isDragging ? 0.45 : 1,
      }}
      title={`${part.label} — ${part.description} (click or drag)`}
    >
      <div
        className="w-7 h-7 flex items-center justify-center"
        style={{
          borderRadius: shapes.small,
          backgroundColor: palette.primaryContainer,
          color: palette.onPrimaryContainer,
        }}
      >
        <Icon name={part.icon} size={17} />
      </div>
      <div className="min-w-0 w-full">
        <div className="text-[11px] font-semibold truncate">{part.label}</div>
        <div className="text-[10px] truncate opacity-70" style={{ color: palette.onSurfaceVariant }}>
          {part.description}
        </div>
      </div>
    </button>
  );
}

export function PartsPalette() {
  const { palette, shapes } = useM3Theme();
  const [query, setQuery] = useState("");

  const project = useProjectStore((s) => s.project);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const insertNode = useProjectStore((s) => s.insertNode);
  const setSlotNode = useProjectStore((s) => s.setSlotNode);

  const activeScreen =
    project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];

  const handleClickAdd = (part: PalettePartMeta) => {
    if (!activeScreen) return;
    if (part.targetSlot === "topBarId") {
      setSlotNode(
        "topBarId",
        createNode("TopAppBar", { props: { title: activeScreen.name } }),
      );
      return;
    }
    if (part.targetSlot === "fabId") {
      setSlotNode("fabId", createNode("FloatingActionButton"));
      return;
    }

    const selected = selectedNodeId ? activeScreen.nodes[selectedNodeId] : undefined;
    const targetParentId = isNodeContainer(selected)
      ? selected!.id
      : activeScreen.slots.bodyId;
    insertNode(targetParentId, createNode(part.type));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return PALETTE_PARTS.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-2.5 pb-2">
        <div
          className="flex items-center gap-2 px-3 py-1.5"
          style={{
            backgroundColor: palette.surfaceContainerHigh,
            borderRadius: shapes.full,
          }}
        >
          <Icon name="search" size={16} color={palette.onSurfaceVariant} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search components..."
            className="flex-1 min-w-0 bg-transparent text-xs outline-none border-0"
            style={{ color: palette.onSurface }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-0.5 border-0 bg-transparent cursor-pointer"
              style={{ color: palette.onSurfaceVariant }}
            >
              <Icon name="close" size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4 pt-1 space-y-4">
        {filtered ? (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map((part) => (
              <DraggablePaletteTile
                key={part.type}
                part={part}
                onClickAdd={handleClickAdd}
              />
            ))}
            {filtered.length === 0 && (
              <div
                className="col-span-2 py-8 text-center text-xs"
                style={{ color: palette.onSurfaceVariant }}
              >
                No components match &ldquo;{query}&rdquo;
              </div>
            )}
          </div>
        ) : (
          PALETTE_CATEGORIES.map((cat) => {
            const items = PALETTE_PARTS.filter((p) => p.category === cat.key);
            return (
              <div key={cat.key}>
                <div
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-1 mb-2"
                  style={{ color: palette.onSurfaceVariant }}
                >
                  <Icon name={cat.icon} size={14} color={palette.primary} />
                  <span>{cat.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {items.map((part) => (
                    <DraggablePaletteTile
                      key={part.type}
                      part={part}
                      onClickAdd={handleClickAdd}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
