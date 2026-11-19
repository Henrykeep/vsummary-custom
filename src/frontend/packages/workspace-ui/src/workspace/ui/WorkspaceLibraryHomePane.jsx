import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpDown,
  Check,
  ChevronRight,
  Layers,
  Link2,
  ListChecks,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { blurVariant, staggerContainer } from "../../lib/animations";
import { isBilibiliInboxSeries, isPlaygroundSeries } from "../model/workspaceControllerConstants";
import { useWorkspaceRuntime } from "../../runtime/WorkspaceProvider";
import { WorkspaceCover, formatDuration } from "./shared/WorkspaceCover";
import { WorkspaceSelectionBar } from "./shared/WorkspaceSelectionControls";

const QUEUED_JOB_STATUSES = new Set(["queued", "retrying"]);
const RUNNING_JOB_STATUSES = new Set(["running", "cancelling"]);
const SORTS = [{ id: "recent", label: "最近更新" }, { id: "title", label: "名称" }];

/**
 * Video jobs that are queued or running. The list endpoint carries no progress, so the home page only
 * says "排队中" or "处理中"; when a job leaves the list the library is reloaded to pick up its result.
 */
function useActiveVideoJobs(enabled, onJobFinished) {
  const { api } = useWorkspaceRuntime();
  const [jobs, setJobs] = useState([]);
  const finishedRef = useRef(onJobFinished);
  finishedRef.current = onJobFinished;
  useEffect(() => {
    if (!enabled || typeof api.loadJobs !== "function") {
      setJobs([]);
      return undefined;
    }
    let cancelled = false;
    let timer = null;
    let previous = new Set();
    const tick = async () => {
      let delay = 20000;
      try {
        if (typeof document === "undefined" || document.visibilityState !== "hidden") {
          const result = await api.loadJobs({ limit: 50 });
          if (cancelled) return;
          const active = (result?.items ?? []).filter((job) => job.resource?.type === "video"
            && (QUEUED_JOB_STATUSES.has(job.status) || RUNNING_JOB_STATUSES.has(job.status)));
          const ids = new Set(active.map((job) => job.job_id));
          if ([...previous].some((id) => !ids.has(id))) finishedRef.current?.();
          previous = ids;
          setJobs(active);
          if (active.length) delay = 5000;
        }
      } catch {
        delay = 30000;
      }
      if (!cancelled) timer = setTimeout(tick, delay);
    };
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, enabled]);
  return jobs;
}

function videoStage(video, jobState) {
  if (jobState) return jobState;
  if (video.processed) return "processed";
  if (video.status === "source_missing") return "missing";
  if (video.status === "linked" || video.isLinked) return "linked";
  return "pending";
}

const STAGE_LABELS = { running: "处理中", queued: "排队中", processed: "已生成", linked: "仅链接", missing: "链接丢失", pending: "待生成" };

function latestUpdate(series) {
  return series.videos.reduce((latest, video) => (video.updatedAt > latest ? video.updatedAt : latest), "");
}

function coverOf(series) {
  return series.videos.find((video) => video.coverUrl)?.coverUrl ?? "";
}

function describeSeries(series, jobStates) {
  const total = series.videos.length;
  const processed = series.videos.filter((video) => video.processed).length;
  const active = series.videos.filter((video) => jobStates.has(video.id)).length;
  const linked = series.videos.filter((video) => !video.processed && (video.status === "linked" || video.isLinked)).length;
  return { total, processed, active, linked };
}

const LINK_PLACEHOLDER = "粘贴 B站、YouTube 或抖音链接，视频或合集链接皆可";

