import logging

from django.db.models import Count
from rest_framework import viewsets

from .models import Tag
from .permissions import IsAuthenticatedCreateOrAdminWrite
from .serializers import TagSerializer

logger = logging.getLogger("tags")


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedCreateOrAdminWrite]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Tag.objects
            .annotate(posts_count=Count("posts", distinct=True))
            .order_by("name")  
        )

    def perform_create(self, serializer):
        tag = serializer.save()
        logger.info(
            "Пользователь %s создал тег «%s»",
            self.request.user.username,
            tag.name,
        )