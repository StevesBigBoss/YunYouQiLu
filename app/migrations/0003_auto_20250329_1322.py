from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0002_auto_20250329_1319'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='tiktokuser',
            name='comments',
        ),
        migrations.RemoveField(
            model_name='tiktokuser',
            name='createTime',
        ),
    ]
