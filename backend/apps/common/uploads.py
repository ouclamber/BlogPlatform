"""Генерация безопасных имён файлов для загрузок.

Имя от клиента никогда не используется как есть: берём «человекочитаемую»
основу через slugify и добавляем случайный суффикс, чтобы URL нельзя было
угадать перебором и чтобы исключить коллизии/обход путей.
"""
import os
import uuid

from django.utils import timezone
from django.utils.text import slugify


def safe_filename(original_name: str) -> str:
    base, ext = os.path.splitext(os.path.basename(original_name or ""))
    stem = slugify(base, allow_unicode=True)[:40] or "file"
    return f"{stem}-{uuid.uuid4().hex[:12]}{ext.lower()}"


def _dated(prefix: str, filename: str) -> str:
    now = timezone.now()
    return f"{prefix}/{now:%Y/%m}/{safe_filename(filename)}"


def avatar_upload_to(instance, filename):
    return _dated("avatars", filename)


def cover_upload_to(instance, filename):
    return _dated("covers", filename)


def media_upload_to(instance, filename):
    return _dated("media_uploads", filename)
