from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pedidos", "0004_pedido_observaciones"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pedido",
            name="estado",
            field=models.CharField(
                choices=[
                    ("REGISTRADO", "Registrado"),
                    ("EN_COLA", "En cola"),
                    ("EN_PREPARACION", "En preparación"),
                    ("LISTO", "Listo"),
                    ("DESPACHADO", "Despachado"),
                    ("CANCELADO", "Cancelado"),
                ],
                default="REGISTRADO",
                max_length=20,
            ),
        ),
    ]
