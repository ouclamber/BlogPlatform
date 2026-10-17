from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models

from .crypto import encrypt, decrypt, double_encrypt, double_decrypt, blind_index


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
    # REQUIRED_FIELDS = ["email"]

    class Meta:
        verbose_name = "Пользователь"
        verbose_name_plural = "Пользователи"
        ordering = ["-created_at"]

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
        return double_decrypt(self._bio_encrypted)

    @bio.setter
    def bio(self, value: str):
        if not value:
            self._bio_encrypted = ""
        else:
            self._bio_encrypted = double_encrypt(value)

    @property
    def avatar(self) -> str:
        if not self._avatar_path_encrypted:
            return ""
        return decrypt(self._avatar_path_encrypted)

    @avatar.setter
    def avatar(self, value):
        if not value:
            self._avatar_path_encrypted = ""
            return

        if hasattr(value, "name"):
            from django.core.files.storage import default_storage
            path = default_storage.save(f"avatars/{value.name}", value)
            self._avatar_path_encrypted = encrypt(path)
        else:
            self._avatar_path_encrypted = encrypt(str(value))

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
        verbose_name = "Подписка"
        verbose_name_plural = "Подписки"

    def __str__(self):
        return f"{self.subscriber.username} подписан на {self.author.username}"