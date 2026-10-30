from django.conf import settings
from django.db import models

from apps.posts.models import Post


class Like(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name="Пользователь"
    )
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name="likes",
        verbose_name="Пост"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Создан"
    )
    
    class Meta:
        verbose_name = "Лайк"
        verbose_name_plural = "Лайки"
        ordering = ["-created_at"]
        unique_together = ["user", "post"] 
        indexes = [
            models.Index(fields=["user", "post"]),
        ]
    
    def __str__(self):
        return f"{self.user.username} → {self.post.title}"