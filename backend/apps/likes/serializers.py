from rest_framework import serializers

from apps.posts.models import Post
from apps.posts.serializers import PostListSerializer
from apps.users.serializers import AuthorSerializer

from .models import Like


class LikeSerializer(serializers.ModelSerializer):
    # AuthorSerializer вместо UserSerializer — без email и без лишних запросов.
    user_detail = AuthorSerializer(source="user", read_only=True)
    post_detail = PostListSerializer(source="post", read_only=True)
    # Лайкать можно только опубликованные посты. Раньше queryset был Post.objects.all():
    # перебирая id, можно было лайкнуть чужой черновик и получить в ответе
    # его заголовок/описание (post_detail) — утечка неопубликованного контента.
    post = serializers.PrimaryKeyRelatedField(
        queryset=Post.objects.filter(status=Post.Status.PUBLISHED)
    )

    class Meta:
        model = Like
        fields = (
            "id",
            "user",
            "user_detail",
            "post",
            "post_detail",
            "created_at",
        )
        read_only_fields = ("user", "created_at", "user_detail", "post_detail")

    def validate(self, attrs):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Вы должны быть авторизованы.")

        post = attrs.get("post")

        if post and post.author_id == request.user.id:
            raise serializers.ValidationError("Нельзя лайкать свой пост.")

        if Like.objects.filter(user=request.user, post=post).exists():
            raise serializers.ValidationError("Вы уже лайкнули этот пост.")

        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return Like.objects.create(user=request.user, **validated_data)
