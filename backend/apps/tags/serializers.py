from rest_framework import serializers

from .models import Tag


class TagSerializer(serializers.ModelSerializer):
    posts_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tag
        fields = ("id", "name", "slug", "posts_count")
        read_only_fields = ("slug",)

    def validate_name(self, value):
        normalized = value.strip()
        qs = Tag.objects.filter(name__iexact=normalized)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Такой тег уже существует.")
        return normalized