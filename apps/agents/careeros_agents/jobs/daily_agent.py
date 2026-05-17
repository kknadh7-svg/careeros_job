"""Daily Job Discovery Agent — LangGraph multi-agent workflow."""

from __future__ import annotations

import asyncio
from typing import Annotated, TypedDict

import structlog
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

logger = structlog.get_logger(__name__)


# ─── State ────────────────────────────────────────────────────────────────────

class DailyAgentState(TypedDict):
    user_id: str
    resume_embedding: list[float] | None
    new_job_ids: list[str]
    matched_jobs: list[dict]
    ranked_jobs: list[dict]
    notifications_sent: int
    tailoring_queued: int
    errors: list[str]


# ─── Nodes ────────────────────────────────────────────────────────────────────

async def fetch_user_profile(state: DailyAgentState) -> DailyAgentState:
    """Fetch user's resume embedding and preferences."""
    log = logger.bind(user_id=state["user_id"])
    log.info("Fetching user profile")

    # In production: query DB for user's base resume embedding
    # and job search preferences
    try:
        # Placeholder for DB call
        state["resume_embedding"] = None  # Will be filled from DB
        return state
    except Exception as e:
        state["errors"].append(f"fetch_profile: {e}")
        return state


async def scrape_new_jobs(state: DailyAgentState) -> DailyAgentState:
    """Scrape new jobs from all active sources."""
    log = logger.bind(user_id=state["user_id"])
    log.info("Scraping new jobs")

    # Call job aggregator APIs
    from careeros_agents.jobs.scrapers import scrape_all_sources

    try:
        new_ids = await scrape_all_sources(user_id=state["user_id"])
        state["new_job_ids"] = new_ids
        log.info("Scraped new jobs", count=len(new_ids))
    except Exception as e:
        state["errors"].append(f"scrape_jobs: {e}")
        state["new_job_ids"] = []

    return state


async def semantic_match_jobs(state: DailyAgentState) -> DailyAgentState:
    """Use vector similarity to match new jobs to user's resume."""
    log = logger.bind(user_id=state["user_id"])

    if not state["new_job_ids"] or not state["resume_embedding"]:
        log.info("Skipping matching — no jobs or no embedding")
        state["matched_jobs"] = []
        return state

    try:
        # Vector similarity search against user's resume embedding
        # In production: pgvector cosine similarity query
        state["matched_jobs"] = []  # Placeholder
        log.info("Matched jobs", count=len(state["matched_jobs"]))
    except Exception as e:
        state["errors"].append(f"match_jobs: {e}")
        state["matched_jobs"] = []

    return state


async def rerank_with_llm(state: DailyAgentState) -> DailyAgentState:
    """Use LLM to rerank top candidates based on full context."""
    import openai

    log = logger.bind(user_id=state["user_id"])

    if not state["matched_jobs"]:
        state["ranked_jobs"] = []
        return state

    try:
        # Take top 20, rerank with GPT-4o to top 10
        top_candidates = state["matched_jobs"][:20]
        # LLM reranking call
        state["ranked_jobs"] = top_candidates[:10]
        log.info("Reranked jobs", count=len(state["ranked_jobs"]))
    except Exception as e:
        state["errors"].append(f"rerank: {e}")
        state["ranked_jobs"] = state["matched_jobs"][:5]

    return state


async def queue_resume_tailoring(state: DailyAgentState) -> DailyAgentState:
    """Queue tailored resume generation for top matched jobs."""
    log = logger.bind(user_id=state["user_id"])

    queued = 0
    for job in state["ranked_jobs"][:5]:  # Top 5 only
        try:
            # Push to BullMQ resume:tailor queue
            # await queue.add("tailor", {"userId": state["user_id"], "jobId": job["id"]})
            queued += 1
        except Exception as e:
            state["errors"].append(f"queue_tailor_{job.get('id', '?')}: {e}")

    state["tailoring_queued"] = queued
    log.info("Queued tailoring", count=queued)
    return state


async def send_notifications(state: DailyAgentState) -> DailyAgentState:
    """Create notifications and send email digest."""
    log = logger.bind(user_id=state["user_id"])

    if not state["ranked_jobs"]:
        state["notifications_sent"] = 0
        return state

    try:
        # Create in-app notification
        # await db.notification.create({...})

        # Queue email via n8n webhook
        # await httpx.post(N8N_NOTIFICATION_WEBHOOK, json={...})

        state["notifications_sent"] = len(state["ranked_jobs"])
        log.info("Notifications sent", count=state["notifications_sent"])
    except Exception as e:
        state["errors"].append(f"notifications: {e}")
        state["notifications_sent"] = 0

    return state


async def log_agent_run(state: DailyAgentState) -> DailyAgentState:
    """Log final agent run statistics."""
    logger.info(
        "Daily agent run complete",
        user_id=state["user_id"],
        new_jobs=len(state["new_job_ids"]),
        matched=len(state["matched_jobs"]),
        ranked=len(state["ranked_jobs"]),
        tailoring_queued=state["tailoring_queued"],
        notifications_sent=state["notifications_sent"],
        errors=state["errors"],
    )
    return state


# ─── Graph definition ─────────────────────────────────────────────────────────

def build_daily_agent_graph() -> StateGraph:
    graph = StateGraph(DailyAgentState)

    graph.add_node("fetch_profile", fetch_user_profile)
    graph.add_node("scrape_jobs", scrape_new_jobs)
    graph.add_node("match_jobs", semantic_match_jobs)
    graph.add_node("rerank", rerank_with_llm)
    graph.add_node("queue_tailoring", queue_resume_tailoring)
    graph.add_node("send_notifications", send_notifications)
    graph.add_node("log_run", log_agent_run)

    graph.set_entry_point("fetch_profile")
    graph.add_edge("fetch_profile", "scrape_jobs")
    graph.add_edge("scrape_jobs", "match_jobs")
    graph.add_edge("match_jobs", "rerank")
    graph.add_edge("rerank", "queue_tailoring")
    graph.add_edge("queue_tailoring", "send_notifications")
    graph.add_edge("send_notifications", "log_run")
    graph.add_edge("log_run", END)

    return graph


daily_agent = build_daily_agent_graph().compile()


async def run_daily_agent_for_user(user_id: str) -> dict:
    """Entry point to run the daily agent for a single user."""
    initial_state = DailyAgentState(
        user_id=user_id,
        resume_embedding=None,
        new_job_ids=[],
        matched_jobs=[],
        ranked_jobs=[],
        notifications_sent=0,
        tailoring_queued=0,
        errors=[],
    )

    final_state = await daily_agent.ainvoke(initial_state)
    return dict(final_state)


async def run_daily_agent_for_all_users(user_ids: list[str]) -> None:
    """Run daily agent in parallel for all active users."""
    logger.info("Starting daily agent run", user_count=len(user_ids))

    # Process in batches of 10 to avoid overwhelming downstream APIs
    batch_size = 10
    for i in range(0, len(user_ids), batch_size):
        batch = user_ids[i : i + batch_size]
        tasks = [run_daily_agent_for_user(uid) for uid in batch]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for uid, result in zip(batch, results):
            if isinstance(result, Exception):
                logger.error("Daily agent failed for user", user_id=uid, error=str(result))

    logger.info("Daily agent run complete for all users")
