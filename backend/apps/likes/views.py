import logging

from rest_framework import mixins, permissions, viewsets

from .models import Like
from .permissions import IsOwnerOrReadOnly
from .serializers import LikeSerializer

logger = logging.getLogger("likes")


class LikeViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):

    serializer_class = LikeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return (
            Like.objects
            .filter(user=self.request.user)
            .select_related(
                "user",
                "post",
                "post__author",
                "post__category",
            )
            .prefetch_related("post__tags")
        )

    def perform_create(self, serializer):
        like = serializer.save()
        logger.info(
            "Пользователь %s лайкнул пост «%s»",
            self.request.user.username,
            like.post.title,
        )

    def perform_destroy(self, instance):
        logger.info(
            "Пользователь %s убрал лайк с поста «%s»",
            self.request.user.username,
            instance.post.title,
        )
        instance.delete()