from django.contrib import admin
from django.contrib.admin import display
from django.db.models import Count
from django.utils.html import format_html

from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "slug",
        "parent",
        "posts_count",
        "children_count",
    )
    list_filter = ("parent",)
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
    raw_id_fields = ("parent",)

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .annotate(
                posts_count_annotated=Count("posts", distinct=True),
                children_count_annotated=Count("children", distinct=True),
            )
        )

    @display(description="Постов", ordering="posts_count_annotated")
    def posts_count(self, obj):
        count = getattr(obj, "posts_count_annotated", 0)
        if count > 0:
            return format_html(
                '<a href="/admin/posts/post/?category__id__exact={}">{}</a>',
                obj.id,
                count,
            )
        return count

    @display(description="Дочерних", ordering="children_count_annotated")
    def children_count(self, obj):
        return getattr(obj, "children_count_annotated", 0)