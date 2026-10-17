from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Subscription

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    bio = serializers.CharField(required=False, allow_blank=True)
    
    # Разрешаем менять роль, но только на reader или author
    role = serializers.ChoiceField(
        choices=[
            (User.Role.READER, "Читатель"),
            (User.Role.AUTHOR, "Автор"),
        ],
        required=False,
    )

    is_subscribed = serializers.SerializerMethodField()
    subscribers_count = serializers.IntegerField(source="subscribers.count", read_only=True)
    following_count = serializers.IntegerField(source="subscriptions.count", read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "bio",
            "avatar", "role", "created_at",
            "is_subscribed", "subscribers_count", "following_count",
        )
        read_only_fields = ("id", "created_at")

    def get_avatar(self, obj):
        avatar_path = obj.avatar
        if not avatar_path:
            return None
        if avatar_path.startswith("http"):
            return avatar_path
        if not avatar_path.startswith("/media/"):
            avatar_path = f"/media/{avatar_path}"
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(avatar_path)
        return avatar_path

    def get_is_subscribed(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Subscription.objects.filter(
                subscriber=request.user, author=obj
            ).exists()
        return False

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError(
                "Смена роли на администратора запрещена."
            )
        return value

    def update(self, instance, validated_data):
        if "bio" in validated_data:
            instance.bio = validated_data.pop("bio")
        if "email" in validated_data:
            instance.email = validated_data.pop("email")
        if "username" in validated_data:
            instance.username = validated_data.pop("username")
        if "role" in validated_data:
            instance.role = validated_data.pop("role")
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    bio = serializers.CharField(required=False, allow_blank=True, default="")

    role = serializers.ChoiceField(
        choices=[
            (User.Role.READER, "Читатель"),
            (User.Role.AUTHOR, "Автор"),
        ],
        default=User.Role.READER,
        required=False,
    )

    class Meta:
        model = User
        fields = ("username", "email", "password", "password2", "bio", "role")

    def validate_email(self, value):
        if User.objects.get_by_email(value):
            raise serializers.ValidationError(
                "Пользователь с таким email уже существует."
            )
        return value

    def validate_role(self, value):
        if value == User.Role.ADMIN:
            raise serializers.ValidationError(
                "Регистрация с ролью admin запрещена."
            )
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError(
                {"password2": "Пароли не совпадают."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        bio = validated_data.pop("bio", "")
        role = validated_data.pop("role", User.Role.READER)

        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=role,
        )

        if bio:
            user.bio = bio
            user.save()

        return user


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