import asyncio
import json
from typing import List, Dict, Any
import httpx
from playwright.async_api import async_playwright, Browser
from .models import Company, ScrapedJob
from .metadata import DEFAULT_SCRAPING_CONFIG
from .logging import get_logger

logger = get_logger(__name__)


class JobScraper:
    def __init__(self, headless: bool = True):
        self._browser: Browser | None = None
        self._headless = headless

    async def _ensure_browser(self):
        if self._browser is None:
            pw = await async_playwright().start()
            self._browser = await pw.chromium.launch(
                headless=self._headless, args=["--no-sandbox"]
            )
            logger.info("browser_initialized")

    async def close(self):
        if self._browser:
            await self._browser.close()
            self._browser = None
            logger.info("browser_closed")

    async def scrape_company(self, company: Company) -> List[ScrapedJob]:
        payload = company.careers_endpoint_payload or {}
        t = payload.get("type") or (
            "api"
            if company.careers_url
            and any(x in company.careers_url for x in ["/api/", ".json"])
            else "webpage"
        )
        try:
            if t == "api" and company.careers_url:
                return await self._scrape_api(company)
            if company.careers_url:
                return await self._scrape_web(company)
        except Exception as e:  # noqa
            logger.warning("company_scrape_failed", company=company.name, error=str(e))
        return []

    async def _scrape_api(self, company: Company) -> List[ScrapedJob]:
        jobs: List[ScrapedJob] = []
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(company.careers_url)
            resp.raise_for_status()
            data = resp.json()
        arr = self._extract_jobs_array(data)
        for item in arr:
            j = self._parse_api_job(item, company)
            if j:
                jobs.append(j)
        logger.info("api_jobs_parsed", company=company.name, count=len(jobs))
        return jobs

    def _extract_jobs_array(self, data: Any):  # type: ignore
        for key in ["jobs", "data", "results", "positions", "openings"]:
            if isinstance(data, dict) and key in data and isinstance(data[key], list):
                return data[key]
        return data if isinstance(data, list) else []

    def _parse_api_job(self, item: Dict[str, Any], company: Company):
        title = item.get("title") or item.get("name") or item.get("position")
        if not title:
            return None
        location = (
            item.get("location") or item.get("office") or item.get("city") or "Remote"
        )
        desc = item.get("description") or item.get("summary") or ""
        apply_url = (
            item.get("apply_url")
            or item.get("url")
            or item.get("link")
            or company.careers_url
        )
        req_text = (
            item.get("requirements")
            or item.get("qualifications")
            or item.get("skills")
            or desc
        )
        requirements = self._parse_requirements(req_text)
        level = self._determine_level(
            title, desc, DEFAULT_SCRAPING_CONFIG["experienceLevelMapping"]
        )
        return ScrapedJob(
            title=title.strip(),
            company=company.name,
            company_id=company.id,
            location=str(location).strip(),
            description=desc.strip(),
            requirements=requirements,
            experience_level=level,
            application_url=apply_url,
        )

    async def _scrape_web(self, company: Company) -> List[ScrapedJob]:
        await self._ensure_browser()
        assert self._browser
        page = await self._browser.new_page()
        jobs: List[ScrapedJob] = []
        config = {**DEFAULT_SCRAPING_CONFIG, **(company.scraping_config or {})}
        try:
            await page.goto(
                company.careers_url, wait_until="networkidle", timeout=30000
            )
            await page.wait_for_selector(config["jobListingSelector"], timeout=15000)
            elements = await page.query_selector_all(config["jobListingSelector"])
            for el in elements:
                try:
                    title = await _text(el, config["jobSelectors"]["title"]) or None
                    if not title:
                        continue
                    location = (
                        await _text(el, config["jobSelectors"]["location"])
                        or "Not specified"
                    )
                    desc = await _text(el, config["jobSelectors"]["description"]) or ""
                    req_text = (
                        await _text(el, config["jobSelectors"]["requirements"]) or desc
                    )
                    app_url = (
                        await _attr(
                            el, config["jobSelectors"]["applicationUrl"], "href"
                        )
                        or company.careers_url
                    )
                    requirements = self._parse_requirements(req_text)
                    level = self._determine_level(
                        title, desc, config["experienceLevelMapping"]
                    )
                    jobs.append(
                        ScrapedJob(
                            title=title.strip(),
                            company=company.name,
                            company_id=company.id,
                            location=location.strip(),
                            description=desc.strip(),
                            requirements=requirements,
                            experience_level=level,
                            application_url=app_url,
                        )
                    )
                except Exception as e:  # noqa
                    logger.warning(
                        "job_parse_failed", company=company.name, error=str(e)
                    )
        except Exception as e:  # noqa
            logger.warning("web_scrape_failed", company=company.name, error=str(e))
        finally:
            await page.close()
        logger.info("web_jobs_parsed", company=company.name, count=len(jobs))
        return jobs

    def _parse_requirements(self, text: str):
        if not text:
            return []
        parts = [p.strip() for p in text.split("\n")]
        out = []
        for p in parts:
            if 0 < len(p) < 200:
                out.append(p)
        return out[:10]

    def _determine_level(self, title: str, desc: str, mapping: Dict[str, str]):
        text = f"{title} {desc}".lower()
        for k, v in mapping.items():
            if k in text:
                return v
        if any(w in text for w in ["junior", "entry", "graduate"]):
            return "entry"
        if any(w in text for w in ["senior", "sr."]):
            return "senior"
        if any(w in text for w in ["lead", "principal", "staff"]):
            return "lead"
        return "mid"


async def _text(el, selector: str):
    try:
        node = await el.query_selector(selector)
        if node:
            return (await node.text_content()) or ""
    except Exception:
        return ""
    return ""


async def _attr(el, selector: str, attribute: str):
    try:
        node = await el.query_selector(selector)
        if node:
            return await node.get_attribute(attribute)
    except Exception:
        return None
    return None
