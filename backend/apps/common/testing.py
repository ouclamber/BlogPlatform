"""Хелперы для тестов (не используются в рантайме)."""
import io

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile


def image_bytes(fmt="PNG", size=(32, 32), mode="RGB", color="red"):
    buffer = io.BytesIO()
    Image.new(mode, size, color=color if mode != "1" else 0).save(buffer, format=fmt)
    return buffer.getvalue()


def image_upload(name="image.png", fmt="PNG", content_type="image/png", **kwargs):
    return SimpleUploadedFile(name, image_bytes(fmt, **kwargs), content_type=content_type)


def html_disguised_as_png(name="evil.png"):
    """Файл с расширением .png, внутри — HTML с JS (классический stored XSS)."""
    payload = b"<html><body><script>alert(document.cookie)</script></body></html>"
    return SimpleUploadedFile(name, payload, content_type="image/png")


def huge_dimensions_png(name="bomb.png"):
    """50 Мп однобитный PNG: пара КБ на диске, ~150 МБ в RGB при декодировании."""
    return image_upload(name, size=(10_000, 5_000), mode="1")
