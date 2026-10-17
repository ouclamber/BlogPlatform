import logging

from rest_framework import permissions, viewsets

from .models import Comment
from .permissions import IsAuthorOrReadOnly
from .serializers import CommentSerializer

logger = logging.getLogger("comments")


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsAuthorOrReadOnly]

    def get_queryset(self):
        qs = (
            Comment.objects
            .select_related("author", "post", "parent")
            .prefetch_related("replies__author")
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
        comment = serializer.save(is_edited=True)
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