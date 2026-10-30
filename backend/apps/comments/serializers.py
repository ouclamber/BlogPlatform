from rest_framework import serializers

from apps.posts.models import Post
from apps.posts.querysets import visible_posts_q
from apps.users.serializers import AuthorSerializer

from .models import Comment

MAX_COMMENT_LENGTH = 5000


def visible_posts(user):
    return Post.objects.filter(visible_posts_q(user))


class CommentSerializer(serializers.ModelSerializer):
    """Плоское представление комментария.

    Вложенное поле ``replies`` удалено: каждый ответ приходил дважды (в списке и
    внутри родителя), а ``obj.replies.all().select_related(...)`` ломал prefetch и
    давал N+1 запрос. Дерево строится на клиенте по полю ``parent``.
    """

    author = AuthorSerializer(read_only=True)
    content = serializers.CharField(max_length=MAX_COMMENT_LENGTH)

    class Meta:
        model = Comment
        fields = (
            "id",
            "post",
            "author",
            "parent",
            "content",
            "created_at",
            "updated_at",
            "is_edited",
        )
        read_only_fields = ("author", "created_at", "updated_at", "is_edited")

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get("request")
        user = getattr(request, "user", None)

        # Комментировать можно только видимые пользователю посты: раньше можно было
        # оставить комментарий к чужому черновику, зная его id.
        posts = visible_posts(user)
        fields["post"].queryset = posts
        fields["parent"].queryset = Comment.objects.filter(post__in=posts)

        # При редактировании нельзя «перенести» комментарий в другой пост/ветку.
        if self.instance is not None:
            fields["post"].read_only = True
            fields["parent"].read_only = True
        return fields

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Комментарий не может быть пустым.")
        return value

    def validate(self, attrs):
        parent = attrs.get("parent")
        post = attrs.get("post") or getattr(self.instance, "post", None)
        if parent and parent.post_id != getattr(post, "id", post):
            raise serializers.ValidationError(
                {"parent": "Родительский комментарий должен принадлежать тому же посту."}
            )
        return attrs
