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
    SubscriptionStartFreeTrialView,
    PayPalCreateOrderView,
    PayPalCaptureOrderView,
    SubscriptionStatusView,
    StripeCreateIntentView,
    StripeCapturePaymentView,
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

    # Abonnements et Paiements
    path('subscription/start-trial/', SubscriptionStartFreeTrialView.as_view(), name='subscription-start-trial'),
    path('subscription/create-order/', PayPalCreateOrderView.as_view(), name='subscription-create-order'),
    path('subscription/capture-order/', PayPalCaptureOrderView.as_view(), name='subscription-capture-order'),
    path('subscription/create-stripe-intent/', StripeCreateIntentView.as_view(), name='subscription-create-stripe-intent'),
    path('subscription/capture-stripe-payment/', StripeCapturePaymentView.as_view(), name='subscription-capture-stripe-payment'),
    path('subscription/status/<uuid:user_id>/', SubscriptionStatusView.as_view(), name='subscription-status'),
]