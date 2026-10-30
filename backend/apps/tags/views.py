import logging

from django.db.models import Count, Q
from rest_framework import filters, viewsets

from .models import Tag
from .permissions import IsAuthenticatedCreateOrAdminWrite
from .serializers import TagSerializer

logger = logging.getLogger("tags")


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedCreateOrAdminWrite]
    lookup_field = "slug"
    # Справочник небольшой и нужен фронтенду целиком (селектор тегов, фильтры).
    # С пагинацией по 10 фронтенд видел только первые 10 тегов.
    pagination_class = None
    filter_backends = [filters.SearchFilter]
    search_fields = ("name",)

    def get_queryset(self):
        # Считаем только опубликованные посты: раньше счётчик выдавал
        # существование чужих черновиков с этим тегом.
        return (
            Tag.objects
            .annotate(posts_count=Count("posts", filter=Q(posts__status="published"), distinct=True))
            .order_by("name")
        )

    def perform_create(self, serializer):
        tag = serializer.save()
        logger.info(
            "Пользователь %s создал тег «%s»",
            self.request.user.username,
            tag.name,
        )