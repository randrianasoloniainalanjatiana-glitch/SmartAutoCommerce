from django.urls import path
from .views import (
    SupabaseDataView,
    SupabaseDataDetailView,
    SupabaseClient,
    SupabaseCommande,
    SupabaseCommandeDetail,
    RegisterView,
    LoginView,
    VerifyCodeView,
    ResendCodeView,
    ForgotPasswordView,
    ResetPasswordView,
    ParametresByUserView,
    UpdateProfileView,
    ChangePasswordView,
    VerifyPasswordView,
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
    path('auth/verify-code/', VerifyCodeView.as_view(), name='auth-verify-code'),
    path('auth/resend-code/', ResendCodeView.as_view(), name='auth-resend-code'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('auth/update/<str:user_id>/', UpdateProfileView.as_view(), name='auth-update'),
    path('auth/change-password/<str:user_id>/', ChangePasswordView.as_view(), name='auth-change-password'),

    # Vérification de mot de passe
    path('verify-password/', VerifyPasswordView.as_view(), name='verify-password'),

    # Modification lanja
    path('client/', SupabaseClient.as_view(), name='client-detail'),
    path('commandes/', SupabaseCommande.as_view(), name='commande-list'),
    path('commandes/<int:commande_id>/', SupabaseCommandeDetail.as_view(), name='commande-detail'),
]