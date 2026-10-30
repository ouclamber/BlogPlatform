from django.contrib import admin
from django.contrib.admin import display
from django.utils.html import format_html
from django.urls import reverse

from .models import Media


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user_link",
        "file_preview",
        "file_link",
        "file_type",
        "size_display",
        "created_at",
    )
    list_filter = ("file_type", "created_at")
    search_fields = ("user__username", "user__email", "file", "file_type")
    raw_id_fields = ("user",)
    readonly_fields = ("file_type", "size", "created_at")
    ordering = ("-created_at",)
    list_per_page = 25
    
    actions = ["delete_files"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user")

    @display(description="Пользователь", ordering="user__username")
    def user_link(self, obj):
        if obj.user:
            url = reverse("admin:users_user_change", args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.username)
        return "-"

    @display(description="Превью")
    def file_preview(self, obj):
        if obj.file and obj.file_type and obj.file_type.startswith("image/"):
            return format_html(
                '<img src="{}" style="width: 50px; height: 50px; '
                'border-radius: 4px; object-fit: cover;" />',
                obj.file.url,
            )
        return ""

    @display(description="Ссылка")
    def file_link(self, obj):
        if obj.file:
            return format_html(
                '<a href="{}" target="_blank" class="button">Скачать</a>',
                obj.file.url,
            )
        return "-"

    @display(description="Размер", ordering="size")
    def size_display(self, obj):
        if not obj.size:
            return "0 Б"
        if obj.size < 1024:
            return f"{obj.size} Б"
        if obj.size < 1024 * 1024:
            return f"{round(obj.size / 1024, 2)} КБ"
        return f"{round(obj.size / (1024 * 1024), 2)} МБ"

    @admin.action(description="Удалить выбранные файлы")
    def delete_files(self, request, queryset):
        count = 0
        for obj in queryset:
            if obj.file:
                obj.file.delete(save=False)
            obj.delete()
            count += 1
        self.message_user(request, f"Удалено файлов: {count}")