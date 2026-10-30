import logging

from django.db.models import Count, Exists, OuterRef, Value
from django.db.models import BooleanField
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema, inline_serializer
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.common.throttling import (
    LoginRateThrottle,
    PasswordChangeRateThrottle,
    RegisterRateThrottle,
)

from .models import Subscription, User
from .serializers import (
    AvatarUploadSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer,
    LogoutSerializer,
    PublicUserSerializer,
    RegisterSerializer,
    UserSerializer,
)

logger = logging.getLogger("users")


def annotate_user_stats(queryset, viewer):
    """Счётчики подписок и флаг is_subscribed одним запросом вместо трёх на пользователя."""
    queryset = queryset.annotate(
        subscribers_count_annotated=Count("subscribers", distinct=True),
        following_count_annotated=Count("subscriptions", distinct=True),
    )
    if viewer is not None and viewer.is_authenticated:
        return queryset.annotate(
            is_subscribed_annotated=Exists(
                Subscription.objects.filter(subscriber=viewer, author=OuterRef("pk"))
            )
        )
    return queryset.annotate(is_subscribed_annotated=Value(False, output_field=BooleanField()))


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [LoginRateThrottle]


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterRateThrottle]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return annotate_user_stats(User.objects.all(), self.request.user).get(pk=self.request.user.pk)


class UploadAvatarView(generics.GenericAPIView):
    serializer_class = AvatarUploadSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(responses={200: UserSerializer})
    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.avatar = serializer.validated_data["avatar"]
        user.save(update_fields=["_avatar_path_encrypted", "updated_at"])
        logger.info("Пользователь %s (ID: %d) обновил аватар", user.username, user.id)
        return Response(UserSerializer(user, context={"request": request}).data)

    # POST оставлен для совместимости с README (/me/avatar/ POST).
    post = patch

    @extend_schema(request=None, responses={204: None})
    def delete(self, request, *args, **kwargs):
        user = request.user
        user.avatar = ""
        user.save(update_fields=["_avatar_path_encrypted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


def blacklist_all_tokens(user):
    """Отзывает все refresh-токены пользователя (после смены пароля)."""
    for token in OutstandingToken.objects.filter(user=user).exclude(blacklistedtoken__isnull=False):
        BlacklistedToken.objects.get_or_create(token=token)


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [PasswordChangeRateThrottle]

    @extend_schema(
        responses={200: inline_serializer(
            "PasswordChanged",
            {"detail": serializers.CharField(), "access": serializers.CharField(), "refresh": serializers.CharField()},
        )}
    )
    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])

        # Все остальные сессии (в т.ч. украденные refresh-токены) становятся недействительными,
        # а текущему клиенту выдаём новую пару, чтобы его не разлогинило.
        blacklist_all_tokens(user)
        refresh = RefreshToken.for_user(user)
        logger.info("Пользователь %s (ID: %d) сменил пароль", user.username, user.id)
        return Response(
            {"detail": "Пароль изменен.", "access": str(refresh.access_token), "refresh": str(refresh)},
            status=status.HTTP_200_OK,
        )

    put = patch
    post = patch


class LogoutView(generics.GenericAPIView):
    """Отзыв refresh-токена. Раньше «выход» только чистил localStorage,
    а украденный refresh-токен продолжал работать до истечения срока."""

    serializer_class = LogoutSerializer
    permission_classes = [permissions.AllowAny]

    @extend_schema(responses={205: None})
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            RefreshToken(serializer.validated_data["refresh"]).blacklist()
        except TokenError:
            # Токен уже недействителен — цель достигнута.
            pass
        return Response(status=status.HTTP_205_RESET_CONTENT)


class PublicUserView(generics.RetrieveAPIView):
    serializer_class = PublicUserSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "username"

    def get_queryset(self):
        return annotate_user_stats(User.objects.filter(is_active=True), self.request.user)


class SubscriptionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]
    lookup_value_regex = r"\d+"

    @extend_schema(
        request=None,
        responses={200: None, 201: None},
        parameters=[OpenApiParameter("id", int, OpenApiParameter.PATH)],
    )
    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle_subscription(self, request, pk=None):
        author = get_object_or_404(User, pk=pk, is_active=True)

        if author == request.user:
            return Response(
                {"detail": "Нельзя подписаться на самого себя."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deleted, _ = Subscription.objects.filter(subscriber=request.user, author=author).delete()
        if deleted:
            return Response({"status": "unsubscribed"}, status=status.HTTP_200_OK)

        Subscription.objects.get_or_create(subscriber=request.user, author=author)
        return Response({"status": "subscribed"}, status=status.HTTP_201_CREATED)
