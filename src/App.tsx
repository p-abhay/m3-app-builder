import { useEffect, useState } from "react";
import { M3ThemeProvider, useM3Theme } from "@/theme/ThemeContext";
import { usePreviewStore } from "@/store/usePreviewStore";
import { useProjectStore } from "@/store/useProjectStore";
import { BuilderDndProvider } from "@/components/dnd/BuilderDndProvider";
import { DevicePreview } from "@/components/DevicePreview";
import { LeftSidebar } from "@/components/LeftSidebar";
import { ProjectJsonModal } from "@/components/ProjectJsonModal";
import { ReleaseNotesModal } from "@/components/ReleaseNotesModal";
import { RightSidebar } from "@/components/RightSidebar";
import { TemplatesModal } from "@/components/TemplatesModal";
import { Icon } from "@/components/Icon";

function StudioShell() {
  const { palette, shapes, theme, updateTheme } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const editorMode = useProjectStore((s) => s.editorMode);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const selectNode = useProjectStore((s) => s.selectNode);
  const removeNode = useProjectStore((s) => s.removeNode);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const setEditorMode = useProjectStore((s) => s.setEditorMode);
  const startPreview = usePreviewStore((s) => s.startPreview);

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const activeScreen =
    project.screens.find((s) => s.id === activeScreenId) ?? project.screens[0];
  const isPreview = editorMode === "preview";

  const enterPreview = () => {
    startPreview(project.initialScreenId);
    setEditorMode("preview");
  };

  const enterEdit = () => {
    setEditorMode("edit");
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (e.key === "Escape") {
        if (isPreview) enterEdit();
        else selectNode(null);
      } else if (!isPreview && (e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        e.preventDefault();
        removeNode(selectedNodeId);
      } else if (!isPreview && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (!isPreview && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo, selectNode, removeNode, selectedNodeId, isPreview]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: palette.surfaceDim,
        color: palette.onSurface,
      }}
    >
      {/* Top Studio Bar */}
      <header
        className="h-14 px-4 border-b flex items-center justify-between gap-3 shrink-0"
        style={{
          backgroundColor: palette.surfaceContainerLow,
          borderColor: palette.outlineVariant,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 shrink-0 flex items-center justify-center"
            style={{
              borderRadius: shapes.medium,
              backgroundColor: palette.primary,
              color: palette.onPrimary,
            }}
          >
            <Icon name="widgets" size={20} fill />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={project.name}
                onChange={(e) => setProjectName(e.target.value)}
                aria-label="Project Name"
                className="text-sm font-bold tracking-tight bg-transparent border-0 outline-none px-1 -ml-1 rounded focus:ring-1"
                style={{ color: palette.onSurface }}
              />
              <span
                className="text-[10px] font-bold px-2 py-0.5 uppercase shrink-0"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: isPreview ? palette.tertiaryContainer : palette.primaryContainer,
                  color: isPreview ? palette.onTertiaryContainer : palette.onPrimaryContainer,
                }}
              >
                {isPreview ? "Interactive Preview" : "V1 Studio"}
              </span>
              <button
                type="button"
                data-testid="studio-info-button"
                onClick={() => setInfoOpen(true)}
                className="m3-press w-6 h-6 flex items-center justify-center border-0 cursor-pointer shrink-0"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: palette.surfaceContainerHigh,
                  color: palette.onSurfaceVariant,
                }}
                aria-label="Release notes and upcoming features"
                title="Release notes & Future roadmap"
              >
                <Icon name="info" size={15} />
              </button>
            </div>
            <p className="text-[11px] truncate" style={{ color: palette.onSurfaceVariant }}>
              {isPreview
                ? "Running isolated preview • Edits do not alter your AST"
                : `Active Screen: ${activeScreen?.name} (/${activeScreen?.route}) • ${project.screens.length} screens`}
            </p>
          </div>
        </div>

        {/* Center Edit / Preview Mode Switcher */}
        <div
          className="inline-flex p-1 gap-1 shrink-0"
          style={{
            backgroundColor: palette.surfaceContainerHigh,
            borderRadius: shapes.full,
          }}
        >
          <button
            type="button"
            data-testid="mode-edit"
            onClick={enterEdit}
            className="m3-press flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold border-0 cursor-pointer"
            style={{
              borderRadius: shapes.full,
              backgroundColor: !isPreview ? palette.primary : "transparent",
              color: !isPreview ? palette.onPrimary : palette.onSurfaceVariant,
            }}
          >
            <Icon name="edit" size={14} />
            <span>Edit</span>
          </button>
          <button
            type="button"
            data-testid="mode-preview"
            onClick={enterPreview}
            className="m3-press flex items-center gap-1.5 px-3.5 py-1 text-xs font-semibold border-0 cursor-pointer"
            style={{
              borderRadius: shapes.full,
              backgroundColor: isPreview ? palette.primary : "transparent",
              color: isPreview ? palette.onPrimary : palette.onSurfaceVariant,
            }}
          >
            <Icon name="play_arrow" size={15} fill={isPreview} />
            <span>Preview</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo || isPreview}
            className="m3-press w-8 h-8 flex items-center justify-center border-0 cursor-pointer disabled:opacity-35"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.surfaceContainerHigh,
              color: palette.onSurface,
            }}
            title="Undo (Ctrl+Z)"
          >
            <Icon name="undo" size={18} />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo || isPreview}
            className="m3-press w-8 h-8 flex items-center justify-center border-0 cursor-pointer disabled:opacity-35"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.surfaceContainerHigh,
              color: palette.onSurface,
            }}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Icon name="redo" size={18} />
          </button>

          <div className="w-px h-5 mx-1" style={{ backgroundColor: palette.outlineVariant }} />

          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            className="m3-press flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer border-0"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.surfaceContainerHigh,
              color: palette.onSurface,
            }}
          >
            <Icon name="dashboard_customize" size={16} />
            <span>Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setJsonOpen(true)}
            className="m3-press flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer border-0"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.surfaceContainerHigh,
              color: palette.onSurface,
            }}
          >
            <Icon name="code" size={16} />
            <span>AST JSON</span>
          </button>

          <button
            type="button"
            onClick={() => updateTheme({ mode: theme.mode === "dark" ? "light" : "dark" })}
            className="m3-press flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer border-0"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.secondaryContainer,
              color: palette.onSecondaryContainer,
            }}
          >
            <Icon name={theme.mode === "dark" ? "light_mode" : "dark_mode"} size={16} />
            <span>{theme.mode === "dark" ? "Light" : "Dark"}</span>
          </button>
        </div>
      </header>

      {/* Studio Workspace */}
      <BuilderDndProvider>
        <main
          className={`flex-1 min-h-0 grid ${
            isPreview ? "grid-cols-[1fr_340px]" : "grid-cols-[310px_1fr_340px]"
          }`}
        >
          {!isPreview && (
            <aside className="min-h-0">
              <LeftSidebar />
            </aside>
          )}

          <section
            className="no-scrollbar min-h-0 overflow-y-auto flex items-start justify-center px-6"
            style={{ backgroundColor: palette.surfaceContainerLowest }}
          >
            <DevicePreview />
          </section>

          <aside className="min-h-0">
            <RightSidebar />
          </aside>
        </main>
      </BuilderDndProvider>

      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <ProjectJsonModal open={jsonOpen} onClose={() => setJsonOpen(false)} />
      <ReleaseNotesModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </div>
  );
}

export function App() {
  return (
    <M3ThemeProvider>
      <StudioShell />
    </M3ThemeProvider>
  );
}

export default App;
