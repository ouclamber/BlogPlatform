# Blog Platform API

REST API для блога: посты, теги, категории, комментарии, лайки, медиафайлы.

---

## Технологии

- **Python** 3.12
- **Django** 5.2 LTS
- **Django REST Framework** 3.16
- **PostgreSQL** 14+
- **JWT** (SimpleJWT)
- **Swagger** (drf-spectacular)
- **Pillow** (для изображений)

---

## Быстрый старт (Docker)

```bash
cp backend/.env.example backend/.env      # Windows: copy backend\.env.example backend\.env
# заполните в backend/.env: SECRET_KEY, FIELD_ENCRYPTION_KEY, DB_PASSWORD

docker compose up --build -d              # БД + бэкенд + фронтенд
docker compose exec backend python manage.py seed_demo         # демо-данные (по желанию)
docker compose exec backend python manage.py createsuperuser   # свой админ (по желанию)
```

| Что | Адрес |
|-----|-------|
| Сайт | http://localhost:5173 |
| Swagger | http://localhost:8000/api/docs/ |
| Админка | http://localhost:8000/admin/ |

Демо-пользователи после `seed_demo`: `anna`, `maxim` (авторы), `olga` (читатель), `admin` — пароль `Demo-Pass-2026!`.

```bash
docker compose logs -f backend            # логи
docker compose run --rm -e TEST_DB=postgres backend python manage.py test --noinput   # тесты бэкенда на PostgreSQL
docker compose down                       # остановить
docker compose down -v                    # остановить и удалить БД
docker compose up --build -d frontend     # пересобрать фронтенд после изменений
```

---

## Требования

- Python 3.12+
- PostgreSQL 14+
- pip

---

## Установка

### 1. Клонировать репозиторий

```bash
git clone <repository-url>
cd Blog-Platform
```

### 2. Создать виртуальное окружение

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux/Mac
source .venv/bin/activate
```

### 3. Установить зависимости

```bash
pip install -r requirements.txt
```

### 4. Создать `.env`

Скопируйте `.env.example` → `.env` и заполните:

```bash
copy .env.example .env    # Windows
cp .env.example .env      # Linux/Mac
```

Отредактируйте `.env`:
- `SECRET_KEY` — сгенерируйте новый (в production ≥ 50 символов, иначе сервер не запустится)
- `FIELD_ENCRYPTION_KEY` — ключ шифрования email/bio (обязателен при `DEBUG=False`)
- `DB_PASSWORD` — ваш пароль PostgreSQL
- `DEBUG=True` (для разработки)

> ⚠️ **Обновление существующей установки.** Если вы использовали ключ
> `FIELD_ENCRYPTION_KEY` из старого `.env.example`, он опубликован и считается
> скомпрометированным. Сгенерируйте новый ключ, пропишите его в `.env` и выполните
> `python manage.py rotate_field_key --old-key <старый_ключ>`.
> Миграция `users.0006` переводит bio и индекс email на новую схему — сделайте
> бэкап БД перед `migrate`.

### 5. Создать базу данных

```bash
# Через psql
createdb blog2 -U postgres
```

### 6. Применить миграции

```bash
python manage.py migrate
```

### 7. Создать суперпользователя

```bash
python manage.py createsuperuser
```

### 8. Запустить сервер

```bash
python manage.py runserver
```

---

## Доступные URL

| URL | Описание |
| `http://127.0.0.1:8000/` | → Редирект на Swagger |
| `http://127.0.0.1:8000/admin/` | Админка Django |
| `http://127.0.0.1:8000/api/docs/` | Swagger UI |
| `http://127.0.0.1:8000/api/redoc/` | ReDoc |
| `http://127.0.0.1:8000/api/schema/` | OpenAPI схема |

---

## API Эндпоинты

