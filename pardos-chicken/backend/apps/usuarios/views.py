from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Usuario


class UsuarioActualView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        return Response(
            {
                "username": usuario.username,
                "nombre": usuario.get_full_name() or usuario.username,
                "rol": Usuario.Rol.ADMINISTRADOR if usuario.is_superuser else usuario.rol,
            }
        )
