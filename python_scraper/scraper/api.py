from fastapi import FastAPI
from fastapi.responses import JSONResponse
from .db import fetch, fetchrow, execute
from .config import get_settings
from .logging import get_logger

logger = get_logger(__name__)

app = FastAPI(title="Job Scraper Service", version="1.0.0")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/runs")
async def list_runs(limit: int = 20):
    rows = await fetch(
        "SELECT id,status,started_at,finished_at,companies_scraped,jobs_scraped,jobs_inserted,jobs_updated,jobs_marked_unavailable FROM scraping_runs ORDER BY started_at DESC LIMIT $1",
        limit,
    )
    return {"runs": [dict(r) for r in rows]}


@app.post("/trigger")
async def trigger():
    row = await fetchrow(
        "INSERT INTO scraping_runs (status) VALUES ('queued') RETURNING id"
    )
    logger.info("run_queued", run_id=row["id"])
    return {"run_id": row["id"]}


@app.get("/runs/{run_id}")
async def run_detail(run_id: str):
    row = await fetchrow("SELECT * FROM scraping_runs WHERE id=$1", run_id)
    if not row:
        return JSONResponse(status_code=404, content={"error": "not found"})
    d = dict(row)
    return d
