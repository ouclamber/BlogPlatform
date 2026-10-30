import logging

from rest_framework import permissions, viewsets

from apps.common.pagination import LargePagination
from apps.posts.querysets import visible_posts_q

from .models import Comment
from .permissions import IsAuthorOrReadOnly
from .serializers import CommentSerializer

logger = logging.getLogger("comments")


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]
    # Раньше страница была 10 элементов, а фронтенд читал только первую —
    # комментарии после 10-го просто не показывались.
    pagination_class = LargePagination

    def get_queryset(self):
        user = self.request.user
        # Комментарии к чужим черновикам больше не видны всем подряд.
        visible = visible_posts_q(user, prefix="post__")

        qs = (
            Comment.objects
            .filter(visible)
            .select_related("author", "post")
            .order_by("created_at", "id")
        )

        post_slug = self.request.query_params.get("post")
        if post_slug:
            qs = qs.filter(post__slug=post_slug)

        return qs

    def perform_create(self, serializer):
        comment = serializer.save(author=self.request.user)
        logger.info(
            "Пользователь %s оставил комментарий к посту «%s»",
            self.request.user.username,
            comment.post.title,
        )

    def perform_update(self, serializer):
        changed = serializer.validated_data.get("content", serializer.instance.content) != serializer.instance.content
        comment = serializer.save(is_edited=serializer.instance.is_edited or changed)
        logger.info(
            "Пользователь %s отредактировал комментарий к посту «%s»",
            self.request.user.username,
            comment.post.title,
        )

    def perform_destroy(self, instance):
        logger.info(
            "Пользователь %s удалил комментарий к посту «%s»",
            self.request.user.username,
            instance.post.title,
        )
        instance.delete()
