Python Job Scraper Service
==========================

Overview
--------
This directory contains a production-oriented Python microservice that replicates and extends the existing Node.js job discovery & scraping pipeline. It provides:

* Company discovery & careers endpoint metadata extraction (API vs webpage, payload hints)
* Configurable job scraping (API + dynamic webpages via Playwright)
* Deduplication & validation (title/company/location + application_url uniqueness)
* Incremental updates & invalidation of disappeared jobs (mark is_available = false)
* Structured logging
* Asynchronous, scalable architecture using asyncio, httpx, asyncpg, and playwright
* A lightweight FastAPI control API exposing health, recent runs, trigger, and run detail
* DB-backed run orchestration (scraping_runs table) so the existing Node backend can surface pipeline status via `/api/scraping/*` endpoints

Key Tables / Migrations
-----------------------
* `scraping_runs` – stores each pipeline run lifecycle & metrics
* Unique constraint on `jobs.application_url` (added in migration 002) enabling upsert semantics

Quick Start
-----------
1. Install system deps (Playwright browsers) once: `python -m playwright install --with-deps chromium`
2. Install Python deps: `pip install -r requirements.txt`
3. Set env vars (examples below) and run service: `python -m scraper.main`

Environment Variables
---------------------
```
PG_DSN=postgresql://user:password@localhost:5432/job_automation
SCRAPER_CONCURRENCY=5
SCRAPER_HEADLESS=true
SCRAPER_SEARCH_QUERIES=ai+startup,devtools,healthtech
GOOGLE_SEARCH_API_KEY=... (optional)
GOOGLE_SEARCH_ENGINE_ID=... (optional)
BING_SEARCH_API_KEY=... (optional)
SERPAPI_KEY=... (optional)
LOG_LEVEL=INFO
``` 

Architecture
------------
Modules:
* `config.py` – central config parsing
* `logging.py` – structured logging setup
* `db.py` – asyncpg connection pool helpers
* `models.py` – dataclasses + type helpers
* `deduplication.py` – key generation & validation
* `company_discovery.py` – search-based & heuristic discovery
* `metadata.py` – careers endpoint heuristics & API detection
* `job_scraper.py` – core scraping strategies (API + DOM)
* `pipeline.py` – orchestration & metrics, invalidation of removed jobs
* `api.py` – FastAPI app exposing control/monitor endpoints
* `main.py` – entrypoint (runs API + background poller)

Node Integration
----------------
The Express route `backend/src/routes/scraping.ts` reads from `scraping_runs` to surface latest status to the frontend.
To trigger a new run from Node (or UI) it inserts a `queued` run row via POST `/api/scraping/trigger` (Node) which the Python poller claims.

Scaling Notes
-------------
* Increase `SCRAPER_CONCURRENCY` for parallel page/API fetches.
* Stateless workers can share the DB; row-level advisory locks on `scraping_runs` ensure only one claims a queued run.
* Playwright browser contexts are pooled; pages are created per job list page to avoid cross-site leakage.

Observability
-------------
* Structured JSON logs (one line per event) – easy to ship to ELK / Loki.
* Run metrics aggregated & persisted on completion or failure.
* Future improvement: add Prometheus exporter (not included here to keep footprint small).

Security / Safety
-----------------
* Restricts navigation to target company domain origin.
* Timeouts & retry caps prevent hanging runs.
* Sanitizes dynamic selector input.

Triggering a Run (Examples)
---------------------------
* Insert a `queued` run row (Node route already does this): `POST /api/scraping/trigger`.
* Direct call to Python API (if exposed) `POST /internal/trigger`.

Testing
-------
Minimal smoke tests can be added under `tests/`; due to time, only core code included. Consider adding pytest with a temp Postgres container + mocked HTML fixtures.

Limitations / Next Steps
------------------------
* Add resilience caching for discovery queries
* Add structured metrics endpoint (Prometheus)
* Extend ML-based experience level classification
* Implement playwright selective rendering & cookie consent handling
