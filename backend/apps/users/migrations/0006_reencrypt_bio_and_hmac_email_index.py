"""Перевод персональных данных на новую схему шифрования.

* bio: XOR(SECRET_KEY)+Fernet  ->  Fernet (не зависит от SECRET_KEY);
* email_hash: sha256(email + SECRET_KEY)  ->  HMAC-SHA256 с отдельным ключом;
* дубликаты email (раньше не было ограничения в БД) — у более поздних
  аккаунтов индекс очищается, чтобы следующая миграция смогла создать
  уникальный индекс. Email у них сохраняется, вход по username не меняется.
"""
import logging

from django.db import migrations

logger = logging.getLogger("users")


def forwards(apps, schema_editor):
    from apps.users import crypto

    User = apps.get_model("users", "User")
    seen_hashes = set()

    for user in User.objects.order_by("id").iterator():
        changed = []

        if user._bio_encrypted:
            plain_bio = crypto.double_decrypt(user._bio_encrypted)
            user._bio_encrypted = crypto.encrypt(plain_bio) if plain_bio else ""
            changed.append("_bio_encrypted")

        new_hash = ""
        if user._email_encrypted:
            plain_email = crypto.decrypt(user._email_encrypted)
            new_hash = crypto.blind_index(plain_email)
            if new_hash in seen_hashes:
                logger.warning("Дубликат email у пользователя id=%s — индекс очищен.", user.id)
                new_hash = ""
            else:
                seen_hashes.add(new_hash)

        if user._email_hash != new_hash:
            user._email_hash = new_hash
            changed.append("_email_hash")

        if changed:
            user.save(update_fields=changed)


def backwards(apps, schema_editor):
    from apps.users import crypto

    User = apps.get_model("users", "User")
    for user in User.objects.iterator():
        fields = []
        if user._bio_encrypted:
            user._bio_encrypted = crypto.double_encrypt(crypto.decrypt(user._bio_encrypted))
            fields.append("_bio_encrypted")
        if user._email_encrypted:
            user._email_hash = crypto.legacy_blind_index(crypto.decrypt(user._email_encrypted))
            fields.append("_email_hash")
        if fields:
            user.save(update_fields=fields)


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0005_subscription"),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
