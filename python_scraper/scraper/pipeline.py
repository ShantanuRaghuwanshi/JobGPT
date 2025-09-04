import asyncio
from contextlib import asynccontextmanager
from typing import List
from .logging import get_logger
from .db import fetch, fetchrow, execute, get_pool
from .models import Company, ScrapedJob, RunMetrics
from .company_discovery import discover_companies
from .job_scraper import JobScraper
from .deduplication import deduplicate
from .metadata import DEFAULT_SCRAPING_CONFIG, detect_endpoint
from .config import get_settings

logger = get_logger(__name__)


async def claim_next_run():
    row = await fetchrow(
        "SELECT id FROM scraping_runs WHERE status='queued' ORDER BY started_at ASC FOR UPDATE SKIP LOCKED LIMIT 1"
    )
    if not row:
        return None
    run_id = row["id"]
    await execute(
        "UPDATE scraping_runs SET status='running', started_at=NOW() WHERE id=$1",
        run_id,
    )
    return run_id


async def load_active_companies(limit: int = 200) -> List[Company]:
    rows = await fetch(
        "SELECT id,name,domain,careers_url,careers_endpoint_payload,scraping_config FROM companies WHERE is_active=true LIMIT $1",
        limit,
    )
    companies: List[Company] = []
    for r in rows:
        companies.append(
            Company(
                id=str(r["id"]),
                name=r["name"],
                domain=r["domain"],
                careers_url=r["careers_url"],
                careers_endpoint_payload=r["careers_endpoint_payload"] or {},
                scraping_config=r["scraping_config"] or DEFAULT_SCRAPING_CONFIG,
            )
        )
    return companies


async def upsert_companies(discovered):
    if not discovered:
        return 0
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            for c in discovered:
                payload = (
                    detect_endpoint(c.get("careers_url"))
                    if c.get("careers_url")
                    else None
                )
                await conn.execute(
                    """
                    INSERT INTO companies (name, domain, careers_url, careers_endpoint_payload, is_active, discovery_source)
                    VALUES ($1,$2,$3,$4,true,$5)
                    ON CONFLICT (name) DO UPDATE SET
                        domain=EXCLUDED.domain,
                        careers_url=COALESCE(EXCLUDED.careers_url, companies.careers_url),
                        careers_endpoint_payload=COALESCE(EXCLUDED.careers_endpoint_payload, companies.careers_endpoint_payload),
                        updated_at=NOW()
                    """,
                    c["name"],
                    c.get("domain"),
                    c.get("careers_url"),
                    payload,
                    c.get("discovery_source") or "search_engine",
                )
    return len(discovered)


async def save_jobs(jobs: List[ScrapedJob], metrics: RunMetrics):
    if not jobs:
        return
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            for j in jobs:
                res = await conn.fetchrow(
                    """
                    INSERT INTO jobs (title, company_id, company, location, description, requirements, experience_level, application_url, is_available)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
                    ON CONFLICT (application_url) DO UPDATE SET
                        title=EXCLUDED.title,
                        location=EXCLUDED.location,
                        description=EXCLUDED.description,
                        requirements=EXCLUDED.requirements,
                        experience_level=EXCLUDED.experience_level,
                        is_available=true,
                        updated_at=NOW()
                    RETURNING xmax = 0 as inserted
                    """,
                    j.title,
                    j.company_id,
                    j.company,
                    j.location,
                    j.description,
                    j.requirements,
                    j.experience_level,
                    j.application_url,
                )
                if res and res["inserted"]:  # inserted
                    metrics.jobs_inserted += 1
                else:
                    metrics.jobs_updated += 1


async def invalidate_missing(
    company: Company, current_urls: List[str], metrics: RunMetrics
):
    # Mark jobs for this company missing from current scrape as unavailable
    if not current_urls:
        return
    res = await fetch(
        "SELECT id, application_url FROM jobs WHERE company_id=$1 AND is_available=true",
        company.id,
    )
    to_disable = [r["id"] for r in res if r["application_url"] not in current_urls]
    if to_disable:
        await execute(
            f"UPDATE jobs SET is_available=false, updated_at=NOW() WHERE id = ANY($1::uuid[])",
            to_disable,
        )
        metrics.jobs_marked_unavailable += len(to_disable)


async def run_pipeline(run_id: str, settings=None):
    settings = settings or get_settings()
    metrics = RunMetrics()
    try:
        # 1. Discovery
        discovered = await discover_companies(settings.search_queries, limit=50)
        metrics.companies_discovered = len(discovered)
        metrics.companies_with_careers = len(
            [c for c in discovered if c.get("careers_url")]
        )
        metrics.companies_scraped = 0
        await upsert_companies(discovered)

        # 2. Load active companies
        companies = await load_active_companies()
        scraper = JobScraper(headless=settings.headless)
        try:
            for company in companies:
                jobs = await scraper.scrape_company(company)
                if not jobs:
                    continue
                metrics.companies_scraped += 1
                metrics.jobs_scraped += len(jobs)
                unique = deduplicate(jobs)
                await save_jobs(unique, metrics)
                await invalidate_missing(
                    company, [j.application_url for j in unique], metrics
                )
        finally:
            await scraper.close()

        await execute(
            "UPDATE scraping_runs SET status='success', finished_at=NOW(), details=$2, companies_scraped=$3, jobs_scraped=$4, jobs_inserted=$5, jobs_updated=$6, jobs_marked_unavailable=$7 WHERE id=$1",
            run_id,
            metrics.to_dict(),
            metrics.companies_scraped,
            metrics.jobs_scraped,
            metrics.jobs_inserted,
            metrics.jobs_updated,
            metrics.jobs_marked_unavailable,
        )
        logger.info("pipeline_success", run_id=run_id, metrics=metrics.to_dict())
    except Exception as e:  # noqa
        metrics.errors.append(str(e))
        await execute(
            "UPDATE scraping_runs SET status='failed', finished_at=NOW(), details=$2 WHERE id=$1",
            run_id,
            metrics.to_dict(),
        )
        logger.error("pipeline_failed", run_id=run_id, error=str(e))


async def ensure_run(run_id: str | None):
    if run_id:
        await run_pipeline(run_id)


async def background_worker():
    settings = get_settings()
    while True:
        run_id = await claim_next_run()
        if run_id:
            await run_pipeline(run_id, settings)
        await asyncio.sleep(settings.poll_interval_sec)
