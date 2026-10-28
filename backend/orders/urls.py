from django.urls import path

from . import views

urlpatterns = [
    path('cart', views.cart),
    path('checkout', views.checkout),
    path('orders/<uuid:order_id>', views.order),
    path('orders/<uuid:order_id>/pay', views.pay),
    path('orders/<uuid:order_id>/cancel', views.cancel),
    path('orders/<uuid:order_id>/rate', views.rate),
    path('webhooks/dodo', views.dodo_webhook),
]
