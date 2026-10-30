from django.apps import AppConfig


class MediaConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.media'
    verbose_name = 'Медиафайлы'

    def ready(self):
        from . import signals  # noqa: F401
