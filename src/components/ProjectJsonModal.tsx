import { useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";

interface ProjectJsonModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectJsonModal({ open, onClose }: ProjectJsonModalProps) {
  const { palette, shapes } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const exportProjectJson = useProjectStore((s) => s.exportProjectJson);
  const importProjectJson = useProjectStore((s) => s.importProjectJson);

  const [mode, setMode] = useState<"export" | "import">("export");
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && mode === "export") {
      setDraft(exportProjectJson());
      setError(null);
    }
  }, [open, mode, project, exportProjectJson]);

  if (!open) return null;

  const handleDownload = () => {
    const json = exportProjectJson();
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    const safeName = project.name.trim().replace(/[^a-z0-9-_]+/gi, "-").toLowerCase() || "m3-app";
    a.download = `${safeName}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportProjectJson());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  const handleImportSubmit = () => {
    const res = importProjectJson(draft);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    onClose();
  };

  const handleFilePick = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const res = importProjectJson(text);
    if (!res.ok) {
      setDraft(text);
      setMode("import");
      setError(res.error);
      return;
    }
    setError(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl border"
        style={{
          backgroundColor: palette.surfaceContainerLow,
          borderColor: palette.outlineVariant,
          borderRadius: shapes.extraLarge,
          color: palette.onSurface,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: palette.outlineVariant }}
        >
          <div className="flex items-center gap-2.5">
            <Icon name="code" size={22} color={palette.primary} />
            <div>
              <h2 className="text-base font-semibold">Project AST &amp; JSON</h2>
              <p className="text-xs" style={{ color: palette.onSurfaceVariant }}>
                Normalized Android Schema (v1) • Auto-saved to browser storage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center border-0 bg-transparent cursor-pointer"
            style={{ borderRadius: shapes.full, color: palette.onSurfaceVariant }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="px-5 pt-3 flex items-center justify-between gap-2">
          <div
            className="inline-flex p-1 gap-1"
            style={{ backgroundColor: palette.surfaceContainerHigh, borderRadius: shapes.full }}
          >
            {(["export", "import"] as const).map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setError(null);
                    setDraft(m === "export" ? exportProjectJson() : "");
                  }}
                  className="px-4 py-1 text-xs font-semibold border-0 cursor-pointer capitalize"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: active ? palette.secondaryContainer : "transparent",
                    color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
                  }}
                >
                  {m} JSON
                </button>
              );
            })}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              void handleFilePick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          <div className="flex items-center gap-2">
            {mode === "export" ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="m3-press flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: palette.secondaryContainer,
                    color: palette.onSecondaryContainer,
                  }}
                >
                  <Icon name={copied ? "check" : "content_copy"} size={15} />
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="m3-press flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: palette.primary,
                    color: palette.onPrimary,
                  }}
                >
                  <Icon name="download" size={15} />
                  Download .json
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="m3-press flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-0 cursor-pointer"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: palette.secondaryContainer,
                  color: palette.onSecondaryContainer,
                }}
              >
                <Icon name="upload_file" size={15} />
                Upload .json
              </button>
            )}
          </div>
        </div>

        <div className="p-5 flex-1 min-h-0 flex flex-col gap-3">
          {error && (
            <div
              className="px-3 py-2 text-xs font-medium flex items-center gap-2"
              style={{
                borderRadius: shapes.medium,
                backgroundColor: palette.errorContainer,
                color: palette.onErrorContainer,
              }}
            >
              <Icon name="error" size={16} />
              <span>{error}</span>
            </div>
          )}

          <textarea
            value={draft}
            readOnly={mode === "export"}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={mode === "import" ? "Paste exported project JSON here..." : ""}
            spellCheck={false}
            className="no-scrollbar w-full flex-1 min-h-[320px] p-3 font-mono text-[11px] leading-relaxed outline-none resize-none border"
            style={{
              backgroundColor: palette.surfaceContainerLowest,
              color: palette.onSurface,
              borderColor: palette.outlineVariant,
              borderRadius: shapes.medium,
            }}
          />

          {mode === "import" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!draft.trim()}
                className="m3-press px-4 py-2 text-xs font-semibold border-0 cursor-pointer disabled:opacity-40"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: palette.primary,
                  color: palette.onPrimary,
                }}
              >
                Import Project
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
