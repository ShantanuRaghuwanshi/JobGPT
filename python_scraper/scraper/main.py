import asyncio
import uvicorn
from .logging import configure_logging, get_logger
from .config import get_settings
from .api import app
from .pipeline import background_worker


def start_api():
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")


async def main():
    settings = get_settings()
    configure_logging(settings.log_level)
    logger = get_logger(__name__)
    logger.info(
        "python_scraper_start",
        concurrency=settings.concurrency,
        queries=settings.search_queries,
    )
    # Launch background worker & API concurrently
    worker_task = asyncio.create_task(background_worker())
    api_task = asyncio.to_thread(start_api)
    await worker_task
    await api_task


if __name__ == "__main__":
    asyncio.run(main())
