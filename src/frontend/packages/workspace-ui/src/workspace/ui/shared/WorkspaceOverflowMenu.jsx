import { createPortal } from "react-dom";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { useOutsidePointerUp } from "../../../shared/lib/useOutsidePointerUp";

/** A shared overflow menu that escapes scroll containers through a portal. */
export function WorkspaceOverflowMenu({
  open,
  onOpenChange,
  disabled = false,
  label = "更多操作",
  placement = "top",
  menuClassName = "min-w-[148px]",
  triggerContent = null,
  triggerClassName = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-faint transition-colors hover:bg-soft hover:text-body disabled:cursor-not-allowed disabled:opacity-50",
  children,
}) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const focusedOnOpenRef = useRef(false);
  const menuId = useId();
  const [position, setPosition] = useState(null);

  const getMenuItems = () => Array.from(
    menuRef.current?.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])') ?? [],
  );

  const updatePosition = () => {
    const bounds = triggerRef.current?.getBoundingClientRect();
    const menuBounds = menuRef.current?.getBoundingClientRect();
    if (!bounds || !menuBounds) {
      return;
    }
    const edge = 16;
    const gap = 8;
    const spaceBelow = window.innerHeight - bounds.bottom - gap - edge;
    const spaceAbove = bounds.top - gap - edge;
    const fitsBelow = spaceBelow >= menuBounds.height;
    const fitsAbove = spaceAbove >= menuBounds.height;
    const openAbove = placement === "top"
      ? fitsAbove || (!fitsBelow && spaceAbove >= spaceBelow)
      : !fitsBelow && (fitsAbove || spaceAbove > spaceBelow);
    const availableHeight = Math.max(96, openAbove ? spaceAbove : spaceBelow);

    setPosition({
      left: Math.max(edge, Math.min(bounds.right - menuBounds.width,
        window.innerWidth - menuBounds.width - edge)),
      vertical: openAbove
        ? { bottom: window.innerHeight - bounds.top + gap }
        : { top: bounds.bottom + gap },
      maxHeight: availableHeight,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, placement]);

  useEffect(() => {
    if (!open) {
      focusedOnOpenRef.current = false;
      return;
    }
    if (!position || focusedOnOpenRef.current) {
      return;
    }
    focusedOnOpenRef.current = true;
    const items = getMenuItems();
    items.forEach((item) => {
      if (!item.hasAttribute("role")) {
        item.setAttribute("role", "menuitem");
      }
    });
    items[0]?.focus();
  }, [open, position]);

  function handleMenuKeyDown(event) {
    const items = getMenuItems();
    const currentIndex = items.indexOf(document.activeElement);
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown") {
      nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = items.length - 1;
    } else if (event.key === "Escape") {
      event.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus();
      return;
    } else if (event.key === "Tab") {
      onOpenChange(false);
      triggerRef.current?.focus();
      event.preventDefault();
      return;
    } else {
      return;
    }
    event.preventDefault();
    items[nextIndex]?.focus();
  }

  useOutsidePointerUp(open, [triggerRef, menuRef], () => onOpenChange(false));

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => onOpenChange(!open)}
        className={triggerClassName}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
      >
        {triggerContent ?? <MoreHorizontal size={18} />}
      </button>
      {open ? createPortal(
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={label}
          onKeyDown={handleMenuKeyDown}
          className={`fixed z-[70] overflow-y-auto overscroll-contain ${menuClassName} rounded-2xl border border-line bg-surface p-1 shadow-xl motion-fade-scale`}
          style={{ left: position?.left, ...position?.vertical, maxHeight: position?.maxHeight,
            maxWidth: 'calc(100vw - 32px)',
            visibility: position ? 'visible' : 'hidden' }}
        >
          {children}
        </div>,
        document.body,
      ) : null}
    </>
  );
}
