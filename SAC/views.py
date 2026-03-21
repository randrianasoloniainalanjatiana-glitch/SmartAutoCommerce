import hashlib

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .supabase_client import supabase


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


class SupabaseDataView(APIView):
    def get(self, request):
        response = supabase.table('products').select("*").order('created_at', desc=True).execute()
        print("=== DEBUG SUPABASE ===")
        if response.data:
            print("Premier produit:", response.data[0])
        return Response(response.data)

    def post(self, request):
        data = request.data
        response = supabase.table('products').insert(data).execute()
        return Response(response.data, status=status.HTTP_201_CREATED)


class SupabaseDataDetailView(APIView):
    def put(self, request, pk):
        data = request.data
        response = supabase.table('products').update(data).eq('id', pk).execute()
        return Response(response.data)

    def delete(self, request, pk):
        try:
            supabase.table('products').delete().eq('id', pk).execute()
            return Response({"message": "Supprimé avec succès"}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SupabaseClient(APIView):
    def get(self, request):
        user_id = request.GET.get('user_id')
        if user_id:
            response = supabase.table('client').select("*").eq('id_utilisateur', user_id).order('created_at', desc=True).execute()
        else:
            response = supabase.table('client').select("*").order('created_at', desc=True).execute()
        print(response.data)
        return Response(response.data)


class RegisterView(APIView):
    def post(self, request):
        payload = request.data
        email = payload.get('email')
        mot_de_passe = payload.get('mot_de_passe')

        if not email or not mot_de_passe:
            return Response({"error": "email et mot_de_passe sont requis"}, status=status.HTTP_400_BAD_REQUEST)

        existing = supabase.table('utilisateurs').select("*").eq('email', email).limit(1).execute()
        if existing.data:
            return Response({"error": "Un compte avec cet email existe déjà."}, status=status.HTTP_409_CONFLICT)

        data_to_insert = {
            "email": email,
            "mot_de_passe": _hash_password(mot_de_passe),
            "nom": payload.get('nom'),
            "prenom": payload.get('prenom'),
            "telephone": payload.get('telephone'),
            "adresse": payload.get('adresse'),
        }

        response = supabase.table('utilisateurs').insert(data_to_insert).execute()
        created = response.data[0] if response.data else {}
        created.pop('mot_de_passe', None)
        return Response(created, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    def post(self, request):
        payload = request.data
        email = payload.get('email')
        mot_de_passe = payload.get('mot_de_passe')

        if not email or not mot_de_passe:
            return Response({"error": "email et mot_de_passe sont requis"}, status=status.HTTP_400_BAD_REQUEST)

        response = supabase.table('utilisateurs').select("*").eq('email', email).limit(1).execute()
        user = (response.data or [None])[0]
        if not user:
            return Response({"error": "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)

        hashed = _hash_password(mot_de_passe)
        if user.get('mot_de_passe') != hashed:
            return Response({"error": "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)

        user.pop('mot_de_passe', None)
        return Response(user, status=status.HTTP_200_OK)


class SupabaseCommande(APIView):
    def get(self, request):
        try:
            response = supabase.table('commandes') \
                .select("*, client(*)") \
                .order('created_at', desc=True) \
                .execute()

            if not response.data:
                return Response([], status=status.HTTP_200_OK)

            flattened_data = []
            for item in response.data:
                client_info = item.pop('client', None)
                if client_info:
                    item.update(client_info)
                flattened_data.append(item)

            return Response(flattened_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur Supabase: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SupabaseCommandeDetail(APIView):
    def get(self, request, commande_id):
        try:
            response = supabase.table('details_commandes') \
                .select("*, products!inner(*)") \
                .eq('id_commande', commande_id) \
                .execute()

            if not response.data:
                return Response([], status=status.HTTP_200_OK)

            return Response(response.data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur détails commande: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ParametresByUserView(APIView):
    """Vue pour gérer les paramètres de boutique par utilisateur"""

    def get(self, request, user_id):
        try:
            response = supabase.table('boutiques') \
                .select("*") \
                .eq('id_utilisateur', str(user_id)) \
                .limit(1) \
                .execute()

            if response.data:
                return Response(response.data[0], status=status.HTTP_200_OK)
            else:
                return Response({'id': None, 'id_utilisateur': str(user_id)}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Erreur GET boutiques: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, user_id):
        try:
            data = dict(request.data)

            # Nettoyer les champs gérés par Supabase
            data.pop('id', None)
            data.pop('created_at', None)
            data.pop('updated_at', None)
            data['id_utilisateur'] = str(user_id)

            print("=== PUT boutiques ===")
            print("data nettoyé:", data)

            existing = supabase.table('boutiques') \
                .select("id") \
                .eq('id_utilisateur', str(user_id)) \
                .limit(1) \
                .execute()

            if existing.data:
                response = supabase.table('boutiques') \
                    .update(data) \
                    .eq('id_utilisateur', str(user_id)) \
                    .execute()
            else:
                response = supabase.table('boutiques') \
                    .insert(data) \
                    .execute()

            return Response(response.data[0] if response.data else data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR PUT boutiques: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UpdateProfileView(APIView):
    def put(self, request, user_id):
        try:
            payload = request.data
            
            data_to_update = {}
            if 'nom' in payload:
                data_to_update['nom'] = payload['nom']
            if 'prenom' in payload:
                data_to_update['prenom'] = payload['prenom']
            if 'telephone' in payload:
                data_to_update['telephone'] = payload['telephone']
            if 'adresse' in payload:
                data_to_update['adresse'] = payload['adresse']
            if 'email' in payload:
                data_to_update['email'] = payload['email']
                
            if not data_to_update:
                return Response({"error": "Aucune donnée à mettre à jour."}, status=status.HTTP_400_BAD_REQUEST)
                
            response = supabase.table('utilisateurs').update(data_to_update).eq('id', str(user_id)).execute()
            
            if response.data:
                updated_user = response.data[0]
                updated_user.pop('mot_de_passe', None)
                return Response(updated_user, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ChangePasswordView(APIView):
    def put(self, request, user_id):
        try:
            payload = request.data
            current_password = payload.get('ancien_mot_de_passe')
            new_password = payload.get('nouveau_mot_de_passe')
            
            if not current_password or not new_password:
                return Response({"error": "L'ancien et le nouveau mot de passe sont requis."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Verification
            response = supabase.table('utilisateurs').select("*").eq('id', str(user_id)).limit(1).execute()
            user = (response.data or [None])[0]
            
            if not user:
                return Response({"error": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)
                
            hashed_current = _hash_password(current_password)
            if user.get('mot_de_passe') != hashed_current:
                return Response({"error": "L'ancien mot de passe est incorrect."}, status=status.HTTP_401_UNAUTHORIZED)
                
            hashed_new = _hash_password(new_password)
            update_response = supabase.table('utilisateurs').update({'mot_de_passe': hashed_new}).eq('id', str(user_id)).execute()
            
            if update_response.data:
                return Response({"message": "Mot de passe modifié avec succès."}, status=status.HTTP_200_OK)
            else:
                return Response({"error": "Échec de la modification du mot de passe."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)