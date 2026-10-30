"""Регрессионные тесты комментариев: видимость, целостность, пагинация, N+1."""
from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APITestCase

from apps.posts.models import Post

from .models import Comment

User = get_user_model()


def make_user(username, role="reader"):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="Sup3r-Secret!", role=role
    )


class CommentVisibilityTests(APITestCase):
    def setUp(self):
        self.owner = make_user("owner", role="author")
        self.stranger = make_user("stranger")
        self.draft = Post.objects.create(author=self.owner, title="Черновик", content="Скрытый текст")
        self.published = Post.objects.create(
            author=self.owner, title="Пост", content="Открытый текст", status=Post.Status.PUBLISHED
        )

    def test_cannot_comment_foreign_draft(self):
        self.client.force_authenticate(self.stranger)
        response = self.client.post("/api/comments/", {"post": self.draft.id, "content": "Нашёл"})
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Comment.objects.exists())

    def test_owner_can_comment_own_draft(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post("/api/comments/", {"post": self.draft.id, "content": "Заметка"})
        self.assertEqual(response.status_code, 201)

    def test_comments_of_foreign_drafts_hidden_from_list(self):
        Comment.objects.create(post=self.draft, author=self.owner, content="Секрет")
        Comment.objects.create(post=self.published, author=self.owner, content="Публично")
        self.client.force_authenticate(self.stranger)
        contents = [c["content"] for c in self.client.get("/api/comments/").data["results"]]
        self.assertEqual(contents, ["Публично"])

    def test_comment_cannot_be_moved_to_other_post(self):
        other = Post.objects.create(
            author=self.owner, title="Другой", content="Текст", status=Post.Status.PUBLISHED
        )
        comment = Comment.objects.create(post=self.published, author=self.stranger, content="Мой")
        self.client.force_authenticate(self.stranger)
        response = self.client.patch(f"/api/comments/{comment.id}/", {"post": other.id, "content": "Мой"})
        self.assertEqual(response.status_code, 200)
        comment.refresh_from_db()
        self.assertEqual(comment.post_id, self.published.id)


class CommentValidationTests(APITestCase):
    def setUp(self):
        self.user = make_user("commenter")
        self.post = Post.objects.create(
            author=make_user("a", role="author"), title="Пост", content="Текст",
            status=Post.Status.PUBLISHED,
        )
        self.client.force_authenticate(self.user)

    def test_too_long_comment_rejected(self):
        response = self.client.post("/api/comments/", {"post": self.post.id, "content": "x" * 5001})
        self.assertEqual(response.status_code, 400)

    def test_whitespace_comment_rejected(self):
        response = self.client.post("/api/comments/", {"post": self.post.id, "content": "   "})
        self.assertEqual(response.status_code, 400)

    def test_is_edited_only_when_content_changes(self):
        comment = Comment.objects.create(post=self.post, author=self.user, content="Текст")
        response = self.client.patch(f"/api/comments/{comment.id}/", {"content": "Текст"})
        self.assertFalse(response.data["is_edited"])
        response = self.client.patch(f"/api/comments/{comment.id}/", {"content": "Новый"})
        self.assertTrue(response.data["is_edited"])


class CommentListTests(APITestCase):
    def setUp(self):
        self.post = Post.objects.create(
            author=make_user("author", role="author"), title="Пост", content="Текст",
            status=Post.Status.PUBLISHED,
        )

    def add_comments(self, count):
        for i in range(count):
            author = make_user(f"u{Comment.objects.count()}")
            parent = Comment.objects.create(post=self.post, author=author, content=f"c{i}")
            Comment.objects.create(post=self.post, author=author, parent=parent, content=f"r{i}")

    def test_more_than_ten_comments_returned(self):
        """Раньше страница была 10 — остальные комментарии фронтенд не видел."""
        self.add_comments(15)
        response = self.client.get(f"/api/comments/?post={self.post.slug}")
        self.assertEqual(len(response.data["results"]), 30)

    def test_flat_list_without_duplicated_replies(self):
        self.add_comments(1)
        results = self.client.get(f"/api/comments/?post={self.post.slug}").data["results"]
        self.assertNotIn("replies", results[0])
        self.assertEqual(len({c["id"] for c in results}), 2)

    def test_query_count_constant(self):
        self.add_comments(2)
        with CaptureQueriesContext(connection) as small:
            self.client.get(f"/api/comments/?post={self.post.slug}")
        self.add_comments(10)
        with CaptureQueriesContext(connection) as large:
            self.client.get(f"/api/comments/?post={self.post.slug}")
        self.assertEqual(len(small), len(large))
