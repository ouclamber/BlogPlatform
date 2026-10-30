import logging

from django.db.models import Exists, OuterRef
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.comments.models import Comment
from apps.likes.models import Like
from apps.likes.serializers import LikeSerializer

from .filters import PostFilter
from .models import Post
from .permissions import CanCreatePost, CanPublishPost, IsAuthorOrReadOnly
from .querysets import count_subquery, visible_posts_q
from .serializers import (
    PostDetailSerializer,
    PostListSerializer,
    PostWriteSerializer,
)

logger = logging.getLogger("posts")


class PostViewSet(viewsets.ModelViewSet):
    permission_classes = [
        permissions.IsAuthenticatedOrReadOnly,
        IsAuthorOrReadOnly,
        CanCreatePost,
    ]

    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]

    filterset_class = PostFilter
    search_fields = ("title", "excerpt", "content")
    ordering_fields = ("created_at", "views_count", "published_at", "likes_count")
    ordering = ("-created_at",)

    lookup_field = "slug"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        user = self.request.user
        qs = (
            Post.objects
            .select_related("author", "category")
            .prefetch_related("tags")
            .annotate(
                likes_count=count_subquery(Like),
                comments_count=count_subquery(Comment),
            )
            .filter(visible_posts_q(user))
        )

        if user.is_authenticated:
            qs = qs.annotate(
                is_liked=Exists(Like.objects.filter(post=OuterRef("pk"), user=user))
            )

        # Списку не нужен content (может быть десятки КБ на пост).
        if self.action in ("list", "my_posts"):
            qs = qs.defer("content")

        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("list", "my_posts"):
            return PostListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PostWriteSerializer
        return PostDetailSerializer

    def _detail_response(self, post, status_code=status.HTTP_200_OK):
        """Ответ с полным представлением поста (автор, теги, счётчики).

        Раньше create/update возвращали PostWriteSerializer (category/tags как id,
        без author и счётчиков) — фронтенд подменял этим объектом пост в списках.
        """
        fresh = self.get_queryset().get(pk=post.pk)
        data = PostDetailSerializer(fresh, context=self.get_serializer_context()).data
        return Response(data, status=status_code)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        if instance.is_published and instance.author_id != getattr(request.user, "id", None):
            instance.increment_views()

        return Response(self.get_serializer(instance).data)

    @extend_schema(responses={201: PostDetailSerializer})
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        logger.info(
            "Пользователь %s (ID: %d) создал пост «%s» (ID: %d)",
            request.user.username, request.user.id, post.title, post.id,
        )
        return self._detail_response(post, status.HTTP_201_CREATED)

    @extend_schema(responses={200: PostDetailSerializer})
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        post = serializer.save()
        logger.info(
            "Пользователь %s (ID: %d) обновил пост «%s» (ID: %d)",
            request.user.username, request.user.id, post.title, post.id,
        )
        return self._detail_response(post)

    def perform_destroy(self, instance):
        logger.info(
            "Пользователь %s (ID: %d) удалил пост «%s» (ID: %d)",
            self.request.user.username,
            self.request.user.id,
            instance.title,
            instance.id,
        )
        instance.delete()

    @extend_schema(request=None, responses={201: LikeSerializer})
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def like(self, request, slug=None):
        post = self.get_object()

        if post.author_id == request.user.id:
            return Response(
                {"detail": "Нельзя лайкать свой пост."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not post.is_published:
            return Response(
                {"detail": "Можно лайкать только опубликованные посты."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        like, created = Like.objects.get_or_create(user=request.user, post=post)

        if not created:
            return Response(
                {"detail": "Пост уже лайкнут."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            "Пользователь %s (ID: %d) лайкнул пост «%s» (ID: %d)",
            request.user.username,
            request.user.id,
            post.title,
            post.id,
        )
        return Response(
            LikeSerializer(like, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(request=None, responses={204: None})
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def unlike(self, request, slug=None):
        post = self.get_object()
        deleted, _ = Like.objects.filter(user=request.user, post=post).delete()

        if not deleted:
            return Response(
                {"detail": "Лайк не найден."},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info(
            "Пользователь %s (ID: %d) убрал лайк с поста «%s» (ID: %d)",
            request.user.username,
            request.user.id,
            post.title,
            post.id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(request=None, responses={200: PostDetailSerializer})
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, CanPublishPost],
    )
    def publish(self, request, slug=None):
        post = self.get_object()

        # Раньше публиковать мог любой владелец поста — в т.ч. разжалованный в читатели.
        if not request.user.is_author:
            return Response(
                {"detail": "Только авторы и администраторы могут публиковать посты."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not (post.content or "").strip():
            return Response(
                {"detail": "Нельзя опубликовать пост с пустым содержанием."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        post.publish()

        logger.info(
            "Пост «%s» (ID: %d) опубликован пользователем %s (ID: %d)",
            post.title,
            post.id,
            request.user.username,
            request.user.id,
        )
        return self._detail_response(post)

    @extend_schema(request=None, responses={200: PostDetailSerializer})
    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, CanPublishPost],
    )
    def archive(self, request, slug=None):
        post = self.get_object()
        post.archive()

        logger.info(
            "Пост «%s» (ID: %d) архивирован пользователем %s (ID: %d)",
            post.title,
            post.id,
            request.user.username,
            request.user.id,
        )
        return self._detail_response(post)

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def my_posts(self, request):
        posts = self.filter_queryset(self.get_queryset().filter(author=request.user))
        page = self.paginate_queryset(posts)
        serializer_context = self.get_serializer_context()

        if page is not None:
            return self.get_paginated_response(
                PostListSerializer(page, many=True, context=serializer_context).data
            )

        return Response(PostListSerializer(posts, many=True, context=serializer_context).data)
