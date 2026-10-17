import django_filters
from django_filters import rest_framework as filters
from django.db.models import Q

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

    tag_name = filters.CharFilter(
        field_name="tags__name",
        lookup_expr="icontains",
        help_text="Фильтр по названию тега",
    )

    author_name = filters.CharFilter(
        field_name="author__username",
        lookup_expr="icontains",
        help_text="Фильтр по имени автора (частичное совпадение)",
    )

    search = filters.CharFilter(
        method="filter_search",
        help_text="Поиск по заголовку, содержанию и описанию",
    )

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

    def filter_search(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value)
            | Q(content__icontains=value)
            | Q(excerpt__icontains=value)
        )