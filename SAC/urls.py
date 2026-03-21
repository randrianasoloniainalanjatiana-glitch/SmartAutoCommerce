from django.urls import path
from .views import (
    SupabaseDataView,
    SupabaseDataDetailView,
    SupabaseClient,
    SupabaseCommande,
    SupabaseCommandeDetail,
    RegisterView,
    LoginView,
    ParametresByUserView,
    UpdateProfileView,
    ChangePasswordView,
)

urlpatterns = [
    # Route pour la liste et l'ajout
    path('data/', SupabaseDataView.as_view(), name='data-list'),
    
    # Route pour les actions sur un ID précis
    path('data/<int:pk>/', SupabaseDataDetailView.as_view(), name='data-detail'),

    # Paramètres de boutique
    path('parametres/<uuid:user_id>/', ParametresByUserView.as_view(), name='parametres-by-user'),

    # Authentification
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/update/<str:user_id>/', UpdateProfileView.as_view(), name='auth-update'),
    path('auth/change-password/<str:user_id>/', ChangePasswordView.as_view(), name='auth-change-password'),

    # Modification lanja
    path('client/', SupabaseClient.as_view(), name='client-detail'),
    path('commandes/', SupabaseCommande.as_view(), name='commande-list'),
    path('commandes/<int:commande_id>/', SupabaseCommandeDetail.as_view(), name='commande-detail'),
]