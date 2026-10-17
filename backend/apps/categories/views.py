from django.db.models import Count
from rest_framework import viewsets

from .models import Category
from .permissions import IsAdminOrReadOnly
from .serializers import CategorySerializer


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"

    def get_queryset(self):
        return (
            Category.objects
            .annotate(posts_count=Count("posts", distinct=True))
            .order_by("name")  
        )