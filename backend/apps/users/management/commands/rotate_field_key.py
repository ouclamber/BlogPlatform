"""Перешифровка персональных данных на новый FIELD_ENCRYPTION_KEY.

Ключ из старого .env.example был опубликован в репозитории — его нужно считать
скомпрометированным. Порядок ротации:

    1. Сгенерируйте новый ключ и пропишите его в FIELD_ENCRYPTION_KEY.
    2. python manage.py rotate_field_key --old-key <СТАРЫЙ_КЛЮЧ>
"""
from cryptography.fernet import Fernet, InvalidToken
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.users import crypto
from apps.users.models import User

FIELDS = ("_email_encrypted", "_bio_encrypted", "_avatar_path_encrypted")


class Command(BaseCommand):
    help = "Перешифровать email/bio/аватар пользователей со старого ключа на текущий FIELD_ENCRYPTION_KEY."

    def add_arguments(self, parser):
        parser.add_argument("--old-key", required=True, help="Предыдущий FIELD_ENCRYPTION_KEY")
        parser.add_argument("--dry-run", action="store_true", help="Только посчитать, без записи")

    def handle(self, *args, old_key, dry_run, **options):
        try:
            old = Fernet(old_key.encode())
        except (ValueError, TypeError) as exc:
            raise CommandError(f"Некорректный старый ключ: {exc}")

        crypto.reset_key_cache()
        rotated = skipped = 0

        with transaction.atomic():
            for user in User.objects.select_for_update().iterator():
                changed = []
                for field in FIELDS:
                    token = getattr(user, field)
                    if not token:
                        continue
                    try:
                        plain = old.decrypt(token.encode()).decode("utf-8")
                    except InvalidToken:
                        continue  # уже на новом ключе или открытые данные
                    setattr(user, field, crypto.encrypt(plain))
                    changed.append(field)

                if user._email_encrypted:
                    new_hash = crypto.blind_index(crypto.decrypt(user._email_encrypted))
                    if new_hash != user._email_hash:
                        user._email_hash = new_hash
                        changed.append("_email_hash")

                if changed:
                    rotated += 1
                    if not dry_run:
                        user.save(update_fields=changed)
                else:
                    skipped += 1

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(
            f"{'[dry-run] ' if dry_run else ''}Перешифровано: {rotated}, без изменений: {skipped}"
        ))
