from django.conf import settings
from rest_framework import serializers

from apps.common.validators import validate_image_upload

from .models import Media

MAX_FILE_SIZE_MB = getattr(settings, "MEDIA_MAX_FILE_SIZE_MB", 10)


class MediaSerializer(serializers.ModelSerializer):
    file = serializers.FileField(
        required=True,
        allow_null=False,
        help_text=f"Загрузите изображение (jpeg, png, gif, webp). Максимум {MAX_FILE_SIZE_MB} МБ.",
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
        # Проверка реального формата (а не только расширения/Content-Type от клиента),
        # размера и разрешения. Имя файла заменяется на безопасное в upload_to.
        return validate_image_upload(value, MAX_FILE_SIZE_MB)

    def get_file_url(self, obj) -> str | None:
        return obj.file.url if obj.file else None

    def get_filename(self, obj) -> str | None:
        return obj.file.name.split("/")[-1] if obj.file else None

    def get_size_mb(self, obj) -> float:
        return round(obj.size / (1024 * 1024), 2) if obj.size else 0
