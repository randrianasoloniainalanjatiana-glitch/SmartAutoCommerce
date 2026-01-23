from django.urls import path
from .views import SupabaseDataView, SupabaseDataDetailView, SupabaseClient

urlpatterns = [
    # Route pour la liste et l'ajout
    path('data/', SupabaseDataView.as_view(), name='data-list'),
    
    # Route pour les actions sur un ID précis
    path('data/<int:pk>/', SupabaseDataDetailView.as_view(), name='data-detail'),
    # Modification lanja
    path('client/', SupabaseClient.as_view(), name= 'client-detail' )
]