from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.common.signals import delete_file_on_commit

from .models import Media


@receiver(post_delete, sender=Media, dispatch_uid="media_delete_file")
def delete_media_file(sender, instance, **kwargs):
    delete_file_on_commit(instance.file)
