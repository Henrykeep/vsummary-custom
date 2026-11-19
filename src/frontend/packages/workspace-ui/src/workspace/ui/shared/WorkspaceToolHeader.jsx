import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Sparkles } from "lucide-react";
import { useOutsidePointerUp } from "../../../shared/lib/useOutsidePointerUp";
import { WorkspaceBackButton } from "./WorkspaceBackButton";

export function WorkspaceToolHeader({
  meta,
  onBack,
  parentLabel = "工具页",
  parentShortLabel = "工具",
  exportActions = [],
  badge = null,
  aiGenerated = false,
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <WorkspaceBackButton
          onClick={onBack}
          label={`返回${parentLabel}`}
          variant="breadcrumb"
          visibleLabel={parentLabel}
          compactLabel={parentShortLabel}
        />
        {exportActions.length ? (
          <div className="ml-auto flex shrink-0 items-center">
            <WorkspaceExportMenu exportActions={exportActions} />
          </div>
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.03em] text-strong @[480px]:text-[28px]">{meta?.label}</h1>
          {/* Generated content is labelled as such (AI 生成合成内容标识办法). */}
          {aiGenerated ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
              <Sparkles size={12} /> AI 生成
            </span>
          ) : null}
          {badge ? (
            <span className="inline-flex shrink-0 items-center rounded-full border border-line bg-soft/80 px-2.5 py-0.5 text-xs font-semibold text-subtle">
              {badge}
            </span>
          ) : null}
        </div>
        {meta?.description ? (
          <p className="mt-1 text-sm text-subtle @[480px]:mt-2">{meta.description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function WorkspaceExportMenu({ exportActions, buttonLabel = "导出" }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const enabledActions = exportActions.filter((action) => action.enabled);
  const disabledReason = exportActions.find((action) => !action.enabled)?.disabledReason ?? "当前内容不可导出";
  const disabled = enabledActions.length === 0;
  const className = "inline-flex h-7 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-2 text-xs font-semibold transition";

  useOutsidePointerUp(open, [menuRef], () => setOpen(false));

  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title={disabledReason}
        className={`${className} workspace-export-trigger cursor-not-allowed text-faint opacity-50`}
      >
        <Download size={14} />
        {buttonLabel}
        <ChevronDown size={13} />
      </button>
    );
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`${buttonLabel}当前内容`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${className} workspace-export-trigger text-subtle hover:bg-soft hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40`}
      >
        <Download size={14} />
        {buttonLabel}
        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div role="menu" aria-label={`${buttonLabel}选项`} className="workspace-elevated-panel absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-2xl border p-1 shadow-xl">
          {exportActions.map((action) => action.enabled ? (
            <a
              key={action.href}
              href={action.href}
              download
              role="menuitem"
              onClick={() => setOpen(false)}
              className="workspace-export-item flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-body transition hover:bg-soft hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <Download size={15} />
              {action.label ?? "导出 MD"}
            </a>
          ) : (
            <button
              key={action.href}
              type="button"
              disabled
              role="menuitem"
              title={action.disabledReason ?? "当前内容不可导出"}
              className="workspace-export-item flex w-full cursor-not-allowed items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-faint opacity-60"
            >
              <Download size={15} />
              {action.label ?? "导出 MD"}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
