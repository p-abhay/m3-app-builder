import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";
import { PropertiesInspector } from "./inspector/PropertiesInspector";
import { ThemePanel } from "./ThemePanel";

export function RightSidebar() {
  const { palette, shapes } = useM3Theme();
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const editorMode = useProjectStore((s) => s.editorMode);
  const [tab, setTab] = useState<"theme" | "inspector">("theme");
  const prevSelectedRef = useRef<string | null>(null);

  const isPreview = editorMode === "preview";

  useEffect(() => {
    if (selectedNodeId && selectedNodeId !== prevSelectedRef.current) {
      setTab("inspector");
    } else if (!selectedNodeId && prevSelectedRef.current) {
      setTab("theme");
    }
    prevSelectedRef.current = selectedNodeId;
  }, [selectedNodeId]);

  if (isPreview) {
    return (
      <div
        data-testid="right-sidebar"
        className="flex flex-col h-full border-l"
        style={{
          backgroundColor: palette.surfaceContainerLow,
          borderColor: palette.outlineVariant,
          color: palette.onSurface,
        }}
      >
        <ThemePanel />
      </div>
    );
  }

  return (
    <div
      data-testid="right-sidebar"
      className="flex flex-col h-full border-l"
      style={{
        backgroundColor: palette.surfaceContainerLow,
        borderColor: palette.outlineVariant,
        color: palette.onSurface,
      }}
    >
      {/* Top Mode Switcher */}
      <div className="p-2.5 border-b" style={{ borderColor: palette.outlineVariant }}>
        <div
          className="flex p-1 gap-1"
          style={{ backgroundColor: palette.surfaceContainerHigh, borderRadius: shapes.full }}
        >
          {(
            [
              { key: "theme", label: "Theme & System", icon: "palette" },
              { key: "inspector", label: "Properties", icon: "tune" },
            ] as const
          ).map((item) => {
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className="m3-press flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 text-xs font-semibold border-0 cursor-pointer"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: active ? palette.secondaryContainer : "transparent",
                  color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
                }}
              >
                <Icon name={item.icon} size={15} fill={active} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {tab === "inspector" ? (
          <PropertiesInspector onSwitchToTheme={() => setTab("theme")} />
        ) : (
          <ThemePanel />
        )}
      </div>
    </div>
  );
}
