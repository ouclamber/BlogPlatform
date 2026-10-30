from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """Пагинация по умолчанию: клиент может попросить page_size, но не больше max."""

    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class LargePagination(PageNumberPagination):
    """Для комментариев: дерево собирается на клиенте, поэтому нужны крупные страницы."""

    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 500
