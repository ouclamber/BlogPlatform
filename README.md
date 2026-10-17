# BlogPlatform
 
Платформа для ведения блогов: посты с обложками, теги и категории, комментарии с ответами, лайки, подписки на авторов и загрузка изображений.
Бэкенд — REST API на **Django REST Framework**, фронтенд — SPA на **React + Vite**.
 
> Учебный проект для портфолио. Цель — построить полноценный REST API с ролями и правами доступа, покрыть его тестами и настроить CI.
 
<!-- Добавьте скриншоты в папку docs/ и раскомментируйте:
![Лента](docs/home.png)
![Страница поста](docs/post.png)
![Редактор](docs/editor.png)
-->
 
---
 
## Возможности
 
- Регистрация, вход по JWT, автоматическое обновление токена
- Роли: **читатель** (reader), **автор** (author), **администратор** (admin)
- Посты со статусами: черновик → опубликован → в архиве
- Обложки постов, категории, теги, время чтения, счётчик просмотров
- Поиск, фильтрация (категория, тег, автор, статус) и сортировка ленты, пагинация
- Комментарии с ответами (один уровень вложенности), редактирование и удаление
- Лайки постов
- Подписки на авторов
- Профили пользователей, загрузка аватара, смена пароля
- Библиотека изображений пользователя (типы, размер и содержимое файлов проверяются)
- Swagger / ReDoc документация API
- Логирование по модулям с ротацией файлов
**Права доступа**
 
| Действие | Аноним | Читатель | Автор | Админ |
|----------|:------:|:--------:|:-----:|:-----:|
| Читать опубликованные посты | ✅ | ✅ | ✅ | ✅ |
| Комментировать, лайкать, подписываться | ❌ | ✅ | ✅ | ✅ |
| Создавать посты | ❌ | ❌ | ✅ | ✅ |
| Редактировать и удалять свои посты | ❌ | ❌ | ✅ | ✅ |
| Редактировать и удалять чужие посты и комментарии | ❌ | ❌ | ❌ | ✅ |
| Создавать категории | ❌ | ❌ | ❌ | ✅ |
 
---
 
## Технологии
 
| Слой | Стек |
|------|------|
| Backend | Python 3.12, Django 5.1, Django REST Framework 3.15, PostgreSQL, SimpleJWT, django-filter, drf-spectacular, Pillow, cryptography |
| Frontend | React 19, Vite, React Router 7, Zustand, Axios, Tailwind CSS, react-hot-toast |
| Тесты | Django TestCase / DRF APIClient, Vitest + React Testing Library |
| DevOps | Docker, Docker Compose, GitHub Actions (CI бэкенда и фронтенда, публикация образа, релизы), Vercel-конфиг для фронтенда |
 
---
 
## Структура проекта
 
```
BlogPlatform/
├── backend/
│   ├── blog_project/        # Настройки, urls
│   ├── apps/
│   │   ├── users/           # Пользователи, JWT, профили, подписки
│   │   ├── posts/           # Посты, фильтры, права
│   │   ├── comments/        # Комментарии и ответы
│   │   ├── likes/           # Лайки
│   │   ├── media/           # Загрузка изображений
│   │   ├── tags/            # Теги
│   │   └── categories/      # Категории
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/                 # Feature-Sliced Design:
│       ├── app/             #   инициализация, роутинг, провайдеры
│       ├── pages/           #   страницы
│       ├── widgets/         #   header, footer, post-list, comment-list...
│       ├── features/        #   auth, post, comment, tag, cover
│       ├── entities/        #   user, post, comment
│       └── shared/          #   api-клиент, ui-kit, утилиты
├── docker-compose.yml
└── .github/workflows/
```
 
---
 
## Быстрый старт
 
### Вариант 1: Docker (бэкенд + база)
 
```bash
git clone <repository-url>
cd BlogPlatform
 
cp backend/.env.example backend/.env
```
 
Отредактируйте `backend/.env`:
 
```env
SECRET_KEY=<сгенерируйте, см. ниже>
FIELD_ENCRYPTION_KEY=<сгенерируйте, см. ниже>
DEBUG=True
DB_PASSWORD=root                       # должен совпадать с POSTGRES_PASSWORD в docker-compose.yml
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```
 
Запуск:
 
```bash
docker compose up --build
docker compose exec backend python manage.py createsuperuser
```
 
Миграции применяются автоматически при старте контейнера.
 
### Вариант 2: Локально
 
Требуется Python 3.12+ и PostgreSQL 14+.
 
```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
 
cp .env.example .env             # затем заполните значения
createdb blog2 -U postgres
 
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
 
### Фронтенд
 
```bash
cd frontend
npm install
npm run dev
```
 
Приложение откроется на http://localhost:5173.
Адрес API по умолчанию — `http://127.0.0.1:8000/api`; изменить его можно переменной `VITE_API_URL`.
 
