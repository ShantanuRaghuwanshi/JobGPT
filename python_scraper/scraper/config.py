import os
from functools import lru_cache
from typing import List


class Settings:
    pg_dsn: str
    concurrency: int
    headless: bool
    search_queries: List[str]
    log_level: str
    poll_interval_sec: int
    run_timeout_sec: int

    def __init__(self) -> None:
        self.pg_dsn = os.getenv(
            "PG_DSN", "postgresql://postgres:postgres@localhost:5432/job_automation"
        )
        self.concurrency = int(os.getenv("SCRAPER_CONCURRENCY", "5"))
        self.headless = os.getenv("SCRAPER_HEADLESS", "true").lower() == "true"
        self.search_queries = [
            q.strip()
            for q in os.getenv("SCRAPER_SEARCH_QUERIES", "ai startup").split(",")
            if q.strip()
        ]
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.poll_interval_sec = int(os.getenv("SCRAPER_POLL_INTERVAL", "30"))
        self.run_timeout_sec = int(os.getenv("SCRAPER_RUN_TIMEOUT", "1800"))  # 30 min


@lru_cache
def get_settings() -> Settings:
    return Settings()
