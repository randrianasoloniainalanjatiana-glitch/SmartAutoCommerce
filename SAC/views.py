from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .supabase_client import supabase

class SupabaseDataView(APIView):
    # GET : Liste tous les produits
    def get(self, request):
        response = supabase.table('products').select("*").order('created_at', desc=True).execute()
        return Response(response.data)

    # POST : Insère un produit
    def post(self, request):
        data = request.data
        response = supabase.table('products').insert(data).execute()
        return Response(response.data, status=status.HTTP_201_CREATED)

class SupabaseDataDetailView(APIView):
    """Vue pour gérer UN produit spécifique (Modif / Suppr)"""

    # PUT : Modifier un produit
    def put(self, request, pk):
        data = request.data
        # On met à jour dans Supabase où l'id correspond au pk
        response = supabase.table('products').update(data).eq('id', pk).execute()
        return Response(response.data)

    # DELETE : Supprimer un produit
    def delete(self, request, pk):
        try:
            supabase.table('products').delete().eq('id', pk).execute()
            return Response({"message": "Supprimé avec succès"}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        # Modification lanja
class SupabaseClient(APIView):
     def get(self, request):
        response = supabase.table('client').select("*").order('created_at', desc=True).execute()
        print(response.data)
        return Response(response.data)