### Аутентификация

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/users/register/` | Регистрация |
| POST | `/api/users/login/` | Вход (JWT) |
| POST | `/api/users/refresh/` | Обновление токена (возвращает новый refresh — ротация) |
| POST | `/api/users/logout/` | Выход: отзыв refresh-токена |
| GET | `/api/users/me/` | Текущий пользователь |
| PATCH | `/api/users/me/` | Обновить профиль (username, email, bio) |
| PATCH/POST | `/api/users/me/avatar/` | Загрузить аватар |
| DELETE | `/api/users/me/avatar/` | Удалить аватар |
| PATCH | `/api/users/me/change-password/` | Смена пароля (отзывает все сессии, возвращает новые токены) |
| GET | `/api/users/users/{username}/` | Публичный профиль (без email) |
| POST | `/api/users/subscriptions/{id}/toggle/` | Подписаться/отписаться |

### Посты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/posts/` | Список постов |
| POST | `/api/posts/` | Создать пост |
| GET | `/api/posts/{slug}/` | Детали поста |
| PUT/PATCH | `/api/posts/{slug}/` | Обновить пост |
| DELETE | `/api/posts/{slug}/` | Удалить пост |
| POST | `/api/posts/{slug}/like/` | Лайкнуть |
| POST | `/api/posts/{slug}/unlike/` | Убрать лайк |
| POST | `/api/posts/{slug}/publish/` | Опубликовать |
| POST | `/api/posts/{slug}/archive/` | Архивировать |
| GET | `/api/posts/my_posts/` | Мои посты |

### Комментарии

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/comments/?post={slug}` | Плоский список комментариев (по 100, `page_size` до 500) |
| POST | `/api/comments/` | Создать |
| PATCH | `/api/comments/{id}/` | Обновить |
| DELETE | `/api/comments/{id}/` | Удалить |

### Лайки

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/likes/` | Мои лайки |
| POST | `/api/likes/` | Лайкнуть |
| DELETE | `/api/likes/{id}/` | Убрать лайк |

### Медиа

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/media/` | Мои файлы |
| POST | `/api/media/` | Загрузить файл |
| DELETE | `/api/media/{id}/` | Удалить файл (файл удаляется и из хранилища) |
| GET | `/api/media/stats/` | Статистика |

### Теги / Категории

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/tags/` | Список тегов |
| POST | `/api/tags/` | Создать тег |
| GET | `/api/categories/` | Список категорий |
| POST | `/api/categories/` | Создать (admin) |

---

## Тесты

```bash
# Все тесты (бэкенд) — по умолчанию на SQLite в памяти, PostgreSQL не нужен:
python manage.py test
# Те же тесты на PostgreSQL (БД должна быть запущена):
#   Linux/Mac:  TEST_DB=postgres python manage.py test
#   Windows cmd: set TEST_DB=postgres && python manage.py test

# Фронтенд
cd frontend && npm test -- --run && npm run lint

# Конкретное приложение
python manage.py test apps.posts

# С покрытием
coverage run manage.py test
coverage report
coverage html
```

---

## Структура проекта

```
Blog-Platform/
├── .env                    # Секреты (НЕ КОММИТИТЬ!)
├── .env.example            # Шаблон
├── .gitignore
├── README.md
├── requirements.txt
├── manage.py
├── blog_project/           # Настройки
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── apps/                   # Приложения
│   ├── users/
│   ├── posts/
│   ├── comments/
│   ├── likes/
│   ├── media/
│   ├── tags/
│   └── categories/
├── logs/                   # Логи (НЕ КОММИТИТЬ!)
└── media/                  # Загруженные файлы (НЕ КОММИТИТЬ!)
```

---

## Безопасность

- Секреты только в `.env`; в production запуск с шаблонным `SECRET_KEY` или без `FIELD_ENCRYPTION_KEY` блокируется
- Email, bio и путь к аватару зашифрованы (Fernet), поиск по email — через HMAC blind index
- Email никогда не попадает в публичные ответы API (авторы постов/комментариев, профили)
- JWT: короткий access-токен (15 мин), ротация refresh-токенов с чёрным списком, logout на сервере
- Ограничение частоты запросов: вход (по IP+логину), регистрация, смена пароля, общие лимиты
- Загрузки: проверка реального формата изображения, размера и разрешения, случайные имена файлов
- Черновики и комментарии к ним не видны посторонним; лайк/комментарий чужого черновика невозможен
- Django-валидаторы паролей при регистрации и смене пароля
- debug-toolbar только при `DEBUG=True`, Docker-образ — не от root, gunicorn вместо runserver

Подробный отчёт об исправлениях — в [CHANGES.md](CHANGES.md).

---

## Лицензия

MIT

---

## Автор

Ваше имя