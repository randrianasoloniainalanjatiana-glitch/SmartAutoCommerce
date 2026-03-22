import hashlib
from datetime import datetime, timedelta, timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .supabase_client import supabase
from .email_utils import generate_code, send_confirmation_email
from .stripe_service import create_payment_intent, retrieve_payment_intent


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _expiry_iso(minutes=10):
    return (datetime.now(timezone.utc) + timedelta(minutes=minutes)).isoformat()


def _update_code_fields(email, code, code_type):
    """Met à jour les champs de code de confirmation pour un utilisateur."""
    supabase.table('utilisateurs').update({
        "code_confirmation": code,
        "code_type": code_type,
        "code_envoye_le": _now_iso(),
        "code_expire_le": _expiry_iso(10),
        "tentatives_code": 0,
    }).eq('email', email).execute()


class VerifyPasswordView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {"error": "Email et mot de passe requis"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Récupérer l'utilisateur depuis Supabase
            response = supabase.table('utilisateurs').select('*').eq('email', email).execute()
            
            if not response.data:
                return Response(
                    {"valid": False, "error": "Utilisateur non trouvé"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            user = response.data[0]
            hashed_password = _hash_password(password)
            
            # Vérifier le mot de passe
            if user.get('mot_de_passe') == hashed_password:
                return Response({"valid": True}, status=status.HTTP_200_OK)
            else:
                return Response({"valid": False}, status=status.HTTP_200_OK)
                
        except Exception as e:
            print(f"Erreur vérification mot de passe: {e}")
            return Response(
                {"valid": False, "error": "Erreur serveur"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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


# ─────────────────────────────────────────────────────────────
#  INSCRIPTION : étape 1 — créer le compte + envoyer le code
# ─────────────────────────────────────────────────────────────
class RegisterView(APIView):
    def post(self, request):
        try:
            payload = request.data
            email = payload.get('email')
            mot_de_passe = payload.get('mot_de_passe')

            if not email or not mot_de_passe:
                return Response({"error": "email et mot_de_passe sont requis"}, status=status.HTTP_400_BAD_REQUEST)

            existing = supabase.table('utilisateurs').select("*").eq('email', email).limit(1).execute()
            if existing.data:
                user = existing.data[0]
                # Si le compte existe mais n'est pas vérifié, on renvoie un code
                if not user.get('email_verifie'):
                    code = generate_code()
                    _update_code_fields(email, code, "inscription")
                    send_confirmation_email(email, code, 'inscription')
                    return Response({
                        "message": "Un code de confirmation a été envoyé à votre adresse email.",
                        "email": email,
                        "requires_verification": True
                    }, status=status.HTTP_200_OK)
                return Response({"error": "Un compte avec cet email existe déjà."}, status=status.HTTP_409_CONFLICT)

            code = generate_code()

            data_to_insert = {
                "email": email,
                "mot_de_passe": _hash_password(mot_de_passe),
                "nom": payload.get('nom'),
                "prenom": payload.get('prenom'),
                "telephone": payload.get('telephone'),
                "adresse": payload.get('adresse'),
                "email_verifie": False,
                "code_confirmation": code,
                "code_type": "inscription",
                "code_envoye_le": _now_iso(),
                "code_expire_le": _expiry_iso(10),
                "tentatives_code": 0,
            }

            response = supabase.table('utilisateurs').insert(data_to_insert).execute()

            # Envoyer l'email
            send_confirmation_email(email, code, 'inscription')

            return Response({
                "message": "Inscription réussie ! Un code de confirmation a été envoyé à votre adresse email.",
                "email": email,
                "requires_verification": True
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"ERREUR RegisterView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  INSCRIPTION : étape 2 — vérifier le code
# ─────────────────────────────────────────────────────────────
class VerifyCodeView(APIView):
    def post(self, request):
        try:
            email = request.data.get('email')
            code = request.data.get('code')

            if not email or not code:
                return Response({"error": "email et code sont requis."}, status=status.HTTP_400_BAD_REQUEST)

            resp = supabase.table('utilisateurs').select("*").eq('email', email).limit(1).execute()
            user = (resp.data or [None])[0]
            if not user:
                return Response({"error": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

            if user.get('email_verifie'):
                return Response({"message": "Email déjà vérifié."}, status=status.HTTP_200_OK)

            # Vérifier le nombre de tentatives
            if (user.get('tentatives_code') or 0) >= 5:
                return Response({"error": "Trop de tentatives. Veuillez demander un nouveau code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Vérifier l'expiration
            expire_str = user.get('code_expire_le')
            if expire_str:
                expire_dt = datetime.fromisoformat(expire_str.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expire_dt:
                    return Response({"error": "Le code a expiré. Veuillez demander un nouveau code."}, status=status.HTTP_410_GONE)

            # Vérifier le code
            stored_code = (user.get('code_confirmation') or '').strip()
            if stored_code != code.strip():
                supabase.table('utilisateurs').update({
                    "tentatives_code": (user.get('tentatives_code') or 0) + 1
                }).eq('email', email).execute()
                remaining = 5 - ((user.get('tentatives_code') or 0) + 1)
                return Response({
                    "error": f"Code incorrect. {remaining} tentative(s) restante(s)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Code correct → marquer comme vérifié
            supabase.table('utilisateurs').update({
                "email_verifie": True,
                "code_confirmation": None,
                "code_type": None,
                "tentatives_code": 0,
            }).eq('email', email).execute()

            return Response({"message": "Email vérifié avec succès ! Vous pouvez maintenant vous connecter."}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR VerifyCodeView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  RENVOYER LE CODE
# ─────────────────────────────────────────────────────────────
class ResendCodeView(APIView):
    def post(self, request):
        try:
            email = request.data.get('email')
            code_type = request.data.get('code_type', 'inscription')

            if not email:
                return Response({"error": "email est requis."}, status=status.HTTP_400_BAD_REQUEST)

            resp = supabase.table('utilisateurs').select("*").eq('email', email).limit(1).execute()
            user = (resp.data or [None])[0]
            if not user:
                return Response({"error": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

            # Vérifier le cooldown de 60 secondes
            envoye_str = user.get('code_envoye_le')
            if envoye_str:
                envoye_dt = datetime.fromisoformat(envoye_str.replace('Z', '+00:00'))
                diff = (datetime.now(timezone.utc) - envoye_dt).total_seconds()
                if diff < 60:
                    wait = int(60 - diff)
                    return Response({
                        "error": f"Veuillez patienter {wait} secondes avant de renvoyer un code."
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            code = generate_code()
            _update_code_fields(email, code, code_type)
            send_confirmation_email(email, code, code_type)

            return Response({"message": "Un nouveau code a été envoyé."}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR ResendCodeView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  CONNEXION — vérifie aussi email_verifie
# ─────────────────────────────────────────────────────────────
class LoginView(APIView):
    def post(self, request):
        try:
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

            # Vérifier si l'email est confirmé
            if not user.get('email_verifie'):
                # Renvoyer un code automatiquement
                code = generate_code()
                _update_code_fields(email, code, "inscription")
                send_confirmation_email(email, code, 'inscription')
                return Response({
                    "error": "Votre email n'est pas encore vérifié. Un nouveau code de confirmation a été envoyé.",
                    "requires_verification": True,
                    "email": email
                }, status=status.HTTP_403_FORBIDDEN)

            user.pop('mot_de_passe', None)
            user.pop('code_confirmation', None)
            return Response(user, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR LoginView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  MOT DE PASSE OUBLIÉ — étape 1 : envoyer le code
# ─────────────────────────────────────────────────────────────
class ForgotPasswordView(APIView):
    def post(self, request):
        try:
            email = request.data.get('email')
            if not email:
                return Response({"error": "email est requis."}, status=status.HTTP_400_BAD_REQUEST)

            resp = supabase.table('utilisateurs').select("*").eq('email', email).limit(1).execute()
            user = (resp.data or [None])[0]
            if not user:
                # Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
                return Response({"message": "Si un compte existe avec cet email, un code de réinitialisation a été envoyé."}, status=status.HTTP_200_OK)

            # Vérifier le cooldown
            envoye_str = user.get('code_envoye_le')
            if envoye_str:
                envoye_dt = datetime.fromisoformat(envoye_str.replace('Z', '+00:00'))
                diff = (datetime.now(timezone.utc) - envoye_dt).total_seconds()
                if diff < 60:
                    wait = int(60 - diff)
                    return Response({
                        "error": f"Veuillez patienter {wait} secondes avant de renvoyer un code."
                    }, status=status.HTTP_429_TOO_MANY_REQUESTS)

            code = generate_code()
            _update_code_fields(email, code, "reset")
            send_confirmation_email(email, code, 'reset')

            return Response({"message": "Si un compte existe avec cet email, un code de réinitialisation a été envoyé."}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR ForgotPasswordView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  MOT DE PASSE OUBLIÉ — étape 2 : vérifier + nouveau mdp
# ─────────────────────────────────────────────────────────────
class ResetPasswordView(APIView):
    def post(self, request):
        try:
            email = request.data.get('email')
            code = request.data.get('code')
            new_password = request.data.get('nouveau_mot_de_passe')

            if not email or not code or not new_password:
                return Response({"error": "email, code et nouveau_mot_de_passe sont requis."}, status=status.HTTP_400_BAD_REQUEST)

            if len(new_password) < 6:
                return Response({"error": "Le mot de passe doit contenir au moins 6 caractères."}, status=status.HTTP_400_BAD_REQUEST)

            resp = supabase.table('utilisateurs').select("*").eq('email', email).limit(1).execute()
            user = (resp.data or [None])[0]
            if not user:
                return Response({"error": "Utilisateur non trouvé."}, status=status.HTTP_404_NOT_FOUND)

            # Vérifier le type de code
            if user.get('code_type') != 'reset':
                return Response({"error": "Aucune demande de réinitialisation en cours."}, status=status.HTTP_400_BAD_REQUEST)

            # Vérifier le nombre de tentatives
            if (user.get('tentatives_code') or 0) >= 5:
                return Response({"error": "Trop de tentatives. Veuillez demander un nouveau code."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

            # Vérifier l'expiration
            expire_str = user.get('code_expire_le')
            if expire_str:
                expire_dt = datetime.fromisoformat(expire_str.replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expire_dt:
                    return Response({"error": "Le code a expiré. Veuillez demander un nouveau code."}, status=status.HTTP_410_GONE)

            # Vérifier le code
            stored_code = (user.get('code_confirmation') or '').strip()
            if stored_code != code.strip():
                supabase.table('utilisateurs').update({
                    "tentatives_code": (user.get('tentatives_code') or 0) + 1
                }).eq('email', email).execute()
                remaining = 5 - ((user.get('tentatives_code') or 0) + 1)
                return Response({
                    "error": f"Code incorrect. {remaining} tentative(s) restante(s)."
                }, status=status.HTTP_400_BAD_REQUEST)

            # Code correct → mettre à jour le mot de passe
            supabase.table('utilisateurs').update({
                "mot_de_passe": _hash_password(new_password),
                "code_confirmation": None,
                "code_type": None,
                "tentatives_code": 0,
            }).eq('email', email).execute()

            return Response({"message": "Mot de passe réinitialisé avec succès !"}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR ResetPasswordView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  COMMANDES
# ─────────────────────────────────────────────────────────────
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


# ─────────────────────────────────────────────────────────────
#  ABONNEMENT ET PAIEMENT PAYPAL
# ─────────────────────────────────────────────────────────────
from .paypal_service import create_order, capture_order

class SubscriptionStartFreeTrialView(APIView):
    def post(self, request):
        try:
            user_id = request.data.get('user_id')
            if not user_id:
                return Response({"error": "user_id est requis."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Check if subscription already exists
            resp = supabase.table('abonnements_utilisateurs').select("*").eq('id_utilisateur', user_id).execute()
            if resp.data:
                return Response({"error": "Un abonnement ou essai existe déjà pour cet utilisateur."}, status=status.HTTP_400_BAD_REQUEST)
                
            now = datetime.now(timezone.utc)
            end_trial = now + timedelta(days=10)
            
            data = {
                "id_utilisateur": user_id,
                "type_plan": "essai_gratuit",
                "statut": "actif",
                "essai_utilise": True,
                "debut_essai": now.isoformat(),
                "fin_essai": end_trial.isoformat(),
                "debut_periode_actuelle": now.isoformat(),
                "fin_periode_actuelle": end_trial.isoformat()
            }
            
            res = supabase.table('abonnements_utilisateurs').insert(data).execute()
            return Response(res.data[0], status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PayPalCreateOrderView(APIView):
    def post(self, request):
        try:
            type_plan = request.data.get('type_plan')
            if type_plan == 'mensuel':
                amount = "19.99"
            elif type_plan == 'annuel':
                amount = "199.90"
            else:
                return Response({"error": "type_plan invalide."}, status=status.HTTP_400_BAD_REQUEST)
                
            order = create_order(amount=amount)
            return Response({"order_id": order["id"]}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PayPalCaptureOrderView(APIView):
    def post(self, request):
        try:
            order_id = request.data.get('order_id')
            user_id = request.data.get('user_id')
            type_plan = request.data.get('type_plan')
            
            if not all([order_id, user_id, type_plan]):
                return Response({"error": "order_id, user_id et type_plan sont requis."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Capture with PayPal
            capture_data = capture_order(order_id)
            if capture_data.get('status') != 'COMPLETED':
                return Response({"error": "Le paiement n'a pas pu être validé.", "details": capture_data}, status=status.HTTP_400_BAD_REQUEST)
                
            # Get amount
            amount_value = capture_data['purchase_units'][0]['payments']['captures'][0]['amount']['value']
            currency_code = capture_data['purchase_units'][0]['payments']['captures'][0]['amount']['currency_code']
            
            # Log transaction
            transaction_data = {
                "id_utilisateur": user_id,
                "id_commande_paypal": order_id,
                "montant": float(amount_value),
                "devise": currency_code,
                "type_plan": type_plan,
                "statut": "COMPLETED"
            }
            supabase.table('historique_transactions').insert(transaction_data).execute()
            
            # Update subscription
            now = datetime.now(timezone.utc)
            days = 30 if type_plan == 'mensuel' else 365
            end_period = now + timedelta(days=days)
            
            sub_resp = supabase.table('abonnements_utilisateurs').select("*").eq('id_utilisateur', user_id).execute()
            if sub_resp.data:
                sub_id = sub_resp.data[0]['id']
                update_data = {
                    "type_plan": type_plan,
                    "statut": "actif",
                    "debut_periode_actuelle": now.isoformat(),
                    "fin_periode_actuelle": end_period.isoformat(),
                    "mis_a_jour_le": now.isoformat()
                }
                supabase.table('abonnements_utilisateurs').update(update_data).eq('id', sub_id).execute()
            else:
                insert_data = {
                    "id_utilisateur": user_id,
                    "type_plan": type_plan,
                    "statut": "actif",
                    "essai_utilise": False,
                    "debut_periode_actuelle": now.isoformat(),
                    "fin_periode_actuelle": end_period.isoformat()
                }
                supabase.table('abonnements_utilisateurs').insert(insert_data).execute()
                
            return Response({"message": "Paiement validé avec succès."}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StripeCreateIntentView(APIView):
    def post(self, request):
        try:
            type_plan = request.data.get('type_plan')
            if type_plan == 'mensuel':
                amount = 19.99
            elif type_plan == 'annuel':
                amount = 199.90
            else:
                return Response({"error": "type_plan invalide."}, status=status.HTTP_400_BAD_REQUEST)
                
            intent_data = create_payment_intent(amount=amount)
            return Response(intent_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StripeCapturePaymentView(APIView):
    def post(self, request):
        try:
            payment_intent_id = request.data.get('payment_intent_id')
            user_id = request.data.get('user_id')
            type_plan = request.data.get('type_plan')
            
            if not all([payment_intent_id, user_id, type_plan]):
                return Response({"error": "payment_intent_id, user_id et type_plan sont requis."}, status=status.HTTP_400_BAD_REQUEST)
                
            # Verify payment intent status
            intent = retrieve_payment_intent(payment_intent_id)
            if intent.status != 'succeeded':
                return Response({"error": "Le paiement Stripe n'a pas pu être validé.", "details": intent.status}, status=status.HTTP_400_BAD_REQUEST)
                
            amount_value = intent.amount / 100.0
            currency_code = intent.currency.upper()
            
            # Log transaction
            transaction_data = {
                "id_utilisateur": user_id,
                "id_commande_paypal": payment_intent_id,  # Using this column to store the payment intent ID
                "montant": amount_value,
                "devise": currency_code,
                "type_plan": type_plan,
                "statut": "COMPLETED"
            }
            supabase.table('historique_transactions').insert(transaction_data).execute()
            
            # Update subscription
            now = datetime.now(timezone.utc)
            days = 30 if type_plan == 'mensuel' else 365
            end_period = now + timedelta(days=days)
            
            sub_resp = supabase.table('abonnements_utilisateurs').select("*").eq('id_utilisateur', user_id).execute()
            if sub_resp.data:
                sub_id = sub_resp.data[0]['id']
                update_data = {
                    "type_plan": type_plan,
                    "statut": "actif",
                    "debut_periode_actuelle": now.isoformat(),
                    "fin_periode_actuelle": end_period.isoformat(),
                    "mis_a_jour_le": now.isoformat()
                }
                supabase.table('abonnements_utilisateurs').update(update_data).eq('id', sub_id).execute()
            else:
                insert_data = {
                    "id_utilisateur": user_id,
                    "type_plan": type_plan,
                    "statut": "actif",
                    "essai_utilise": False,
                    "debut_periode_actuelle": now.isoformat(),
                    "fin_periode_actuelle": end_period.isoformat()
                }
                supabase.table('abonnements_utilisateurs').insert(insert_data).execute()
                
            return Response({"message": "Paiement validé avec succès."}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SubscriptionStatusView(APIView):
    def get(self, request, user_id):
        try:
            resp = supabase.table('abonnements_utilisateurs').select("*").eq('id_utilisateur', str(user_id)).execute()
            if not resp.data:
                return Response({"status": "no_subscription"}, status=status.HTTP_200_OK)
            
            sub = resp.data[0]
            # Verify if expired
            now = datetime.now(timezone.utc)
            fin_periode = datetime.fromisoformat(sub['fin_periode_actuelle'].replace('Z', '+00:00'))
            if now > fin_periode and sub['statut'] == 'actif':
                sub['statut'] = 'expire'
                supabase.table('abonnements_utilisateurs').update({"statut": "expire"}).eq('id', sub['id']).execute()
                
            # History
            hist = supabase.table('historique_transactions').select("*").eq('id_utilisateur', str(user_id)).order('cree_le', desc=True).execute()
            sub['history'] = hist.data
                
            return Response(sub, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)