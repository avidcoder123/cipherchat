# Generated by Django 3.1.1 on 2020-12-24 19:52

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('capstone', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='message',
            name='receiver',
        ),
        migrations.CreateModel(
            name='RoomKey',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.CharField(max_length=1024)),
                ('roomdata', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roomdata', to='capstone.room')),
                ('userperm', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='userperm', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
