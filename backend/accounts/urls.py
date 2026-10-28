from django.urls import path

from . import views

urlpatterns = [
    path('me', views.me),
    path('areas', views.areas),
    path('addresses', views.add_address),
    path('addresses/<int:address_id>', views.delete_address),
    path('memories/forget', views.forget_all),
    path('memories/<str:memory_id>', views.forget_memory),
]
