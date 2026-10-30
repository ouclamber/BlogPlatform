from django.db import transaction
from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import User


@receiver(post_delete, sender=User, dispatch_uid="users_delete_avatar_file")
def delete_avatar_file(sender, instance, **kwargs):
    path = instance.avatar
    if path:
        transaction.on_commit(lambda: User._delete_stored_file(path))
