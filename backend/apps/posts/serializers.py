from django.conf import settings
from rest_framework import serializers

from apps.categories.models import Category
from apps.common.validators import validate_image_upload
from apps.tags.models import Tag
from apps.users.serializers import AuthorSerializer

from .models import Post


class PostCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class PostTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name", "slug")


class PostListSerializer(serializers.ModelSerializer):
    # Компактный автор без email и без N+1 (раньше — полный UserSerializer).
    author = AuthorSerializer(read_only=True)
    # Вложенные категория/теги без posts_count: раньше поле было пустым,
    # а схема API обещала число.
    category = PostCategorySerializer(read_only=True)
    tags = PostTagSerializer(many=True, read_only=True)

    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = (
            "id", "title", "slug", "excerpt", "cover_image",
            "author", "category", "tags", "status",
            "views_count", "likes_count", "comments_count", "is_liked",
            "published_at", "created_at",
        )

    # Значения приходят из аннотаций queryset. Фолбэк нужен, если объект
    # сериализуют вне PostViewSet.get_queryset (раньше поля просто пропадали из ответа).
    def get_likes_count(self, obj) -> int:
        value = getattr(obj, "likes_count", None)
        return value if value is not None else obj.likes.count()

    def get_comments_count(self, obj) -> int:
        value = getattr(obj, "comments_count", None)
        return value if value is not None else obj.comments.count()

    def get_is_liked(self, obj) -> bool:
        value = getattr(obj, "is_liked", None)
        if value is not None:
            return bool(value)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(user=request.user).exists()
        return False


class PostDetailSerializer(PostListSerializer):
    """Детальный пост.

    Поле ``comments`` (до 50 комментариев с вложенными ответами и N+1 на каждого
    автора) удалено: фронтенд всё равно загружает комментарии отдельно через
    /api/comments/?post=<slug>, а пост грузился в разы медленнее.
    """

    reading_time = serializers.IntegerField(read_only=True)

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + ("content", "updated_at", "reading_time")


class PostWriteSerializer(serializers.ModelSerializer):
    tags = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        required=False,
    )

    class Meta:
        model = Post
        fields = (
            "id", "title", "slug", "excerpt", "content",
            "cover_image", "category", "tags", "status",
        )
        read_only_fields = ("slug",)

    def validate_cover_image(self, value):
        if value in (None, ""):
            return value
        # ImageField принимает любой формат, который понимает Pillow (tiff, ico, bmp…),
        # без ограничения размера и разрешения.
        return validate_image_upload(value, settings.COVER_MAX_FILE_SIZE_MB)

    def validate_tags(self, value):
        unique = list(dict.fromkeys(value))
        if len(unique) > settings.MAX_TAGS_PER_POST:
            raise serializers.ValidationError(
                f"Максимум {settings.MAX_TAGS_PER_POST} тегов на пост."
            )
        return unique

    def validate_status(self, value):
        request = self.context.get("request")
        if not request or not request.user:
            return value

        if value == Post.Status.PUBLISHED:
            if not request.user.is_author:
                raise serializers.ValidationError(
                    "Только авторы и администраторы могут публиковать посты."
                )

            # При частичном обновлении content может не прийти — берём текущий.
            content = self.initial_data.get("content")
            if content is None and self.instance is not None:
                content = self.instance.content
            if not content or len(str(content).strip()) < 10:
                raise serializers.ValidationError(
                    "Содержание поста должно быть не менее 10 символов."
                )

        return value

    def validate_title(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Заголовок должен быть не менее 3 символов."
            )
        return value.strip()

    def create(self, validated_data):
        tags = validated_data.pop("tags", [])
        request = self.context["request"]

        post = Post.objects.create(author=request.user, **validated_data)

        if tags:
            post.tags.set(tags)

        return post

    def update(self, instance, validated_data):
        tags = validated_data.pop("tags", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if tags is not None:
            instance.tags.set(tags)

        return instance
