import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { motion } from "framer-motion";

import { generationStageLabel, visibleGenerationSteps } from "../model/generationSteps";

function formatDurationLabel(value, fallback = "计算中") {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const totalSeconds = Math.max(0, Math.round(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}小时${remainingMinutes}分${seconds}秒`;
  }
  if (minutes > 0) {
    return `${minutes}分${seconds}秒`;
  }
  return `${seconds}秒`;
}

function formatPercent(value) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}%` : null;
}

function jobDisplayName(job) {
  if (!job) return "当前视频";
  return job.videoTitle || (job.videoId ? `视频 ${job.videoId}` : "当前视频");
}

function aggregateDetail(detail) {
  if (typeof detail !== "string") return null;
  return detail.split("；")[0] || null;
}

export function WorkspaceGenerationOverlay({
  generationProgress,
  generationSnapshot,
  title = "正在生成 AI 概括",
  mode = "summary",
  onCancel,
  cancelLabel = "取消",
}) {
  const [liveElapsedSeconds, setLiveElapsedSeconds] = useState(0);
  const localStartedAtRef = useRef(null);
  const stepsRef = useRef(null);
  const snapshot = generationSnapshot ?? {};
  const activeJobs = Array.isArray(snapshot.activeJobs)
    ? snapshot.activeJobs
    : Array.isArray(snapshot.active_jobs)
      ? snapshot.active_jobs
      : [];
  const total = typeof snapshot.total === "number" ? snapshot.total : null;
  const isBatch = total != null && total > 1;
  const steps = isBatch ? [] : visibleGenerationSteps(snapshot, mode);
  const activeCount = activeJobs.length;
  const focusVideo = snapshot.focusVideo ?? snapshot.focus_video ?? null;
  const progressValue = typeof generationProgress === "number"
    ? generationProgress
    : typeof snapshot.progress === "number"
      ? snapshot.progress
      : null;
  const isPreparing = !isBatch && ["queued", "claimed", "prepare", "preparing", "initialize"].includes(snapshot.stage);
  const hasRealGenerationProgress = progressValue != null && (isBatch || progressValue > 0) && !isPreparing;
  const generationProgressLabel = hasRealGenerationProgress
    ? formatPercent(progressValue)
    : isPreparing ? "准备中" : "进行中";
  const activeStageLabel = generationStageLabel(generationSnapshot?.stage);
  const finished = typeof snapshot.finished === "number" ? snapshot.finished : null;
  const batchCountParts = [
    ["succeeded", "成功"],
    ["failed", "失败"],
    ["running", "处理中"],
    ["queued", "排队"],
    ["cancelled", "已停止"],
  ].flatMap(([key, label]) => (
    typeof snapshot[key] === "number" && (key !== "cancelled" || snapshot[key] > 0)
      ? [`${label} ${snapshot[key]}`]
      : []
  ));
  const batchSummary = batchCountParts.length
    ? batchCountParts.join(" · ")
    : finished != null && total != null
      ? `已结束 ${finished}/${total}`
      : null;
  const batchHeadline =
    total != null
      ? `共 ${total} 个视频${finished != null ? ` · 已结束 ${finished}/${total}` : ""}`
      : aggregateDetail(snapshot.detail);
  const focusStageLabel = focusVideo ? generationStageLabel(focusVideo.stage) : null;
  const focusStageProgress = focusVideo ? formatPercent(focusVideo.stageProgress) : null;
  const focusJobProgress = focusVideo ? formatPercent(focusVideo.jobProgress) : null;
  const focusDetail = focusVideo?.detail ?? null;
  const headline = isBatch
    ? batchHeadline ?? "正在处理整个系列"
    : snapshot.detail ?? "任务已提交，正在准备处理视频";
  const aggregateLabel = isBatch ? "系列完成度" : activeStageLabel;
  useEffect(() => {
    if (stepsRef.current) stepsRef.current.scrollTop = stepsRef.current.scrollHeight;
  }, [generationSnapshot?.stage]);
  useEffect(() => {
    if (!["running", "cancelling"].includes(generationSnapshot?.status)) {
      localStartedAtRef.current = null;
      setLiveElapsedSeconds(0);
      return undefined;
    }
    if (localStartedAtRef.current === null) {
      localStartedAtRef.current = Date.now() / 1000;
    }
    const updateElapsed = () => {
      const snapshotElapsed = Number(generationSnapshot.elapsedSeconds) || 0;
      const startedAt = generationSnapshot.startedAt;
      const clockElapsed = typeof startedAt === "number" && Number.isFinite(startedAt) && startedAt > 0
        ? Math.max(0, Date.now() / 1000 - startedAt)
        : Math.max(0, Date.now() / 1000 - localStartedAtRef.current);
      setLiveElapsedSeconds(Math.max(snapshotElapsed, clockElapsed));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [generationSnapshot]);

  const elapsedLabel = formatDurationLabel(liveElapsedSeconds, "0秒");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-surface/40 p-3 backdrop-blur-[4px] pointer-events-auto"
    >
      <motion.div
        initial={{ scale: 0.9, y: 10 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9 }}
        transition={{ type: "spring", damping: 25, stiffness: 350 }}
        role="dialog" aria-modal="true" aria-label={title}
        className="flex max-h-full w-[380px] max-w-full flex-col items-center gap-3 overflow-hidden rounded-3xl border border-line/60 bg-surface/95 p-6 text-center shadow-2xl"
      >
        <LoaderCircle size={30} className="shrink-0 animate-spin text-accent" strokeWidth={2.5} />
        <div className="flex min-h-0 w-full flex-col">
          <h3 className="mb-1.5 text-base font-bold text-strong">{title}</h3>
          <p aria-live="polite" className="mb-2 text-sm font-medium text-subtle">
            {headline}
          </p>
          <p className="mb-3 text-xs font-bold text-accent">
            {aggregateLabel} · {generationProgressLabel}
          </p>
          <div role="progressbar" aria-label="生成流程进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hasRealGenerationProgress ? progressValue : undefined} aria-valuetext={aggregateLabel} className="relative shrink-0 h-1.5 w-full overflow-hidden rounded-full bg-softer/60">
            {hasRealGenerationProgress ? (
              <motion.div
                key="determinate"
                className="absolute inset-y-0 left-0 bg-accent"
                initial={{ width: `${progressValue}%` }}
                animate={{ width: `${progressValue}%` }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              />
            ) : (
              <motion.div
                key="indeterminate"
                className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-accent"
                initial={{ x: "-100%" }}
                animate={{ x: "300%" }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
              />
            )}
          </div>
          {isBatch && batchSummary && (
            <p aria-live="polite" className="mt-2 shrink-0 text-xs font-medium leading-relaxed text-subtle">
              {batchSummary}
            </p>
          )}
          {isBatch && focusVideo && (
            <p className="mt-1.5 shrink-0 text-left text-xs leading-relaxed text-faint">
              <span className="font-semibold text-body">焦点视频：{jobDisplayName(focusVideo)}</span>
              <span className="text-faint">
                {" · "}{focusStageLabel}
                {focusStageProgress ? ` · 当前步骤 ${focusStageProgress}` : ""}
                {focusJobProgress ? ` · 视频进度 ${focusJobProgress}` : ""}
              </span>
              {focusDetail && <span className="block">{focusDetail}</span>}
            </p>
          )}
          <div className="mt-3 flex shrink-0 items-center justify-between text-xs text-faint">
            <span><span>已耗时</span> {elapsedLabel}</span>
            {activeCount > 1 && <span>{activeCount} 个视频同时处理</span>}
          </div>
          <p className="mt-2 shrink-0 text-left text-xs leading-relaxed text-faint">进度随处理步骤更新，AI 阅读和生成内容时可能需要等待。</p>
          {isBatch ? activeJobs.length > 0 && (
            <ul aria-label="正在处理的视频" className="mt-3 flex min-h-0 flex-col gap-1.5 overflow-y-auto overscroll-contain">
              {activeJobs.slice(0, 5).map((job, index) => {
                const stagePercent = formatPercent(job.stageProgress);
                const jobPercent = formatPercent(job.jobProgress);
                return (
                  <li key={job.jobId ?? job.videoId ?? index} className="shrink-0 rounded-xl border border-accent/20 bg-accent/8 px-3 py-2 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-xs font-medium text-body">{jobDisplayName(job)}</span>
                      <span className="shrink-0 text-xs font-semibold text-accent">
                        {generationStageLabel(job.stage)}{stagePercent ? ` · ${stagePercent}` : ""}
                      </span>
                    </div>
                    {job.detail && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-faint">{job.detail}</p>}
                    {jobPercent && <p className="mt-1 text-[11px] leading-relaxed text-faint">视频进度 {jobPercent}</p>}
                  </li>
                );
              })}
              {activeJobs.length > 5 && (
                <li className="shrink-0 px-3 py-1 text-xs text-faint">另有 {activeJobs.length - 5} 个视频正在处理</li>
              )}
            </ul>
          ) : (
            <ol ref={stepsRef} aria-label="处理步骤" className="mt-3 flex min-h-0 flex-col gap-1.5 overflow-y-auto overscroll-contain">
              {steps.map((item) => {
                const isCurrent = item.status === "running";
                const isDone = item.status === "completed";
                const statusLabel = { running: "进行中", completed: "已完成", pending: "待处理", failed: "未完成", cancelled: "已停止" }[item.status];
                return (
                  <li key={item.id} className={`shrink-0 rounded-xl border px-3 py-2 text-left ${isCurrent ? "border-accent/30 bg-accent/8" : isDone ? "border-success/30 bg-success-subtle" : "border-line/70 bg-muted/70/[0.03]"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-body">{item.label}</span>
                      <span className={`shrink-0 text-xs font-semibold ${isCurrent ? "text-accent" : isDone ? "text-success" : "text-faint"}`}>{statusLabel}</span>
                    </div>
                    {isCurrent && item.detail && <p className="mt-1 text-xs leading-relaxed text-faint">{item.detail}</p>}
                  </li>
                );
              })}
            </ol>
          )}
          {typeof onCancel === "function" && ["queued", "retrying", "running", "cancelling"].includes(generationSnapshot?.status) ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={generationSnapshot?.status === "cancelling"}
              className="mt-4 shrink-0 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-danger-border bg-surface px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-subtle disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X size={16} />
              {generationSnapshot?.status === "cancelling" ? "正在停止..." : cancelLabel}
            </button>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
