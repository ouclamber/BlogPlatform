from django.conf import settings
from django.db import models
from django.utils.text import slugify
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.db.models import F

from apps.categories.models import Category
from apps.tags.models import Tag


class Post(models.Model):

    class Status(models.TextChoices):
        DRAFT = "draft", "Черновик"
        PUBLISHED = "published", "Опубликован"
        ARCHIVED = "archived", "В архиве"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name="posts",
    )

    title = models.CharField(max_length=255, verbose_name="Заголовок")
    slug = models.SlugField(
        max_length=280,
        unique=True,
        blank=True,
        verbose_name="Slug",
    )
    excerpt = models.CharField(
        max_length=500,
        blank=True,
        default="",
        verbose_name="Краткое описание",
    )
    content = models.TextField(verbose_name="Содержание")
    cover_image = models.ImageField(
        upload_to="covers/%Y/%m/%d/",
        blank=True,
        null=True,
        verbose_name="Обложка",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        verbose_name="Статус",
    )
    views_count = models.PositiveIntegerField(
        default=0,
        verbose_name="Просмотры",
    )
    published_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Дата публикации",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Создан",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Обновлен",
    )

    class Meta:
        verbose_name = "Пост"
        verbose_name_plural = "Посты"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["status"]),
            models.Index(fields=["author"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["published_at"]),
        ]
        permissions = [
            ("can_publish_post", "Может публиковать посты"),
            ("can_archive_post", "Может архивировать посты"),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()

        if self.status == self.Status.PUBLISHED and not self.published_at:
            raise ValidationError({
                "published_at": "Опубликованный пост должен иметь дату публикации."
            })

        if self.status == self.Status.PUBLISHED and not self.content.strip():
            raise ValidationError({
                "content": "Нельзя опубликовать пост с пустым содержанием."
            })

        if self.slug and len(self.slug) > 280:
            raise ValidationError({
                "slug": "Slug не может быть длиннее 280 символов."
            })

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()

        if self.status != self.Status.PUBLISHED:
            self.published_at = None

        if not self.slug:
            base_slug = slugify(self.title, allow_unicode=True)
            if len(base_slug) > 250:
                base_slug = base_slug[:250]
            if not base_slug:
                base_slug = "post"

            slug = base_slug
            counter = 1
            while Post.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                counter += 1
                slug = f"{base_slug}-{counter}"
            self.slug = slug

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return f"/posts/{self.slug}/"

    def increment_views(self):
        Post.objects.filter(pk=self.pk).update(views_count=F("views_count") + 1)
        self.refresh_from_db(fields=["views_count"])

    def publish(self):
        self.status = self.Status.PUBLISHED
        self.save()

    def archive(self):
        self.status = self.Status.ARCHIVED
        self.save()

    def draft(self):
        self.status = self.Status.DRAFT
        self.save()

    @property
    def is_published(self):
        return self.status == self.Status.PUBLISHED

    @property
    def reading_time(self):
        words_per_minute = 200
        word_count = len(self.content.split())
        return max(1, word_count // words_per_minute)

    @classmethod
    def get_published(cls):
        return cls.objects.filter(status=cls.Status.PUBLISHED)

    @classmethod
    def get_drafts(cls):
        return cls.objects.filter(status=cls.Status.DRAFT)