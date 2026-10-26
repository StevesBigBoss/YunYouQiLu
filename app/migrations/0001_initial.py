from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='TiktokUser',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, verbose_name='id')),
                ('nkname', models.CharField(default='', max_length=255, verbose_name='用户昵称')),
                ('gender', models.CharField(default='', max_length=255, verbose_name='性别')),
                ('age', models.CharField(default='', max_length=255, verbose_name='年龄')),
                ('category', models.CharField(default='', max_length=255, verbose_name='博主分类')),
                ('like_count', models.CharField(default='', max_length=255, verbose_name='点赞数')),
                ('province', models.CharField(default='', max_length=255, verbose_name='省份')),
                ('follow_count', models.CharField(default='', max_length=255, verbose_name='关注数')),
                ('fans_count', models.CharField(default='', max_length=255, verbose_name='粉丝数')),
                ('received_likes', models.CharField(default='', max_length=255, verbose_name='获赞')),
                ('is_vip', models.CharField(default='', max_length=255, verbose_name='是否付费用户')),
                ('commentsLen', models.CharField(default='', max_length=255, verbose_name='评论个数')),
                ('detailIntro', models.CharField(default='', max_length=2555, verbose_name='详情介绍')),
                ('comments', models.TextField(default='', verbose_name='用户评论')),
                ('createTime', models.DateField(auto_now_add=True, verbose_name='爬取时间')),
            ],
            options={
                'verbose_name': '抖音用户表',
                'verbose_name_plural': '抖音用户表',
                'db_table': 'TiktokUser',
                'managed': True,
            },
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False, verbose_name='id')),
                ('username', models.CharField(default='', max_length=255, verbose_name='用户名')),
                ('password', models.CharField(default='', max_length=255, verbose_name='密码')),
                ('sex', models.CharField(default='', max_length=255, verbose_name='性别')),
                ('address', models.CharField(default='', max_length=255, verbose_name='地址')),
                ('avatar', models.FileField(default='avatar/default.png', upload_to='avatar', verbose_name='头像')),
                ('textarea', models.CharField(default='这个人很懒，什么有没留下。', max_length=255, verbose_name='个人简介')),
                ('createTime', models.DateField(auto_now_add=True, verbose_name='创建时间')),
            ],
            options={
                'verbose_name': '用户表',
                'verbose_name_plural': '用户表',
                'db_table': 'app_user',
            },
        ),
    ]
