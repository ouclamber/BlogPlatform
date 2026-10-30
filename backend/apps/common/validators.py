"""Общие валидаторы загружаемых файлов.

Один источник правды для аватаров, обложек постов и медиафайлов:
проверяем размер, расширение, *реальный* формат (по сигнатуре через Pillow)
и защищаемся от «декомпрессионных бомб».
"""
import os

from PIL import Image, UnidentifiedImageError
from django.conf import settings
from rest_framework import serializers

ALLOWED_IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".gif", ".webp")
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "GIF", "WEBP"}

# 40 Мп — с запасом для фото, но отсекает картинки 50000x50000,
# которые при декодировании съедают гигабайты памяти.
MAX_IMAGE_PIXELS = getattr(settings, "MAX_IMAGE_PIXELS", 40_000_000)


def validate_image_upload(file, max_size_mb: int):
    """Проверяет загруженный файл-изображение. Возвращает file или бросает ValidationError."""
    if file is None:
        raise serializers.ValidationError("Файл не передан.")

    size = getattr(file, "size", 0) or 0
    if size == 0:
        raise serializers.ValidationError("Файл пустой.")
    if size > max_size_mb * 1024 * 1024:
        raise serializers.ValidationError(
            f"Файл слишком большой. Максимум {max_size_mb} МБ."
        )

    ext = os.path.splitext(file.name or "")[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise serializers.ValidationError(
            "Недопустимое расширение файла. "
            f"Разрешены: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}."
        )

    try:
        file.seek(0)
        with Image.open(file) as image:
            image_format = image.format
            width, height = image.size
            image.verify()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError):
        raise serializers.ValidationError("Файл повреждён или не является изображением.")
    finally:
        try:
            file.seek(0)
        except Exception:  # pragma: no cover - закрытый поток
            pass

    # Расширение может врать (evil.png с HTML внутри) — сверяем реальный формат.
    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise serializers.ValidationError(
            "Недопустимый тип файла. Разрешены только изображения (jpeg, png, gif, webp)."
        )

    if width * height > MAX_IMAGE_PIXELS:
        raise serializers.ValidationError("Слишком большое разрешение изображения.")

    return file
