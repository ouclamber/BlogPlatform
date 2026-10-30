import logging

from django.db.models import BooleanField, Prefetch, Value
from rest_framework import mixins, permissions, viewsets

from apps.comments.models import Comment
from apps.posts.models import Post
from apps.posts.querysets import count_subquery

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
        if getattr(self, "swagger_fake_view", False):
            return Like.objects.none()
        user = self.request.user
        # Пост подгружается одним запросом сразу с аннотациями счётчиков —
        # иначе PostListSerializer делал бы по 3 запроса на каждый лайк.
        posts = (
            Post.objects
            .select_related("author", "category")
            .prefetch_related("tags")
            .defer("content")
            .annotate(
                likes_count=count_subquery(Like),
                comments_count=count_subquery(Comment),
                is_liked=Value(True, output_field=BooleanField()),
            )
        )
        return (
            Like.objects
            .filter(user=user)
            .select_related("user")
            .prefetch_related(Prefetch("post", queryset=posts))
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