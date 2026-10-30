"""Проверка миграции данных 0006 (переход на новую схему шифрования)."""
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase

from apps.users import crypto


class ReencryptMigrationTests(TransactionTestCase):
    migrate_from = [("users", "0005_subscription")]
    migrate_to = [("users", "0007_email_unique_and_subscription_checks")]

    def setUp(self):
        executor = MigrationExecutor(connection)
        executor.migrate(self.migrate_from)
        old_apps = executor.loader.project_state(self.migrate_from).apps
        User = old_apps.get_model("users", "User")

        # Данные в старом формате: bio = XOR+Fernet, email_hash = sha256(email+SECRET_KEY).
        self.legacy = User.objects.create(
            username="legacy",
            _email_encrypted=crypto.encrypt("Legacy@Example.com"),
            _email_hash=crypto.legacy_blind_index("Legacy@Example.com"),
            _bio_encrypted=crypto.double_encrypt("Старое био"),
        )
        # Дубликат email (раньше в БД не было ограничения).
        self.duplicate = User.objects.create(
            username="duplicate",
            _email_encrypted=crypto.encrypt("legacy@example.com"),
            _email_hash=crypto.legacy_blind_index("legacy@example.com"),
        )

        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(self.migrate_to)
        self.apps = executor.loader.project_state(self.migrate_to).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.loader.build_graph()
        executor.migrate(executor.loader.graph.leaf_nodes())

    def test_data_converted(self):
        User = self.apps.get_model("users", "User")
        legacy = User.objects.get(pk=self.legacy.pk)
        duplicate = User.objects.get(pk=self.duplicate.pk)

        self.assertEqual(crypto.decrypt(legacy._bio_encrypted), "Старое био")
        self.assertEqual(legacy._email_hash, crypto.blind_index("legacy@example.com"))
        # У более позднего дубликата индекс очищен, email сохранён.
        self.assertEqual(duplicate._email_hash, "")
        self.assertEqual(crypto.decrypt(duplicate._email_encrypted), "legacy@example.com")
