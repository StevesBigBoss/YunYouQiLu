"""tiktok_blogger_web URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views. Home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, re_path
from django.views.generic import RedirectView

from app import views

urlpatterns = [
    path('admin/', admin.site.urls),
    # 根路径与旧 /home/ 地址 → 重定向到新 Vue 前端平台
    path('', RedirectView.as_view(url='http://localhost:5173/')),
    path('home/', RedirectView.as_view(url='http://localhost:5173/')),
    # 用户
    path('login_user/', views.login_user),
    path('reg_user/', views.reg_user),
                                                
    # 这些已经是正确的 path() 形式
                path('logout_user/', views.logout_user),
    path('change_password/', views.change_password),

    # 舆论监控仪表板
                
]

# 设置登录页
admin.site.site_title = '抖音博主数据分析系统后台'
admin.site.site_header = '抖音博主数据分析系统后台'
