from django.contrib import admin
from django.contrib.admin import display
from django.db.models import Count
from django.utils.html import format_html

from .models import Like


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):

    list_display = ("id", "user", "post_link", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__username", "post__title")
    raw_id_fields = ("user", "post")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("user", "post")

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user", "post")

    @display(description="Пост")
    def post_link(self, obj):
        if obj.post:
            url = f"/admin/posts/post/{obj.post.id}/change/"
            return format_html('<a href="{}">{}</a>', url, obj.post.title[:40])
        return "—"