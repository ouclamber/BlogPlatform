from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class UserModelTests(APITestCase):
    def test_str_returns_username(self):
        user = User.objects.create_user(username="alice", email="alice@test.com", password="pass12345")
        self.assertEqual(str(user), "alice")

    def test_default_role_is_reader(self):
        user = User.objects.create_user(username="bob", email="bob@test.com", password="pass12345")
        self.assertEqual(user.role, User.Role.READER)
        self.assertFalse(user.is_author)


class RegisterAPITests(APITestCase):
    def test_register_creates_user(self):
        response = self.client.post("/api/users/register/", {
            "username": "newuser",
            "email": "newuser@test.com",
            "password": "StrongPass123",
            "password2": "StrongPass123",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())

    def test_register_fails_on_password_mismatch(self):
        response = self.client.post("/api/users/register/", {
            "username": "newuser2",
            "email": "newuser2@test.com",
            "password": "StrongPass123",
            "password2": "DifferentPass456",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_fails_on_duplicate_email(self):
        User.objects.create_user(username="existing", email="dup@test.com", password="pass12345")
        response = self.client.post("/api/users/register/", {
            "username": "another",
            "email": "dup@test.com",
            "password": "StrongPass123",
            "password2": "StrongPass123",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="loginuser", email="login@test.com", password="pass12345")

    def test_login_returns_tokens(self):
        response = self.client.post("/api/users/login/", {
            "username": "loginuser",
            "password": "pass12345",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_fails_with_wrong_password(self):
        response = self.client.post("/api/users/login/", {
            "username": "loginuser",
            "password": "wrongpass",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="meuser", email="me@test.com", password="pass12345")

    def test_me_requires_authentication(self):
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/users/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "meuser")

    def test_me_can_update_bio(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch("/api/users/me/", {"bio": "Привет, это тест"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["bio"], "Привет, это тест")

from apps.users.crypto import (
    encrypt,
    decrypt,
    double_encrypt,
    double_decrypt,
    blind_index,
)


class CryptoTests(APITestCase):
    def test_encrypt_decrypt(self):
        plain = "Привет, мир!"
        cipher = encrypt(plain)
        self.assertNotEqual(cipher, plain)
        self.assertEqual(decrypt(cipher), plain)

    def test_encrypt_none(self):
        self.assertIsNone(encrypt(None))

    def test_encrypt_empty(self):
        self.assertEqual(encrypt(""), "")
        self.assertEqual(decrypt(""), "")

    def test_double_encrypt_decrypt(self):
        plain = "Секретное сообщение"
        cipher = double_encrypt(plain)
        self.assertNotEqual(cipher, plain)
        self.assertEqual(double_decrypt(cipher), plain)

    def test_double_encrypt_none(self):
        self.assertIsNone(double_encrypt(None))

    def test_blind_index_deterministic(self):
        email = "test@test.com"
        hash1 = blind_index(email)
        hash2 = blind_index(email)
        self.assertEqual(hash1, hash2)

    def test_blind_index_case_insensitive(self):
        hash1 = blind_index("Test@Test.com")
        hash2 = blind_index("test@test.com")
        self.assertEqual(hash1, hash2)

    def test_blind_index_different_values(self):
        hash1 = blind_index("test1@test.com")
        hash2 = blind_index("test2@test.com")
        self.assertNotEqual(hash1, hash2)

    def test_blind_index_empty(self):
        self.assertEqual(blind_index(""), "")
        self.assertEqual(blind_index(None), "")

    def test_decrypt_invalid_token_returns_as_is(self):
        invalid = "не-зашифрованная-строка"
        self.assertEqual(decrypt(invalid), invalid)