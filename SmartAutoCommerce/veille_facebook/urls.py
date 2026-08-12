"""
URLs du module veille_facebook.
Respecte le même pattern que SAC/urls.py (class-based views .as_view()).
"""

from django.urls import path

from .views.buzz_views import BuzzListView, BuzzStatsView
from .views.prix_views import PrixGrilleView, PrixFourchetteView
from .views.engagement_views import (
    EngagementConcurrentsView,
    EngagementCategoriesView,
    EngagementPrixView,
)
from .views.tendances_views import (
    TendancesFrequenceView,
    TendancesLancementsView,
    TendancesEmergantsView,
)
from .views.catalogue_views import (
    CatalogueOpportunitesView,
    CatalogueStarsView,
    CatalogueEviterView,
)
from .views.historique_views import HistoriqueComparaisonsView

urlpatterns = [
    # Buzz
    path('buzz/', BuzzListView.as_view(), name='veille-fb-buzz'),
    path('buzz/stats/', BuzzStatsView.as_view(), name='veille-fb-buzz-stats'),

    # Prix
    path('prix/', PrixGrilleView.as_view(), name='veille-fb-prix'),
    path('prix/<str:categorie>/', PrixFourchetteView.as_view(), name='veille-fb-prix-fourchette'),

    # Engagement
    path('engagement/concurrents/', EngagementConcurrentsView.as_view(), name='veille-fb-engagement-concurrents'),
    path('engagement/categories/', EngagementCategoriesView.as_view(), name='veille-fb-engagement-categories'),
    path('engagement/prix/', EngagementPrixView.as_view(), name='veille-fb-engagement-prix'),

    # Tendances
    path('tendances/frequence/', TendancesFrequenceView.as_view(), name='veille-fb-tendances-frequence'),
    path('tendances/lancements/', TendancesLancementsView.as_view(), name='veille-fb-tendances-lancements'),
    path('tendances/emergents/', TendancesEmergantsView.as_view(), name='veille-fb-tendances-emergents'),

    # Catalogue
    path('catalogue/opportunites/', CatalogueOpportunitesView.as_view(), name='veille-fb-catalogue-opportunites'),
    path('catalogue/stars/', CatalogueStarsView.as_view(), name='veille-fb-catalogue-stars'),
    path('catalogue/eviter/', CatalogueEviterView.as_view(), name='veille-fb-catalogue-eviter'),

    # Historique comparaisons de prix
    path('historique/comparaisons/', HistoriqueComparaisonsView.as_view(), name='veille-fb-historique-comparaisons'),
]
