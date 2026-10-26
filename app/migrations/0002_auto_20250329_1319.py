from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0001_initial'),
    ]

    operations = [
        migrations.RenameField(
            model_name='user',
            old_name='username',
            new_name='name',
        ),
        migrations.RemoveField(
            model_name='user',
            name='address',
        ),
        migrations.RemoveField(
            model_name='user',
            name='avatar',
        ),
        migrations.RemoveField(
            model_name='user',
            name='createTime',
        ),
        migrations.RemoveField(
            model_name='user',
            name='sex',
        ),
        migrations.RemoveField(
            model_name='user',
            name='textarea',
        ),
    ]
