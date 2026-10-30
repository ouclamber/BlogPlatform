"""Ограничение частоты запросов для чувствительных эндпоинтов."""
from rest_framework.throttling import SimpleRateThrottle


class LoginRateThrottle(SimpleRateThrottle):
    """Защита от перебора паролей.

    Ключ = IP + логин: атакующий не может перебирать пароли одного аккаунта
    с одного IP, но и легитимные пользователи за общим NAT не блокируют друг друга.
    """

    scope = "login"

    def get_cache_key(self, request, view):
        username = ""
        if hasattr(request, "data") and hasattr(request.data, "get"):
            username = str(request.data.get("username", ""))[:150].lower()
        return self.cache_format % {
            "scope": self.scope,
            "ident": f"{self.get_ident(request)}:{username}",
        }


class RegisterRateThrottle(SimpleRateThrottle):
    scope = "register"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class PasswordChangeRateThrottle(SimpleRateThrottle):
    scope = "password_change"

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}
