"""Регрессионные тесты на исправленные уязвимости и баги модуля users."""
import os
import subprocess
import sys
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.storage import default_storage
from django.db import IntegrityError, transaction
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.common.testing import html_disguised_as_png, huge_dimensions_png, image_upload
from apps.common.throttling import LoginRateThrottle
from apps.posts.models import Post
from apps.users import crypto
from apps.users.models import Subscription

User = get_user_model()
PASSWORD = "Sup3r-Secret-Pass!"


def make_user(username, role=User.Role.READER, **kwargs):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password=PASSWORD, role=role, **kwargs
    )


class EmailPrivacyTests(APITestCase):
    """Email раньше утекал через публичный профиль и вложенного автора в постах/комментариях."""

    def setUp(self):
        self.author = make_user("writer", role=User.Role.AUTHOR)
        self.reader = make_user("reader")
        self.post = Post.objects.create(
            author=self.author, title="Публичный пост", content="Достаточно длинный текст",
            status=Post.Status.PUBLISHED,
        )

    def assertNoEmail(self, payload):
        self.assertNotIn("writer@example.com", str(payload))
        self.assertNotIn("email", payload)

    def test_public_profile_hides_email(self):
        response = self.client.get("/api/users/users/writer/")
        self.assertEqual(response.status_code, 200)
        self.assertNoEmail(response.data)

    def test_post_list_author_hides_email(self):
        response = self.client.get("/api/posts/")
        self.assertNoEmail(response.data["results"][0]["author"])

    def test_post_detail_author_hides_email(self):
        response = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertNoEmail(response.data["author"])

    def test_comment_author_hides_email(self):
        self.client.force_authenticate(self.author)
        response = self.client.post("/api/comments/", {"post": self.post.id, "content": "Мой коммент"})
        self.assertEqual(response.status_code, 201)
        self.assertNoEmail(response.data["author"])

    def test_me_still_returns_own_email(self):
        self.client.force_authenticate(self.author)
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.data["email"], "writer@example.com")

    def test_inactive_user_profile_is_hidden(self):
        self.author.is_active = False
        self.author.save()
        self.assertEqual(self.client.get("/api/users/users/writer/").status_code, 404)


