"""
Serializers pour le module veille_facebook.
Note : Le projet SAC existant n'utilise pas de serializers DRF formels
(les views retournent directement des dicts via Response()).
On suit le même pattern ici — ce fichier est créé pour conformité
avec le plan mais les views retournent directement les dicts des services.
"""

from rest_framework import serializers


class BuzzProduitSerializer(serializers.Serializer):
    """Sérialiseur pour un produit buzz Facebook."""
    id_unique = serializers.CharField()
    concurrent = serializers.CharField()
    produit_nom = serializers.CharField()
    prix = serializers.IntegerField()
    categorie = serializers.CharField()
    score_engagement = serializers.FloatField()
    priority_status = serializers.CharField()
    priority_score = serializers.IntegerField()
    likes = serializers.IntegerField()
    comments = serializers.IntegerField()
    date_post = serializers.CharField()
    lien_facebook = serializers.CharField(allow_null=True)
    resume_fr = serializers.CharField(allow_null=True)


class BuzzStatsSerializer(serializers.Serializer):
    """Sérialiseur pour les stats globales buzz."""
    nb_produits_total = serializers.IntegerField()
    nb_ultra_priority = serializers.IntegerField()
    nb_high = serializers.IntegerField()
    nb_normal = serializers.IntegerField()
    score_engagement_max = serializers.FloatField()
    score_engagement_moyen = serializers.FloatField()


class PrixConcurrentSerializer(serializers.Serializer):
    """Prix d'un concurrent dans une catégorie."""
    concurrent = serializers.CharField()
    prix_min = serializers.IntegerField()
    prix_max = serializers.IntegerField()
    prix_median = serializers.IntegerField()
    prix_moyen = serializers.IntegerField()
    nb_produits = serializers.IntegerField()


class PrixGrilleSerializer(serializers.Serializer):
    """Grille de prix par catégorie."""
    categorie = serializers.CharField()
    concurrents = PrixConcurrentSerializer(many=True)


class PrixFourchetteSerializer(serializers.Serializer):
    """Fourchette de prix marché pour une catégorie."""
    categorie = serializers.CharField()
    prix_min_global = serializers.IntegerField()
    prix_max_global = serializers.IntegerField()
    prix_median_global = serializers.IntegerField()
    recommandation_prix = serializers.IntegerField()
    nb_produits = serializers.IntegerField()


class EngagementConcurrentSerializer(serializers.Serializer):
    """Stats engagement pour un concurrent."""
    concurrent = serializers.CharField()
    nb_posts = serializers.IntegerField()
    likes_moyen = serializers.FloatField()
    comments_moyen = serializers.FloatField()
    score_engagement_moyen = serializers.FloatField()
    nb_ultra = serializers.IntegerField()
    nb_high = serializers.IntegerField()
    nb_normal = serializers.IntegerField()


class EngagementCategorieSerializer(serializers.Serializer):
    """Stats engagement par catégorie."""
    categorie = serializers.CharField()
    score_engagement_moyen = serializers.FloatField()
    nb_posts = serializers.IntegerField()
    prix_moyen = serializers.IntegerField()
    concurrent_dominant = serializers.CharField()


class CorrelationPrixSerializer(serializers.Serializer):
    """Corrélation prix/engagement par tranche."""
    tranche = serializers.CharField()
    engagement_moyen = serializers.FloatField()
    nb_posts = serializers.IntegerField()


class OpportuniteSourcingSerializer(serializers.Serializer):
    """Opportunité de sourcing par catégorie."""
    categorie = serializers.CharField()
    nb_posts_total = serializers.IntegerField()
    score_demande_moyen = serializers.IntegerField()
    prix_local_moyen = serializers.IntegerField()
    prix_local_min = serializers.IntegerField()
    prix_local_max = serializers.IntegerField()
    concurrent_dominant = serializers.CharField()
    recommandation = serializers.CharField()
