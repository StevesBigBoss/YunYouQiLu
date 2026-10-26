from django.shortcuts import render, HttpResponse, redirect
from app.models import User, TiktokUser, Video, VideoComment
import time,json
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage, InvalidPage
from django.conf import settings


def login_user(request):
    if request.method == "POST":
        name = request.POST.get("name")
        password = request.POST.get("password")
        user_obj = User.objects.filter(name=name).first()
        if user_obj is not None and user_obj.check_password(password):
            response = redirect("http://localhost:5173/")
            response.set_signed_cookie("name", name)
            request.session['islogin'] = True
            return response
    return render(request, "login_user.html")

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


def logout_user(request):
    response = redirect("/login_user/")
    response.set_signed_cookie("content", "123")
    return response


def change_password(request):
    if request.method == "POST":
        name = request.get_signed_cookie("name")
        old_password = request.POST.get("old_password")
        new_password = request.POST.get("new_password")
        confirm_password = request.POST.get("confirm_password")
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
