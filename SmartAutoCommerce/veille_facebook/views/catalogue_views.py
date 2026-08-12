"""
Views Catalogue — Opportunités, produits stars, catégories à éviter.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..services.catalogue_service import CatalogueService


class CatalogueOpportunitesView(APIView):
    """GET /api/veille-facebook/catalogue/opportunites/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = CatalogueService.get_opportunites_sourcing(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur CatalogueOpportunitesView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CatalogueStarsView(APIView):
    """GET /api/veille-facebook/catalogue/stars/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = CatalogueService.get_produits_stars(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur CatalogueStarsView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CatalogueEviterView(APIView):
    """GET /api/veille-facebook/catalogue/eviter/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = CatalogueService.get_produits_a_eviter(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur CatalogueEviterView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
