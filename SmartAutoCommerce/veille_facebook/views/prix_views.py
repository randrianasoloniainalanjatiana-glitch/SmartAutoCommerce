"""
Views Prix — Grille de prix et fourchette marché.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..services.prix_service import PrixService


class PrixGrilleView(APIView):
    """GET /api/veille-facebook/prix/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = PrixService.get_grille_prix(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur PrixGrilleView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PrixFourchetteView(APIView):
    """GET /api/veille-facebook/prix/<str:categorie>/"""

    def get(self, request, categorie):
        try:
            user_id = request.GET.get("user_id")
            data = PrixService.get_fourchette_marche(categorie, user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur PrixFourchetteView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