class ProfileUpdateTests(APITestCase):
    def setUp(self):
        self.user = make_user("alice")
        self.other = make_user("bob")
        self.client.force_authenticate(self.user)

    def test_role_cannot_be_self_escalated(self):
        response = self.client.patch("/api/users/me/", {"role": "author"})
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.READER)

    def test_admin_role_cannot_be_self_assigned(self):
        self.client.patch("/api/users/me/", {"role": "admin"})
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, User.Role.READER)

    def test_email_can_be_changed(self):
        response = self.client.patch("/api/users/me/", {"email": "New@Example.com"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(User.objects.get_by_email("new@example.com"), self.user)

    def test_email_change_to_taken_email_rejected(self):
        response = self.client.patch("/api/users/me/", {"email": "BOB@example.com"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_username_change_to_taken_username_rejected_case_insensitive(self):
        response = self.client.patch("/api/users/me/", {"username": "BOB"})
        self.assertEqual(response.status_code, 400)

    def test_bio_length_limited(self):
        response = self.client.patch("/api/users/me/", {"bio": "x" * 501})
        self.assertEqual(response.status_code, 400)

    def test_put_not_allowed(self):
        response = self.client.put("/api/users/me/", {"username": "alice"})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class RegistrationHardeningTests(APITestCase):
    url = "/api/users/register/"

    def payload(self, **overrides):
        data = {
            "username": "newbie", "email": "newbie@example.com",
            "password": PASSWORD, "password2": PASSWORD,
        }
        data.update(overrides)
        return data

    def test_weak_numeric_password_rejected(self):
        response = self.client.post(self.url, self.payload(password="12345678", password2="12345678"))
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)

    def test_password_similar_to_username_rejected(self):
        response = self.client.post(
            self.url, self.payload(username="johnsmith2024", password="johnsmith2024", password2="johnsmith2024")
        )
        self.assertEqual(response.status_code, 400)

    def test_username_unique_case_insensitive(self):
        make_user("Newbie")
        response = self.client.post(self.url, self.payload())
        self.assertEqual(response.status_code, 400)
        self.assertIn("username", response.data)

    def test_cannot_register_as_admin(self):
        response = self.client.post(self.url, self.payload(role="admin"))
        self.assertEqual(response.status_code, 400)

    def test_bio_saved_encrypted(self):
        response = self.client.post(self.url, self.payload(bio="Привет"))
        self.assertEqual(response.status_code, 201)
        user = User.objects.get(username="newbie")
        self.assertEqual(user.bio, "Привет")
        self.assertNotIn("Привет", user._bio_encrypted)

    def test_email_unique_at_database_level(self):
        make_user("first")
        clash = User(username="second")
        clash.email = "first@example.com"
        with self.assertRaises(IntegrityError), transaction.atomic():
            clash.save()

    def test_users_without_email_do_not_clash(self):
        User.objects.create(username="no-mail-1")
        User.objects.create(username="no-mail-2")  # пустой hash не попадает под уникальность


class PasswordChangeTests(APITestCase):
    url = "/api/users/me/change-password/"

    def setUp(self):
        self.user = make_user("changer")
        login = self.client.post("/api/users/login/", {"username": "changer", "password": PASSWORD})
        self.refresh = login.data["refresh"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_wrong_old_password_rejected(self):
        response = self.client.patch(self.url, {"old_password": "nope", "new_password": "Another-Strong-9"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("old_password", response.data)

    def test_weak_new_password_rejected(self):
        response = self.client.patch(self.url, {"old_password": PASSWORD, "new_password": "12345678"})
        self.assertEqual(response.status_code, 400)
        self.assertIn("new_password", response.data)

    def test_success_rotates_tokens_and_revokes_old_refresh(self):
        response = self.client.patch(self.url, {"old_password": PASSWORD, "new_password": "Another-Strong-9"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Another-Strong-9"))

        old = self.client.post("/api/users/refresh/", {"refresh": self.refresh})
        self.assertEqual(old.status_code, 401, "Старый refresh-токен должен быть отозван")

        new = self.client.post("/api/users/refresh/", {"refresh": response.data["refresh"]})
        self.assertEqual(new.status_code, 200)


class TokenLifecycleTests(APITestCase):
    def setUp(self):
        make_user("tokens")
        self.tokens = self.client.post(
            "/api/users/login/", {"username": "tokens", "password": PASSWORD}
        ).data

    def test_rotated_refresh_token_cannot_be_reused(self):
        first = self.client.post("/api/users/refresh/", {"refresh": self.tokens["refresh"]})
        self.assertEqual(first.status_code, 200)
        self.assertIn("refresh", first.data)

        replay = self.client.post("/api/users/refresh/", {"refresh": self.tokens["refresh"]})
        self.assertEqual(replay.status_code, 401)

    def test_logout_blacklists_refresh_token(self):
        response = self.client.post("/api/users/logout/", {"refresh": self.tokens["refresh"]})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)
        after = self.client.post("/api/users/refresh/", {"refresh": self.tokens["refresh"]})
        self.assertEqual(after.status_code, 401)

    def test_logout_with_garbage_token_is_harmless(self):
        response = self.client.post("/api/users/logout/", {"refresh": "garbage"})
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

    def test_login_response_has_user_with_email(self):
        self.assertEqual(self.tokens["user"]["email"], "tokens@example.com")


class LoginThrottleTests(APITestCase):
    def setUp(self):
        cache.clear()
        make_user("victim")

    def tearDown(self):
        cache.clear()

    def test_bruteforce_is_throttled(self):
        with mock.patch.object(LoginRateThrottle, "rate", "3/min", create=True):
            codes = [
                self.client.post("/api/users/login/", {"username": "victim", "password": f"wrong{i}"}).status_code
                for i in range(4)
            ]
        self.assertEqual(codes[:3], [401, 401, 401])
        self.assertEqual(codes[3], status.HTTP_429_TOO_MANY_REQUESTS)

    def test_throttle_is_per_username(self):
        with mock.patch.object(LoginRateThrottle, "rate", "1/min", create=True):
            self.client.post("/api/users/login/", {"username": "victim", "password": "x"})
            other = self.client.post("/api/users/login/", {"username": "someone", "password": "x"})
        self.assertEqual(other.status_code, 401)


class AvatarUploadTests(APITestCase):
    url = "/api/users/me/avatar/"

    def setUp(self):
        self.user = make_user("avatarist")
        self.client.force_authenticate(self.user)

    def test_html_disguised_as_image_rejected(self):
        response = self.client.patch(self.url, {"avatar": html_disguised_as_png()}, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar, "")

    def test_disallowed_extension_rejected(self):
        upload = image_upload("avatar.svg")
        response = self.client.patch(self.url, {"avatar": upload}, format="multipart")
        self.assertEqual(response.status_code, 400)

    @override_settings(AVATAR_MAX_FILE_SIZE_MB=0)
    def test_too_large_rejected(self):
        response = self.client.patch(self.url, {"avatar": image_upload()}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_decompression_bomb_rejected(self):
        response = self.client.patch(self.url, {"avatar": huge_dimensions_png()}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_valid_avatar_saved_under_random_name(self):
        response = self.client.patch(
            self.url, {"avatar": image_upload("../../etc/passwd.png")}, format="multipart"
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        path = self.user.avatar
        self.assertTrue(path.startswith("avatars/"))
        self.assertNotIn("..", path)
        self.assertNotEqual(os.path.basename(path), "passwd.png")
        self.assertTrue(default_storage.exists(path))
        self.assertTrue(response.data["avatar"].endswith(os.path.basename(path)))

    def test_replacing_avatar_deletes_old_file(self):
        self.client.patch(self.url, {"avatar": image_upload("one.png")}, format="multipart")
        self.user.refresh_from_db()
        old_path = self.user.avatar

        self.client.patch(self.url, {"avatar": image_upload("two.png")}, format="multipart")
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.avatar, old_path)
        self.assertFalse(default_storage.exists(old_path))

    def test_delete_avatar(self):
        self.client.patch(self.url, {"avatar": image_upload()}, format="multipart")
        self.user.refresh_from_db()
        path = self.user.avatar
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, 204)
        self.user.refresh_from_db()
        self.assertEqual(self.user.avatar, "")
        self.assertFalse(default_storage.exists(path))

    def test_deleting_user_removes_avatar_file(self):
        self.client.patch(self.url, {"avatar": image_upload()}, format="multipart")
        self.user.refresh_from_db()
        path = self.user.avatar
        with self.captureOnCommitCallbacks(execute=True):
            self.user.delete()
        self.assertFalse(default_storage.exists(path))


class PublicProfileQueryTests(APITestCase):
    def test_profile_counts_in_constant_queries(self):
        author = make_user("popular", role=User.Role.AUTHOR)
        for i in range(5):
            Subscription.objects.create(subscriber=make_user(f"fan{i}"), author=author)
        viewer = User.objects.get(username="fan0")
        self.client.force_authenticate(viewer)

        with self.assertNumQueries(1):
            response = self.client.get("/api/users/users/popular/")

        self.assertEqual(response.data["subscribers_count"], 5)
        self.assertTrue(response.data["is_subscribed"])

    def test_self_subscription_blocked_by_database(self):
        user = make_user("selfish")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Subscription.objects.create(subscriber=user, author=user)


class AdminUserPagesTests(TestCase):
    """Страницы добавления/редактирования пользователя в админке падали с FieldError."""

    def setUp(self):
        self.admin = User.objects.create_superuser("root", "root@example.com", PASSWORD)
        self.client.force_login(self.admin)

    def test_change_page_renders(self):
        response = self.client.get(f"/admin/users/user/{self.admin.pk}/change/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "root@example.com")

    def test_add_page_creates_user_with_encrypted_email(self):
        response = self.client.post("/admin/users/user/add/", {
            "username": "created", "email": "created@example.com", "role": "author",
            "password1": PASSWORD, "password2": PASSWORD, "usable_password": "true",
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(User.objects.get(username="created").email, "created@example.com")

    def test_search_by_exact_email(self):
        make_user("findme")
        response = self.client.get("/admin/users/user/?q=findme@example.com")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "findme")


class CryptoHardeningTests(TestCase):
    def tearDown(self):
        crypto.reset_key_cache()

    def test_blind_index_is_hmac_not_legacy_concat(self):
        self.assertNotEqual(crypto.blind_index("a@b.c"), crypto.legacy_blind_index("a@b.c"))
        self.assertEqual(len(crypto.blind_index("a@b.c")), 64)

    @override_settings(FIELD_ENCRYPTION_KEY="53qjEYBlBK-ze8uvXQnONEUaIDozwVtH6wDFiLaH0ug=")
    def test_data_survives_secret_key_rotation(self):
        crypto.reset_key_cache()
        token = crypto.encrypt("секрет")
        index = crypto.blind_index("user@example.com")

        with override_settings(SECRET_KEY="completely-different-secret-key-after-rotation-xxxxxxxxxx"):
            crypto.reset_key_cache()
            self.assertEqual(crypto.decrypt(token), "секрет")
            self.assertEqual(crypto.blind_index("user@example.com"), index)

    def test_bio_uses_plain_fernet(self):
        user = make_user("bio")
        user.bio = "О себе"
        self.assertEqual(crypto.decrypt(user._bio_encrypted), "О себе")


class ProductionSettingsGuardTests(TestCase):
    """В production небезопасные значения по умолчанию должны ронять запуск."""

    def run_settings(self, **env):
        base = {k: v for k, v in os.environ.items() if not k.startswith(("SECRET_KEY", "DEBUG", "FIELD_ENC"))}
        base.update(env)
        return subprocess.run(
            [sys.executable, "-c", "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','blog_project.settings'); django.setup()"],
            env=base, capture_output=True, text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        )

    def test_short_secret_key_rejected(self):
        result = self.run_settings(SECRET_KEY="short", DEBUG="False", FIELD_ENCRYPTION_KEY="x")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SECRET_KEY", result.stderr)

    def test_missing_field_key_rejected(self):
        result = self.run_settings(SECRET_KEY="k" * 60, DEBUG="False", FIELD_ENCRYPTION_KEY="")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("FIELD_ENCRYPTION_KEY", result.stderr)

    def test_debug_toolbar_not_installed_in_production(self):
        result = self.run_settings(
            SECRET_KEY="k" * 60, DEBUG="False",
            FIELD_ENCRYPTION_KEY="53qjEYBlBK-ze8uvXQnONEUaIDozwVtH6wDFiLaH0ug=",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        check = subprocess.run(
            [sys.executable, "-c",
             "import django, os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','blog_project.settings'); "
             "django.setup(); from django.conf import settings; "
             "print('debug_toolbar' in settings.INSTALLED_APPS)"],
            env={**os.environ, "SECRET_KEY": "k" * 60, "DEBUG": "False",
                 "FIELD_ENCRYPTION_KEY": "53qjEYBlBK-ze8uvXQnONEUaIDozwVtH6wDFiLaH0ug="},
            capture_output=True, text=True,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        )
        self.assertEqual(check.stdout.strip(), "False", check.stderr)


class RotateFieldKeyCommandTests(TestCase):
    OLD = "53qjEYBlBK-ze8uvXQnONEUaIDozwVtH6wDFiLaH0ug="
    NEW = "q9Z3qC1yX8mJcVdS2Kj0x1Gm1bZ0kq3cH4yYpQyq0nU="

    def tearDown(self):
        crypto.reset_key_cache()

    def test_rotation_reencrypts_and_keeps_lookup(self):
        from django.core.management import call_command

        with override_settings(FIELD_ENCRYPTION_KEY=self.OLD):
            crypto.reset_key_cache()
            user = make_user("rotate")
            user.bio = "Тайное био"
            user.save()

        with override_settings(FIELD_ENCRYPTION_KEY=self.NEW):
            crypto.reset_key_cache()
            call_command("rotate_field_key", old_key=self.OLD, stdout=open(os.devnull, "w"))
            user.refresh_from_db()
            self.assertEqual(user.email, "rotate@example.com")
            self.assertEqual(user.bio, "Тайное био")
            self.assertEqual(User.objects.get_by_email("rotate@example.com"), user)


class SeedDemoCommandTests(TestCase):
    def test_seed_demo_creates_data_once(self):
        from django.core.management import call_command

        with override_settings(DEBUG=True):
            call_command("seed_demo", stdout=open(os.devnull, "w"))
            call_command("seed_demo", stdout=open(os.devnull, "w"))  # повторный запуск безопасен
        self.assertEqual(Post.objects.filter(status=Post.Status.PUBLISHED).count(), 6)
        self.assertTrue(User.objects.get(username="anna").is_author)

    def test_seed_demo_refuses_in_production(self):
        from django.core.management import call_command
        from django.core.management.base import CommandError

        with override_settings(DEBUG=False), self.assertRaises(CommandError):
            call_command("seed_demo")
