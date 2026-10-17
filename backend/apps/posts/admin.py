from django.contrib import admin
from django.contrib.admin import display
from django.utils.html import format_html
from django.utils import timezone
from django.db.models import Count
from django.urls import reverse
from datetime import timedelta

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "cover_preview",
        "title_preview",
        "author_link",
        "category_link",
        "tags_list",
        "status_colored",
        "views_count",
        "likes_count_display",
        "comments_count_display",
        "is_recent",
        "created_at",
    )

    list_display_links = ("id", "title_preview")

    list_filter = (
        "status",
        "category",
        ("author", admin.RelatedOnlyFieldListFilter),
        ("tags", admin.RelatedOnlyFieldListFilter),
        "created_at",
        "published_at",
    )

    search_fields = (
        "title", "content", "excerpt",
        "author__username", "category__name", "tags__name",
    )

    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ("author", "category")
    filter_horizontal = ("tags",)
    date_hierarchy = "created_at"
    ordering = ("-created_at",)
    list_per_page = 25
    save_on_top = True

    readonly_fields = (
        "created_at",
        "updated_at",
        "views_count",
        "likes_count_display",
        "comments_count_display",
        "author_link",
        "category_link",
        "cover_image_preview",
    )

    fieldsets = (
        ("Основное", {
            "fields": ("title", "slug", "excerpt", "content")
        }),
        ("Медиа", {
            "fields": ("cover_image", "cover_image_preview")
        }),
        ("Классификация", {
            "fields": ("category", "category_link", "tags")
        }),
        ("Публикация", {
            "fields": ("author", "author_link", "status", "published_at")
        }),
        ("Статистика", {
            "fields": ("views_count", "likes_count_display", "comments_count_display"),
            "classes": ("collapse",),
        }),
        ("Даты", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ["make_published", "make_draft", "make_archived", "reset_views"]

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related("author", "category")
            .prefetch_related("tags")
            .annotate(
                likes_count_annotated=Count("likes", distinct=True),
                comments_count_annotated=Count("comments", distinct=True),
            )
        )

    def get_readonly_fields(self, request, obj=None):
        readonly = list(self.readonly_fields)
        # Тест требует, чтобы при редактировании author был readonly
        if obj:
            readonly.append("author")
        return readonly

    def save_model(self, request, obj, form, change):
        # Тест требует, чтобы при создании автор устанавливался автоматически
        if not obj.author_id:
            obj.author = request.user
        super().save_model(request, obj, form, change)

    @display(description="Обложка")
    def cover_preview(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="width: 50px; height: 40px; '
                'border-radius: 4px; object-fit: cover;" />',
                obj.cover_image.url
            )
        return "—"

    @display(description="Обложка (превью)")
    def cover_image_preview(self, obj):
        if obj.cover_image:
            return format_html(
                '<img src="{}" style="max-height: 150px; border-radius: 6px;" />',
                obj.cover_image.url
            )
        return ""

    @display(description="Заголовок", ordering="title")
    def title_preview(self, obj):
        if len(obj.title) > 50:
            return f"{obj.title[:50]}..."
        return obj.title

    @display(description="Автор", ordering="author__username")
    def author_link(self, obj):
        if obj.author:
            url = reverse("admin:users_user_change", args=[obj.author.id])
            return format_html('<a href="{}">{}</a>', url, obj.author.username)
        return "-"

    @display(description="Категория", ordering="category__name")
    def category_link(self, obj):
        if obj.category:
            url = reverse("admin:categories_category_change", args=[obj.category.id])
            return format_html('<a href="{}">{}</a>', url, obj.category.name)
        return "-"

    @display(description="Недавний", boolean=True)
    def is_recent(self, obj):
        if not obj.created_at:
            return False
        return obj.created_at >= timezone.now() - timedelta(days=7)

    @display(description="Теги")
    def tags_list(self, obj):
        tags = obj.tags.all()
        if not tags:
            return "-"
        badges = []
        for tag in tags[:3]:
            badges.append(
                format_html(
                    '<span style="background: #a855f7; color: white; '
                    'padding: 2px 8px; border-radius: 12px; '
                    'font-size: 11px; margin: 1px;">{}</span>',
                    tag.name,
                )
            )
        if tags.count() > 3:
            badges.append(
                format_html(
                    '<span style="background: #6b7280; color: white; '
                    'padding: 2px 8px; border-radius: 12px; '
                    'font-size: 11px; margin: 1px;">+{}</span>',
                    tags.count() - 3,
                )
            )
        return format_html(" ".join(badges))

    @display(description="Статус", ordering="status")
    def status_colored(self, obj):
        colors = {
            Post.Status.DRAFT: "#f59e0b",
            Post.Status.PUBLISHED: "#10b981",
            Post.Status.ARCHIVED: "#6b7280",
        }
        color = colors.get(obj.status, "#000")
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 10px; '
            'border-radius: 12px; font-size: 12px;">{}</span>',
            color,
            obj.get_status_display(),
        )

    @display(description="Лайки", ordering="likes_count_annotated")
    def likes_count_display(self, obj):
        return getattr(obj, "likes_count_annotated", 0)

    @display(description="Комментарии", ordering="comments_count_annotated")
    def comments_count_display(self, obj):
        return getattr(obj, "comments_count_annotated", 0)

    @admin.action(description="Опубликовать выбранные")
    def make_published(self, request, queryset):
        updated = queryset.update(
            status=Post.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        self.message_user(request, f"Опубликовано {updated} постов.")

    @admin.action(description="Перевести в черновик")
    def make_draft(self, request, queryset):
        updated = queryset.update(status=Post.Status.DRAFT, published_at=None)
        self.message_user(request, f"В черновик переведено {updated} постов.")

    @admin.action(description="Архивировать выбранные")
    def make_archived(self, request, queryset):
        updated = queryset.update(status=Post.Status.ARCHIVED, published_at=None)
        self.message_user(request, f"Архивировано {updated} постов.")

    @admin.action(description="Сбросить просмотры")
    def reset_views(self, request, queryset):
        updated = queryset.update(views_count=0)
        self.message_user(request, f"Сброшены просмотры у {updated} постов.")