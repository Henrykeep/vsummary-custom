"""Workspace-scoped durable progress used by browser clients."""

from __future__ import annotations

import math
import re


_TERMINAL_STATUSES = {"succeeded", "failed", "cancelled"}
_ACTIVE_STATUSES = {"running", "retrying", "cancelling"}
_MODEL_PREP_OPERATIONS = {"prepare_rag_model", "prepare_asr_model"}
_COUNT_PATTERNS = (
    re.compile(r"[（(]\s*(\d+)\s*/\s*(\d+)\s*[）)]"),
    re.compile(r"(?<!\d)(\d+)\s*/\s*(\d+)(?!\d)"),
)


# Each band is the slice of the whole job occupied by that stage. The event's
# progress is stage-local, so 100 means "this stage finished", not "the job
# finished". The final completion stages are the only ones allowed to reach 100.
_STAGE_BANDS: dict[str, tuple[float, float]] = {
    "queued": (0.0, 0.0),
    "claimed": (0.0, 0.0),
    "queue": (0.0, 0.0),
    "retrying": (0.0, 0.0),
    "prepare": (0.0, 1.0),
    "initialize": (1.0, 3.0),
    "download": (3.0, 18.0),
    "persist": (18.0, 22.0),
    "probe_subtitles": (22.0, 24.0),
    "load_manual_srt": (22.0, 55.0),
    "load_transcript": (22.0, 55.0),
    "extract_subtitles": (22.0, 55.0),
    "probe": (24.0, 26.0),
    "extract_audio": (26.0, 32.0),
    "transcribe": (32.0, 55.0),
    "enhance_transcript": (55.0, 60.0),
    "organize": (55.0, 60.0),
    "summarize": (60.0, 70.0),
    "extract_screenshots": (70.0, 76.0),
    "chapter_images": (70.0, 76.0),
    "sample_frames": (55.0, 62.0),
    "generate_ai_summary": (62.0, 82.0),
    "understand_frames": (62.0, 82.0),
    "note_images": (82.0, 84.0),
    "finalize_ai_summary": (84.0, 90.0),
    "ai_summary_completed": (90.0, 90.0),
    "enrich_visual_summary": (80.0, 88.0),
    "publish": (90.0, 99.0),
    "auto_artifacts": (99.0, 99.0),
    "auto_mindmap": (99.0, 99.0),
    "auto_knowledge_cards": (99.0, 99.0),
    "auxiliary_failed": (99.0, 99.0),
    "complete": (100.0, 100.0),
    "completed": (100.0, 100.0),
    "succeeded": (100.0, 100.0),
    "failed": (0.0, 0.0),
    "cancelled": (0.0, 0.0),
    "cancelling": (0.0, 0.0),
    # Non-summary durable jobs share the same adapter; keep their stages useful.
    "generate": (10.0, 85.0),
    "save": (85.0, 99.0),
}


def normalize_stage_progress(
    stage: str | None,
    stage_progress: float | None,
    detail: str | None = None,
) -> float:
    """Map a child's stage-local reading into a 0..100 whole-job percentage."""

    local = _coerce_percent(stage_progress)
    if local is None:
        ratio = _detail_completion(detail)
        local = 0.0 if ratio is None else ratio * 100.0
    band = _STAGE_BANDS.get((stage or "").strip().lower())
    if band is None:
        # Unknown stages are treated conservatively: a raw 100% must not make
        # the parent look complete before a known terminal stage arrives.
        return min(90.0, local * 0.9)
    start, end = band
    return _clamp(start + (end - start) * local / 100.0)


def normalize_job_progress(
    operation: str | None,
    stage: str | None,
    stage_progress: float | None,
    detail: str | None = None,
    *,
    terminal: bool = False,
) -> float:
    """Normalize an event for the job type that produced it.

    Video jobs have several distinct stages, so their event percentages are
    stage-local and need the weighted bands above. Model preparation is a
    single long download, so its byte progress is already a whole-job
    percentage and must not be compressed into the video download band.
    """

    if operation in _MODEL_PREP_OPERATIONS:
        if terminal:
            return 100.0
        local = _coerce_percent(stage_progress)
        if local is None:
            ratio = _detail_completion(detail)
            local = 0.0 if ratio is None else ratio * 100.0
        return min(local, 99.0)
    return normalize_stage_progress(stage, stage_progress, detail)


def _coerce_percent(value: float | None) -> float | None:
    if value is None:
        return None
    try:
        percent = float(value)
    except (TypeError, ValueError):
        return None
    return _clamp(percent) if math.isfinite(percent) else None


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _detail_completion(detail: str | None) -> float | None:
    """Read the last ``done/total`` count in a human-readable detail."""

    if not isinstance(detail, str):
        return None
    for pattern in _COUNT_PATTERNS:
        matches = pattern.findall(detail)
        if not matches:
            continue
        done, total = (int(part) for part in matches[-1])
        if total > 0:
            return _clamp(done / total, 0.0, 1.0)
    return None


def _event_progress(event) -> float:
    return normalize_stage_progress(event.stage, event.progress, event.detail)


def _child_progress(status: str, history: list) -> float:
    if status == "succeeded":
        return 100.0
    if status in {"failed", "cancelled", "queued"}:
        return 0.0
    progress = max((_event_progress(event) for event in history), default=0.0)
    return min(progress, 99.0)


def _single_job_progress(status: str, history: list) -> float:
    if status == "succeeded":
        return 100.0
    progress = max((_event_progress(event) for event in history), default=0.0)
    # A completed stage is not the same thing as a completed job. Until the
    # durable job itself reaches ``succeeded`` the UI must not show 100%.
    return min(progress, 99.0)


def _event_payload(event) -> dict[str, object]:
    return {
        "status": event.status,
        "stage": event.stage,
        "detail": event.detail,
        "progress": event.progress,
    }


