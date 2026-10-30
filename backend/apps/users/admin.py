from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.contrib.admin import display
from django.utils.html import format_html
from django.db.models import Count
from django.utils import timezone

from .models import User


class _EncryptedFieldsMixin:
    """email/bio — свойства с шифрованием, а не поля модели. Без явного
    объявления в форме страницы добавления/редактирования пользователя
    в админке падали с FieldError (500)."""

    def _init_encrypted(self):
        if self.instance and self.instance.pk:
            self.fields["email"].initial = self.instance.email
            if "bio" in self.fields:
                self.fields["bio"].initial = self.instance.bio

    def clean_email(self):
        email = User.objects.normalize_email((self.cleaned_data.get("email") or "").strip())
        if not email:
            raise forms.ValidationError("Email обязателен.")
        existing = User.objects.get_by_email(email)
        if existing and existing.pk != getattr(self.instance, "pk", None):
            raise forms.ValidationError("Пользователь с таким email уже существует.")
        return email

    def _apply_encrypted(self, user):
        user.email = self.cleaned_data["email"]
        if "bio" in self.cleaned_data:
            user.bio = self.cleaned_data.get("bio", "")
        return user


class AdminUserChangeForm(_EncryptedFieldsMixin, UserChangeForm):
    email = forms.EmailField(label="Email", required=True)
    bio = forms.CharField(label="Био", required=False, widget=forms.Textarea, max_length=500)

    class Meta(UserChangeForm.Meta):
        model = User

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._init_encrypted()

    def save(self, commit=True):
        user = self._apply_encrypted(super().save(commit=False))
        if commit:
            user.save()
            self.save_m2m()
        return user


class AdminUserCreationForm(_EncryptedFieldsMixin, UserCreationForm):
    email = forms.EmailField(label="Email", required=True)

    class Meta(UserCreationForm.Meta):
        model = User
        fields = ("username", "role")

    def save(self, commit=True):
        user = self._apply_encrypted(super().save(commit=False))
        if commit:
            user.save()
        return user


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Админка пользователей."""

    form = AdminUserChangeForm
    add_form = AdminUserCreationForm

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
    # email зашифрован — поиск по подстроке невозможен (раньше поиск падал с FieldError).
    # Точное совпадение email ищется через blind index в get_search_results.
    search_fields = ("username",)
    ordering = ("-created_at",)
    list_per_page = 25

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Дополнительно", {
            "fields": ("bio", "avatar_preview", "role"),
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
        "avatar_preview",
        "created_at",
        "updated_at",
        "posts_count_display",
        "likes_given_count",
        "comments_count",
    )

    def get_search_results(self, request, queryset, search_term):
        queryset, may_have_duplicates = super().get_search_results(request, queryset, search_term)
        if search_term and "@" in search_term:
            from .crypto import blind_index
            queryset |= self.model.objects.filter(_email_hash=blind_index(search_term)).annotate(
                posts_count_annotated=Count("posts", distinct=True),
                likes_given_count_annotated=Count("likes", distinct=True),
                comments_count_annotated=Count("comments", distinct=True),
            )
        return queryset, may_have_duplicates

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
        return obj.avatar_url or None