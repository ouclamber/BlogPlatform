import mimetypes

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.common.uploads import media_upload_to


class Media(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="media_files",
        verbose_name="Пользователь",
    )
    file = models.FileField(
        upload_to=media_upload_to,
        verbose_name="Файл"
    )
    file_type = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="MIME-тип"
    )
    size = models.PositiveIntegerField(
        default=0,
        verbose_name="Размер (байт)"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Загружен"
    )

    class Meta:
        verbose_name = "Медиафайл"
        verbose_name_plural = "Медиафайлы"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"], name="media_user_created_idx"),
            models.Index(fields=["file_type"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return self.file.name

    def save(self, *args, **kwargs):
        if self.file:
            # Для нового файла пересчитываем всегда: раньше при замене файла
            # тип и размер оставались от старого.
            is_new_file = not getattr(self.file, "_committed", True)
            if is_new_file or not self.file_type:
                self.file_type = mimetypes.guess_type(self.file.name)[0] or ""
            if is_new_file or not self.size:
                self.size = self.file.size
        
        super().save(*args, **kwargs)

    def clean(self):
        max_size = 10 * 1024 * 1024  # 10 MB
        if self.size and self.size > max_size:
            raise ValidationError({
                'file': f"Файл слишком большой. Максимум {max_size // (1024 * 1024)} MB."
            })

    @property
    def is_image(self):
        return self.file_type.startswith("image/")

    @property
    def is_video(self):
        return self.file_type.startswith("video/")

    @property
    def is_audio(self):
        return self.file_type.startswith("audio/")

    @property
    def is_document(self):
        document_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/plain",
        ]
        return self.file_type in document_types

    @property
    def size_kb(self):
        return round(self.size / 1024, 2)

    @property
    def size_mb(self):
        return round(self.size / (1024 * 1024), 2)

    @property
    def extension(self):
        return self.file.name.split('.')[-1].lower() if '.' in self.file.name else ''

    @property
    def filename(self):
        return self.file.name.split('/')[-1]

    def get_file_url(self):
        if self.file:
            return self.file.url
        return None

    @classmethod
    def get_user_files(cls, user, file_type=None):
        qs = cls.objects.filter(user=user)
        if file_type:
            qs = qs.filter(file_type__startswith=file_type)
        return qs

    @classmethod
    def get_user_images(cls, user):
        return cls.get_user_files(user, file_type="image/")

    @classmethod
    def get_user_documents(cls, user):
        return cls.get_user_files(user, file_type="application/")