/** The link input with the upload button inside it, shared by the start screen and the library. */
function LinkField({ url, onChange, onUpload, large = false }) {
  return (
    <div className="relative min-w-0 flex-1">
      <Link2 size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-faint" />
      <input
        // Share sheets paste "【标题】 https://…", which type="url" rejects before submit; the
        // server extracts the link from the text. inputMode keeps the URL keyboard on phones.
        type="text"
        inputMode="url"
        autoComplete="off"
        value={url}
        onChange={(event) => onChange(event.target.value)}
        placeholder={LINK_PLACEHOLDER}
        aria-label="视频链接"
        className={`w-full rounded-[18px] border border-transparent bg-muted/85 pl-11 text-[16px] text-strong outline-none transition-colors placeholder:text-faint hover:bg-soft focus:border-accent/45 focus:bg-surface focus:ring-4 focus:ring-accent/10 sm:text-[15px] ${onUpload ? "pr-14" : "pr-4"} ${large ? "h-14" : "h-12"}`}
      />
      {onUpload ? (
        <button
          type="button"
          onClick={onUpload}
          aria-label="上传本地视频或音频"
          className="group/upload absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-faint transition-colors hover:bg-surface hover:text-strong"
        >
          <Upload size={18} />
          <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] right-0 whitespace-nowrap rounded-lg bg-inverse px-2.5 py-1 text-xs font-medium text-on-inverse opacity-0 transition-opacity group-hover/upload:opacity-100 group-focus-visible/upload:opacity-100">
            上传本地视频或音频
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** Compact link field shown above a non-empty library (hosts that import by link). */
function LinkBar({ onStart, onUpload }) {
  const [url, setUrl] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (url.trim()) {
      onStart(url.trim());
      setUrl("");
    }
  };
  return (
    <form onSubmit={submit} className="flex w-full gap-2 rounded-[24px] border border-line/70 bg-surface p-1.5 shadow-[0_0_0_0.5px_rgba(0,0,0,0.035),0_2px_10px_rgba(0,0,0,0.025)]">
      <LinkField url={url} onChange={setUrl} onUpload={onUpload} />
      <button type="submit" disabled={!url.trim()} className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-[18px] bg-accent px-5 text-sm font-semibold text-on-accent shadow-none transition-colors hover:bg-accent/90 active:bg-accent/80 disabled:bg-softer disabled:text-ghost">
        添加 <ArrowRight size={15} />
      </button>
    </form>
  );
}

/** Hosts without link import (Local) open their own import panel from a field-shaped button. */
function AddBar({ onAdd }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex h-14 w-full items-center gap-3 rounded-[22px] border border-line/70 bg-surface pl-4 pr-1.5 text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.035),0_2px_10px_rgba(0,0,0,0.025)] transition-colors hover:border-accent/30 hover:bg-muted/35"
    >
      <Plus size={17} className="shrink-0 text-faint transition-colors group-hover:text-accent" />
      <span className="min-w-0 flex-1 truncate text-[16px] text-faint sm:text-[15px]">添加系列：贴链接、选本地文件或导入课程</span>
      <span className="inline-flex h-10 shrink-0 items-center rounded-[16px] bg-accent px-4 text-sm font-semibold text-on-accent">添加</span>
    </button>
  );
}

/**
 * First screen for hosts that import by link (Cloud): one input instead of a choice between
 * "video" and "series" — the import preview resolves either kind from the same URL.
 */
function StartFromLink({ onStart, onUpload, hint, extra }) {
  const [url, setUrl] = useState("");
  const submit = (event) => {
    event.preventDefault();
    if (url.trim()) onStart(url.trim());
  };
  return (
    <motion.section variants={blurVariant} className="mx-auto flex w-full max-w-3xl flex-col items-center pt-[14dvh] text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-accent/10 text-accent">
        <Layers size={28} strokeWidth={1.8} />
      </span>
      <h2 className="max-w-2xl text-[32px] font-semibold leading-[1.12] tracking-[-0.035em] text-strong md:text-[44px]">把视频变成能检索、能提问的笔记</h2>
      <p className="mt-4 max-w-xl text-[15px] leading-6 text-subtle md:text-base">粘贴一个链接，或导入本地视频。字幕、概括、导图与原话检索会整理在一起。</p>
      <form onSubmit={submit} className="mt-8 flex w-full flex-col gap-2 sm:flex-row">
        <LinkField url={url} onChange={setUrl} onUpload={onUpload} large />
        <button type="submit" disabled={!url.trim()} className="inline-flex h-14 items-center justify-center gap-1.5 rounded-[18px] bg-accent px-6 text-sm font-semibold text-on-accent shadow-none transition-colors hover:bg-accent/90 active:bg-accent/80 disabled:bg-softer disabled:text-ghost">
          开始 <ArrowRight size={15} />
        </button>
      </form>
      {hint ? <p className="mt-3 text-sm text-faint">{hint}</p> : null}
      {extra ? <div className="mt-8 w-full">{extra}</div> : null}
    </motion.section>
  );
}

