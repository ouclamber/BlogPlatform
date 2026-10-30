"""URL configuration for blog_project project."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    path("", RedirectView.as_view(url="/api/docs/", permanent=False), name="home"),
    path("admin/", admin.site.urls),
    path("api/users/", include("apps.users.urls")),
    path("api/categories/", include("apps.categories.urls")),
    path("api/comments/", include("apps.comments.urls")),
    path("api/likes/", include("apps.likes.urls")),
    path("api/media/", include("apps.media.urls")),
    path("api/posts/", include("apps.posts.urls")),
    path("api/tags/", include("apps.tags.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if getattr(settings, "USE_DEBUG_TOOLBAR", False):
    urlpatterns.append(path("__debug__/", include("debug_toolbar.urls")))
