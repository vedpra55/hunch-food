from django.urls import path

from . import views

urlpatterns = [
    path('restaurants/<slug:slug>', views.menu),
    path('search', views.search),
]
