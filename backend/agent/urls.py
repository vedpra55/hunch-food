from django.urls import path

from . import views

urlpatterns = [
    path('chat', views.chat),
    path('home', views.home_view),
    path('conversation/reset', views.reset_view),
]
