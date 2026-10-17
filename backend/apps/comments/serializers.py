from rest_framework import serializers

from apps.users.serializers import UserSerializer

from .models import Comment


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    replies = serializers.SerializerMethodField()

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
            "replies",
        )
        read_only_fields = ("author", "created_at", "updated_at", "is_edited")

    def get_replies(self, obj):
        if obj.parent_id is not None:
            return []
        qs = obj.replies.all().select_related("author")
        return CommentSerializer(qs, many=True, context=self.context).data

    def validate(self, attrs):
        parent = attrs.get("parent")
        post = attrs.get("post") or getattr(self.instance, "post", None)
        if parent and parent.post_id != getattr(post, "id", post):
            raise serializers.ValidationError(
                {"parent": "Родительский комментарий должен принадлежать тому же посту."}
            )
        return attrs