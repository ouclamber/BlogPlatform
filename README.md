# Blog Platform API

REST API для блога: посты, теги, категории, комментарии, лайки, медиафайлы.

---

## Технологии

- **Python** 3.12
- **Django** 5.1.1
- **Django REST Framework** 3.15
- **PostgreSQL** 14+
- **JWT** (SimpleJWT)
- **Swagger** (drf-spectacular)
- **Pillow** (для изображений)

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
- `SECRET_KEY` — сгенерируйте новый
- `DB_PASSWORD` — ваш пароль PostgreSQL
- `DEBUG=True` (для разработки)

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
| POST | `/api/users/refresh/` | Обновление токена |
| GET | `/api/users/me/` | Текущий пользователь |
| PATCH | `/api/users/me/` | Обновить профиль |
| POST | `/api/users/me/avatar/` | Загрузить аватар |

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
| GET | `/api/comments/` | Список комментариев |
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
| DELETE | `/api/media/{id}/` | Удалить файл |
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
# Все тесты
python manage.py test

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

- Секреты в `.env` (не в коде)
- JWT-аутентификация
- CORS настроен
- CSRF защита
- Валидация файлов (Pillow)
- Валидация паролей

---

## Лицензия

MIT

---

## Автор

Ваше имя