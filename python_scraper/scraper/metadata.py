from typing import Dict, Any
from urllib.parse import urlparse

DEFAULT_SCRAPING_CONFIG = {
    "jobListingSelector": ".job, .position, .opening, [data-job], .job-listing, .career-item",
    "jobSelectors": {
        "title": ".title, .job-title, h2, h3, .position-title, .role-title",
        "location": ".location, .job-location, .office, .city",
        "description": ".description, .job-description, .summary, .content",
        "requirements": ".requirements, .qualifications, .skills, ul li",
        "applicationUrl": ".apply, .apply-link, a[href*='apply'], .btn-apply",
    },
    "experienceLevelMapping": {
        "junior": "entry",
        "entry": "entry",
        "graduate": "entry",
        "intern": "entry",
        "mid-level": "mid",
        "mid": "mid",
        "intermediate": "mid",
        "senior": "senior",
        "sr": "senior",
        "lead": "lead",
        "principal": "lead",
        "staff": "lead",
        "director": "lead",
    },
}


def detect_endpoint(url: str) -> Dict[str, Any]:
    if any(t in url for t in ["/api/", ".json", "/v1/", "/v2/"]):
        return {
            "type": "api",
            "method": "GET",
            "headers": {"Accept": "application/json"},
        }
    return {"type": "webpage", "method": "GET"}


def sanitize_url(url: str) -> str:
    if not url:
        return url
    try:
        p = urlparse(url)
        if not p.scheme:
            return f"https://{url}"
        return url
    except Exception:
        return url
