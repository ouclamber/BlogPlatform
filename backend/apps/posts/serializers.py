from rest_framework import serializers

from apps.categories.serializers import CategorySerializer
from apps.comments.serializers import CommentSerializer
from apps.tags.models import Tag
from apps.tags.serializers import TagSerializer
from apps.users.serializers import UserSerializer

from .models import Post


class PostListSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)

    likes_count = serializers.IntegerField(read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.BooleanField(read_only=True)

    class Meta:
        model = Post
        fields = (
            "id", "title", "slug", "excerpt", "cover_image",
            "author", "category", "tags", "status",
            "views_count", "likes_count", "comments_count", "is_liked",
            "published_at", "created_at",
        )


class PostDetailSerializer(PostListSerializer):
    comments = serializers.SerializerMethodField()
    reading_time = serializers.IntegerField(read_only=True)

    class Meta(PostListSerializer.Meta):
        fields = PostListSerializer.Meta.fields + (
            "content", "updated_at", "reading_time", "comments",
        )

    def get_comments(self, obj):
        qs = obj.comments.filter(parent__isnull=True).select_related("author")[:50]
        return CommentSerializer(qs, many=True, context=self.context).data


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

    def validate_status(self, value):
        request = self.context.get("request")
        if not request or not request.user:
            return value

        if value == Post.Status.PUBLISHED:
            if not request.user.is_author:
                raise serializers.ValidationError(
                    "Только авторы и администраторы могут публиковать посты."
                )

            content = self.initial_data.get("content", "")
            if not content or len(content.strip()) < 10:
                raise serializers.ValidationError(
                    "Содержание поста должно быть не менее 10 символов."
                )

        return value

    def validate_title(self, value):
        if len(value.strip()) < 3:
            raise serializers.ValidationError(
                "Заголовок должен быть не менее 3 символов."
            )
        return value

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