from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0004_auto_20250329_1323'),
    ]

    operations = [
        migrations.CreateModel(
            name='Video',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('aweme_id', models.CharField(max_length=255, unique=True, verbose_name='视频ID')),
                ('title', models.CharField(max_length=500, verbose_name='视频标题')),
                ('cover_url', models.CharField(default='', max_length=500, verbose_name='封面链接')),
                ('category', models.CharField(default='', max_length=100, verbose_name='分类')),
                ('author', models.CharField(default='', max_length=255, verbose_name='作者')),
                ('author_gender', models.CharField(default='', max_length=10, verbose_name='作者性别')),
                ('author_province', models.CharField(default='', max_length=50, verbose_name='作者省份')),
                ('likes', models.IntegerField(default=0, verbose_name='点赞数')),
                ('comments_count', models.IntegerField(default=0, verbose_name='评论数')),
                ('shares', models.IntegerField(default=0, verbose_name='分享数')),
                ('publish_time', models.CharField(default='', max_length=50, verbose_name='发布时间')),
            ],
            options={
                'verbose_name': '黄河治理视频表',
                'verbose_name_plural': '黄河治理视频表',
                'db_table': 'Video',
                'managed': True,
            },
        ),
        migrations.CreateModel(
            name='VideoComment',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_name', models.CharField(default='', max_length=255, verbose_name='评论用户')),
                ('gender', models.CharField(default='', max_length=10, verbose_name='性别')),
                ('province', models.CharField(default='', max_length=50, verbose_name='省份')),
                ('content', models.TextField(default='', verbose_name='评论内容')),
                ('likes', models.IntegerField(default=0, verbose_name='评论点赞')),
                ('publish_time', models.CharField(default='', max_length=50, verbose_name='评论时间')),
                ('video', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='comments', to='app.video')),
            ],
            options={
                'verbose_name': '视频评论表',
                'verbose_name_plural': '视频评论表',
                'db_table': 'VideoComment',
                'managed': True,
            },
        ),
    ]
