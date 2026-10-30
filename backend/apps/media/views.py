import logging

from django.db.models import Count, Q, Sum
from django.db.models.functions import Coalesce

from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Media
from .permissions import IsOwner
from .serializers import MediaSerializer

logger = logging.getLogger("media")


MEDIA_MULTIPART_SCHEMA = {
    "multipart/form-data": {
        "type": "object",
        "properties": {
            "file": {
                "type": "string",
                "format": "binary",
                "description": "Файл изображения (jpeg, png, gif, webp)",
            },
        },
        "required": ["file"],
    },
}


@extend_schema_view(
    create=extend_schema(
        description="Загрузка изображения (jpeg, png, gif, webp). Максимум 10 МБ.",
        request=MEDIA_MULTIPART_SCHEMA,
        responses={201: MediaSerializer},
    ),
)
class MediaViewSet(viewsets.ModelViewSet):
    serializer_class = MediaSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    parser_classes = [MultiPartParser, FormParser]
    # Замена файла через PUT/PATCH оставляла старый файл «сиротой» и не меняла
    # тип/размер. Медиа неизменяемы: удалите и загрузите заново.
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Media.objects.none()
        user = self.request.user

        qs = Media.objects.order_by("-created_at")

        if user.is_admin_role:
            return qs
        return qs.filter(user=user)

    def perform_create(self, serializer):
        media = serializer.save(user=self.request.user)

        logger.info(
            "Пользователь %s (ID: %d) загрузил файл %s (ID: %d, %s байт, тип %s)",
            self.request.user.username,
            self.request.user.id,
            media.file.name,
            media.id,
            media.size,
            media.file_type,
        )

    def perform_destroy(self, instance):
        logger.info(
            "Пользователь %s (ID: %d) удалил файл %s (ID: %d)",
            self.request.user.username,
            self.request.user.id,
            instance.file.name,
            instance.id,
        )
        instance.delete()

    @action(detail=False, methods=["get"])
    def stats(self, request):
        # Один агрегирующий SQL-запрос вместо загрузки всех строк в Python + 5 COUNT.
        stats = self.get_queryset().order_by().aggregate(
            total_files=Count("id"),
            total_size_bytes=Coalesce(Sum("size"), 0),
            images=Count("id", filter=Q(file_type__startswith="image/")),
            videos=Count("id", filter=Q(file_type__startswith="video/")),
            audios=Count("id", filter=Q(file_type__startswith="audio/")),
            documents=Count("id", filter=Q(file_type__startswith="application/")),
        )
        stats["total_size_mb"] = round(stats["total_size_bytes"] / (1024 * 1024), 2)
        return Response(stats)