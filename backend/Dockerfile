# 共通設定

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    gcc \
    python3-dev \
    musl-dev \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*


# 開発環境ステージ

FROM base AS development

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /app/logs /app/staticfiles /app/media

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]


# 本番環境ステージ

FROM base AS production

COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install gunicorn

COPY . .

# 静的ファイルの収集
RUN mkdir -p /app/staticfiles /app/media /app/logs && \
    python manage.py collectstatic --noinput || true

# 非rootユーザーを作成
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# ヘルスチェックの設定
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/health/ || exit 1

CMD ["gunicorn", "dishboard_project.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--threads", "4", \
     "--worker-class", "gthread", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]