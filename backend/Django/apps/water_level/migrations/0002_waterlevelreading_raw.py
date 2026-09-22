from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('water_level', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='waterlevelreading',
            name='raw',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]