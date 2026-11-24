import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "motion/react";
import { createNode } from "@/ast/factory";
import type { ComponentType, TransitionType } from "@/ast/types";
import { usePreviewStore } from "@/store/usePreviewStore";
import { useProjectStore } from "@/store/useProjectStore";
import { useM3Theme } from "@/theme/ThemeContext";
import { Icon } from "./Icon";
import { isNodeContainer, M3NodeRenderer } from "./canvas/M3Renderer";

const QUICK_ADD_ITEMS: { type: ComponentType; label: string; icon: string }[] = [
  { type: "Text", label: "Text", icon: "title" },
  { type: "Button", label: "Button", icon: "smart_button" },
  { type: "Card", label: "Card", icon: "crop_landscape" },
  { type: "TextField", label: "TextField", icon: "input" },
  { type: "Row", label: "Row", icon: "view_column" },
  { type: "Column", label: "Column", icon: "view_agenda" },
  { type: "ListItem", label: "ListItem", icon: "list" },
  { type: "Switch", label: "Switch", icon: "toggle_on" },
  { type: "FloatingActionButton", label: "FAB", icon: "add_circle" },
  { type: "TopAppBar", label: "TopBar", icon: "toolbar" },
];

function getScreenVariants(
  transitionType: TransitionType,
  isBack: boolean,
  expressive: boolean,
) {
  const spring = expressive
    ? { type: "spring" as const, stiffness: 360, damping: 28, mass: 0.9 }
    : { duration: 0.25, ease: [0.2, 0, 0, 1] as const };

  if (transitionType === "slide") {
    const enterX = isBack ? "-30%" : "100%";
    const exitX = isBack ? "100%" : "-30%";
    return {
      initial: { x: enterX, opacity: isBack ? 0.6 : 1 },
      animate: { x: 0, opacity: 1, transition: spring },
      exit: { x: exitX, opacity: isBack ? 1 : 0.6, transition: spring },
    };
  }
  if (transitionType === "fade") {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { duration: 0.2 } },
      exit: { opacity: 0, transition: { duration: 0.15 } },
    };
  }
  if (transitionType === "expand") {
    return {
      initial: { scale: 0.94, opacity: 0 },
      animate: { scale: 1, opacity: 1, transition: spring },
      exit: { scale: 1.04, opacity: 0, transition: spring },
    };
  }
  return {
    initial: { opacity: 1 },
    animate: { opacity: 1, transition: { duration: 0 } },
    exit: { opacity: 1, transition: { duration: 0 } },
  };
}

