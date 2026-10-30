from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    posts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "parent", "posts_count")
        read_only_fields = ("slug",)

    def validate_parent(self, value):
        if self.instance and value == self.instance:
            raise serializers.ValidationError(
                "Категория не может быть родителем самой себе."
            )

        if value and self.instance:
            current = value
            visited = set()
            while current is not None:
                if current.pk in visited:
                    raise serializers.ValidationError(
                        "Обнаружен цикл в иерархии категорий."
                    )
                visited.add(current.pk)

                if current.pk == self.instance.pk:
                    raise serializers.ValidationError(
                        "Нельзя создать цикл в иерархии категорий."
                    )
                current = current.parent

        return value