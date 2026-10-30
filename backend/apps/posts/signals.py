from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.common.signals import delete_file_on_commit

from .models import Post


@receiver(post_delete, sender=Post, dispatch_uid="posts_delete_cover_file")
def delete_cover_file(sender, instance, **kwargs):
    delete_file_on_commit(instance.cover_image)
