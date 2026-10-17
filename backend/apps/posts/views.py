import logging

from django.db.models import Count, Exists, OuterRef, Q, F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.likes.models import Like
from apps.likes.serializers import LikeSerializer

from .filters import PostFilter
from .models import Post
from .permissions import CanCreatePost, CanPublishPost, IsAuthorOrReadOnly
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
    search_fields = ("title", "content", "excerpt")
    ordering_fields = ("created_at", "views_count", "published_at")
    ordering = ("-created_at",)

    lookup_field = "slug"
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = (
            Post.objects
            .select_related("author", "category")
            .prefetch_related("tags")
        )

        annotations = {
            "likes_count": Count("likes", distinct=True),
            "comments_count": Count("comments", distinct=True),
        }

        if self.request.user.is_authenticated:
            annotations["is_liked"] = Exists(
                Like.objects.filter(post=OuterRef("pk"), user=self.request.user)
            )

        qs = qs.annotate(**annotations)

        if self.action == "retrieve":
            qs = qs.prefetch_related("comments__author")

        qs = qs.order_by("-created_at")

        if not self.request.user.is_authenticated:
            return qs.filter(status=Post.Status.PUBLISHED)

        return qs.filter(
            Q(status=Post.Status.PUBLISHED) |
            Q(author=self.request.user)
        )

    def get_serializer_class(self):
        if self.action == "list":
            return PostListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PostWriteSerializer
        return PostDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()

        if not request.user.is_authenticated or instance.author != request.user:
            # Используем F() для атомарного инкремента — защита от гонки запросов (+2)
            Post.objects.filter(pk=instance.pk).update(
                views_count=F("views_count") + 1
            )
            instance.refresh_from_db(fields=["views_count"])

        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        post = serializer.save()
        logger.info(
            "Пользователь %s (ID: %d) создал пост «%s» (ID: %d)",
            self.request.user.username,
            self.request.user.id,
            post.title,
            post.id,
        )

    def perform_update(self, serializer):
        post = serializer.save()
        logger.info(
            "Пользователь %s (ID: %d) обновил пост «%s» (ID: %d)",
            self.request.user.username,
            self.request.user.id,
            post.title,
            post.id,
        )

    def perform_destroy(self, instance):
        logger.info(
            "Пользователь %s (ID: %d) удалил пост «%s» (ID: %d)",
            self.request.user.username,
            self.request.user.id,
            instance.title,
            instance.id,
        )
        instance.delete()

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def like(self, request, slug=None):
        post = self.get_object()

        if post.author == request.user:
            return Response(
                {"detail": "Нельзя лайкать свой пост."},
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
            LikeSerializer(like).data,
            status=status.HTTP_201_CREATED,
        )

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

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[CanPublishPost],
    )
    def publish(self, request, slug=None):
        post = self.get_object()
        post.publish()

        logger.info(
            "Пост «%s» (ID: %d) опубликован пользователем %s (ID: %d)",
            post.title,
            post.id,
            request.user.username,
            request.user.id,
        )
        return Response(
            PostDetailSerializer(post, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[CanPublishPost],
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
        return Response(
            PostDetailSerializer(post, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=False,
        methods=["get"],
        permission_classes=[permissions.IsAuthenticated],
    )
    def my_posts(self, request):
        posts = self.get_queryset().filter(author=request.user)
        page = self.paginate_queryset(posts)

        if page is not None:
            return self.get_paginated_response(
                PostListSerializer(page, many=True, context={"request": request}).data
            )

        return Response(
            PostListSerializer(posts, many=True, context={"request": request}).data
        )