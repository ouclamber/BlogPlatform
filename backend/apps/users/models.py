from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.files.storage import default_storage
from django.db import models
from django.db.models import Q

from apps.common.uploads import avatar_upload_to

from .crypto import blind_index, decrypt, encrypt


class UserManager(BaseUserManager):
    def create_user(self, username, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError("Email обязателен")
        email = self.normalize_email(email)
        extra_fields.setdefault("role", User.Role.READER)

        bio = extra_fields.pop("bio", "")
        avatar = extra_fields.pop("avatar", "")

        user = self.model(username=username, **extra_fields)

        user.email = email
        if bio:
            user.bio = bio
        if avatar:
            user.avatar = avatar

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(username, email, password, **extra_fields)

    def get_by_email(self, email: str):
        if not email:
            return None
        return self.filter(_email_hash=blind_index(email)).first()


class User(AbstractUser):
    class Role(models.TextChoices):
        READER = "reader", "Читатель"
        AUTHOR = "author", "Автор"
        ADMIN = "admin", "Администратор"

    _email_encrypted = models.TextField(
        blank=True,
        default="",
        db_column="email",
        verbose_name="Email (зашифрован)",
    )
    _email_hash = models.CharField(
        max_length=64,
        blank=True,
        default="",
        db_index=True,
        unique=False,
        db_column="email_hash",
        verbose_name="Email hash (для поиска)",
    )

    _bio_encrypted = models.TextField(
        blank=True,
        default="",
        db_column="bio",
        verbose_name="Био (зашифрован)",
    )

    _avatar_path_encrypted = models.TextField(
        blank=True,
        default="",
        db_column="avatar",
        verbose_name="Путь к аватару (зашифрован)",
    )

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.READER)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = []
    # REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        ordering = ["-created_at"]
        constraints = [
            # Уникальность email на уровне БД: проверка в сериализаторе
            # не защищает от гонки двух одновременных регистраций.
            models.UniqueConstraint(
                fields=["_email_hash"],
                condition=~Q(_email_hash=""),
                name="users_user_unique_email_hash",
            ),
        ]

    def __str__(self):
        return self.username

    @property
    def email(self) -> str:
        if not self._email_encrypted:
            return ""
        return decrypt(self._email_encrypted)

    @email.setter
    def email(self, value: str):
        if not value:
            self._email_encrypted = ""
            self._email_hash = ""
        else:
            self._email_encrypted = encrypt(value)
            self._email_hash = blind_index(value)

    @property
    def bio(self) -> str:
        if not self._bio_encrypted:
            return ""
        return decrypt(self._bio_encrypted)

    @bio.setter
    def bio(self, value: str):
        if not value:
            self._bio_encrypted = ""
        else:
            self._bio_encrypted = encrypt(value)

    @property
    def avatar(self) -> str:
        if not self._avatar_path_encrypted:
            return ""
        return decrypt(self._avatar_path_encrypted)

    @avatar.setter
    def avatar(self, value):
        """Принимает путь в хранилище (str) или загруженный файл.

        Файл сохраняется под случайным именем (имя от клиента не используется),
        предыдущий аватар удаляется из хранилища, чтобы не копились «сироты».
        Валидация содержимого — в сериализаторе (apps.common.validators).
        """
        old_path = self.avatar if self._avatar_path_encrypted else ""

        if not value:
            self._avatar_path_encrypted = ""
        elif hasattr(value, "read"):
            path = default_storage.save(avatar_upload_to(self, value.name), value)
            self._avatar_path_encrypted = encrypt(path)
        else:
            self._avatar_path_encrypted = encrypt(str(value))

        new_path = self.avatar if self._avatar_path_encrypted else ""
        if old_path and old_path != new_path:
            self._delete_stored_file(old_path)

    @staticmethod
    def _delete_stored_file(path: str):
        if not path or path.startswith(("http://", "https://")):
            return
        path = path.removeprefix("/media/")
        try:
            if default_storage.exists(path):
                default_storage.delete(path)
        except Exception:  # pragma: no cover - ошибка хранилища не должна ронять запрос
            pass

    @property
    def avatar_url(self) -> str:
        path = self.avatar
        if not path:
            return ""
        if path.startswith(("http://", "https://", "/media/")):
            return path
        return default_storage.url(path)

    @property
    def is_author(self):
        return self.role in (self.Role.AUTHOR, self.Role.ADMIN)

    @property
    def is_admin_role(self):
        return self.role == self.Role.ADMIN

    def save(self, *args, **kwargs):
        if self._email_encrypted and not self._email_hash:
            try:
                plain_email = decrypt(self._email_encrypted)
                self._email_hash = blind_index(plain_email)
            except Exception:
                pass
        super().save(*args, **kwargs)

class Subscription(models.Model):
    subscriber = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="subscriptions", # То, на кого я подписан
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="subscribers", # Мои подписчики
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("subscriber", "author")
        constraints = [
            models.CheckConstraint(
                condition=~Q(subscriber=models.F("author")),
                name="users_subscription_no_self",
            ),
        ]
        verbose_name = "Подписка"
        verbose_name_plural = "Подписки"

    def __str__(self):
        return f"{self.subscriber.username} подписан на {self.author.username}"