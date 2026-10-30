# BlogPlatform

Блог-платформа: посты с обложками, теги и категории, вложенные комментарии, лайки, подписки на авторов и медиатека.

Бэкенд — REST API на Django, фронтенд — SPA на React. Проект запускается одной командой через Docker Compose.

[![Backend CI](https://github.com/ouclamber/BlogPlatform/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ouclamber/BlogPlatform/actions/workflows/backend-ci.yml)
[![Frontend CI](https://github.com/ouclamber/BlogPlatform/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/ouclamber/BlogPlatform/actions/workflows/frontend-ci.yml)
[![Backend CD](https://github.com/ouclamber/BlogPlatform/actions/workflows/backend-cd.yml/badge.svg)](https://github.com/ouclamber/BlogPlatform/actions/workflows/backend-cd.yml)

---

## Содержание

- [Возможности](#возможности)
- [Технологии](#технологии)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Переменные окружения](#переменные-окружения)
- [Локальная разработка без Docker](#локальная-разработка-без-docker)
- [Тесты](#тесты)
- [API](#api)
- [Структура проекта](#структура-проекта)
- [CI/CD](#cicd)
- [Безопасность](#безопасность)
- [Частые проблемы](#частые-проблемы)

---

## Возможности

- **Посты:** черновики, публикация, архив, обложки, теги, категории, поиск, фильтры и сортировка (новые, популярные, по лайкам).
- **Комментарии:** вложенные ответы, редактирование с пометкой «изменён».
- **Лайки** с мгновенным откликом интерфейса и **подписки** на авторов.
- **Роли:** читатель, автор и администратор.
- **Профили** с аватаром, био и статистикой.
- **Медиатека:** загрузка изображений с проверкой реального формата файла.
- **Админка Django** для управления всем контентом.
- **Интерфейс:** адаптивный дизайн, скелетоны при загрузке, анимации; при системной настройке «уменьшить движение» анимации отключаются.

## Технологии

| Слой | Стек |
|------|------|
| Бэкенд | Python 3.12, Django 5.2 LTS, Django REST Framework 3.16, SimpleJWT, drf-spectacular (Swagger), django-filter |
| База данных | PostgreSQL 16 |
| Фронтенд | React 19, Vite 6, React Router 7, Zustand, Tailwind CSS 3, Axios |
| Тесты | Django TestCase, Vitest, Testing Library |
| Инфраструктура | Docker, Docker Compose, Nginx, Gunicorn, GitHub Actions, GitHub Container Registry |

---

## Быстрый старт (Docker)

Понадобится [Docker Desktop](https://www.docker.com/products/docker-desktop/), и он должен быть запущен.

### 1. Клонировать репозиторий

```bash
git clone https://github.com/ouclamber/BlogPlatform.git
cd BlogPlatform
```

### 2. Создать файл с настройками

```bash
cp backend/.env.example backend/.env        # Windows: copy backend\.env.example backend\.env
```

Откройте `backend/.env` и заполните три значения.

`SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

`FIELD_ENCRYPTION_KEY` (ключ шифрования email и bio в базе):
```bash
python -c "import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())"
```

`DB_PASSWORD`: любой пароль для базы данных.

### 3. Запустить

```bash
docker compose up --build -d
```

Через 20–30 секунд проверьте состояние:
```bash
docker compose ps
```
У `db` должен быть статус `healthy`, у `backend` и `frontend` — `running`.

### 4. Наполнить данными (по желанию)

```bash
docker compose exec backend python manage.py seed_demo
```
Команда создаёт пользователей `anna` и `maxim` (авторы), `olga` (читатель) и `admin`. Пароль у всех: `Demo-Pass-2026!`. Работает только при `DEBUG=True`.

### 5. Создать своего администратора

```bash
docker compose exec backend python manage.py createsuperuser
```

### Адреса

| Что | Адрес |
|-----|-------|
| Сайт | http://localhost:5173 |
| API | http://localhost:8000/api/ |
| Swagger | http://localhost:8000/api/docs/ |
| ReDoc | http://localhost:8000/api/redoc/ |
| Админка | http://localhost:8000/admin/ |

### Полезные команды

```bash
docker compose logs -f backend          # логи бэкенда
docker compose restart backend          # перезапуск бэкенда
docker compose up --build -d frontend   # пересобрать фронтенд после изменений
docker compose down                     # остановить
docker compose down -v                  # остановить и удалить базу данных
```

Исходники бэкенда подключены в контейнер напрямую, поэтому изменения в `backend/` подхватываются без пересборки.

---

## Переменные окружения

Файл `backend/.env`:

| Переменная | Описание | Пример |
|------------|----------|--------|
| `SECRET_KEY` | Секретный ключ Django. В production — не короче 50 символов | `...` |
| `DEBUG` | Режим разработки | `True` |
| `ALLOWED_HOSTS` | Разрешённые хосты | `localhost,127.0.0.1` |
| `FIELD_ENCRYPTION_KEY` | Ключ шифрования email/bio. **Обязателен при `DEBUG=False`. Потеря ключа = потеря данных** | `...` |
| `DB_ENGINE` | Движок БД | `django.db.backends.postgresql` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Подключение к PostgreSQL | `blog2` / `postgres` / `...` |
| `DB_HOST` / `DB_PORT` | Адрес БД. В Docker переопределяется на `db:5432` | `localhost` / `5432` |
| `CORS_ALLOWED_ORIGINS` | Адреса фронтенда | `http://localhost:5173` |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Время жизни access-токена | `15` |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Время жизни refresh-токена | `7` |
| `THROTTLE_LOGIN` | Лимит попыток входа | `10/min` |
| `LOG_LEVEL` | Уровень логирования | `INFO` |

Фронтенд (`frontend/.env`, используется только при запуске без Docker):

| Переменная | Пример |
|------------|--------|
| `VITE_API_URL` | `http://127.0.0.1:8000/api` |
| `VITE_MEDIA_URL` | `http://127.0.0.1:8000` |
| `VITE_DJANGO_ADMIN_URL` | `http://127.0.0.1:8000/admin/` |

---

## Локальная разработка без Docker

Нужны Python 3.12+, Node.js 22 и запущенный PostgreSQL.

### Бэкенд

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # заполнить, DB_HOST=localhost
python manage.py migrate
python manage.py seed_demo         # по желанию
python manage.py runserver         # http://127.0.0.1:8000
```

### Фронтенд

```bash
cd frontend
npm ci
npm run dev                        # http://localhost:5173
```

---

## Тесты

### Бэкенд

В Docker, на PostgreSQL:
```bash
docker compose exec -e TEST_DB=postgres backend python manage.py test --noinput
```

Локально из venv. По умолчанию тесты идут на SQLite в памяти, поэтому запущенная база не нужна:
```bash
cd backend
python manage.py test
python manage.py test apps.posts                      # одно приложение
coverage run --source=. manage.py test && coverage report
```

### Фронтенд

```bash
cd frontend
npm test -- --run        # один прогон
npm run coverage         # с покрытием
npm run lint             # линтер (oxlint)
npm run build            # проверка сборки
```

---

## API

Полная интерактивная документация доступна в Swagger: http://localhost:8000/api/docs/

Авторизация — по JWT: заголовок `Authorization: Bearer <access>`.

### Пользователи

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/users/register/` | Регистрация |
| POST | `/api/users/login/` | Вход, возвращает `access`, `refresh` и `user` |
| POST | `/api/users/refresh/` | Новый `access` и новый `refresh` (ротация) |
| POST | `/api/users/logout/` | Выход: отзыв refresh-токена |
| GET / PATCH | `/api/users/me/` | Свой профиль (username, email, bio) |
| PATCH / DELETE | `/api/users/me/avatar/` | Загрузить / удалить аватар |
| PATCH | `/api/users/me/change-password/` | Смена пароля: завершает остальные сеансы и возвращает новые токены |
| GET | `/api/users/users/{username}/` | Публичный профиль (без email) |
| POST | `/api/users/subscriptions/{id}/toggle/` | Подписаться / отписаться |

### Посты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/posts/` | Лента. Фильтры: `search`, `category`, `tag`, `author`, `status`; сортировка `ordering` (`-created_at`, `-views_count`, `-likes_count`, `-published_at`) |
| POST | `/api/posts/` | Создать пост (автор или админ) |
| GET | `/api/posts/{slug}/` | Пост целиком |
| PATCH / PUT / DELETE | `/api/posts/{slug}/` | Изменить / удалить |
| POST | `/api/posts/{slug}/like/` · `/unlike/` | Лайк / снять лайк |
| POST | `/api/posts/{slug}/publish/` · `/archive/` | Опубликовать / в архив |
| GET | `/api/posts/my_posts/?status=draft` | Мои посты |

### Комментарии, лайки, теги, категории, медиа

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/comments/?post={slug}` | Плоский список комментариев поста (по 100, `page_size` до 500) |
| POST / PATCH / DELETE | `/api/comments/` · `/api/comments/{id}/` | Создать / изменить / удалить |
| GET / POST / DELETE | `/api/likes/` · `/api/likes/{id}/` | Мои лайки |
| GET / POST | `/api/tags/` | Теги (без пагинации, `?search=`) |
| GET / POST | `/api/categories/` | Категории (создание — только админ) |
| GET / POST / DELETE | `/api/media/` · `/api/media/{id}/` | Мои файлы |
| GET | `/api/media/stats/` | Статистика файлов |

---

## Структура проекта

```
BlogPlatform/
├── .github/workflows/        # CI/CD: тесты, сборка Docker-образа, релизы
├── docker-compose.yml        # db + backend + frontend
├── backend/
│   ├── blog_project/         # настройки, корневые URL
│   ├── apps/
│   │   ├── common/           # валидаторы загрузок, лимиты запросов, пагинация
│   │   ├── users/            # пользователи, шифрование, подписки, команды manage.py
│   │   ├── posts/            # посты, фильтры, оптимизированные запросы
│   │   ├── comments/
│   │   ├── likes/
│   │   ├── tags/
│   │   ├── categories/
│   │   └── media/
│   ├── Dockerfile
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/              # точка входа, роутинг, провайдеры
    │   ├── pages/            # страницы
    │   ├── widgets/          # шапка, футер, списки
    │   ├── features/         # формы, действия
    │   ├── entities/         # сторы и карточки (пост, пользователь, комментарий)
    │   └── shared/           # API-клиент, UI-компоненты, утилиты
    ├── Dockerfile            # сборка + Nginx
    └── nginx.conf
```

Фронтенд организован по методологии [Feature-Sliced Design](https://feature-sliced.design/).

---

## CI/CD

| Workflow | Когда запускается | Что делает |
|----------|-------------------|------------|
| **Backend CI** | push / PR в `main` с изменениями в `backend/` | Проверка миграций, тесты на PostgreSQL, покрытие |
| **Frontend CI** | push / PR в `main` с изменениями в `frontend/` | Линтер, тесты с покрытием, сборка |
| **Backend CD** | push в `main` с изменениями в `backend/` | Сборка Docker-образа и публикация в `ghcr.io/ouclamber/blogplatform/backend` |
| **Create Release** | push тега `v*.*.*` | Сборка фронтенда и создание GitHub Release |

Любой workflow можно запустить вручную: **Actions** → выбрать workflow → **Run workflow**.

Как выпустить релиз:
```bash
git tag v0.0.3
git push origin v0.0.3
```

---

## Безопасность

- Email, bio и путь к аватару хранятся в базе зашифрованными (Fernet). Поиск по email идёт через HMAC-индекс.
- Email не попадает в публичные ответы API.
- JWT: access-токен живёт 15 минут, refresh-токены ротируются и попадают в чёрный список; выход отзывает токен на сервере.
- Лимиты запросов на вход (по IP и логину), регистрацию и смену пароля.
- Загрузки: проверяется реальный формат изображения, размер и разрешение; файлам даются случайные имена.
- Черновики и комментарии к ним не видны посторонним.
- В production сервер не запустится с шаблонным `SECRET_KEY` или без `FIELD_ENCRYPTION_KEY`.
- Docker-образ бэкенда работает не от root и использует Gunicorn.

Если ключ `FIELD_ENCRYPTION_KEY` нужно сменить:
```bash
python manage.py rotate_field_key --old-key <СТАРЫЙ_КЛЮЧ>   # новый ключ уже должен быть в .env
```

---

## Частые проблемы

**`ports are not available` / `port is already allocated`**
Порт занят другой программой или контейнером. Найдите контейнер, который его занял, и остановите его (`docker stop <имя>`), либо поменяйте внешний порт в `docker-compose.yml`. Зарезервированные Windows порты можно посмотреть так:
```cmd
netsh interface ipv4 show excludedportrange protocol=tcp
```

**База не создаётся / `password authentication failed`**
PostgreSQL создаёт базу и пароль только при первом запуске с пустым томом. После смены `DB_PASSWORD` или `DB_NAME` пересоздайте базу. Данные в Docker-базе при этом удалятся:
```bash
docker compose down -v
docker compose up -d
```

**Бэкенд не поднялся с первого раза**
```bash
docker compose restart backend
docker compose logs backend
```

**`failed to connect to the docker API`**
Не запущен Docker Desktop. Запустите его и дождитесь статуса «Engine running».

---

## Лицензия

MIT
