from typing import List, Dict, Any
import os
import httpx
from urllib.parse import urlparse
from .logging import get_logger

logger = get_logger(__name__)

SEARCH_ENGINES = ["google", "bing", "serpapi"]


async def discover_companies(
    search_queries: List[str], limit: int = 50
) -> List[Dict[str, Any]]:
    companies: List[Dict[str, Any]] = []
    for query in search_queries:
        for engine in SEARCH_ENGINES:
            try:
                results = await _search(engine, query, limit)
                for r in results:
                    c = _extract_company(r)
                    if c:
                        companies.append(c)
            except Exception as e:  # noqa
                logger.warning("search_engine_failed", engine=engine, error=str(e))
    # Deduplicate by name/domain
    dedup = {}
    for c in companies:
        key = c.get("domain") or c["name"].lower()
        if key not in dedup:
            dedup[key] = c
    logger.info("companies_discovered", count=len(dedup))
    return list(dedup.values())


async def _search(engine: str, query: str, limit: int):
    if engine == "google":
        key = os.getenv("GOOGLE_SEARCH_API_KEY")
        cx = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
        if key and cx:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://www.googleapis.com/customsearch/v1",
                    params={"key": key, "cx": cx, "q": query, "num": min(10, limit)},
                )
                resp.raise_for_status()
                items = resp.json().get("items", [])
                return [
                    {
                        "title": i.get("title"),
                        "link": i.get("link"),
                        "snippet": i.get("snippet", ""),
                    }
                    for i in items
                ]
        return []
    if engine == "bing":
        key = os.getenv("BING_SEARCH_API_KEY")
        if key:
            async with httpx.AsyncClient(
                timeout=10, headers={"Ocp-Apim-Subscription-Key": key}
            ) as client:
                resp = await client.get(
                    "https://api.bing.microsoft.com/v7.0/search",
                    params={"q": query, "count": min(50, limit)},
                )
                resp.raise_for_status()
                vals = resp.json().get("webPages", {}).get("value", [])
                return [
                    {
                        "title": v.get("name"),
                        "link": v.get("url"),
                        "snippet": v.get("snippet", ""),
                    }
                    for v in vals
                ]
        return []
    if engine == "serpapi":
        key = os.getenv("SERPAPI_KEY")
        if key:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://serpapi.com/search.json",
                    params={
                        "engine": "google",
                        "q": query,
                        "api_key": key,
                        "num": min(50, limit),
                    },
                )
                resp.raise_for_status()
                vals = resp.json().get("organic_results", [])
                return [
                    {
                        "title": v.get("title"),
                        "link": v.get("link"),
                        "snippet": v.get("snippet", ""),
                    }
                    for v in vals
                ]
        return []
    return []


CAREERS_KEYWORDS = ["careers", "jobs", "hiring", "employment", "opportunities"]
JOB_BOARD_HINTS = [
    "linkedin.com",
    "glassdoor.com",
    "indeed.com",
    "lever.co",
    "greenhouse.io",
    "workable.com",
]


def _extract_company(result: Dict[str, Any]):
    link = result.get("link")
    if not link:
        return None
    try:
        parsed = urlparse(link)
        domain = parsed.hostname or ""
        if any(b in domain for b in JOB_BOARD_HINTS):
            # skip direct job board domains
            return None
        name = _name_from_title_or_domain(result.get("title", ""), domain)
        if not name:
            return None
        text = f"{result.get('title','')} {result.get('snippet','')} {link}".lower()
        careers_url = link if any(k in text for k in CAREERS_KEYWORDS) else None
        return {
            "name": name,
            "domain": domain.replace("www.", ""),
            "careers_url": careers_url,
            "discovery_source": "search_engine",
        }
    except Exception:  # noqa
        return None


def _name_from_title_or_domain(title: str, domain: str):
    if "-" in title:
        first = title.split("-")[0].strip()
        if 2 < len(first) < 80:
            return first
    core = domain.split(".")
    if len(core) >= 2:
        return core[-2].capitalize()
    return None
