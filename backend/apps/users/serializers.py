from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from apps.common.validators import validate_image_upload

from .models import Subscription

User = get_user_model()

SELF_ASSIGNABLE_ROLES = [
    (User.Role.READER, "Читатель"),
    (User.Role.AUTHOR, "Автор"),
]


def build_avatar_url(user, request=None):
    url = user.avatar_url
    if not url:
        return None
    if url.startswith(("http://", "https://")):
        return url
    return request.build_absolute_uri(url) if request else url


class AuthorSerializer(serializers.ModelSerializer):
    """Компактное публичное представление пользователя для вложения в посты,
    комментарии и лайки.

    Раньше сюда вкладывался полный UserSerializer: в каждом посте/комментарии
    наружу уходил **email автора** (утечка персональных данных), а на каждого
    автора выполнялось 3 дополнительных SQL-запроса (N+1).
    """

    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "avatar", "role")
        read_only_fields = fields

    def get_avatar(self, obj) -> str | None:
        return build_avatar_url(obj, self.context.get("request"))


class PublicUserSerializer(AuthorSerializer):
    """Публичный профиль: без email и других приватных полей."""

    bio = serializers.CharField(read_only=True)
    is_subscribed = serializers.SerializerMethodField()
    subscribers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()

    class Meta(AuthorSerializer.Meta):
        fields = AuthorSerializer.Meta.fields + (
            "bio", "created_at",
            "is_subscribed", "subscribers_count", "following_count",
        )
        read_only_fields = fields

    # Значения берутся из аннотаций queryset (один SQL-запрос);
    # фолбэк на отдельные запросы — для объектов, полученных не через view.
    def get_is_subscribed(self, obj) -> bool:
        annotated = getattr(obj, "is_subscribed_annotated", None)
        if annotated is not None:
            return bool(annotated)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Subscription.objects.filter(subscriber=request.user, author=obj).exists()
        return False

    def get_subscribers_count(self, obj) -> int:
        annotated = getattr(obj, "subscribers_count_annotated", None)
        return annotated if annotated is not None else obj.subscribers.count()

    def get_following_count(self, obj) -> int:
        annotated = getattr(obj, "following_count_annotated", None)
        return annotated if annotated is not None else obj.subscriptions.count()


class UserSerializer(PublicUserSerializer):
    """Приватный профиль текущего пользователя (/me, ответ на логин)."""

    email = serializers.EmailField(required=False)
    bio = serializers.CharField(required=False, allow_blank=True, max_length=500)
    username = serializers.CharField(required=False, max_length=150)

    class Meta(PublicUserSerializer.Meta):
        fields = PublicUserSerializer.Meta.fields + ("email",)
        # Роль больше нельзя поменять через PATCH /me: раньше разжалованный
        # администратором автор мог сам вернуть себе права.
        read_only_fields = (
            "id", "avatar", "role", "created_at",
            "is_subscribed", "subscribers_count", "following_count",
        )

    def validate_username(self, value):
        value = value.strip()
        for validator in User._meta.get_field("username").validators:
            try:
                validator(value)
            except DjangoValidationError as exc:
                raise serializers.ValidationError(list(exc.messages))
        qs = User.objects.filter(username__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует.")
        return value

    def validate_email(self, value):
        value = User.objects.normalize_email(value.strip())
        existing = User.objects.get_by_email(value)
        if existing and (not self.instance or existing.pk != self.instance.pk):
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return value

    def update(self, instance, validated_data):
        for field in ("bio", "email", "username"):
            if field in validated_data:
                setattr(instance, field, validated_data.pop(field))
        try:
            with transaction.atomic():
                instance.save()
        except IntegrityError:
            raise serializers.ValidationError({"email": ["Пользователь с таким email уже существует."]})
        return instance


class AvatarUploadSerializer(serializers.Serializer):
    avatar = serializers.FileField()

    def validate_avatar(self, value):
        return validate_image_upload(value, settings.AVATAR_MAX_FILE_SIZE_MB)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Неверный старый пароль.")
        return value

    def validate(self, attrs):
        user = self.context["request"].user
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": ["Новый пароль совпадает со старым."]})
        # Раньше проверялась только длина >= 8: можно было поставить "12345678".
        try:
            validate_password(attrs["new_password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"new_password": list(exc.messages)})
        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password2 = serializers.CharField(write_only=True, trim_whitespace=False)
    bio = serializers.CharField(required=False, allow_blank=True, default="", max_length=500)

    role = serializers.ChoiceField(
        choices=SELF_ASSIGNABLE_ROLES,
        default=User.Role.READER,
        required=False,
    )

    class Meta:
        model = User
        fields = ("username", "email", "password", "password2", "bio", "role")

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Пользователь с таким именем уже существует.")
        return value

    def validate_email(self, value):
        value = User.objects.normalize_email(value.strip())
        if User.objects.get_by_email(value):
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Пароли не совпадают."})
        # Валидаторам нужен «черновой» пользователь, чтобы ловить пароль ≈ username/email.
        draft = User(username=attrs.get("username", ""))
        draft.email = attrs.get("email", "")
        try:
            validate_password(attrs["password"], user=draft)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        try:
            with transaction.atomic():
                return User.objects.create_user(
                    username=validated_data["username"],
                    email=validated_data["email"],
                    password=validated_data["password"],
                    role=validated_data.get("role", User.Role.READER),
                    bio=validated_data.get("bio", ""),
                )
        except IntegrityError:
            # Гонка двух одновременных регистраций — ловит уникальный индекс в БД.
            raise serializers.ValidationError({"detail": "Пользователь с таким email или именем уже существует."})


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["username"] = user.username
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data
