from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework import status
from rest_framework.test import APITestCase, APIRequestFactory

from apps.posts.models import Post
from apps.comments.permissions import (
    IsAuthorOrReadOnly,
    IsAuthorOrAdmin,
    IsCommentAuthor,
)

from .models import Comment

User = get_user_model()

class CommentModelTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="author",
            email="author@test.com",
            password="pass12345",
            role="author",
        )
        self.post = Post.objects.create(
            author=self.author,
            title="Пост",
            content="текст",
        )

    def test_str_representation(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content="Отличный пост!",
        )
        self.assertEqual(
            str(comment),
            f"{self.author.username} → «{self.post.title}»",
        )

    def test_reply_is_linked_to_parent(self):
        parent = Comment.objects.create(
            post=self.post,
            author=self.author,
            content="Первый",
        )
        reply = Comment.objects.create(
            post=self.post,
            author=self.author,
            content="Ответ",
            parent=parent,
        )
        self.assertIn(reply, parent.replies.all())

class CommentAPITests(APITestCase):
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
            title="Пост для комментариев",
            content="текст",
            status=Post.Status.PUBLISHED,
        )

    def test_anonymous_cannot_comment(self):
        response = self.client.post(
            "/api/comments/",
            {"post": self.post.id, "content": "Привет"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_comment(self):
        self.client.force_authenticate(self.reader)
        response = self.client.post(
            "/api/comments/",
            {"post": self.post.id, "content": "Привет"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["author"]["username"], "reader")

    def test_filter_comments_by_post_slug(self):
        Comment.objects.create(
            post=self.post,
            author=self.reader,
            content="Комментарий 1",
        )
        response = self.client.get(f"/api/comments/?post={self.post.slug}")
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)

    def test_cannot_reply_with_parent_from_another_post(self):
        other_post = Post.objects.create(
            author=self.author,
            title="Другой пост",
            content="текст",
        )
        parent = Comment.objects.create(
            post=other_post,
            author=self.author,
            content="Родитель",
        )
        self.client.force_authenticate(self.reader)
        response = self.client.post(
            "/api/comments/",
            {
                "post": self.post.id,
                "content": "Ответ",
                "parent": parent.id,
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_edit_foreign_comment(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content="Оригинал",
        )
        self.client.force_authenticate(self.reader)
        response = self.client.patch(
            f"/api/comments/{comment.id}/",
            {"content": "Взлом"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_author_editing_sets_is_edited_flag(self):
        comment = Comment.objects.create(
            post=self.post,
            author=self.reader,
            content="Оригинал",
        )
        self.client.force_authenticate(self.reader)
        response = self.client.patch(
            f"/api/comments/{comment.id}/",
            {"content": "Исправлено"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_edited"])

class CommentPermissionTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="author_perm",
            email="author_perm@test.com",
            password="pass12345",
            role="author",
        )
        self.other = User.objects.create_user(
            username="other_perm",
            email="other_perm@test.com",
            password="pass12345",
            role="reader",
        )
        self.admin = User.objects.create_user(
            username="admin_perm",
            email="admin_perm@test.com",
            password="pass12345",
            role="admin",
        )
        self.post = Post.objects.create(
            author=self.author,
            title="Пост",
            content="Текст",
            status=Post.Status.PUBLISHED,
        )
        self.comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content="Оригинал",
        )

    def test_admin_can_edit_any_comment(self):
        self.client.force_authenticate(self.admin)
        response = self.client.patch(
            f"/api/comments/{self.comment.id}/",
            {"content": "Админ изменил"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_admin_can_delete_any_comment(self):
        self.client.force_authenticate(self.admin)
        response = self.client.delete(f"/api/comments/{self.comment.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_anonymous_can_read_comments(self):
        response = self.client.get("/api/comments/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_other_user_cannot_edit_comment(self):
        self.client.force_authenticate(self.other)
        response = self.client.patch(
            f"/api/comments/{self.comment.id}/",
            {"content": "Взлом"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_user_cannot_delete_comment(self):
        self.client.force_authenticate(self.other)
        response = self.client.delete(f"/api/comments/{self.comment.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_author_can_edit_own_comment(self):
        self.client.force_authenticate(self.author)
        response = self.client.patch(
            f"/api/comments/{self.comment.id}/",
            {"content": "Автор изменил"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_author_can_delete_own_comment(self):
        self.client.force_authenticate(self.author)
        response = self.client.delete(f"/api/comments/{self.comment.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_anonymous_cannot_create_comment(self):
        response = self.client.post(
            "/api/comments/",
            {"post": self.post.id, "content": "Аноним"},
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class CommentReplyTests(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(
            username="author_reply",
            email="author_reply@test.com",
            password="pass12345",
            role="author",
        )
        self.reader = User.objects.create_user(
            username="reader_reply",
            email="reader_reply@test.com",
            password="pass12345",
            role="reader",
        )
        self.post = Post.objects.create(
            author=self.author,
            title="Пост",
            content="Текст",
            status=Post.Status.PUBLISHED,
        )
        self.parent = Comment.objects.create(
            post=self.post,
            author=self.author,
            content="Родитель",
        )

    def test_reply_creation(self):
        self.client.force_authenticate(self.reader)
        response = self.client.post(
            "/api/comments/",
            {
                "post": self.post.id,
                "parent": self.parent.id,
                "content": "Ответ",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_reply_appears_in_parent(self):
        Comment.objects.create(
            post=self.post,
            author=self.reader,
            content="Ответ",
            parent=self.parent,
        )
        self.assertEqual(self.parent.replies.count(), 1)

class CommentPermissionClassesTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

        self.author = User.objects.create_user(
            username="perm_author",
            email="perm_author@test.com",
            password="pass12345",
            role="author",
        )
        self.other = User.objects.create_user(
            username="perm_other",
            email="perm_other@test.com",
            password="pass12345",
            role="reader",
        )
        self.admin = User.objects.create_user(
            username="perm_admin",
            email="perm_admin@test.com",
            password="pass12345",
            role="admin",
        )

        self.post = Post.objects.create(
            author=self.author,
            title="Пост",
            content="Текст",
            status=Post.Status.PUBLISHED,
        )
        self.comment = Comment.objects.create(
            post=self.post,
            author=self.author,
            content="Оригинал",
        )

    def test_isauthororreadonly_get_allowed(self):
        request = self.factory.get("/")
        request.user = AnonymousUser()
        self.assertTrue(
            IsAuthorOrReadOnly().has_object_permission(request, None, self.comment)
        )

    def test_isauthororreadonly_patch_by_author(self):
        request = self.factory.patch("/")
        request.user = self.author
        self.assertTrue(
            IsAuthorOrReadOnly().has_object_permission(request, None, self.comment)
        )

    def test_isauthororreadonly_patch_by_admin(self):
        request = self.factory.patch("/")
        request.user = self.admin
        self.assertTrue(
            IsAuthorOrReadOnly().has_object_permission(request, None, self.comment)
        )

    def test_isauthororreadonly_patch_by_other(self):
        request = self.factory.patch("/")
        request.user = self.other
        self.assertFalse(
            IsAuthorOrReadOnly().has_object_permission(request, None, self.comment)
        )

    def test_isauthororreadonly_patch_by_anonymous(self):
        request = self.factory.patch("/")
        request.user = AnonymousUser()
        self.assertFalse(
            IsAuthorOrReadOnly().has_object_permission(request, None, self.comment)
        )

    def test_isauthororadmin_post_by_authenticated(self):
        request = self.factory.post("/")
        request.user = self.author
        self.assertTrue(IsAuthorOrAdmin().has_permission(request, None))

    def test_isauthororadmin_post_by_anonymous(self):
        request = self.factory.post("/")
        request.user = AnonymousUser()
        self.assertFalse(IsAuthorOrAdmin().has_permission(request, None))

    def test_isauthororadmin_get_allowed(self):
        request = self.factory.get("/")
        request.user = AnonymousUser()
        self.assertTrue(IsAuthorOrAdmin().has_permission(request, None))

    def test_isauthororadmin_get_object_allowed(self):
        request = self.factory.get("/")
        request.user = AnonymousUser()
        self.assertTrue(
            IsAuthorOrAdmin().has_object_permission(request, None, self.comment)
        )

    def test_isauthororadmin_patch_by_author(self):
        request = self.factory.patch("/")
        request.user = self.author
        self.assertTrue(
            IsAuthorOrAdmin().has_object_permission(request, None, self.comment)
        )

    def test_isauthororadmin_patch_by_admin(self):
        request = self.factory.patch("/")
        request.user = self.admin
        self.assertTrue(
            IsAuthorOrAdmin().has_object_permission(request, None, self.comment)
        )

    def test_isauthororadmin_patch_by_other(self):
        request = self.factory.patch("/")
        request.user = self.other
        self.assertFalse(
            IsAuthorOrAdmin().has_object_permission(request, None, self.comment)
        )

    def test_isauthororadmin_patch_by_anonymous(self):
        request = self.factory.patch("/")
        request.user = AnonymousUser()
        self.assertFalse(
            IsAuthorOrAdmin().has_object_permission(request, None, self.comment)
        )

    def test_iscommentauthor_get_allowed(self):
        request = self.factory.get("/")
        request.user = AnonymousUser()
        self.assertTrue(
            IsCommentAuthor().has_object_permission(request, None, self.comment)
        )

    def test_iscommentauthor_patch_by_author(self):
        request = self.factory.patch("/")
        request.user = self.author
        self.assertTrue(
            IsCommentAuthor().has_object_permission(request, None, self.comment)
        )

    def test_iscommentauthor_patch_by_other(self):
        request = self.factory.patch("/")
        request.user = self.other
        self.assertFalse(
            IsCommentAuthor().has_object_permission(request, None, self.comment)
        )

    def test_iscommentauthor_patch_by_admin_denied(self):
        request = self.factory.patch("/")
        request.user = self.admin
        self.assertFalse(
            IsCommentAuthor().has_object_permission(request, None, self.comment)
        )

    def test_iscommentauthor_patch_by_anonymous(self):
        request = self.factory.patch("/")
        request.user = AnonymousUser()
        self.assertFalse(
            IsCommentAuthor().has_object_permission(request, None, self.comment)
        )