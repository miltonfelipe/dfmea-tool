"""In-memory limiter for failed sign-in attempts.

Per-process: with several workers each keeps its own counts, and a restart
resets them. Good enough to stop online password guessing on a single server;
use a shared store (e.g. Redis) when running multiple instances.
"""
import threading
import time
from collections import deque

_MAX_KEYS = 10_000  # bound memory if many distinct keys are tried


class FailureLimiter:
    def __init__(self, max_failures: int, window_seconds: float, clock=time.monotonic):
        self.max_failures = max_failures
        self.window = window_seconds
        self._clock = clock
        self._failures: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        q = self._failures.get(key)
        if q is None:
            return deque()
        while q and q[0] <= now - self.window:
            q.popleft()
        if not q:
            del self._failures[key]
        return q

    def retry_after(self, key: str, limit: int | None = None) -> int | None:
        """Seconds until another attempt is allowed, or None if allowed now."""
        limit = limit or self.max_failures
        with self._lock:
            now = self._clock()
            q = self._prune(key, now)
            if len(q) < limit:
                return None
            return max(1, int(q[-limit] + self.window - now) + 1)

    def failure(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            if len(self._failures) >= _MAX_KEYS:
                for k in list(self._failures):
                    self._prune(k, now)
            self._failures.setdefault(key, deque()).append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)
