"""
Views Engagement — Stats par concurrent, catégorie, corrélation prix/engagement.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..services.engagement_service import EngagementService


class EngagementConcurrentsView(APIView):
    """GET /api/veille-facebook/engagement/concurrents/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = EngagementService.get_stats_par_concurrent(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur EngagementConcurrentsView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EngagementCategoriesView(APIView):
    """GET /api/veille-facebook/engagement/categories/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = EngagementService.get_stats_par_categorie(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur EngagementCategoriesView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EngagementPrixView(APIView):
    """GET /api/veille-facebook/engagement/prix/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = EngagementService.get_correlation_prix_engagement(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur EngagementPrixView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
