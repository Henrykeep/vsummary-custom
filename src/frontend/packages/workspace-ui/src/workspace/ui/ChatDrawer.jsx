import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

import { useFocusTrap } from "../../shared/lib/useFocusTrap";
import { WorkspaceChatPanel } from "./WorkspaceChatPanel";

export function ChatDrawer({ isOpen, onClose, width, onWidthChange, fullWidth = false, restoreFocusRef = null, ...chatPanelProps }) {
  const drawerRef = useRef(null);
  useFocusTrap(drawerRef, isOpen, { focusFirstField: false, returnFocusRef: restoreFocusRef });

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    function handleKey(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  function beginResize(startEvent) {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    const startX = startEvent.clientX;
    const startWidth = width;

    function handlePointerMove(event) {
      onWidthChange(startWidth + startX - event.clientX);
    }

    function handlePointerUp() {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }

  function handleResizeKeyDown(event) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onWidthChange(width + 32);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      onWidthChange(width - 32);
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            className="fixed inset-0 z-30 bg-black/20"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            aria-hidden="true"
          />
          <motion.aside
            ref={drawerRef}
            id="workspace-chat-drawer"
            className={`workspace-panel fixed z-40 flex flex-col overflow-hidden shadow-[0_18px_60px_rgba(0,0,0,0.18)] ${fullWidth ? "inset-0" : "bottom-0 right-0 top-0 rounded-l-[28px] border-l border-line/70"}`}
            style={{ width: fullWidth ? "100%" : `min(${width}px, calc(100vw - 32px))` }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.22 }}
            role="dialog"
            aria-modal="true"
            aria-label="分析助手"
          >
            {!fullWidth ? (
              <div
                role="separator"
                tabIndex={0}
                aria-orientation="vertical"
                aria-label="调整分析助手宽度"
                onPointerDown={beginResize}
                onKeyDown={handleResizeKeyDown}
                className="group absolute -left-2 top-0 z-10 flex h-full w-4 cursor-col-resize touch-none items-center justify-center outline-none"
              >
                <div className="h-16 w-1 rounded-full bg-softer/90 transition-colors group-hover:bg-accent group-focus-visible:bg-accent dark:group-hover:bg-accent" />
              </div>
            ) : null}
            <div className="flex shrink-0 items-center gap-3 border-b border-line/70 px-4 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-accent/10 text-accent">
                <Sparkles size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-strong">分析助手</p>
                <p className="truncate text-[11px] text-faint">基于当前工作区上下文</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭对话"
                className="workspace-drawer-close inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soft text-subtle transition-colors hover:bg-softer hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <WorkspaceChatPanel {...chatPanelProps} />
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
