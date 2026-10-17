from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Subscription, User
from .serializers import (
    CustomTokenObtainPairSerializer,
    RegisterSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UploadAvatarView(generics.UpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        return self.request.user

    def update(self, request, *args, **kwargs):
        user = self.get_object()
        avatar = request.FILES.get("avatar")
        if not avatar:
            return Response(
                {"detail": "Файл не передан."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.avatar = avatar
        user.save()
        return Response(UserSerializer(user, context={"request": request}).data)


class ChangePasswordView(generics.UpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response(
                {"old_password": "Неверный старый пароль."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password or len(new_password) < 8:
            return Response(
                {"new_password": "Пароль должен быть минимум 8 символов."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.save()
        return Response({"detail": "Пароль изменен."}, status=status.HTTP_200_OK)


class PublicUserView(generics.RetrieveAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "username"


class SubscriptionViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle_subscription(self, request, pk=None):
        author = get_object_or_404(User, pk=pk)
        
        if author == request.user:
            return Response(
                {"detail": "Нельзя подписаться на самого себя."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        sub, created = Subscription.objects.get_or_create(
            subscriber=request.user, 
            author=author
        )

        if not created:
            sub.delete()
            return Response({"status": "unsubscribed"}, status=status.HTTP_200_OK)
        
        return Response({"status": "subscribed"}, status=status.HTTP_201_CREATED)