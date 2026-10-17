from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.admin import display
from django.utils.html import format_html
from django.db.models import Count
from django.utils import timezone

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Админка пользователей."""

    list_display = (
        "id",
        "avatar_preview",
        "username",
        "email",
        "role_colored",
        "posts_count",
        "is_staff",
        "is_active",
        "created_at",
    )
    list_filter = ("role", "is_staff", "is_active", "created_at")
    search_fields = ("username", "email")
    ordering = ("-created_at",)
    list_per_page = 25

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Дополнительно", {
            "fields": ("bio", "avatar", "role"),
            "description": "Поле bio шифруется автоматически.",
        }),
        ("Статистика", {
            "fields": ("posts_count_display", "likes_given_count", "comments_count"),
            "classes": ("collapse",),
        }),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("username", "email", "password1", "password2", "role"),
        }),
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "posts_count_display",
        "likes_given_count",
        "comments_count",
    )

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .annotate(
                posts_count_annotated=Count("posts", distinct=True),
                likes_given_count_annotated=Count("likes", distinct=True),
                comments_count_annotated=Count("comments", distinct=True),
            )
        )

    @display(description="Аватар")
    def avatar_preview(self, obj):
        avatar_url = self._get_avatar_url(obj)
        if avatar_url:
            return format_html(
                '<img src="{}" style="width: 40px; height: 40px; '
                'border-radius: 50%; object-fit: cover;" />',
                avatar_url,
            )
        initials = obj.username[:2].upper()
        return format_html(
            '<div style="width: 40px; height: 40px; background: #a855f7; '
            'color: white; border-radius: 50%; display: flex; '
            'align-items: center; justify-content: center; '
            'font-weight: bold;">{}</div>',
            initials,
        )

    @display(description="Роль", ordering="role")
    def role_colored(self, obj):
        colors = {
            "reader": "#3b82f6",
            "author": "#8b5cf6",
            "admin": "#ef4444",
        }
        color = colors.get(obj.role, "#6b7280")
        return format_html(
            '<span style="background: {}; color: white; padding: 2px 10px; '
            'border-radius: 12px; font-size: 12px;">{}</span>',
            color,
            obj.get_role_display(),
        )

    @display(description="Постов", ordering="posts_count_annotated")
    def posts_count(self, obj):
        count = getattr(obj, "posts_count_annotated", 0)
        if count > 0:
            return format_html(
                '<a href="/admin/posts/post/?author__id__exact={}">'
                '<b>{}</b></a>',
                obj.id,
                count,
            )
        return count

    @display(description="Постов")
    def posts_count_display(self, obj):
        count = getattr(obj, "posts_count_annotated", 0)
        return f"{count} постов"

    @display(description="Лайков поставлено")
    def likes_given_count(self, obj):
        return getattr(obj, "likes_given_count_annotated", 0)

    @display(description="Комментариев")
    def comments_count(self, obj):
        return getattr(obj, "comments_count_annotated", 0)

    def _get_avatar_url(self, obj):
        avatar = obj.avatar
        if not avatar:
            return None
        if avatar.startswith("http"):
            return avatar
        if avatar.startswith("/media/"):
            return avatar
        return f"/media/{avatar}"