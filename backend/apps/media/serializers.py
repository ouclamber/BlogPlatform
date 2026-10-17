import os
import re

from PIL import Image
from django.conf import settings
from rest_framework import serializers

from .models import Media


MAX_FILE_SIZE_MB = getattr(settings, "MEDIA_MAX_FILE_SIZE_MB", 10)
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

ALLOWED_CONTENT_TYPES = getattr(settings, "MEDIA_ALLOWED_CONTENT_TYPES", (
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
))

ALLOWED_EXTENSIONS = getattr(settings, "MEDIA_ALLOWED_EXTENSIONS", (
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
))

SAFE_FILENAME_PATTERN = re.compile(
    getattr(settings, "MEDIA_SAFE_FILENAME_PATTERN", r'^[\w\-. ]+$')
)


class MediaSerializer(serializers.ModelSerializer):
    file = serializers.FileField(
        required=True,
        allow_null=False,
        help_text="Загрузите изображение (jpeg, png, gif, webp). Максимум 10 МБ.",
    )

    file_url = serializers.SerializerMethodField()
    filename = serializers.SerializerMethodField()
    size_mb = serializers.SerializerMethodField()

    class Meta:
        model = Media
        fields = (
            "id",
            "user",
            "file",
            "file_url",
            "filename",
            "file_type",
            "size",
            "size_mb",
            "created_at",
        )
        read_only_fields = (
            "user",
            "file_type",
            "size",
            "created_at",
            "file_url",
            "filename",
            "size_mb",
        )

    def validate_file(self, value):
        if value.size > MAX_FILE_SIZE_BYTES:
            raise serializers.ValidationError(
                f"Файл слишком большой. Максимум {MAX_FILE_SIZE_MB} МБ."
            )

        ext = os.path.splitext(value.name)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise serializers.ValidationError(
                f"Недопустимое расширение файла. "
                f"Разрешены: {', '.join(ALLOWED_EXTENSIONS)}."
            )

        content_type = getattr(value, "content_type", "")
        if content_type and content_type not in ALLOWED_CONTENT_TYPES:
            raise serializers.ValidationError(
                "Недопустимый тип файла. "
                "Разрешены только изображения (jpeg, png, gif, webp)."
            )

        if not SAFE_FILENAME_PATTERN.match(value.name):
            raise serializers.ValidationError(
                "Имя файла содержит недопустимые символы. "
                "Разрешены: буквы, цифры, дефис, подчёркивание, точка и пробел."
            )

        try:
            image = Image.open(value)
            image.verify()
            value.seek(0)
        except Exception:
            raise serializers.ValidationError(
                "Файл повреждён или не является изображением."
            )

        return value

    def validate(self, attrs):
        file = attrs.get("file")
        if file and file.size == 0:
            raise serializers.ValidationError({"file": "Файл пустой."})
        return attrs

    def get_file_url(self, obj):
        return obj.file.url if obj.file else None

    def get_filename(self, obj):
        return obj.file.name.split("/")[-1] if obj.file else None

    def get_size_mb(self, obj):
        return round(obj.size / (1024 * 1024), 2) if obj.size else 0