function StartWithoutLink({ onAdd }) {
  return (
    <motion.section variants={blurVariant} className="mx-auto flex w-full max-w-3xl flex-col items-center pt-[14dvh] text-center">
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-[22px] bg-accent/10 text-accent">
        <Layers size={28} strokeWidth={1.8} />
      </span>
      <h2 className="max-w-2xl text-[32px] font-semibold leading-[1.12] tracking-[-0.035em] text-strong md:text-[44px]">把视频变成能检索、能提问的笔记</h2>
      <p className="mt-4 max-w-xl text-[15px] leading-6 text-subtle md:text-base">导入一个合集、几个本地文件或一门课程，处理后就能看概括、查原话、向内容提问。</p>
      <div className="mt-8 w-full"><AddBar onAdd={onAdd} /></div>
    </motion.section>
  );
}

function RunningStrip({ jobs, videoIndex }) {
  const items = jobs.map((job) => ({ job, entry: videoIndex.get(job.resource.id) })).filter((item) => item.entry);
  if (!items.length) return null;
  return (
    <motion.section variants={blurVariant} className="flex flex-col gap-2 rounded-[22px] border border-line/70 bg-surface p-2.5 sm:flex-row sm:items-center" aria-label="正在处理">
      <span className="flex shrink-0 items-center gap-2 px-2 text-sm font-semibold text-strong">
        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-accent" /></span>
        处理中 {items.length}
      </span>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {items.slice(0, 4).map(({ job, entry }) => {
          const queued = QUEUED_JOB_STATUSES.has(job.status);
          return (
            <div key={job.job_id} className="flex min-w-[240px] flex-1 items-center gap-3 rounded-[16px] bg-muted/75 px-2.5 py-2">
              <div className="h-9 w-16 shrink-0 overflow-hidden rounded-[10px]"><WorkspaceCover url={entry.video.coverUrl} seed={entry.video.id} iconSize={14} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-body">{entry.video.title}</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-accent/15">
                  <div className={`h-full rounded-full bg-accent ${queued ? "w-1/12 opacity-40" : "workspace-progress-indeterminate w-1/3"}`} />
                </div>
              </div>
              <span className="shrink-0 pr-1 text-xs font-medium text-faint">{queued ? "排队中" : "处理中"}</span>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

function StageBadge({ stage }) {
  if (stage === "running" || stage === "queued") {
    return <span className="absolute left-2.5 top-2.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-on-accent">{STAGE_LABELS[stage]}</span>;
  }
  if (stage === "linked" || stage === "missing") {
    return <span className="absolute left-2.5 top-2.5 rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-strong shadow-[0_1px_6px_rgba(0,0,0,0.12)] backdrop-blur-xl">{STAGE_LABELS[stage]}</span>;
  }
  return null;
}

function ProgressLine({ processed, total }) {
  return (
    <span className="inline-flex h-1 w-12 overflow-hidden rounded-full bg-softer align-middle">
      <span className="h-full rounded-full bg-accent" style={{ width: `${total ? (processed / total) * 100 : 0}%` }} />
    </span>
  );
}

function SelectMark({ selected }) {
  return (
    <span className={`absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm transition-colors ${selected ? "border-accent bg-accent text-on-accent" : "border-white bg-black/20 text-transparent backdrop-blur"}`}>
      <Check size={14} strokeWidth={3} />
    </span>
  );
}

function CardShell({ onClick, label, selectable = false, selected = false, cover, title, meta }) {
  return (
    <motion.button
      type="button"
      variants={blurVariant}
      onClick={onClick}
      aria-label={label}
      aria-pressed={selectable ? selected : undefined}
      className="group relative flex min-w-0 flex-col rounded-[24px] border border-line/60 bg-surface p-2.5 text-left shadow-[0_0_0_0.5px_rgba(0,0,0,0.025),0_2px_12px_rgba(0,0,0,0.035)] outline-none transition-[background-color,box-shadow,transform] duration-200 hover:bg-muted/30 hover:shadow-[0_0_0_0.5px_rgba(0,0,0,0.04),0_8px_26px_rgba(0,0,0,0.075)] active:scale-[0.992] focus-visible:ring-4 focus-visible:ring-accent/20"
    >
      <div className="relative w-full">
        <div className={`relative aspect-video w-full overflow-hidden rounded-[18px] bg-soft transition-all duration-300 ${selected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}>
          {cover}
          {selectable ? <SelectMark selected={selected} /> : null}
        </div>
      </div>
      <div className="px-1.5 pb-1.5 pt-3">
        <strong className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-strong">{title}</strong>
        <span className="mt-1.5 flex min-h-4 items-center gap-2 text-xs text-faint">{meta}</span>
      </div>
    </motion.button>
  );
}

function CornerTag({ children }) {
  return <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-[8px] bg-black/55 px-2 py-1 text-[11px] font-semibold tabular-nums text-white backdrop-blur-md">{children}</span>;
}

function describeSeriesPresentation(series, jobStates) {
  const counts = describeSeries(series, jobStates);
  const single = series.videos.length === 1 ? series.videos[0] : null;
  const stage = single ? videoStage(single, jobStates.get(single.id)) : counts.active ? "running" : null;
  return { counts, single, stage, coverUrl: coverOf(series) };
}

function SeriesCard({ series, jobStates, selecting, selected, onOpen, onToggle }) {
  const { counts, single, stage, coverUrl } = describeSeriesPresentation(series, jobStates);
  const cover = (
    <>
      <WorkspaceCover url={coverUrl} seed={series.id} imageClassName="transition-transform duration-500 group-hover:scale-[1.04]" />
      {single && (stage === "linked" || stage === "missing") ? <span className="absolute inset-0 bg-white/35 dark:bg-black/35" /> : null}
      {stage ? <StageBadge stage={stage} /> : null}
      {single ? (formatDuration(single.durationSeconds) ? <CornerTag>{formatDuration(single.durationSeconds)}</CornerTag> : null)
        : <CornerTag><Layers size={12} /> {counts.total} 个视频</CornerTag>}
    </>
  );
  let meta;
  if (single) {
    meta = <span>{STAGE_LABELS[stage]}</span>;
  } else if (counts.total === 0) {
    meta = <span>还没有视频</span>;
  } else {
    meta = <>
      <span>已生成 {counts.processed} / {counts.total}</span>
      <ProgressLine processed={counts.processed} total={counts.total} />
      {counts.active ? <span className="font-medium text-accent">{counts.active} 个处理中</span> : null}
    </>;
  }
  return (
    <CardShell
      onClick={() => (selecting ? onToggle(series.id) : onOpen(series.id))}
      label={selecting ? `选择 ${series.title}` : `打开 ${series.title}`}
      selectable={selecting}
      selected={selected}
      cover={cover}
      title={series.title}
      meta={meta}
    />
  );
}

/**
 * Phones use a grouped list rather than a one-card-per-screen gallery. The
 * reference here is Apple Notes / Granola: title and status stay primary, while
 * the cover becomes a small visual anchor on the trailing edge. This keeps more
 * series visible without losing progress or the active-work signal.
 */
function SeriesMobileRow({ series, jobStates, selecting, selected, onOpen, onToggle }) {
  const { counts, single, stage, coverUrl } = describeSeriesPresentation(series, jobStates);
  return (
    <button
      type="button"
      onClick={() => (selecting ? onToggle(series.id) : onOpen(series.id))}
      aria-label={selecting ? `选择 ${series.title}` : `打开 ${series.title}`}
      aria-pressed={selecting ? selected : undefined}
      className={`group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 ${
        selected ? "bg-accent/8" : "active:bg-muted/70"
      }`}
    >
      <span className="min-w-0 flex-1">
        <strong className="line-clamp-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-strong">
          {series.title}
        </strong>
        <span className="mt-1.5 flex min-h-4 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
          {single ? (
            <span>{STAGE_LABELS[stage]}</span>
          ) : (
            <>
              <span>已生成 {counts.processed} / {counts.total}</span>
              <ProgressLine processed={counts.processed} total={counts.total} />
            </>
          )}
          {counts.active ? <span className="font-medium text-accent">{counts.active} 个处理中</span> : null}
        </span>
      </span>
      <div className="relative h-[52px] w-[88px] shrink-0 overflow-hidden rounded-[12px] bg-soft">
        <WorkspaceCover
          url={coverUrl}
          seed={series.id}
          imageClassName="transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {single && (stage === "linked" || stage === "missing") ? <span className="absolute inset-0 bg-white/35 dark:bg-black/35" /> : null}
        {stage ? <StageBadge stage={stage} /> : null}
        {single
          ? formatDuration(single.durationSeconds)
            ? <CornerTag>{formatDuration(single.durationSeconds)}</CornerTag>
            : null
          : <CornerTag><Layers size={11} /> {counts.total}</CornerTag>}
      </div>
      {selecting ? (
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${selected ? "border-accent bg-accent text-on-accent" : "border-line-strong text-transparent"}`}>
          <Check size={14} strokeWidth={3} />
        </span>
      ) : (
        <ChevronRight size={17} className="shrink-0 text-ghost transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      )}
    </button>
  );
}

/** B站导入 and Playground hold unrelated videos, so their cover is a mosaic rather than one image. */
function BasketCard({ series, label, accentClassName, jobStates, onOpen }) {
  const counts = describeSeries(series, jobStates);
  const recent = [...series.videos].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)).slice(0, 4);
  const cover = (
    <>
      <div className={`grid h-full w-full gap-0.5 bg-surface ${recent.length >= 4 ? "grid-cols-2 grid-rows-2" : recent.length >= 2 ? "grid-cols-2" : ""}`}>
        {recent.map((video) => (
          <div key={video.id} className="min-h-0 overflow-hidden"><WorkspaceCover url={video.coverUrl} seed={video.id} iconSize={18} imageClassName="transition-transform duration-500 group-hover:scale-[1.04]" /></div>
        ))}
      </div>
      <span className={`absolute left-2.5 top-2.5 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm ${accentClassName}`}>{label}</span>
      <CornerTag>{counts.total} 个视频</CornerTag>
    </>
  );
  return (
    <CardShell
      onClick={() => onOpen(series.id)}
      label={`打开${label}`}
      cover={cover}
      title={label}
      meta={<>
        <span>已生成 {counts.processed} / {counts.total}</span>
        <ProgressLine processed={counts.processed} total={counts.total} />
        {counts.active ? <span className="font-medium text-accent">{counts.active} 个处理中</span> : null}
      </>}
    />
  );
}

function BasketMobileRow({ series, label, accentClassName, jobStates, onOpen }) {
  const counts = describeSeries(series, jobStates);
  const recent = [...series.videos].sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1)).slice(0, 4);
  return (
    <button
      type="button"
      onClick={() => onOpen(series.id)}
      aria-label={`打开${label}`}
      className="group flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors active:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
    >
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[15px] font-semibold text-strong">{label}</strong>
        <span className="mt-1.5 flex items-center gap-2 text-xs text-faint">
          <span>已生成 {counts.processed} / {counts.total}</span>
          <ProgressLine processed={counts.processed} total={counts.total} />
        </span>
      </span>
      <div className="relative h-[52px] w-[88px] shrink-0 overflow-hidden rounded-[12px] bg-soft">
        <div className={`grid h-full w-full gap-0.5 bg-surface ${recent.length >= 4 ? "grid-cols-2 grid-rows-2" : recent.length >= 2 ? "grid-cols-2" : ""}`}>
          {recent.map((video) => (
            <div key={video.id} className="min-h-0 overflow-hidden">
              <WorkspaceCover url={video.coverUrl} seed={video.id} iconSize={14} />
            </div>
          ))}
        </div>
        <span className={`absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${accentClassName}`} aria-hidden="true" />
      </div>
      <ChevronRight size={17} className="shrink-0 text-ghost transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </button>
  );
}

/** Kept in the first slot before the browser extension has added anything, so users know it exists. */
function InboxPlaceholderCard({ comingSoon }) {
  return (
    <motion.div variants={blurVariant} className="hidden min-w-0 flex-col sm:flex">
      <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-[1.5px] border-dashed border-line-strong bg-muted/70 px-6 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fb7299] text-sm font-black text-white shadow-sm">B</span>
        <p className="text-sm leading-relaxed text-faint">在 B站看视频时，用浏览器扩展<br />一键加到这里</p>
        {comingSoon ? <span className="absolute left-2.5 top-2.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-faint">即将支持</span> : null}
      </div>
      <strong className="mt-3 text-[15px] font-semibold text-strong">B站导入</strong>
      <span className="mt-1 text-xs text-faint">浏览器扩展加入的视频会放在这里</span>
    </motion.div>
  );
}

function InboxPlaceholderMobileRow({ comingSoon }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span className="min-w-0 flex-1">
        <strong className="block text-[15px] font-semibold text-strong">B站导入</strong>
        <span className="mt-1 block text-xs leading-relaxed text-faint">浏览器扩展加入的视频会放在这里</span>
      </span>
      <div className="relative flex h-[52px] w-[88px] shrink-0 items-center justify-center rounded-[12px] border border-dashed border-line-strong bg-muted/70">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#fb7299] text-xs font-black text-white shadow-sm">B</span>
        {comingSoon ? <span className="absolute left-1.5 top-1.5 rounded-full border border-line bg-surface px-1.5 py-0.5 text-[9px] font-medium text-faint">即将支持</span> : null}
      </div>
    </div>
  );
}

