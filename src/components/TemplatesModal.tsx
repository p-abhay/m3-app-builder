import { useState } from "react";
import { STARTER_TEMPLATES } from "@/ast/templates";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
}

export function TemplatesModal({ open, onClose }: TemplatesModalProps) {
  const { palette, shapes } = useM3Theme();
  const loadTemplate = useProjectStore((s) => s.loadTemplate);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden shadow-2xl border"
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
            <Icon name="dashboard_customize" size={22} color={palette.primary} />
            <div>
              <h2 className="text-base font-semibold">Starter App Templates</h2>
              <p className="text-xs" style={{ color: palette.onSurfaceVariant }}>
                Load a Material 3 Expressive project structure (undoable via Ctrl+Z)
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

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STARTER_TEMPLATES.map((tpl) => {
            const isConfirming = confirmId === tpl.id;
            return (
              <div
                key={tpl.id}
                data-testid={`template-card-${tpl.id}`}
                className="p-4 flex flex-col justify-between gap-3 border"
                style={{
                  backgroundColor: palette.surfaceContainer,
                  borderColor: isConfirming ? palette.primary : palette.outlineVariant,
                  borderRadius: shapes.large,
                }}
              >
                <div className="space-y-2">
                  <div
                    className="w-10 h-10 flex items-center justify-center"
                    style={{
                      borderRadius: shapes.medium,
                      backgroundColor: palette.primaryContainer,
                      color: palette.onPrimaryContainer,
                    }}
                  >
                    <Icon name={tpl.icon} size={20} fill />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{tpl.name}</div>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: palette.onSurfaceVariant }}>
                      {tpl.description}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!isConfirming) {
                      setConfirmId(tpl.id);
                      return;
                    }
                    loadTemplate(tpl.id);
                    setConfirmId(null);
                    onClose();
                  }}
                  className="m3-press w-full py-2 px-3 text-xs font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: isConfirming ? palette.primary : palette.secondaryContainer,
                    color: isConfirming ? palette.onPrimary : palette.onSecondaryContainer,
                  }}
                >
                  {isConfirming ? "Click again to load" : "Use Template"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
