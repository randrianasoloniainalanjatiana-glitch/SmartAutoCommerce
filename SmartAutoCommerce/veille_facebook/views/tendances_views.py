"""
Views Tendances — Fréquence, lancements récents, produits émergents.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..services.tendances_service import TendancesService


class TendancesFrequenceView(APIView):
    """GET /api/veille-facebook/tendances/frequence/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = TendancesService.get_frequence_publication(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur TendancesFrequenceView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TendancesLancementsView(APIView):
    """GET /api/veille-facebook/tendances/lancements/?jours=30"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            jours = request.GET.get("jours", 30)
            data = TendancesService.get_lancements_recents(jours=jours, user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur TendancesLancementsView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TendancesEmergantsView(APIView):
    """GET /api/veille-facebook/tendances/emergents/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = TendancesService.get_produits_emergents(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur TendancesEmergantsView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
