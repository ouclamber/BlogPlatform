from django.apps import AppConfig


class PostsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.posts'
    verbose_name = 'Посты'

    def ready(self):
        from . import signals  # noqa: F401