### Адреса
 
| Адрес | Описание |
|-------|----------|
| http://localhost:5173 | Фронтенд |
| http://127.0.0.1:8000/api/docs/ | Swagger UI |
| http://127.0.0.1:8000/api/redoc/ | ReDoc |
| http://127.0.0.1:8000/admin/ | Админка Django |
 
### Генерация секретов
 
```bash
# SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
 
# FIELD_ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
 
> Не коммитьте `.env`. Если секрет попал в репозиторий, считайте его скомпрометированным и сгенерируйте новый.
 
---
 
## Переменные окружения
 
| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `SECRET_KEY` | Секретный ключ Django (обязательна) | — |
| `FIELD_ENCRYPTION_KEY` | Ключ Fernet для шифруемых полей профиля | производная от `SECRET_KEY` |
| `DEBUG` | Режим отладки | `False` |
| `ALLOWED_HOSTS` | Разрешённые хосты | `localhost,127.0.0.1` |
| `DB_ENGINE`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | Настройки PostgreSQL | `blog2`, `postgres`, `localhost`, `5432` |
| `CORS_ALLOWED_ORIGINS` | Разрешённые источники фронтенда | `http://localhost:3000,...` |
| `JWT_ACCESS_TOKEN_LIFETIME_MINUTES` | Время жизни access-токена | `60` |
| `JWT_REFRESH_TOKEN_LIFETIME_DAYS` | Время жизни refresh-токена | `1` |
| `LOG_LEVEL` | Уровень логирования | `INFO` |
 
---
 
## API
 
Полная документация — в Swagger (`/api/docs/`).
 
### Пользователи (`/api/users/`)
 
| Метод | URL | Описание |
|-------|-----|----------|
| POST | `register/` | Регистрация |
| POST | `login/` | Вход, возвращает access, refresh и данные пользователя |
| POST | `refresh/` | Обновление токена |
| GET, PATCH | `me/` | Текущий пользователь |
| PATCH | `me/avatar/` | Загрузка аватара |
| PATCH | `me/change-password/` | Смена пароля |
| GET | `users/{username}/` | Публичный профиль |
| POST | `subscriptions/{user_id}/toggle/` | Подписаться или отписаться |
 
### Посты (`/api/posts/`)
 
| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/` | Список (поиск `?search=`, фильтры `?category=&tag=&author=&status=`, сортировка `?ordering=`) |
| POST | `/` | Создать (author, admin) |
| GET, PATCH, DELETE | `{slug}/` | Пост: чтение, правка, удаление |
| POST | `{slug}/like/`, `{slug}/unlike/` | Лайк и снятие лайка |
| POST | `{slug}/publish/`, `{slug}/archive/` | Смена статуса |
| GET | `my_posts/` | Мои посты |
 
### Остальное
 
| Ресурс | URL | Описание |
|--------|-----|----------|
| Комментарии | `/api/comments/` (`?post=<slug>`) | CRUD |
| Лайки | `/api/likes/` | Список моих лайков, создание, удаление |
| Медиа | `/api/media/`, `/api/media/stats/` | Загрузка изображений, статистика |
| Теги | `/api/tags/` | Список, создание |
| Категории | `/api/categories/` | Список, создание (admin) |
 
Авторизация: заголовок `Authorization: Bearer <access_token>`.
 
---
 
## Тесты
 
```bash
# Бэкенд
cd backend
python manage.py test                       # все тесты
python manage.py test apps.posts            # одно приложение
coverage run manage.py test && coverage report
 
# Фронтенд
cd frontend
npm test
npm run coverage
```
 
Бэкенд: около 185 тестов по всем приложениям (права доступа, валидация, фильтры, загрузка файлов).
Фронтенд: 36 тестовых файлов (компоненты, страницы, хранилища, утилиты).
 
---
 
## CI/CD
 
Workflows в `.github/workflows/`:
 
| Файл | Назначение |
|------|------------|
| `backend-ci.yml` | Тесты бэкенда на PostgreSQL + отчёт о покрытии |
| `frontend-ci.yml` | Тесты с покрытием и сборка фронтенда |
| `backend-cd.yml` | Сборка и публикация Docker-образа в GitHub Container Registry |
| `release.yml` | Релизы |
 
---
 
## Планы по развитию
 
- [ ] Продакшен-конфигурация: gunicorn, nginx, раздача статики и медиа
- [ ] Контейнер для фронтенда в `docker-compose.yml`
- [ ] Ограничение частоты запросов (throttling) на вход и регистрацию
- [ ] Черновики и редактор с форматированием (Markdown)
- [ ] Уведомления подписчикам о новых постах
- [ ] Загрузка медиа в облачное хранилище (S3)
---
