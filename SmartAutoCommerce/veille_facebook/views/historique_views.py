"""
Views Historique — Comparaisons de prix utilisateur vs concurrent.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..services.historique_service import HistoriqueService


class HistoriqueComparaisonsView(APIView):
    """GET /api/veille-facebook/historique/comparaisons/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = HistoriqueService.get_comparaisons(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur HistoriqueComparaisonsView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
