# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# libpq/libjpeg нужны в рантайме; компилятор не нужен — используем бинарные колёса.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 libjpeg62-turbo zlib1g \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Процесс не должен работать от root: при RCE это ограничивает ущерб.
RUN useradd --create-home --uid 10001 app \
    && mkdir -p /app/media /app/logs /app/static \
    && chown -R app:app /app/media /app/logs /app/static
USER app

EXPOSE 8000

# runserver — только для разработки (однопоточный, не для боевой нагрузки).
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py collectstatic --noinput && gunicorn blog_project.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-3} --access-logfile -"]