def _active_job(child, history: list) -> dict[str, object]:
    event = history[-1] if history else None
    stage_progress = (
        _coerce_percent(event.progress) if event is not None else None
    )
    if event is not None and stage_progress is None:
        ratio = _detail_completion(event.detail)
        stage_progress = None if ratio is None else ratio * 100.0
    return {
        "job_id": child.id,
        "video_id": child.resource_id,
        "stage": event.stage if event is not None else child.status,
        "stage_progress": stage_progress,
        "job_progress": _child_progress(child.status, history),
        "detail": event.detail if event is not None else None,
        "sequence": event.sequence if event is not None else None,
        "status": child.status,
    }


def _child_histories(repository, children, *, workspace_id: str) -> dict[str, list]:
    """Fetch compact histories in one query when the repository supports it."""

    if not children:
        return {}
    loader = getattr(repository, "compact_event_histories", None)
    if callable(loader):
        return loader(tuple(child.id for child in children), workspace_id=workspace_id)
    return {
        child.id: repository.events(child.id, after_sequence=0, workspace_id=workspace_id)
        for child in children
    }


def durable_status(repository, *, workspace_id: str, resource_id: str, operations: tuple[str, ...], batch: bool = False, job_id: str | None = None):
    job = repository.get(job_id, workspace_id=workspace_id) if job_id is not None else repository.latest_for_resource(workspace_id=workspace_id, resource_id=resource_id, operations=operations)
    if job_id is not None and (job is None or job.resource_id != resource_id or job.operation not in operations):
        raise LookupError("generation job not found")
    if job is None:
        return {"status": "idle", "progress": None, "detail": None, "job_id": None}

    children = repository.children(job.id, workspace_id=workspace_id) if batch else []
    status = "running" if batch and job.status == "waiting_children" else job.status
    total = len(children)
    finished = sum(child.status in _TERMINAL_STATUSES for child in children)
    succeeded = sum(child.status == "succeeded" for child in children)
    failed = sum(child.status == "failed" for child in children)
    cancelled = sum(child.status == "cancelled" for child in children)
    running = sum(child.status in _ACTIVE_STATUSES for child in children)
    queued = sum(child.status == "queued" for child in children)

    if children:
        if finished == total:
            if job.cancel_requested or cancelled:
                status = "cancelled"
            elif failed:
                status = "failed"
            elif succeeded == total:
                status = "succeeded"
        elif job.status in _TERMINAL_STATUSES:
            status = "cancelling" if job.cancel_requested else "running"

        child_histories = _child_histories(repository, children, workspace_id=workspace_id)
        # The parent creates children one at a time while it is still running.
        # Averaging that growing subset makes progress fall when the denominator
        # grows (for example, 1 child at 10% -> 2 children at 5%). Publish the
        # completed queue only after every child exists, or after the parent is
        # terminal, so the percentage remains monotonic during creation.
        if job.status == "waiting_children" or job.status in _TERMINAL_STATUSES:
            # Batch progress describes queue completion, not the success ratio.
            # A failed child has finished its work just like a successful one;
            # success/failure remain visible in the structured counters.
            progress = sum(
                100.0
                if child.status in _TERMINAL_STATUSES
                else _child_progress(child.status, child_histories.get(child.id, []))
                for child in children
            ) / total
        else:
            progress = 0.0
        if finished < total:
            progress = min(progress, 99.0)
        active_jobs = [
            _active_job(child, child_histories.get(child.id, []))
            for child in children
            if child.status in _ACTIVE_STATUSES
        ]
        focus = active_jobs[0] if active_jobs else None
        if focus is not None:
            focus_history = child_histories.get(str(focus["job_id"]), [])
            event = focus_history[-1] if focus_history else None
            events = [_event_payload(item) for item in focus_history]
            events_job_id = str(focus["job_id"])
        else:
            parent_history = repository.events(job.id, after_sequence=0, workspace_id=workspace_id)
            event = parent_history[-1] if parent_history else None
            events = [_event_payload(item) for item in parent_history]
            events_job_id = job.id
        detail = (
            f"已结束 {finished}/{total} 个视频任务；成功 {succeeded}；"
            f"失败 {failed}；正在处理 {running}；排队 {queued}"
        )
        if cancelled:
            detail += f"；已取消 {cancelled}"
        focus_detail = focus["detail"] if focus is not None else None
        focus_video = focus
    else:
        history = repository.events(job.id, after_sequence=0, workspace_id=workspace_id)
        event = history[-1] if history else None
        progress = _single_job_progress(job.status, history)
        detail = job.failure_detail or (event.detail if event else None)
        events = [_event_payload(item) for item in history]
        events_job_id = job.id
        active_jobs = []
        focus_video = None
        focus_detail = None

    error = job.failure_detail if status == "failed" else None
    if status == "failed" and not error:
        error = next(
            (child.failure_detail for child in children if child.status == "failed"),
            None,
        )
    snapshot = {
        "job_id": job.id,
        "status": status,
        "stage": event.stage if event else status,
        "sequence": event.sequence if event and not batch else None,
        "progress": progress,
        "detail": detail,
        "error": error,
        "started_at": job.started_at.timestamp() if job.started_at else None,
        "elapsed_seconds": max(0, (event.occurred_at - job.started_at).total_seconds()) if event and job.started_at else None,
        "total": total,
        "finished": finished,
        "events": events,
        "events_job_id": events_job_id,
        "focus_detail": focus_detail,
        "focus_video": focus_video,
    }
    if batch:
        snapshot.update({
            "succeeded": succeeded,
            "failed": failed,
            "cancelled": cancelled,
            "running": running,
            "queued": queued,
            "active_jobs": active_jobs,
        })
    return snapshot
