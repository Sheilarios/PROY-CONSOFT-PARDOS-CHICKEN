from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pedidos", "0005_pedido_estado_cancelado"),
    ]

    operations = [
        migrations.AlterField(
            model_name="incidencia",
            name="tipo",
            field=models.CharField(
                choices=[
                    ("DEMORA", "Demora"),
                    ("CANCELACION", "Cancelación"),
                    ("ERROR", "Error en el pedido"),
                    ("DEVOLUCION", "Devolución"),
                    ("ERROR_PRODUCTOS", "Producto o cantidad incorrectos"),
                    ("ERROR_MODALIDAD", "Modalidad de entrega incorrecta"),
                    ("ERROR_CLIENTE", "Datos del cliente incorrectos"),
                ],
                max_length=20,
            ),
        ),
    ]
