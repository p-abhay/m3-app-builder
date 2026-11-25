import { useEffect, useMemo, useState } from "react";
import { generateComposeProject, type GeneratedKotlinFile } from "@/codegen/compose";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";

interface ComposeExportModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_ORDER: { key: GeneratedKotlinFile["category"]; label: string }[] = [
  { key: "screen", label: "Screens" },
  { key: "navigation", label: "Navigation" },
  { key: "app", label: "Entry Activity" },
  { key: "theme", label: "M3 Theme Tokens" },
];

export function ComposeExportModal({ open, onClose }: ComposeExportModalProps) {
  const { palette, shapes } = useM3Theme();
  const project = useProjectStore((s) => s.project);

  const [m3Expressive, setM3Expressive] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => generateComposeProject(project, { m3Expressive }),
    [project, m3Expressive],
  );

  useEffect(() => {
    if (!open) return;
    if (!result.files.some((f) => f.path === selectedPath)) {
      const preferred =
        result.files.find((f) => f.category === "screen") ?? result.files[0];
      if (preferred) setSelectedPath(preferred.path);
    }
  }, [open, result.files, selectedPath]);

  if (!open) return null;

  const activeFile =
    result.files.find((f) => f.path === selectedPath) ??
    result.files.find((f) => f.category === "screen") ??
    result.files[0];

  const handleCopy = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in restricted browser contexts
    }
  };

  const handleDownloadFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.shortName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const codeLines = activeFile ? activeFile.content.split("\n") : [];
  const warningCount = result.diagnostics.filter((d) => d.severity === "warning").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.48)" }}
      onClick={onClose}
    >
      <div
        data-testid="compose-export-modal"
        className="w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl border"
        style={{
          backgroundColor: palette.surfaceContainerLow,
          borderColor: palette.outlineVariant,
          borderRadius: shapes.extraLarge,
          color: palette.onSurface,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-9 h-9 flex items-center justify-center shrink-0"
              style={{
                borderRadius: shapes.medium,
                backgroundColor: palette.primaryContainer,
                color: palette.onPrimaryContainer,
              }}
            >
              <Icon name="android" size={20} fill />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Kotlin + Jetpack Compose Export</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 uppercase"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: m3Expressive ? palette.tertiaryContainer : palette.secondaryContainer,
                    color: m3Expressive ? palette.onTertiaryContainer : palette.onSecondaryContainer,
                  }}
                >
                  {m3Expressive ? "M3 Expressive Alpha" : "Hybrid Stable M3"}
                </span>
              </div>
              <p className="text-xs truncate" style={{ color: palette.onSurfaceVariant }}>
                {result.packageName} • {result.files.length} generated .kt files • {project.screens.length} screens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold cursor-pointer select-none"
              style={{
                borderRadius: shapes.full,
                backgroundColor: palette.surfaceContainerHigh,
                color: palette.onSurface,
              }}
            >
              <input
                type="checkbox"
                data-testid="compose-m3e-toggle"
                checked={m3Expressive}
                onChange={(e) => setM3Expressive(e.target.checked)}
              />
              <span>M3 Expressive Alpha APIs</span>
            </label>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="m3-press w-8 h-8 flex items-center justify-center border-0 bg-transparent cursor-pointer"
              style={{ borderRadius: shapes.full, color: palette.onSurfaceVariant }}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Diagnostics Banner */}
        {result.diagnostics.length > 0 && (
          <div
            className="px-5 py-2 border-b flex flex-wrap items-center gap-x-4 gap-y-1 text-xs shrink-0"
            style={{
              borderColor: palette.outlineVariant,
              backgroundColor: warningCount > 0 ? palette.errorContainer : palette.surfaceContainer,
              color: warningCount > 0 ? palette.onErrorContainer : palette.onSurfaceVariant,
            }}
          >
            {result.diagnostics.map((diag, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Icon
                  name={diag.severity === "warning" ? "warning" : "info"}
                  size={15}
                  color={diag.severity === "warning" ? palette.error : palette.primary}
                />
                <span>{diag.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Split Explorer + Code Viewer */}
        <div className="flex-1 min-h-0 grid grid-cols-[250px_1fr]">
          {/* Left File Tree */}
          <aside
            className="no-scrollbar overflow-y-auto border-r p-3 space-y-4"
            style={{
              borderColor: palette.outlineVariant,
              backgroundColor: palette.surfaceContainerLowest,
            }}
          >
            {CATEGORY_ORDER.map((cat) => {
              const items = result.files.filter((f) => f.category === cat.key);
              if (items.length === 0) return null;
              return (
                <div key={cat.key} className="space-y-1">
                  <div
                    className="px-2 text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: palette.onSurfaceVariant }}
                  >
                    {cat.label}
                  </div>
                  {items.map((file) => {
                    const active = activeFile?.path === file.path;
                    return (
                      <button
                        key={file.path}
                        type="button"
                        data-testid={`kotlin-file-${file.shortName}`}
                        onClick={() => {
                          setSelectedPath(file.path);
                          setCopied(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 text-left text-xs font-medium border-0 cursor-pointer transition-colors"
                        style={{
                          borderRadius: shapes.small,
                          backgroundColor: active ? palette.secondaryContainer : "transparent",
                          color: active ? palette.onSecondaryContainer : palette.onSurface,
                        }}
                      >
                        <Icon
                          name={cat.key === "theme" ? "palette" : cat.key === "screen" ? "smartphone" : "account_tree"}
                          size={15}
                          color={active ? palette.onSecondaryContainer : palette.primary}
                        />
                        <span className="truncate">{file.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </aside>

          {/* Right Source Code Pane */}
          <section className="flex flex-col min-h-0">
            <div
              className="px-4 py-2 border-b flex items-center justify-between gap-3 shrink-0"
              style={{
                borderColor: palette.outlineVariant,
                backgroundColor: palette.surfaceContainer,
              }}
            >
              <span className="text-xs font-mono truncate" style={{ color: palette.onSurfaceVariant }}>
                {activeFile?.path}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="m3-press flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: palette.surfaceContainerHighest,
                    color: palette.onSurface,
                  }}
                >
                  <Icon name="download" size={14} />
                  <span>Download .kt</span>
                </button>
                <button
                  type="button"
                  data-testid="copy-kotlin-file"
                  onClick={handleCopy}
                  className="m3-press flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: palette.primary,
                    color: palette.onPrimary,
                  }}
                >
                  <Icon name={copied ? "check" : "content_copy"} size={14} />
                  <span>{copied ? "Copied" : "Copy File"}</span>
                </button>
              </div>
            </div>

            <div
              className="no-scrollbar flex-1 min-h-0 overflow-auto p-4"
              style={{ backgroundColor: palette.surfaceContainerLowest }}
            >
              <pre
                data-testid="kotlin-code-viewer"
                className="m-0 font-mono text-xs leading-relaxed"
                style={{ color: palette.onSurface }}
              >
                {codeLines.map((line, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span
                      className="w-7 text-right select-none shrink-0 opacity-45"
                      aria-hidden="true"
                    >
                      {idx + 1}
                    </span>
                    <span className="whitespace-pre">{line || " "}</span>
                  </div>
                ))}
              </pre>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 border-t flex items-center justify-between text-xs shrink-0"
          style={{
            borderColor: palette.outlineVariant,
            backgroundColor: palette.surfaceContainer,
          }}
        >
          <span style={{ color: palette.onSurfaceVariant }}>
            Phase 6 Compiler • Full Gradle Android Studio .zip packaging arrives in Phase 7
          </span>
          <button
            type="button"
            onClick={onClose}
            className="m3-press px-4 py-1.5 text-xs font-semibold border-0 cursor-pointer"
            style={{
              borderRadius: shapes.full,
              backgroundColor: palette.secondaryContainer,
              color: palette.onSecondaryContainer,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
