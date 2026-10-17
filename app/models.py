from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class TiktokUser(models.Model):
    objects = None
    nkname = models.CharField('用户昵称',max_length=255,default='') #level
    gender = models.CharField('性别',max_length=255,default='') #level
    age = models.CharField('年龄',max_length=255,default='') #level
    category = models.CharField('博主分类',max_length=255,default='') #level
    like_count = models.CharField('点赞数',max_length=255,default='')  #discount
    province = models.CharField('省份',max_length=255,default='')
    follow_count = models.CharField('关注数',max_length=255,default='') #score
    fans_count = models.CharField('粉丝数',max_length=255,default='') #price
    received_likes = models.CharField('获赞',max_length=255,default='') #price
    is_vip = models.CharField('是否付费用户',max_length=255,default='') #price
    commentsLen = models.CharField('评论个数',max_length=255,default='') #commentsLen
    detailIntro = models.CharField('详情介绍',max_length=2555,default='')

    class Meta:
        managed = True
        db_table = "TiktokUser"
        verbose_name_plural = verbose_name = '抖音用户表'    #设置后台显示的名称

    def __str__(self):
        return self.nkname                       #显示该表的字段


class Video(models.Model):
    objects = None
    aweme_id = models.CharField('视频ID', max_length=255, unique=True)
    title = models.CharField('视频标题', max_length=500)
    cover_url = models.CharField('封面链接', max_length=500, default='')
    category = models.CharField('分类', max_length=100, default='')
    author = models.CharField('作者', max_length=255, default='')
    author_gender = models.CharField('作者性别', max_length=10, default='')
    author_province = models.CharField('作者省份', max_length=50, default='')
    likes = models.IntegerField('点赞数', default=0)
    comments_count = models.IntegerField('评论数', default=0)
    shares = models.IntegerField('分享数', default=0)
    publish_time = models.CharField('发布时间', max_length=50, default='')

    class Meta:
        managed = True
        db_table = "Video"
        verbose_name_plural = verbose_name = '黄河治理视频表'

    def __str__(self):
        return self.title


class VideoComment(models.Model):
    objects = None
    video = models.ForeignKey(Video, on_delete=models.CASCADE, related_name='comments')
    user_name = models.CharField('评论用户', max_length=255, default='')
    gender = models.CharField('性别', max_length=10, default='')
    province = models.CharField('省份', max_length=50, default='')
    content = models.TextField('评论内容', default='')
    likes = models.IntegerField('评论点赞', default=0)
    publish_time = models.CharField('评论时间', max_length=50, default='')

    class Meta:
        managed = True
        db_table = "VideoComment"
        verbose_name_plural = verbose_name = '视频评论表'

    def __str__(self):
        return self.user_name


class User(models.Model):
    objects = None
    id = models.AutoField('id',primary_key=True)
    name = models.CharField('用户名',max_length=255,default='')
    # 存储的是 make_password 生成的哈希（PBKDF2），不再保存明文密码
    password = models.CharField('密码',max_length=255,default='')

    @classmethod
    def create(cls, name, password):
        # 注册时即存储哈希
        return cls(name=name, password=make_password(password))

    def set_password(self, raw_password):
        """更新密码为哈希形式并落库"""
        self.password = make_password(raw_password)
        self.save()

    def check_password(self, raw_password):
        """校验明文密码；兼容旧明文数据：匹配后自动升级为哈希存储"""
        if check_password(raw_password, self.password):
            return True
        # 兼容历史明文：若数据库中存的是明文且与输入一致，则升级为哈希
        if self.password == raw_password:
            self.set_password(raw_password)
            return True
        return False

    class Meta:
        db_table = "app_user"
        verbose_name_plural = verbose_name = '用户表'  # 设置后台显示的名称

    def __str__(self):
        return self.name  # 显示该表的字段

