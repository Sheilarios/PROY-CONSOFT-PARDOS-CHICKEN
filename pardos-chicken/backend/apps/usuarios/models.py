from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """
    Usuario del sistema con control de acceso por roles (RNF-07).

    Cada rol corresponde a un stakeholder interno definido en el
    documento de planificación: caja, cocina, despacho y administración.
    """

    class Rol(models.TextChoices):
        CAJERO = "CAJERO", "Personal de caja"
        COCINERO = "COCINERO", "Personal de cocina"
        DESPACHADOR = "DESPACHADOR", "Personal de despacho"
        ADMINISTRADOR = "ADMINISTRADOR", "Administrador / Gerente"

    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.CAJERO)
    telefono = models.CharField(max_length=9, blank=True)

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_rol_display()})"

    @property
    def es_caja(self):
        return self.rol == self.Rol.CAJERO

    @property
    def es_cocina(self):
        return self.rol == self.Rol.COCINERO

    @property
    def es_despacho(self):
        return self.rol == self.Rol.DESPACHADOR

    @property
    def es_administrador(self):
        return self.rol == self.Rol.ADMINISTRADOR