function SelectionBar({ selectedCount, totalCount, onSelectAll, onClear, onDelete }) {
  return (
    <AnimatePresence>
      {selectedCount > 0 ? (
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
          className="sticky bottom-4 z-20 mx-auto w-full max-w-md"
        >
          <WorkspaceSelectionBar
            surface="raised"
            label="批量选择系列"
            selectedCount={selectedCount}
            totalCount={totalCount}
            onSelectAll={onSelectAll}
            onClear={onClear}
            extra={
              <button type="button" onClick={onDelete} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-danger-subtle px-3 py-1.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/15">
                <Trash2 size={14} /> 删除
              </button>
            }
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function WorkspaceLibraryHomePane({
  library,
  onSelectSeries,
  onAddSeries,
  onRefreshLibrary,
  onRequestBulkDelete,
  linkStart = null,
  showPlayground = true,
  inboxComingSoon = false,
}) {
  const allSeries = library?.series ?? [];
  const inbox = allSeries.find(isBilibiliInboxSeries) ?? null;
  const playground = allSeries.find(isPlaygroundSeries) ?? null;
  const regularSeries = allSeries.filter((item) => !isBilibiliInboxSeries(item) && !isPlaygroundSeries(item));
  const totalVideos = allSeries.reduce((count, item) => count + item.videos.length, 0);
  const empty = totalVideos === 0 && regularSeries.length === 0;

  const jobs = useActiveVideoJobs(!empty, onRefreshLibrary);
  const jobStates = useMemo(() => new Map(jobs.map((job) => [job.resource.id, QUEUED_JOB_STATUSES.has(job.status) ? "queued" : "running"])), [jobs]);
  const videoIndex = useMemo(() => {
    const index = new Map();
    for (const series of allSeries) for (const video of series.videos) index.set(video.id, { series, video });
    return index;
  }, [allSeries]);

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSeries = useMemo(() => {
    const matches = normalizedQuery
      ? regularSeries.filter((series) => [series.title, ...series.videos.map((video) => video.title)]
        .some((value) => value?.toLowerCase().includes(normalizedQuery)))
      : regularSeries;
    return [...matches].sort(sort === "title"
      ? (a, b) => a.title.localeCompare(b.title, "zh-CN")
      : (a, b) => (latestUpdate(b) > latestUpdate(a) ? 1 : latestUpdate(b) < latestUpdate(a) ? -1 : 0));
  }, [regularSeries, normalizedQuery, sort]);
  const seriesIdsKey = regularSeries.map((series) => series.id).join("\u0000");
  useEffect(() => {
    const available = new Set(regularSeries.map((series) => series.id));
    setSelectedIds((current) => current.filter((id) => available.has(id)));
  }, [seriesIdsKey]);
  const toggleSelected = (id) => setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const stopSelecting = () => {
    setSelecting(false);
    setSelectedIds([]);
  };

  // Dropping media anywhere on the home page opens the upload with those files already picked.
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const acceptsDrop = Boolean(linkStart?.onUploadFiles);
  const hasFiles = (event) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
  const dropHandlers = acceptsDrop ? {
    onDragEnter: (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    },
    onDragOver: (event) => {
      if (hasFiles(event)) event.preventDefault();
    },
    onDragLeave: () => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    },
    onDrop: (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length) linkStart.onUploadFiles(files);
    },
  } : {};

  const showInboxCard = Boolean(inbox?.videos.length);
  const showPlaygroundCard = showPlayground && Boolean(playground?.videos.length);
  const showInboxPlaceholder = !showInboxCard && !normalizedQuery && !selecting;

  return (
    <div className="relative z-10 h-full min-w-0 flex-1" {...dropHandlers}>
    <motion.section
      key="library-home:pane"
      variants={blurVariant}
      initial={false}
      animate="animate"
      exit="exit"
      className="h-full w-full overflow-y-auto"
    >
      <motion.div variants={staggerContainer} initial={false} animate="animate" className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-20 pt-6 sm:px-5 md:gap-6 md:px-10 md:pt-10">
        {empty ? (
          linkStart
            ? <StartFromLink onStart={linkStart.onStart} onUpload={linkStart.onUpload} hint={linkStart.hint} extra={linkStart.extra} />
            : <StartWithoutLink onAdd={onAddSeries} />
        ) : (
          <>
            <motion.header variants={blurVariant} className="flex flex-col gap-4">
              <div>
                <h2 className="text-[32px] font-semibold leading-[1.08] tracking-[-0.035em] text-strong md:text-[40px]">我的系列</h2>
                <p className="mt-2 text-[15px] text-subtle">{regularSeries.length} 个系列 · {totalVideos} 个视频</p>
              </div>
              <div className="flex w-full items-center gap-2">
                <div className="relative min-w-0 flex-1 sm:max-w-md">
                  <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索系列或视频"
                    aria-label="搜索系列或视频"
                    className="workspace-search-input h-11 w-full rounded-[16px] border border-transparent bg-muted/85 pl-10 pr-3 text-[16px] text-body outline-none transition-colors placeholder:text-faint hover:bg-soft focus:border-accent/40 focus:bg-surface focus:ring-4 focus:ring-accent/10 sm:h-10 sm:text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSort((current) => current === "recent" ? "title" : "recent")}
                  aria-label={`排序方式：${SORTS.find((option) => option.id === sort)?.label}。点击切换`}
                  title={`排序方式：${SORTS.find((option) => option.id === sort)?.label}`}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-line/70 bg-surface text-subtle transition-colors hover:bg-muted hover:text-strong sm:hidden"
                >
                  <ArrowUpDown size={17} />
                </button>
                {onRequestBulkDelete && regularSeries.length ? (
                  <button
                    type="button"
                    onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                    aria-label={selecting ? "完成批量管理" : "批量管理"}
                    aria-pressed={selecting}
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border transition-colors sm:hidden ${
                      selecting
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "border-line/70 bg-surface text-subtle hover:bg-muted hover:text-strong"
                    }`}
                  >
                    {selecting ? <Check size={17} strokeWidth={2.4} /> : <ListChecks size={17} />}
                  </button>
                ) : null}
                <div className="workspace-home-sort-group hidden h-10 shrink-0 items-center rounded-[16px] bg-soft p-1 sm:flex" role="group" aria-label="排序">
                  {SORTS.map((option) => (
                    <button key={option.id} type="button" onClick={() => setSort(option.id)} aria-pressed={sort === option.id}
                      className={`workspace-home-sort-option h-8 rounded-[12px] px-3.5 text-xs font-semibold transition-colors ${sort === option.id ? "bg-surface text-strong shadow-[0_1px_4px_rgba(0,0,0,0.10)]" : "text-subtle hover:text-strong"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {onRequestBulkDelete && regularSeries.length ? (
                  <button type="button" onClick={() => (selecting ? stopSelecting() : setSelecting(true))}
                    className={`workspace-bulk-toggle hidden h-10 shrink-0 items-center justify-center gap-1.5 rounded-[16px] border px-3.5 text-xs font-semibold transition-colors sm:inline-flex ${selecting ? "border-accent/30 bg-accent/10 text-accent" : "border-line/70 bg-surface text-subtle hover:border-line-strong hover:text-strong"}`}>
                    {selecting ? <><X size={13} /> 完成</> : "批量管理"}
                  </button>
                ) : null}
              </div>
            </motion.header>

            <motion.div variants={blurVariant}>
              {linkStart ? <LinkBar onStart={linkStart.onStart} onUpload={linkStart.onUpload} /> : <AddBar onAdd={onAddSeries} />}
            </motion.div>

            <RunningStrip jobs={jobs} videoIndex={videoIndex} />

            <div className="overflow-hidden rounded-[22px] border border-line/70 bg-surface shadow-[0_0_0_0.5px_rgba(0,0,0,0.025)] sm:hidden" aria-label="系列列表">
              <div className="divide-y divide-line/60">
                {showInboxCard && !selecting ? (
                  <BasketMobileRow series={inbox} label="B站导入" accentClassName="bg-[#fb7299]" jobStates={jobStates} onOpen={onSelectSeries} />
                ) : showInboxPlaceholder ? <InboxPlaceholderMobileRow comingSoon={inboxComingSoon} /> : null}
                {showPlaygroundCard && !selecting ? (
                  <BasketMobileRow series={playground} label="单个视频" accentClassName="bg-inverse" jobStates={jobStates} onOpen={onSelectSeries} />
                ) : null}
                {visibleSeries.map((series) => (
                  <SeriesMobileRow
                    key={series.id}
                    series={series}
                    jobStates={jobStates}
                    selecting={selecting}
                    selected={selectedIds.includes(series.id)}
                    onOpen={onSelectSeries}
                    onToggle={toggleSelected}
                  />
                ))}
              </div>
            </div>

            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-3 xl:grid-cols-4" aria-label="系列列表">
              {showInboxCard && !selecting ? (
                <BasketCard series={inbox} label="B站导入" accentClassName="bg-[#fb7299]" jobStates={jobStates} onOpen={onSelectSeries} />
              ) : showInboxPlaceholder ? <InboxPlaceholderCard comingSoon={inboxComingSoon} /> : null}
              {showPlaygroundCard && !selecting ? (
                <BasketCard series={playground} label="单个视频" accentClassName="bg-inverse" jobStates={jobStates} onOpen={onSelectSeries} />
              ) : null}
              {visibleSeries.map((series) => (
                <SeriesCard
                  key={series.id}
                  series={series}
                  jobStates={jobStates}
                  selecting={selecting}
                  selected={selectedIds.includes(series.id)}
                  onOpen={onSelectSeries}
                  onToggle={toggleSelected}
                />
              ))}
            </motion.div>
            {normalizedQuery && !visibleSeries.length ? (
              <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-faint">没有找到「{query.trim()}」相关的系列或视频。</p>
            ) : null}

            {selecting ? (
              <SelectionBar
                selectedCount={selectedIds.length}
                totalCount={visibleSeries.length}
                onSelectAll={() => setSelectedIds(visibleSeries.map((series) => series.id))}
                onClear={() => setSelectedIds([])}
                onDelete={() => onRequestBulkDelete?.(selectedIds)}
              />
            ) : null}
          </>
        )}
      </motion.div>
    </motion.section>
    {/* Outside the scrolling section so it covers the visible page however far it is scrolled. */}
    <AnimatePresence>
      {dragging ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-30 flex p-3"
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-accent/60 bg-surface/85 text-center backdrop-blur-sm">
            <Upload size={26} className="text-accent" />
            <p className="text-base font-semibold text-accent">松手开始上传</p>
            <p className="text-sm text-accent/80">视频或音频文件，可以一次放多个</p>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
    </div>
  );
}
