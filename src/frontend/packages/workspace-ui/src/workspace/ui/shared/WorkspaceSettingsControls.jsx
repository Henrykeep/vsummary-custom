import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useOutsidePointerUp } from "../../../shared/lib/useOutsidePointerUp";

export function WorkspaceProviderSelect({
  value,
  onChange,
  options,
  className = "",
  disabled = false,
  hideGroupLabels = false,
  ariaLabel,
  optionLayout = "vertical",
  menuClassName = "",
  align = "start",
  triggerVariant = "default",
  leading = null,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();
  const selected = options.find((o) => o.id === value);

  // Build ordered group list, preserving first-seen order
  const groups = [];
  const groupMap = {};
  for (const opt of options) {
    const g = opt.group ?? "其他";
    if (!groupMap[g]) { groupMap[g] = []; groups.push(g); }
    groupMap[g].push(opt);
  }

  useOutsidePointerUp(open, [ref], () => setOpen(false));

  useEffect(() => {
    if (!open) {
      return;
    }
    const items = Array.from(menuRef.current?.querySelectorAll('[role="option"]:not([disabled])') ?? []);
    const selectedItem = items.find((item) => item.getAttribute("aria-selected") === "true");
    (selectedItem ?? items[0])?.focus();
  }, [open]);

  function selectOption(option) {
    onChange(option.id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleListboxKeyDown(event) {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="option"]:not([disabled])') ?? []);
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
    } else if (event.key === "Escape" || event.key === "Tab") {
      if (event.key === "Escape") {
        event.preventDefault();
      }
      setOpen(false);
      triggerRef.current?.focus();
      if (event.key === "Tab") {
        event.preventDefault();
      }
      return;
    } else {
      return;
    }
    event.preventDefault();
    items[nextIndex]?.focus();
  }

  function renderOption(option, horizontal = false) {
    const active = option.id === value;
    return (
      <button
        key={option.id}
        type="button"
        role="option"
        aria-selected={active}
        disabled={option.disabled}
        title={option.disabled ? option.disabledReason || option.label : undefined}
        onClick={() => selectOption(option)}
        className={horizontal
          ? `flex min-w-0 flex-col items-center justify-center rounded-xl px-3 py-2.5 text-center transition-colors hover:bg-soft/80 disabled:cursor-not-allowed disabled:opacity-45 ${active ? "bg-accent/10 text-accent dark:bg-accent/15" : "text-strong"}`
          : `group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-soft/80 disabled:cursor-not-allowed disabled:opacity-45 ${active ? "bg-accent/10 dark:bg-accent/15" : ""}`}
      >
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-sm ${active ? "font-semibold text-accent" : "font-medium text-body"}`}>
            {option.label}
          </span>
          {option.description && (
            <span className={`mt-0.5 block text-xs leading-snug text-faint ${horizontal ? "text-center" : ""}`}>
              {option.description}
            </span>
          )}
        </span>
        <Check
          size={15}
          strokeWidth={2.5}
          aria-hidden="true"
          className={`shrink-0 text-accent transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
        />
      </button>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={
          triggerVariant === "bare"
            ? `flex h-full w-full items-center justify-between gap-2 bg-transparent px-3 py-2 text-left text-sm text-strong outline-none transition-colors focus-visible:bg-soft/80 focus-visible:text-strong focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${open ? "text-accent" : "hover:bg-soft/80"}`
            : `flex w-full items-center justify-between gap-2 rounded-xl border bg-surface px-3.5 py-2 text-left text-sm text-strong outline-none transition-colors focus-visible:border-accent/40 focus-visible:ring-2 focus-visible:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                open
                  ? "border-accent/40 ring-2 ring-accent/20 dark:border-accent/40"
                  : "border-line hover:border-line-strong"
              }`
        }
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {leading ? <span className="shrink-0 text-faint">{leading}</span> : null}
          <span className="truncate font-medium">{selected?.label ?? value}</span>
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-faint transition-transform duration-200 ${open ? "rotate-180 text-accent" : ""}`}
        />
      </button>

      {open && (
        <div
          id={menuId}
          ref={menuRef}
          role="listbox"
          onKeyDown={handleListboxKeyDown}
          className={`absolute top-full z-50 mt-2 min-w-full max-w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line/90 bg-surface p-1.5 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.18),0_2px_6px_-2px_rgba(15,23,42,0.08)] motion-fade-scale dark:shadow-[0_8px_28px_-6px_rgba(0,0,0,0.6)] ${
            align === "end" ? "right-0" : "left-0"
          } max-h-80 ${menuClassName}`}
        >
          {optionLayout === "horizontal" ? (
            <div className="grid grid-cols-3 gap-1">
              {options.map((option) => renderOption(option, true))}
            </div>
          ) : groups.map((group, gi) => (
            <div key={group}>
              {gi > 0 && <div className="mx-1.5 my-1 border-t border-line-soft" />}
              {!hideGroupLabels ? (
                <div className="px-2.5 pb-1 pt-2 text-xs font-bold uppercase tracking-widest text-faint">
                  {group}
                </div>
              ) : null}
              {groupMap[group].map((option) => renderOption(option))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const settingRowLayouts = {
  responsive: { row: "flex-col 2xl:flex-row 2xl:items-center", label: "2xl:w-[260px] 2xl:shrink-0", content: "justify-end", defaultContent: "2xl:w-auto 2xl:min-w-0" },
  stacked: { row: "flex-col", label: "", content: "justify-start", defaultContent: "" },
  // Small controls (switches) sit on the label's line instead of a row of their own.
  inline: { row: "flex-row items-center", label: "flex-1", content: "justify-end", defaultContent: "w-auto shrink-0" },
};

export function WorkspaceSettingRow({ title, description, children, layout = "responsive", contentClassName = "" }) {
  const classes = settingRowLayouts[layout];
  if (!classes) throw new Error(`Unsupported WorkspaceSettingRow layout: ${layout}`);
  const contentLayoutClassName = contentClassName || classes.defaultContent;

  return (
    <div className={`flex min-w-0 justify-between gap-4 rounded-[20px] border border-line/70 bg-surface p-4 shadow-[0_0_0_0.5px_rgba(0,0,0,0.02)] transition-colors md:p-5 ${classes.row}`}>
      <div className={`min-w-0 max-w-none ${classes.label}`}>
        <strong className="mb-1 block text-[15px] font-semibold tracking-[-0.01em] text-strong">{title}</strong>
        <span className="block text-[13px] leading-relaxed text-subtle">{description}</span>
      </div>
      <div className={`flex min-w-0 items-center ${layout === "inline" ? "" : "w-full"} ${classes.content} ${contentLayoutClassName}`}>{children}</div>
    </div>
  );
}

export function WorkspaceAdvancedSettings({ children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-2xl border border-line/80 bg-surface/60 p-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-soft/80"
      >
        <span>
          <strong className="block text-sm font-bold text-strong">高级设置</strong>
          <span className="mt-0.5 block text-xs leading-relaxed text-subtle">进一步控制性能与成本，不确定时保持默认即可。</span>
        </span>
        <ChevronDown size={18} className={`shrink-0 text-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="space-y-3 px-1 pb-1 pt-2">{children}</div> : null}
    </section>
  );
}

