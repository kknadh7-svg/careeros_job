"""Resume parsing agent using PydanticAI."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

import pypdf
import docx
import structlog
from pydantic import BaseModel, Field
from pydantic_ai import Agent

logger = structlog.get_logger(__name__)


# ─── Output models ───────────────────────────────────────────────────────────

class ContactInfo(BaseModel):
    name: str = Field(description="Full name")
    email: str = Field(description="Primary email address")
    phone: Optional[str] = Field(None)
    location: Optional[str] = Field(None, description="City, State or Country")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    github: Optional[str] = Field(None, description="GitHub profile URL")
    portfolio: Optional[str] = Field(None, description="Portfolio/website URL")


class WorkExperience(BaseModel):
    company: str
    title: str
    start_date: str = Field(description="Format: YYYY-MM or YYYY")
    end_date: Optional[str] = Field(None, description="YYYY-MM or 'Present'")
    location: Optional[str] = None
    bullets: list[str] = Field(default_factory=list, description="Achievement bullets")
    technologies: list[str] = Field(default_factory=list, description="Technologies mentioned")


class Education(BaseModel):
    institution: str
    degree: str
    field: Optional[str] = None
    graduation_date: Optional[str] = Field(None, description="YYYY-MM or YYYY")
    gpa: Optional[float] = None
    honors: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str
    description: str
    technologies: list[str] = Field(default_factory=list)
    url: Optional[str] = None


class ParsedResume(BaseModel):
    contact: ContactInfo
    summary: Optional[str] = Field(None, description="Professional summary or objective")
    experience: list[WorkExperience] = Field(default_factory=list)
    education: list[Education] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    total_years_experience: Optional[float] = Field(
        None, description="Calculated from work history dates"
    )
    seniority_level: Optional[str] = Field(
        None, description="junior/mid/senior/lead/executive"
    )


# ─── Agent ───────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are an expert resume parser. Your job is to extract all information
from resume text with perfect accuracy.

Rules:
- Extract EXACTLY what is written, don't infer or fabricate
- Normalize dates to YYYY-MM format where possible; use YYYY if month unknown
- For seniority: <2yr=junior, 2-5yr=mid, 5-10yr=senior, 10-15yr=lead, 15yr+=executive
- Extract ALL technologies mentioned in bullet points into the technologies array
- If a field is not present, return null/empty — don't guess
- Calculate total_years_experience from earliest start_date to now"""

resume_parser_agent: Agent[None, ParsedResume] = Agent(
    model="claude-claude-sonnet-4-6-20251001",
    result_type=ParsedResume,
    system_prompt=_SYSTEM_PROMPT,
)


# ─── File extraction ──────────────────────────────────────────────────────────

def extract_text_from_pdf(file_path: str | Path) -> str:
    """Extract raw text from PDF using pypdf."""
    text_parts: list[str] = []

    with open(file_path, "rb") as f:
        reader = pypdf.PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

    return "\n".join(text_parts)


def extract_text_from_docx(file_path: str | Path) -> str:
    """Extract raw text from DOCX."""
    doc = docx.Document(file_path)
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def extract_text(file_path: str, file_type: str) -> str:
    """Route to correct extractor based on file type."""
    path = Path(file_path)

    if file_type.upper() == "PDF":
        return extract_text_from_pdf(path)
    elif file_type.upper() == "DOCX":
        return extract_text_from_docx(path)
    elif file_type.upper() == "TXT":
        return path.read_text(encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file type: {file_type}")


# ─── Main parse function ──────────────────────────────────────────────────────

async def parse_resume(
    raw_text: str,
    *,
    user_id: str,
    resume_id: str,
) -> ParsedResume:
    """Parse resume text into structured data using AI."""
    log = logger.bind(user_id=user_id, resume_id=resume_id)
    log.info("Starting resume parse")

    # Truncate to avoid token limits (keep first 6000 chars)
    truncated = raw_text[:6000]

    result = await resume_parser_agent.run(
        f"Parse this resume:\n\n{truncated}"
    )

    log.info(
        "Resume parse complete",
        name=result.data.contact.name,
        experience_count=len(result.data.experience),
        skills_count=len(result.data.skills),
        seniority=result.data.seniority_level,
    )

    return result.data
