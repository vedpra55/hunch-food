from django.urls import path

from . import views

urlpatterns = [
    path('me', views.me),
    path('onboarding', views.onboarding),
    path('areas', views.areas),
    path('addresses', views.add_address),
    path('addresses/<int:address_id>', views.delete_address),
    path('notes', views.add_note),
    path('notes/forget', views.forget_all),
    path('notes/<int:note_id>', views.forget_note),
]
