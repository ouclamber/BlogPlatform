import logging

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
    update=extend_schema(
        request=MEDIA_MULTIPART_SCHEMA,
        responses={200: MediaSerializer},
    ),
    partial_update=extend_schema(
        request=MEDIA_MULTIPART_SCHEMA,
        responses={200: MediaSerializer},
    ),
)
class MediaViewSet(viewsets.ModelViewSet):
    serializer_class = MediaSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user

        qs = Media.objects.select_related("user").order_by("-created_at")

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

    def perform_update(self, serializer):
        media = serializer.save()
        logger.info(
            "Пользователь %s (ID: %d) обновил файл %s (ID: %d)",
            self.request.user.username,
            self.request.user.id,
            media.file.name,
            media.id,
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
        queryset = self.get_queryset()
        total_size = sum(m.size for m in queryset)

        return Response({
            "total_files": queryset.count(),
            "total_size_bytes": total_size,
            "total_size_mb": round(total_size / (1024 * 1024), 2),
            "images": queryset.filter(file_type__startswith="image/").count(),
            "videos": queryset.filter(file_type__startswith="video/").count(),
            "audios": queryset.filter(file_type__startswith="audio/").count(),
            "documents": queryset.filter(file_type__startswith="application/").count(),
        })