import hashlib
from datetime import datetime, timedelta, timezone
from collections import defaultdict
import json

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .supabase_client import supabase
from .email_utils import (
    generate_code,
    send_confirmation_email,
    send_livreur_welcome_email,
    generate_temporary_password,
)
from .stripe_service import create_payment_intent, retrieve_payment_intent
from pymongo import MongoClient
from bson import ObjectId


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


class VerifyLivreurPasswordView(APIView):
    """
    Vérifie le mot de passe d'un livreur (table Livreur).
    Utilisé avant validation livraison/paiement.
    """

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user_id = request.data.get('user_id')

        if not email or not password:
            return Response(
                {"valid": False, "error": "Email et mot de passe requis"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            hashed_password = _hash_password(password)

            # Priorité: vérifier le compte exact lié au contexte courant
            if user_id:
                livreur = _get_livreur_by_account(str(user_id))
                if not livreur:
                    return Response({"valid": False, "error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)
                if (livreur.get('email') or '').strip().lower() != str(email).strip().lower():
                    return Response({"valid": False, "error": "Compte livreur invalide pour cet email."}, status=status.HTTP_400_BAD_REQUEST)
                return Response({"valid": livreur.get('mot_de_passe') == hashed_password}, status=status.HTTP_200_OK)

            # Fallback: même email sur plusieurs boutiques -> valider si un compte correspond
            response = supabase.table('Livreur').select('*').eq('email', str(email).strip().lower()).execute()
            livreurs = response.data or []
            if not livreurs:
                return Response({"valid": False, "error": "Livreur non trouvé"}, status=status.HTTP_404_NOT_FOUND)
            is_valid = any((l.get('mot_de_passe') == hashed_password) for l in livreurs)
            return Response({"valid": is_valid}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur vérification mot de passe livreur: {e}")
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
        response = supabase.table('products').update(data).eq('id', str(pk)).execute()
        return Response(response.data)

    def delete(self, request, pk):
        """Suppression physique. Optionnel : ?id_utilisateur= pour vérifier le propriétaire."""
        pk_str = str(pk)
        user_id = request.query_params.get('id_utilisateur')
        try:
            sel = supabase.table('products').select('id', 'id_utilisateur').eq('id', pk_str).limit(1).execute()
            rows = sel.data or []
            if not rows:
                return Response({"error": "Produit introuvable."}, status=status.HTTP_404_NOT_FOUND)
            if user_id is not None and str(rows[0].get('id_utilisateur')) != str(user_id):
                return Response({"error": "Non autorisé à supprimer ce produit."}, status=status.HTTP_403_FORBIDDEN)
            result = supabase.table('products').delete().eq('id', pk_str).execute()
            deleted = list(result.data or [])
            if not deleted:
                return Response(
                    {"error": "Aucune ligne supprimée (droits Supabase / RLS ou identifiant incorrect)."},
                    status=status.HTTP_409_CONFLICT,
                )
            return Response(status=status.HTTP_204_NO_CONTENT)
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

            # IMPORTANT:
            # La table `Livreur` est utilisée comme liste des livreurs d'un utilisateur (propriétaire),
            # donc `id_utilisateur` n'identifie pas de manière fiable "ce compte est un livreur".
            # Les livreurs doivent se connecter via l'endpoint dédié `LivreurLoginView`.
            user['role'] = 'admin'
            user.pop('livreur_id', None)

            user.pop('mot_de_passe', None)
            user.pop('code_confirmation', None)
            return Response(user, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR LoginView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  CONNEXION LIVREUR DÉDIÉE (email + mot_de_passe sur table Livreur)
# ─────────────────────────────────────────────────────────────
class LivreurLoginView(APIView):
    def post(self, request):
        try:
            payload = request.data
            email = payload.get('email')
            mot_de_passe = payload.get('mot_de_passe')

            if not email or not mot_de_passe:
                return Response({"error": "email et mot_de_passe sont requis"}, status=status.HTTP_400_BAD_REQUEST)

            # Chercher les livreurs par email (un même email peut exister sur plusieurs boutiques)
            response = supabase.table('Livreur').select("*").eq('email', email).execute()
            livreurs = response.data or []
            if not livreurs:
                return Response({"error": "Identifiants livreur invalides."}, status=status.HTTP_401_UNAUTHORIZED)

            hashed = _hash_password(mot_de_passe)
            # Trouver le livreur dont le mot de passe correspond
            livreur = next((l for l in livreurs if l.get('mot_de_passe') == hashed), None)
            if not livreur:
                return Response({"error": "Identifiants livreur invalides."}, status=status.HTTP_401_UNAUTHORIZED)

            # Récupération du compte utilisateur lié si existant
            compte = None
            id_compte = livreur.get('id_utilisateur')
            if id_compte:
                compte_resp = supabase.table('utilisateurs').select("*").eq('id', str(id_compte)).limit(1).execute()
                compte = (compte_resp.data or [None])[0]

            user_payload = {
                "role": "livreur",
                "livreur_id": livreur.get('id'),
                "nom": livreur.get('Nom'),
                "prenom": livreur.get('prenom'),
                "email": livreur.get('email'),
                "telephone": livreur.get('telephone'),
                "id_utilisateur": id_compte,
                "id": livreur.get('id'),
            }
            if compte:
                user_payload["utilisateur_id"] = compte.get('id')

            return Response(user_payload, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"ERREUR LivreurLoginView: {e}")
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
def _flatten_commande_with_client(row: dict) -> dict:
    """
    Fusionne nom/adresse/téléphone du client sans écraser les champs de la commande
    (created_at, id, statut_paiement, num_facture, etc.).
    """
    if not row:
        return row
    item = dict(row)
    client_info = item.pop('client', None)
    if client_info and isinstance(client_info, dict):
        for field in ('nom', 'adresse', 'telephone'):
            if client_info.get(field) is not None:
                item[field] = client_info[field]
    return item


class SupabaseCommande(APIView):
    def get(self, request):
        try:
            response = supabase.table('commandes') \
                .select("*, client(*)") \
                .order('created_at', desc=True) \
                .execute()

            if not response.data:
                return Response([], status=status.HTTP_200_OK)

            flattened_data = [_flatten_commande_with_client(item) for item in response.data]

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
            # Ajout: mot de passe directement via ce formulaire (optionnel)
            if payload.get('mot_de_passe'):
                data_to_update['mot_de_passe'] = _hash_password(payload.get('mot_de_passe'))
                
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


# ─────────────────────────────────────────────────────────────
#  LIVREURS (multi) — liste/création + update/suppression
# ─────────────────────────────────────────────────────────────
class LivreurListCreateByUserView(APIView):
    """Liste et création des livreurs d'un utilisateur."""

    def get(self, request, user_id):
        try:
            response = supabase.table('Livreur') \
                .select("*") \
                .eq('id_utilisateur', str(user_id)) \
                .order('created_at', desc=True) \
                .execute()
            return Response(response.data or [], status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur GET Livreur list: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, user_id):
        try:
            data = dict(request.data)
            data.pop('id', None)
            data.pop('created_at', None)
            data['id_utilisateur'] = str(user_id)

            email_livreur = (data.get('email') or '').strip().lower()
            if not email_livreur:
                return Response({"error": "L'email du livreur est requis."}, status=status.HTTP_400_BAD_REQUEST)
            data['email'] = email_livreur

            # Empêcher le même email 2 fois pour le même utilisateur
            existing_same_user = supabase.table('Livreur') \
                .select("id") \
                .eq('id_utilisateur', str(user_id)) \
                .eq('email', email_livreur) \
                .limit(1) \
                .execute()
            if existing_same_user.data:
                return Response(
                    {"error": "Cet email est déjà utilisé pour un livreur de cet utilisateur."},
                    status=status.HTTP_409_CONFLICT
                )

            cin_livreur = (data.get('CIN') or '').strip().upper()
            if not cin_livreur:
                return Response({"error": "Le CIN du livreur est requis."}, status=status.HTTP_400_BAD_REQUEST)
            data['CIN'] = cin_livreur

            # Empêcher le même CIN 2 fois pour le même utilisateur
            existing_cin_same_user = supabase.table('Livreur') \
                .select("id") \
                .eq('id_utilisateur', str(user_id)) \
                .eq('CIN', cin_livreur) \
                .limit(1) \
                .execute()
            if existing_cin_same_user.data:
                return Response(
                    {"error": "Ce CIN est déjà utilisé pour un livreur de cet utilisateur."},
                    status=status.HTTP_409_CONFLICT
                )

            # Mot de passe livreur: utiliser celui fourni, sinon générer un temporaire
            plain_password = (data.get('mot_de_passe') or '').strip()
            if not plain_password:
                plain_password = generate_temporary_password(10)
            data['mot_de_passe'] = _hash_password(plain_password)

            try:
                response = supabase.table('Livreur').insert(data).execute()
            except Exception as insert_error:
                msg = str(insert_error)
                if 'Livreur_email_key' in msg or 'duplicate key value' in msg:
                    return Response(
                        {
                            "error": "La base est encore configurée avec un email livreur unique global. "
                                     "Il faut retirer cette contrainte pour autoriser le même email sur plusieurs boutiques."
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                if 'Livreur_CIN_key' in msg:
                    return Response(
                        {
                            "error": "La base est encore configurée avec un CIN livreur unique global. "
                                     "Il faut retirer cette contrainte pour autoriser le même CIN sur plusieurs boutiques."
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                raise
            created = response.data[0] if response.data else data

            # Récupérer le nom de boutique pour personnaliser l'email
            boutique_nom = None
            try:
                boutique_res = supabase.table('boutiques') \
                    .select("nom_boutique") \
                    .eq('id_utilisateur', str(user_id)) \
                    .limit(1) \
                    .execute()
                if boutique_res.data:
                    boutique_nom = boutique_res.data[0].get('nom_boutique')
            except Exception:
                boutique_nom = None

            # Envoi email de bienvenue avec mêmes identifiants SMTP existants
            email_sent = send_livreur_welcome_email(
                to_email=email_livreur,
                livreur_nom=(created.get('prenom') or created.get('Nom') or 'Livreur'),
                boutique_nom=boutique_nom,
                login_email=email_livreur,
                plain_password=plain_password
            )

            # Ne jamais renvoyer le hash du mot de passe au frontend
            created.pop('mot_de_passe', None)
            created['welcome_email_sent'] = bool(email_sent)
            return Response(created, status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Erreur POST Livreur: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurDetailByUserView(APIView):
    """Modification / suppression d'un livreur appartenant à un utilisateur."""

    def put(self, request, user_id, livreur_id):
        try:
            data = dict(request.data)
            data.pop('id', None)
            data.pop('created_at', None)
            data.pop('id_utilisateur', None)

            # Normaliser email et vérifier doublon dans la même boutique (hors livreur en cours d'édition)
            if data.get('email') is not None:
                email_livreur = (data.get('email') or '').strip().lower()
                if not email_livreur:
                    return Response({"error": "L'email du livreur est requis."}, status=status.HTTP_400_BAD_REQUEST)
                data['email'] = email_livreur

                existing_email_same_user = supabase.table('Livreur') \
                    .select("id") \
                    .eq('id_utilisateur', str(user_id)) \
                    .eq('email', email_livreur) \
                    .neq('id', str(livreur_id)) \
                    .limit(1) \
                    .execute()
                if existing_email_same_user.data:
                    return Response(
                        {"error": "Cet email est déjà utilisé pour un autre livreur de cet utilisateur."},
                        status=status.HTTP_409_CONFLICT
                    )

            # Normaliser CIN et vérifier doublon dans la même boutique (hors livreur en cours d'édition)
            if data.get('CIN') is not None:
                cin_livreur = (data.get('CIN') or '').strip().upper()
                if not cin_livreur:
                    return Response({"error": "Le CIN du livreur est requis."}, status=status.HTTP_400_BAD_REQUEST)
                data['CIN'] = cin_livreur

                existing_cin_same_user = supabase.table('Livreur') \
                    .select("id") \
                    .eq('id_utilisateur', str(user_id)) \
                    .eq('CIN', cin_livreur) \
                    .neq('id', str(livreur_id)) \
                    .limit(1) \
                    .execute()
                if existing_cin_same_user.data:
                    return Response(
                        {"error": "Ce CIN est déjà utilisé pour un autre livreur de cet utilisateur."},
                        status=status.HTTP_409_CONFLICT
                    )

            # Si mot_de_passe fourni, le hasher
            if data.get('mot_de_passe'):
                data['mot_de_passe'] = _hash_password(data['mot_de_passe'])

            # Sécurité minimale: update uniquement si le livreur appartient au user
            try:
                response = supabase.table('Livreur') \
                    .update(data) \
                    .eq('id', str(livreur_id)) \
                    .eq('id_utilisateur', str(user_id)) \
                    .execute()
            except Exception as update_error:
                msg = str(update_error)
                if 'Livreur_email_key' in msg:
                    return Response(
                        {
                            "error": "La base est encore configurée avec un email livreur unique global. "
                                     "Il faut retirer cette contrainte pour autoriser le même email sur plusieurs boutiques."
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                if 'Livreur_CIN_key' in msg:
                    return Response(
                        {
                            "error": "La base est encore configurée avec un CIN livreur unique global. "
                                     "Il faut retirer cette contrainte pour autoriser le même CIN sur plusieurs boutiques."
                        },
                        status=status.HTTP_409_CONFLICT
                    )
                raise

            if not response.data:
                return Response({"error": "Livreur introuvable pour cet utilisateur."}, status=status.HTTP_404_NOT_FOUND)

            return Response(response.data[0], status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur PUT Livreur: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def delete(self, request, user_id, livreur_id):
        try:
            response = supabase.table('Livreur') \
                .delete() \
                .eq('id', str(livreur_id)) \
                .eq('id_utilisateur', str(user_id)) \
                .execute()
            return Response({"message": "Supprimé avec succès"}, status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            print(f"Erreur DELETE Livreur: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
#  ESPACE LIVREUR — commandes à livrer / historique / update statut
# ─────────────────────────────────────────────────────────────
def _get_livreur_by_account(user_id: str):
    """Retourne l'objet livreur à partir de l'id du livreur ou de l'id_utilisateur propriétaire."""
    # Essayer d'abord avec l'ID du livreur lui-même
    resp = supabase.table('Livreur').select("*").eq('id', str(user_id)).limit(1).execute()
    livreur = (resp.data or [None])[0]
    if livreur:
        return livreur

    # Fall-back : id_utilisateur (propriétaire de la boutique)
    resp = supabase.table('Livreur').select("*").eq('id_utilisateur', str(user_id)).limit(1).execute()
    return (resp.data or [None])[0]


class LivreurMeView(APIView):
    def get(self, request, user_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"is_livreur": False}, status=status.HTTP_200_OK)
            return Response({"is_livreur": True, "livreur": livreur}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurCommandesEnCoursView(APIView):
    def get(self, request, user_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)

            res = supabase.table('commandes') \
                .select("*, client(*)") \
                .eq('id_livreur', str(livreur.get('id'))) \
                .neq('statut_livraison', 'livre') \
                .order('created_at', desc=True) \
                .execute()
            return Response(res.data or [], status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurCommandesHistoriqueView(APIView):
    def get(self, request, user_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)

            res = supabase.table('commandes') \
                .select("*, client(*)") \
                .eq('id_livreur', str(livreur.get('id'))) \
                .eq('statut_livraison', 'livre') \
                .order('created_at', desc=True) \
                .execute()
            return Response(res.data or [], status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurCommandeStatusView(APIView):
    """
    Permet au livreur de marquer:
    - statut_livraison = 'livre'
    - statut_paiement = 'paye'
    sur une commande qui lui est assignée.
    """

    def put(self, request, user_id, commande_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)

            payload = request.data or {}
            update_data = {}

            # Charger la commande actuelle (pour appliquer les règles métier)
            current_res = supabase.table('commandes') \
                .select("*") \
                .eq('id', int(commande_id)) \
                .eq('id_livreur', str(livreur.get('id'))) \
                .limit(1) \
                .execute()
            current = (current_res.data or [None])[0]
            if not current:
                return Response({"error": "Commande introuvable pour ce livreur."}, status=status.HTTP_404_NOT_FOUND)

            requested_livraison = payload.get('statut_livraison')
            requested_paiement = payload.get('statut_paiement')

            # 1) Démarrer la livraison: en_cours
            if requested_livraison == 'en_cours':
                # Une seule livraison en cours à la fois
                other_in_progress = supabase.table('commandes') \
                    .select("id") \
                    .eq('id_livreur', str(livreur.get('id'))) \
                    .eq('statut_livraison', 'en_cours') \
                    .neq('id', int(commande_id)) \
                    .limit(1) \
                    .execute()
                if other_in_progress.data:
                    return Response(
                        {"error": "Vous avez déjà une livraison en cours. Terminez-la avant d'en commencer une autre."},
                        status=status.HTTP_409_CONFLICT
                    )
                if current.get('statut_livraison') == 'livre':
                    return Response({"error": "Cette commande est déjà livrée."}, status=status.HTTP_400_BAD_REQUEST)
                update_data['statut_livraison'] = 'en_cours'

            # 2) Finaliser: livré + payé (si pas déjà payé)
            if requested_livraison == 'livre' or requested_paiement == 'paye':
                # Exiger que la livraison ait été démarrée
                if current.get('statut_livraison') != 'en_cours' and current.get('statut_livraison') != 'livre':
                    return Response(
                        {"error": "Veuillez d'abord commencer la livraison."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            if requested_paiement == 'paye':
                update_data['statut_paiement'] = 'paye'

            if requested_livraison == 'livre':
                # Si la commande n'est pas payée, exiger de confirmer le paiement en même temps
                if current.get('statut_paiement') != 'paye' and requested_paiement != 'paye':
                    return Response(
                        {"error": "La commande n'est pas encore payée. Veuillez confirmer le paiement pour terminer la livraison."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                update_data['statut_livraison'] = 'livre'

            if not update_data:
                return Response({"error": "Aucune mise à jour demandée."}, status=status.HTTP_400_BAD_REQUEST)

            res = supabase.table('commandes') \
                .update(update_data) \
                .eq('id', int(commande_id)) \
                .eq('id_livreur', str(livreur.get('id'))) \
                .execute()

            if not res.data:
                return Response({"error": "Commande introuvable pour ce livreur."}, status=status.HTTP_404_NOT_FOUND)

            return Response(res.data[0], status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurCommandeDetailView(APIView):
    """
    Détail d'une commande assignée au livreur:
    - commande + client
    - lignes (details_commandes) + products
    """

    def get(self, request, user_id, commande_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)

            cmd_res = supabase.table('commandes') \
                .select("*, client(*)") \
                .eq('id', int(commande_id)) \
                .eq('id_livreur', str(livreur.get('id'))) \
                .limit(1) \
                .execute()

            commande = (cmd_res.data or [None])[0]
            if not commande:
                return Response({"error": "Commande introuvable pour ce livreur."}, status=status.HTTP_404_NOT_FOUND)

            details_res = supabase.table('details_commandes') \
                .select("*, products!inner(*)") \
                .eq('id_commande', int(commande_id)) \
                .execute()

            payload = {
                "commande": _flatten_commande_with_client(commande),
                "details": details_res.data or [],
            }
            return Response(payload, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurCommandesDisponiblesView(APIView):
    """
    Liste des commandes de la boutique du livreur qui ne sont pas encore livrées
    et qui ne sont pas encore prises par un livreur (id_livreur vide).
    """

    def get(self, request, user_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)

            owner_id = livreur.get('id_utilisateur')
            if not owner_id:
                return Response({"error": "Compte livreur sans boutique associée."}, status=status.HTTP_400_BAD_REQUEST)

            res = supabase.table('commandes') \
                .select("*, client(*)") \
                .eq('id_utilisateur', str(owner_id)) \
                .neq('statut_livraison', 'livre') \
                .order('created_at', desc=True) \
                .execute()

            # Filtrer côté Python car Supabase n'offre pas ici une condition NULL fiable en pratique
            commandes = [c for c in (res.data or []) if not c.get('id_livreur')]

            return Response(commandes, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurCommandeDisponibleDetailView(APIView):
    """
    Détail d'une commande disponible (non affectée) pour le pool.
    La commande doit appartenir à la boutique du livreur et id_livreur doit être vide.
    """

    def get(self, request, user_id, commande_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)

            owner_id = livreur.get('id_utilisateur')
            if not owner_id:
                return Response({"error": "Compte livreur sans boutique associée."}, status=status.HTTP_400_BAD_REQUEST)

            cmd_res = supabase.table('commandes') \
                .select("*, client(*)") \
                .eq('id', int(commande_id)) \
                .eq('id_utilisateur', str(owner_id)) \
                .neq('statut_livraison', 'livre') \
                .limit(1) \
                .execute()

            commande = (cmd_res.data or [None])[0]
            if not commande:
                return Response({"error": "Commande introuvable pour ce livreur."}, status=status.HTTP_404_NOT_FOUND)

            if commande.get('id_livreur'):
                return Response(
                    {"error": "Cette commande a déjà été prise par un autre livreur."},
                    status=status.HTTP_409_CONFLICT
                )

            details_res = supabase.table('details_commandes') \
                .select("*, products!inner(*)") \
                .eq('id_commande', int(commande_id)) \
                .execute()

            payload = {
                "commande": _flatten_commande_with_client(commande),
                "details": details_res.data or [],
            }
            return Response(payload, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class LivreurCommandePrendreView(APIView):
    """
    Assigne une commande disponible au livreur (remplit id_livreur).
    Après prise, la commande apparaît dans la liste `commandes à livrer` du livreur.
    """

    def put(self, request, user_id, commande_id):
        try:
            livreur = _get_livreur_by_account(str(user_id))
            if not livreur:
                return Response({"error": "Compte livreur introuvable."}, status=status.HTTP_404_NOT_FOUND)

            owner_id = livreur.get('id_utilisateur')
            if not owner_id:
                return Response({"error": "Compte livreur sans boutique associée."}, status=status.HTTP_400_BAD_REQUEST)

            cmd_res = supabase.table('commandes') \
                .select("*") \
                .eq('id', int(commande_id)) \
                .eq('id_utilisateur', str(owner_id)) \
                .limit(1) \
                .execute()

            commande = (cmd_res.data or [None])[0]
            if not commande:
                return Response({"error": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)

            if commande.get('statut_livraison') == 'livre':
                return Response({"error": "Commande déjà livrée."}, status=status.HTTP_400_BAD_REQUEST)

            if commande.get('id_livreur'):
                return Response(
                    {"error": "Cette commande a déjà été prise par un autre livreur."},
                    status=status.HTTP_409_CONFLICT
                )

            res = supabase.table('commandes') \
                .update({'id_livreur': str(livreur.get('id'))}) \
                .eq('id', int(commande_id)) \
                .eq('id_utilisateur', str(owner_id)) \
                .execute()

            # Vérification post-action
            refreshed = supabase.table('commandes') \
                .select("*") \
                .eq('id', int(commande_id)) \
                .limit(1) \
                .execute()
            refreshed_cmd = (refreshed.data or [None])[0]

            return Response(refreshed_cmd, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ConversationsByUserView(APIView):
    """
    Retourne toutes les conversations d'une boutique donnée.

    Règle demandée côté front:
    - table `conversations.page_id` doit correspondre à `boutiques.messenger_id`
    """

    def get(self, request, user_id):
        try:
            boutiques_res = (
                supabase.table("boutiques")
                .select("messenger_id")
                .eq("id_utilisateur", str(user_id))
                .limit(1)
                .execute()
            )

            if not boutiques_res.data:
                return Response([], status=status.HTTP_200_OK)

            messenger_id = boutiques_res.data[0].get("messenger_id")
            if not messenger_id:
                return Response([], status=status.HTTP_200_OK)

            conversations_res = (
                supabase.table("conversations")
                .select("*")
                .eq("page_id", str(messenger_id))
                .order("created_at", desc=False)
                .execute()
            )

            return Response(conversations_res.data or [], status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur GET conversations: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContactsReponseAutoView(APIView):
    """
    GET/PUT du champ `reponse_auto` dans la table `Contacts` pour une personne donnée.

    Correspondance demandée:
    - id de la personne dans la discussion => `Contacts.id_contact`
    - boutique connectée => `Contacts.id_utilisateur`
    """

    def get(self, request, user_id, id_contact):
        try:
            resp = (
                supabase.table("Contacts")
                .select("reponse_auto")
                .eq("id_utilisateur", str(user_id))
                .eq("id_contact", str(id_contact))
                .limit(1)
                .execute()
            )

            if resp.data and len(resp.data) > 0:
                return Response(
                    {"reponse_auto": bool(resp.data[0].get("reponse_auto"))},
                    status=status.HTTP_200_OK,
                )

            # Valeur par défaut (comme dans le schéma SQL)
            return Response({"reponse_auto": True}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur GET Contacts.reponse_auto: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def put(self, request, user_id, id_contact):
        try:
            reponse_auto = request.data.get("reponse_auto")
            if reponse_auto is None:
                return Response(
                    {"error": "reponse_auto est requis (true/false)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            value = bool(reponse_auto)

            # Tentative update d'abord
            update_resp = (
                supabase.table("Contacts")
                .update({"reponse_auto": value})
                .eq("id_utilisateur", str(user_id))
                .eq("id_contact", str(id_contact))
                .execute()
            )

            if update_resp.data and len(update_resp.data) > 0:
                return Response({"reponse_auto": value}, status=status.HTTP_200_OK)

            # Si aucun contact n'existe, on insère
            insert_resp = (
                supabase.table("Contacts")
                .insert(
                    {
                        "id_contact": str(id_contact),
                        "id_utilisateur": str(user_id),
                        "reponse_auto": value,
                    }
                )
                .execute()
            )

            return Response({"reponse_auto": value}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur PUT Contacts.reponse_auto: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


MONGO_URI = "mongodb+srv://Lanjatiana:uY6Y8QhFARvcmdtK@scraping.37diz8i.mongodb.net/?appName=Scraping"
MONGO_DB_NAME = "Scrapping_produit"
_mongo_client = None


def _get_mongo_db():
    global _mongo_client
    if _mongo_client is None:
        _mongo_client = MongoClient(MONGO_URI)
    return _mongo_client[MONGO_DB_NAME]


def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_iso_or_none(value):
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


class PublicationsDashboardView(APIView):
    """
    Dashboard des publications utilisateur depuis MongoDB.
    Règle: collection == id_utilisateur.
    """

    def get(self, request, user_id):
        try:
            db = _get_mongo_db()
            collection = db[str(user_id)]
            rows = list(collection.find({}))

            posts = []
            distribution_jour = defaultdict(int)
            distribution_heure = defaultdict(int)

            grouped_snapshots = defaultdict(list)
            for row in rows:
                post_id = str(row.get("id") or "")
                if not post_id:
                    continue
                grouped_snapshots[post_id].append(row)

            for post_id, snapshots in grouped_snapshots.items():
                snapshots.sort(key=lambda x: x.get("_id", ObjectId()))
                latest = snapshots[-1]

                reactions = _safe_int(latest.get("reactions_count"), 0)
                comments = _safe_int(latest.get("comments_count"), 0)
                engagement = reactions + comments
                created_dt = _parse_iso_or_none(latest.get("created_time"))

                if created_dt:
                    distribution_jour[created_dt.strftime("%A")] += 1
                    distribution_heure[created_dt.hour] += 1

                evolution = []
                prev_engagement = None
                sudden_spike = False
                for snap in snapshots:
                    snap_reactions = _safe_int(snap.get("reactions_count"), 0)
                    snap_comments = _safe_int(snap.get("comments_count"), 0)
                    snap_engagement = snap_reactions + snap_comments
                    snap_dt = None
                    if isinstance(snap.get("_id"), ObjectId):
                        snap_dt = snap.get("_id").generation_time
                    if not snap_dt:
                        snap_dt = _parse_iso_or_none(snap.get("created_time"))

                    evolution.append({
                        "captured_at": snap_dt.isoformat() if snap_dt else None,
                        "reactions_count": snap_reactions,
                        "comments_count": snap_comments,
                        "engagement": snap_engagement,
                    })

                    if prev_engagement is not None and (snap_engagement - prev_engagement) >= 5:
                        sudden_spike = True
                    prev_engagement = snap_engagement

                posts.append({
                    "id": post_id,
                    "message": latest.get("message") or "",
                    "permalink_url": latest.get("permalink_url") or "",
                    "created_time": latest.get("created_time"),
                    "image_url": latest.get("image_url") or "",
                    "reactions_count": reactions,
                    "comments_count": comments,
                    "engagement": engagement,
                    "evolution": evolution,
                    "has_sudden_spike": sudden_spike,
                })

            posts.sort(key=lambda p: p.get("engagement", 0), reverse=True)
            best_post = posts[0] if posts else None
            max_engagement = max((p.get("engagement", 0) for p in posts), default=0)
            avg_engagement_raw = (
                sum(p.get("engagement", 0) for p in posts) / len(posts)
            ) if posts else 0
            avg_engagement = round(
                (avg_engagement_raw / max_engagement) * 100, 1
            ) if max_engagement > 0 else 0

            return Response({
                "total_posts": len(posts),
                "average_engagement": avg_engagement,
                "best_post": best_post,
                "posts": posts,
                "distribution_by_day": distribution_jour,
                "distribution_by_hour": distribution_heure,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur PublicationsDashboardView: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationsView(APIView):
    """
    Notifications persistantes (table Supabase `notifications`).
    Colonnes utilisées: id, is_read, created_at, type, message
    """

    def get(self, request):
        try:
            user_id = request.GET.get("user_id")
            if not user_id:
                return Response({"error": "user_id est requis."}, status=status.HTTP_400_BAD_REQUEST)
            only_unread = request.GET.get("only_unread", "true").lower() == "true"
            query = (
                supabase.table("notifications")
                .select("*")
                .eq("id_utilisateur", str(user_id))
                .order("created_at", desc=True)
            )
            if only_unread:
                query = query.eq("is_read", False)
            resp = query.execute()
            return Response(resp.data or [], status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur GET notifications: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        try:
            user_id = request.data.get("user_id")
            if not user_id:
                return Response({"error": "user_id est requis."}, status=status.HTTP_400_BAD_REQUEST)
            notif_type = (request.data.get("type") or "").strip()
            message = request.data.get("message")
            if not notif_type:
                return Response({"error": "type est requis."}, status=status.HTTP_400_BAD_REQUEST)

            payload = {
                "id_utilisateur": str(user_id),
                "type": notif_type,
                "message": message if isinstance(message, str) else json.dumps(message or {}),
                "is_read": False,
            }
            resp = supabase.table("notifications").insert(payload).execute()
            return Response((resp.data or [payload])[0], status=status.HTTP_201_CREATED)
        except Exception as e:
            print(f"Erreur POST notifications: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationReadView(APIView):
    def put(self, request, notification_id):
        try:
            user_id = request.data.get("user_id")
            if not user_id:
                return Response({"error": "user_id est requis."}, status=status.HTTP_400_BAD_REQUEST)
            resp = (
                supabase.table("notifications")
                .update({"is_read": True})
                .eq("id", str(notification_id))
                .eq("id_utilisateur", str(user_id))
                .execute()
            )
            if not resp.data:
                return Response({"error": "Notification introuvable."}, status=status.HTTP_404_NOT_FOUND)
            return Response(resp.data[0], status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Erreur PUT notification read: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)