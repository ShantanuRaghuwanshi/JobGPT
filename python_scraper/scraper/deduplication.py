import re
from .models import ScrapedJob


def normalize(text: str) -> str:
    return re.sub(r"[^\w\s]", "", text.lower()).strip()


def job_key(job: ScrapedJob) -> str:
    return f"{normalize(job.title)}|{normalize(job.company)}|{normalize(job.location)}"


def deduplicate(jobs):
    seen = set()
    unique = []
    for j in jobs:
        k = job_key(j)
        if k not in seen:
            seen.add(k)
            unique.append(j)
    return unique