export function WorkspaceToggleSwitch({ checked, disabled = false, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-accent" : "bg-softer"
      }`}
      onClick={() => onChange(!checked)}
      aria-label={ariaLabel}
      aria-pressed={checked}
    >
      <span
        className={`pointer-events-none inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow-[0_2px_5px_rgba(0,0,0,0.18)] ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-[20px]" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export function WorkspaceSegmentedControl({ value, options, onChange, className = "" }) {
  const columnsClass =
    options.length === 2
      ? "grid-cols-2"
      : options.length === 3
      ? "grid-cols-3"
      : "grid-cols-4";
  return (
    <div className={`grid w-full min-w-0 ${columnsClass} rounded-xl bg-soft p-1 ${className}`} role="group">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            disabled={option.disabled}
            title={option.disabled ? option.disabledReason || option.label : option.label}
            className={`min-w-0 rounded-lg px-2 py-1.5 text-xs sm:text-xs md:text-sm font-medium leading-5 transition-colors disabled:cursor-not-allowed disabled:opacity-45 text-center ${
              active
                ? "bg-surface text-strong shadow-sm"
                : "text-subtle hover:text-body"
            }`}
            onClick={() => onChange(option.id)}
          >
            <span className="block truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Multi-toggle pill group for settings.
 *
 * Rendered as a segmented rail (same surface, padding and radius as
 * `WorkspaceSegmentedControl`) so it reads as the multi-select sibling of the
 * single-choice control instead of a row of loose checkboxes. Selection is
 * carried by the raised white chip + accent text, and the check icon is the
 * only thing that changes between states — no layout shift on toggle.
 */
export function WorkspaceMultiSelect({ values, options, onChange, className = "" }) {
  const selectedValues = Array.isArray(values) ? values : [];

  function toggle(optionId) {
    onChange(selectedValues.includes(optionId)
      ? selectedValues.filter((value) => value !== optionId)
      : [...selectedValues, optionId]);
  }

  return (
    <div
      className={`flex w-full min-w-0 flex-wrap items-center gap-1 rounded-xl bg-soft p-1 ${className}`}
      role="group"
      aria-label="多选项"
    >
      {options.map((option) => {
        const selected = selectedValues.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={selected}
            title={option.label}
            onClick={() => toggle(option.id)}
            className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium leading-5 transition-colors sm:text-sm ${
              selected
                ? "bg-surface text-strong shadow-sm"
                : "text-subtle hover:text-body"
            }`}
          >
            <Check
              size={13}
              strokeWidth={3}
              aria-hidden="true"
              className={`shrink-0 transition-opacity ${selected ? "opacity-100 text-accent" : "opacity-0"}`}
            />
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function WorkspaceTextInput({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  className = "",
  type = "text",
  ...inputProps
}) {
  return (
    <input
      {...inputProps}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`max-w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-strong outline-none focus:border-accent ${className}`}
    />
  );
}

export function WorkspaceSelect({
  value,
  onChange,
  options,
  className = "",
  disabled = false,
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`max-w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-strong outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
