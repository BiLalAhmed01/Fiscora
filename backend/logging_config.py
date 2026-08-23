"""Structured logging setup for the backend.

Configures the root logger to emit one key=value line per log record (easy
to grep locally, and trivially parseable by log aggregators that split on
whitespace/`=` without needing a JSON parser). Call configure_logging() once
at process startup (see backend/main.py) before anything else logs.
"""
import contextvars
import logging
import sys

# Set by the request-id middleware (backend/main.py) for the duration of one
# request so every log line emitted while handling it -- from any module --
# can be correlated back to that request, including lines logged deep inside
# library code that has no idea a request ID exists.
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """Attaches the current request's id (or "-" outside a request) to every
    log record so the formatter below can include it."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


class KeyValueFormatter(logging.Formatter):
    """Renders each record as `key=value` pairs: timestamp, level, logger
    name, request id, and the message -- structured enough to grep/parse,
    without pulling in a JSON logging dependency for a project this size.
    """

    def format(self, record: logging.LogRecord) -> str:
        timestamp = self.formatTime(record, "%Y-%m-%dT%H:%M:%S")
        message = record.getMessage()
        line = (
            f'timestamp="{timestamp}" level={record.levelname} logger={record.name} '
            f'request_id={getattr(record, "request_id", "-")} message="{message}"'
        )
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    root.setLevel(level)

    # Idempotent: repeated calls (e.g. test imports re-importing backend.main)
    # shouldn't keep stacking duplicate handlers on the root logger.
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(KeyValueFormatter())
    handler.addFilter(RequestIdFilter())
    root.addHandler(handler)
