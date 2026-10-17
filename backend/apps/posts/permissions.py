from rest_framework import permissions


class IsAuthorOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        if obj.author == request.user:
            return True

        return request.user.is_admin_role


class CanCreatePost(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method != "POST":
            return True

        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_author
        )


class CanPublishPost(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        if obj.author == request.user:
            return True

        return request.user.is_admin_role


class CanDeletePost(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        if obj.author == request.user:
            return True

        return request.user.is_admin_role