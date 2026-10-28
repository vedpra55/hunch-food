from django.urls import include, path

urlpatterns = [
    path('api/', include('catalog.urls')),
    path('api/', include('accounts.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('agent.urls')),
]
