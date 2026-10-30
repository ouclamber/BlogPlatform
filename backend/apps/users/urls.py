from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ChangePasswordView,
    LoginView,
    LogoutView,
    MeView,
    PublicUserView,
    RegisterView,
    SubscriptionViewSet,
    UploadAvatarView,
)

router = DefaultRouter()
router.register(r"subscriptions", SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("me/avatar/", UploadAvatarView.as_view(), name="upload-avatar"),
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("users/<str:username>/", PublicUserView.as_view(), name="public-user"),
]

urlpatterns += router.urls
