"""Демо-данные для локальной разработки: пользователи, посты с обложками, комментарии.

    python manage.py seed_demo

Работает только при DEBUG=True. Пароль всех демо-пользователей: Demo-Pass-2026!
"""
import io
import random

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from PIL import Image, ImageDraw

from apps.categories.models import Category
from apps.comments.models import Comment
from apps.likes.models import Like
from apps.posts.models import Post
from apps.tags.models import Tag
from apps.users.models import Subscription, User

PASSWORD = "Demo-Pass-2026!"
LOREM = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " * 40

POSTS = [
    ("Как ускорить Django API в 10 раз", "N+1, подзапросы и индексы на реальном проекте.", "maxim", "Разработка", ["django", "python", "performance"]),
    ("Glassmorphism без боли", "Полупрозрачные панели, blur и правильный контраст.", "anna", "Дизайн", ["react", "ux", "tailwind"]),
    ("JWT, ротация и чёрный список токенов", "Почему logout на фронтенде — ещё не выход.", "maxim", "Разработка", ["django", "security"]),
    ("Скелетоны вместо спиннеров", "Как улучшить воспринимаемую скорость интерфейса.", "anna", "Дизайн", ["react", "ux"]),
    ("PostgreSQL: частичные уникальные индексы", "Уникальность только для непустых значений.", "maxim", "Наука", ["postgres"]),
    ("Путь от джуна до тимлида", "Личный опыт и выводы за пять лет.", "anna", "Карьера", []),
]


def cover(seed, name):
    rnd = random.Random(seed)
    c1, c2 = (88 + seed * 8, 28, 135), (168, 85 + seed * 10, 247)
    img = Image.new("RGB", (1200, 675))
    draw = ImageDraw.Draw(img)
    for x in range(1200):
        t = x / 1199
        draw.line([(x, 0), (x, 675)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
    for _ in range(12):
        r, cx, cy = rnd.randint(40, 160), rnd.randint(0, 1200), rnd.randint(0, 675)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(255, 255, 255), width=3)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return SimpleUploadedFile(name, buf.getvalue(), content_type="image/jpeg")


class Command(BaseCommand):
    help = "Заполнить БД демо-данными (только DEBUG=True)."

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("seed_demo доступна только при DEBUG=True.")
        if User.objects.filter(username="anna").exists():
            self.stdout.write("Демо-данные уже есть — пропускаю.")
            return

        with transaction.atomic():
            users = {
                "anna": User.objects.create_user("anna", "anna@example.com", PASSWORD, role="author",
                                                 bio="Пишу о фронтенде и дизайне."),
                "maxim": User.objects.create_user("maxim", "maxim@example.com", PASSWORD, role="author",
                                                  bio="Backend, Django и базы данных."),
                "olga": User.objects.create_user("olga", "olga@example.com", PASSWORD, role="reader"),
            }
            if not User.objects.filter(username="admin").exists():
                users["admin"] = User.objects.create_superuser("admin", "admin@example.com", PASSWORD)

            categories = {name: Category.objects.get_or_create(name=name)[0]
                          for name in ("Разработка", "Дизайн", "Наука", "Карьера")}
            tag_names = {t for *_, tags in POSTS for t in tags}
            tags = {name: Tag.objects.get_or_create(name=name)[0] for name in tag_names}

            posts = []
            for i, (title, excerpt, author, category, post_tags) in enumerate(POSTS):
                post = Post.objects.create(
                    author=users[author], title=title, excerpt=excerpt,
                    content=f"{excerpt}\n\n{LOREM}", category=categories[category],
                    status=Post.Status.PUBLISHED, views_count=random.randint(20, 900),
                    cover_image=cover(i, f"demo-{i}.jpg") if i != len(POSTS) - 1 else None,
                )
                post.tags.set([tags[t] for t in post_tags])
                posts.append(post)

            Post.objects.create(author=users["anna"], title="Черновик: идеи для статьи",
                                content="Заметки для будущего поста.", category=categories["Дизайн"])

            for post in posts:
                for user in users.values():
                    if user != post.author and random.random() > 0.3:
                        Like.objects.get_or_create(user=user, post=post)

            root = Comment.objects.create(post=posts[0], author=users["olga"], content="Отличная статья!")
            Comment.objects.create(post=posts[0], author=users["maxim"], parent=root, content="Спасибо!")
            Subscription.objects.create(subscriber=users["olga"], author=users["anna"])

        self.stdout.write(self.style.SUCCESS(
            f"Готово. Пользователи: anna, maxim (авторы), olga (читатель), admin. Пароль: {PASSWORD}"
        ))
