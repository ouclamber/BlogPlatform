"""Регрессионные тесты медиа: валидация содержимого, неизменяемость, очистка файлов, stats."""
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from rest_framework.test import APITestCase

from apps.common.testing import html_disguised_as_png, huge_dimensions_png, image_upload

from .models import Media

User = get_user_model()


class MediaSecurityTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="uploader2", email="uploader2@example.com", password="Sup3r-Secret!"
        )
        self.client.force_authenticate(self.user)

    def upload(self, file):
        return self.client.post("/api/media/", {"file": file}, format="multipart")

    def test_html_disguised_as_png_rejected(self):
        self.assertEqual(self.upload(html_disguised_as_png()).status_code, 400)

    def test_decompression_bomb_rejected(self):
        self.assertEqual(self.upload(huge_dimensions_png()).status_code, 400)

    def test_filename_with_spaces_and_parentheses_accepted(self):
        """Раньше «photo (1).png» отклонялся regex-проверкой имени."""
        response = self.upload(image_upload("photo (1).png"))
        self.assertEqual(response.status_code, 201)
        self.assertRegex(response.data["filename"], r"^photo-1-[0-9a-f]{12}\.png$")

    def test_update_is_not_allowed(self):
        media = Media.objects.create(user=self.user, file=image_upload())
        response = self.client.patch(f"/api/media/{media.id}/", {"file": image_upload()}, format="multipart")
        self.assertEqual(response.status_code, 405)

    def test_delete_removes_file(self):
        response = self.upload(image_upload())
        media = Media.objects.get(pk=response.data["id"])
        name = media.file.name
        with self.captureOnCommitCallbacks(execute=True):
            self.client.delete(f"/api/media/{media.id}/")
        self.assertFalse(default_storage.exists(name))

    def test_user_cascade_delete_removes_files(self):
        media = Media.objects.create(user=self.user, file=image_upload())
        name = media.file.name
        with self.captureOnCommitCallbacks(execute=True):
            self.user.delete()
        self.assertFalse(default_storage.exists(name))

    def test_stats_single_query_and_correct(self):
        Media.objects.create(user=self.user, file=image_upload("a.png"))
        Media.objects.create(user=self.user, file=image_upload("b.jpg", fmt="JPEG", content_type="image/jpeg"))
        total = sum(Media.objects.values_list("size", flat=True))
        with self.assertNumQueries(1):
            response = self.client.get("/api/media/stats/")
        self.assertEqual(response.data["total_files"], 2)
        self.assertEqual(response.data["images"], 2)
        self.assertEqual(response.data["total_size_bytes"], total)
