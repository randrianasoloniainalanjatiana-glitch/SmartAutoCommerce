from django.urls import path
from veille_facebook.views.historique_views import HistoriqueComparaisonsView
from .views import (
    SupabaseDataView,
    SupabaseDataDetailView,
    SupabaseClient,
    SupabaseCommande,
    SupabaseCommandeDetail,
    RegisterView,
    LoginView,
    LivreurLoginView,
    VerifyCodeView,
    ResendCodeView,
    ForgotPasswordView,
    ResetPasswordView,
    ParametresByUserView,
    UpdateProfileView,
    ChangePasswordView,
    VerifyPasswordView,
    VerifyLivreurPasswordView,
    SubscriptionStartFreeTrialView,
    PayPalCreateOrderView,
    PayPalCaptureOrderView,
    SubscriptionStatusView,
    StripeCreateIntentView,
    StripeCapturePaymentView,
    LivreurListCreateByUserView,
    LivreurDetailByUserView,
    LivreurMeView,
    LivreurCommandesEnCoursView,
    LivreurCommandesHistoriqueView,
    LivreurCommandeStatusView,
    LivreurCommandeDetailView,
    LivreurCommandesDisponiblesView,
    LivreurCommandeDisponibleDetailView,
    LivreurCommandePrendreView,
    ConversationsByUserView,
    ContactsReponseAutoView,
    PublicationsDashboardView,
    NotificationsView,
    NotificationReadView,
)

urlpatterns = [
    # Route pour la liste et l'ajout
    path('data/', SupabaseDataView.as_view(), name='data-list'),
    
    # Route pour les actions sur un ID précis
    path('data/<str:pk>/', SupabaseDataDetailView.as_view(), name='data-detail'),

    # Paramètres de boutique
    path('parametres/<uuid:user_id>/', ParametresByUserView.as_view(), name='parametres-by-user'),

    # Authentification
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/login-livreur/', LivreurLoginView.as_view(), name='auth-login-livreur'),
    path('auth/verify-code/', VerifyCodeView.as_view(), name='auth-verify-code'),
    path('auth/resend-code/', ResendCodeView.as_view(), name='auth-resend-code'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('auth/update/<str:user_id>/', UpdateProfileView.as_view(), name='auth-update'),
    path('auth/change-password/<str:user_id>/', ChangePasswordView.as_view(), name='auth-change-password'),

    # Vérification de mot de passe
    path('verify-password/', VerifyPasswordView.as_view(), name='verify-password'),
    path('verify-password-livreur/', VerifyLivreurPasswordView.as_view(), name='verify-password-livreur'),

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

    # Livreurs (multi) par utilisateur
    path('livreurs/<uuid:user_id>/', LivreurListCreateByUserView.as_view(), name='livreurs-list-create'),
    path('livreurs/<uuid:user_id>/<uuid:livreur_id>/', LivreurDetailByUserView.as_view(), name='livreurs-detail'),

    # Espace livreur (compte utilisateur lié au livreur)
    path('livreur/me/<uuid:user_id>/', LivreurMeView.as_view(), name='livreur-me'),
    path('livreur/commandes/en-cours/<uuid:user_id>/', LivreurCommandesEnCoursView.as_view(), name='livreur-commandes-en-cours'),
    path('livreur/commandes/historique/<uuid:user_id>/', LivreurCommandesHistoriqueView.as_view(), name='livreur-commandes-historique'),
    path('livreur/commandes/detail/<uuid:user_id>/<int:commande_id>/', LivreurCommandeDetailView.as_view(), name='livreur-commande-detail'),
    path('livreur/commandes/<uuid:user_id>/<int:commande_id>/', LivreurCommandeStatusView.as_view(), name='livreur-commande-status'),
    path('livreur/commandes/disponibles/<uuid:user_id>/', LivreurCommandesDisponiblesView.as_view(), name='livreur-commandes-disponibles'),
    path('livreur/commandes/disponibles/detail/<uuid:user_id>/<int:commande_id>/', LivreurCommandeDisponibleDetailView.as_view(), name='livreur-commande-disponible-detail'),
    path('livreur/commandes/prendre/<uuid:user_id>/<int:commande_id>/', LivreurCommandePrendreView.as_view(), name='livreur-commande-prendre'),

    # Conversations (Messenger)
    path('conversations/<uuid:user_id>/', ConversationsByUserView.as_view(), name='conversations-by-user'),

    # Réponse auto (Contacts)
    path('contacts/reponse-auto/<uuid:user_id>/<str:id_contact>/', ContactsReponseAutoView.as_view(), name='contacts-reponse-auto'),
    path('publications/<uuid:user_id>/dashboard/', PublicationsDashboardView.as_view(), name='publications-dashboard'),
    path('notifications/', NotificationsView.as_view(), name='notifications-list-create'),
    path('notifications/<uuid:notification_id>/read/', NotificationReadView.as_view(), name='notification-read'),

    # Veille Facebook — historique comparaisons de prix
    path('veille-facebook/historique/comparaisons/', HistoriqueComparaisonsView.as_view(), name='veille-fb-historique-comparaisons'),
]