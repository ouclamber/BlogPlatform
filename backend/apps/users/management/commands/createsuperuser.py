"""createsuperuser для модели с зашифрованным email.

Стандартная команда Django падала с ``FieldDoesNotExist: User has no field named
'email'``: email у нас — свойство с шифрованием, а не поле модели.

    python manage.py createsuperuser                      # интерактивно
    python manage.py createsuperuser --noinput --username admin --email admin@example.com
        (пароль берётся из DJANGO_SUPERUSER_PASSWORD)
"""
import getpass
import os

from django.contrib.auth.password_validation import validate_password
from django.core import exceptions
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

from apps.users.models import User


class Command(BaseCommand):
    help = "Создать суперпользователя (роль admin, доступ в админку)."
    requires_migrations_checks = True

    def add_arguments(self, parser):
        parser.add_argument("--username", help="Имя пользователя")
        parser.add_argument("--email", help="Email")
        parser.add_argument(
            "--noinput", "--no-input", action="store_false", dest="interactive",
            help="Без вопросов: пароль из переменной DJANGO_SUPERUSER_PASSWORD",
        )

    # ------------------------------------------------------------ валидация
    def _check_username(self, username):
        username = (username or "").strip()
        if not username:
            return None, "Имя пользователя не может быть пустым."
        if User.objects.filter(username__iexact=username).exists():
            return None, f"Пользователь «{username}» уже существует."
        for validator in User._meta.get_field("username").validators:
            try:
                validator(username)
            except exceptions.ValidationError as exc:
                return None, " ".join(exc.messages)
        return username, None

    def _check_email(self, email):
        email = User.objects.normalize_email((email or "").strip())
        try:
            validate_email(email)
        except exceptions.ValidationError:
            return None, "Введите корректный email."
        if User.objects.get_by_email(email):
            return None, "Пользователь с таким email уже существует."
        return email, None

    def _ask(self, prompt, check, initial=None):
        value = initial
        while True:
            if value is None:
                value = input(prompt)
            result, error = check(value)
            if not error:
                return result
            self.stderr.write(f"Ошибка: {error}")
            value = None

    # ------------------------------------------------------------ команда
    def handle(self, *args, **options):
        username = options["username"] or os.environ.get("DJANGO_SUPERUSER_USERNAME")
        email = options["email"] or os.environ.get("DJANGO_SUPERUSER_EMAIL")

        if not options["interactive"]:
            password = os.environ.get("DJANGO_SUPERUSER_PASSWORD")
            for value, check in ((username, self._check_username), (email, self._check_email)):
                _, error = check(value)
                if error:
                    raise CommandError(error)
            if not password:
                raise CommandError("Задайте пароль в переменной окружения DJANGO_SUPERUSER_PASSWORD.")
            username, _ = self._check_username(username)
            email, _ = self._check_email(email)
        else:
            try:
                username = self._ask("Имя пользователя: ", self._check_username, username)
                email = self._ask("Email: ", self._check_email, email)
                password = self._ask_password(username, email)
            except KeyboardInterrupt:
                self.stderr.write("\nОтменено.")
                return

        User.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f"Суперпользователь «{username}» создан."))

    def _ask_password(self, username, email):
        while True:
            password = getpass.getpass("Пароль: ")
            if password != getpass.getpass("Пароль (ещё раз): "):
                self.stderr.write("Ошибка: пароли не совпадают.")
                continue
            draft = User(username=username)
            draft.email = email
            try:
                validate_password(password, user=draft)
            except exceptions.ValidationError as exc:
                self.stderr.write("Ошибка: " + " ".join(exc.messages))
                if input("Всё равно использовать этот пароль? [y/N]: ").strip().lower() != "y":
                    continue
            return password