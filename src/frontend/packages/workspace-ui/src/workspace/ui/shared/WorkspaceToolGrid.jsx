import { useId } from "react";
import { ChevronRight, Lock } from "lucide-react";

/**
 * Status chip colours. Keys match the `tone` values returned by
 * `describeToolState` / `SOURCE_MISSING_STATUS` in workspaceToolMeta.js.
 */
const STATUS_TONES = {
  ready:
    "border-success-border/80 bg-success-subtle text-success",
  pending:
    "border-line bg-soft text-subtle",
  blocked:
    "border-warning-border/80 bg-warning-subtle text-warning",
  loading:
    "border-line bg-soft text-faint",
};

function ToolStatusChip({ id, label, tone }) {
  return (
    <span
      id={id}
      className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-semibold leading-4 @[460px]:order-last @[460px]:mt-1 ${
        STATUS_TONES[tone] ?? STATUS_TONES.pending
      }`}
    >
      {label}
    </span>
  );
}

export function WorkspaceToolGrid({ title, contextTitle, items, onSelect, focusTarget = false }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="@container min-w-0">
      <div className="mb-4">
        <h2
          id={headingId}
          tabIndex={focusTarget ? -1 : undefined}
          data-workspace-tool-index-heading={focusTarget ? "" : undefined}
          className="text-[22px] font-semibold leading-tight tracking-tight text-strong outline-none focus-visible:ring-2 focus-visible:ring-accent/40 @[460px]:text-2xl"
        >
          {title}
        </h2>
        {contextTitle ? <p className="mt-1 line-clamp-2 text-sm text-subtle [overflow-wrap:anywhere]" title={contextTitle}>{contextTitle}</p> : null}
      </div>
      <ul role="list" className="grid grid-cols-1 overflow-hidden rounded-2xl border border-line/70 bg-surface @[460px]:grid-cols-[repeat(auto-fit,minmax(14rem,1fr))] @[460px]:gap-3 @[460px]:overflow-visible @[460px]:rounded-none @[460px]:border-0 @[460px]:bg-transparent">
        {items.map(({ id, meta, status, description, disabled = false }, index) => {
          const Icon = meta.icon;
          const detailId = `${headingId}-${id}-detail`;
          const statusId = `${headingId}-${id}-status`;
          return (
            <li key={id} className="min-w-0 border-t border-line/70 first:border-t-0 @[460px]:border-t-0">
              <button
                type="button"
                data-workspace-tool={id}
                data-workspace-tool-status={status?.tone ?? (disabled ? "blocked" : "ready")}
                aria-label={meta.label}
                aria-describedby={status ? `${detailId} ${statusId}` : detailId}
                onClick={() => onSelect(id)}
                disabled={disabled}
                className={`motion-stagger group flex h-full min-h-[64px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent @[460px]:items-start @[460px]:rounded-2xl @[460px]:border @[460px]:p-4 ${
                  disabled ? "cursor-not-allowed bg-muted/40 @[460px]:border-dashed @[460px]:border-line-strong/80" : "bg-surface hover:bg-muted/50 @[460px]:border-line/70 @[460px]:shadow-sm @[460px]:hover:border-line-strong"
                }`}
                style={{ "--stagger-index": index }}
              >
                <span
                  aria-hidden="true"
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl @[460px]:h-10 @[460px]:w-10 ${disabled ? "bg-soft text-faint" : "bg-accent/10 text-accent"}`}
                >
                  <Icon size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className={`text-[15px] font-semibold leading-5 @[460px]:w-full ${disabled ? "text-subtle" : "text-strong"}`}>
                    {meta.label}
                  </span>
                  {status ? <ToolStatusChip id={statusId} {...status} /> : null}
                  <span id={detailId} className="min-w-0 basis-full text-xs leading-5 text-subtle">
                    {description ?? meta.description}
                  </span>
                </span>
                {disabled ? <Lock size={15} aria-hidden="true" className="shrink-0 text-faint" /> : <ChevronRight size={17} aria-hidden="true" className="motion-arrow-shift shrink-0 text-faint group-hover:text-accent" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
