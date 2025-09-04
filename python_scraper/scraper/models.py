from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class Company:
    id: str
    name: str
    domain: Optional[str]
    careers_url: Optional[str]
    careers_endpoint_payload: Dict[str, Any]
    scraping_config: Dict[str, Any]


@dataclass
class ScrapedJob:
    title: str
    company: str
    company_id: str
    location: str
    description: str
    requirements: List[str]
    experience_level: str
    application_url: str


@dataclass
class RunMetrics:
    companies_discovered: int = 0
    companies_with_careers: int = 0
    companies_scraped: int = 0
    jobs_scraped: int = 0
    jobs_inserted: int = 0
    jobs_updated: int = 0
    jobs_marked_unavailable: int = 0
    errors: List[str] = field(default_factory=list)

    def to_dict(self):
        return self.__dict__.copy()
