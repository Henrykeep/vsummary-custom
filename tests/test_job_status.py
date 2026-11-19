import unittest
from datetime import datetime, timezone
from types import SimpleNamespace

from backend.api.adapters.job_status import durable_status


NOW = datetime(2026, 11, 18, tzinfo=timezone.utc)


def _event(stage: str, progress: float | None, *, detail: str | None = None):
    return SimpleNamespace(
        sequence=1,
        status="running",
        stage=stage,
        progress=progress,
        detail=detail,
        occurred_at=NOW,
    )


def _job(status: str):
    return SimpleNamespace(
        id="parent",
        resource_id="series-1",
        operation="generate_series_batch",
        status=status,
        cancel_requested=False,
        failure_detail=None,
        started_at=NOW,
    )


def _child(child_id: str, status: str):
    return SimpleNamespace(
        id=child_id,
        resource_id=f"video-{child_id}",
        status=status,
        failure_detail=None,
    )


class _FakeRepository:
    def __init__(self, job, children, histories):
        self.job = job
        self.child_items = list(children)
        self.histories = histories
        self.parent_events = [_event("queue", 100.0, detail="正在创建 21 个视频子任务")]

    def get(self, job_id: str, *, workspace_id: str):
        return self.job if job_id == self.job.id else None

    def children(self, job_id: str, *, workspace_id: str):
        return list(self.child_items)

    def compact_event_histories(self, child_ids, *, workspace_id: str):
        return {child_id: list(self.histories.get(child_id, ())) for child_id in child_ids}

    def events(self, job_id: str, *, after_sequence: int, workspace_id: str):
        return list(self.parent_events)


class DurableBatchStatusTests(unittest.TestCase):
    def _status(self, repository):
        return durable_status(
            repository,
            workspace_id="workspace-1",
            resource_id="series-1",
            operations=("generate_series_batch",),
            batch=True,
            job_id="parent",
        )

    def test_creation_phase_does_not_regress_as_children_are_added(self):
        repository = _FakeRepository(
            _job("running"),
            [_child("video-1", "running")],
            {"video-1": [_event("download", 50.0)]},
        )

        first = self._status(repository)
        repository.child_items.append(_child("video-2", "running"))
        repository.histories["video-2"] = [_event("download", 25.0)]
        second = self._status(repository)

        self.assertEqual(first["progress"], 0.0)
        self.assertEqual(second["progress"], 0.0)
        self.assertEqual(first["total"], 1)
        self.assertEqual(second["total"], 2)

    def test_waiting_batch_aggregates_the_complete_child_set(self):
        repository = _FakeRepository(
            _job("waiting_children"),
            [_child("video-1", "succeeded"), _child("video-2", "running")],
            {"video-2": [_event("download", 50.0)]},
        )

        snapshot = self._status(repository)

        self.assertEqual(snapshot["status"], "running")
        self.assertEqual(snapshot["progress"], 55.25)
        self.assertEqual(snapshot["finished"], 1)
        self.assertEqual(snapshot["total"], 2)


if __name__ == "__main__":
    unittest.main()
