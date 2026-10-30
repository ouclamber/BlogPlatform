from django_filters import rest_framework as filters

from .models import Post


class PostFilter(filters.FilterSet):
    category = filters.CharFilter(
        field_name="category__slug",
        lookup_expr="iexact",
        help_text="Фильтр по slug категории",
    )

    tag = filters.CharFilter(
        field_name="tags__slug",
        lookup_expr="iexact",
        help_text="Фильтр по slug тега",
        distinct=True,
    )

    author = filters.CharFilter(
        field_name="author__username",
        lookup_expr="iexact",
        help_text="Фильтр по имени автора",
    )

    status = filters.ChoiceFilter(
        choices=Post.Status.choices,
        help_text="Фильтр по статусу поста",
    )

    category_name = filters.CharFilter(
        field_name="category__name",
        lookup_expr="icontains",
        help_text="Фильтр по названию категории",
    )

    # distinct=True: JOIN по M2M без него дублирует пост, если совпало несколько тегов.
    tag_name = filters.CharFilter(
        field_name="tags__name",
        lookup_expr="icontains",
        help_text="Фильтр по названию тега",
        distinct=True,
    )

    author_name = filters.CharFilter(
        field_name="author__username",
        lookup_expr="icontains",
        help_text="Фильтр по имени автора (частичное совпадение)",
    )

    # Параметр ?search= обрабатывает SearchFilter во view. Раньше он же дублировался
    # здесь — те же три ILIKE '%…%' по content выполнялись дважды в одном запросе.

    published_after = filters.DateTimeFilter(
        field_name="published_at",
        lookup_expr="gte",
    )
    published_before = filters.DateTimeFilter(
        field_name="published_at",
        lookup_expr="lte",
    )
    created_after = filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="gte",
    )
    created_before = filters.DateTimeFilter(
        field_name="created_at",
        lookup_expr="lte",
    )

    views_min = filters.NumberFilter(
        field_name="views_count",
        lookup_expr="gte",
    )
    views_max = filters.NumberFilter(
        field_name="views_count",
        lookup_expr="lte",
    )

    class Meta:
        model = Post
        fields = {
            "category": ["exact"],
            "tags": ["exact"],
            "author": ["exact"],
            "status": ["exact"],
            "published_at": ["gte", "lte"],
            "created_at": ["gte", "lte"],
            "views_count": ["gte", "lte"],
        }
