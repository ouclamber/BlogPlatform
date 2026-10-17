from rest_framework import serializers

from apps.users.serializers import UserSerializer
from apps.posts.serializers import PostListSerializer
from .models import Like


class LikeSerializer(serializers.ModelSerializer):  
    user_detail = UserSerializer(source='user', read_only=True)
    post_detail = PostListSerializer(source='post', read_only=True)
    
    class Meta:
        model = Like
        fields = (
            "id", 
            "user",         
            "user_detail",  
            "post",         
            "post_detail",   
            "created_at"
        )
        read_only_fields = ("user", "created_at", "user_detail", "post_detail")
    
    def validate(self, attrs):
        request = self.context.get("request")
        
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Вы должны быть авторизованы.")
        
        post = attrs.get("post")

        if Like.objects.filter(user=request.user, post=post).exists():
            raise serializers.ValidationError("Вы уже лайкнули этот пост.")

        if post and post.author == request.user:
            raise serializers.ValidationError("Нельзя лайкать свой пост.")
        
        return attrs
    
    def create(self, validated_data):
        request = self.context["request"]
        return Like.objects.create(user=request.user, **validated_data)