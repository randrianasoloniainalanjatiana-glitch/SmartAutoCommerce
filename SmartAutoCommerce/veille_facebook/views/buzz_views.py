"""
Views Buzz — Top produits par engagement et KPIs globaux.
Suit le pattern class-based APIView du projet (SAC/views.py).
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from ..services.buzz_service import BuzzService


class BuzzListView(APIView):
    """GET /api/veille-facebook/buzz/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            limit = request.GET.get("limit", 20)
            concurrent = request.GET.get("concurrent")
            categorie = request.GET.get("categorie")
            priority_status = request.GET.get("status")

            data = BuzzService.get_top_buzz(
                limit=limit,
                concurrent=concurrent,
                categorie=categorie,
                status=priority_status,
                user_id=user_id,
            )
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur BuzzListView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BuzzStatsView(APIView):
    """GET /api/veille-facebook/buzz/stats/"""

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            data = BuzzService.get_stats_globales(user_id=user_id)
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur BuzzStatsView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
