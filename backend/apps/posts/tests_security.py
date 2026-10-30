"""Регрессионные тесты: безопасность, корректность и производительность постов."""
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.test import override_settings
from rest_framework.test import APITestCase

from apps.categories.models import Category
from apps.comments.models import Comment
from apps.common.testing import html_disguised_as_png, image_upload
from apps.likes.models import Like
from apps.tags.models import Tag

from .models import Post

User = get_user_model()
CONTENT = "Достаточно длинное содержание поста для публикации."


def make_user(username, role="author"):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="Sup3r-Secret!", role=role
    )


class PostListPerformanceTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Наука")
        self.tags = [Tag.objects.create(name=f"tag{i}") for i in range(3)]
        self.viewer = make_user("viewer", role="reader")

    def create_posts(self, count):
        for i in range(count):
            author = make_user(f"author_{Post.objects.count()}")
            post = Post.objects.create(
                author=author, title=f"Пост {i}", content=CONTENT,
                status=Post.Status.PUBLISHED, category=self.category,
            )
            post.tags.set(self.tags)
            Like.objects.create(user=self.viewer, post=post)
            Comment.objects.create(post=post, author=self.viewer, content="!")

    def count_list_queries(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get("/api/posts/")
        self.assertEqual(response.status_code, 200)
        return len(ctx.captured_queries)

    def test_query_count_does_not_grow_with_page_size(self):
        """Раньше: 3 доп. запроса на каждого автора (is_subscribed, 2×count) — N+1."""
        self.client.force_authenticate(self.viewer)
        self.create_posts(2)
        small = self.count_list_queries()
        self.create_posts(8)
        large = self.count_list_queries()
        self.assertEqual(small, large)
        self.assertLessEqual(large, 4)

    def test_counters_are_correct(self):
        self.create_posts(1)
        post = Post.objects.get()
        Like.objects.create(user=make_user("liker2", role="reader"), post=post)
        Comment.objects.create(post=post, author=self.viewer, content="2")
        data = self.client.get("/api/posts/").data["results"][0]
        self.assertEqual(data["likes_count"], 2)
        self.assertEqual(data["comments_count"], 2)
        self.assertFalse(data["is_liked"])

    def test_list_does_not_include_content(self):
        self.create_posts(1)
        item = self.client.get("/api/posts/").data["results"][0]
        self.assertNotIn("content", item)

    def test_tag_filter_returns_unique_posts(self):
        self.create_posts(1)
        response = self.client.get("/api/posts/?tag_name=tag")
        self.assertEqual(response.data["count"], 1)

    def test_ordering_by_likes(self):
        self.create_posts(2)
        first, second = Post.objects.order_by("id")
        Like.objects.create(user=make_user("extra", role="reader"), post=second)
        response = self.client.get("/api/posts/?ordering=-likes_count")
        self.assertEqual(response.data["results"][0]["id"], second.id)

    def test_page_size_param_is_capped(self):
        self.create_posts(3)
        response = self.client.get("/api/posts/?page_size=1000")
        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(response.data["results"]), 50)


class PostDetailTests(APITestCase):
    def setUp(self):
        self.author = make_user("detail_author")
        self.post = Post.objects.create(
            author=self.author, title="Детально", content=CONTENT, status=Post.Status.PUBLISHED
        )

    def test_detail_has_no_embedded_comments_and_has_counters(self):
        Comment.objects.create(post=self.post, author=self.author, content="!")
        response = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertNotIn("comments", response.data)
        self.assertEqual(response.data["comments_count"], 1)
        self.assertIn("content", response.data)

    def test_views_increment_for_published_post(self):
        self.client.get(f"/api/posts/{self.post.slug}/")
        response = self.client.get(f"/api/posts/{self.post.slug}/")
        self.assertEqual(response.data["views_count"], 2)


