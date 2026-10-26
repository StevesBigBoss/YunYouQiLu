from django.contrib import admin
from django.urls import path, re_path
from django.views.generic import RedirectView

from app import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', RedirectView.as_view(url='http://localhost:5173/')),
    path('home/', RedirectView.as_view(url='http://localhost:5173/')),
    path('login_user/', views.login_user),
    path('reg_user/', views.reg_user),

                path('logout_user/', views.logout_user),
    path('change_password/', views.change_password),


]

admin.site.site_title = '抖音博主数据分析系统后台'
admin.site.site_header = '抖音博主数据分析系统后台'
