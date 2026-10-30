"""Переиспользуемые выражения для запросов к постам."""
from django.db.models import Count, IntegerField, OuterRef, Q, Subquery, Value
from django.db.models.functions import Coalesce


def count_subquery(model, **filters):
    """COUNT связанных строк через коррелированный подзапрос.

    Раньше использовалось Count("likes") + Count("comments") с distinct=True:
    два LEFT JOIN дают декартово произведение (лайки × комментарии строк на пост),
    что на популярных постах резко замедляет ленту.
    """
    return Coalesce(
        Subquery(
            model.objects.filter(post=OuterRef("pk"), **filters)
            .order_by()
            .values("post")
            .annotate(c=Count("pk"))
            .values("c")[:1],
            output_field=IntegerField(),
        ),
        Value(0),
    )


def visible_posts_q(user, prefix=""):
    """Какие посты видит пользователь: опубликованные + свои черновики/архив."""
    from .models import Post

    q = Q(**{f"{prefix}status": Post.Status.PUBLISHED})
    if user is not None and user.is_authenticated:
        q |= Q(**{f"{prefix}author": user})
    return q
