import logging
import os
import structlog


def configure_logging(level: str = "INFO") -> None:
    timestamper = structlog.processors.TimeStamper(fmt="iso")
    shared_processors = [
        timestamper,
        structlog.processors.add_log_level,
        structlog.processors.EventRenamer("message"),
        structlog.processors.dict_tracebacks,
    ]

    structlog.configure(
        processors=shared_processors
        + [structlog.processors.JSONRenderer(sort_keys=True)],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(level=getattr(logging, level.upper(), logging.INFO))


def get_logger(name: str = "scraper"):
    return structlog.get_logger(name)
