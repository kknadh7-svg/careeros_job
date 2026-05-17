# Multi-stage Dockerfile for CareerOS Python Agent Service

FROM python:3.12-slim as base

# System deps
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv for fast dependency management
RUN pip install uv

# ─── Development stage ────────────────────────────────────────────────────────
FROM base as development

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen

COPY . .

EXPOSE 8080
CMD ["uv", "run", "uvicorn", "careeros_agents.api:app", "--reload", "--host", "0.0.0.0", "--port", "8080"]

# ─── Production stage ─────────────────────────────────────────────────────────
FROM base as production

# Don't run as root in prod
RUN useradd -m -u 1000 appuser

COPY pyproject.toml uv.lock* ./
RUN uv sync --frozen --no-dev

COPY . .

RUN chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["uv", "run", "uvicorn", "careeros_agents.api:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "2"]