class PostWriteTests(APITestCase):
    def setUp(self):
        self.author = make_user("writer")
        self.client.force_authenticate(self.author)

    def test_create_returns_full_representation(self):
        tag = Tag.objects.create(name="django")
        response = self.client.post(
            "/api/posts/", {"title": "Новый пост", "content": CONTENT, "tags": [tag.id]}
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["author"]["username"], "writer")
        self.assertEqual(response.data["tags"][0]["name"], "django")
        self.assertEqual(response.data["likes_count"], 0)
        self.assertIn("slug", response.data)

    def test_partial_publish_uses_existing_content(self):
        """Раньше PATCH {status: published} без content падал с «содержание < 10 символов»."""
        post = Post.objects.create(author=self.author, title="Черновик", content=CONTENT)
        response = self.client.patch(f"/api/posts/{post.slug}/", {"status": "published"})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "published")

    def test_too_many_tags_rejected(self):
        tags = [Tag.objects.create(name=f"t{i}").id for i in range(11)]
        response = self.client.post("/api/posts/", {"title": "Теги", "content": CONTENT, "tags": tags})
        self.assertEqual(response.status_code, 400)
        self.assertIn("tags", response.data)

    def test_cover_html_disguised_as_png_rejected(self):
        response = self.client.post(
            "/api/posts/",
            {"title": "Обложка", "content": CONTENT, "cover_image": html_disguised_as_png()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("cover_image", response.data)

    def test_cover_bmp_rejected(self):
        upload = image_upload("cover.bmp", fmt="BMP", content_type="image/bmp")
        response = self.client.post(
            "/api/posts/", {"title": "BMP", "content": CONTENT, "cover_image": upload}, format="multipart"
        )
        self.assertEqual(response.status_code, 400)

    @override_settings(COVER_MAX_FILE_SIZE_MB=0)
    def test_cover_size_limited(self):
        response = self.client.post(
            "/api/posts/", {"title": "Большая", "content": CONTENT, "cover_image": image_upload()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)

    def test_cover_saved_under_random_name(self):
        response = self.client.post(
            "/api/posts/", {"title": "Файл", "content": CONTENT, "cover_image": image_upload("my cover.png")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        name = Post.objects.get().cover_image.name
        self.assertTrue(name.startswith("covers/"))
        self.assertRegex(name, r"my-cover-[0-9a-f]{12}\.png$")

    def test_replacing_cover_deletes_old_file(self):
        self.client.post(
            "/api/posts/", {"title": "Замена", "content": CONTENT, "cover_image": image_upload("a.png")},
            format="multipart",
        )
        post = Post.objects.get()
        old_name = post.cover_image.name
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.patch(
                f"/api/posts/{post.slug}/", {"cover_image": image_upload("b.png")}, format="multipart"
            )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(default_storage.exists(old_name))

    def test_deleting_post_deletes_cover(self):
        self.client.post(
            "/api/posts/", {"title": "Удаление", "content": CONTENT, "cover_image": image_upload()},
            format="multipart",
        )
        post = Post.objects.get()
        name = post.cover_image.name
        self.assertTrue(default_storage.exists(name))
        with self.captureOnCommitCallbacks(execute=True):
            self.client.delete(f"/api/posts/{post.slug}/")
        self.assertFalse(default_storage.exists(name))


class PublishPermissionTests(APITestCase):
    def test_demoted_reader_cannot_publish_own_draft(self):
        user = make_user("demoted")
        post = Post.objects.create(author=user, title="Черновик", content=CONTENT)
        user.role = User.Role.READER
        user.save()
        self.client.force_authenticate(user)
        response = self.client.post(f"/api/posts/{post.slug}/publish/")
        self.assertEqual(response.status_code, 403)
        post.refresh_from_db()
        self.assertEqual(post.status, Post.Status.DRAFT)

    def test_publish_response_has_counters(self):
        user = make_user("publisher")
        post = Post.objects.create(author=user, title="Черновик", content=CONTENT)
        self.client.force_authenticate(user)
        response = self.client.post(f"/api/posts/{post.slug}/publish/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["likes_count"], 0)
        self.assertEqual(response.data["author"]["username"], "publisher")


class MyPostsTests(APITestCase):
    def test_my_posts_can_be_filtered_by_status(self):
        user = make_user("mine")
        Post.objects.create(author=user, title="Черновик", content=CONTENT)
        Post.objects.create(author=user, title="Опубликован", content=CONTENT, status=Post.Status.PUBLISHED)
        self.client.force_authenticate(user)
        response = self.client.get("/api/posts/my_posts/?status=draft")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["status"], "draft")


class DraftLeakTests(APITestCase):
    """Через /api/likes/ можно было лайкнуть чужой черновик по id и получить его данные."""

    def setUp(self):
        self.owner = make_user("owner")
        self.draft = Post.objects.create(author=self.owner, title="Секретный черновик", content=CONTENT)
        self.reader = make_user("snoop", role="reader")
        self.client.force_authenticate(self.reader)

    def test_cannot_like_foreign_draft(self):
        response = self.client.post("/api/likes/", {"post": self.draft.id})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("Секретный черновик", str(response.data))
        self.assertFalse(Like.objects.exists())

    def test_tag_counts_ignore_drafts(self):
        tag = Tag.objects.create(name="secret")
        self.draft.tags.add(tag)
        response = self.client.get("/api/tags/")
        self.assertEqual(response.data[0]["posts_count"], 0)

    def test_category_counts_ignore_drafts(self):
        category = Category.objects.create(name="Скрытое")
        self.draft.category = category
        self.draft.save()
        response = self.client.get("/api/categories/")
        self.assertEqual(response.data[0]["posts_count"], 0)


class DictionaryEndpointsTests(APITestCase):
    def test_tags_are_not_paginated(self):
        for i in range(15):
            Tag.objects.create(name=f"tag-{i:02d}")
        response = self.client.get("/api/tags/")
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 15)

    def test_tags_search(self):
        Tag.objects.create(name="python")
        Tag.objects.create(name="django")
        response = self.client.get("/api/tags/?search=pyt")
        self.assertEqual([t["name"] for t in response.data], ["python"])

    def test_categories_are_not_paginated(self):
        for i in range(12):
            Category.objects.create(name=f"cat-{i:02d}")
        response = self.client.get("/api/categories/")
        self.assertEqual(len(response.data), 12)
