from django.contrib import admin
from django.contrib.admin import display
from django.utils.html import format_html

from .models import Comment


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "author",
        "post_link",
        "content_preview",
        "is_reply_display",
        "created_at",
        "is_edited",
    )
    list_filter = ("is_edited", "created_at")
    search_fields = ("content", "author__username", "post__title")
    raw_id_fields = ("post", "author", "parent")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("-created_at",)
    list_per_page = 50
    list_select_related = ("author", "post")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("author", "post", "parent")

    @display(description="Пост")
    def post_link(self, obj):
        if obj.post:
            url = f"/admin/posts/post/{obj.post.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.post.title[:40])
        return "—"

    @display(description="Текст")
    def content_preview(self, obj):
        if len(obj.content) > 60:
            return f"{obj.content[:60]}..."
        return obj.content

    @display(description="Ответ?", boolean=True)
    def is_reply_display(self, obj):
        return obj.parent is not None