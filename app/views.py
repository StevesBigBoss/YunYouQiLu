from django.shortcuts import render, HttpResponse, redirect
from app.models import User, TiktokUser, Video, VideoComment
import time,json
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage, InvalidPage
from django.conf import settings
# Create your views here.


# ==================== 页面：登录页 ====================
# 登录页 /login_user/ → login_user.html：POST校验用户名密码，成功写signed cookie并跳转/home/
def login_user(request):
    if request.method == "POST":
        name = request.POST.get("name")
        password = request.POST.get("password")
        # 密码已哈希存储：按用户名取回后调用 check_password 校验（兼容旧明文并自动升级）
        user_obj = User.objects.filter(name=name).first()
        if user_obj is not None and user_obj.check_password(password):
            response = redirect("http://localhost:5173/")
            response.set_signed_cookie("name", name)
            request.session['islogin'] = True
            return response
    return render(request, "login_user.html")

# ==================== 页面：注册页 ====================
# 注册页 /reg_user/ → reg_user.html：POST创建新用户，成功后跳转登录页
def reg_user(request):
    if request.method == "POST":
        name = request.POST.get("name")
        password = request.POST.get("password")

        obj = User.create(name, password)
        obj.save()
        time.sleep(0.5)
        return redirect("/login_user/")
    print("注册界面")
    return render(request, "reg_user.html")


# ==================== 页面：退出登录（登录页） ====================
# /logout_user/：清除cookie并跳转回 /login_user/
def logout_user(request):
    response = redirect("/login_user/")
    response.set_signed_cookie("content", "123")
    return response


# ==================== 页面：主页大屏右上角「用户中心」- 修改密码 ====================
# /change_password/：POST校验旧密码→更新新密码（home.html弹窗调用）
def change_password(request):
    if request.method == "POST":
        name = request.get_signed_cookie("name")
        old_password = request.POST.get("old_password")
        new_password = request.POST.get("new_password")
        confirm_password = request.POST.get("confirm_password")
        # 校验旧密码（哈希校验，兼容旧明文并自动升级）
        user_obj = User.objects.filter(name=name).first()
        if user_obj is None or not user_obj.check_password(old_password):
            return HttpResponse("旧密码不正确")
        if not new_password or len(new_password) < 6:
            return HttpResponse("新密码长度不能少于6位")
        if new_password != confirm_password:
            return HttpResponse("两次输入的新密码不一致")
        user_obj.set_password(new_password)
        return HttpResponse("修改成功")
    return HttpResponse("请使用POST方式提交")
