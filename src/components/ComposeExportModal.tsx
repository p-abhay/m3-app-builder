import { useEffect, useMemo, useState } from "react";
import { generateGradleProject, type GradleExportFile } from "@/codegen/gradle";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";

interface ComposeExportModalProps {
  open: boolean;
  onClose: () => void;
}

const CATEGORY_ORDER: { key: GradleExportFile["category"]; label: string; icon: string }[] = [
  { key: "screen", label: "Screens", icon: "smartphone" },
  { key: "navigation", label: "Navigation", icon: "account_tree" },
  { key: "app", label: "Entry Activity", icon: "account_tree" },
  { key: "theme", label: "M3 Theme Tokens", icon: "palette" },
  { key: "gradle", label: "Gradle & Build", icon: "build" },
  { key: "manifest", label: "Manifest", icon: "description" },
  { key: "resource", label: "Android Resources", icon: "folder" },
];

export function ComposeExportModal({ open, onClose }: ComposeExportModalProps) {
  const { palette, shapes } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const setPackageName = useProjectStore((s) => s.setPackageName);
  const setPersistenceBackend = useProjectStore((s) => s.setPersistenceBackend);
  const persistenceBackend = project.state?.persistenceBackend ?? "datastore";

  const [m3Expressive, setM3Expressive] = useState(false);
  const [minSdk, setMinSdk] = useState(26);
  const [targetSdk, setTargetSdk] = useState(35);
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const bundle = useMemo(
    () =>
      generateGradleProject(project, {
        m3Expressive,
        packageName: project.packageName,
        minSdk,
        targetSdk,
        compileSdk: Math.max(targetSdk, 35),
        persistenceBackend,
      }),
    [project, m3Expressive, minSdk, targetSdk, persistenceBackend],
  );

  useEffect(() => {
    if (!open) return;
    if (!bundle.files.some((f) => f.path === selectedPath)) {
      const preferred =
        bundle.files.find((f) => f.category === "screen") ?? bundle.files[0];
      if (preferred) setSelectedPath(preferred.path);
    }
  }, [open, bundle.files, selectedPath]);

  if (!open) return null;

  const activeFile =
    bundle.files.find((f) => f.path === selectedPath) ??
    bundle.files.find((f) => f.category === "screen") ??
    bundle.files[0];

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
    a.download = activeFile.shortName.split("/").pop() || "Export.kt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleDownloadZip = () => {
    const zipBytes = bundle.createZipBytes();
    const blob = new Blob([Uint8Array.from(zipBytes)], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bundle.projectSlug}-android-studio.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const codeLines = activeFile ? activeFile.content.split("\n") : [];
  const warningCount = bundle.compose.diagnostics.filter((d) => d.severity === "warning").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.48)" }}
      onClick={onClose}
    >
      <div
        data-testid="compose-export-modal"
        className="w-full max-w-5xl h-[86vh] flex flex-col overflow-hidden shadow-2xl border"
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
                {bundle.packageName} • {bundle.files.length} project files • {project.screens.length} screens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
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
              data-testid="download-gradle-zip"
              onClick={handleDownloadZip}
              className="m3-press flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold border-0 cursor-pointer"
              style={{
                borderRadius: shapes.full,
                backgroundColor: palette.primary,
                color: palette.onPrimary,
              }}
            >
              <Icon name="folder_zip" size={15} />
              <span>Download Android Studio .zip</span>
            </button>

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

        {/* Android Package & SDK Configuration Bar */}
        <div
          className="px-5 py-2.5 border-b flex flex-wrap items-center gap-4 text-xs shrink-0"
          style={{
            borderColor: palette.outlineVariant,
            backgroundColor: palette.surfaceContainer,
          }}
        >
          <label className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: palette.onSurfaceVariant }}>
              Package Name
            </span>
            <input
              type="text"
              data-testid="gradle-package-input"
              aria-label="Android Package Name"
              value={project.packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono border outline-none w-56"
              style={{
                borderRadius: shapes.small,
                backgroundColor: palette.surfaceContainerLowest,
                borderColor: palette.outlineVariant,
                color: palette.onSurface,
              }}
            />
          </label>

          {bundle.packageName !== project.packageName.trim() && (
            <span
              className="text-[11px] font-mono px-2 py-0.5"
              style={{
                borderRadius: shapes.small,
                backgroundColor: palette.secondaryContainer,
                color: palette.onSecondaryContainer,
              }}
            >
              normalized: {bundle.packageName}
            </span>
          )}

          <label className="flex items-center gap-1.5">
            <span className="font-semibold" style={{ color: palette.onSurfaceVariant }}>
              minSdk
            </span>
            <select
              data-testid="gradle-minsdk-select"
              aria-label="Minimum Android SDK"
              value={minSdk}
              onChange={(e) => setMinSdk(Number(e.target.value))}
              className="px-2 py-1 text-xs border outline-none"
              style={{
                borderRadius: shapes.small,
                backgroundColor: palette.surfaceContainerLowest,
                borderColor: palette.outlineVariant,
                color: palette.onSurface,
              }}
            >
              {[24, 26, 28, 30].map((v) => (
                <option key={v} value={v}>
                  API {v}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5">
            <span className="font-semibold" style={{ color: palette.onSurfaceVariant }}>
              targetSdk
            </span>
            <select
              data-testid="gradle-targetsdk-select"
              aria-label="Target Android SDK"
              value={targetSdk}
              onChange={(e) => setTargetSdk(Number(e.target.value))}
              className="px-2 py-1 text-xs border outline-none"
              style={{
                borderRadius: shapes.small,
                backgroundColor: palette.surfaceContainerLowest,
                borderColor: palette.outlineVariant,
                color: palette.onSurface,
              }}
            >
              {[34, 35, 36].map((v) => (
                <option key={v} value={v}>
                  API {v}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5">
            <span className="font-semibold" style={{ color: palette.onSurfaceVariant }}>
              storage
            </span>
            <select
              data-testid="gradle-storage-select"
              aria-label="Persistence Storage Backend"
              value={persistenceBackend}
              onChange={(e) =>
                setPersistenceBackend(e.target.value as "datastore" | "sharedPreferences")
              }
              className="px-2 py-1 text-xs border outline-none"
              style={{
                borderRadius: shapes.small,
                backgroundColor: palette.surfaceContainerLowest,
                borderColor: palette.outlineVariant,
                color: palette.onSurface,
              }}
            >
              <option value="datastore">DataStore</option>
              <option value="sharedPreferences">SharedPrefs</option>
            </select>
          </label>
        </div>

        {/* Diagnostics Banner */}
        {bundle.compose.diagnostics.length > 0 && (
          <div
            className="px-5 py-2 border-b flex flex-wrap items-center gap-x-4 gap-y-1 text-xs shrink-0"
            style={{
              borderColor: palette.outlineVariant,
              backgroundColor: warningCount > 0 ? palette.errorContainer : palette.surfaceContainerLow,
              color: warningCount > 0 ? palette.onErrorContainer : palette.onSurfaceVariant,
            }}
          >
            {bundle.compose.diagnostics.map((diag, idx) => (
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
        <div className="flex-1 min-h-0 min-w-0 grid grid-cols-[260px_minmax(0,1fr)]">
          {/* Left File Tree */}
          <aside
            className="no-scrollbar overflow-y-auto border-r p-3 space-y-4"
            style={{
              borderColor: palette.outlineVariant,
              backgroundColor: palette.surfaceContainerLowest,
            }}
          >
            {CATEGORY_ORDER.map((cat) => {
              const items = bundle.files.filter((f) => f.category === cat.key);
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
                          name={cat.icon}
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
          <section className="flex flex-col min-h-0 min-w-0 overflow-hidden">
            <div
              className="px-4 py-2 border-b flex items-center justify-between gap-3 shrink-0 min-w-0"
              style={{
                borderColor: palette.outlineVariant,
                backgroundColor: palette.surfaceContainer,
              }}
            >
              <span className="text-xs font-mono truncate min-w-0 flex-1" style={{ color: palette.onSurfaceVariant }}>
                {activeFile?.path}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  data-testid="download-single-file"
                  onClick={handleDownloadFile}
                  className="m3-press flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: palette.surfaceContainerHighest,
                    color: palette.onSurface,
                  }}
                >
                  <Icon name="download" size={14} />
                  <span>Download File</span>
                </button>
                <button
                  type="button"
                  data-testid="copy-kotlin-file"
                  onClick={handleCopy}
                  className="m3-press flex items-center gap-1.5 px-3 py-1 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: palette.secondaryContainer,
                    color: palette.onSecondaryContainer,
                  }}
                >
                  <Icon name={copied ? "check" : "content_copy"} size={14} />
                  <span>{copied ? "Copied" : "Copy File"}</span>
                </button>
              </div>
            </div>

            <div
              className="no-scrollbar flex-1 min-h-0 min-w-0 overflow-auto p-4"
              style={{ backgroundColor: palette.surfaceContainerLowest }}
            >
              <pre
                data-testid="kotlin-code-viewer"
                className="m-0 font-mono text-xs leading-relaxed w-max min-w-full"
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
            Android Studio Ladybug / Meerkat+ ready • Version Catalog + Compose Compiler Gradle plugin
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