export function DevicePreview() {
  const { theme, palette, isDark, shapes } = useM3Theme();
  const project = useProjectStore((s) => s.project);
  const activeScreenId = useProjectStore((s) => s.activeScreenId);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const editorMode = useProjectStore((s) => s.editorMode);

  const setActiveScreen = useProjectStore((s) => s.setActiveScreen);
  const selectNode = useProjectStore((s) => s.selectNode);
  const insertNode = useProjectStore((s) => s.insertNode);
  const setSlotNode = useProjectStore((s) => s.setSlotNode);

  const navStack = usePreviewStore((s) => s.navStack);
  const isBack = usePreviewStore((s) => s.isBack);
  const snackbar = usePreviewStore((s) => s.snackbar);
  const goBack = usePreviewStore((s) => s.goBack);
  const switchTabScreen = usePreviewStore((s) => s.switchTabScreen);
  const resetPreview = usePreviewStore((s) => s.resetPreview);
  const dismissSnackbar = usePreviewStore((s) => s.dismissSnackbar);

  const [viewport, setViewport] = useState<"phone" | "tablet">("phone");

  const isPreview = editorMode === "preview";

  const { setNodeRef: setTopBarDropRef, isOver: isTopBarOver } = useDroppable({
    id: "slot:topBar",
    disabled: isPreview,
    data: { targetType: "slot", slot: "topBarId" },
  });

  const { setNodeRef: setFabDropRef, isOver: isFabOver } = useDroppable({
    id: "slot:fab",
    disabled: isPreview,
    data: { targetType: "slot", slot: "fabId" },
  });

  const currentNavEntry = isPreview ? navStack[navStack.length - 1] : undefined;
  const activeScreen =
    (currentNavEntry
      ? project.screens.find((s) => s.id === currentNavEntry.screenId)
      : project.screens.find((s) => s.id === activeScreenId)) ?? project.screens[0];

  if (!activeScreen) return null;

  const statusBarLightText =
    theme.systemBars.statusBarIcons === "light" ||
    (theme.systemBars.statusBarIcons === "auto" && isDark);

  const screenBgToken = activeScreen.backgroundToken ?? "surface";
  const screenBg = palette[screenBgToken] ?? palette.surface;

  const statusFg = theme.systemBars.edgeToEdge
    ? statusBarLightText
      ? "#FFFFFF"
      : "#1D1B20"
    : palette.onPrimary;

  const statusBg = theme.systemBars.edgeToEdge ? "transparent" : palette.primary;

  const showSharedBottomNav =
    project.bottomNav.enabled &&
    activeScreen.showBottomNav &&
    project.bottomNav.destinations.length > 0;

  const handleQuickAdd = (type: ComponentType) => {
    if (type === "FloatingActionButton") {
      setSlotNode("fabId", createNode("FloatingActionButton"));
      return;
    }
    if (type === "TopAppBar") {
      setSlotNode(
        "topBarId",
        createNode("TopAppBar", { props: { title: activeScreen.name } }),
      );
      return;
    }

    const selectedNode = selectedNodeId ? activeScreen.nodes[selectedNodeId] : undefined;
    const targetParentId = isNodeContainer(selectedNode)
      ? selectedNode!.id
      : activeScreen.slots.bodyId;

    insertNode(targetParentId, createNode(type));
  };

  const frameW = viewport === "tablet" ? 650 : 392;
  const frameH = 790;
  const frameRadius = viewport === "tablet" ? 28 : 42;
  const motionVariants = getScreenVariants(
    currentNavEntry?.transition ?? "none",
    isBack,
    theme.motion === "expressive",
  );

  const screenContent = (
    <div className="flex-1 min-h-0 flex flex-col relative">
      {/* Scaffold TopBar Drop Zone & Slot */}
      {isPreview ? (
        activeScreen.slots.topBarId && (
          <M3NodeRenderer screen={activeScreen} nodeId={activeScreen.slots.topBarId} />
        )
      ) : (
        <div ref={setTopBarDropRef} data-testid="dropzone-topbar" className="shrink-0">
          {activeScreen.slots.topBarId ? (
            <div
              style={{
                outline: isTopBarOver ? `2px dashed ${palette.primary}` : undefined,
                outlineOffset: "-2px",
              }}
            >
              <M3NodeRenderer screen={activeScreen} nodeId={activeScreen.slots.topBarId} />
            </div>
          ) : (
            <div
              className="mx-3 mt-1 h-7 flex items-center justify-center gap-1 text-[10px] font-medium border border-dashed"
              style={{
                borderRadius: shapes.small,
                borderColor: isTopBarOver ? palette.primary : palette.outlineVariant,
                backgroundColor: isTopBarOver ? `${palette.primaryContainer}55` : "transparent",
                color: isTopBarOver ? palette.primary : palette.onSurfaceVariant,
              }}
            >
              <Icon name="toolbar" size={13} />
              <span>TopAppBar Slot</span>
            </div>
          )}
        </div>
      )}

      {/* Scaffold Body Slot */}
      <M3NodeRenderer screen={activeScreen} nodeId={activeScreen.slots.bodyId} />

      {/* Scaffold Floating Action Button Drop Zone & Slot */}
      {isPreview ? (
        activeScreen.slots.fabId && (
          <div className="absolute right-4 bottom-4 z-20">
            <M3NodeRenderer screen={activeScreen} nodeId={activeScreen.slots.fabId} />
          </div>
        )
      ) : (
        <div ref={setFabDropRef} data-testid="dropzone-fab" className="absolute right-4 bottom-4 z-20">
          {activeScreen.slots.fabId ? (
            <div
              style={{
                outline: isFabOver ? `2px dashed ${palette.primary}` : undefined,
                borderRadius: shapes.large,
              }}
            >
              <M3NodeRenderer screen={activeScreen} nodeId={activeScreen.slots.fabId} />
            </div>
          ) : (
            <div
              className="w-12 h-12 flex flex-col items-center justify-center text-[9px] font-semibold border border-dashed"
              style={{
                borderRadius: shapes.large,
                borderColor: isFabOver ? palette.primary : palette.outlineVariant,
                backgroundColor: isFabOver
                  ? `${palette.primaryContainer}66`
                  : `${palette.surfaceContainer}aa`,
                color: isFabOver ? palette.primary : palette.onSurfaceVariant,
              }}
              title="Drop FAB here"
            >
              <Icon name="add_circle_outline" size={16} />
              <span>FAB</span>
            </div>
          )}
        </div>
      )}

      {/* Material 3 Snackbar Overlay (Preview Mode) */}
      {isPreview && snackbar && (
        <div
          data-testid="preview-snackbar"
          className="absolute left-3 right-3 bottom-3 z-30 px-4 py-2.5 flex items-center justify-between gap-2 shadow-xl"
          style={{
            borderRadius: shapes.extraSmall,
            backgroundColor: palette.inverseSurface,
            color: palette.inverseOnSurface,
          }}
        >
          <span className="text-xs font-medium truncate">{snackbar.message}</span>
          <button
            type="button"
            onClick={dismissSnackbar}
            className="text-xs font-bold border-0 bg-transparent cursor-pointer shrink-0"
            style={{ color: palette.inversePrimary }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col items-center py-3 gap-3 w-full my-auto">
      {/* Canvas Toolbar: Edit vs Preview */}
      {isPreview ? (
        <div
          data-testid="preview-toolbar"
          className="w-full max-w-[700px] flex flex-wrap items-center justify-between gap-2 px-1"
        >
          <div className="flex items-center gap-2">
            <div
              className="inline-flex p-1 gap-1"
              style={{
                backgroundColor: palette.surfaceContainerHigh,
                borderRadius: shapes.full,
              }}
            >
              {(
                [
                  { key: "phone", label: "Phone", icon: "smartphone" },
                  { key: "tablet", label: "Tablet", icon: "tablet_android" },
                ] as const
              ).map((vp) => {
                const active = viewport === vp.key;
                return (
                  <button
                    key={vp.key}
                    type="button"
                    onClick={() => setViewport(vp.key)}
                    className="m3-press flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: active ? palette.secondaryContainer : "transparent",
                      color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
                    }}
                  >
                    <Icon name={vp.icon} size={14} />
                    <span>{vp.label}</span>
                  </button>
                );
              })}
            </div>

            <span
              className="px-2.5 py-1 text-[11px] font-semibold"
              style={{
                borderRadius: shapes.full,
                backgroundColor: palette.primaryContainer,
                color: palette.onPrimaryContainer,
              }}
            >
              {activeScreen.name} (/{activeScreen.route})
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={navStack.length <= 1}
              onClick={goBack}
              className="m3-press flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer disabled:opacity-35"
              style={{
                borderRadius: shapes.full,
                backgroundColor: palette.surfaceContainerHigh,
                color: palette.onSurface,
              }}
            >
              <Icon name="arrow_back" size={14} />
              <span>Back</span>
            </button>
            <button
              type="button"
              data-testid="preview-reset"
              onClick={() => resetPreview(project.initialScreenId)}
              className="m3-press flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer"
              style={{
                borderRadius: shapes.full,
                backgroundColor: palette.secondaryContainer,
                color: palette.onSecondaryContainer,
              }}
            >
              <Icon name="refresh" size={14} />
              <span>Reset Preview</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[700px] flex flex-wrap items-center justify-between gap-2 px-1">
          {/* Phone vs Tablet Switcher */}
          <div
            className="inline-flex p-1 gap-1"
            style={{
              backgroundColor: palette.surfaceContainerHigh,
              borderRadius: shapes.full,
            }}
          >
            {(
              [
                { key: "phone", label: "Phone", icon: "smartphone" },
                { key: "tablet", label: "Tablet", icon: "tablet_android" },
              ] as const
            ).map((vp) => {
              const active = viewport === vp.key;
              return (
                <button
                  key={vp.key}
                  type="button"
                  onClick={() => setViewport(vp.key)}
                  className="m3-press flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold border-0 cursor-pointer"
                  style={{
                    borderRadius: shapes.full,
                    backgroundColor: active ? palette.secondaryContainer : "transparent",
                    color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
                  }}
                >
                  <Icon name={vp.icon} size={14} />
                  <span>{vp.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Add Components Strip */}
          <div className="flex flex-wrap items-center gap-1">
            {QUICK_ADD_ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                data-testid={`quick-add-${item.type}`}
                onClick={() => handleQuickAdd(item.type)}
                className="m3-press flex items-center gap-1 px-2 py-1 text-[11px] font-medium border-0 cursor-pointer"
                style={{
                  borderRadius: shapes.full,
                  backgroundColor: palette.surfaceContainerHigh,
                  color: palette.onSurface,
                }}
                title={`Add ${item.label}`}
              >
                <Icon name={item.icon} size={13} color={palette.primary} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Android Device Bezel */}
      <div
        data-testid="android-device-frame"
        onClick={() => {
          if (!isPreview) selectNode(null);
        }}
        className="relative flex flex-col overflow-hidden select-none shadow-2xl transition-colors duration-200"
        style={{
          width: frameW,
          height: frameH,
          borderRadius: frameRadius,
          backgroundColor: screenBg,
          color: palette.onSurface,
          border: `10px solid ${isDark ? "#232227" : "#1D1B20"}`,
        }}
      >
        {/* Android Status Bar */}
        <div
          className="h-8 px-6 flex items-center justify-between shrink-0 text-[11px] font-semibold z-20 transition-colors"
          style={{
            backgroundColor: statusBg,
            color: statusFg,
          }}
        >
          <span>9:41</span>
          <div className="w-3.5 h-3.5 rounded-full bg-black/85 border border-white/10" />
          <div className="flex items-center gap-1.5">
            <Icon name="signal_cellular_alt" size={14} color={statusFg} />
            <Icon name="wifi" size={14} color={statusFg} />
            <Icon name="battery_full" size={15} color={statusFg} />
          </div>
        </div>

        {/* Screen Body Area (with animated transitions in Preview mode) */}
        {isPreview ? (
          <div className="flex-1 min-h-0 flex flex-col relative overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeScreen.id}
                variants={motionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex-1 min-h-0 flex flex-col"
              >
                {screenContent}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          screenContent
        )}

        {/* Shared Bottom Navigation Bar */}
        {showSharedBottomNav && (
          <div
            data-testid="shared-bottom-nav"
            className="shrink-0 pt-2 pb-1 px-3 flex items-center justify-around"
            style={{
              backgroundColor: palette.surfaceContainer,
              borderTop: `1px solid ${palette.outlineVariant}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {project.bottomNav.destinations.map((dest) => {
              const active = dest.targetScreenId === activeScreen.id;
              return (
                <button
                  key={dest.id}
                  type="button"
                  onClick={() =>
                    isPreview
                      ? switchTabScreen(dest.targetScreenId)
                      : setActiveScreen(dest.targetScreenId)
                  }
                  className="flex flex-col items-center gap-1 py-1 px-3 border-0 bg-transparent cursor-pointer"
                  style={{ color: active ? palette.onSurface : palette.onSurfaceVariant }}
                >
                  <span
                    className="w-14 h-7 flex items-center justify-center transition-colors"
                    style={{
                      borderRadius: shapes.full,
                      backgroundColor: active ? palette.secondaryContainer : "transparent",
                      color: active ? palette.onSecondaryContainer : palette.onSurfaceVariant,
                    }}
                  >
                    <Icon name={dest.icon} size={20} fill={active} />
                  </span>
                  <span className="text-[11px] font-semibold">{dest.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Android System Navigation Chrome */}
        <div
          className="h-6 shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: theme.systemBars.edgeToEdge
              ? showSharedBottomNav
                ? palette.surfaceContainer
                : screenBg
              : palette.surfaceContainerHighest,
          }}
        >
          {theme.systemBars.navBarStyle === "gesture" ? (
            <div
              className="w-28 h-1 rounded-full"
              style={{ backgroundColor: palette.onSurface, opacity: 0.45 }}
            />
          ) : (
            <div className="flex items-center justify-around w-44 opacity-60">
              <button
                type="button"
                onClick={isPreview ? goBack : undefined}
                className="p-0.5 border-0 bg-transparent cursor-pointer"
                aria-label="System Back"
              >
                <Icon name="arrow_back" size={14} color={palette.onSurface} />
              </button>
              <Icon name="radio_button_unchecked" size={13} color={palette.onSurface} />
              <Icon name="crop_square" size={13} color={palette.onSurface} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
