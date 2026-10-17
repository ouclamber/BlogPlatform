import io
from PIL import Image
from django.contrib.auth import get_user_model
from django.contrib.admin.sites import AdminSite
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory
from rest_framework import status
from rest_framework.test import APITestCase

from .admin import MediaAdmin
from .models import Media

User = get_user_model()

def make_image_file(name="test.png", content_type="image/png"):
    image = Image.new("RGB", (100, 100), color="red")
    buffer = io.BytesIO()

    fmt = "PNG"
    if "jpeg" in content_type or "jpg" in content_type:
        fmt = "JPEG"
    elif "gif" in content_type:
        fmt = "GIF"
    elif "webp" in content_type:
        fmt = "WEBP"

    image.save(buffer, format=fmt)
    buffer.seek(0)

    return SimpleUploadedFile(name, buffer.read(), content_type=content_type)

def make_fake_file(name="test.png", content_type="image/png", size_bytes=1024):
    return SimpleUploadedFile(name, b"0" * size_bytes, content_type=content_type)

class MediaModelTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="uploader",
            email="uploader@test.com",
            password="pass12345",
        )

    def test_size_autofilled_on_save(self):
        media = Media.objects.create(
            user=self.user,
            file=make_image_file(name="test.png"),
        )
        self.assertGreater(media.size, 0)

    def test_str_returns_file_name(self):
        media = Media.objects.create(
            user=self.user,
            file=make_image_file(name="photo.png"),
        )
        self.assertIn("photo", str(media))

    def test_file_type_autofilled_on_save(self):
        media = Media.objects.create(
            user=self.user,
            file=make_image_file(name="photo.png"),
        )
        self.assertEqual(media.file_type, "image/png")

    def test_is_image_property(self):
        media = Media.objects.create(
            user=self.user,
            file=make_image_file(name="photo.png"),
        )
        self.assertTrue(media.is_image)

    def test_extension_property(self):
        media = Media.objects.create(
            user=self.user,
            file=make_image_file(name="photo.png"),
        )
        self.assertEqual(media.extension, "png")

class MediaAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="uploader2",
            email="uploader2@test.com",
            password="pass12345",
        )
        self.other_user = User.objects.create_user(
            username="other",
            email="other@test.com",
            password="pass12345",
        )

    def test_anonymous_cannot_upload(self):
        response = self.client.post(
            "/api/media/",
            {"file": make_image_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_upload(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/media/",
            {"file": make_image_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["file_type"], "image/png")

    def test_rejects_file_too_large(self):
        self.client.force_authenticate(self.user)
        big_file = make_fake_file(size_bytes=11 * 1024 * 1024)
        response = self.client.post(
            "/api/media/", {"file": big_file}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_empty_file(self):
        self.client.force_authenticate(self.user)
        empty_file = make_fake_file(size_bytes=0)
        response = self.client.post(
            "/api/media/", {"file": empty_file}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_disallowed_content_type(self):
        self.client.force_authenticate(self.user)
        bad_file = make_fake_file(
            name="doc.exe",
            content_type="application/octet-stream",
        )
        response = self.client.post(
            "/api/media/", {"file": bad_file}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_disallowed_extension(self):
        self.client.force_authenticate(self.user)
        bad_file = make_fake_file(
            name="document.pdf",
            content_type="image/png",
        )
        response = self.client.post(
            "/api/media/", {"file": bad_file}, format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepts_all_allowed_types(self):
        allowed = [
            ("test.jpg", "image/jpeg"),
            ("test.png", "image/png"),
            ("test.gif", "image/gif"),
        ]
        self.client.force_authenticate(self.user)
        for name, content_type in allowed:
            file = make_image_file(name=name, content_type=content_type)
            response = self.client.post(
                "/api/media/", {"file": file}, format="multipart"
            )
            self.assertEqual(
                response.status_code,
                status.HTTP_201_CREATED,
                f"Файл {name} ({content_type}) должен быть принят. "
                f"Ответ: {response.data}",
            )

    def test_user_sees_only_own_files(self):
        Media.objects.create(
            user=self.other_user, file=make_image_file(name="other.png")
        )
        Media.objects.create(
            user=self.user, file=make_image_file(name="mine.png")
        )
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/media/")
        self.assertEqual(len(response.data["results"]), 1)

    def test_user_cannot_retrieve_foreign_file(self):
        media = Media.objects.create(
            user=self.other_user, file=make_image_file()
        )
        self.client.force_authenticate(self.user)
        response = self.client.get(f"/api/media/{media.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_retrieve_own_file(self):
        media = Media.objects.create(user=self.user, file=make_image_file())
        self.client.force_authenticate(self.user)
        response = self.client.get(f"/api/media/{media.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], media.id)

    def test_user_can_delete_own_file(self):
        media = Media.objects.create(user=self.user, file=make_image_file())
        self.client.force_authenticate(self.user)
        response = self.client.delete(f"/api/media/{media.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Media.objects.filter(id=media.id).exists())

    def test_user_cannot_delete_foreign_file(self):
        media = Media.objects.create(
            user=self.other_user, file=make_image_file()
        )
        self.client.force_authenticate(self.user)
        response = self.client.delete(f"/api/media/{media.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_files_pagination(self):
        for i in range(25):
            Media.objects.create(
                user=self.user, file=make_image_file(name=f"file{i}.png")
            )
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/media/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("count", response.data)
        self.assertEqual(response.data["count"], 25)

    def test_files_ordered_by_created_at(self):
        media1 = Media.objects.create(
            user=self.user, file=make_image_file(name="first.png")
        )
        media2 = Media.objects.create(
            user=self.user, file=make_image_file(name="second.png")
        )
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/media/")
        self.assertEqual(response.data["results"][0]["id"], media2.id)
        self.assertEqual(response.data["results"][1]["id"], media1.id)

    def test_stats_endpoint(self):
        Media.objects.create(user=self.user, file=make_image_file())
        Media.objects.create(user=self.user, file=make_image_file())
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/media/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_files"], 2)

    def test_stats_empty(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/media/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_files"], 0)

class MediaPermissionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="media_user",
            email="media_user@test.com",
            password="pass12345",
        )
        self.other = User.objects.create_user(
            username="media_other",
            email="media_other@test.com",
            password="pass12345",
        )
        self.admin = User.objects.create_user(
            username="media_admin",
            email="media_admin@test.com",
            password="pass12345",
            role="admin",
        )

    def test_admin_can_access_other_user_file(self):
        media = Media.objects.create(
            user=self.other, file=make_image_file(name="other.png")
        )
        self.client.force_authenticate(self.admin)
        response = self.client.get(f"/api/media/{media.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_cannot_access_foreign_file(self):
        media = Media.objects.create(
            user=self.other, file=make_image_file(name="other.png")
        )
        self.client.force_authenticate(self.user)
        response = self.client.get(f"/api/media/{media.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_cannot_upload(self):
        response = self.client.post(
            "/api/media/",
            {"file": make_image_file()},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

class MediaModelPropertyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="media_props",
            email="media_props@test.com",
            password="pass12345",
        )

    def test_is_image_true(self):
        media = Media.objects.create(
            user=self.user, file=make_image_file(name="test.png")
        )
        self.assertTrue(media.is_image)

    def test_is_video_false(self):
        media = Media.objects.create(
            user=self.user, file=make_image_file(name="test.png")
        )
        self.assertFalse(media.is_video)

    def test_is_audio_false(self):
        media = Media.objects.create(
            user=self.user, file=make_image_file(name="test.png")
        )
        self.assertFalse(media.is_audio)

    def test_is_document_false(self):
        media = Media.objects.create(
            user=self.user, file=make_image_file(name="test.png")
        )
        self.assertFalse(media.is_document)

    def test_size_kb(self):
        media = Media.objects.create(
            user=self.user, file=make_image_file(name="test.png")
        )
        self.assertGreater(media.size_kb, 0)

    def test_filename(self):
        media = Media.objects.create(
            user=self.user, file=make_image_file(name="photo.png")
        )
        self.assertIn("photo", media.filename)

    def test_get_file_url(self):
        media = Media.objects.create(
            user=self.user, file=make_image_file(name="test.png")
        )
        self.assertIsNotNone(media.get_file_url())

    def test_get_user_files(self):
        Media.objects.create(user=self.user, file=make_image_file())
        Media.objects.create(user=self.user, file=make_image_file())
        self.assertEqual(Media.get_user_files(self.user).count(), 2)

    def test_get_user_images(self):
        Media.objects.create(user=self.user, file=make_image_file())
        self.assertEqual(Media.get_user_images(self.user).count(), 1)

    def test_get_user_documents(self):
        Media.objects.create(user=self.user, file=make_image_file())
        self.assertEqual(Media.get_user_documents(self.user).count(), 0)

class MediaAdminTests(APITestCase):
    def setUp(self):
        self.site = AdminSite()
        self.admin = MediaAdmin(Media, self.site)
        self.factory = RequestFactory()

        self.user = User.objects.create_user(
            username="admin_user",
            email="admin_user@test.com",
            password="pass12345",
        )
        self.admin_user = User.objects.create_user(
            username="admin_staff",
            email="admin_staff@test.com",
            password="pass12345",
            role="admin",
            is_staff=True,
        )
        self.media = Media.objects.create(
            user=self.user, file=make_image_file(name="test.png")
        )

    def test_user_link(self):
        html = self.admin.user_link(self.media)
        self.assertIn(self.user.username, html)
        self.assertIn(str(self.user.id), html)   
        self.assertIn("/admin/users/user/", html)
        self.assertIn("/change/", html)

    def test_file_preview_with_image(self):
        html = self.admin.file_preview(self.media)
        self.assertIn("<img", html)
        self.assertIn(self.media.file.url, html)

    def test_file_preview_without_image(self):
        media = Media.objects.create(
            user=self.user,
            file=make_image_file(name="test.png"),
        )
        media.file_type = "application/pdf"
        media.save()
        html = self.admin.file_preview(media)
        self.assertEqual(html, "")

    def test_file_link(self):
        html = self.admin.file_link(self.media)
        self.assertIn("<a", html)
        self.assertIn("</a>", html)
        self.assertIn("test", html)
        self.assertIn('target="_blank"', html)

    def test_file_link_without_file(self):
        self.media.file = None
        self.media.save()
        html = self.admin.file_link(self.media)
        self.assertEqual(html, "-")

    def test_size_display_bytes(self):
        self.media.size = 512
        html = self.admin.size_display(self.media)
        self.assertIn("Б", html)
        self.assertIn("512", html)

    def test_size_display_kb(self):
        self.media.size = 2048
        html = self.admin.size_display(self.media)
        self.assertIn("КБ", html)

    def test_size_display_mb(self):
        self.media.size = 5 * 1024 * 1024
        html = self.admin.size_display(self.media)
        self.assertIn("МБ", html)

    def test_size_display_zero(self):
        self.media.size = 0
        html = self.admin.size_display(self.media)
        self.assertEqual(html, "0 Б")

    def test_get_queryset_uses_select_related(self):
        request = self.factory.get("/admin/media/media/")
        request.user = self.admin_user
        qs = self.admin.get_queryset(request)
        self.assertIn("user", qs.query.select_related)

    def test_delete_files_action(self):
        Media.objects.create(user=self.user, file=make_image_file())
        Media.objects.create(user=self.user, file=make_image_file())

        request = self.factory.post("/admin/media/media/")
        request.user = self.admin_user
        request._messages = []  

        queryset = Media.objects.all()

        self.admin.message_user = lambda *args, **kwargs: None

        self.admin.delete_files(request, queryset)

        self.assertEqual(Media.objects.count(), 0)

    def test_readonly_fields(self):
        readonly = self.admin.readonly_fields
        self.assertIn("file_type", readonly)
        self.assertIn("size", readonly)
        self.assertIn("created_at", readonly)

    def test_list_display(self):
        display = self.admin.list_display
        self.assertIn("id", display)
        self.assertIn("user_link", display)
        self.assertIn("file_preview", display)
        self.assertIn("file_link", display)
        self.assertIn("size_display", display)

    def test_list_filter(self):
        filters = self.admin.list_filter
        self.assertIn("file_type", filters)
        self.assertIn("created_at", filters)

    def test_search_fields(self):
        search = self.admin.search_fields
        self.assertIn("user__username", search)
        self.assertIn("user__email", search)
        self.assertIn("file", search)
        self.assertIn("file_type", search)