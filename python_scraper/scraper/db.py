import asyncpg
from typing import Optional
from .config import get_settings
from .logging import get_logger

logger = get_logger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        settings = get_settings()
        _pool = await asyncpg.create_pool(dsn=settings.pg_dsn, min_size=1, max_size=10)
        logger.info("db_pool_initialized")
    return _pool


async def fetch(query: str, *args):
    pool = await get_pool()
    return await pool.fetch(query, *args)


async def fetchrow(query: str, *args):
    pool = await get_pool()
    return await pool.fetchrow(query, *args)


async def execute(query: str, *args):
    pool = await get_pool()
    return await pool.execute(query, *args)
