from django.contrib import admin
from django.contrib.admin import display
from django.db.models import Count
from django.utils.html import format_html

from .models import Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):

    list_display = ("id", "name", "slug", "posts_count")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("name",)

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .annotate(posts_count_annotated=Count("posts", distinct=True))
        )

    @display(description="Постов", ordering="posts_count_annotated")
    def posts_count(self, obj):
        count = getattr(obj, "posts_count_annotated", 0)
        if count > 0:
            return format_html(
                '<a href="/admin/posts/post/?tags__id__exact={}">{}</a>',
                obj.id,
                count,
            )
        return count