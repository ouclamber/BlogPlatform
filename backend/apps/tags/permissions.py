from rest_framework import permissions


class IsAuthenticatedCreateOrAdminWrite(permissions.BasePermission):

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.method == "POST":
            return request.user and request.user.is_authenticated

        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_admin_role  
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_admin_role
        )