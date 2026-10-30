from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from django.test import TestCase, TransactionTestCase
from rest_framework import status
from rest_framework.test import APITestCase

from apps.posts.models import Post
from .models import Like

User = get_user_model()


class LikeModelTests(TestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="author",
            email="author@test.com",
            password="pass12345",
            role="author",
        )
        self.post = Post.objects.create(
            author=self.author, title="Пост", content="текст"
        )

    def test_str_representation(self):
        like = Like.objects.create(user=self.author, post=self.post)
        self.assertEqual(
            str(like), f"{self.author.username} → {self.post.title}"
        )


class LikeIntegrityTests(TransactionTestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="author_i",
            email="author_i@test.com",
            password="pass12345",
            role="author",
        )
        self.post = Post.objects.create(
            author=self.author, title="Пост", content="текст"
        )

    def test_duplicate_like_raises_integrity_error(self):
        Like.objects.create(user=self.author, post=self.post)
        with self.assertRaises(IntegrityError):
            Like.objects.create(user=self.author, post=self.post)


class LikeAPITests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="author2",
            email="author2@test.com",
            password="pass12345",
            role="author",
        )
        self.reader = User.objects.create_user(
            username="reader",
            email="reader@test.com",
            password="pass12345",
            role="reader",
        )
        self.post = Post.objects.create(
            author=self.author,
            title="Пост для лайков",
            content="текст",
            status=Post.Status.PUBLISHED,
        )

    def test_anonymous_cannot_like(self):
        response = self.client.post("/api/likes/", {"post": self.post.id})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_like_post(self):
        self.client.force_authenticate(self.reader)
        response = self.client.post("/api/likes/", {"post": self.post.id})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            Like.objects.filter(user=self.reader, post=self.post).exists()
        )

    def test_cannot_like_same_post_twice(self):
        self.client.force_authenticate(self.reader)
        self.client.post("/api/likes/", {"post": self.post.id})
        response = self.client.post("/api/likes/", {"post": self.post.id})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_can_remove_own_like(self):
        self.client.force_authenticate(self.reader)
        like = Like.objects.create(user=self.reader, post=self.post)
        response = self.client.delete(f"/api/likes/{like.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_user_cannot_remove_foreign_like(self):
        like = Like.objects.create(user=self.author, post=self.post)
        self.client.force_authenticate(self.reader)
        response = self.client.delete(f"/api/likes/{like.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)