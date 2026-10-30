"""Удаление файлов из хранилища вместе с записями.

post_delete срабатывает и при каскадном удалении (например, удалили
пользователя → удалились его посты и медиа), в отличие от переопределённого
Model.delete(), который вызывается только для одиночного объекта.
"""
from django.db import transaction


def delete_file_on_commit(field_file):
    if not field_file:
        return
    storage, name = field_file.storage, field_file.name
    # Удаляем только после успешного коммита: при откате транзакции файл нужен.
    transaction.on_commit(lambda: storage.delete(name))
