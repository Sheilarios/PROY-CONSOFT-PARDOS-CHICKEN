#!/usr/bin/env python
"""Utilidad de línea de comandos de Django para el proyecto Pardos Chicken."""
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "No se pudo importar Django. ¿Está instalado y activo tu entorno virtual? "
            "Ejecuta: pip install -r requirements.txt --break-system-packages"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
